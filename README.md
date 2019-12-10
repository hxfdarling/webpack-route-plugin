# webpack-route-plugin

根据目录自动生成页面 route 配置，非常适合 SPA 应用的自动路由生成，去中心化路由配置

支持多种配置方案

```js
export default function Home() {
  return <div>home</div>;
}
Home.route = [
  {
    name: 'Home',
    path: '/',
  },
  {
    path: '/test',
    redirect: '/',
  },
];
// or
Home.route = {
  name: 'Home',
  path: '/',
};

// or
export const routes=[
{
  name:"Home",
  path:'/',
}
]
```

> 注意：仅支持字面量配置，不支持函数执行
