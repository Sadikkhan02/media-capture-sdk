import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("Built Bundles Import Verification", () => {
  it("imports built ESM dist bundle correctly", async () => {
    const esmRoot = await import(path.resolve("dist/index.js"));
    expect(esmRoot.createCamera).toBeTypeOf("function");
    expect(esmRoot.createScreenCapture).toBeTypeOf("function");
    expect(esmRoot.MediaResult).toBeTypeOf("function");
    expect(esmRoot.MediaCaptureError).toBeTypeOf("function");

    const esmFilters = await import(path.resolve("dist/filters/index.js"));
    expect(esmFilters.FILTER_PRESETS).toBeDefined();

    const esmReact = await import(path.resolve("dist/react/index.js"));
    expect(esmReact.useCamera).toBeTypeOf("function");
  });

  it("requires built CommonJS dist bundle correctly", () => {
    const cjsRoot = require(path.resolve("dist/index.cjs"));
    expect(cjsRoot.createCamera).toBeTypeOf("function");
    expect(cjsRoot.createScreenCapture).toBeTypeOf("function");
    expect(cjsRoot.MediaResult).toBeTypeOf("function");
    expect(cjsRoot.MediaCaptureError).toBeTypeOf("function");

    const cjsFilters = require(path.resolve("dist/filters/index.cjs"));
    expect(cjsFilters.FILTER_PRESETS).toBeDefined();

    const cjsReact = require(path.resolve("dist/react/index.cjs"));
    expect(cjsReact.useCamera).toBeTypeOf("function");
  });
});
