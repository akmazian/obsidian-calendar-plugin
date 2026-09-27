import type { Moment } from "moment";
import type { TFile } from "obsidian";
import { afterEach, describe, expect, it, vi } from "vitest";

import { streakSource } from "./streak";

const date = {} as Moment;

vi.mock("obsidian-daily-notes-interface", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDailyNote: vi.fn(),
  getWeeklyNote: vi.fn(),
}));
const { getDailyNote, getWeeklyNote } = await import(
  "obsidian-daily-notes-interface"
);

describe("streakSource", () => {
  afterEach(() => vi.resetAllMocks());

  it("marks days that have a daily note", async () => {
    vi.mocked(getDailyNote).mockReturnValue({} as TFile);
    expect(await streakSource.getDailyMetadata(date)).toEqual({
      classes: ["has-note"],
      dots: [],
    });
  });

  it("leaves days without a note unmarked", async () => {
    vi.mocked(getDailyNote).mockReturnValue(null);
    expect(await streakSource.getDailyMetadata(date)).toEqual({
      classes: [],
      dots: [],
    });
  });

  it("marks weeks that have a weekly note", async () => {
    vi.mocked(getWeeklyNote).mockReturnValue({} as TFile);
    expect((await streakSource.getWeeklyMetadata(date)).classes).toEqual([
      "has-note",
    ]);
  });
});
