# Native text selection

The shared `components/markdown/renderer.tsx` renders native prose with `react-native-enriched-markdown` 1.1.1 on iOS and Android. Native selection belongs to one text view, so separate paragraph rows prevent dragging a selection between them.

Every `MarkdownRenderer` consumer gets prose runs without surface-specific wiring: chat, Markdown file previews, plan cards, pull request activity and changelogs. The renderer owns classification, native preparation and the platform component under `components/markdown/`. Its pure `parts` boundary groups adjacent paragraphs, headings, lists and horizontal rules; code, tables, images and HTML-like content retain Paseo's block renderers. Keep whole containers when splitting around an image would lose formatting or list context.

Chat uses the same grouper to create virtualized display rows. Presentation owns message-to-row ids, promoted/history identity and the growing last source block. It passes an already grouped part to `MarkdownRenderer`; the growing block uses the existing streaming parser and joins the preceding run when another block starts or the turn ends. Selection across that paragraph becomes available at completion. Chat supplies its file-link actions; native prose does not require a chat provider. Other surfaces keep their parser's link policy and compact typography.

Reference definitions retain their source scope; grouping text for selection must not change which references resolve. Runs are capped at `ASSISTANT_MESSAGE_RENDER_CHARACTER_LIMIT`. Oversized source blocks bypass prose classification and remain on the block renderer.

Selection stops at preserved blocks, blockquotes and run boundaries required by the 32,000-character render cap. Consecutive paragraphs inside a quote share its text segment; nested quotes and embedded blocks introduce further library segments. Web keeps its existing renderer and selection behavior.

## Flavor

Use `github` to retain strikethrough and gain task checkboxes. `commonmark` allows selection across quotes but loses strikethrough and task-list parsing. GitHub quotes require separate native views, so blockquotes are run boundaries.

Checkbox toggling is disabled because changes would not persist. Admonitions add styling to `[!NOTE]`-style quotes without hiding their content. Ordinary quotes retain the existing blockquote styling.

## Compatibility constraints

- The 1.1.1 native parser drops entity nodes. Decode text and destination entities before rendering, retaining literal entities inside code. Whitespace entities must remain text instead of creating new Markdown blocks. Its autolinks also disagree with Paseo about bare domains and trailing punctuation, so preserve Paseo’s recognized destinations as explicit links.
- Keep dollar-delimited text literal with `latexMath: false`; dollar amounts must not become math.
- Spoilers have no public parser switch in 1.1.1. Escape prose pipes so `||text||` stays visible; code and link destinations retain their pipes.
- `lineHeight` is a minimum, so font metrics can increase it. Compare spacing on devices.
- Strikethrough color is iOS-only. Android uses the surrounding text color.
- Strong text uses bold instead of the theme's weight 500. The public API accepts only bold or normal, and the app has no bundled medium-weight font family to substitute.
- Native h1/h2 lose their 1px bottom borders because the library has no heading-border API. H6 keeps uppercase plain text but loses its 0.5 letter spacing; code and link destinations keep their source casing.
- Android heading spans override inline code's font, size and color. iOS retains the code style; its system-monospace alias needs mapping at the library boundary. Web headings are unchanged.
- Published 1.1.1 cannot embed Paseo's custom React link pills or hover tooltips in its text view. Links retain Paseo's press handling.
- Adding a completed block replaces the run’s attributed text. The library does not retain selections made while that run changes. The growing block never goes through native prose preparation.

Keep the package's math, highlighting, tree-sitter and video engines disabled. Paseo owns those renderers; duplicate native engines add binary size without serving this surface. Rebuild the dev client after changing engine configuration.

Test Android selection-handle dragging against the compiled client. A JavaScript test cannot prove that the inverted timeline's scroll protection prevents movement during selection.

## Follow-ups

Contribute Android heading-span precedence fixes and heading border style props upstream so inline code and h1/h2 borders retain their previous appearance without breaking selection across headings.
