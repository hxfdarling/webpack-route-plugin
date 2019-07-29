const { join } = require('path');
const gen = require('./genBootstrap');

const baseDir = join(__dirname, '../test');
const pagesDir = join(baseDir, 'pages');
const file = join(baseDir, 'bootstrap.js');
process.env.NODE_ENV = 'development';
gen(file, pagesDir, 'index.js');
