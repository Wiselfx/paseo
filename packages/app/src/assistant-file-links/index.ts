export {
  classifyAssistantFileLink,
  normalizeInlinePathTarget,
  type InlinePathTarget,
} from "./parse";
export {
  AssistantFileLinkResolverProvider,
  useAssistantFileLinkEnvironment,
  type AssistantFileLinkResolverProviderProps,
} from "./provider";
export type { AssistantFileLinkSource } from "./resolver";
export { useAssistantFileLinkActions } from "./use-file-link";
