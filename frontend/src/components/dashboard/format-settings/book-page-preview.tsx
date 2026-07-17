import { Maximize2, Pin } from "lucide-react";

import {
  getFontFamilyStyle,
  publicationChromeFontFamily,
  type BookFormatSettings,
} from "@/components/dashboard/format-settings/format-settings-types";
import type { Language } from "@/lib/i18n";
import type { ArticlePageMode } from "@/repositories/bookRepository";
import { PublicationPageFooter } from "@/components/publication-page-footer";

const previewCopy = {
  en: { title: "Live Preview", pinned: "Stays visible" },
  zh: { title: "实时预览", pinned: "预览已固定" },
} as const;

const marginStyles = {
  narrow: "7% 8%",
  normal: "9% 11%",
  wide: "12% 15%",
};

const paperStyles = {
  a4: { label: "A4", aspectRatio: "210 / 297", maxWidth: 540, widthMm: 210 },
  a5: { label: "A5", aspectRatio: "148 / 210", maxWidth: 440, widthMm: 148 },
  b5: { label: "B5", aspectRatio: "176 / 250", maxWidth: 480, widthMm: 176 },
};

interface BookPagePreviewProps {
  articlePageMode: ArticlePageMode;
  authorClassName: string | null;
  language: Language;
  settings: BookFormatSettings;
}

export function BookPagePreview({
  articlePageMode,
  authorClassName,
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
          widthMm: settings.customPageWidth,
        }
      : paperStyles[settings.pageSize];
  const showNumber = settings.showNumber && settings.numberPosition !== "hidden";

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
          color: settings.themeColor,
        }}
      >
        我的青春
      </h2>
      {settings.subtitleMode === "fixed" && settings.fixedSubtitle && (
        <p
          className="mt-2 text-slate-500"
          style={{
            fontFamily: getFontFamilyStyle(settings.titleFont),
            fontSize: `${Math.max(12, settings.titleSize * 0.5)}px`,
            lineHeight: 1.4,
            textAlign: settings.subtitleAlign,
          }}
        >
          {settings.fixedSubtitle}
        </p>
      )}
      {settings.subtitleMode !== "disabled" &&
        (settings.subtitleMode !== "fixed" || !settings.fixedSubtitle) && (
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
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]" />
          <h2 className="text-xs font-semibold text-foreground">{copy.title}</h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
          <span className="hidden items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-blue-300 lg:flex">
            <Pin className="size-2.5" />
            {copy.pinned}
          </span>
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
            containerType: "inline-size",
            maxWidth: `${paper.maxWidth}px`,
            padding: marginStyles[settings.pageMargin],
          }}
        >
          <div className="flex h-full flex-col">
            {settings.showHeader && (
              <header
                className="mb-4 flex items-center justify-between border-b-2 pb-2 text-[8px] font-semibold tracking-[0.14em]"
                style={{
                  borderColor: settings.accentColor,
                  color: settings.themeColor,
                  fontFamily: publicationChromeFontFamily,
                }}
              >
                <span>{settings.headerText || "OPEN CLASSBOOK"}</span>
                <span>VOL. 01</span>
              </header>
            )}
            <div className="min-h-0 flex-1 overflow-hidden">
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
                className={settings.columns === 2 ? "grid grid-cols-2 gap-x-4" : undefined}
                style={{
                  fontFamily: getFontFamilyStyle(settings.bodyFont),
                  fontSize: `${settings.bodySize}px`,
                  lineHeight: settings.lineHeight,
                  marginTop: `${settings.titleSpacing}px`,
                  textAlign: settings.justify ? "justify" : "left",
                  color: settings.themeColor,
                }}
              >
                <div>
                  {settings.showAuthorMeta && (
                    <p className="mb-2 text-[9px] font-semibold tracking-wide" style={{ color: settings.accentColor }}>
                      {language === "zh" ? "作者：林晓宇" : "Author: Lin Xiaoyu"}
                      {authorClassName ? ` · ${authorClassName}` : ""}
                    </p>
                  )}
                  <p style={{ textIndent: `${settings.firstLineIndent}em` }}>
                    今天，我站在教室里，望着窗外被风吹动的树叶，忽然意识到青春正在这些平凡的日子里悄悄生长……
                  </p>
                  {settings.quoteStyle && (
                    <blockquote
                      className="my-3 border-l-2 py-1 pl-2 text-[0.9em] italic"
                      style={{ borderColor: settings.accentColor }}
                    >
                      每一次记录，都是我们与时间的约定。
                    </blockquote>
                  )}
                  <p className="mt-[1em]" style={{ textIndent: `${settings.firstLineIndent}em` }}>
                    今天，我忽然想到，那些一起读书、写作和欢笑的时光，终有一天会成为我们珍藏的故事……
                  </p>
                </div>
                {settings.columns === 2 && (
                  <div>
                    <p style={{ textIndent: `${settings.firstLineIndent}em` }}>
                      我们在一页页文字里留下成长的证据，也在一次次相遇中理解彼此。好的刊物，应当让信息清晰，也让阅读保留温度。
                    </p>
                    <p className="mt-[1em]" style={{ textIndent: `${settings.firstLineIndent}em` }}>
                      从课堂到校园，从一个人的故事到一群人的记忆，这些细小的片段最终汇成共同的出版物。
                    </p>
                  </div>
                )}
              </div>

              {settings.allowImages && (
                <figure
                  className="mt-6 overflow-hidden bg-slate-50"
                  style={{
                    marginLeft: settings.imageAlign === "left" ? 0 : "auto",
                    marginRight: settings.imageAlign === "right" ? 0 : "auto",
                    width: `${settings.imageMaxWidth}%`,
                    borderRadius: `${settings.imageRadius}px`,
                    border: settings.imageBorder ? "1px solid #e2e8f0" : undefined,
                  }}
                >
                  <img
                    alt="Open book sample"
                    className="aspect-[16/8] w-full object-cover object-[70%_65%]"
                    src="/openclassbook-hero.png"
                  />
                </figure>
              )}
              {articlePageMode === "flow" && (
                <div className="mt-7 border-t border-slate-200 pt-5">
                  <h3
                    className="text-[0.9em] font-semibold"
                    style={{ color: settings.themeColor }}
                  >
                    校园来稿 / Another story
                  </h3>
                  <p className="mt-1 text-[0.86em] leading-[1.45] text-slate-600">
                    多篇审核通过的文章会在同一页自然衔接，投稿内容本身的标题、正文和图片格式保持不变。
                  </p>
                </div>
              )}
            </div>

            <PublicationPageFooter
              color={settings.themeColor}
              footerText={settings.footerText}
              pageMargin={settings.pageMargin}
              pageNumber={1}
              pageNumberPosition={settings.pageNumberPosition}
              pageWidthMm={paper.widthMm}
              showFooter={settings.showFooter}
            />
          </div>
        </article>
      </div>
    </section>
  );
}
