import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StreamRecorder } from "../../src/core/recorder.js";
import { InvalidStateError } from "../../src/core/errors.js";

describe("StreamRecorder Lifecycle with Mocks", () => {
  let mockStream;
  let mockMediaRecorderInstance;
  const originalWindow = global.window;
  const originalMediaRecorder = global.MediaRecorder;

  beforeEach(() => {
    mockStream = {
      active: true,
      getTracks: () => [{ kind: "video", stop: vi.fn() }],
      getVideoTracks: () => [{ getSettings: () => ({ width: 1280, height: 720 }) }],
      getAudioTracks: () => [],
    };

    class MockMediaRecorder {
      static isTypeSupported() {
        return true;
      }
      constructor() {
        this.state = "inactive";
        this.mimeType = "video/webm;codecs=vp9,opus";
        this.ondataavailable = null;
        this.onstop = null;
        this.onerror = null;
        mockMediaRecorderInstance = this;
      }
      start(_timeslice) {
        this.state = "recording";
      }
      pause() {
        this.state = "paused";
      }
      resume() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        if (this.ondataavailable) {
          this.ondataavailable({ data: new Blob(["sample chunk"], { type: this.mimeType }) });
        }
        if (this.onstop) {
          this.onstop();
        }
      }
    }

    Object.defineProperty(global, "window", {
      value: { MediaRecorder: MockMediaRecorder },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, "MediaRecorder", {
      value: MockMediaRecorder,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(global, "MediaRecorder", {
      value: originalMediaRecorder,
      configurable: true,
      writable: true,
    });
  });

  it("records video, handles pause/resume, and produces MediaResult on stop", async () => {
    const recorder = new StreamRecorder(mockStream);
    expect(recorder.state).toBe("idle");

    recorder.start({ mimeType: "video/webm" });
    expect(recorder.state).toBe("recording");
    expect(mockMediaRecorderInstance.state).toBe("recording");

    recorder.pause();
    expect(recorder.state).toBe("paused");
    expect(mockMediaRecorderInstance.state).toBe("paused");

    recorder.resume();
    expect(recorder.state).toBe("recording");
    expect(mockMediaRecorderInstance.state).toBe("recording");

    const result = await recorder.stop();
    expect(recorder.state).toBe("stopped");
    expect(result.kind).toBe("video");
    expect(result.mimeType).toBe("video/webm;codecs=vp9,opus");
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);

    recorder.dispose();
  });

  it("prevents invalid lifecycle transitions", () => {
    const recorder = new StreamRecorder(mockStream);
    expect(() => recorder.pause()).toThrow(InvalidStateError);
    expect(() => recorder.resume()).toThrow(InvalidStateError);
  });
});
