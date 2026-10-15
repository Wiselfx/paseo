import type { ReactNode } from "react";

export interface MarkdownProseProps {
  text: string;
  sourceBlocks: readonly string[];
  streaming: boolean;
  kind: "prose" | "quote" | "block";
  onLinkPress: (url: string) => boolean;
  children: ReactNode;
}
