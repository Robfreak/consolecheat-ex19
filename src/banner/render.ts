import { exportSize, hexToRgb, MAX_SCALE, type Design } from "./design.ts";
import { effectMargins, gradientColor, gradientT, outlineMask, scanlineBand, scanlineFactor, shiftMask, type RGB } from "./effects.ts";
import { FONTS } from "./fonts.ts";
import { layoutText } from "./layout.ts";

// Renders a design into an RGBA buffer of the exact export size. Pure: no canvas,
// so node:test can check sizes and alpha values. The page copies it onto a canvas.

export type Rendered = {
  width: number;
  height: number;
  data: Uint8ClampedArray<ArrayBuffer>;
  scale: number;
  lines: string[];
  /** True when the text does not fully fit inside the padding at the chosen scale. */
  clipped: boolean;
};

/** Largest whole pixel scale at which art of `artW × artH` font pixels fits in `availW × availH`. */
export function fitScale(artW: number, artH: number, availW: number, availH: number): number {
  if (artW <= 0 || artH <= 0) return 1;
  const s = Math.floor(Math.min(availW / artW, availH / artH));
  return Math.min(MAX_SCALE, Math.max(1, s));
}

export function renderBanner(design: Design): Rendered {
  const { width: W, height: H } = exportSize(design);
  const data = new Uint8ClampedArray(W * H * 4);
  const font = FONTS[design.font];
  const pad = Math.min(design.padding, Math.floor((Math.min(W, H) - 1) / 2));
  const availW = Math.max(1, W - 2 * pad);
  const availH = Math.max(1, H - 2 * pad);
  const ow = design.outline.width;
  const m = effectMargins(ow, design.shadow);
  const extraX = m.left + m.right;
  const extraY = m.top + m.bottom;
  const opts = { letterSpacing: design.letterSpacing, lineSpacing: design.lineSpacing, align: design.align };

  let scale: number;
  let layout;
  if (design.scale > 0) {
    scale = design.scale;
    const maxWidth = Math.max(1, Math.floor(availW / scale) - extraX);
    layout = layoutText(font, design.text, { ...opts, maxWidth });
  } else {
    layout = layoutText(font, design.text, opts);
    scale = layout.width > 0 && layout.height > 0 ? fitScale(layout.width + extraX, layout.height + extraY, availW, availH) : 1;
  }

  // Background.
  const bg = design.background;
  if (bg.mode !== "transparent") {
    const a = hexToRgb(bg.color);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c: RGB = bg.mode === "color" ? a : gradientColor([bg.color, bg.color2], bg.direction === "h" ? gradientT(x, W) : gradientT(y, H));
        const i = (y * W + x) * 4;
        data[i] = c[0];
        data[i + 1] = c[1];
        data[i + 2] = c[2];
        data[i + 3] = 255;
      }
    }
  }

  // Art grid in font pixels: text, outline ring, shadow.
  const artW = layout.width + extraX;
  const artH = layout.height + extraY;
  let clipped = false;
  if (layout.width > 0 && layout.height > 0) {
    const text = new Uint8Array(artW * artH);
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) {
        if (layout.mask[y * layout.width + x]) text[(y + m.top) * artW + x + m.left] = 1;
      }
    }
    const ring = ow > 0 ? outlineMask(text, artW, artH, ow) : new Uint8Array(artW * artH);
    const body = new Uint8Array(artW * artH);
    for (let i = 0; i < body.length; i++) body[i] = text[i] || ring[i] ? 1 : 0;
    const shadow = design.shadow.on ? shiftMask(body, artW, artH, design.shadow.dx, design.shadow.dy) : new Uint8Array(artW * artH);

    const columns: RGB[] = [];
    const rows: RGB[] = [];
    for (let x = 0; x < layout.width; x++) columns.push(gradientColor(design.fill.stops, gradientT(x, layout.width)));
    for (let y = 0; y < layout.height; y++) rows.push(gradientColor(design.fill.stops, gradientT(y, layout.height)));
    const outlineRgb = hexToRgb(design.outline.color);
    const shadowRgb = hexToRgb(design.shadow.color);

    const x0 = design.align === "left" ? pad : design.align === "right" ? W - pad - artW * scale : Math.floor((W - artW * scale) / 2);
    const y0 = pad + Math.floor((availH - artH * scale) / 2);
    clipped = x0 < pad || y0 < pad || x0 + artW * scale > W - pad || y0 + artH * scale > H - pad;

    for (let ay = 0; ay < artH; ay++) {
      for (let ax = 0; ax < artW; ax++) {
        const k = ay * artW + ax;
        let c: RGB | null = null;
        if (text[k]) {
          const tx = ax - m.left;
          const ty = ay - m.top;
          c = design.fill.direction === "h" ? (columns[tx] as RGB) : (rows[ty] as RGB);
        } else if (ring[k]) c = outlineRgb;
        else if (shadow[k]) c = shadowRgb;
        if (!c) continue;
        const px = x0 + ax * scale;
        const py = y0 + ay * scale;
        for (let y = Math.max(0, py); y < Math.min(H, py + scale); y++) {
          for (let x = Math.max(0, px); x < Math.min(W, px + scale); x++) {
            const i = (y * W + x) * 4;
            data[i] = c[0];
            data[i + 1] = c[1];
            data[i + 2] = c[2];
            data[i + 3] = 255;
          }
        }
      }
    }
  }

  // Scanlines darken visible pixels only; transparent pixels stay alpha 0.
  if (design.scanlines > 0) {
    const band = scanlineBand(scale);
    for (let y = 0; y < H; y++) {
      const f = scanlineFactor(y, band, design.scanlines);
      if (f === 1) continue;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (data[i + 3] === 0) continue;
        data[i] = Math.round((data[i] as number) * f);
        data[i + 1] = Math.round((data[i + 1] as number) * f);
        data[i + 2] = Math.round((data[i + 2] as number) * f);
      }
    }
  }

  return { width: W, height: H, data, scale, lines: layout.lines, clipped };
}

/** Download file name for the PNG, e.g. consolecheat-banner-overlay-1920x240.png. */
export function pngFileName(design: Design): string {
  const { width, height } = exportSize(design);
  return `consolecheat-banner-${design.size.preset}-${width}x${height}.png`;
}
