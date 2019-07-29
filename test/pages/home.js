import React from 'react';
function Home() {
  return <div>test</div>;
}

Home.route = [
  {
    name: '主页',
    permission: true,
    path: '/',
    parent: '测试页面',
  },
  {
    path: '/test',
    redirect: '/home',
  },
];

export default Home;
