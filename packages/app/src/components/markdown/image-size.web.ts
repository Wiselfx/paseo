export type GetImageSize = (
  uri: string,
  success: (width: number, height: number) => void,
  failure: (error: unknown) => void,
) => void;

/**
 * Fork: web counterpart of `Image.getSize` that sends no referrer. Hotlink-gated
 * hosts answer a browser's Referer with a 307 to an HTML page, so the probe would
 * otherwise report the image undecodable. The document keeps the browser default
 * policy so YouTube embeds get a referrer (error 153).
 */
export const getImageSize: GetImageSize = (uri, success, failure) => {
  const image = new window.Image();
  image.referrerPolicy = "no-referrer";
  image.addEventListener("load", () => success(image.naturalWidth, image.naturalHeight), {
    once: true,
  });
  image.addEventListener("error", () => failure(new Error("Image failed to load")), { once: true });
  image.src = uri;
};
