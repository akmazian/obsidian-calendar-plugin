import type { CachedMetadata, TFile } from "obsidian";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TaskIndex } from "./taskIndex";

function file(path: string): TFile {
  const basename = path.split("/").pop()!.replace(/\.md$/, "");
  return { path, basename, extension: "md" } as TFile;
}

const at = (line: number) => ({
  start: { line, col: 0, offset: 0 },
  end: { line, col: 0, offset: 0 },
});

/** Builds a cache from lines like "- [ ] text [[link]]". */
function cacheFor(lines: string[]): CachedMetadata {
  const listItems: NonNullable<CachedMetadata["listItems"]> = [];
  const links: NonNullable<CachedMetadata["links"]> = [];
  lines.forEach((text, line) => {
    const task = /^\s*[-*+] \[(.)\]/.exec(text)?.[1];
    if (/^\s*[-*+] /.test(text)) {
      listItems.push({ task, parent: -1, position: at(line) });
    }
    for (const [original, link] of text.matchAll(/\[\[([^\]|]+)[^\]]*\]\]/g)) {
      links.push({ link, original, position: at(line) });
    }
  });
  return { listItems, links };
}

let files: Record<string, { file: TFile; cache: CachedMetadata }>;

function setNote(path: string, lines: string[]) {
  files[path] = { file: file(path), cache: cacheFor(lines) };
  return files[path].file;
}

const uid = (d: string) => `day-${window.moment(d).format()}`;

describe("TaskIndex", () => {
  let index: TaskIndex;

  beforeEach(() => {
    files = {};
    index = new TaskIndex();
    const { vault, metadataCache } = window.app;
    vi.spyOn(vault, "getMarkdownFiles").mockImplementation(() =>
      Object.values(files).map((f) => f.file)
    );
    vi.spyOn(metadataCache, "getFileCache").mockImplementation(
      (f) => files[f.path]?.cache ?? null
    );
    vi.spyOn(metadataCache, "getFirstLinkpathDest").mockImplementation(
      (linkpath) =>
        Object.values(files).find((f) => f.file.basename === linkpath)?.file ??
        null
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it("counts open tasks in a daily note toward its own day", () => {
    setNote("daily/2026-09-20.md", ["- [ ] one", "- [ ] two", "- [x] done"]);
    index.rebuild();
    expect(index.getUnfinishedCount(uid("2026-09-20"))).toBe(2);
  });

  it("ignores done and cancelled tasks and plain list items", () => {
    setNote("daily/2026-09-20.md", ["- [x] a", "- [X] b", "- [-] c", "- d"]);
    index.rebuild();
    expect(index.getUnfinishedCount(uid("2026-09-20"))).toBe(0);
  });

  it("treats other statuses, like in-progress, as unfinished", () => {
    setNote("daily/2026-09-20.md", ["- [/] started", "* [ ] star bullet"]);
    index.rebuild();
    expect(index.getUnfinishedCount(uid("2026-09-20"))).toBe(2);
  });

  it("counts open tasks in other notes that link to the day", () => {
    setNote("daily/2026-09-20.md", []);
    setNote("Projects/Garden.md", [
      "- [ ] water plants [[2026-09-20]]",
      "- [x] buy seeds [[2026-09-20]]",
      "- a plain bullet [[2026-09-20]]",
      "Prose mentioning [[2026-09-20]]",
    ]);
    index.rebuild();
    expect(index.getUnfinishedCount(uid("2026-09-20"))).toBe(1);
  });

  it("counts tasks linking to a day whose note doesn't exist yet", () => {
    setNote("Projects/Trip.md", ["- [ ] book train [[2026-09-30]]"]);
    index.rebuild();
    expect(index.getUnfinishedCount(uid("2026-09-30"))).toBe(1);
  });

  it("handles heading and alias links", () => {
    setNote("Inbox.md", [
      "- [ ] a [[2026-09-30#Morning]]",
      "- [ ] b [[2026-09-30|Wednesday]]",
    ]);
    index.rebuild();
    expect(index.getUnfinishedCount(uid("2026-09-30"))).toBe(2);
  });

  it("counts a task once per day, even if it links to its own day", () => {
    setNote("daily/2026-09-20.md", [
      "- [ ] follow up [[2026-09-20]] [[2026-09-20]] [[2026-09-30]]",
    ]);
    index.rebuild();
    expect(index.getUnfinishedCount(uid("2026-09-20"))).toBe(1);
    expect(index.getUnfinishedCount(uid("2026-09-30"))).toBe(1);
  });

  it("ignores links to notes that aren't periodic notes", () => {
    setNote("Inbox.md", ["- [ ] read [[Some Book]]"]);
    index.rebuild();
    expect(index.getUnfinishedCount(uid("2026-09-20"))).toBe(0);
  });

  it("updates incrementally and reports whether counts changed", () => {
    const inbox = setNote("Inbox.md", ["- [ ] a [[2026-09-30]]"]);
    index.rebuild();

    setNote("Inbox.md", ["- [x] a [[2026-09-30]]"]);
    expect(index.update(inbox)).toBe(true);
    expect(index.getUnfinishedCount(uid("2026-09-30"))).toBe(0);

    expect(index.update(inbox)).toBe(false);
  });

  it("drops a file's tasks when it's deleted", () => {
    setNote("Inbox.md", ["- [ ] a [[2026-09-30]]"]);
    setNote("Other.md", ["- [ ] b [[2026-09-30]]"]);
    index.rebuild();
    expect(index.remove("Inbox.md")).toBe(true);
    expect(index.getUnfinishedCount(uid("2026-09-30"))).toBe(1);
  });

  it("moves a daily note's own tasks when it's renamed", () => {
    setNote("daily/2026-09-20.md", ["- [ ] a"]);
    index.rebuild();
    delete files["daily/2026-09-20.md"];
    const renamed = setNote("daily/2026-09-30.md", ["- [ ] a"]);
    expect(index.rename(renamed, "daily/2026-09-20.md")).toBe(true);
    expect(index.getUnfinishedCount(uid("2026-09-20"))).toBe(0);
    expect(index.getUnfinishedCount(uid("2026-09-30"))).toBe(1);
  });
});
