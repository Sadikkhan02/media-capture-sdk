import { CameraController, CameraOptions } from "../types.js";
import { MediaResult } from "../types.js";

export interface CameraUIOptions {
  camera?: CameraController;
  cameraOptions?: CameraOptions;
  mode?: "video" | "photo" | "both";
  showCameraSelect?: boolean;
  showFilterSelect?: boolean;
  mirror?: boolean;
  labels?: {
    takePhoto?: string;
    startRecording?: string;
    stopRecording?: string;
    pause?: string;
    resume?: string;
  };
  onCapture?: (media: MediaResult) => void;
  onError?: (error: Error) => void;
}

export class CameraUIWidget {
  readonly container: HTMLElement;
  readonly options: CameraUIOptions;
  readonly camera: CameraController;

  constructor(container: HTMLElement, options?: CameraUIOptions);
  mount(): Promise<void>;
  unmount(): void;
}

export function createCameraUI(container: HTMLElement, options?: CameraUIOptions): CameraUIWidget;
