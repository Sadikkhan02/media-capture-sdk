import { describe, it, expect } from "vitest";
import {
  MediaCaptureError,
  PermissionDeniedError,
  DeviceNotFoundError,
  DeviceNotReadableError,
  NotSupportedError,
  UserCancelledError,
  RecordingError,
  InvalidStateError,
  ConfigurationError,
  parseMediaError,
} from "../../src/core/errors.js";

describe("Error Hierarchy and Parser", () => {
  it("creates base MediaCaptureError with code and original error", () => {
    const orig = new Error("inner");
    const err = new MediaCaptureError("Failed capture", "TEST_CODE", orig, { foo: "bar" });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(MediaCaptureError);
    expect(err.name).toBe("MediaCaptureError");
    expect(err.message).toBe("Failed capture");
    expect(err.code).toBe("TEST_CODE");
    expect(err.originalError).toBe(orig);
    expect(err.details).toEqual({ foo: "bar" });
  });

  it("creates specialized error subclasses correctly", () => {
    expect(new PermissionDeniedError()).toBeInstanceOf(MediaCaptureError);
    expect(new PermissionDeniedError().code).toBe("PERMISSION_DENIED");

    expect(new DeviceNotFoundError()).toBeInstanceOf(MediaCaptureError);
    expect(new DeviceNotFoundError().code).toBe("DEVICE_NOT_FOUND");

    expect(new DeviceNotReadableError()).toBeInstanceOf(MediaCaptureError);
    expect(new DeviceNotReadableError().code).toBe("DEVICE_NOT_READABLE");

    expect(new NotSupportedError()).toBeInstanceOf(MediaCaptureError);
    expect(new NotSupportedError().code).toBe("NOT_SUPPORTED");

    expect(new UserCancelledError()).toBeInstanceOf(MediaCaptureError);
    expect(new UserCancelledError().code).toBe("USER_CANCELLED");

    expect(new RecordingError()).toBeInstanceOf(MediaCaptureError);
    expect(new RecordingError().code).toBe("RECORDING_ERROR");

    expect(new InvalidStateError()).toBeInstanceOf(MediaCaptureError);
    expect(new InvalidStateError().code).toBe("INVALID_STATE");

    expect(new ConfigurationError()).toBeInstanceOf(MediaCaptureError);
    expect(new ConfigurationError().code).toBe("CONFIGURATION_ERROR");
  });

  it("parseMediaError maps NotAllowedError to PermissionDeniedError", () => {
    const domErr = { name: "NotAllowedError", message: "User denied permission" };
    const parsed = parseMediaError(domErr, "Camera access");
    expect(parsed).toBeInstanceOf(PermissionDeniedError);
    expect(parsed.code).toBe("PERMISSION_DENIED");
    expect(parsed.message).toContain("Camera access");
    expect(parsed.message).toContain("User denied permission");
  });

  it("parseMediaError maps NotFoundError to DeviceNotFoundError", () => {
    const domErr = { name: "NotFoundError", message: "No webcam" };
    const parsed = parseMediaError(domErr);
    expect(parsed).toBeInstanceOf(DeviceNotFoundError);
  });

  it("parseMediaError maps NotReadableError to DeviceNotReadableError", () => {
    const domErr = { name: "NotReadableError", message: "Device in use" };
    const parsed = parseMediaError(domErr);
    expect(parsed).toBeInstanceOf(DeviceNotReadableError);
  });

  it("parseMediaError maps OverconstrainedError to ConfigurationError", () => {
    const domErr = { name: "OverconstrainedError", message: "Constraint not met", constraint: "width" };
    const parsed = parseMediaError(domErr);
    expect(parsed).toBeInstanceOf(ConfigurationError);
    expect(parsed.details.constraint).toBe("width");
  });

  it("parseMediaError maps AbortError to UserCancelledError", () => {
    const domErr = { name: "AbortError", message: "Screen share dismissed" };
    const parsed = parseMediaError(domErr);
    expect(parsed).toBeInstanceOf(UserCancelledError);
  });

  it("returns MediaCaptureError untouched if already parsed", () => {
    const err = new PermissionDeniedError("Denied");
    expect(parseMediaError(err)).toBe(err);
  });
});
