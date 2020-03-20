import { join } from 'path';
import { TYPE } from '../const';
import genFile from '../genFile';

const baseDir = join(__dirname, '../../demo');
const pagesDir = join(baseDir, 'pages');
process.env.NODE_ENV = 'development';
describe('gen code', () => {
  it('create file', async () => {
    genFile({
      baseDir,
      pagesDir,
      outputFile: join(baseDir, 'bootstrap.js'),
      type: TYPE.ROUTES,
    });
    genFile({
      baseDir,
      pagesDir,
      outputFile: join(baseDir, 'routes.js'),
      type: TYPE.BOOTSTRAP,
    });
  });
  it('create file deep', async () => {
    genFile({
      baseDir,
      pagesDir,
      outputFile: join(baseDir, 'bootstrap-deep.js'),
      type: TYPE.ROUTES,
      deep: true,
    });
    genFile({
      baseDir,
      pagesDir,
      outputFile: join(baseDir, 'routes-deep.js'),
      type: TYPE.BOOTSTRAP,
      deep: true,
    });
  });
});
