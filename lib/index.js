const { join } = require('path');
const genBoostrap = require('./genBootstrap');
const chokidar = require('chokidar');

class RouterPlugin {
  constructor(options = {}) {
    this.options = Object.assign(
      {
        pagesDir: './src/pages',
        bootstrapFile: './src/bootstrap.js',
      },
      options
    );
  }
  apply(compiler) {
    let bootstrapFile = '';
    let pagesDir = '';
    let indexFile = '';
    compiler.hooks.entryOption.tap('RouterPlugin', (context, entry) => {
      if (entry && Object.keys(entry).length > 1) {
        throw new Error(
          '不支持定义多入口，自动路由应用仅仅支持单一入口，请确保只定义了一个入口'
        );
      }
      if (!entry || Object.keys(entry).length === 0) {
        entry = join(context, './src/index');
      }
      const key = Object.keys(entry)[0];
      const tmp = entry[key];
      let readyAddEntry = false;
      if (typeof tmp === 'string') {
        indexFile = tmp;
      } else if (tmp instanceof Array) {
        indexFile = tmp[tmp.length - 1];
        if (indexFile === bootstrapFile) {
          readyAddEntry = true;
          indexFile = tmp[tmp.length - 2];
        }
      }
      if (!indexFile || typeof indexFile !== 'string') {
        throw new Error('不支持非string/array的entry配置');
      }
      bootstrapFile = join(context, this.options.bootstrapFile);
      pagesDir = join(context, this.options.pagesDir);
      genBoostrap(bootstrapFile, pagesDir, indexFile);
      if (!readyAddEntry) {
        if (typeof tmp == 'string') {
          entry[key] = bootstrapFile;
        } else {
          entry[key].push(bootstrapFile);
        }
      }
    });
    let watch = false;
    compiler.hooks.watchRun.tap('RouterPlugin', () => {
      if (watch) {
        return;
      }
      watch = true;
      chokidar
        .watch(
          [
            join(pagesDir, '*.{js,jsx,ts,tsx}'),
            join(pagesDir, '*/index.{js,jsx,ts,tsx}'),
          ],
          {}
        )
        .on('all', () => {
          try {
            genBoostrap(bootstrapFile, pagesDir, indexFile);
          } catch (e) {
            console.error('[route error]', e);
          }
        });
    });
  }
}

module.exports = RouterPlugin;
