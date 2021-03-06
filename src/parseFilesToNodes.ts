import { parseSync } from '@babel/core';
import {
  arrowFunctionExpression,
  callExpression,
  File,
  Identifier,
  identifier,
  isArrayExpression,
  isCallExpression,
  isClassDeclaration,
  isExportDefaultDeclaration,
  isExportNamedDeclaration,
  isExpressionStatement,
  isFunctionDeclaration,
  isIdentifier,
  isImport,
  isMemberExpression,
  isNumericLiteral,
  isObjectExpression,
  isObjectProperty,
  isStringLiteral,
  isUnaryExpression,
  isVariableDeclaration,
  isVariableDeclarator,
  objectProperty,
  spreadElement,
  stringLiteral,
} from '@babel/types';
import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
import { hasRouteConfig } from './utils';

const exts = ['.js', '.jsx', '.ts', '.tsx'];
const ROUTE_KEY = 'route';
const ROUTES_KEY = 'routes';
// const cwd = process.cwd();

const findRouterNode = (body, name) =>
  body.find(node => {
    if (isExpressionStatement(node)) {
      const { left } = node.expression as any;
      if (isMemberExpression(left) && isIdentifier(left.object)) {
        if (
          left.object.name === name &&
          isIdentifier(left.property) &&
          (left.property.name === ROUTE_KEY ||
            left.property.name === ROUTES_KEY)
        ) {
          return true;
        }
      }
    }
    return false;
  });
const isRedirect = properties => {
  return properties.find(item => {
    if (isObjectProperty(item) && item.key.name === 'redirect') {
      return true;
    } else {
      return false;
    }
  });
};
const toArray = router => {
  if (isArrayExpression(router)) {
    return router.elements;
  } else {
    return [router];
  }
};
function getRouterNode({ code, file, baseDir, routeFile }) {
  // 获取router的值
  const routeFunction = arrowFunctionExpression(
    [],
    callExpression(identifier('import'), [
      stringLiteral('.' + path.sep + path.relative(baseDir, file)),
    ]),
  );
  const componentNode = objectProperty(identifier('component'), routeFunction);
  if (routeFile) {
    return [
      spreadElement(
        callExpression(identifier('toArray'), [
          callExpression(identifier('getDefault'), [
            callExpression(identifier('require'), [
              stringLiteral('.' + path.sep + path.relative(baseDir, routeFile)),
            ]),
          ]),
          routeFunction,
        ]),
      ),
    ];
  }

  const ast = parseSync(code, {
    filename: file,
    presets: [[require.resolve('@a8k/babel-preset'), { target: 'web' }]],
  }) as File;
  const { body } = ast.program;
  // 是否有 export default
  const defaultDeclaration = body.find(node => {
    if (isExportDefaultDeclaration(node)) {
      return true;
    }
    return false;
  });
  // 是否有 export const routes =[]
  const routesDeclaration = body.find(node => {
    if (
      isExportNamedDeclaration(node) &&
      isVariableDeclaration(node.declaration) &&
      isVariableDeclarator(node.declaration.declarations[0]) &&
      [ROUTES_KEY, ROUTE_KEY].indexOf(
        (node.declaration.declarations[0].id as Identifier).name,
      ) >= 0 &&
      isArrayExpression(node.declaration.declarations[0].init)
    ) {
      return true;
    }
    return false;
  });

  let router = null;
  if (routesDeclaration) {
    // 支持 export const routes = []
    router = (routesDeclaration as any).declaration.declarations[0].init;
  } else if (defaultDeclaration) {
    // 获取export default Object/Function/Class名称
    let name = null;
    const { declaration } = defaultDeclaration as any;
    if (isFunctionDeclaration(declaration) || isClassDeclaration(declaration)) {
      name = declaration.id.name;
    } else if (isIdentifier(declaration)) {
      name = declaration.name;
    }
    if (!name) {
      console.warn(
        '[webpack-route-plugin] in ' + file + ' export default not fund id',
      );
      return null;
    }
    const routerNode = findRouterNode(body, name);
    if (!routerNode) {
      console.warn(
        '[webpack-route-plugin] in ' + file + ' not found router info',
      );
      return null;
    }
    router = routerNode.expression.right;
  } else {
    console.warn(
      '[webpack-route-plugin] in ' +
        file +
        ' not export default Component or export const routes = []',
    );
    return null;
  }

  return toArray(router)
    .map(node => {
      if (isObjectExpression(node)) {
        if (!isRedirect(node.properties)) {
          node.properties.forEach(node => {
            if (isObjectProperty(node)) {
              if (isCallExpression(node.value)) {
                const callee = node.value.callee;
                const args = node.value.arguments;
                const isRequire =
                  isIdentifier(callee) && callee.name === 'require';
                if (isRequire || isImport(callee)) {
                  const p = args[0];
                  if (isStringLiteral(p)) {
                    node.value = callExpression(identifier('getDefault'), [
                      callExpression(identifier('require'), [
                        stringLiteral(
                          '.' +
                            path.sep +
                            path.join(
                              path.relative(baseDir, file),
                              '..',
                              p.value,
                            ),
                        ),
                      ]),
                    ]);
                  }
                }
              }
            }
          });
          node.properties.push(componentNode);
        }
        return node;
      } else {
        console.warn('route item must is pure object:', node);
      }
    })
    .filter(Boolean);
}

const getSortNumber = node => {
  if (!node.properties) {
    return 0;
  }
  const sortNode = node.properties.find(i => {
    if (!isObjectProperty(i)) {
      return false;
    }
    return i.key.name === 'sort';
  });
  if (sortNode) {
    if (isNumericLiteral(sortNode.value)) {
      return sortNode.value.value;
    }
    if (isUnaryExpression(sortNode.value)) {
      const { value } = sortNode;
      return Number(value.operator + value.argument.value);
    }
  }
  return 0;
};

function walk(
  pagesDir: string,
  ignoreFiles: string[],
  deep = false,
): Array<any> {
  return (
    fs
      .readdirSync(pagesDir)
      .filter(file => ignoreFiles.indexOf(file) === -1)
      .map(file => path.join(pagesDir, file))
      // 如果是目录使用index文件，否则直接使用当前文件
      .map(file => {
        const stat = fs.statSync(file);
        if (stat.isDirectory()) {
          if (deep) {
            const files = walk(file, ignoreFiles, deep);
            return files;
          } else {
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
                '[webpack-route-plugin] in ' +
                  file +
                  ' directory not found index.js file',
              );
            }
            return pageFile;
          }
        }
        return file;
      })
  );
}

export default function parseFilesToNodes({
  pagesDir,
  ignoreFiles,
  baseDir,
  deep,
}) {
  return (
    _(walk(pagesDir, ignoreFiles, deep))
      .flattenDeep()
      // 过滤目录没有index文件的场景
      .filter(Boolean)
      // 扩展名必须是指定的
      .filter(
        file =>
          exts.indexOf(path.extname(file)) >= 0 &&
          path.basename(file).split('.')[0] !== 'route',
      )
      .map(file => {
        const data = fs.readFileSync(file).toString();
        if (path.basename(file).split('.')[0] === 'index') {
          const baseFileName = path.join(file, '../', './route');
          const routeFile = exts
            .map(item => baseFileName + item)
            .find(fs.existsSync);
          return { file, data, routeFile };
        } else {
          return { file, data };
        }
      })
      .filter(
        ({ data, routeFile }) => hasRouteConfig(data) || Boolean(routeFile),
      )
      .value()
      // 获取routes
      .map(({ file, data, routeFile }) => {
        return getRouterNode({ code: data, file, baseDir, routeFile });
      })
      // 过滤没有route的文件
      .filter(Boolean)
      // 转换为数组
      .reduce((r, c) => {
        r.push(...c);
        return r;
      }, [] as any)
      .filter(Boolean)
      // 根据sort排序
      .sort((a, b) => getSortNumber(a) - getSortNumber(b))
  );
}
