/**
 * Fork (imessage): split an assistant message into the blocks a chat bubble can
 * commit to.
 *
 * The daemon streams deltas, so the client always holds a partial message. The
 * iMessage fork never shows that partial text: a bubble only appears once the
 * block it carries is finished. This module is the boundary — everything before
 * `tail` is safe to pop, `tail` is still arriving.
 *
 * Boundaries are deliberately coarse: a blank line ends a block, and a fenced
 * code block ends at its closing fence. Headings, lists and tables stay attached
 * to the block they start in, which keeps a list from popping in one bullet at a
 * time.
 */

export interface MessageBlocks {
  /** Blocks that can be committed now, in document order. */
  completed: string[];
  /** Text still arriving, or a fenced block whose closing fence has not arrived. */
  tail: string;
}

interface Fence {
  marker: string;
  length: number;
}

function fenceFor(line: string): Fence | null {
  const trimmed = line.trimStart();
  const match = /^(`{3,}|~{3,})/.exec(trimmed);
  if (!match) return null;
  const marker = match[1] ?? "";
  return { marker: marker[0] ?? "`", length: marker.length };
}

/** A closing fence uses the same character, at least as long as the opener. */
function closesFence(line: string, fence: Fence): boolean {
  const trimmed = line.trim();
  if (trimmed.length < fence.length) return false;
  for (const char of trimmed) {
    if (char !== fence.marker) return false;
  }
  return true;
}

export function splitMessageBlocks(text: string): MessageBlocks {
  const normalized = text.replace(/\r\n/g, "\n");
  if (normalized.trim().length === 0) return { completed: [], tail: "" };

  const lines = normalized.split("\n");
  const completed: string[] = [];
  let current: string[] = [];
  let fence: Fence | null = null;

  const flush = () => {
    if (current.length === 0) return;
    const block = current.join("\n");
    current = [];
    if (block.trim().length === 0) return;
    completed.push(block);
  };

  for (const line of lines) {
    if (fence) {
      current.push(line);
      if (closesFence(line, fence)) {
        fence = null;
        flush();
      }
      continue;
    }

    const opening = fenceFor(line);
    if (opening) {
      // A fence starts its own block, so prose above it commits first.
      flush();
      current.push(line);
      fence = opening;
      continue;
    }

    if (line.trim().length === 0) {
      flush();
      continue;
    }

    current.push(line);
  }

  // An unterminated fence swallows the rest: it must not pop half-closed.
  const tail = current.join("\n");
  return { completed, tail };
}

/**
 * Blocks to commit once the turn completes: everything still held, including a
 * fenced block that never closed and therefore read as text above.
 */
export function completeBlocks(blocks: MessageBlocks): string[] {
  const tail = blocks.tail.trim();
  return tail.length === 0 ? blocks.completed : [...blocks.completed, blocks.tail];
}
