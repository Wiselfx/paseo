import { createAssistantMarkdownParser } from "@/utils/assistant-markdown-parser";
import type Token from "markdown-it/lib/token.mjs";

export interface InlineSpan {
  start: number;
  end: number;
  tokens: Token[];
}
export interface InlineTrace {
  spans: InlineSpan[];
  suffix: string;
  trim: number;
}
const TRACE = Symbol("prose source positions");

/** Observe the actual inline rules, including nested labels, without reprinting tokens. */
export function createSourceParser(streaming: boolean) {
  const parser = createAssistantMarkdownParser({ streaming });
  const traces = new WeakMap<Token, InlineTrace>();
  const inlineTraces = new WeakMap<Token[], InlineTrace>();
  const parseInline = parser.inline.parse.bind(parser.inline);
  parser.inline.parse = (source, md, env, output) => {
    const trace: InlineTrace = { spans: [], suffix: "", trim: 0 };
    parseInline(source, md, { ...env, [TRACE]: trace }, output);
    inlineTraces.set(output, trace);
  };
  const rules = parser.inline.ruler.getRules("");
  parser.inline.ruler.before("text", "prose_source_positions", (state, silent) => {
    if (silent) return false;
    for (const rule of rules) {
      const start = state.pos;
      const count = state.tokens.length;
      if (rule(state, false)) {
        const trace: InlineTrace = state.env[TRACE];
        trace.spans.push({ start, end: state.pos, tokens: state.tokens.slice(count) });
        return true;
      }
    }
    return false;
  });
  if (streaming) {
    const counts = new WeakMap<
      object,
      { count: number; last: Token | undefined; content: string }
    >();
    parser.inline.ruler2.before("streaming_emphasis", "prose_before_completion", (state) => {
      counts.set(state, {
        count: state.tokens.length,
        last: state.tokens.at(-1),
        content: state.tokens.at(-1)?.content ?? "",
      });
      return true;
    });
    parser.inline.ruler2.after("streaming_emphasis", "prose_after_completion", (state) => {
      const before = counts.get(state)!;
      const trace: InlineTrace = state.env[TRACE];
      trace.suffix = state.tokens
        .slice(before.count)
        .map((token) => token.content)
        .join("");
      trace.trim = before.content.length - (before.last?.content.length ?? 0);
      return true;
    });
  }
  parser.core.ruler.after("inline", "prose_inline_traces", (state) => {
    for (const token of state.tokens) {
      if (token.type === "inline" && token.children)
        traces.set(token, inlineTraces.get(token.children)!);
    }
  });
  return { parser, traces };
}
