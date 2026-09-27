import type { Moment } from "moment";
import type { TFile } from "obsidian";
import { afterEach, describe, expect, it, vi } from "vitest";

import { customTagsSource } from "./tags";

const note = { path: "daily/2026-09-20.md" } as TFile;
const date = {} as Moment;

vi.mock("obsidian-daily-notes-interface", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDailyNote: vi.fn(),
  getWeeklyNote: vi.fn(),
}));
const { getDailyNote, getWeeklyNote } = await import(
  "obsidian-daily-notes-interface"
);

function mockFrontmatter(frontmatter: Record<string, unknown> | undefined) {
  vi.mocked(getDailyNote).mockReturnValue(note);
  vi.spyOn(window.app.metadataCache, "getFileCache").mockReturnValue(
    frontmatter ? { frontmatter } : {}
  );
}

describe("customTagsSource", () => {
  afterEach(() => vi.restoreAllMocks());

  it("exposes frontmatter tags without the leading #", async () => {
    mockFrontmatter({ tags: ["work", "gym"] });
    const { dataAttributes } = await customTagsSource.getDailyMetadata(date);
    expect(dataAttributes).toEqual({ "data-tags": "work gym" });
  });

  it("puts the first emoji tag in its own attribute", async () => {
    mockFrontmatter({ tags: ["work", "🏃", "🎉"] });
    const { dataAttributes } = await customTagsSource.getDailyMetadata(date);
    expect(dataAttributes).toEqual({
      "data-tags": "work",
      "data-emoji-tag": "🏃",
    });
  });

  it("sets no attributes for a note without frontmatter tags", async () => {
    mockFrontmatter(undefined);
    const { dataAttributes } = await customTagsSource.getDailyMetadata(date);
    expect(dataAttributes).toEqual({});
  });

  it("sets no attributes when there is no note", async () => {
    vi.mocked(getDailyNote).mockReturnValue(null);
    const { dataAttributes } = await customTagsSource.getDailyMetadata(date);
    expect(dataAttributes).toEqual({});
  });

  it("reads weekly notes for weekly metadata", async () => {
    vi.mocked(getWeeklyNote).mockReturnValue(note);
    vi.spyOn(window.app.metadataCache, "getFileCache").mockReturnValue({
      frontmatter: { tags: "review" },
    });
    const { dataAttributes } = await customTagsSource.getWeeklyMetadata(date);
    expect(dataAttributes).toEqual({ "data-tags": "review" });
  });
});
