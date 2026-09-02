import { withSiteBasePath } from "@/config/site";

export interface AssetResolver {
  image(logicalPath: string): string;
  audio(logicalPath: string): string;
}

function publicAssetPath(directory: string, logicalPath: string): string {
  return withSiteBasePath(`/${directory}/${logicalPath.replace(/^\/+/, "")}`);
}

export const webAssets: AssetResolver = {
  image: (path) => publicAssetPath("images", path),
  audio: (path) => publicAssetPath("voice", path),
};
