/**
 * Fork (imessage): sound samples are required as module ids, the same way
 * images are. Metro resolves `.wav` through the default asset extensions.
 */
declare module "*.wav" {
  const asset: number;
  export default asset;
}
