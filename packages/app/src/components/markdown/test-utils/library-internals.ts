/** Fork: the app's one seam into react-native-enriched-markdown private paths, so the
 * engine fork (getpaseo/paseo#7240) renames this module and nothing else. */
export { toNativeLinkRecognition } from "react-native-enriched-markdown/src/utils/regexParser";
export { parseMarkdown } from "react-native-enriched-markdown/src/web/parseMarkdown";
export { recognizeTextLinks } from "react-native-enriched-markdown/src/web/recognizeTextLinks";
export { markInlineImages } from "react-native-enriched-markdown/src/web/utils";
export type { ASTNode } from "react-native-enriched-markdown/src/web/types";
