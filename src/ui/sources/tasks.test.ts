import type { TFile } from "obsidian";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getDotsForDailyNote, getNumberOfRemainingTasks } from "./tasks";

const note = {} as TFile;

function mockNoteContents(contents: string) {
  vi.spyOn(window.app.vault, "cachedRead").mockResolvedValue(contents);
}

describe("getNumberOfRemainingTasks", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 0 when there is no note", async () => {
    expect(await getNumberOfRemainingTasks(null)).toBe(0);
  });

  it("counts open tasks with either bullet style", async () => {
    mockNoteContents("- [ ] one\n* [ ] two\n  - [ ] nested");
    expect(await getNumberOfRemainingTasks(note)).toBe(3);
  });

  it("ignores completed tasks and plain list items", async () => {
    mockNoteContents("- [x] done\n- [X] done\n- not a task\n- [ ] open");
    expect(await getNumberOfRemainingTasks(note)).toBe(1);
  });
});

describe("getDotsForDailyNote", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows a single hollow task dot when tasks remain", async () => {
    mockNoteContents("- [ ] a\n- [ ] b");
    expect(await getDotsForDailyNote(note)).toEqual([
      { className: "task", color: "default", isFilled: false },
    ]);
  });

  it("shows no dot when every task is done", async () => {
    mockNoteContents("- [x] a");
    expect(await getDotsForDailyNote(note)).toEqual([]);
  });

  it("shows no dot without a note", async () => {
    expect(await getDotsForDailyNote(null)).toEqual([]);
  });
});
