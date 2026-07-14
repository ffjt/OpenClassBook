import { Maximize2 } from "lucide-react";

import {
  getFontFamilyStyle,
  type BookFormatSettings,
} from "@/components/dashboard/format-settings/format-settings-types";
import type { Language } from "@/lib/i18n";

const previewCopy = {
  en: { title: "Live Preview" },
  zh: { title: "实时预览" },
} as const;

const marginStyles = {
  narrow: "7% 8%",
  normal: "9% 11%",
  wide: "12% 15%",
};

const paperStyles = {
  a4: { label: "A4", aspectRatio: "210 / 297", maxWidth: 540 },
  a5: { label: "A5", aspectRatio: "148 / 210", maxWidth: 440 },
  b5: { label: "B5", aspectRatio: "176 / 250", maxWidth: 480 },
};

interface BookPagePreviewProps {
  language: Language;
  settings: BookFormatSettings;
}

export function BookPagePreview({
  language,
  settings,
}: BookPagePreviewProps) {
  const copy = previewCopy[language];
  const paper =
    settings.pageSize === "custom"
      ? {
          label: `${settings.customPageWidth} x ${settings.customPageHeight} mm`,
          aspectRatio: `${settings.customPageWidth} / ${settings.customPageHeight}`,
          maxWidth: Math.min(
            560,
            Math.max(360, (settings.customPageWidth / 210) * 540),
          ),
        }
      : paperStyles[settings.pageSize];
  const showNumber = settings.showNumber && settings.numberPosition !== "hidden";
  const pageNumberAlignment =
    settings.pageNumberPosition === "right" ? "flex-end" : "center";

  const title = (
    <div>
      <h2
        className="text-slate-950"
        style={{
          fontFamily: getFontFamilyStyle(settings.titleFont),
          fontSize: `${settings.titleSize}px`,
          fontWeight: settings.titleBold ? 700 : 400,
          lineHeight: 1.25,
          textAlign: settings.titleAlign,
        }}
      >
        我的青春
      </h2>
      {settings.showSubtitle && (
        <p
          className="mt-2 text-slate-500"
          style={{
            fontFamily: getFontFamilyStyle(settings.titleFont),
            fontSize: `${Math.max(12, settings.titleSize * 0.5)}px`,
            lineHeight: 1.4,
            textAlign: settings.subtitleAlign,
          }}
        >
          写给十八岁的我们
        </p>
      )}
    </div>
  );

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <header className="flex h-12 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2.5">
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]" />
          <h2 className="text-xs font-semibold text-foreground">{copy.title}</h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
          <Maximize2 className="size-3" />
          {paper.label}
        </div>
      </header>

      <div className="flex items-start justify-center bg-muted/40 p-5 sm:p-8 xl:p-10">
        <article
          aria-label={`${paper.label} ${copy.title}`}
          className="relative w-full overflow-hidden bg-[#fffefa] text-slate-800 shadow-[0_20px_70px_rgba(0,0,0,0.48)] ring-1 ring-black/10 transition-all duration-200"
          style={{
            aspectRatio: paper.aspectRatio,
            maxWidth: `${paper.maxWidth}px`,
            padding: marginStyles[settings.pageMargin],
          }}
        >
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              {showNumber && settings.numberPosition === "above" && (
                <p
                  className="mb-3 text-xs font-medium tracking-[0.16em] text-slate-500"
                  style={{ textAlign: settings.titleAlign }}
                >
                  001
                </p>
              )}

              {showNumber && settings.numberPosition === "left" ? (
                <div className="grid grid-cols-[auto_1fr] items-baseline gap-4">
                  <span className="text-xs font-medium tracking-[0.12em] text-slate-500">
                    001
                  </span>
                  {title}
                </div>
              ) : (
                title
              )}

              <div
                style={{
                  fontFamily: getFontFamilyStyle(settings.bodyFont),
                  fontSize: `${settings.bodySize}px`,
                  lineHeight: settings.lineHeight,
                  marginTop: `${settings.titleSpacing}px`,
                  textAlign: settings.justify ? "justify" : "left",
                }}
              >
                <p style={{ textIndent: `${settings.firstLineIndent}em` }}>
                  今天，我站在教室里，望着窗外被风吹动的树叶，忽然意识到青春正在这些平凡的日子里悄悄生长……
                </p>
                <p
                  className="mt-[1em]"
                  style={{ textIndent: `${settings.firstLineIndent}em` }}
                >
                  今天，我忽然想到，那些一起读书、写作和欢笑的时光，终有一天会成为我们珍藏的故事……
                </p>
              </div>

              {settings.allowImages && (
                <figure
                  className="mt-6 overflow-hidden border border-slate-200 bg-slate-50"
                  style={{
                    marginLeft: settings.imageAlign === "left" ? 0 : "auto",
                    marginRight: settings.imageAlign === "right" ? 0 : "auto",
                    width: `${settings.imageMaxWidth}%`,
                  }}
                >
                  <img
                    alt="Open book sample"
                    className="aspect-[16/8] w-full object-cover object-[70%_65%]"
                    src="/openclassbook-hero.png"
                  />
                </figure>
              )}
            </div>

            {settings.pageNumberPosition !== "hidden" && (
              <footer
                className="flex shrink-0 pt-5 text-[10px] tracking-[0.14em] text-slate-400"
                style={{ justifyContent: pageNumberAlignment }}
              >
                —— 第 1 页 ——
              </footer>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
