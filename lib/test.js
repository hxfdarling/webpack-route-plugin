const { join } = require("path");
const gen = require("./genBootstrap");

const baseDir = join(__dirname, "../test");
const pagesDir = join(baseDir, "pages");
process.env.NODE_ENV = "development";
gen({
  baseDir: "./test",
  outputFile: join(baseDir, "bootstrap.js"),
  pagesDir,
  indexFile: "./index.js",
  type: "bootstrap"
});
gen({ outputFile: join(baseDir, "routes.js"), pagesDir, type: "route" });
