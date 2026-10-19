type ImageDecoder = (
  uri: string,
  success: (width: number, height: number) => void,
  failure: (error: unknown) => void,
) => void;

export function decodeMarkdownImage(uri: string, decode: ImageDecoder): Promise<true> {
  return new Promise((resolve, reject) => {
    decode(
      uri,
      (width, height) => {
        if (width > 0 && height > 0) resolve(true);
        else reject(new Error("Image has no decodable dimensions"));
      },
      reject,
    );
  });
}

interface MarkdownImageLoadState {
  canAcquire: boolean;
  url: string | undefined;
  acquisitionFailed: boolean;
  decodeFailed: boolean;
  decoded: boolean;
}

/**
 * Status for one markdown image.
 *
 * `decodeFailed` is deliberately *not* fatal on its own. Decoding is a
 * measurement probe (`Image.getSize`), not the load itself: it fetches the
 * bytes, so it rejects for any cross-origin image whose host omits
 * `Access-Control-Allow-Origin` (most static image CDNs). Rendering uses a
 * plain `<img src>` (react-native-enriched-markdown `ImageRenderer`), which
 * needs no CORS, so a probe failure says nothing about whether the image will
 * display.
 *
 * Failing those images as `unavailable` swapped them for escaped alt text, and
 * failing them as `pending` parked them on the placeholder forever, since the
 * query never re-runs. Either way a perfectly loadable remote image vanished.
 */
export function getMarkdownImageStatus(
  state: MarkdownImageLoadState,
): "pending" | "ready" | "unavailable" {
  const cannotResolve = !state.canAcquire && state.url === undefined;
  if (cannotResolve || state.acquisitionFailed) return "unavailable";
  if (state.decoded) return "ready";
  // Keep the URL: the renderer emits <img src> directly and the browser loads
  // it cross-origin without needing CORS.
  if (state.decodeFailed) return state.url === undefined ? "unavailable" : "ready";
  return "pending";
}
