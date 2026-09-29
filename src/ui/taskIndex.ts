import { getLinkpath, type CachedMetadata, type TFile } from "obsidian";

import { getDateUIDFromFile, getDateUIDFromPath } from "./utils";

// Task statuses that count as finished: done, plus "-" (cancelled, as used
// by the Tasks plugin). Everything else, e.g. " " or "/", is unfinished.
const FINISHED_STATUSES = new Set(["x", "X", "-"]);

type Counts = Map<string, number>;

/**
 * Counts unfinished tasks per daily/weekly note, keyed by dateUID.
 *
 * A task counts toward the periodic note it's written in, and toward every
 * periodic note it links to, including notes that don't exist yet. Each
 * task counts at most once per note.
 *
 * Contributions are tracked per source file so a change only re-reads the
 * file that changed.
 */
export class TaskIndex {
  private contributions = new Map<string, Counts>();
  private totals: Counts = new Map();

  getUnfinishedCount(dateUID: string): number {
    return this.totals.get(dateUID) ?? 0;
  }

  rebuild(): void {
    this.contributions.clear();
    this.totals.clear();
    for (const file of window.app.vault.getMarkdownFiles()) {
      this.update(file);
    }
  }

  /** Re-reads one file. Returns whether any note's count changed. */
  update(file: TFile): boolean {
    return this.setContribution(file.path, this.countTasks(file));
  }

  remove(path: string): boolean {
    return this.setContribution(path, new Map());
  }

  rename(file: TFile, oldPath: string): boolean {
    const removed = this.remove(oldPath);
    return this.update(file) || removed;
  }

  private countTasks(file: TFile): Counts {
    const counts: Counts = new Map();
    const cache = window.app.metadataCache.getFileCache(file);
    const ownUID = getDateUIDFromFile(file);

    for (const item of cache?.listItems ?? []) {
      if (item.task === undefined || FINISHED_STATUSES.has(item.task)) {
        continue;
      }
      const targets = new Set<string>();
      if (ownUID) {
        targets.add(ownUID);
      }
      const { start, end } = item.position;
      const linked = this.linkedUIDs(cache, file.path, start.line, end.line);
      for (const uid of linked) {
        targets.add(uid);
      }
      for (const uid of targets) {
        counts.set(uid, (counts.get(uid) ?? 0) + 1);
      }
    }
    return counts;
  }

  private linkedUIDs(
    cache: CachedMetadata | null,
    sourcePath: string,
    fromLine: number,
    toLine: number
  ): string[] {
    const uids: string[] = [];
    for (const link of cache?.links ?? []) {
      const line = link.position.start.line;
      if (line < fromLine || line > toLine) {
        continue;
      }
      const linkpath = getLinkpath(link.link);
      const dest = window.app.metadataCache.getFirstLinkpathDest(
        linkpath,
        sourcePath
      );
      const uid = dest
        ? getDateUIDFromFile(dest)
        : getDateUIDFromPath(linkpath);
      if (uid) {
        uids.push(uid);
      }
    }
    return uids;
  }

  private setContribution(path: string, next: Counts): boolean {
    const prev = this.contributions.get(path) ?? new Map<string, number>();
    let changed = false;
    for (const uid of new Set([...prev.keys(), ...next.keys()])) {
      const delta = (next.get(uid) ?? 0) - (prev.get(uid) ?? 0);
      if (delta === 0) {
        continue;
      }
      changed = true;
      const total = (this.totals.get(uid) ?? 0) + delta;
      if (total > 0) {
        this.totals.set(uid, total);
      } else {
        this.totals.delete(uid);
      }
    }
    if (next.size) {
      this.contributions.set(path, next);
    } else {
      this.contributions.delete(path);
    }
    return changed;
  }
}

export const taskIndex = new TaskIndex();
