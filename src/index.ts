import chokidar from 'chokidar';
import { join } from 'path';
import genBootstrap from './genCode';
import { TYPE } from './const';

export class RouterPlugin {
  options: any;
  constructor(options = {}) {
    this.options = Object.assign(
      {
        baseDir: './src',
        outputFile: null,
        pagesDir: './src/pages',
        type: TYPE.BOOTSTRAP, // route/bootstrap
        ignoreFiles: [],
      },
      options,
    );
    if ([TYPE.ROUTES, TYPE.BOOTSTRAP].indexOf(this.options.type) < 0) {
      throw Error(
        '[webpack-route-plugin][error]' +
          'options.type support "bootstrap"+"route',
      );
    }
    if (!this.options.outputFile) {
      if (this.options.type === TYPE.ROUTES) {
        this.options.outputFile = './src/routes.js';
      } else {
        this.options.outputFile = './src/bootstrap.js';
      }
    }
  }

  apply(compiler) {
    if (this.options.type === 'bootstrap') {
      this.genBootstrap(compiler);
    } else {
      this.genRoutes(compiler);
    }
  }

  genBootstrap(compiler) {
    let outputFile = '';
    let pagesDir = '';
    let indexFile = '';
    compiler.hooks.entryOption.tap('RouterPlugin', (context, entry) => {
      if (entry && Object.keys(entry).length > 1) {
        throw new Error(
          '不支持定义多入口，自动路由应用仅仅支持单一入口，请确保只定义了一个入口',
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
        if (indexFile === outputFile) {
          readyAddEntry = true;
          indexFile = tmp[tmp.length - 2];
        }
      }
      if (!indexFile || typeof indexFile !== 'string') {
        throw new Error('不支持非string/array的entry配置');
      }
      outputFile = join(context, this.options.outputFile);
      pagesDir = join(context, this.options.pagesDir);
      genBootstrap({
        ...this.options,
        outputFile,
        pagesDir,
        indexFile,
      });
      if (!readyAddEntry) {
        if (typeof tmp === 'string') {
          entry[key] = outputFile;
        } else {
          entry[key].push(outputFile);
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
          {},
        )
        .on('all', () => {
          try {
            genBootstrap({
              ...this.options,
              outputFile,
              pagesDir,
              indexFile,
            });
          } catch (e) {
            console.error('[webpack-route-plugin][error]', e);
            console.trace();
          }
        });
    });
  }

  genRoutes(compiler) {
    let outputFile = '';
    let pagesDir = '';
    compiler.hooks.entryOption.tap('RouterPlugin', context => {
      outputFile = join(context, this.options.outputFile);
      pagesDir = join(context, this.options.pagesDir);
      genBootstrap({
        ...this.options,
        outputFile,
        pagesDir,
      });
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
          {},
        )
        .on('all', () => {
          try {
            genBootstrap({
              ...this.options,
              outputFile,
              pagesDir,
            });
          } catch (e) {
            console.error('[webpack-route-plugin][error]', e);
            console.trace();
          }
        });
    });
  }
}