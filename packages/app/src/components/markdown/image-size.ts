import { Image } from "react-native";

/**
 * Fork: a chat image from a hotlink-gated host needs `no-referrer`, but the
 * document keeps the browser default so a YouTube embed still gets one (error
 * 153). The probe and the renderer each opt out on their own request.
 */
export const getImageSize = Image.getSize;
