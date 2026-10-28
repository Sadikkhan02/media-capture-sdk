import { describe, it, expect } from "vitest";
import {
  FILTER_PRESETS,
  getFilterCss,
  applyFilterToCanvas,
} from "../../src/filters/presets.js";

describe("Visual Filter Presets", () => {
  it("exports standard filter presets", () => {
    expect(FILTER_PRESETS.none).toBe("none");
    expect(FILTER_PRESETS.grayscale).toBe("grayscale(100%)");
    expect(FILTER_PRESETS.sepia).toBe("sepia(100%)");
    expect(FILTER_PRESETS.blur).toBe("blur(4px)");
  });

  it("getFilterCss resolves preset names or returns raw string", () => {
    expect(getFilterCss("grayscale")).toBe("grayscale(100%)");
    expect(getFilterCss("custom(50%)")).toBe("custom(50%)");
    expect(getFilterCss("")).toBe("none");
  });

  it("applyFilterToCanvas sets filter property on 2D context", () => {
    const mockCtx = { filter: "" };
    applyFilterToCanvas(mockCtx, "sepia");
    expect(mockCtx.filter).toBe("sepia(100%)");
  });
});
