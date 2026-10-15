# Native text selection

Assistant prose uses `react-native-enriched-markdown` 1.1.1 on iOS and Android. Native selection belongs to one text view. Putting paragraphs in separate FlatList rows prevents dragging a selection between them.

Presentation groups adjacent paragraphs, headings, lists and horizontal rules into prose runs. Start another run before adding a block would exceed the existing 32,000-character render cap. A single oversized block retains its existing cap. Code, tables, images and HTML-like content keep Paseo's existing renderers. Blockquotes are separate rows rendered by the prose module. Selection stops at these boundaries; consecutive paragraphs inside a quote share its text segment. Nested quotes and embedded block content introduce further library segments.

Keep this boundary in `agent-stream/presentation.ts` and `components/markdown-prose/`. The source message stays whole for plugins, copying a turn and persistence. Web keeps its existing block rows and renderer. The platform-specific `markdown-text` components remain in use by the preserved blocks and other Markdown surfaces.

## Flavor

Use `github`. It retains strikethrough but renders blockquotes in separate native views. `commonmark` keeps a single text view across quotes but disables strikethrough and task-list parsing. A compiled parser check against the published 1.1.1 package produced:

```text
commonmark: strike=0 tasks=0 quotes=1 spoilers=1
github: strike=1 tasks=1 quotes=1 spoilers=1
```

GitHub flavor renders `[ ]` and `[x]` list items as checkboxes. Toggling is disabled because changes would not persist. Preserve task markers in both streaming and settled replies.

## Compatibility constraints

- Disable `latexMath`. Dollar-delimited text must stay literal. Enable admonitions for `[!NOTE]`-style quotes; they add formatting without hiding the quote content. Ordinary quotes keep the existing blockquote style mapping.
- Spoilers have no public parser switch in 1.1.1. Prepare inline text with escaped pipes so `||text||` stays visible. Preserve pipes inside code and link destinations.
- `lineHeight` is a minimum. Use the Markdown theme's line height; font metrics can still increase it.
- Strikethrough color is iOS-only. Android uses the surrounding text color.
- Native h1/h2 lose their 1px bottom borders: the library has no heading-border style API. H6 plain text is uppercased before rendering; inline code and link destinations keep their source casing. H6 loses its 0.5 letter spacing. Size, weight, color, margins and line height keep the existing heading tokens. On Android, the library applies its heading span after the inline-code span: code inside headings takes the heading font, size and color despite the public code-style mapping. iOS applies the code style after the heading style. Web headings are unchanged.
- Published 1.1.1 has no `linkRecognition` or `linkPillContent` API. Explicit links use Paseo's link handler. Inline-code file candidates become ordinary links carrying their original resolver input. Native hover tooltips and custom React link pills are not available inside the text view.
- Reuse Paseo's provisional inline parser for the streaming tail so unfinished emphasis, code and links retain their existing display. Streaming updates replace the attributed text. Selection made while the selected run is still changing is not retained by the library. Keep the existing paced reveal and leave the library's additional streaming animation disabled.

The app's `enriched-markdown` package configuration disables the math engine, code highlighting, all tree-sitter grammars and video support. Paseo owns those block renderers; shipping their duplicate native engines adds binary size without serving this surface. Rebuild the dev client after changing this configuration.

Android inverted timelines retain their scroll protection in `modules/paseo-scroll`. Test selection-handle dragging against the compiled client: a JavaScript-only test cannot prove that Android's child-reveal request leaves the scroll offset unchanged.

## Follow-ups

Contribute a fix for Android heading-span precedence so inline code retains its own font, size and color.

Contribute heading `borderBottomWidth` and `borderBottomColor` style props upstream so native h1/h2 can restore their existing underline without breaking selection across headings.
