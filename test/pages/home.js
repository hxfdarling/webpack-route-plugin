import React from 'react';
function Home() {
  return <div>test</div>;
}

Home.route = [
  {
    path: '/'
  },
  {
    path: '/test',
    redirect: '/home',
    sort:1000
  },
];

export default Home;
