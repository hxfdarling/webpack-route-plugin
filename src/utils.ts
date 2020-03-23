export const hasRouteConfig = (data: string) =>
  /(export\s+const\s+routes)|([\w]+\.route)/.test(data);
