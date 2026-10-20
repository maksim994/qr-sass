declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";
  export const gfm: TurndownService.Plugin;
}
declare module "markdown-it-task-lists" {
  import type { PluginSimple } from "markdown-it";
  const taskLists: PluginSimple;
  export default taskLists;
}
