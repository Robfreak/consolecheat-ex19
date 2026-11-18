import { glyphFor, type PixelFont } from "./fonts.ts";
import type { Align } from "./design.ts";

// Text layout in font pixels. Pure, so the width/height/wrap math is testable.

export type LayoutOptions = { letterSpacing: number; lineSpacing: number; align: Align; maxWidth?: number };
export type Layout = { width: number; height: number; lines: string[]; lineWidths: number[]; mask: Uint8Array };

/** Width of one line: glyph widths plus the letter spacing between them. Empty line: 0. */
export function lineWidth(font: PixelFont, line: string, letterSpacing: number): number {
  const chars = [...line];
  if (chars.length === 0) return 0;
  let width = 0;
  for (const ch of chars) width += ch === " " ? font.space : glyphFor(font, ch).width;
  return width + letterSpacing * (chars.length - 1);
}

/** Height of a block of lines: line height times lines plus the spacing between them. */
export function blockHeight(font: PixelFont, lines: number, lineSpacing: number): number {
  if (lines <= 0) return 0;
  return lines * font.height + (lines - 1) * lineSpacing;
}

/**
 * Greedy word wrap to `maxWidth` font pixels. Manual line breaks always stay.
 * A word that is wider than the limit on its own is broken between characters.
 */
export function wrapText(font: PixelFont, text: string, letterSpacing: number, maxWidth?: number): string[] {
  const manual = text.split("\n");
  if (!maxWidth || maxWidth <= 0) return manual;
  const out: string[] = [];
  const fits = (s: string) => lineWidth(font, s, letterSpacing) <= maxWidth;
  for (const raw of manual) {
    const words = raw.split(" ");
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (fits(candidate)) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);
      line = "";
      let rest = word;
      while (rest && !fits(rest)) {
        let cut = 1;
        const chars = [...rest];
        while (cut < chars.length && fits(chars.slice(0, cut + 1).join(""))) cut++;
        out.push(chars.slice(0, cut).join(""));
        rest = chars.slice(cut).join("");
      }
      line = rest;
    }
    out.push(line);
  }
  return out;
}

/** Lays out the text and rasterises it into a 0/1 mask, `width × height` font pixels. */
export function layoutText(font: PixelFont, text: string, options: LayoutOptions): Layout {
  const lines = wrapText(font, text, options.letterSpacing, options.maxWidth);
  const lineWidths = lines.map((line) => lineWidth(font, line, options.letterSpacing));
  const width = Math.max(0, ...lineWidths);
  const height = blockHeight(font, lines.length, options.lineSpacing);
  const mask = new Uint8Array(width * height);
  lines.forEach((line, row) => {
    const lw = lineWidths[row] as number;
    let x = options.align === "center" ? Math.floor((width - lw) / 2) : options.align === "right" ? width - lw : 0;
    const y0 = row * (font.height + options.lineSpacing);
    for (const ch of line) {
      if (ch === " ") {
        x += font.space + options.letterSpacing;
        continue;
      }
      const glyph = glyphFor(font, ch);
      glyph.rows.forEach((bits, gy) => {
        for (let gx = 0; gx < glyph.width; gx++) if (bits[gx] === "#") mask[(y0 + gy) * width + x + gx] = 1;
      });
      x += glyph.width + options.letterSpacing;
    }
  });
  return { width, height, lines, lineWidths, mask };
}
