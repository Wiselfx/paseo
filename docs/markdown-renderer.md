# Markdown rendering

Use `MarkdownRenderer` for chat replies, file previews, plans, pull requests and changelog content. It uses `react-native-enriched-markdown` on iOS, Android and web. Keep source adaptation and renderer configuration in `components/markdown`; consumers supply Markdown and, when needed, its file location.

Native selection belongs to the library's text view. Keep an assistant message in one row so selection can cross paragraphs, headings and lists. Code blocks and tables use the library's native views and their selection behavior. Web uses browser selection over semantic HTML. Chat still owns paced reveal, its render cap, message identity and list measurement; it does not choose a Markdown engine or classify prose.

## Links and images

Workspace file links use the shared file-link resolver. The workspace supplies its client, root and open-file action once; chat can supply the agent's more specific context. URLs use the same link press path. Recognized inline-code paths stay tappable.

Resolve workspace image paths over the existing session RPC, then give the library a cached native file URL or web blob URL. HTTP(S) images pass through unchanged. This preserves relay, SSH and local socket connections, which do not expose a daemon HTTP endpoint. Image taps open the attachment lightbox. File previews resolve relative images against the Markdown file's directory.

## Engine constraints

The pinned nightly has the same React Native package and core source trees as upstream commit `73ac5085eb1fdc743973b3473d4dba65abad5261`. Compatibility was checked with React Native 0.81.5. Native dependencies must be rebuilt when changing the highlighting configuration; JavaScript refresh cannot enable compiled grammars.

Math and video are disabled. Task lists and admonitions are enabled; task checkboxes are read-only. Source adaptation escapes spoiler delimiters and decodes entity text before the engine can discard it. Code spans and fences keep their literal source. Mermaid renders as a code block. HTML and details collapsibles have no custom renderer.

Native code blocks use the library's copy control and compiled grammars. Web code blocks use `HighlightedCodeBlock` through the library's `renderers.codeBlock` override. The patch also preserves web list numbering and link titles, and marks pending parses with `aria-busy` so Find waits for rendered text. The package patch is tracked by [upstream PR #997](https://github.com/software-mansion/enriched-markdown/pull/997); remove the patch when the pinned release includes it.

The library determines how incomplete Markdown appears during streaming. Completed text uses the same component and engine as history. Find and scroll-to-message address source message ids; selection-copy understands semantic HTML and the web code component's copy metadata.

## Verification

Follow [QA](qa.md) and [mobile testing](mobile-testing.md). Exercise chat, file preview, plan and PR content on all three platforms. Include cross-paragraph selection, progressive streaming, a file-link tap, code copy/highlighting, a table and a workspace image. On iPad, repeat preview selection after opening and closing Explorer and after rotation. Check web find, selection-copy and source-message navigation after DOM changes.
