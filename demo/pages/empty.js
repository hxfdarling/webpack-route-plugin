const Test = function X() {};
export default Test;
export const routes = [
  {
    path: '/test',
    name: 'test',
    icon: require('./var'),
  },
  {
    path: '/test2',
    icon: import('./var'),
  },
];
