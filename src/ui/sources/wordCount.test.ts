import type { TFile } from "obsidian";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getDefaultSettings } from "src/testUtils/settings";

import { settings } from "../stores";
import { getDotsForDailyNote, getWordLengthAsDots } from "./wordCount";

const note = {} as TFile;

function mockNoteWithWords(count: number) {
  vi.spyOn(window.app.vault, "cachedRead").mockResolvedValue(
    "word ".repeat(count)
  );
}

describe("getWordLengthAsDots", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    settings.set(getDefaultSettings());
  });

  it("returns 0 when there is no note", async () => {
    expect(await getWordLengthAsDots(null)).toBe(0);
  });

  it("shows at least one dot for a non-empty note", async () => {
    settings.set(getDefaultSettings({ wordsPerDot: 50 }));
    mockNoteWithWords(10);
    expect(await getWordLengthAsDots(note)).toBe(1);
  });

  it("adds a dot per wordsPerDot words", async () => {
    settings.set(getDefaultSettings({ wordsPerDot: 50 }));
    mockNoteWithWords(160);
    expect(await getWordLengthAsDots(note)).toBe(3);
  });

  it("caps at 5 dots", async () => {
    settings.set(getDefaultSettings({ wordsPerDot: 50 }));
    mockNoteWithWords(10_000);
    expect(await getWordLengthAsDots(note)).toBe(5);
  });

  it("is disabled when wordsPerDot is 0", async () => {
    settings.set(getDefaultSettings({ wordsPerDot: 0 }));
    mockNoteWithWords(500);
    expect(await getWordLengthAsDots(note)).toBe(0);
  });
});

describe("getDotsForDailyNote", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    settings.set(getDefaultSettings());
  });

  it("returns filled dots matching the word count", async () => {
    settings.set(getDefaultSettings({ wordsPerDot: 50 }));
    mockNoteWithWords(100);
    expect(await getDotsForDailyNote(note)).toEqual([
      { className: "", color: "default", isFilled: true },
      { className: "", color: "default", isFilled: true },
    ]);
  });

  it("returns no dots without a note", async () => {
    expect(await getDotsForDailyNote(null)).toEqual([]);
  });
});
