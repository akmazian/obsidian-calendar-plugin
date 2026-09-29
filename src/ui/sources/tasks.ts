import type { Moment } from "moment";
import type { ICalendarSource, IDayMetadata, IDot } from "obsidian-calendar-ui";
import { getDateUID } from "obsidian-daily-notes-interface";

import { taskIndex } from "../taskIndex";

function getTaskDots(dateUID: string): IDot[] {
  if (taskIndex.getUnfinishedCount(dateUID) === 0) {
    return [];
  }
  return [{ className: "task", color: "default", isFilled: true }];
}

/** One dot on days and weeks that still have unfinished tasks. */
export const tasksSource = {
  getDailyMetadata: async (date: Moment): Promise<IDayMetadata> => ({
    dots: getTaskDots(getDateUID(date, "day")),
  }),

  getWeeklyMetadata: async (date: Moment): Promise<IDayMetadata> => ({
    dots: getTaskDots(getDateUID(date, "week")),
  }),
} satisfies ICalendarSource;
