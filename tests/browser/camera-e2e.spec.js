import { test, expect } from "@playwright/test";

test.describe("Real Browser Media Capture E2E", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => console.info("PAGE LOG:", msg.text()));
    page.on("pageerror", (err) => console.info("PAGE ERROR:", err.message));

    await page.goto("http://localhost:3344/index.html");
    await page.waitForFunction(() => Boolean(window.sdk?.createCamera), { timeout: 10000 });
  });

  test("initializes camera preview and plays video frames", async ({ page }) => {
    const videoDimensions = await page.evaluate(async () => {
      const videoEl = document.getElementById("preview-video");
      const camera = window.sdk.createCamera({
        resolution: "720p",
        onCapture: (media) => { window.sdk.lastCapture = media; },
      });
      window.sdk.activeCamera = camera;
      camera.attachPreview(videoEl);
      await camera.open();

      // Wait until video has metadata and is playing
      await new Promise((resolve) => {
        if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) return resolve();
        videoEl.onloadeddata = () => resolve();
      });

      return {
        state: camera.state,
        isActive: camera.isActive,
        width: videoEl.videoWidth,
        height: videoEl.videoHeight,
      };
    });

    expect(videoDimensions.state).toBe("ready");
    expect(videoDimensions.isActive).toBe(true);
    expect(videoDimensions.width).toBeGreaterThan(0);
    expect(videoDimensions.height).toBeGreaterThan(0);
  });

  test("captures photo with correct dimensions and blob data", async ({ page }) => {
    const photoInfo = await page.evaluate(async () => {
      const videoEl = document.getElementById("preview-video");
      const camera = window.sdk.createCamera();
      window.sdk.activeCamera = camera;
      camera.attachPreview(videoEl);
      await camera.open();

      await new Promise((resolve) => {
        if (videoEl.readyState >= 2) return resolve();
        videoEl.onloadeddata = () => resolve();
      });

      const photo = await camera.capturePhoto({
        mimeType: "image/jpeg",
        quality: 0.9,
      });

      return {
        kind: photo.kind,
        mimeType: photo.mimeType,
        width: photo.width,
        height: photo.height,
        size: photo.size,
      };
    });

    expect(photoInfo.kind).toBe("photo");
    expect(photoInfo.mimeType).toBe("image/jpeg");
    expect(photoInfo.width).toBeGreaterThan(0);
    expect(photoInfo.height).toBeGreaterThan(0);
    expect(photoInfo.size).toBeGreaterThan(100);
  });

  test("records real video in browser, stops, and produces valid MediaResult", async ({ page }) => {
    const videoInfo = await page.evaluate(async () => {
      const videoEl = document.getElementById("preview-video");
      const camera = window.sdk.createCamera({ audio: false });
      window.sdk.activeCamera = camera;
      camera.attachPreview(videoEl);
      await camera.open();

      camera.startRecording({ timeSlice: 250 });

      // Record for 1.2 seconds
      await new Promise((r) => setTimeout(r, 1200));

      const recordedMedia = await camera.stopRecording();

      return {
        kind: recordedMedia.kind,
        mimeType: recordedMedia.mimeType,
        duration: recordedMedia.duration,
        size: recordedMedia.size,
      };
    });

    expect(videoInfo.kind).toBe("video");
    expect(videoInfo.mimeType).toContain("video/");
    expect(videoInfo.duration).toBeGreaterThanOrEqual(1.0);
    expect(videoInfo.size).toBeGreaterThan(500);
  });

  test("closes camera and verifies media tracks are stopped", async ({ page }) => {
    const trackStatus = await page.evaluate(async () => {
      const videoEl = document.getElementById("preview-video");
      const camera = window.sdk.createCamera();
      camera.attachPreview(videoEl);
      const stream = await camera.open();
      const track = stream.getVideoTracks()[0];

      const readyStateBefore = track.readyState;
      camera.close();
      const readyStateAfter = track.readyState;

      return {
        readyStateBefore,
        readyStateAfter,
        state: camera.state,
      };
    });

    expect(trackStatus.readyStateBefore).toBe("live");
    expect(trackStatus.readyStateAfter).toBe("ended");
    expect(trackStatus.state).toBe("closed");
  });

  test("mounts ready-to-use CameraUI widget, switches mode, and unmounts cleanly", async ({ page }) => {
    const uiResult = await page.evaluate(async () => {
      const container = document.getElementById("ui-container");
      let capturedMedia = null;

      const widget = window.sdk.createCameraUI(container, {
        mode: "both",
        onCapture: (media) => {
          capturedMedia = {
            kind: media.kind,
            mimeType: media.mimeType,
            width: media.width,
            height: media.height,
          };
        },
      });

      // Wait a moment for mount
      await new Promise((r) => setTimeout(r, 400));

      // Trigger photo capture via widget
      await widget._takePhoto();

      // Unmount widget
      widget.unmount();

      return {
        capturedMedia,
        containerChildCount: container.children.length,
      };
    });

    expect(uiResult.capturedMedia).not.toBeNull();
    expect(uiResult.capturedMedia.kind).toBe("photo");
    expect(uiResult.containerChildCount).toBe(0);
  });
});
