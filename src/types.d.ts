/**
 * TypeScript Declarations for media-capture-sdk
 */

export type CameraLifecycleState =
  | "idle"
  | "opening"
  | "ready"
  | "recording"
  | "paused"
  | "closed"
  | "disposed";

export type MediaKind = "photo" | "video" | "screenshot";

export interface MediaResultMetadata extends Record<string, unknown> {
  sourceWidth?: number;
  sourceHeight?: number;
  filter?: string;
  mirrored?: boolean;
  frameRate?: number;
  chunkCount?: number;
}

export class MediaResult {
  readonly blob: Blob;
  readonly kind: MediaKind;
  readonly mimeType: string;
  readonly width?: number;
  readonly height?: number;
  readonly duration?: number;
  readonly size: number;
  readonly timestamp: Date;
  readonly defaultFilename: string;
  readonly metadata: MediaResultMetadata;

  get file(): File;
  get url(): string;

  revokeUrl(): void;
  arrayBuffer(): Promise<ArrayBuffer>;
  toDataURL(): Promise<string>;
  download(filename?: string): void;
}

export interface PhotoCaptureOptions {
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
  quality?: number;
  width?: number;
  height?: number;
  mirror?: boolean;
  filter?: string;
  kind?: "photo" | "screenshot";
}

export interface RecordingOptions {
  mimeType?: string;
  timeSlice?: number;
  maxDuration?: number;
  maxSizeBytes?: number;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
}

export interface ResolutionDimension {
  width: number;
  height: number;
}

export type ResolutionPreset = "480p" | "720p" | "1080p" | "4k" | ResolutionDimension;

export interface CameraOptions {
  mode?: "video" | "photo" | "both";
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
  deviceId?: string;
  facingMode?: "user" | "environment";
  resolution?: ResolutionPreset;
  frameRate?: number;
  previewElement?: HTMLVideoElement;
  onCapture?: (media: MediaResult) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: CameraLifecycleState) => void;
}

export interface MediaDeviceInfoSummary {
  deviceId: string;
  label: string;
  kind: string;
  groupId: string;
}

export class EventEmitter {
  on(event: string, handler: (...args: any[]) => void): () => void;
  off(event: string, handler: (...args: any[]) => void): void;
  once(event: string, handler: (...args: any[]) => void): () => void;
  emit(event: string, ...args: any[]): void;
  removeAllListeners(event?: string): void;
}

export class CameraController extends EventEmitter {
  readonly options: CameraOptions;
  readonly state: CameraLifecycleState;
  readonly stream: MediaStream | null;
  readonly previewElement: HTMLVideoElement | null;
  readonly isRecording: boolean;
  readonly isPaused: boolean;
  readonly isActive: boolean;

  constructor(options?: CameraOptions);

  open(): Promise<MediaStream>;
  attachPreview(videoElement: HTMLVideoElement): void;
  detachPreview(): void;
  switchCamera(target: string | { deviceId?: string; facingMode?: "user" | "environment" }): Promise<MediaStream>;
  getCameras(): Promise<MediaDeviceInfoSummary[]>;
  getMicrophones(): Promise<MediaDeviceInfoSummary[]>;
  capturePhoto(options?: PhotoCaptureOptions): Promise<MediaResult>;
  captureScreenshot(options?: PhotoCaptureOptions): Promise<MediaResult>;
  startRecording(options?: RecordingOptions): void;
  pauseRecording(): void;
  resumeRecording(): void;
  stopRecording(): Promise<MediaResult>;
  close(): void;
  dispose(): void;
  getStream(): MediaStream | null;
  getVideoElement(): HTMLVideoElement | null;
}

export function createCamera(options?: CameraOptions): CameraController;

export { CameraUIWidget, createCameraUI, CameraUIOptions } from "./ui/types.js";

export interface ScreenCaptureOptions {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
  displaySurface?: "screen" | "window" | "tab";
  onCapture?: (media: MediaResult) => void;
  onError?: (error: Error) => void;
}

export class ScreenCaptureController extends EventEmitter {
  readonly options: ScreenCaptureOptions;
  readonly state: "idle" | "capturing" | "recording" | "stopped";
  readonly stream: MediaStream | null;

  constructor(options?: ScreenCaptureOptions);

  startCapture(customConstraints?: DisplayMediaStreamOptions): Promise<MediaStream>;
  attachPreview(videoElement: HTMLVideoElement): void;
  startRecording(options?: RecordingOptions): void;
  pauseRecording(): void;
  resumeRecording(): void;
  stopRecording(): Promise<MediaResult>;
  stop(): void;
  dispose(): void;
}

export function createScreenCapture(options?: ScreenCaptureOptions): ScreenCaptureController;

export class StreamRecorder extends EventEmitter {
  readonly state: "idle" | "recording" | "paused" | "stopped";
  readonly stream: MediaStream;

  constructor(stream: MediaStream, defaultOptions?: RecordingOptions);

  start(options?: RecordingOptions): void;
  pause(): void;
  resume(): void;
  stop(): Promise<MediaResult>;
  getDuration(): number;
  dispose(): void;
}

export function capturePhotoFromVideo(videoElement: HTMLVideoElement, options?: PhotoCaptureOptions): Promise<MediaResult>;

export function getCameras(): Promise<MediaDeviceInfoSummary[]>;
export function getMicrophones(): Promise<MediaDeviceInfoSummary[]>;
export function getMediaDevices(): Promise<MediaDeviceInfo[]>;
export function getPermissionStatus(permissionName?: "camera" | "microphone"): Promise<"granted" | "prompt" | "denied" | "unsupported">;
export function onDeviceChange(callback: (devices: MediaDeviceInfo[]) => void): () => void;

export function checkBrowserCapabilities(): {
  isBrowser: boolean;
  isSecureContext: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasGetDisplayMedia: boolean;
  hasMediaRecorder: boolean;
};

export function getSupportedVideoMimeTypes(): string[];
export function getBestSupportedMimeType(preferredMimeType?: string): string;
export function isBrowser(): boolean;
export function isSecureContext(): boolean;
export function formatDuration(seconds: number): string;

export const CANDIDATE_RECORDING_MIME_TYPES: string[];
export const RESOLUTION_PRESETS: Record<string, MediaTrackConstraints>;

export class MediaCaptureError extends Error {
  readonly code: string;
  readonly originalError: Error | DOMException | null;
  readonly details: Record<string, unknown>;
  constructor(message: string, code?: string, originalError?: Error | DOMException | null, details?: Record<string, unknown>);
}

export class PermissionDeniedError extends MediaCaptureError {}
export class DeviceNotFoundError extends MediaCaptureError {}
export class DeviceNotReadableError extends MediaCaptureError {}
export class NotSupportedError extends MediaCaptureError {}
export class UserCancelledError extends MediaCaptureError {}
export class RecordingError extends MediaCaptureError {}
export class InvalidStateError extends MediaCaptureError {}
export class ConfigurationError extends MediaCaptureError {}

export function parseMediaError(error: unknown, contextMessage?: string): MediaCaptureError;
