import { describe, expect, it } from "vitest";

import { decodeMarkdownImage, getMarkdownImageStatus } from "./image-decoding";

const REMOTE = "https://files.example.org/hosted/photo.png";

describe("getMarkdownImageStatus", () => {
  it("marks a decoded image ready", () => {
    expect(
      getMarkdownImageStatus({
        canAcquire: false,
        url: REMOTE,
        acquisitionFailed: false,
        decodeFailed: false,
        decoded: true,
      }),
    ).toBe("ready");
  });

  it("keeps a remote image ready when only the measurement probe failed", () => {
    // Image.getSize fetches the bytes, so it rejects on hosts without
    // Access-Control-Allow-Origin. The renderer emits a plain <img src>, which
    // still loads, so a probe failure must not hide the image.
    expect(
      getMarkdownImageStatus({
        canAcquire: false,
        url: REMOTE,
        acquisitionFailed: false,
        decodeFailed: true,
        decoded: false,
      }),
    ).toBe("ready");
  });

  it("keeps a data: image ready when the probe failed", () => {
    expect(
      getMarkdownImageStatus({
        canAcquire: false,
        url: "data:image/png;base64,iVBORw0KGgo=",
        acquisitionFailed: false,
        decodeFailed: true,
        decoded: false,
      }),
    ).toBe("ready");
  });

  it("reports pending while a probe that has not failed yet is still in flight", () => {
    expect(
      getMarkdownImageStatus({
        canAcquire: false,
        url: REMOTE,
        acquisitionFailed: false,
        decodeFailed: false,
        decoded: false,
      }),
    ).toBe("pending");
  });

  it("still reports unavailable when the probe failed and there is no URL", () => {
    expect(
      getMarkdownImageStatus({
        canAcquire: false,
        url: undefined,
        acquisitionFailed: false,
        decodeFailed: true,
        decoded: false,
      }),
    ).toBe("unavailable");
  });

  it("still reports unavailable when the image could not be acquired", () => {
    expect(
      getMarkdownImageStatus({
        canAcquire: true,
        url: undefined,
        acquisitionFailed: true,
        decodeFailed: false,
        decoded: false,
      }),
    ).toBe("unavailable");
  });

  it("still reports unavailable when acquisition failed even with a URL", () => {
    expect(
      getMarkdownImageStatus({
        canAcquire: true,
        url: REMOTE,
        acquisitionFailed: true,
        decodeFailed: false,
        decoded: false,
      }),
    ).toBe("unavailable");
  });
});

describe("decodeMarkdownImage", () => {
  it("resolves for a decoder reporting positive dimensions", async () => {
    await expect(
      decodeMarkdownImage(REMOTE, (_uri, success) => success(3840, 2160)),
    ).resolves.toBe(true);
  });

  it("rejects when the decoder reports an error", async () => {
    await expect(
      decodeMarkdownImage(REMOTE, (_uri, _success, failure) => failure(new Error("CORS"))),
    ).rejects.toThrow("CORS");
  });

  it("rejects when the decoder reports zero dimensions", async () => {
    await expect(
      decodeMarkdownImage(REMOTE, (_uri, success) => success(0, 0)),
    ).rejects.toThrow(/decodable dimensions/);
  });
});