import { describe, it, expect } from "vitest";

describe("Next.js & SSR Safety", () => {
  it("allows importing root package without throwing in Node environment", async () => {
    const sdk = await import("../../src/index.js");
    expect(sdk.createCamera).toBeDefined();
    expect(sdk.createScreenCapture).toBeDefined();
    expect(sdk.MediaCaptureError).toBeDefined();
  });

  it("allows importing /filters without throwing in Node environment", async () => {
    const filters = await import("../../src/filters/index.js");
    expect(filters.FILTER_PRESETS).toBeDefined();
    expect(filters.getFilterCss).toBeDefined();
  });

  it("allows importing /react without throwing in Node environment", async () => {
    const reactAdapter = await import("../../src/react/index.js");
    expect(reactAdapter.useCamera).toBeDefined();
    expect(reactAdapter.useScreenCapture).toBeDefined();
    expect(reactAdapter.CameraCaptureView).toBeDefined();
  });

  it("createCamera does not access browser globals at instantiation time", async () => {
    const { createCamera } = await import("../../src/index.js");
    const camera = createCamera({ mode: "both" });
    expect(camera.state).toBe("idle");
    expect(camera.isRecording).toBe(false);
  });
});
