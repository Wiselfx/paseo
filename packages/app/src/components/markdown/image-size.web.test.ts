import { afterEach, describe, expect, it, vi } from "vitest";
import { getImageSize } from "./image-size.web";

class FakeImage {
  referrerPolicy = "";
  naturalWidth = 40;
  naturalHeight = 20;
  uri = "";
  fail = false;
  private readonly listeners = new Map<string, () => void>();
  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, listener);
  }
  set src(value: string) {
    this.uri = value;
    queueMicrotask(() => this.listeners.get(this.fail ? "error" : "load")?.());
  }
}

function stubWindow(image: FakeImage): void {
  vi.stubGlobal("window", {
    Image: function Image() {
      return image;
    },
  });
}

describe("web image size probe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the image without a referrer and reports its natural size", async () => {
    const image = new FakeImage();
    stubWindow(image);
    const size = await new Promise<[number, number]>((resolve, reject) => {
      getImageSize("https://x/a.png", (width, height) => resolve([width, height]), reject);
    });
    expect(image.referrerPolicy).toBe("no-referrer");
    expect(image.uri).toBe("https://x/a.png");
    expect(size).toEqual([40, 20]);
  });

  it("rejects when the image does not load", async () => {
    const image = new FakeImage();
    image.fail = true;
    stubWindow(image);
    await expect(
      new Promise<unknown>((_resolve, reject) => {
        getImageSize("https://x/a.png", () => undefined, reject);
      }),
    ).rejects.toBeInstanceOf(Error);
  });
});
