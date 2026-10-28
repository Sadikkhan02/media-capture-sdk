export const FILTER_PRESETS: {
  readonly none: "none";
  readonly grayscale: "grayscale(100%)";
  readonly sepia: "sepia(100%)";
  readonly blur: "blur(4px)";
  readonly highContrast: "contrast(180%)";
  readonly brightness: "brightness(140%)";
  readonly darken: "brightness(70%)";
  readonly invert: "invert(100%)";
  readonly vintage: "sepia(50%) contrast(120%) brightness(90%)";
  readonly warm: "sepia(30%) saturate(140%)";
  readonly cool: "hue-rotate(180deg) saturate(120%)";
  readonly dramatic: "contrast(150%) grayscale(40%)";
};

export function getFilterCss(filterNameOrString: keyof typeof FILTER_PRESETS | string): string;
export function applyFilterToCanvas(ctx: CanvasRenderingContext2D, filterString: string): void;

export class FilteredStreamProcessor {
  constructor(videoElement: HTMLVideoElement, options?: { filter?: string; frameRate?: number });
  start(): MediaStream;
  setFilter(newFilter: string): void;
  stop(): void;
}

export function createFilteredStream(videoElement: HTMLVideoElement, options?: { filter?: string; frameRate?: number }): FilteredStreamProcessor;
