import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.js",
    "ui/index": "src/ui/index.js",
    "filters/index": "src/filters/index.js",
    "react/index": "src/react/index.js",
  },
  format: ["esm", "cjs"],
  dts: false, // We provide high-quality handwritten src/types.d.ts copied/built to dist
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: "es2022",
  external: ["react", "react-dom"],
  onSuccess: async () => {
    // Copy types and CSS to dist
    const fs = await import("node:fs");
    const path = await import("node:path");

    if (!fs.existsSync("dist")) {
      fs.mkdirSync("dist", { recursive: true });
    }
    // Copy main types
    fs.copyFileSync("src/types.d.ts", "dist/index.d.ts");
    
    // Copy ui types and css
    if (!fs.existsSync("dist/ui")) fs.mkdirSync("dist/ui", { recursive: true });
    if (fs.existsSync("src/ui/types.d.ts")) {
      fs.copyFileSync("src/ui/types.d.ts", "dist/ui/index.d.ts");
    }
    if (fs.existsSync("src/ui/styles.css")) {
      fs.copyFileSync("src/ui/styles.css", "dist/ui/styles.css");
    }

    // Copy filters types
    if (!fs.existsSync("dist/filters")) fs.mkdirSync("dist/filters", { recursive: true });
    if (fs.existsSync("src/filters/types.d.ts")) {
      fs.copyFileSync("src/filters/types.d.ts", "dist/filters/index.d.ts");
    }

    // Copy react types
    if (!fs.existsSync("dist/react")) fs.mkdirSync("dist/react", { recursive: true });
    if (fs.existsSync("src/react/types.d.ts")) {
      fs.copyFileSync("src/react/types.d.ts", "dist/react/index.d.ts");
    }
  },
});
