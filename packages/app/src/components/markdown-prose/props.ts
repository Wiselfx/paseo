import type { ReactNode } from "react";

export interface MarkdownProseProps {
  text: string;
  streaming: boolean;
  kind: "prose" | "quote" | "block";
  onLinkPress: (url: string) => boolean;
  children: ReactNode;
}
