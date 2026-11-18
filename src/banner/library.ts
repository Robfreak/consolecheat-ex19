import { DEFAULT_DESIGN, cloneDesign, parseDesign, type Design } from "./design.ts";

// What this page stores.
//
// localStorage key `consolecheat-banner-v1`:
//
//   {
//     "schema": "consolecheat-banner",
//     "version": 1,
//     "current": { …Design },
//     "designs": [{ "name": "Stream", "savedAt": 1731960000000, "design": { …Design } }]
//   }
//
// A JSON export uses the same shape without `current`.

export const LIBRARY_KEY = "consolecheat-banner-v1";
export const LANG_KEY = "consolecheat-lang";
export const THEME_KEY = "consolecheat-theme";
export const LIBRARY_SCHEMA = "consolecheat-banner";
export const LIBRARY_VERSION = 1;
export const MAX_DESIGNS = 50;
export const MAX_NAME = 40;
export const MAX_IMPORT_BYTES = 1_000_000;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type SavedDesign = { name: string; savedAt: number; design: Design };
export type Library = { current: Design; designs: SavedDesign[] };
export type LoadResult = { library: Library; corrupt: boolean };

export function emptyLibrary(): Library {
  return { current: cloneDesign(DEFAULT_DESIGN), designs: [] };
}

export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

function parseSaved(data: unknown): SavedDesign | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const item = data as Record<string, unknown>;
  if (typeof item.name !== "string" || !cleanName(item.name)) return null;
  if (typeof item.savedAt !== "number" || !Number.isFinite(item.savedAt) || item.savedAt < 0) return null;
  const design = parseDesign(item.design);
  if (!design) return null;
  return { name: cleanName(item.name), savedAt: item.savedAt, design };
}

/** Never throws. Missing key: defaults. Bad JSON, foreign schema, other version: defaults and corrupt. */
export function parseLibrary(raw: string | null): LoadResult {
  if (raw == null) return { library: emptyLibrary(), corrupt: false };
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return { library: emptyLibrary(), corrupt: true };
    const rec = data as Record<string, unknown>;
    if (rec.schema !== LIBRARY_SCHEMA || rec.version !== LIBRARY_VERSION) return { library: emptyLibrary(), corrupt: true };
    let corrupt = false;
    const library = emptyLibrary();
    if (rec.current !== undefined) {
      const current = parseDesign(rec.current);
      if (current) library.current = current;
      else corrupt = true;
    }
    if (Array.isArray(rec.designs)) {
      for (const item of rec.designs.slice(0, MAX_DESIGNS)) {
        const saved = parseSaved(item);
        if (saved) library.designs.push(saved);
        else corrupt = true;
      }
    } else if (rec.designs !== undefined) corrupt = true;
    return { library, corrupt };
  } catch {
    return { library: emptyLibrary(), corrupt: true };
  }
}

export function serializeLibrary(library: Library): string {
  return JSON.stringify({ schema: LIBRARY_SCHEMA, version: LIBRARY_VERSION, current: library.current, designs: library.designs });
}

export function loadLibrary(local: StorageLike): LoadResult {
  try {
    return parseLibrary(local.getItem(LIBRARY_KEY));
  } catch {
    return { library: emptyLibrary(), corrupt: false };
  }
}

export function saveLibrary(local: StorageLike, library: Library): boolean {
  try {
    local.setItem(LIBRARY_KEY, serializeLibrary(library));
    return true;
  } catch {
    return false;
  }
}

/** Removes only `consolecheat-banner-v1`. Language, theme, and every other key stay. */
export function resetLibrary(local: StorageLike): boolean {
  try {
    local.removeItem(LIBRARY_KEY);
    return true;
  } catch {
    return false;
  }
}

const same = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

/** Saves under a name. The same name (case-insensitive) is overwritten; newest first; at most MAX_DESIGNS. */
export function upsertDesign(designs: readonly SavedDesign[], name: string, design: Design, at: number): SavedDesign[] {
  const clean = cleanName(name);
  if (!clean) return [...designs];
  const rest = designs.filter((item) => !same(item.name, clean));
  return [{ name: clean, savedAt: at, design: cloneDesign(design) }, ...rest].slice(0, MAX_DESIGNS);
}

export function removeDesign(designs: readonly SavedDesign[], name: string): SavedDesign[] {
  return designs.filter((item) => !same(item.name, name));
}

export function exportJson(designs: readonly SavedDesign[]): string {
  return JSON.stringify({ schema: LIBRARY_SCHEMA, version: LIBRARY_VERSION, designs }, null, 2);
}

export type ImportResult =
  | { ok: true; designs: SavedDesign[]; skipped: number }
  | { ok: false; error: "tooLarge" | "json" | "schema" | "empty" };

/** Validates an imported file. Invalid entries are skipped and counted; nothing valid means an error. */
export function parseImport(raw: string): ImportResult {
  if (raw.length > MAX_IMPORT_BYTES) return { ok: false, error: "tooLarge" };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "json" };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "schema" };
  const rec = data as Record<string, unknown>;
  if (rec.schema !== LIBRARY_SCHEMA || rec.version !== LIBRARY_VERSION || !Array.isArray(rec.designs)) {
    return { ok: false, error: "schema" };
  }
  const designs: SavedDesign[] = [];
  let skipped = 0;
  for (const item of rec.designs.slice(0, MAX_DESIGNS)) {
    const saved = parseSaved(item);
    if (saved) designs.push(saved);
    else skipped++;
  }
  skipped += Math.max(0, rec.designs.length - MAX_DESIGNS);
  if (designs.length === 0) return { ok: false, error: "empty" };
  return { ok: true, designs, skipped };
}

/** Imported designs win over saved ones with the same name. */
export function mergeImport(existing: readonly SavedDesign[], incoming: readonly SavedDesign[]): SavedDesign[] {
  let out = [...existing];
  for (const item of [...incoming].reverse()) out = upsertDesign(out, item.name, item.design, item.savedAt);
  return out;
}
