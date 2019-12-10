# webpack-route-plugin

根据目录自动生成页面 route 配置，非常适合 SPA 应用的自动路由生成，去中心化路由配置

## webpack 配置

```js
const RoutePlugin = require("webpack-route-plugin");
module.exports = {
  //
  plugins: [
    new RoutePlugin({
      baseDir: "./src", // 默认配置
      pagesDir: "./src/pages", // 默认配置
      outputFile: "./src/bootstrap.js", // 默认配置
      type: "bootstrap" // bootstrap/routes
    })
  ]
};
```

### options

`baseDir`: 用于生成路由时，组件路径的相对路径解析

`pagesDir`: 扫描页面的目录，默认:`./src/pages`

`outputFile`: 自定义输入文件名称, 若`type='route'`,默认`./src/routes.js`，若`type='bootstrap`，默认值为:`./src/bootstrap.js`

`type`: 自动生成文件类型，默认`bootstrap`生成入口文件，`route`生成纯 route

## 路由配置

支持多种配置方案

```js
// 页面入口
export default function Home() {
  return <div>home</div>;
}

Home.route = [
  {
    name: "Home",
    path: "/"
  },
  {
    path: "/test",
    redirect: "/"
  }
];
// or
Home.route = {
  name: "Home",
  path: "/"
};

// or
export const routes = [
  {
    name: "Home",
    path: "/"
  }
];
```

> 注意：仅支持字面量配置，不支持函数执行
