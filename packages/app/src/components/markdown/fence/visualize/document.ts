/**
 * Stage document builder. Agent fence content is embedded whole into a
 * sandboxed srcdoc/WebView document: theme vars + height reporter + strict
 * CSP come from us, everything visible comes from the fence. Offline v1:
 * no network inside the stage (no CDN); chart libs arrive as a pinned
 * allowlist later. Content can never break out: it is document body, never
 * parent markup (srcdoc attribute / WebView html source).
 */

export const VIZ_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none';";

export const VIZ_HEIGHT_MESSAGE = "viz:height";

export function buildVizDocument(code: string, colorScheme: "light" | "dark"): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${VIZ_CSP}"><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{color-scheme:${colorScheme};--viz-fg:${colorScheme === "dark" ? "#e6e6e6" : "#1a1a1a"};--viz-bg:transparent;--viz-accent:${colorScheme === "dark" ? "#7dd3fc" : "#0369a1"};}html,body{margin:0;padding:0;background:transparent;color:var(--viz-fg);font:14px/1.4 system-ui,sans-serif;}</style></head><body>${code}<script>(function(){function report(){var h=document.documentElement.scrollHeight;var msg={type:'${VIZ_HEIGHT_MESSAGE}',height:h};try{parent.postMessage(msg,'*');}catch(e){}try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(msg));}catch(e){}}new MutationObserver(report).observe(document.documentElement,{childList:true,subtree:true,attributes:true});window.addEventListener('load',report);report();})();</script></body></html>`;
}

export function isVizHeightMessage(data: unknown): data is { type: string; height: number } {
  if (typeof data !== "object" || data === null) return false;
  const type = Reflect.get(data, "type");
  const height = Reflect.get(data, "height");
  return type === VIZ_HEIGHT_MESSAGE && typeof height === "number" && height > 0;
}
