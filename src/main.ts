import type { WeekSpec } from "moment";
import { Plugin, type App, type WorkspaceLeaf } from "obsidian";

import { VIEW_TYPE_CALENDAR } from "./constants";
import { settings } from "./ui/stores";
import {
  appHasPeriodicNotesPluginLoaded,
  CalendarSettingsTab,
  type ISettings,
} from "./settings";
import CalendarView from "./view";

declare global {
  interface Window {
    app: App;
    _bundledLocaleWeekSpec: WeekSpec;
  }
}

export default class CalendarPlugin extends Plugin {
  public options: ISettings;

  onunload(): void {
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_CALENDAR)
      .forEach((leaf) => leaf.detach());
  }

  async onload(): Promise<void> {
    this.register(
      settings.subscribe((value) => {
        this.options = value;
      })
    );

    this.registerView(
      VIEW_TYPE_CALENDAR,
      (leaf: WorkspaceLeaf) => new CalendarView(leaf)
    );
    this.registerHoverLinkSource(VIEW_TYPE_CALENDAR, {
      display: "Calendar",
      defaultMod: true,
    });

    this.addCommand({
      id: "show-calendar-view",
      name: "Open view",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return (
            this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR).length === 0
          );
        }
        this.initLeaf();
      },
    });

    this.addCommand({
      id: "open-weekly-note",
      name: "Open Weekly Note",
      checkCallback: (checking) => {
        if (checking) {
          return !appHasPeriodicNotesPluginLoaded();
        }
        void this.getCalendarView().then((view) =>
          view?.openOrCreateWeeklyNote(window.moment(), false)
        );
      },
    });

    this.addCommand({
      id: "reveal-active-note",
      name: "Reveal active note",
      callback: async () => {
        const view = await this.getCalendarView();
        view?.revealActiveNote();
      },
    });

    await this.loadOptions();

    this.addSettingTab(new CalendarSettingsTab(this.app, this));

    this.app.workspace.onLayoutReady(this.initLeaf.bind(this));
  }

  // Sidebar views are deferred until first shown (Obsidian 1.7+), so the
  // leaf's view may not be a CalendarView until it's loaded.
  private async getCalendarView(): Promise<CalendarView | null> {
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];
    if (!leaf) {
      return null;
    }
    await leaf.loadIfDeferred();
    return leaf.view instanceof CalendarView ? leaf.view : null;
  }

  initLeaf(): void {
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR).length) {
      return;
    }
    this.app.workspace.getRightLeaf(false).setViewState({
      type: VIEW_TYPE_CALENDAR,
    });
  }

  async loadOptions(): Promise<void> {
    const options = await this.loadData();
    settings.update((old) => {
      return {
        ...old,
        ...(options || {}),
      };
    });

    await this.saveData(this.options);
  }

  async writeOptions(
    changeOpts: (settings: ISettings) => Partial<ISettings>
  ): Promise<void> {
    settings.update((old) => ({ ...old, ...changeOpts(old) }));
    await this.saveData(this.options);
  }
}
