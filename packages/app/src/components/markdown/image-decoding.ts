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
