import type { Moment } from "moment";
import {
  getDailyNote,
  getDailyNoteSettings,
  getDateFromFile,
  getWeeklyNote,
  getWeeklyNoteSettings,
} from "obsidian-daily-notes-interface";
import {
  FileView,
  ItemView,
  type HoverParent,
  type HoverPopover,
  type TFile,
  type WorkspaceLeaf,
} from "obsidian";
import { get } from "svelte/store";

import { TRIGGER_ON_OPEN, VIEW_TYPE_CALENDAR } from "src/constants";
import { tryToCreateDailyNote } from "src/io/dailyNotes";
import { tryToCreateWeeklyNote } from "src/io/weeklyNotes";
import type { ISettings } from "src/settings";

import Calendar from "./ui/Calendar.svelte";
import { showFileMenu } from "./ui/fileMenu";
import { activeFile, dailyNotes, weeklyNotes, settings } from "./ui/stores";
import {
  customTagsSource,
  streakSource,
  tasksSource,
  wordCountSource,
} from "./ui/sources";

export default class CalendarView extends ItemView implements HoverParent {
  private calendar: Calendar;
  private settings: ISettings;
  public hoverPopover: HoverPopover | null = null;
  // obsidian-calendar-ui only hands hover handlers the target element, but
  // the "hover-link" event needs the originating pointer event.
  private lastPointerOver: PointerEvent | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);

    this.openOrCreateDailyNote = this.openOrCreateDailyNote.bind(this);
    this.openOrCreateWeeklyNote = this.openOrCreateWeeklyNote.bind(this);

    this.onNoteSettingsUpdate = this.onNoteSettingsUpdate.bind(this);
    this.onFileCreated = this.onFileCreated.bind(this);
    this.onFileDeleted = this.onFileDeleted.bind(this);
    this.onFileModified = this.onFileModified.bind(this);
    this.onFileOpen = this.onFileOpen.bind(this);

    this.onHoverDay = this.onHoverDay.bind(this);
    this.onHoverWeek = this.onHoverWeek.bind(this);

    this.onContextMenuDay = this.onContextMenuDay.bind(this);
    this.onContextMenuWeek = this.onContextMenuWeek.bind(this);

    this.registerEvent(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (<any>this.app.workspace).on(
        "periodic-notes:settings-updated",
        this.onNoteSettingsUpdate
      )
    );
    this.registerEvent(this.app.vault.on("create", this.onFileCreated));
    this.registerEvent(this.app.vault.on("delete", this.onFileDeleted));
    this.registerEvent(this.app.vault.on("modify", this.onFileModified));
    this.registerEvent(this.app.workspace.on("file-open", this.onFileOpen));

    this.settings = null;
    // Unsubscribe when the view closes; otherwise a closed view's destroyed
    // calendar throws on the next settings change and blocks later subscribers.
    this.register(
      settings.subscribe((val) => {
        this.settings = val;

        // Refresh the calendar if settings change
        if (this.calendar) {
          this.calendar.tick();
        }
      })
    );
  }

  getViewType(): string {
    return VIEW_TYPE_CALENDAR;
  }

  getDisplayText(): string {
    return "Calendar";
  }

  getIcon(): string {
    return "calendar-with-checkmark";
  }

  onClose(): Promise<void> {
    if (this.calendar) {
      this.calendar.$destroy();
    }
    return Promise.resolve();
  }

  async onOpen(): Promise<void> {
    // Integration point: external plugins can listen for `calendar:open`
    // to feed in additional sources.
    const sources = [
      customTagsSource,
      streakSource,
      wordCountSource,
      tasksSource,
    ];
    this.app.workspace.trigger(TRIGGER_ON_OPEN, sources);

    // Capture phase so this runs before the day/week cell's own handler.
    this.registerDomEvent(
      this.contentEl,
      "pointerover",
      (event) => (this.lastPointerOver = event),
      { capture: true }
    );

    this.calendar = new Calendar({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      target: (this as any).contentEl,
      props: {
        onClickDay: this.openOrCreateDailyNote,
        onClickWeek: this.openOrCreateWeeklyNote,
        onHoverDay: this.onHoverDay,
        onHoverWeek: this.onHoverWeek,
        onContextMenuDay: this.onContextMenuDay,
        onContextMenuWeek: this.onContextMenuWeek,
        sources,
      },
    });
  }

  // The modifier-key requirement is enforced by Obsidian's page preview,
  // per the "Calendar" hover source registered in main.ts.
  onHoverDay(
    date: Moment,
    targetEl: EventTarget,
    _isMetaPressed: boolean
  ): void {
    const { format } = getDailyNoteSettings();
    const note = getDailyNote(date, get(dailyNotes));
    this.triggerHoverLink(targetEl, date.format(format), note?.path);
  }

  onHoverWeek(
    date: Moment,
    targetEl: EventTarget,
    _isMetaPressed: boolean
  ): void {
    const note = getWeeklyNote(date, get(weeklyNotes));
    const { format } = getWeeklyNoteSettings();
    this.triggerHoverLink(targetEl, date.format(format), note?.path);
  }

  private triggerHoverLink(
    targetEl: EventTarget,
    linktext: string,
    sourcePath: string | undefined
  ): void {
    if (!this.lastPointerOver) {
      return;
    }
    this.app.workspace.trigger("hover-link", {
      event: this.lastPointerOver,
      source: VIEW_TYPE_CALENDAR,
      hoverParent: this,
      targetEl,
      linktext,
      sourcePath,
    });
  }

  private onContextMenuDay(date: Moment, event: MouseEvent): void {
    const note = getDailyNote(date, get(dailyNotes));
    if (!note) {
      // If no file exists for a given day, show nothing.
      return;
    }
    showFileMenu(this.app, note, {
      x: event.pageX,
      y: event.pageY,
    });
  }

  private onContextMenuWeek(date: Moment, event: MouseEvent): void {
    const note = getWeeklyNote(date, get(weeklyNotes));
    if (!note) {
      // If no file exists for a given day, show nothing.
      return;
    }
    showFileMenu(this.app, note, {
      x: event.pageX,
      y: event.pageY,
    });
  }

  private onNoteSettingsUpdate(): void {
    dailyNotes.reindex();
    weeklyNotes.reindex();
    this.updateActiveFile();
  }

  private async onFileDeleted(file: TFile): Promise<void> {
    if (getDateFromFile(file, "day")) {
      dailyNotes.reindex();
      this.updateActiveFile();
    }
    if (getDateFromFile(file, "week")) {
      weeklyNotes.reindex();
      this.updateActiveFile();
    }
  }

  private async onFileModified(file: TFile): Promise<void> {
    const date = getDateFromFile(file, "day") || getDateFromFile(file, "week");
    if (date && this.calendar) {
      this.calendar.tick();
    }
  }

  private onFileCreated(file: TFile): void {
    if (this.app.workspace.layoutReady && this.calendar) {
      if (getDateFromFile(file, "day")) {
        dailyNotes.reindex();
        this.calendar.tick();
      }
      if (getDateFromFile(file, "week")) {
        weeklyNotes.reindex();
        this.calendar.tick();
      }
    }
  }

  public onFileOpen(_file: TFile): void {
    if (this.app.workspace.layoutReady) {
      this.updateActiveFile();
    }
  }

  private updateActiveFile(): void {
    const { view } = this.app.workspace.activeLeaf;

    let file = null;
    if (view instanceof FileView) {
      file = view.file;
    }
    activeFile.setFile(file);

    if (this.calendar) {
      this.calendar.tick();
    }
  }

  public revealActiveNote(): void {
    const { moment } = window;
    const { activeLeaf } = this.app.workspace;

    if (activeLeaf.view instanceof FileView) {
      // Check to see if the active note is a daily-note
      let date = getDateFromFile(activeLeaf.view.file, "day");
      if (date) {
        this.calendar.$set({ displayedMonth: date });
        return;
      }

      // Check to see if the active note is a weekly-note
      const { format } = getWeeklyNoteSettings();
      date = moment(activeLeaf.view.file.basename, format, true);
      if (date.isValid()) {
        this.calendar.$set({ displayedMonth: date });
        return;
      }
    }
  }

  async openOrCreateWeeklyNote(
    date: Moment,
    inNewSplit: boolean
  ): Promise<void> {
    const { workspace } = this.app;

    const startOfWeek = date.clone().startOf("week");

    const existingFile = getWeeklyNote(date, get(weeklyNotes));

    if (!existingFile) {
      // File doesn't exist
      tryToCreateWeeklyNote(startOfWeek, inNewSplit, this.settings, (file) => {
        activeFile.setFile(file);
      });
      return;
    }

    const leaf = inNewSplit
      ? workspace.splitActiveLeaf()
      : workspace.getUnpinnedLeaf();
    await leaf.openFile(existingFile);

    activeFile.setFile(existingFile);
    workspace.setActiveLeaf(leaf, true, true)
  }

  async openOrCreateDailyNote(
    date: Moment,
    inNewSplit: boolean
  ): Promise<void> {
    const { workspace } = this.app;
    const existingFile = getDailyNote(date, get(dailyNotes));
    if (!existingFile) {
      // File doesn't exist
      tryToCreateDailyNote(
        date,
        inNewSplit,
        this.settings,
        (dailyNote: TFile) => {
          activeFile.setFile(dailyNote);
        }
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mode = (this.app.vault as any).getConfig("defaultViewMode");
    const leaf = inNewSplit
      ? workspace.splitActiveLeaf()
      : workspace.getUnpinnedLeaf();
    await leaf.openFile(existingFile, { active: true, state: { mode } });

    activeFile.setFile(existingFile);
  }
}
