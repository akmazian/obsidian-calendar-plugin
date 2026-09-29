import { afterEach, describe, expect, it, vi } from "vitest";

import { taskIndex } from "../taskIndex";
import { tasksSource } from "./tasks";

const date = window.moment("2026-09-20");

describe("tasksSource", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows one filled dot when the day has unfinished tasks", async () => {
    vi.spyOn(taskIndex, "getUnfinishedCount").mockReturnValue(3);
    expect(await tasksSource.getDailyMetadata(date)).toEqual({
      dots: [{ className: "task", color: "default", isFilled: true }],
    });
  });

  it("shows no dot when everything is done", async () => {
    vi.spyOn(taskIndex, "getUnfinishedCount").mockReturnValue(0);
    expect(await tasksSource.getDailyMetadata(date)).toEqual({ dots: [] });
  });

  it("looks weeks up by their week UID", async () => {
    const spy = vi.spyOn(taskIndex, "getUnfinishedCount").mockReturnValue(1);
    await tasksSource.getWeeklyMetadata(date);
    expect(spy).toHaveBeenCalledWith(
      `week-${date.clone().startOf("week").format()}`
    );
  });
});
