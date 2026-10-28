import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "../../src/core/events.js";

describe("EventEmitter", () => {
  it("registers listeners and emits events", () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();

    const unsub = emitter.on("capture", fn);
    emitter.emit("capture", { id: 1 });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ id: 1 });

    unsub();
    emitter.emit("capture", { id: 2 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("handles once listeners", () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();

    emitter.once("statechange", fn);
    emitter.emit("statechange", "ready");
    emitter.emit("statechange", "closed");

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("ready");
  });

  it("handles multiple listeners and removeAllListeners", () => {
    const emitter = new EventEmitter();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    emitter.on("test", fn1);
    emitter.on("test", fn2);
    emitter.emit("test", "foo");

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);

    emitter.removeAllListeners("test");
    emitter.emit("test", "bar");

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it("throws TypeError if listener is not a function", () => {
    const emitter = new EventEmitter();
    expect(() => emitter.on("test", null)).toThrow(TypeError);
  });
});
