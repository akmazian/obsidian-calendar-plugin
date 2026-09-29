import type { TFile } from "obsidian";
import {
  getDateFromFile,
  getDateFromPath,
  getDateUID,
} from "obsidian-daily-notes-interface";

export const classList = (obj: Record<string, boolean>): string[] => {
  return Object.entries(obj)
    .filter(([_k, v]) => !!v)
    .map(([k, _k]) => k);
};

export function partition(
  arr: string[],
  predicate: (elem: string) => boolean
): [string[], string[]] {
  const pass: string[] = [];
  const fail: string[] = [];

  arr.forEach((elem) => {
    if (predicate(elem)) {
      pass.push(elem);
    } else {
      fail.push(elem);
    }
  });

  return [pass, fail];
}

/**
 * Lookup the dateUID for a given file. It compares the filename
 * to the daily and weekly note formats to find a match.
 *
 * @param file
 */
export function getDateUIDFromFile(file: TFile | null): string | null {
  if (!file) {
    return null;
  }

  // TODO: I'm not checking the path!
  let date = getDateFromFile(file, "day");
  if (date) {
    return getDateUID(date, "day");
  }

  date = getDateFromFile(file, "week");
  if (date) {
    return getDateUID(date, "week");
  }
  return null;
}

/**
 * Like getDateUIDFromFile, but for a path that may not exist yet, such as
 * the target of an unresolved link.
 */
export function getDateUIDFromPath(path: string): string | null {
  let date = getDateFromPath(path, "day");
  if (date) {
    return getDateUID(date, "day");
  }

  date = getDateFromPath(path, "week");
  if (date) {
    return getDateUID(date, "week");
  }
  return null;
}
