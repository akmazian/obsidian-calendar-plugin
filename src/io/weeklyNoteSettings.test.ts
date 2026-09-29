import { getWeeklyNoteSettings } from "obsidian-daily-notes-interface";
import { afterEach, describe, expect, it, vi } from "vitest";

// obsidian-daily-notes-interface looks the plugin up by id to read its
// weekly-note settings. Upstream hardcodes the original id ("calendar");
// patches/obsidian-daily-notes-interface@*.patch points it at ours.
// app.plugins is private API, so it isn't in Obsidian's typings.
const { plugins } = window.app as unknown as {
  plugins: { getPlugin(id: string): unknown };
};

describe("weekly note settings", () => {
  afterEach(() => vi.restoreAllMocks());

  it("are read from the calendar-revived plugin", () => {
    vi.spyOn(plugins, "getPlugin").mockImplementation((id) =>
      id === "calendar-revived"
        ? {
            options: {
              weeklyNoteFormat: "gggg-[Week]-ww",
              weeklyNoteFolder: "weekly",
              weeklyNoteTemplate: "templates/week",
            },
          }
        : null
    );
    expect(getWeeklyNoteSettings()).toEqual({
      format: "gggg-[Week]-ww",
      folder: "weekly",
      template: "templates/week",
    });
  });
});
