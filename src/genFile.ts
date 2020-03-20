import fs from 'fs';
import genBootstrapCode from './genCode';
import { BootstrapOptions, RouteOptions } from './interface';

export default (options: RouteOptions | BootstrapOptions) => {
  fs.writeFileSync(options.outputFile, genBootstrapCode(options));
  return options.outputFile;
};
