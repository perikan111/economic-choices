import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["src/game-core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "react",
            "react-dom",
            "next",
            "next/*",
            "@/app/*",
            "@/components/*",
            "@/features/*",
            "@/platform/*"
          ]
        }
      ]
    }
  },
  globalIgnores([".next/**", "out/**", "coverage/**", "next-env.d.ts"])
]);
