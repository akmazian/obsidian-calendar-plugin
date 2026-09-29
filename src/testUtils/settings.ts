import type { ILocaleOverride, IWeekStartOption } from "obsidian-calendar-ui";

import type { ISettings } from "src/settings";

export function getDefaultSettings(
  overrides: Partial<ISettings> = {}
): ISettings {
  return Object.assign(
    {},
    {
      weekStart: "sunday" as IWeekStartOption,
      shouldConfirmBeforeCreate: false,
      showWeeklyNote: false,
      weeklyNoteFolder: "",
      weeklyNoteFormat: "",
      weeklyNoteTemplate: "",
      localeOverride: "system-default" as ILocaleOverride,
    },
    overrides
  );
}
