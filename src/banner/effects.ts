import { hexToRgb } from "./design.ts";

// Colour and mask math for the effects. All pure functions on plain arrays.

export type RGB = [number, number, number];

export function lerpColor(a: RGB, b: RGB, t: number): RGB {
  const k = Math.min(1, Math.max(0, t));
  return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];
}

/** Colour at position t (0..1) across 2 or 3 evenly spaced stops. */
export function gradientColor(stops: readonly string[], t: number): RGB {
  const rgb = stops.map(hexToRgb);
  if (rgb.length === 0) return [0, 0, 0];
  if (rgb.length === 1) return rgb[0] as RGB;
  const k = Math.min(1, Math.max(0, t)) * (rgb.length - 1);
  const i = Math.min(rgb.length - 2, Math.floor(k));
  return lerpColor(rgb[i] as RGB, rgb[i + 1] as RGB, k - i);
}

/** Position of cell `i` of `n` along a gradient: 0 for the first, 1 for the last. */
export function gradientT(i: number, n: number): number {
  return n <= 1 ? 0 : i / (n - 1);
}

/** Square dilation by r cells (Chebyshev distance), so outlines get pixel-art corners. */
export function dilate(mask: Uint8Array, width: number, height: number, r: number): Uint8Array {
  if (r <= 0) return mask.slice();
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      for (let yy = Math.max(0, y - r); yy <= Math.min(height - 1, y + r); yy++) {
        for (let xx = Math.max(0, x - r); xx <= Math.min(width - 1, x + r); xx++) out[yy * width + xx] = 1;
      }
    }
  }
  return out;
}

/** Outline ring: cells within r of the text that are not text themselves. */
export function outlineMask(mask: Uint8Array, width: number, height: number, r: number): Uint8Array {
  const grown = dilate(mask, width, height, r);
  for (let i = 0; i < grown.length; i++) if (mask[i]) grown[i] = 0;
  return grown;
}

/** The mask moved by (dx, dy); cells that move outside are dropped. */
export function shiftMask(mask: Uint8Array, width: number, height: number, dx: number, dy: number): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const ty = y + dy;
    if (ty < 0 || ty >= height) continue;
    for (let x = 0; x < width; x++) {
      const tx = x + dx;
      if (tx < 0 || tx >= width || !mask[y * width + x]) continue;
      out[ty * width + tx] = 1;
    }
  }
  return out;
}

/** Extra room around the text for outline and shadow, in font pixels. */
export function effectMargins(outline: number, shadow: { on: boolean; dx: number; dy: number }) {
  const sx = shadow.on ? shadow.dx : 0;
  const sy = shadow.on ? shadow.dy : 0;
  return {
    left: outline + Math.max(0, -sx),
    right: outline + Math.max(0, sx),
    top: outline + Math.max(0, -sy),
    bottom: outline + Math.max(0, sy),
  };
}

/** Scanline band height for a pixel scale: half a font pixel, at least one output pixel. */
export function scanlineBand(scale: number): number {
  return Math.max(1, Math.floor(scale / 2));
}

/** Brightness factor for output row y: every second band is darkened by `intensity` percent. */
export function scanlineFactor(y: number, band: number, intensity: number): number {
  if (intensity <= 0) return 1;
  return Math.floor(y / band) % 2 === 1 ? 1 - Math.min(100, intensity) / 100 : 1;
}
