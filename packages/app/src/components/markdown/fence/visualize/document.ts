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
export const VIZ_PROMPT_MESSAGE = "viz:prompt";
export const VIZ_SAVE_MESSAGE = "viz:save";
export const VIZ_LOAD_MESSAGE = "viz:load";
export const VIZ_STATE_MESSAGE = "viz:state";

export interface VizPromptData {
  type: string;
  text: string;
}

export interface VizSaveData {
  type: string;
  key: string;
  value: string;
}

export interface VizLoadData {
  type: string;
  key: string;
  nonce: number;
}

export function isVizPromptMessage(data: unknown): data is VizPromptData {
  if (typeof data !== "object" || data === null) return false;
  return (
    Reflect.get(data, "type") === VIZ_PROMPT_MESSAGE &&
    typeof Reflect.get(data, "text") === "string"
  );
}

export function isVizSaveMessage(data: unknown): data is VizSaveData {
  if (typeof data !== "object" || data === null) return false;
  return (
    Reflect.get(data, "type") === VIZ_SAVE_MESSAGE &&
    typeof Reflect.get(data, "key") === "string" &&
    typeof Reflect.get(data, "value") === "string"
  );
}

export function isVizLoadMessage(data: unknown): data is VizLoadData {
  if (typeof data !== "object" || data === null) return false;
  return (
    Reflect.get(data, "type") === VIZ_LOAD_MESSAGE &&
    typeof Reflect.get(data, "key") === "string" &&
    typeof Reflect.get(data, "nonce") === "number"
  );
}

/**
 * The sandboxed document: theme vars, bridge script, then the fence's markup.
 * The vars are the only theme a fence sees — an iframe cannot read the app's
 * tokens — so their values belong here rather than in a stylesheet.
 */
export function buildVizDocument(code: string, colorScheme: "light" | "dark"): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${VIZ_CSP}"><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{color-scheme:${colorScheme};--viz-fg:${colorScheme === "dark" ? "#e6e6e6" : "#1a1a1a"};--viz-bg:transparent;--viz-accent:${colorScheme === "dark" ? "#7dd3fc" : "#0369a1"};}html,body{margin:0;padding:0;background:transparent;color:var(--viz-fg);font:14px/1.4 system-ui,sans-serif;}</style></head><body><script>(function(){var PENDING={};var NONCE=0;function out(msg){try{parent.postMessage(msg,'*');}catch(e){}try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(msg));}catch(e){}}function report(){out({type:'${VIZ_HEIGHT_MESSAGE}',height:document.documentElement.scrollHeight});}window.sendPrompt=function(text){out({type:'${VIZ_PROMPT_MESSAGE}',text:String(text)});};window.saveState=function(key,value){out({type:'${VIZ_SAVE_MESSAGE}',key:String(key),value:String(value)});};window.loadState=function(key){return new Promise(function(resolve){var nonce=++NONCE;PENDING[nonce]=resolve;out({type:'${VIZ_LOAD_MESSAGE}',key:String(key),nonce:nonce});});};window.addEventListener('message',function(event){var d=event.data;if(!d||d.type!=='${VIZ_STATE_MESSAGE}')return;var resolve=PENDING[d.nonce];if(resolve){delete PENDING[d.nonce];resolve(d.value==null?null:String(d.value));}});new MutationObserver(report).observe(document.documentElement,{childList:true,subtree:true,attributes:true});window.addEventListener('load',report);report();})();</script>${code}</body></html>`;
}

export function isVizHeightMessage(data: unknown): data is { type: string; height: number } {
  if (typeof data !== "object" || data === null) return false;
  const type = Reflect.get(data, "type");
  const height = Reflect.get(data, "height");
  return type === VIZ_HEIGHT_MESSAGE && typeof height === "number" && height > 0;
}
