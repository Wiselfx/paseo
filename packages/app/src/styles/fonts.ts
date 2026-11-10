import type { FontSource } from "expo-font";

/**
 * The three Anthropic faces Claude sets its interface in: Sans for the UI, Serif
 * for conversation prose and headings, Mono for code. They are static Text
 * Regular cuts, so each is one 400 face and the platform synthesizes weight.
 * Keys are the family names the theme stacks ask for. See `styles/theme.ts`.
 */
export const APP_FONTS: Record<string, FontSource> = {
  AnthropicSans: require("../../assets/fonts/anthropic/AnthropicSansWebText.ttf"),
  AnthropicSerif: require("../../assets/fonts/anthropic/AnthropicSerifWebText.ttf"),
  AnthropicMono: require("../../assets/fonts/anthropic/AnthropicMonoWeb.ttf"),
};
