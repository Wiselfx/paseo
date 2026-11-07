/**
 * Claude-style per-character fade for streaming text, reimplemented from
 * `dsh-claude-style`.
 *
 * Source: `packages/client/src/features/chat-reveal/` — `reveal-engine.ts`
 * (240 lines), `reveal-diff.ts` (392), `reveal-paint.ts` (202),
 * `reveal-params.ts` (110) — plus `constants.ts` (`CHAT_REVEAL_STEPS = 24`,
 * `CHAT_REVEAL_MIN_OPACITY = 0.2`) and `scripts/feature-sheets.mjs`
 * (`revealSteps`).
 *
 * This hook is the RN answer to the engine: it keeps the previous text,
 * diffs it against the next, and paints the *new* characters at the
 * faintest step the same frame — the engine paints synchronously after the
 * scan, because a scheduled frame would leave one frame of full-strength
 * text the eye reads as a flash. Each character then walks from 0.2 opacity
 * to fully opaque over 120ms, stepping linearly so the colour settles at a
 * constant rate. Older characters are left at rest; only the arriving batch
 * is re-painted.
 *
 * The deferring design it replaces (`agent-stream/text-reveal.ts`) slices
 * the rendered prefix by backlog so lumps don’t read as jumps. The dsh
 * engine is the opposite answer: never defer, fade in place.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";
import {
  REVEAL_FOLD_QUIET_MS,
  REVEAL_MS,
  REVEAL_STEPS,
  REVEAL_MIN_OPACITY,
  scanRevealBatch,
  type RevealSegment,
} from "@/agent-stream/chat-reveal";

export interface RevealedGlyph {
  char: string;
  /** Opacity 0.2 → 1.0, linear in age. */
  opacity: number;
}

export interface DshRevealResult {
  /** The text split into graphemes, each with its current opacity. */
  glyphs: RevealedGlyph[];
  /** The full text rebased on the same alpha (for non-RN callers). */
  text: string;
}

/**
 * Fades arriving characters in place. Returns each grapheme with its
 * opacity; settled characters are 1.0 and cost nothing past one pass.
 */
export function useDshReveal(text: string, phase: "streaming" | "complete"): DshRevealResult {
  const reducedMotion = useReducedMotion();
  const previousRef = useRef(text);
  const [segments, setSegments] = useState<RevealSegment[]>([]);
  const [, forceRender] = useState(0);
  const foldQuietUntilRef = useRef(0);

  useEffect(() => {
    if (phase !== "streaming") {
      setSegments([]);
      previousRef.current = text;
      return undefined;
    }
    if (reducedMotion) {
      setSegments([]);
      previousRef.current = text;
      return undefined;
    }
    const previous = previousRef.current;
    if (previous === text) return undefined;
    const now = performance.now();
    if (now <= foldQuietUntilRef.current) {
      previousRef.current = text;
      return undefined;
    }
    previousRef.current = text;
    const batch = scanRevealBatch(previous, text, now);
    if (batch.length === 0) return undefined;
    setSegments((current) => {
      const kept = current.filter((segment) => now - segment.bornAt < REVEAL_MS);
      return [...kept, ...batch];
    });
    return undefined;
  }, [text, phase, reducedMotion]);

  useEffect(() => {
    if (segments.length === 0) return undefined;
    const handle: ReturnType<typeof setTimeout> = setTimeout(() => forceRender((tick) => tick + 1), 1000 / 60);
    return () => clearTimeout(handle);
  }, [segments]);

  const glyphs = useMemo<RevealedGlyph[]>(() => {
    if (segments.length === 0) {
      return [{ char: text, opacity: 1 }];
    }
    const now = performance.now();
    const byIndex = new Map<number, number>();
    for (const segment of segments) {
      const age = now - segment.bornAt - segment.delay;
      if (age >= REVEAL_MS) continue;
      const step = age <= 0 ? 0 : Math.floor((age / REVEAL_MS) * REVEAL_STEPS);
      const opacity = REVEAL_MIN_OPACITY + ((1 - REVEAL_MIN_OPACITY) * step) / (REVEAL_STEPS - 1);
      for (let offset = 0; offset < segment.length; offset += 1) {
        byIndex.set(segment.start + offset, opacity);
      }
    }
    if (byIndex.size === 0) return [{ char: text, opacity: 1 }];
    const graphemes: RevealedGlyph[] = [];
    let index = 0;
    for (const char of text) {
      graphemes.push({ char, opacity: byIndex.get(index) ?? 1 });
      index += char.length;
    }
    return graphemes;
  }, [text, segments]);

  return { glyphs, text };
}
