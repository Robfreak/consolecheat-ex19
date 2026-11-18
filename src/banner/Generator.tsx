import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  MAX_LINES,
  MAX_SIZE,
  MAX_TEXT,
  RETRO_PALETTE,
  SIZE_PRESET_IDS,
  STYLE_PRESETS,
  applyStyle,
  capText,
  clampInt,
  DEFAULT_DESIGN,
  cycleStyle,
  exportSize,
  matchingStyle,
  MIN_SIZE,
  presetSize,
  randomStyle,
  type Align,
  type BackgroundMode,
  type Design,
  type Direction,
  type SizePresetId,
} from "./design.ts";
import { FONT_IDS, type FontId } from "./fonts.ts";
import { firstPad, pollPad, type PadAction, type PadMemory } from "./gamepad.ts";
import { canRedo, canUndo, commit, createHistory, redo, seal, undo, type History } from "./history.ts";
import { isTypingTarget, keyAction, shortcutAllowed, type KeyAction } from "./input.ts";
import {
  exportJson,
  loadLibrary,
  mergeImport,
  parseImport,
  removeDesign,
  saveLibrary,
  upsertDesign,
  type SavedDesign,
  type StorageLike,
} from "./library.ts";
import { fill, type Copy, type Lang } from "./messages.ts";
import { pngFileName, renderBanner } from "./render.ts";

const SCALE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32] as const;

function browserStorage(): StorageLike | null {
  try {
    localStorage.getItem("consolecheat-theme");
    return localStorage;
  } catch {
    return null;
  }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Draws the rendered RGBA buffer onto a canvas of exactly the export size. */
function paint(canvas: HTMLCanvasElement, design: Design) {
  const out = renderBanner(design);
  if (canvas.width !== out.width) canvas.width = out.width;
  if (canvas.height !== out.height) canvas.height = out.height;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.putImageData(new ImageData(out.data, out.width, out.height), 0, 0);
  return out;
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <fieldset className="panel rounded-xl px-4 py-4" aria-labelledby={`${id}-legend`}>
      <legend className="sr-only">{title}</legend>
      <h3 id={`${id}-legend`} className="font-display text-lg font-semibold tracking-tight" aria-hidden="true">
        {title}
      </h3>
      <div className="mt-3 grid gap-3">{children}</div>
    </fieldset>
  );
}

function Range({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="range-row">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="range"
      />
      <output htmlFor={id} className="range-value">
        {value}
      </output>
    </div>
  );
}

function Color({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="color-row">
      <input id={id} type="color" list="banner-palette" value={value} onChange={(event) => onChange(event.target.value)} className="swatch" />
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label} <span className="font-mono text-xs text-subtle">{value}</span>
      </label>
    </div>
  );
}

function Seg<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-labelledby={`${name}-label`}>
      <p id={`${name}-label`} className="mb-1 text-sm font-medium text-muted">
        {label}
      </p>
      <div className="seg">
        {options.map((option) => (
          <span key={option.id}>
            <input
              id={`${name}-${option.id}`}
              type="radio"
              name={name}
              className="sr-only"
              checked={value === option.id}
              onChange={() => onChange(option.id)}
            />
            <label htmlFor={`${name}-${option.id}`}>{option.label}</label>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Generator({ text, lang }: { text: Copy; lang: Lang }) {
  const storage = useRef<StorageLike | null>(null);
  const [initial] = useState(() => {
    storage.current = browserStorage();
    return storage.current ? loadLibrary(storage.current) : null;
  });
  const [hist, setHist] = useState<History<Design>>(() => createHistory(initial?.library.current ?? structuredClone(DEFAULT_DESIGN)));
  const [designs, setDesigns] = useState<SavedDesign[]>(() => initial?.library.designs ?? []);
  const [status, setStatus] = useState(initial?.corrupt ? text.libraryCorrupt : "");
  const [name, setName] = useState("");
  const [padOn, setPadOn] = useState(false);
  const [info, setInfo] = useState({ scale: 1, clipped: false });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dirty = useRef(false);
  const lastStyle = useRef(-1);
  const design = hist.present;
  const size = exportSize(design);

  function update(change: (d: Design) => Design, group: string | null = null) {
    dirty.current = true;
    setHist((h) => commit(h, change(h.present), group));
  }

  const endGroup = () => setHist((h) => seal(h));

  // Live preview, one render per animation frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frame = requestAnimationFrame(() => {
      const out = paint(canvas, design);
      setInfo({ scale: out.scale, clipped: out.clipped });
    });
    return () => cancelAnimationFrame(frame);
  }, [design]);

  // Persist the current design and the library once something changed.
  useEffect(() => {
    if (!dirty.current || !storage.current) return;
    const handle = setTimeout(() => {
      if (storage.current && !saveLibrary(storage.current, { current: design, designs })) setStatus(text.saveFailed);
    }, 250);
    return () => clearTimeout(handle);
  }, [design, designs, text]);

  function applyPreset(index: number) {
    const preset = STYLE_PRESETS[index];
    if (!preset) return;
    lastStyle.current = index;
    update((d) => applyStyle(d, preset.style));
    setStatus(fill(text.styleApplied, { name: preset[lang] }));
  }

  function stepStyle(step: 1 | -1) {
    const current = matchingStyle(design);
    applyPreset(cycleStyle(current >= 0 ? current : lastStyle.current, step));
  }

  function rollRandom() {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    update((d) => applyStyle(d, randomStyle(seed)));
    setStatus(text.randomApplied);
  }

  function stepFont(step: 1 | -1) {
    update((d) => {
      const i = FONT_IDS.indexOf(d.font);
      return { ...d, font: FONT_IDS[(i + step + FONT_IDS.length) % FONT_IDS.length] as FontId };
    });
  }

  function exportPng() {
    const canvas = document.createElement("canvas");
    paint(canvas, design);
    const file = pngFileName(design);
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus(text.exportFailed);
        return;
      }
      download(blob, file);
      setStatus(fill(text.exported, { file }));
    }, "image/png");
  }

  function runAction(action: KeyAction | PadAction) {
    if (action === "undo") setHist((h) => undo(h));
    else if (action === "redo") setHist((h) => redo(h));
    else if (action === "prevStyle") stepStyle(-1);
    else if (action === "nextStyle") stepStyle(1);
    else if (action === "prevFont") stepFont(-1);
    else if (action === "nextFont") stepFont(1);
    else if (action === "random") rollRandom();
    else if (action === "export") exportPng();
  }
  const actionRef = useRef(runAction);
  actionRef.current = runAction;

  // Keyboard shortcuts. Text fields and selects keep their keys.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const action = keyAction(event);
      if (!action || !shortcutAllowed(event.target as HTMLElement | null, action)) return;
      event.preventDefault();
      if (action === "undo" || action === "redo") dirty.current = true;
      actionRef.current(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Gamepad: polled every frame. The first poll of a pad only records its buttons.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("getGamepads" in navigator)) return;
    let memory: PadMemory | null = null;
    let frame = 0;
    let connected = false;
    const poll = () => {
      const pad = firstPad(navigator.getGamepads());
      if (Boolean(pad) !== connected) {
        connected = Boolean(pad);
        setPadOn(connected);
      }
      const result = pollPad(pad, memory);
      memory = result.memory;
      const blocked = isTypingTarget(document.activeElement as HTMLElement | null);
      if (!blocked) for (const action of result.actions) actionRef.current(action);
      frame = requestAnimationFrame(poll);
    };
    const forget = () => {
      memory = null;
    };
    window.addEventListener("gamepaddisconnected", forget);
    frame = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("gamepaddisconnected", forget);
    };
  }, []);

  function saveDesign() {
    const clean = name.replace(/\s+/g, " ").trim();
    if (!clean) return;
    const exists = designs.some((item) => item.name.toLocaleLowerCase() === clean.toLocaleLowerCase());
    dirty.current = true;
    setDesigns((list) => upsertDesign(list, clean, design, Date.now()));
    setStatus(fill(exists ? text.overwritten : text.saved, { name: clean }));
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    const result = parseImport(await file.text());
    if (!result.ok) {
      setStatus(text[`import_${result.error}`]);
      return;
    }
    dirty.current = true;
    setDesigns((list) => mergeImport(list, result.designs));
    setStatus(
      result.skipped
        ? fill(text.importedSkipped, { n: result.designs.length, skipped: result.skipped })
        : fill(text.imported, { n: result.designs.length }),
    );
  }

  const sealOnKeyUp = (event: { target: EventTarget }) => {
    if (!isTypingTarget(event.target as HTMLElement)) endGroup();
  };

  const presetLabel = (id: SizePresetId) => {
    const dims = presetSize(id);
    const label = text[`size_${id}`];
    return dims ? `${label} (${dims.width} × ${dims.height})` : label;
  };

  return (
    <div className="generator" onPointerUp={endGroup} onKeyUp={sealOnKeyUp} onBlur={endGroup}>
      <datalist id="banner-palette">
        {RETRO_PALETTE.map((color) => (
          <option key={color} value={color} />
        ))}
      </datalist>

      <div className="preview-col">
        <div className="panel rounded-xl px-4 py-4">
          <h3 className="font-display text-lg font-semibold tracking-tight">{text.previewHeading}</h3>
          <div className="checker mt-3">
            <canvas
              ref={canvasRef}
              data-testid="preview"
              role="img"
              aria-label={fill(text.previewLabel, { w: size.width, h: size.height, text: design.text.trim() || text.previewEmpty })}
              className="preview-canvas"
              width={size.width}
              height={size.height}
            />
          </div>
          <p className="mt-2 text-sm text-subtle">
            {fill(text.previewNote, { w: size.width, h: size.height })} {fill(text.scaleInfo, { s: info.scale })}
          </p>
          {info.clipped ? <p className="mt-1 text-sm text-warn">{text.clipped}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" data-testid="export-png" onClick={exportPng}>
              {text.exportPng}
            </button>
            <button type="button" className="btn btn-ghost" data-testid="undo" disabled={!canUndo(hist)} onClick={() => setHist((h) => undo(h))}>
              {text.undo}
            </button>
            <button type="button" className="btn btn-ghost" data-testid="redo" disabled={!canRedo(hist)} onClick={() => setHist((h) => redo(h))}>
              {text.redo}
            </button>
          </div>
          <p className="mt-3 min-h-5 text-sm text-fg" role="status" aria-live="polite" data-testid="status">
            {status}
          </p>
          <p className="mt-1 text-xs text-subtle">{padOn ? text.padConnected : text.padNone}</p>
        </div>

        <div className="panel mt-4 rounded-xl px-4 py-4">
          <h3 className="font-display text-lg font-semibold tracking-tight">{text.stylesHeading}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {STYLE_PRESETS.map((preset, index) => (
              <button
                key={preset.id}
                type="button"
                className="btn btn-ghost btn-sm"
                aria-pressed={matchingStyle(design) === index}
                onClick={() => applyPreset(index)}
              >
                {preset[lang]}
              </button>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" data-testid="random" onClick={rollRandom}>
              🎲 {text.randomStyle}
            </button>
          </div>
        </div>

        <div className="panel mt-4 rounded-xl px-4 py-4">
          <h3 className="font-display text-lg font-semibold tracking-tight">{text.libraryHeading}</h3>
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              saveDesign();
            }}
          >
            <div className="min-w-0 flex-1">
              <label htmlFor="banner-name" className="text-sm font-medium text-muted">
                {text.nameLabel}
              </label>
              <input
                id="banner-name"
                type="text"
                className="field mt-1"
                maxLength={40}
                value={name}
                placeholder={text.namePlaceholder}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              {text.save}
            </button>
          </form>
          {designs.length === 0 ? (
            <p className="mt-3 text-sm text-subtle">{text.noDesigns}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2" data-testid="designs">
              {designs.map((item) => (
                <li key={item.name} className="design-item">
                  <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label={fill(text.loadLabel, { name: item.name })}
                    onClick={() => {
                      update(() => structuredClone(item.design));
                      setName(item.name);
                      setStatus(fill(text.loaded, { name: item.name }));
                    }}
                  >
                    {text.load}
                  </button>
                  <button
                    type="button"
                    className="btn btn-bad btn-sm"
                    aria-label={fill(text.removeLabel, { name: item.name })}
                    onClick={() => {
                      dirty.current = true;
                      setDesigns((list) => removeDesign(list, item.name));
                      setStatus(fill(text.removed, { name: item.name }));
                    }}
                  >
                    {text.remove}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={designs.length === 0}
              onClick={() => download(new Blob([exportJson(designs)], { type: "application/json" }), "consolecheat-banner-designs.json")}
            >
              {text.exportJson}
            </button>
            <input
              id="banner-import"
              type="file"
              accept="application/json,.json"
              className="sr-only file-input"
              data-testid="import"
              onChange={(event) => {
                void importFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <label className="btn btn-ghost btn-sm" htmlFor="banner-import">
              {text.importJson}
            </label>
          </div>
        </div>
      </div>

      <div className="controls-col">
        <Section id="text" title={text.textHeading}>
          <div>
            <label htmlFor="banner-text" className="text-sm font-medium text-muted">
              {text.textLabel}
            </label>
            <textarea
              id="banner-text"
              data-testid="text"
              className="field textarea mt-1 font-mono"
              rows={3}
              maxLength={MAX_TEXT}
              value={design.text}
              aria-describedby="banner-text-hint"
              onChange={(event) => update((d) => ({ ...d, text: capText(event.target.value) }), "text")}
            />
            <p id="banner-text-hint" className="mt-1 text-xs text-subtle">
              {fill(text.textHint, { lines: MAX_LINES, max: MAX_TEXT })} {fill(text.textCount, { n: design.text.length, max: MAX_TEXT })}
            </p>
          </div>
        </Section>

        <Section id="size" title={text.sizeHeading}>
          <div>
            <label htmlFor="banner-size" className="text-sm font-medium text-muted">
              {text.sizeLabel}
            </label>
            <select
              id="banner-size"
              data-testid="size"
              className="field mt-1"
              value={design.size.preset}
              onChange={(event) => {
                const preset = event.target.value as SizePresetId;
                const dims = presetSize(preset);
                update((d) => ({ ...d, size: { preset, width: dims?.width ?? d.size.width, height: dims?.height ?? d.size.height } }));
              }}
            >
              {SIZE_PRESET_IDS.map((id) => (
                <option key={id} value={id}>
                  {presetLabel(id)}
                </option>
              ))}
            </select>
          </div>
          {design.size.preset === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              {(["width", "height"] as const).map((dim) => (
                <div key={dim}>
                  <label htmlFor={`banner-${dim}`} className="text-sm font-medium text-muted">
                    {dim === "width" ? text.widthLabel : text.heightLabel}
                  </label>
                  <input
                    id={`banner-${dim}`}
                    type="number"
                    inputMode="numeric"
                    min={MIN_SIZE}
                    max={MAX_SIZE}
                    className="field mt-1"
                    value={design.size[dim]}
                    onChange={(event) => {
                      const n = Math.round(Number(event.target.value));
                      if (!Number.isFinite(n) || n < 1) return;
                      update((d) => ({ ...d, size: { ...d.size, [dim]: Math.min(MAX_SIZE, n) } }), dim);
                    }}
                    onBlur={() => update((d) => ({ ...d, size: { ...d.size, [dim]: clampInt(d.size[dim], MIN_SIZE, MAX_SIZE) } }), dim)}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </Section>

        <Section id="font" title={text.fontHeading}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="banner-font" className="text-sm font-medium text-muted">
                {text.fontLabel}
              </label>
              <select
                id="banner-font"
                data-testid="font"
                className="field mt-1"
                value={design.font}
                onChange={(event) => update((d) => ({ ...d, font: event.target.value as FontId }))}
              >
                {FONT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {text[`font_${id}`]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="banner-scale" className="text-sm font-medium text-muted">
                {text.scaleLabel}
              </label>
              <select
                id="banner-scale"
                className="field mt-1"
                value={design.scale}
                onChange={(event) => update((d) => ({ ...d, scale: Number(event.target.value) }))}
              >
                {SCALE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === 0 ? text.scaleAuto : `${s}×`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Range id="banner-ls" label={text.letterSpacingLabel} value={design.letterSpacing} min={0} max={4} onChange={(v) => update((d) => ({ ...d, letterSpacing: v }), "ls")} />
          <Range id="banner-lh" label={text.lineSpacingLabel} value={design.lineSpacing} min={0} max={8} onChange={(v) => update((d) => ({ ...d, lineSpacing: v }), "lh")} />
          <Range id="banner-pad" label={text.paddingLabel} value={design.padding} min={0} max={400} step={4} onChange={(v) => update((d) => ({ ...d, padding: v }), "pad")} />
          <Seg<Align>
            name="banner-align"
            label={text.alignLabel}
            value={design.align}
            options={(["left", "center", "right"] as const).map((id) => ({ id, label: text[`align_${id}`] }))}
            onChange={(align) => update((d) => ({ ...d, align }))}
          />
        </Section>

        <Section id="fill" title={text.fillHeading}>
          <Seg<"2" | "3">
            name="banner-stops"
            label={text.stopsLabel}
            value={design.fill.stops.length === 3 ? "3" : "2"}
            options={[
              { id: "2", label: "2" },
              { id: "3", label: "3" },
            ]}
            onChange={(n) =>
              update((d) => {
                const stops = n === "2" ? [d.fill.stops[0] as string, d.fill.stops[d.fill.stops.length - 1] as string] : [d.fill.stops[0] as string, d.fill.stops[0] as string, d.fill.stops[1] as string];
                if (n === "3" && d.fill.stops.length === 2) stops[1] = RETRO_PALETTE[14];
                return { ...d, fill: { ...d.fill, stops } };
              })
            }
          />
          {design.fill.stops.map((stop, index) => (
            <Color
              key={index}
              id={`banner-stop-${index}`}
              label={fill(text.stopLabel, { n: index + 1 })}
              value={stop}
              onChange={(color) =>
                update((d) => ({ ...d, fill: { ...d.fill, stops: d.fill.stops.map((s, i) => (i === index ? color : s)) } }), `stop${index}`)
              }
            />
          ))}
          <Seg<Direction>
            name="banner-dir"
            label={text.directionLabel}
            value={design.fill.direction}
            options={(["h", "v"] as const).map((id) => ({ id, label: text[`dir_${id}`] }))}
            onChange={(direction) => update((d) => ({ ...d, fill: { ...d.fill, direction } }))}
          />
          <p className="text-xs text-subtle">{text.paletteNote}</p>
        </Section>

        <Section id="outline" title={text.outlineHeading}>
          <Range id="banner-ow" label={text.outlineWidthLabel} value={design.outline.width} min={0} max={4} onChange={(v) => update((d) => ({ ...d, outline: { ...d.outline, width: v } }), "ow")} />
          <Color id="banner-oc" label={text.outlineColorLabel} value={design.outline.color} onChange={(color) => update((d) => ({ ...d, outline: { ...d.outline, color } }), "oc")} />
        </Section>

        <Section id="shadow" title={text.shadowHeading}>
          <div className="flex items-center gap-2">
            <input
              id="banner-shadow"
              type="checkbox"
              className="size-5"
              checked={design.shadow.on}
              onChange={(event) => update((d) => ({ ...d, shadow: { ...d.shadow, on: event.target.checked } }))}
            />
            <label htmlFor="banner-shadow" className="text-sm font-medium">
              {text.shadowOn}
            </label>
          </div>
          <Range id="banner-sx" label={text.shadowDxLabel} value={design.shadow.dx} min={-6} max={6} onChange={(v) => update((d) => ({ ...d, shadow: { ...d.shadow, dx: v } }), "sx")} />
          <Range id="banner-sy" label={text.shadowDyLabel} value={design.shadow.dy} min={-6} max={6} onChange={(v) => update((d) => ({ ...d, shadow: { ...d.shadow, dy: v } }), "sy")} />
          <Color id="banner-sc" label={text.shadowColorLabel} value={design.shadow.color} onChange={(color) => update((d) => ({ ...d, shadow: { ...d.shadow, color } }), "sc")} />
        </Section>

        <Section id="scan" title={text.scanlinesHeading}>
          <Range id="banner-scan" label={text.scanlinesLabel} value={design.scanlines} min={0} max={80} step={5} onChange={(v) => update((d) => ({ ...d, scanlines: v }), "scan")} />
        </Section>

        <Section id="bg" title={text.backgroundHeading}>
          <Seg<BackgroundMode>
            name="banner-bg"
            label={text.backgroundHeading}
            value={design.background.mode}
            options={(["transparent", "color", "gradient"] as const).map((id) => ({ id, label: text[`bg_${id}`] }))}
            onChange={(mode) => update((d) => ({ ...d, background: { ...d.background, mode } }))}
          />
          {design.background.mode !== "transparent" ? (
            <Color id="banner-bg1" label={text.bgColorLabel} value={design.background.color} onChange={(color) => update((d) => ({ ...d, background: { ...d.background, color } }), "bg1")} />
          ) : null}
          {design.background.mode === "gradient" ? (
            <>
              <Color id="banner-bg2" label={text.bgColor2Label} value={design.background.color2} onChange={(color2) => update((d) => ({ ...d, background: { ...d.background, color2 } }), "bg2")} />
              <Seg<Direction>
                name="banner-bgdir"
                label={text.directionLabel}
                value={design.background.direction}
                options={(["h", "v"] as const).map((id) => ({ id, label: text[`dir_${id}`] }))}
                onChange={(direction) => update((d) => ({ ...d, background: { ...d.background, direction } }))}
              />
            </>
          ) : null}
        </Section>
      </div>
    </div>
  );
}
