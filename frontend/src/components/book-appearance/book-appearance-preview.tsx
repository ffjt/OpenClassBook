import { BookOpen, Maximize2, Minus, Plus, Ruler } from "lucide-react";
import { Rnd } from "react-rnd";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getTemplateAssetUrl } from "@/mock/template-catalog";
import { getFontFamilyStyle, getSpineWidthMm, type CanvasObject, type Template } from "@/types/template";

export type AppearanceView = "spread" | "front" | "spine" | "back";
export interface AppearanceBookData { title: string; subtitle?: string | null; author: string; school?: string | null; className?: string | null; teacher?: string | null; editor?: string | null; publisher?: string | null; summary?: string | null; copyright?: string | null; year: string; edition?: string | null; estimatedPageCount: number; }
export interface AppearanceGuides { safe: boolean; hero: boolean; bleed: boolean; trim: boolean; }
export interface CanvasGuides { vertical?: number; horizontal?: number; }

const pageDimensionsMm = { a4: { width: 210, height: 297 }, a5: { width: 148, height: 210 }, b5: { width: 176, height: 250 } } as const;
function getCoverDimensionsMm(template: Template) { return template.pageSize === "custom" ? { height: template.customPageHeight, width: template.customPageWidth } : pageDimensionsMm[template.pageSize]; }
function objectText(object: CanvasObject, data: AppearanceBookData) {
  const values = { title: data.title, subtitle: data.subtitle ?? "", author: data.author, school: [data.school, data.className, data.teacher].filter(Boolean).join(" · "), publisher: [data.publisher, data.edition].filter(Boolean).join(" · "), year: data.year, logo: "OpenClassBook", summary: data.summary ?? "", copyright: data.copyright ?? "", custom: object.content ?? "" };
  return values[object.source ?? "custom"];
}

function CanvasCover({ backgroundImage, data, editable = false, objects, onObjectsChange, onSelectionChange, selectedId, template, verticalText = false }: { backgroundImage?: string; data: AppearanceBookData; editable?: boolean; objects: CanvasObject[]; onObjectsChange?: (objects: CanvasObject[], checkpoint: boolean) => void; onSelectionChange?: (id: string | null) => void; selectedId?: string | null; template: Template; verticalText?: boolean }) {
  const canvasRef = useRef<HTMLElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  const [guides, setGuides] = useState<CanvasGuides>({});
  useEffect(() => { const update = () => { const rect = canvasRef.current?.getBoundingClientRect(); if (rect) setCanvasSize({ width: rect.width, height: rect.height }); }; update(); const observer = new ResizeObserver(update); if (canvasRef.current) observer.observe(canvasRef.current); return () => observer.disconnect(); }, []);
  const update = (id: string, changes: Partial<CanvasObject>, checkpoint: boolean) => onObjectsChange?.(objects.map((object) => object.id === id ? { ...object, ...changes } : object), checkpoint);
  const snap = (id: string, x: number, y: number, width: number, height: number) => {
    const threshold = 1.25; let nextX = x; let nextY = y; const nextGuides: CanvasGuides = {};
    const targetsX = [13, 50 - width / 2, 87 - width, ...objects.filter((item) => item.id !== id).flatMap((item) => [item.x, item.x + item.width, item.x + item.width / 2 - width / 2])];
    const targetsY = [25, 50 - height / 2, 83 - height, ...objects.filter((item) => item.id !== id).flatMap((item) => [item.y, item.y + item.height, item.y + item.height / 2 - height / 2])];
    const snappedX = targetsX.find((target) => Math.abs(target - x) < threshold); const snappedY = targetsY.find((target) => Math.abs(target - y) < threshold);
    if (snappedX !== undefined) { nextX = snappedX; nextGuides.vertical = nextX + width / 2; }
    if (snappedY !== undefined) { nextY = snappedY; nextGuides.horizontal = nextY + height / 2; }
    if (Math.abs(nextX + width / 2 - 50) < threshold) { nextX = 50 - width / 2; nextGuides.vertical = 50; }
    if (Math.abs(nextY + height / 2 - 50) < threshold) { nextY = 50 - height / 2; nextGuides.horizontal = 50; }
    setGuides(nextGuides); return { x: Math.max(0, Math.min(100 - width, nextX)), y: Math.max(0, Math.min(100 - height, nextY)) };
  };
  return <article aria-label="Publishing canvas" className="relative h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-cover bg-center" onMouseDown={(event) => { if (event.currentTarget === event.target) onSelectionChange?.(null); }} ref={canvasRef} style={{ backgroundColor: template.backgroundColor, backgroundImage }}>
    {objects.map((object) => {
      if (object.hidden) return null; const selected = selectedId === object.id; const text = objectText(object, data); if (!text && object.type !== "line") return null;
      // A physical spine is millimetres wide. Give its edit preview a stable
      // inset text frame so a saved percentage box can never collapse to a
      // fraction of one CJK character in the full-spread view.
      const x = verticalText ? canvasSize.width * 0.1 : canvasSize.width * object.x / 100;
      const y = verticalText ? canvasSize.height * 0.08 : canvasSize.height * object.y / 100;
      const width = verticalText ? canvasSize.width * 0.8 : canvasSize.width * object.width / 100;
      const height = verticalText ? canvasSize.height * 0.84 : canvasSize.height * object.height / 100;
      const body = object.type === "line" ? <div className="h-full w-full" style={{ backgroundColor: object.color ?? template.accentColor, opacity: (object.opacity ?? 100) / 100, transform: `rotate(${object.rotation}deg)` }} /> : <div className={verticalText ? "flex h-full w-full items-center justify-center whitespace-nowrap" : "h-full w-full overflow-hidden break-words"} style={{ transform: verticalText ? undefined : `rotate(${object.rotation}deg)`, writingMode: verticalText ? "vertical-rl" : undefined, overflow: verticalText ? "visible" : undefined, color: object.color ?? template.appearance.frontCover.palette.text, fontFamily: getFontFamilyStyle(object.fontFamily ?? template.titleFont), fontSize: `${Math.max(verticalText ? 14 : 8, (object.fontSize ?? 6) * 3)}px`, fontWeight: object.fontWeight, lineHeight: object.lineHeight, letterSpacing: `${object.letterSpacing ?? 0}px`, opacity: (object.opacity ?? 100) / 100, textAlign: object.align, textShadow: object.shadow ? "1px 1px 3px rgb(0 0 0 / .35)" : undefined, WebkitTextStroke: object.stroke ? "0.5px currentColor" : undefined, textTransform: object.uppercase ? "uppercase" : undefined }}>{text}</div>;
      if (!editable || object.locked) return <div className="absolute z-10" key={object.id} style={{ left: x, top: y, width, height }}>{body}</div>;
      return <Rnd bounds="parent" className={selected ? "z-20" : "z-10"} disableDragging={false} enableResizing={{ top: true, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true }} key={object.id} onClick={() => onSelectionChange?.(object.id)} onDrag={(_, position) => { snap(object.id, position.x / canvasSize.width * 100, position.y / canvasSize.height * 100, object.width, object.height); }} onDragStop={(_, position) => { const next = snap(object.id, position.x / canvasSize.width * 100, position.y / canvasSize.height * 100, object.width, object.height); update(object.id, next, true); setGuides({}); }} onMouseDown={() => onSelectionChange?.(object.id)} onResizeStop={(_, __, ref, ___, position) => { const nextWidth = ref.offsetWidth / canvasSize.width * 100; const nextHeight = ref.offsetHeight / canvasSize.height * 100; update(object.id, { x: position.x / canvasSize.width * 100, y: position.y / canvasSize.height * 100, width: nextWidth, height: nextHeight }, true); }} position={{ x, y }} size={{ width, height }} style={{ outline: selected ? "1px solid #38bdf8" : "none" }}>{body}{selected ? <RotationHandle onRotate={(rotation) => update(object.id, { rotation }, true)} /> : null}</Rnd>;
    })}
    {guides.vertical !== undefined ? <div className="pointer-events-none absolute inset-y-0 z-30 border-l border-dashed border-cyan-300" style={{ left: `${guides.vertical}%` }} /> : null}
    {guides.horizontal !== undefined ? <div className="pointer-events-none absolute inset-x-0 z-30 border-t border-dashed border-cyan-300" style={{ top: `${guides.horizontal}%` }} /> : null}
  </article>;
}

function RotationHandle({ onRotate }: { onRotate: (rotation: number) => void }) { const ref = useRef<HTMLButtonElement>(null); const start = (event: React.PointerEvent<HTMLButtonElement>) => { event.stopPropagation(); const parent = ref.current?.parentElement?.getBoundingClientRect(); if (!parent) return; const move = (moveEvent: PointerEvent) => { let angle = Math.atan2(moveEvent.clientY - (parent.top + parent.height / 2), moveEvent.clientX - (parent.left + parent.width / 2)) * 180 / Math.PI + 90; if (moveEvent.shiftKey) angle = Math.round(angle / 15) * 15; onRotate(Math.round(angle)); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", () => window.removeEventListener("pointermove", move), { once: true }); }; return <button aria-label="Rotate selected object" className="absolute -top-6 left-1/2 size-4 -translate-x-1/2 rounded-full border border-white bg-sky-500" onPointerDown={start} ref={ref} type="button" />; }

export function BookAppearancePreview({ data, editable, guides, onFullscreen, onObjectsChange, onSelectionChange, onZoom, selectedId, template, view, zoom }: { data: AppearanceBookData; editable?: boolean; guides: AppearanceGuides; onFullscreen: () => void; onObjectsChange?: (objects: CanvasObject[], checkpoint: boolean) => void; onSelectionChange?: (id: string | null) => void; onZoom: (value: number) => void; selectedId?: string | null; template: Template; view: AppearanceView; zoom: number }) {
  const appearance = template.appearance; const cover = getCoverDimensionsMm(template); const ratio = cover.width / cover.height; const spineWidth = getSpineWidthMm(appearance, data.estimatedPageCount); const actualSpineRatio = spineWidth / cover.height;
  // Editing previews exaggerate a very thin physical spine, while export keeps the exact ratio.
  // A text layer uses a fraction of the spine width; 14% gives CJK glyphs a
  // usable editing canvas in the spread instead of clipping them to a sliver.
  const previewSpineRatio = Math.max(actualSpineRatio * 8, 0.14);
  const coverHeight = Math.max(340, zoom * 4.6) / ratio;
  const height = view === "spine" ? Math.min(480, coverHeight * 0.72) : coverHeight;
  const width = view === "spread" ? height * (ratio * 2 + previewSpineRatio) : view === "spine" ? Math.max(220, height * previewSpineRatio) : height * ratio;
  const canvas = (objects: CanvasObject[], image?: string, verticalText = false) => <CanvasCover backgroundImage={image} data={data} editable={editable} objects={objects} onObjectsChange={onObjectsChange} onSelectionChange={onSelectionChange} selectedId={selectedId} template={template} verticalText={verticalText} />;
  return <section aria-label="Book appearance preview" className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-zinc-950"><header className="flex items-center justify-between px-3 py-2 text-xs text-zinc-300"><span><BookOpen className="mr-1 inline size-3.5" />{data.estimatedPageCount} pages</span><div><Button aria-label="Zoom out" className="size-7 p-0" onClick={() => onZoom(Math.max(50, zoom - 25))} type="button" variant="outline"><Minus className="size-3.5" /></Button><Button aria-label="Zoom in" className="ml-1 size-7 p-0" onClick={() => onZoom(Math.min(200, zoom + 25))} type="button" variant="outline"><Plus className="size-3.5" /></Button><Button aria-label="Fullscreen preview" className="ml-1 size-7 p-0" onClick={onFullscreen} type="button" variant="outline"><Maximize2 className="size-3.5" /></Button></div></header><div className="min-h-0 flex-1 overflow-auto p-8"><div className="relative mx-auto flex" style={{ height, width }}>{view === "spread" || view === "back" ? canvas(appearance.backCover.canvasObjects, `url(${getTemplateAssetUrl(template.templateId, appearance.backCover.background.assetKind)})`) : null}{view === "spread" || view === "spine" ? <aside className="relative overflow-hidden" style={{ width: view === "spine" ? "100%" : `${previewSpineRatio / (ratio * 2 + previewSpineRatio) * 100}%`, backgroundColor: template.accentColor }}>{canvas(appearance.spine.canvasObjects, undefined, true)}</aside> : null}{view === "spread" || view === "front" ? canvas(appearance.frontCover.canvasObjects, `url(${getTemplateAssetUrl(template.templateId, appearance.frontCover.illustration.assetKind)})`) : null}{guides.bleed ? <div className="pointer-events-none absolute inset-0 border-2 border-rose-400" /> : null}</div></div>{Object.values(guides).some(Boolean) ? <footer className="px-3 py-1 text-[10px] text-amber-200"><Ruler className="mr-1 inline size-3" />Editing guides only</footer> : null}</section>;
}
