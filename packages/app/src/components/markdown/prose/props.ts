import type { ReactNode } from "react";
import type { AssistantFileLinkActions } from "@/assistant-file-links";

import type { MarkdownReferences } from "../parts";

export interface MarkdownProseProps {
  text: string;
  sourceBlocks: readonly string[];
  kind: "prose" | "quote" | "block";
  onLinkPress: (url: string) => boolean;
  children: ReactNode;
  references?: MarkdownReferences;
  compact?: boolean;
  blockSpacing?: number;
  fileLinks?: AssistantFileLinkActions;
  linkify?: boolean;
  allowFileLinks?: boolean;
}
