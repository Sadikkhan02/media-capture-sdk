import { describe, it, expect } from "vitest";
import {
  formatDuration,
  clamp,
  getBestSupportedMimeType,
  isBrowser,
  checkBrowserCapabilities,
} from "../../src/core/utils.js";

describe("Utility Functions", () => {
  it("formatDuration formats seconds to MM:SS and HH:MM:SS", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(5)).toBe("00:05");
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(3665)).toBe("1:01:05");
  });

  it("clamp clamps values within bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("isBrowser returns false in pure Node environment", () => {
    expect(isBrowser()).toBe(false);
  });

  it("checkBrowserCapabilities reports environment safely without throwing", () => {
    const caps = checkBrowserCapabilities();
    expect(caps.isBrowser).toBe(false);
    expect(caps.hasMediaDevices).toBe(false);
    expect(caps.hasMediaRecorder).toBe(false);
  });

  it("getBestSupportedMimeType returns fallback in non-browser environment", () => {
    const mime = getBestSupportedMimeType("video/webm");
    expect(mime).toBe("video/webm");
  });
});
