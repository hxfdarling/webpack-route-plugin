const path = require('path');
const babel = require('@babel/core');
const fs = require('fs-extra');
const t = require('@babel/types');

const exts = ['.js', 'jsx', '.ts', 'tsx'];
const ROUTE_KEY = 'route';
const ROUTES_KEY = 'routes';
const defaultIgnoreFiles = ['.DS_Store'];

const findRouterNode = (body, name) =>
  body.find(node => {
    if (t.isExpressionStatement(node)) {
      const { left } = node.expression;
      if (t.isMemberExpression(left) && t.isIdentifier(left.object)) {
        if (
          left.object.name === name &&
          t.isIdentifier(left.property) &&
          left.property.name === ROUTE_KEY
        ) {
          return true;
        }
      }
    }
    return false;
  });
const isRedirect = properties => {
  return properties.find(item => {
    if (t.isObjectProperty(item) && item.key.name === 'redirect') {
      return true;
    } else {
      return false;
    }
  });
};
const toArray = router => {
  if (t.isArrayExpression(router)) {
    return router.elements;
  } else {
    return [router];
  }
};
function getRouterNode(code, file) {
  const ast = babel.parseSync(code, {
    filename: file,
    babelrc: false,
    configFile: false,
    presets: [[require.resolve('@a8k/babel-preset'), { target: 'browser' }]],
  });
  const { body } = ast.program;
  // 是否有export default
  const defaultDeclearation = body.find(node => {
    if (t.isExportDefaultDeclaration(node)) {
      return true;
    }
    return false;
  });
  if (!defaultDeclearation) {
    console.warn('[route] in ' + file + ' not export default Component');
    return null;
  }

  // 获取export default Object/Function/Class名称
  let name = null;
  const { declaration } = defaultDeclearation;
  if (
    t.isFunctionDeclaration(declaration) ||
    t.isClassDeclaration(declaration)
  ) {
    name = declaration.id.name;
  } else if (t.isIdentifier(declaration)) {
    name = declaration.name;
  }
  if (!name) {
    console.warn('[route] in ' + file + ' export default not fund id');
    return null;
  }

  const routerNode = findRouterNode(body, name);
  if (!routerNode) {
    console.warn('[route] in ' + file + ' not found router info');
    return null;
  }

  // 获取router的值
  const router = routerNode.expression.right;
  const componentNode = t.objectProperty(
    t.identifier('component'),
    t.arrowFunctionExpression(
      [],
      t.callExpression(t.identifier('import'), [t.stringLiteral(file)])
    )
  );

  return toArray(router)
    .map(node => {
      if (t.isObjectExpression(node)) {
        if (!isRedirect(node.properties)) {
          node.properties.push(componentNode);
        }
        return node;
      } else {
        console.warn('route item must is pure object:', node);
      }
    })
    .filter(Boolean);
}

function genRoutesCode(nodes) {
  const ast = t.file(
    // prettier-ignore
    t.program([t.variableDeclaration('const', [t.variableDeclarator(t.identifier(ROUTES_KEY), t.arrayExpression(nodes))])])
  );
  return babel.transformFromAstSync(ast, {}).code;
}
const getSortNumber = node => {
  let sortNode = node.properties.find(i => i.key.name === 'sort');
  if (sortNode) {
    if (t.isNumericLiteral(sortNode.value)) {
      return sortNode.value.value;
    }
    if (t.isUnaryExpression(sortNode.value)) {
      const { value } = sortNode;
      return Number(value.operator + value.argument.value);
    }
  }
  return 0;
};
module.exports = (outputFile, pagesDir, indexFile, ignoreFiles = []) => {
  ignoreFiles = [...ignoreFiles, ...defaultIgnoreFiles];
  const nodes = fs
    .readdirSync(pagesDir)
    .filter(file => ignoreFiles.indexOf(file) === -1)
    .map(file => path.join(pagesDir, file))
    // 如果是目录使用index文件，否则直接使用当前文件
    .map(file => {
      const stat = fs.statSync(file);
      if (stat.isDirectory()) {
        let pageFile = null;
        exts.find(ext => {
          const temp = path.join(file, 'index' + ext);
          if (fs.existsSync(temp)) {
            pageFile = temp;
            return true;
          }
          return false;
        });
        if (!pageFile) {
          console.warn(
            '[route] in ' + file + ' directory not found index.js file'
          );
        }
        return pageFile;
      }
      return file;
    })
    // 过滤目录没有index文件的场景
    .filter(Boolean)
    // 扩展名必须是指定的
    .filter(file => exts.indexOf(path.extname(file)) >= 0)
    // 获取routes
    .map(file => {
      const data = fs.readFileSync(file).toString();
      return getRouterNode(data, file);
    })
    // 过滤没有route的文件
    .filter(Boolean)
    // 转换为数组
    .reduce((r, c) => {
      r.push(...c);
      return r;
    }, [])
    .filter(Boolean)
    // 根据sort排序
    .sort((a, b) => getSortNumber(a) - getSortNumber(b));

  const routesCode = genRoutesCode(nodes);
  const entryCode = `
/* eslint-disable */
/**
 * 该文件为构建自动生成的启动文件，无需关注本文件，并且不要修改该文件内容
 * 文件之所以放在此处，是为了方便调试查看
 */
import bootstrap from '${indexFile}';

${routesCode}

bootstrap(routes);
`;
  fs.writeFileSync(outputFile, entryCode);
  return outputFile;
};
