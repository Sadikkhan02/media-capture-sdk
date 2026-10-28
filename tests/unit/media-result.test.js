import { describe, it, expect } from "vitest";
import { MediaResult } from "../../src/core/media-result.js";

describe("MediaResult Contract", () => {
  it("constructs MediaResult correctly with metadata", async () => {
    const rawData = new Uint8Array([1, 2, 3, 4]);
    const blob = new Blob([rawData], { type: "image/jpeg" });

    const result = new MediaResult({
      blob,
      kind: "photo",
      mimeType: "image/jpeg",
      width: 1920,
      height: 1080,
      metadata: { filter: "grayscale" },
    });

    expect(result.kind).toBe("photo");
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.size).toBe(4);
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.defaultFilename).toMatch(/\.jpg$/);
    expect(result.metadata.filter).toBe("grayscale");

    const buf = await result.arrayBuffer();
    expect(new Uint8Array(buf)).toEqual(rawData);
  });

  it("converts to standard File representation", () => {
    const blob = new Blob(["video data"], { type: "video/webm" });
    const result = new MediaResult({
      blob,
      kind: "video",
      mimeType: "video/webm",
      duration: 3.5,
    });

    expect(result.duration).toBe(3.5);
    expect(result.defaultFilename).toMatch(/\.webm$/);
    expect(result.file).toBeDefined();
    expect(result.file.name).toBe(result.defaultFilename);
    expect(result.file.type).toBe("video/webm");
  });

  it("throws TypeError if blob is missing or invalid", () => {
    expect(() => new MediaResult({ blob: null, kind: "photo" })).toThrow(TypeError);
  });

  it("handles URL revocation safely", () => {
    const blob = new Blob(["test"], { type: "text/plain" });
    const result = new MediaResult({ blob, kind: "photo", mimeType: "text/plain" });
    // In node environment, url returns empty string and revokeUrl executes safely
    expect(result.url).toBe("");
    expect(() => result.revokeUrl()).not.toThrow();
  });
});
