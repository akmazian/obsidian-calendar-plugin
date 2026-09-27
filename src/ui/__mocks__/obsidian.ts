export class TFile {}
export class PluginSettingTab {}
export class Modal {}
export class Notice {}
export function normalizePath(): string {
  return "";
}

// Mirrors Obsidian's behavior: reads `tags`/`tag`, accepts a list or a
// comma/space-separated string, and returns tags prefixed with "#".
export function parseFrontMatterTags(
  frontmatter: Record<string, unknown> | null
): string[] | null {
  const raw = frontmatter?.tags ?? frontmatter?.tag;
  if (raw == null) {
    return null;
  }
  const list = Array.isArray(raw) ? raw : String(raw).split(/[,\s]+/);
  const tags = list
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  return tags.length ? tags : null;
}
