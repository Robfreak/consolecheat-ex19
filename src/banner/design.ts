import { isFontId, type FontId } from "./fonts.ts";

// A banner design: everything needed to render the PNG again.

export const MAX_TEXT = 160;
export const MAX_LINES = 6;
export const MIN_SIZE = 16;
export const MAX_SIZE = 4096;
export const MAX_SCALE = 64;

export type Align = "left" | "center" | "right";
export type Direction = "h" | "v";
export type BackgroundMode = "transparent" | "color" | "gradient";

export const SIZE_PRESETS = [
  { id: "overlay", width: 1920, height: 240 },
  { id: "twitch", width: 1200, height: 480 },
  { id: "youtube", width: 2560, height: 1440 },
  { id: "header", width: 1500, height: 500 },
  { id: "panel", width: 320, height: 100 },
] as const;
export type SizePresetId = (typeof SIZE_PRESETS)[number]["id"] | "custom";
export const SIZE_PRESET_IDS: readonly SizePresetId[] = [...SIZE_PRESETS.map((p) => p.id), "custom"];

export type Design = {
  text: string;
  font: FontId;
  /** 0 = fit automatically, otherwise output pixels per font pixel. */
  scale: number;
  letterSpacing: number;
  lineSpacing: number;
  align: Align;
  padding: number;
  fill: { stops: string[]; direction: Direction };
  outline: { width: number; color: string };
  shadow: { on: boolean; dx: number; dy: number; color: string };
  scanlines: number;
  background: { mode: BackgroundMode; color: string; color2: string; direction: Direction };
  size: { preset: SizePresetId; width: number; height: number };
};

/** The look without text, size, or layout. Style presets and the random style set these. */
export type Style = Pick<Design, "font" | "letterSpacing" | "fill" | "outline" | "shadow" | "scanlines" | "background">;

export const DEFAULT_DESIGN: Design = {
  text: "CONSOLECHEAT\nGAME ON!",
  font: "pixel",
  scale: 0,
  letterSpacing: 1,
  lineSpacing: 2,
  align: "center",
  padding: 24,
  fill: { stops: ["#ffe14d", "#ff7a1a", "#e8243c"], direction: "v" },
  outline: { width: 1, color: "#1a0a2e" },
  shadow: { on: true, dx: 1, dy: 1, color: "#000000" },
  scanlines: 25,
  background: { mode: "color", color: "#120a2a", color2: "#3b1460", direction: "v" },
  size: { preset: "overlay", width: 1920, height: 240 },
};

/** A curated 16-colour retro palette, offered next to every colour picker. */
export const RETRO_PALETTE = [
  "#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8",
  "#ff004d", "#ffa300", "#ffec27", "#00e436", "#29adff", "#83769c", "#ff77a8", "#ffccaa",
] as const;

export const STYLE_PRESETS: readonly { id: string; de: string; en: string; style: Style }[] = [
  {
    id: "arcade",
    de: "Arcade",
    en: "Arcade",
    style: {
      font: "pixel",
      letterSpacing: 1,
      fill: { stops: ["#ffe14d", "#ff7a1a", "#e8243c"], direction: "v" },
      outline: { width: 1, color: "#1a0a2e" },
      shadow: { on: true, dx: 1, dy: 1, color: "#000000" },
      scanlines: 25,
      background: { mode: "color", color: "#120a2a", color2: "#3b1460", direction: "v" },
    },
  },
  {
    id: "gameboy",
    de: "Game Boy",
    en: "Game Boy",
    style: {
      font: "pixel",
      letterSpacing: 1,
      fill: { stops: ["#0f380f", "#0f380f"], direction: "v" },
      outline: { width: 0, color: "#306230" },
      shadow: { on: true, dx: 1, dy: 1, color: "#306230" },
      scanlines: 10,
      background: { mode: "color", color: "#9bbc0f", color2: "#8bac0f", direction: "v" },
    },
  },
  {
    id: "synthwave",
    de: "Synthwave",
    en: "Synthwave",
    style: {
      font: "bold",
      letterSpacing: 1,
      fill: { stops: ["#ff6ad5", "#c774e8", "#33e1ff"], direction: "v" },
      outline: { width: 1, color: "#2b0f54" },
      shadow: { on: true, dx: 0, dy: 2, color: "#ff2a6d" },
      scanlines: 35,
      background: { mode: "gradient", color: "#1a0b3d", color2: "#5a1a6b", direction: "v" },
    },
  },
  {
    id: "terminal",
    de: "Terminal",
    en: "Terminal",
    style: {
      font: "mini",
      letterSpacing: 1,
      fill: { stops: ["#ffb000", "#ffcc4d"], direction: "v" },
      outline: { width: 0, color: "#000000" },
      shadow: { on: false, dx: 1, dy: 1, color: "#000000" },
      scanlines: 50,
      background: { mode: "color", color: "#1a1000", color2: "#000000", direction: "v" },
    },
  },
  {
    id: "neon",
    de: "Neon",
    en: "Neon",
    style: {
      font: "bold",
      letterSpacing: 2,
      fill: { stops: ["#39ff14", "#29adff"], direction: "h" },
      outline: { width: 1, color: "#04260a" },
      shadow: { on: false, dx: 1, dy: 1, color: "#000000" },
      scanlines: 40,
      background: { mode: "color", color: "#050805", color2: "#000000", direction: "v" },
    },
  },
  {
    id: "overlay",
    de: "Overlay (transparent)",
    en: "Overlay (transparent)",
    style: {
      font: "pixel",
      letterSpacing: 1,
      fill: { stops: ["#ffffff", "#7eb6ff"], direction: "v" },
      outline: { width: 2, color: "#07090e" },
      shadow: { on: true, dx: 2, dy: 2, color: "#000000" },
      scanlines: 0,
      background: { mode: "transparent", color: "#000000", color2: "#000000", direction: "v" },
    },
  },
];

export function applyStyle(design: Design, style: Style): Design {
  return {
    ...design,
    font: style.font,
    letterSpacing: style.letterSpacing,
    fill: { stops: [...style.fill.stops], direction: style.fill.direction },
    outline: { ...style.outline },
    shadow: { ...style.shadow },
    scanlines: style.scanlines,
    background: { ...style.background },
  };
}

/** Index of the style preset this design matches, or -1. */
export function matchingStyle(design: Design): number {
  const key = (s: Style) => JSON.stringify([s.font, s.letterSpacing, s.fill, s.outline, s.shadow, s.scanlines, s.background]);
  const current = key(design);
  return STYLE_PRESETS.findIndex((preset) => key(preset.style) === current);
}

/** Next or previous style preset, wrapping around. From -1 the first step lands on 0 or the last. */
export function cycleStyle(index: number, step: 1 | -1): number {
  const n = STYLE_PRESETS.length;
  if (index < 0) return step === 1 ? 0 : n - 1;
  return (index + step + n) % n;
}

/** Small deterministic PRNG (mulberry32), so a random style can be reproduced in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A random style from the retro palette. Text stays readable: fill and background differ in brightness. */
export function randomStyle(seed: number): Style {
  const rnd = mulberry32(seed);
  const pick = () => RETRO_PALETTE[Math.floor(rnd() * RETRO_PALETTE.length)] as string;
  const fonts: FontId[] = ["pixel", "bold", "mini"];
  const bright = RETRO_PALETTE.filter((c) => luminance(c) > 140);
  const dark = RETRO_PALETTE.filter((c) => luminance(c) <= 110);
  const fromList = (list: readonly string[]) => list[Math.floor(rnd() * list.length)] as string;
  const stopCount = rnd() < 0.5 ? 2 : 3;
  const stops = Array.from({ length: stopCount }, () => fromList(bright));
  const mode: BackgroundMode = rnd() < 0.15 ? "transparent" : rnd() < 0.5 ? "gradient" : "color";
  return {
    font: fonts[Math.floor(rnd() * fonts.length)] as FontId,
    letterSpacing: Math.floor(rnd() * 3),
    fill: { stops, direction: rnd() < 0.5 ? "h" : "v" },
    outline: { width: Math.floor(rnd() * 3), color: fromList(dark) },
    shadow: { on: rnd() < 0.6, dx: 1 + Math.floor(rnd() * 2), dy: 1 + Math.floor(rnd() * 2), color: pick() },
    scanlines: Math.floor(rnd() * 5) * 10,
    background: { mode, color: fromList(dark), color2: fromList(dark), direction: rnd() < 0.5 ? "h" : "v" },
  };
}

export function presetSize(id: SizePresetId): { width: number; height: number } | null {
  const preset = SIZE_PRESETS.find((p) => p.id === id);
  return preset ? { width: preset.width, height: preset.height } : null;
}

/** The exact PNG size for a design: the preset size, or the clamped custom size. */
export function exportSize(design: Design): { width: number; height: number } {
  const preset = presetSize(design.size.preset);
  if (preset) return preset;
  return { width: clampInt(design.size.width, MIN_SIZE, MAX_SIZE), height: clampInt(design.size.height, MIN_SIZE, MAX_SIZE) };
}

export function clampInt(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : min;
  return Math.min(max, Math.max(min, n));
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  const n = Number.parseInt(m[1] as string, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** Caps the text: at most MAX_LINES lines and MAX_TEXT characters, CRLF and tabs normalised. */
export function capText(raw: string): string {
  const text = raw.replace(/\r\n?/g, "\n").replace(/\t/g, " ");
  return text.split("\n").slice(0, MAX_LINES).join("\n").slice(0, MAX_TEXT);
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const isAlign = (v: unknown): v is Align => v === "left" || v === "center" || v === "right";
const isDir = (v: unknown): v is Direction => v === "h" || v === "v";
const isMode = (v: unknown): v is BackgroundMode => v === "transparent" || v === "color" || v === "gradient";
const isPreset = (v: unknown): v is SizePresetId => typeof v === "string" && SIZE_PRESET_IDS.includes(v as SizePresetId);

/**
 * Checks untrusted data (localStorage, an imported file) and returns a clean design, or null.
 * Wrong types or unknown values reject the design. Numbers are clamped to their ranges.
 */
export function parseDesign(data: unknown): Design | null {
  if (!isObj(data)) return null;
  const { text, font, scale, letterSpacing, lineSpacing, align, padding, fill, outline, shadow, scanlines, background, size } = data;
  if (typeof text !== "string" || !isFontId(font) || !isAlign(align)) return null;
  if (![scale, letterSpacing, lineSpacing, padding, scanlines].every(isNum)) return null;
  if (!isObj(fill) || !Array.isArray(fill.stops) || fill.stops.length < 2 || fill.stops.length > 3 || !fill.stops.every(isHex)) return null;
  if (!isDir(fill.direction)) return null;
  if (!isObj(outline) || !isNum(outline.width) || !isHex(outline.color)) return null;
  if (!isObj(shadow) || typeof shadow.on !== "boolean" || !isNum(shadow.dx) || !isNum(shadow.dy) || !isHex(shadow.color)) return null;
  if (!isObj(background) || !isMode(background.mode) || !isHex(background.color) || !isHex(background.color2) || !isDir(background.direction)) {
    return null;
  }
  if (!isObj(size) || !isPreset(size.preset) || !isNum(size.width) || !isNum(size.height)) return null;
  return {
    text: capText(text),
    font,
    scale: clampInt(scale, 0, MAX_SCALE),
    letterSpacing: clampInt(letterSpacing, 0, 4),
    lineSpacing: clampInt(lineSpacing, 0, 8),
    align,
    padding: clampInt(padding, 0, 400),
    fill: { stops: [...(fill.stops as string[])], direction: fill.direction },
    outline: { width: clampInt(outline.width, 0, 4), color: outline.color },
    shadow: { on: shadow.on, dx: clampInt(shadow.dx, -6, 6), dy: clampInt(shadow.dy, -6, 6), color: shadow.color },
    scanlines: clampInt(scanlines, 0, 80),
    background: { mode: background.mode, color: background.color, color2: background.color2, direction: background.direction },
    size: { preset: size.preset, width: clampInt(size.width, MIN_SIZE, MAX_SIZE), height: clampInt(size.height, MIN_SIZE, MAX_SIZE) },
  };
}

export function cloneDesign(design: Design): Design {
  return JSON.parse(JSON.stringify(design)) as Design;
}
