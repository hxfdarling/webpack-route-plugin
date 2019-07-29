const { join } = require('path');
const genBoostrap = require('./genBootstrap');
const fs = require('fs-extra');

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
        entry = './src/index.js';
      }
      const key = Object.keys(entry)[0];
      const tmp = entry[key];
      if (typeof tmp === 'string') {
        indexFile = tmp;
      } else if (tmp instanceof Array) {
        indexFile = tmp[tmp.length - 1];
      }
      if (!indexFile || typeof indexFile !== 'string') {
        throw new Error('不支持非string/array的entry配置');
      }
      bootstrapFile = join(context, this.options.bootstrapFile);
      pagesDir = join(context, this.options.pagesDir);
      genBoostrap(bootstrapFile, pagesDir, indexFile);

      if (typeof tmp == 'string') {
        entry[key] = bootstrapFile;
      } else {
        entry[key][tmp.length - 1] = bootstrapFile;
      }
    });
    let watch = false;
    compiler.hooks.watchRun.tap('RouterPlugin', compiler => {
      if (watch) {
        return;
      }
      watch = true;
      fs.watch(pagesDir, { encoding: 'buffer' }, (eventType, filename) => {
        if (filename) {
          try {
            genBoostrap(bootstrapFile, pagesDir, indexFile);
          } catch (e) {
            console.error('[route error]', e);
          }
        }
      });
    });
  }
}

module.exports = RouterPlugin;
