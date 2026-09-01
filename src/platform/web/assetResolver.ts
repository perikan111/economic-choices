export interface AssetResolver {
  image(logicalPath: string): string;
  audio(logicalPath: string): string;
}

export const webAssets: AssetResolver = {
  image: (path) => `/images/${path}`,
  audio: (path) => `/voice/${path}`,
};
