import { join } from 'path';
import gen from '../genCode';
import { TYPE } from '../const';

const baseDir = join(__dirname, '../../demo');
const pagesDir = join(baseDir, 'pages');
process.env.NODE_ENV = 'development';
describe('gen code', () => {
  it('gen bootstrap', async () => {
    const code = gen({
      outputFile: join(baseDir, 'bootstrap.js'),
      baseDir: './test',
      pagesDir,
      indexFile: './index.js',
      type: TYPE.BOOTSTRAP,
    });
    expect(code).toMatchSnapshot();
  });
  it('gen route', async () => {
    const code = gen({
      pagesDir,
      outputFile: join(baseDir, 'routes.js'),
      type: TYPE.ROUTES,
    });
    expect(code).toMatchSnapshot();
  });
  it('gen route deep', async () => {
    const code = gen({
      pagesDir,
      outputFile: join(baseDir, 'routes.js'),
      type: TYPE.ROUTES,
      deep: true,
    });
    expect(code).toMatchSnapshot();
  });
});
