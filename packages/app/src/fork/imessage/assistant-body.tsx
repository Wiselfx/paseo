/**
 * Fork (imessage): the assistant turn as a run of arriving bubbles.
 *
 * Upstream paints one growing message. Here the message is split into completed
 * blocks, each block arrives as its own bubble, and a typing bubble sits after
 * the last one while the model is still working. Nothing shows a half-written
 * paragraph — that is the entire point of the fork.
 *
 * Each block is its own memoised component keyed by position, so a token arriving
 * at the end of a long answer re-renders *one* bubble instead of re-parsing the
 * whole markdown tree. That was the constant flashing: every pop re-rendered every
 * earlier bubble, and each one re-ran its parser.
 */
import { memo, useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  MarkdownRenderer,
  type MarkdownRendererProps,
} from "@/components/markdown/renderer";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

import { ChatBubble } from "./bubble";
import { Popping, TypingBubble } from "./typing-bubble";
import { usePoppedBlocks } from "./use-popped-blocks";

/** Measured on iOS Messages: bubbles inside one run, and the gap to a new run. */
const GAP_IN_GROUP = 4.3333;
const GAP_BETWEEN_GROUPS = 10.2;

/** Everything the markdown engine needs, minus the text itself. */
type MarkdownContextProps = Omit<MarkdownRendererProps, "text" | "streaming" | "selectable">;

export interface ImessageAssistantBodyProps extends MarkdownContextProps {
  text: string;
  phase: "streaming" | "complete";
}

interface BlockBubbleProps extends MarkdownContextProps {
  text: string;
  /** Markdown as a plain string, for the copy action. */
  source: string;
  tail: boolean;
  selectable: boolean;
  onSelectRequest: () => void;
}

const BlockBubble = memo(function BlockBubble({
  text,
  source,
  tail,
  selectable,
  onSelectRequest,
  ...markdown
}: BlockBubbleProps) {
  const copy = useCallback(() => {
    void copyToClipboard(source);
  }, [source]);

  const menu = (
    <>
      <ContextMenuItem onSelect={copy}>Copy</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onSelectRequest} closeOnSelect>
        Select Text
      </ContextMenuItem>
    </>
  );

  return (
    <Popping origin="left">
      <ChatBubble side="agent" tail={tail} menu={menu}>
        <MarkdownRenderer {...markdown} text={text} streaming={false} selectable={selectable} />
      </ChatBubble>
    </Popping>
  );
});

/**
 * A key per bubble that survives every re-render of the turn.
 *
 * Position would be enough — the list only appends — but a repeated paragraph
 * would collide, so duplicates are numbered in document order instead.
 */
function useBlockKeys(blocks: readonly string[], generation: number): string[] {
  return useMemo(() => {
    const seen = new Map<string, number>();
    return blocks.map((block) => {
      const occurrence = (seen.get(block) ?? 0) + 1;
      seen.set(block, occurrence);
      return `${generation}:${block}:${occurrence}`;
    });
  }, [blocks, generation]);
}

export function ImessageAssistantBody({ text, phase, ...markdown }: ImessageAssistantBodyProps) {
  const { blocks, generation, typing } = usePoppedBlocks(text, phase);
  const keys = useBlockKeys(blocks, generation);
  // Long-press owns the menu, so selection has to be asked for explicitly. Once
  // asked, it stays on for the turn: the reader is clearly in text, not in bubbles.
  const [selectable, setSelectable] = useState(false);
  const requestSelect = useCallback(() => setSelectable(true), []);

  return (
    <View style={styles.stack}>
      {blocks.map((block, index) => (
        <BlockBubble
          key={keys[index]}
          text={block}
          source={block}
          tail={index === blocks.length - 1 && !typing}
          selectable={selectable}
          onSelectRequest={requestSelect}
          {...markdown}
        />
      ))}
      {typing ? (
        // Measured: the typing row sits at the *between groups* gap, not the in-group
        // one, so the bubble does not look like it continues the last message.
        <View style={blocks.length > 0 ? styles.typingAfterBlocks : null}>
          <TypingBubble />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  stack: {
    flexDirection: "column",
    // Measured iOS cluster gaps: 4.33 inside a group, 10.2 between groups.
    gap: GAP_IN_GROUP,
    width: "100%",
  },
  typingAfterBlocks: {
    marginTop: GAP_BETWEEN_GROUPS - GAP_IN_GROUP,
  },
}));
