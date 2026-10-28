/**
 * Built-in visual filter presets and CSS filter generators
 */

export const FILTER_PRESETS = {
  none: "none",
  grayscale: "grayscale(100%)",
  sepia: "sepia(100%)",
  blur: "blur(4px)",
  highContrast: "contrast(180%)",
  brightness: "brightness(140%)",
  darken: "brightness(70%)",
  invert: "invert(100%)",
  vintage: "sepia(50%) contrast(120%) brightness(90%)",
  warm: "sepia(30%) saturate(140%)",
  cool: "hue-rotate(180deg) saturate(120%)",
  dramatic: "contrast(150%) grayscale(40%)",
};

/**
 * Returns CSS filter string for a preset name or custom filter string
 * @param {keyof typeof FILTER_PRESETS | string} filterNameOrString
 * @returns {string}
 */
export function getFilterCss(filterNameOrString) {
  if (!filterNameOrString) return "none";
  if (FILTER_PRESETS[filterNameOrString]) {
    return FILTER_PRESETS[filterNameOrString];
  }
  return filterNameOrString;
}

/**
 * Applies a filter string directly to a 2D canvas context
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} filterString
 */
export function applyFilterToCanvas(ctx, filterString) {
  if (!ctx) return;
  ctx.filter = getFilterCss(filterString);
}
