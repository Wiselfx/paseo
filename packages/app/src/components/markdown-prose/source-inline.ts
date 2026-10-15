import { createAssistantMarkdownParser } from "@/utils/assistant-markdown-parser";
import type Token from "markdown-it/lib/token.mjs";

export interface InlineSpan {
  start: number;
  end: number;
  tokens: Token[];
  insideLink: boolean;
}
export interface InlineTrace {
  spans: InlineSpan[];
  linkifyTexts: string[];
}
const TRACE = Symbol("prose source positions");

/** Observe the actual inline rules, including nested labels, without reprinting tokens. */
export function createSourceParser() {
  const parser = createAssistantMarkdownParser();
  const traces = new WeakMap<Token, InlineTrace>();
  const inlineTraces = new WeakMap<Token[], InlineTrace>();
  const parseInline = parser.inline.parse.bind(parser.inline);
  parser.inline.parse = (source, md, env, output) => {
    const trace: InlineTrace = { spans: [], linkifyTexts: [] };
    parseInline(source, md, { ...env, [TRACE]: trace }, output);
    inlineTraces.set(output, trace);
  };
  const rules = parser.inline.ruler.getRules("");
  parser.inline.ruler.before("text", "prose_source_positions", (state, silent) => {
    if (silent) return false;
    for (const rule of rules) {
      const start = state.pos;
      const count = state.tokens.length;
      const trace: InlineTrace = state.env[TRACE];
      const firstNested = trace.spans.length;
      if (rule(state, false)) {
        const tokens = state.tokens.slice(count);
        if (tokens.some((token) => token.type === "link_open")) {
          for (let i = firstNested; i < trace.spans.length; i++) trace.spans[i]!.insideLink = true;
        }
        trace.spans.push({ start, end: state.pos, tokens, insideLink: false });
        return true;
      }
    }
    return false;
  });
  parser.core.ruler.after("inline", "prose_inline_traces", (state) => {
    for (const token of state.tokens) {
      if (token.type !== "inline" || !token.children) continue;
      const trace = inlineTraces.get(token.children)!;
      let linkDepth = 0;
      for (const child of token.children) {
        if (child.type === "link_open") linkDepth++;
        if (child.type === "link_close") linkDepth--;
        if (child.type === "text" && linkDepth === 0) trace.linkifyTexts.push(child.content);
      }
      traces.set(token, trace);
    }
  });
  return { parser, traces };
}
