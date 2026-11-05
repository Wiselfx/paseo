/**
 * Fork (imessage): the assistant turn as a run of arriving bubbles.
 *
 * Upstream paints one growing message. Here the message is split into completed
 * blocks, each block arrives as its own bubble, and a typing bubble sits after
 * the last one while the model is still working. Nothing shows a half-written
 * paragraph — that is the entire point of the fork.
 */
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import {
  MarkdownRenderer,
  type MarkdownRendererProps,
} from "@/components/markdown/renderer";

import { Bubble } from "./bubble";
import { Popping, TypingBubble } from "./typing-bubble";
import { usePoppedBlocks } from "./use-popped-blocks";

export interface ImessageAssistantBodyProps extends Omit<MarkdownRendererProps, "text" | "streaming"> {
  text: string;
  phase: "streaming" | "complete";
}

export function ImessageAssistantBody({
  text,
  phase,
  ...markdownProps
}: ImessageAssistantBodyProps) {
  const { blocks, typing } = usePoppedBlocks(text, phase);

  return (
    <View style={styles.stack}>
      {blocks.map((block, index) => {
        const isLast = index === blocks.length - 1;
        return (
          <Popping key={`${index}:${block.length}`}>
            <Bubble side="agent" tail={isLast && !typing}>
              <MarkdownRenderer {...markdownProps} text={block} streaming={false} />            </Bubble>
          </Popping>
        );
      })}
      {typing ? <TypingBubble /> : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  stack: {
    flexDirection: "column",
    gap: theme.spacing[1],
    width: "100%",
  },
}));
