<svelte:options immutable />

<script lang="ts">
  import type { Moment } from "moment";
  import {
    Calendar as CalendarBase,
    type ICalendarSource,
    configureGlobalMomentLocale,
  } from "obsidian-calendar-ui";
  import { onDestroy, type ComponentProps } from "svelte";

  import type { ISettings } from "src/settings";
  import { activeFile, dailyNotes, settings, weeklyNotes } from "./stores";

  let today: Moment;

  $: today = getToday($settings);

  export let displayedMonth: Moment = today;
  export let sources: ICalendarSource[];
  // These mirror how obsidian-calendar-ui actually invokes the handlers at
  // runtime, which its index.d.ts understates: hover handlers receive a third
  // `isMetaPressed` argument, and none of the handlers' return values are used.
  export let onHoverDay: (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ) => void;
  export let onHoverWeek: (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ) => void;
  export let onClickDay: (date: Moment, isMetaPressed: boolean) => void;
  export let onClickWeek: (date: Moment, isMetaPressed: boolean) => void;
  export let onContextMenuDay: (date: Moment, event: MouseEvent) => void;
  export let onContextMenuWeek: (date: Moment, event: MouseEvent) => void;

  // Cast away the index.d.ts/runtime mismatch described above in one place.
  type BaseHandlers = Pick<
    ComponentProps<CalendarBase>,
    | "onHoverDay"
    | "onHoverWeek"
    | "onClickDay"
    | "onClickWeek"
    | "onContextMenuDay"
    | "onContextMenuWeek"
  >;

  let handlers: BaseHandlers;
  $: handlers = {
    onHoverDay,
    onHoverWeek,
    onClickDay,
    onClickWeek,
    onContextMenuDay,
    onContextMenuWeek,
  } as unknown as BaseHandlers;

  export function tick() {
    today = window.moment();
  }

  function getToday(settings: ISettings) {
    configureGlobalMomentLocale(settings.localeOverride, settings.weekStart);
    dailyNotes.reindex();
    weeklyNotes.reindex();
    return window.moment();
  }

  // 1 minute heartbeat to keep `today` reflecting the current day
  let heartbeat = setInterval(() => {
    tick();

    const isViewingCurrentMonth = displayedMonth.isSame(today, "day");
    if (isViewingCurrentMonth) {
      // if it's midnight on the last day of the month, this will
      // update the display to show the new month.
      displayedMonth = today;
    }
  }, 1000 * 60);

  onDestroy(() => {
    clearInterval(heartbeat);
  });
</script>

<CalendarBase
  {sources}
  {today}
  {...handlers}
  bind:displayedMonth
  localeData={today.localeData()}
  selectedId={$activeFile}
  showWeekNums={$settings.showWeeklyNote}
/>
