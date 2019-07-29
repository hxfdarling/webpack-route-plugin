const path = require('path');
const babel = require('@babel/core');
const fs = require('fs-extra');
const t = require('@babel/types');

const exts = ['.js', 'jsx', '.ts', 'tsx'];
const ROUTE_KEY = 'route';
const ROUTES_KEY = 'routes';

function getRouterNode(code, file) {
  const ast = babel.parseSync(code, {
    babelrc: false,
    configFile: false,
    presets: [['@a8k/babel-preset', { target: 'browser' }]],
  });
  const { body } = ast.program;
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
  const routerNode = body.find(node => {
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
  if (!routerNode) {
    console.warn('[route] in ' + file + ' not found router info');
    return null;
  }

  const router = routerNode.expression.right;
  const componentNode = t.objectProperty(
    t.identifier('component'),
    t.arrowFunctionExpression(
      [],
      t.callExpression(t.identifier('import'), [t.stringLiteral(file)])
    )
  );
  const hasName = properties => {
    return properties.find(item => {
      if (t.isObjectProperty(item) && item.key.name === 'name') {
        return true;
      } else {
        return false;
      }
    });
  };
  if (t.isArrayExpression(router)) {
    router.elements.forEach(node => {
      if (t.isObjectExpression(node) && hasName(node.properties)) {
        node.properties.push(componentNode);
      }
    });
    return router.elements;
  } else {
    if (hasName(router.properties)) {
      router.properties.push(componentNode);
    }
    return [router];
  }
}

function genRoutesCode(nodes) {
  const ast = t.file(
    // prettier-ignore
    t.program([t.variableDeclaration('const', [t.variableDeclarator(t.identifier(ROUTES_KEY), t.arrayExpression(nodes))])])
  );
  return babel.transformFromAstSync(ast, {}).code;
}
module.exports = (outputFile, pagesDir, indexFile) => {
  const nodes = fs
    .readdirSync(pagesDir)
    .map(file => path.join(pagesDir, file))
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
    .filter(Boolean)
    .map(file => {
      const data = fs.readFileSync(file).toString();
      return getRouterNode(data, file);
    })
    .reduce((r, c) => {
      r.push(...c);
      return r;
    }, [])
    .filter(Boolean);

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
