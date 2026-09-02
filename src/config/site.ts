export const siteBasePath = "/economic-choices";

export function withSiteBasePath(path: `/${string}`): string {
  return `${siteBasePath}${path}`;
}
