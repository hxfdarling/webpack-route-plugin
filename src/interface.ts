import { TYPE } from './const';
export interface Options {
  baseDir?: string; // 项目根路径，用于生成导路由入路径
  pagesDir: string; // 页面根路径
  outputFile: string; // 生成代码输出路径
  ignoreFiles?: string[]; // 忽略的文件相对路径
  deep?: boolean; // 是否启用深度扫描
  type: TYPE;
}
export type RouteOptions = Options;

export interface BootstrapOptions extends Options {
  indexFile?: string;
}
