import React from "react";
import { CameraController, CameraLifecycleState, CameraOptions } from "../types.js";
import { ScreenCaptureController, ScreenCaptureOptions } from "../types.js";
import { MediaResult, PhotoCaptureOptions, RecordingOptions } from "../types.js";

export interface UseCameraReturn {
  camera: CameraController | null;
  state: CameraLifecycleState;
  stream: MediaStream | null;
  error: Error | null;
  duration: number;
  previewRef: (element: HTMLVideoElement | null) => void;
  isRecording: boolean;
  isPaused: boolean;
  isActive: boolean;
  open: () => Promise<MediaStream | null>;
  close: () => void;
  capturePhoto: (options?: PhotoCaptureOptions) => Promise<MediaResult>;
  startRecording: (options?: RecordingOptions) => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<MediaResult>;
  switchCamera: (target: string | { deviceId?: string; facingMode?: "user" | "environment" }) => Promise<MediaStream>;
}

export function useCamera(options?: CameraOptions): UseCameraReturn;

export interface UseScreenCaptureReturn {
  screenCapture: ScreenCaptureController | null;
  state: "idle" | "capturing" | "recording" | "stopped";
  stream: MediaStream | null;
  error: Error | null;
  previewRef: (element: HTMLVideoElement | null) => void;
  isRecording: boolean;
  startCapture: (constraints?: DisplayMediaStreamOptions) => Promise<MediaStream | null>;
  stop: () => void;
  startRecording: (options?: RecordingOptions) => void;
  stopRecording: () => Promise<MediaResult>;
}

export function useScreenCapture(options?: ScreenCaptureOptions): UseScreenCaptureReturn;

export interface CameraCaptureViewProps {
  mode?: "video" | "photo" | "both";
  onCapture?: (media: MediaResult) => void;
  onError?: (error: Error) => void;
  className?: string;
  style?: React.CSSProperties;
  showControls?: boolean;
}

export const CameraCaptureView: React.FC<CameraCaptureViewProps>;
