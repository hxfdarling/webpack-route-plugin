import { transformFromAstSync } from '@babel/core';
import {
  arrayExpression,
  file,
  identifier,
  program,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import fs from 'fs-extra';
import { TYPE } from './const';
import { BootstrapOptions, RouteOptions } from './interface';
import parseFilesToNodes from './parseFilesToNodes';

const ROUTES_KEY = 'routes';
const defaultIgnoreFiles = ['.DS_Store'];

function genRoutesCode(nodes, outputFile) {
  const ast = file(
    program([
      variableDeclaration('const', [
        variableDeclarator(identifier(ROUTES_KEY), arrayExpression(nodes)),
      ]),
    ]),
    '',
    '',
  );
  return transformFromAstSync(ast, '', { filename: outputFile }).code;
}

const helper = `
const toString = Object.prototype.toString;

function getDefault(m) {
  return m.__esModule ? m.default : m;
}

function toArray(arr, component) {
  if (toString.call(arr) !== "[object Array]") {
    arr = [arr];
  }
  return arr.map((item) => ({ ...item, component }));
}
`;

export default function genCode(options: BootstrapOptions | RouteOptions) {
  const { pagesDir, type } = options;
  if (!fs.existsSync(pagesDir)) {
    throw Error(
      '[webpack-route-plugin][error]:"' +
        pagesDir +
        '" not exits! Make sure the directory exists!',
    );
  }

  if (type === TYPE.BOOTSTRAP) {
    return genBootstrapFileCode(options);
  } else if (type === TYPE.ROUTES) {
    return genRouteFileCode(options);
  } else {
    throw Error('not support type "' + type + '"');
  }
}

export function genBootstrapFileCode({
  baseDir = process.cwd(),
  outputFile,
  pagesDir,
  indexFile,
  ignoreFiles = [],
  deep,
}: BootstrapOptions) {
  ignoreFiles = [...ignoreFiles, ...defaultIgnoreFiles];
  const nodes = parseFilesToNodes({ baseDir, pagesDir, ignoreFiles, deep });
  const routesCode = genRoutesCode(nodes, outputFile);

  const entryCode = `/* eslint-disable */
/**
 * 该文件为构建自动生成的启动文件，无需关注本文件，并且不要修改该文件内容
 * 文件之所以放在此处，是为了方便调试查看
 */
import bootstrap from '${indexFile}';
${helper}
${routesCode}

bootstrap(routes);
`;
  return entryCode;
}
export function genRouteFileCode({
  baseDir = process.cwd(),
  pagesDir,
  outputFile,
  ignoreFiles = [],
  deep,
}: RouteOptions) {
  ignoreFiles = [...ignoreFiles, ...defaultIgnoreFiles];

  const nodes = parseFilesToNodes({ baseDir, pagesDir, ignoreFiles, deep });
  const routesCode = genRoutesCode(nodes, outputFile);
  const entryCode = `/* eslint-disable */
/**
 * 该文件为构建自动生成的启动文件，无需关注本文件，并且不要修改该文件内容
 * 文件之所以放在此处，是为了方便调试查看
 */
${helper}
${routesCode}
export default routes;
    `;
  return entryCode;
}
