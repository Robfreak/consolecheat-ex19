// Own bitmap fonts, defined in code. No font file and no third-party request.
// Each glyph is a list of rows, "#" = pixel on, "." = off. Glyphs may be narrower
// than the cell (proportional punctuation). Lowercase letters are drawn with the
// uppercase glyph (ä → Ä), ß has its own glyph.

export type Glyph = { width: number; rows: readonly string[] };
export type PixelFont = {
  id: FontId;
  height: number;
  /** Width of a space, in font pixels. */
  space: number;
  glyphs: Readonly<Record<string, Glyph>>;
};

export const FONT_IDS = ["pixel", "bold", "mini"] as const;
export type FontId = (typeof FONT_IDS)[number];

/** Characters every font must cover. */
export const REQUIRED_CHARS = [
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ..."0123456789",
  ..."ÄÖÜß",
  ..." .,!?:;-+=_'\"()/&#*%<>@",
];

function g(rows: string): Glyph {
  const list = rows.trim().split(/\s+/);
  return { width: list[0]?.length ?? 0, rows: list };
}

const pixel57: Record<string, string> = {
  A: ".###. #...# #...# ##### #...# #...# #...#",
  B: "####. #...# #...# ####. #...# #...# ####.",
  C: ".###. #...# #.... #.... #.... #...# .###.",
  D: "###.. #..#. #...# #...# #...# #..#. ###..",
  E: "##### #.... #.... ####. #.... #.... #####",
  F: "##### #.... #.... ####. #.... #.... #....",
  G: ".###. #...# #.... #.### #...# #...# .####",
  H: "#...# #...# #...# ##### #...# #...# #...#",
  I: ".###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.",
  J: "..### ...#. ...#. ...#. ...#. #..#. .##..",
  K: "#...# #..#. #.#.. ##... #.#.. #..#. #...#",
  L: "#.... #.... #.... #.... #.... #.... #####",
  M: "#...# ##.## #.#.# #.#.# #...# #...# #...#",
  N: "#...# #...# ##..# #.#.# #..## #...# #...#",
  O: ".###. #...# #...# #...# #...# #...# .###.",
  P: "####. #...# #...# ####. #.... #.... #....",
  Q: ".###. #...# #...# #...# #.#.# #..#. .##.#",
  R: "####. #...# #...# ####. #.#.. #..#. #...#",
  S: ".#### #.... #.... .###. ....# ....# ####.",
  T: "##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..",
  U: "#...# #...# #...# #...# #...# #...# .###.",
  V: "#...# #...# #...# #...# #...# .#.#. ..#..",
  W: "#...# #...# #...# #.#.# #.#.# #.#.# .#.#.",
  X: "#...# #...# .#.#. ..#.. .#.#. #...# #...#",
  Y: "#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..",
  Z: "##### ....# ...#. ..#.. .#... #.... #####",
  "0": ".###. #...# #..## #.#.# ##..# #...# .###.",
  "1": "..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.",
  "2": ".###. #...# ....# ...#. ..#.. .#... #####",
  "3": "##### ...#. ..#.. ...#. ....# #...# .###.",
  "4": "...#. ..##. .#.#. #..#. ##### ...#. ...#.",
  "5": "##### #.... ####. ....# ....# #...# .###.",
  "6": "..##. .#... #.... ####. #...# #...# .###.",
  "7": "##### ....# ...#. ..#.. .#... .#... .#...",
  "8": ".###. #...# #...# .###. #...# #...# .###.",
  "9": ".###. #...# #...# .#### ....# ...#. .##..",
  Ä: "#...# ..... .###. #...# ##### #...# #...#",
  Ö: "#...# ..... .###. #...# #...# #...# .###.",
  Ü: "#...# ..... #...# #...# #...# #...# .###.",
  ß: ".##.. #..#. #..#. #.#.. #..#. #...# #.##.",
  " ": "... ... ... ... ... ... ...",
  ".": ". . . . . . #",
  ",": ".. .. .. .. .. .# #.",
  "!": "# # # # # . #",
  "?": ".###. #...# ....# ...#. ..#.. ..... ..#..",
  ":": ". # . . . # .",
  ";": ".. .# .. .. .. .# #.",
  "-": ".... .... .... #### .... .... ....",
  "+": "..... ..#.. ..#.. ##### ..#.. ..#.. .....",
  "=": ".... .... #### .... #### .... ....",
  _: "..... ..... ..... ..... ..... ..... #####",
  "'": "# # . . . . .",
  '"': "#.# #.# ... ... ... ... ...",
  "(": "..# .#. #.. #.. #.. .#. ..#",
  ")": "#.. .#. ..# ..# ..# .#. #..",
  "/": "....# ....# ...#. ..#.. .#... #.... #....",
  "&": ".##.. #..#. #.#.. .#... #.#.# #..#. .##.#",
  "#": ".#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.",
  "*": "..... #.#.# .###. ##### .###. #.#.# .....",
  "%": "##... ##..# ...#. ..#.. .#... #..## ...##",
  "<": "...# ..#. .#.. #... .#.. ..#. ...#",
  ">": "#... .#.. ..#. ...# ..#. .#.. #...",
  "@": ".###. #...# #.### #.#.# #.### #.... .###.",
};

const mini35: Record<string, string> = {
  A: ".#. #.# ### #.# #.#",
  B: "##. #.# ##. #.# ##.",
  C: ".## #.. #.. #.. .##",
  D: "##. #.# #.# #.# ##.",
  E: "### #.. ##. #.. ###",
  F: "### #.. ##. #.. #..",
  G: ".## #.. #.# #.# .##",
  H: "#.# #.# ### #.# #.#",
  I: "### .#. .#. .#. ###",
  J: "..# ..# ..# #.# .#.",
  K: "#.# #.# ##. #.# #.#",
  L: "#.. #.. #.. #.. ###",
  M: "#.# ### ### #.# #.#",
  N: "##. #.# #.# #.# #.#",
  O: ".#. #.# #.# #.# .#.",
  P: "##. #.# ##. #.. #..",
  Q: ".#. #.# #.# ##. .##",
  R: "##. #.# ##. #.# #.#",
  S: ".## #.. .#. ..# ##.",
  T: "### .#. .#. .#. .#.",
  U: "#.# #.# #.# #.# ###",
  V: "#.# #.# #.# #.# .#.",
  W: "#.# #.# ### ### #.#",
  X: "#.# #.# .#. #.# #.#",
  Y: "#.# #.# .#. .#. .#.",
  Z: "### ..# .#. #.. ###",
  "0": "### #.# #.# #.# ###",
  "1": ".#. ##. .#. .#. ###",
  "2": "##. ..# .#. #.. ###",
  "3": "##. ..# .#. ..# ##.",
  "4": "#.# #.# ### ..# ..#",
  "5": "### #.. ##. ..# ##.",
  "6": ".## #.. ### #.# ###",
  "7": "### ..# .#. .#. .#.",
  "8": "### #.# ### #.# ###",
  "9": "### #.# ### ..# ##.",
  Ä: "#.# .#. #.# ### #.#",
  Ö: "#.# ... ### #.# ###",
  Ü: "#.# ... #.# #.# ###",
  ß: ".#. #.# ##. #.# ##.",
  " ": ".. .. .. .. ..",
  ".": ". . . . #",
  ",": ".. .. .. .# #.",
  "!": "# # # . #",
  "?": "##. ..# .#. ... .#.",
  ":": ". # . # .",
  ";": ".. .# .. .# #.",
  "-": "... ... ### ... ...",
  "+": "... .#. ### .#. ...",
  "=": "... ### ... ### ...",
  _: "... ... ... ... ###",
  "'": "# # . . .",
  '"': "#.# #.# ... ... ...",
  "(": ".# #. #. #. .#",
  ")": "#. .# .# .# #.",
  "/": "..# ..# .#. #.. #..",
  "&": ".#. #.# .#. #.# .##",
  "#": "#.# ### #.# ### #.#",
  "*": "#.# .#. #.# ... ...",
  "%": "#.# ..# .#. #.. #.#",
  "<": "..# .#. #.. .#. ..#",
  ">": "#.. .#. ..# .#. #..",
  "@": "### #.# #.# #.. ###",
};

function build(id: FontId, height: number, table: Record<string, string>): PixelFont {
  const glyphs: Record<string, Glyph> = {};
  for (const [ch, rows] of Object.entries(table)) glyphs[ch] = g(rows);
  return { id, height, space: glyphs[" "]?.width ?? 3, glyphs };
}

/** Bold variant: every pixel is doubled one to the right, so strokes are two pixels wide. */
export function emboldenGlyph(glyph: Glyph): Glyph {
  if (glyph.rows.every((row) => !row.includes("#"))) return glyph;
  const width = glyph.width + 1;
  const rows = glyph.rows.map((row) => {
    let out = "";
    for (let x = 0; x < width; x++) out += row[x] === "#" || row[x - 1] === "#" ? "#" : ".";
    return out;
  });
  return { width, rows };
}

const pixelFont = build("pixel", 7, pixel57);
const miniFont = build("mini", 5, mini35);
const boldFont: PixelFont = {
  id: "bold",
  height: 7,
  space: 4,
  glyphs: Object.fromEntries(Object.entries(pixelFont.glyphs).map(([ch, glyph]) => [ch, emboldenGlyph(glyph)])),
};

export const FONTS: Readonly<Record<FontId, PixelFont>> = { pixel: pixelFont, bold: boldFont, mini: miniFont };

export function isFontId(value: unknown): value is FontId {
  return typeof value === "string" && (FONT_IDS as readonly string[]).includes(value);
}

/** The glyph for one character. Lowercase uses the uppercase glyph; anything unknown shows "?". */
export function glyphFor(font: PixelFont, ch: string): Glyph {
  const direct = font.glyphs[ch];
  if (direct) return direct;
  const upper = ch.toLocaleUpperCase("de-DE");
  if (upper.length === 1 && font.glyphs[upper]) return font.glyphs[upper];
  return font.glyphs["?"] as Glyph;
}

export function hasGlyph(font: PixelFont, ch: string): boolean {
  if (font.glyphs[ch]) return true;
  const upper = ch.toLocaleUpperCase("de-DE");
  return upper.length === 1 && Boolean(font.glyphs[upper]);
}
