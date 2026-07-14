import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Maximize2, Move } from "lucide-react";

import { useTemplate } from "@/hooks/use-template";
import type { Language } from "@/lib/i18n";
import type { MockArticle } from "@/mock/article";
import type { ImageWrap } from "@/types/article";
import {
  getFontFamilyStyle,
  type PageMargin,
  type PageSize,
  type Template,
} from "@/types/template";

const previewCopy = {
  en: {
    title: "Live Preview",
    pages: "pages",
    page: "Page",
    moveImage: "Move image",
  },
  zh: {
    title: "\u5b9e\u65f6\u9884\u89c8",
    pages: "\u9875",
    page: "\u7b2c",
    moveImage: "\u79fb\u52a8\u56fe\u7247",
  },
} as const;

const marginStyles: Record<PageMargin, string> = {
  narrow: "7% 8%",
  normal: "9% 11%",
  wide: "12% 15%",
};

const marginCapacity: Record<PageMargin, number> = {
  narrow: 1.18,
  normal: 1,
  wide: 0.76,
};

const paperStyles = {
  a4: { label: "A4", aspectRatio: "210 / 297", maxWidth: 540 },
  a5: { label: "A5", aspectRatio: "148 / 210", maxWidth: 440 },
  b5: { label: "B5", aspectRatio: "176 / 250", maxWidth: 480 },
} as const;

const paperCapacity: Record<PageSize, number> = {
  a4: 1,
  a5: 0.52,
  b5: 0.71,
  custom: 1,
};

interface PreviewPage {
  lines: string[];
  showImage: boolean;
}

function splitParagraph(paragraph: string, limit: number) {
  if (paragraph.length <= limit) return [paragraph, ""] as const;

  const minimumBreak = Math.floor(limit * 0.58);
  const candidate = paragraph.slice(0, limit);
  const sentenceBreaks = ["\u3002", "\uff01", "\uff1f", ". ", "! ", "? "];
  const splitAt = sentenceBreaks.reduce((latest, punctuation) => {
    const index = candidate.lastIndexOf(punctuation);
    return index >= minimumBreak
      ? Math.max(latest, index + punctuation.length)
      : latest;
  }, -1);
  const safeSplit = splitAt > 0 ? splitAt : limit;

  return [
    paragraph.slice(0, safeSplit),
    paragraph.slice(safeSplit),
  ] as const;
}

function getPageCapacities(template: Template, body: string) {
  const cjkCharacters = (body.match(/[\u3400-\u9fff]/g) ?? []).length;
  const contentDensity =
    body.length > 0 && cjkCharacters / body.length > 0.25 ? 1 : 1.65;
  const customPaperCapacity =
    template.pageSize === "custom"
      ? Math.min(
          1.6,
          Math.max(
            0.35,
            (template.customPageWidth * template.customPageHeight) /
              (210 * 297),
          ),
        )
      : paperCapacity[template.pageSize];
  const typographyCapacity =
    Math.pow(14 / template.bodySize, 1.45) *
    (1.5 / template.lineHeight);
  const pageCapacity = Math.max(
    140,
    Math.round(
      650 *
        contentDensity *
        customPaperCapacity *
        marginCapacity[template.pageMargin] *
        typographyCapacity,
    ),
  );
  const titleScale = Math.min(
    1.12,
    Math.max(0.62, 1 - (template.titleSize - 24) / 90),
  );

  return {
    first: Math.max(90, Math.round(pageCapacity * 0.68 * titleScale)),
    following: pageCapacity,
    line: Math.max(
      16,
      Math.round(
        28 *
          contentDensity *
          (14 / template.bodySize) *
          Math.sqrt(marginCapacity[template.pageMargin]),
      ),
    ),
  };
}

function paginateArticle(body: string, imageUrl: string, template: Template) {
  const sourceLines = body.replace(/\r\n/g, "\n").split("\n");
  const capacities = getPageCapacities(template, body);
  const pages: PreviewPage[] = [{ lines: [], showImage: false }];
  let pageIndex = 0;
  let remainingCapacity = capacities.first;

  sourceLines.forEach((sourceLine) => {
    let remainingLine = sourceLine;

    if (remainingLine.length === 0) {
      if (remainingCapacity < capacities.line) {
        pages.push({ lines: [], showImage: false });
        pageIndex += 1;
        remainingCapacity = capacities.following;
      }

      pages[pageIndex].lines.push("");
      remainingCapacity -= capacities.line;
      return;
    }

    while (remainingLine) {
      if (remainingCapacity <= 0) {
        pages.push({ lines: [], showImage: false });
        pageIndex += 1;
        remainingCapacity = capacities.following;
      }

      const [pagePart, rest] = splitParagraph(
        remainingLine,
        remainingCapacity,
      );

      if (pagePart) {
        pages[pageIndex].lines.push(pagePart);
        remainingCapacity -= Math.max(pagePart.length, capacities.line);
      }

      remainingLine = rest;

      if (remainingLine) {
        pages.push({ lines: [], showImage: false });
        pageIndex += 1;
        remainingCapacity = capacities.following;
      }
    }
  });

  if (template.allowImages && imageUrl) {
    const finalPage = pages[pages.length - 1];
    const finalCapacity =
      pages.length === 1 ? capacities.first : capacities.following;
    const usedCharacters = finalPage.lines.reduce(
      (total, line) => total + Math.max(line.length, capacities.line),
      0,
    );
    const imageTextRatio = Math.min(
      0.68,
      Math.max(0.3, 0.88 - template.imageMaxWidth / 180),
    );

    if (usedCharacters > finalCapacity * imageTextRatio) {
      pages.push({ lines: [], showImage: true });
    } else {
      finalPage.showImage = true;
    }
  }

  return pages;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function getFlowImageStyle(
  position: MockArticle["imagePosition"],
  imageWrap: ImageWrap,
  template: Template,
): CSSProperties {
  const width = Math.min(90, template.imageMaxWidth);
  const leftEdge = clamp(position.x - width / 2, 0, 100 - width);
  const rightEdge = 100 - leftEdge - width;
  const placeOnLeft = position.x <= 50;
  const shapeOutside =
    imageWrap === "tight"
      ? "inset(5% round 18%)"
      : imageWrap === "through"
        ? "polygon(0 0, 100% 0, 82% 28%, 100% 52%, 76% 100%, 0 100%, 18% 52%)"
        : "margin-box";

  if (imageWrap === "topBottom") {
    return {
      clear: "both",
      marginBottom: "1em",
      marginLeft: `${leftEdge}%`,
      width: `${width}%`,
    };
  }

  return {
    float: placeOnLeft ? "left" : "right",
    marginBottom: "1em",
    marginLeft: placeOnLeft ? `${leftEdge}%` : "1em",
    marginRight: placeOnLeft ? "1em" : `${rightEdge}%`,
    shapeMargin: "10px",
    shapeOutside,
    width: `${width}%`,
  };
}

interface LiveArticlePreviewProps {
  article: MockArticle;
  language: Language;
  onImagePositionChange?: (position: MockArticle["imagePosition"]) => void;
  readOnly?: boolean;
}

export function LiveArticlePreview({
  article,
  language,
  onImagePositionChange,
  readOnly = false,
}: LiveArticlePreviewProps) {
  const { template } = useTemplate();
  const copy = previewCopy[language];
  const paper =
    template.pageSize === "custom"
      ? {
          label: `${template.customPageWidth} x ${template.customPageHeight} mm`,
          aspectRatio: `${template.customPageWidth} / ${template.customPageHeight}`,
          maxWidth: Math.min(
            560,
            Math.max(360, (template.customPageWidth / 210) * 540),
          ),
        }
      : paperStyles[template.pageSize];
  const showNumber =
    template.showNumber && template.numberPosition !== "hidden";
  const pages = useMemo(
    () => paginateArticle(article.body, article.imageUrl, template),
    [article.body, article.imageUrl, template],
  );
  const [previewImagePosition, setPreviewImagePosition] = useState(
    article.imagePosition,
  );
  const [isDragging, setIsDragging] = useState(false);
  const pendingPosition = useRef(article.imagePosition);
  const animationFrame = useRef<number | null>(null);
  const isOverlayImage =
    article.imageWrap === "behindText" ||
    article.imageWrap === "inFrontOfText";

  useEffect(() => {
    if (!isDragging) {
      pendingPosition.current = article.imagePosition;
      setPreviewImagePosition(article.imagePosition);
    }
  }, [article.imagePosition, isDragging]);

  useEffect(
    () => () => {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
      }
    },
    [],
  );

  const scheduleImagePosition = (
    position: MockArticle["imagePosition"],
  ) => {
    pendingPosition.current = position;
    if (animationFrame.current !== null) return;

    animationFrame.current = requestAnimationFrame(() => {
      setPreviewImagePosition(pendingPosition.current);
      animationFrame.current = null;
    });
  };

  const getImagePositionFromPointer = (event: PointerEvent<HTMLElement>) => {
    const page = event.currentTarget.closest("article");
    if (!page) return pendingPosition.current;

    const bounds = page.getBoundingClientRect();
    const x = clamp(((event.clientX - bounds.left) / bounds.width) * 100, 4, 96);
    const y = clamp(((event.clientY - bounds.top) / bounds.height) * 100, 8, 92);
    return { x, y };
  };

  const handleImageKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (readOnly) return;
    const distance = event.shiftKey ? 5 : 2;
    const deltas: Record<string, { x: number; y: number }> = {
      ArrowDown: { x: 0, y: distance },
      ArrowLeft: { x: -distance, y: 0 },
      ArrowRight: { x: distance, y: 0 },
      ArrowUp: { x: 0, y: -distance },
    };
    const delta = deltas[event.key];
    if (!delta) return;

    event.preventDefault();
    const nextPosition = {
      x: clamp(previewImagePosition.x + delta.x, 4, 96),
      y: clamp(previewImagePosition.y + delta.y, 8, 92),
    };
    pendingPosition.current = nextPosition;
    setPreviewImagePosition(nextPosition);
    onImagePositionChange?.(nextPosition);
  };

  const renderWrapSpacer = () => (
    <span
      aria-hidden="true"
      style={{
        ...getFlowImageStyle(
          previewImagePosition,
          article.imageWrap,
          template,
        ),
        aspectRatio: "2 / 1",
        visibility: "hidden",
      }}
    />
  );

  const renderImage = () => (
    <figure
      aria-label={readOnly ? undefined : copy.moveImage}
      className={`group absolute touch-none select-none overflow-hidden border border-blue-400/50 bg-slate-50 shadow-md outline-none ring-blue-500/30 ${readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing focus-visible:ring-2"}`}
      data-image-wrap={article.imageWrap}
      onKeyDown={handleImageKeyDown}
      onPointerDown={(event) => {
        if (readOnly || event.button !== 0) return;
        event.preventDefault();
        setIsDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        scheduleImagePosition(getImagePositionFromPointer(event));
      }}
      onPointerMove={(event) => {
        if (readOnly) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          scheduleImagePosition(getImagePositionFromPointer(event));
        }
      }}
      onPointerUp={(event) => {
        if (readOnly) return;
        const finalPosition = getImagePositionFromPointer(event);
        scheduleImagePosition(finalPosition);
        onImagePositionChange?.(finalPosition);
        setIsDragging(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        if (readOnly) return;
        onImagePositionChange?.(pendingPosition.current);
        setIsDragging(false);
      }}
      role={readOnly ? undefined : "button"}
      style={{
        left: `${previewImagePosition.x}%`,
        opacity: article.imageWrap === "behindText" ? 0.38 : 1,
        top: `${previewImagePosition.y}%`,
        transform: "translate(-50%, -50%)",
        width: `${Math.min(90, template.imageMaxWidth)}%`,
        zIndex: article.imageWrap === "behindText" ? 0 : 4,
      }}
      tabIndex={readOnly ? -1 : 0}
    >
      <img
        alt=""
        className="aspect-[16/8] w-full object-cover object-[70%_65%]"
        draggable={false}
        src={article.imageUrl}
      />
      {!readOnly && (
        <span className="pointer-events-none absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md bg-slate-950/70 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Move className="size-3.5" />
        </span>
      )}
    </figure>
  );

  const title = (
    <h2
      className="break-words text-slate-950"
      style={{
        fontFamily: getFontFamilyStyle(template.titleFont),
        fontSize: `${template.titleSize}px`,
        fontWeight: template.titleBold ? 700 : 400,
        lineHeight: 1.25,
        textAlign: template.titleAlign,
      }}
    >
      {article.title || "\u00a0"}
    </h2>
  );

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111317] shadow-2xl shadow-black/20">
      <header className="flex h-12 items-center justify-between border-b border-white/[0.07] px-4">
        <div className="flex items-center gap-2.5">
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]" />
          <h2 className="text-xs font-semibold text-zinc-200">{copy.title}</h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-600">
          <Maximize2 className="size-3" />
          {paper.label}
          <span aria-hidden="true">{"\u00b7"}</span>
          {pages.length}{" "}
          {language === "zh"
            ? copy.pages
            : pages.length === 1
              ? "page"
              : copy.pages}
        </div>
      </header>

      <div className="flex flex-col items-center gap-6 bg-[#090a0d] p-5 sm:p-8 xl:p-10">
        {pages.map((page, pageIndex) => {
          const isFirstPage = pageIndex === 0;
          const pageNumber = pageIndex + 1;
          const imageInsertIndex = clamp(
            Math.round(
              ((isDragging
                ? article.imagePosition.y
                : previewImagePosition.y) /
                100) *
                page.lines.length,
            ),
            0,
            page.lines.length,
          );

          return (
            <article
              aria-label={`${paper.label} ${copy.title} ${pageNumber}`}
              className="relative w-full overflow-hidden bg-[#fffefa] text-slate-800 shadow-[0_20px_70px_rgba(0,0,0,0.48)] ring-1 ring-black/10 transition-all duration-200"
              key={pageNumber}
              style={{
                aspectRatio: paper.aspectRatio,
                maxWidth: `${paper.maxWidth}px`,
                padding: marginStyles[template.pageMargin],
              }}
            >
              <div className="flex h-full flex-col">
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  {isFirstPage &&
                    showNumber &&
                    template.numberPosition === "above" && (
                      <p
                        className="mb-3 text-xs font-medium tracking-[0.16em] text-slate-500"
                        style={{ textAlign: template.titleAlign }}
                      >
                        {article.number}
                      </p>
                    )}

                  {isFirstPage &&
                    (showNumber && template.numberPosition === "left" ? (
                      <div className="grid grid-cols-[auto_1fr] items-baseline gap-4">
                        <span className="text-xs font-medium tracking-[0.12em] text-slate-500">
                          {article.number}
                        </span>
                        {title}
                      </div>
                    ) : (
                      title
                    ))}

                  <div
                    className="break-words whitespace-pre-wrap"
                    data-preview-body={pageNumber}
                    style={{
                      fontFamily: getFontFamilyStyle(template.bodyFont),
                      fontSize: `${template.bodySize}px`,
                      lineHeight: template.lineHeight,
                      marginTop: isFirstPage
                        ? `${template.titleSpacing}px`
                        : 0,
                      pointerEvents:
                        article.imageWrap === "behindText" ? "none" : undefined,
                      position: "relative",
                      textAlign: template.justify ? "justify" : "left",
                      zIndex: 1,
                    }}
                  >
                    {page.lines.map((line, lineIndex) => (
                      <Fragment key={`${lineIndex}-${line.slice(0, 12)}`}>
                        {page.showImage &&
                          !isOverlayImage &&
                          lineIndex === imageInsertIndex &&
                          renderWrapSpacer()}
                        <p
                          data-preview-line={lineIndex + 1}
                          style={{
                            minHeight: `${template.lineHeight}em`,
                            textIndent: line
                              ? `${template.firstLineIndent}em`
                              : 0,
                          }}
                        >
                          {line || "\u00a0"}
                        </p>
                      </Fragment>
                    ))}
                    {page.showImage &&
                      !isOverlayImage &&
                      imageInsertIndex === page.lines.length &&
                      renderWrapSpacer()}
                  </div>

                  {page.showImage && renderImage()}
                </div>

                {template.pageNumberPosition !== "hidden" && (
                  <footer
                    className="flex shrink-0 pt-5 text-[10px] tracking-[0.14em] text-slate-400"
                    style={{
                      justifyContent:
                        template.pageNumberPosition === "right"
                          ? "flex-end"
                          : "center",
                    }}
                  >
                    {"\u2014"}{" "}
                    {language === "zh"
                      ? `${copy.page} ${pageNumber} \u9875`
                      : `${copy.page} ${pageNumber}`}{" "}
                    {"\u2014"}
                  </footer>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
