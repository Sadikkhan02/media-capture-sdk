import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CameraController } from "../../src/core/camera.js";
import { NotSupportedError, InvalidStateError } from "../../src/core/errors.js";

describe("CameraController Lifecycle with Browser Mocks", () => {
  let mockTrack;
  let mockStream;
  const originalNavigator = global.navigator;
  const originalWindow = global.window;

  beforeEach(() => {
    mockTrack = {
      kind: "video",
      stop: vi.fn(),
      getSettings: () => ({ deviceId: "camera-1", width: 1280, height: 720 }),
      onended: null,
    };

    mockStream = {
      active: true,
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
      getAudioTracks: () => [],
    };

    // Safely install mock navigator and window via Object.defineProperty
    Object.defineProperty(global, "window", {
      value: {},
      configurable: true,
      writable: true,
    });

    Object.defineProperty(global, "navigator", {
      value: {
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue(mockStream),
          enumerateDevices: vi.fn().mockResolvedValue([
            { deviceId: "cam-1", kind: "videoinput", label: "Front Camera", groupId: "1" },
            { deviceId: "cam-2", kind: "videoinput", label: "Back Camera", groupId: "2" },
          ]),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
        permissions: {
          query: vi.fn().mockResolvedValue({ state: "granted" }),
        },
      },
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
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it("opens camera, transitions state from idle to opening to ready", async () => {
    const states = [];
    const camera = new CameraController({
      resolution: "720p",
      onStateChange: (state) => states.push(state),
    });

    expect(camera.state).toBe("idle");
    const stream = await camera.open();

    expect(stream).toBe(mockStream);
    expect(camera.state).toBe("ready");
    expect(states).toEqual(["opening", "ready"]);
    expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
  });

  it("switches camera deviceId and releases previous tracks", async () => {
    const camera = new CameraController();
    await camera.open();

    await camera.switchCamera("camera-2");

    expect(mockTrack.stop).toHaveBeenCalled();
    expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({
          deviceId: { exact: "camera-2" },
        }),
      })
    );
  });

  it("closes camera and stops media stream tracks", async () => {
    const camera = new CameraController();
    await camera.open();

    camera.close();

    expect(camera.state).toBe("closed");
    expect(mockTrack.stop).toHaveBeenCalled();
    expect(camera.stream).toBeNull();
  });

  it("disposes camera and prevents subsequent open", async () => {
    const camera = new CameraController();
    await camera.open();
    camera.dispose();

    expect(camera.state).toBe("disposed");
    await expect(camera.open()).rejects.toBeInstanceOf(InvalidStateError);
  });

  it("handles getUserMedia unsupported environment", async () => {
    delete global.navigator.mediaDevices.getUserMedia;
    const camera = new CameraController();
    await expect(camera.open()).rejects.toBeInstanceOf(NotSupportedError);
  });
});
