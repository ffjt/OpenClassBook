import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { Maximize2, Move } from "lucide-react";
import { Rnd } from "react-rnd";

import { useTemplate } from "@/hooks/use-template";
import type { Language } from "@/lib/i18n";
import type { ImageWrap, PreviewArticle } from "@/types/article";
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
    resizeImage: "Move or resize image",
    imageHelp: "Drag across pages to move · Pull an edge or corner to resize",
  },
  zh: {
    title: "\u5b9e\u65f6\u9884\u89c8",
    pages: "\u9875",
    page: "\u7b2c",
    resizeImage: "\u79fb\u52a8\u6216\u8c03\u6574\u56fe\u7247\u5927\u5c0f",
    imageHelp: "\u53ef\u8de8\u9875\u62d6\u52a8 \u00b7 \u62c9\u4f38\u8fb9\u7f18\u6216\u89d2\u70b9\u53ef\u7f29\u653e",
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

export interface PreviewPage {
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

// Shared with the book-layout publication preview.
// eslint-disable-next-line react-refresh/only-export-components
export function paginateArticle(
  body: string,
  imageUrl: string,
  imagePage: number,
  template: Template,
) {
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

    const needsImagePage = usedCharacters > finalCapacity * imageTextRatio;
    if (needsImagePage && (imagePage < 0 || imagePage >= pages.length)) {
      pages.push({ lines: [], showImage: false });
    }
    const targetPage =
      imagePage < 0
        ? pages.length - 1
        : clamp(imagePage, 0, pages.length - 1);
    pages[targetPage].showImage = true;
  }

  return pages;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function getFlowImageStyle(
  position: PreviewArticle["imagePosition"],
  imageWrap: ImageWrap,
  imageSize: PreviewArticle["imageSize"],
  bounds: { height: number; width: number },
): CSSProperties {
  const width = imageSize.width;
  const leftEdge = clamp(position.x - width / 2, 0, 100 - width);
  const rightEdge = 100 - leftEdge - width;
  const placeOnLeft = position.x <= 50;
  const gap = imageWrap === "through" ? 2 : imageWrap === "tight" ? 6 : 12;
  const height = (imageSize.height / 100) * bounds.height;

  if (imageWrap === "topBottom") {
    return {
      clear: "both",
      display: "block",
      height: `${height + gap * 2}px`,
      width: "100%",
    };
  }

  return {
    float: placeOnLeft ? "left" : "right",
    height: `${height + gap * 2}px`,
    marginLeft: placeOnLeft ? `${leftEdge}%` : `${gap}px`,
    marginRight: placeOnLeft ? `${gap}px` : `${rightEdge}%`,
    shapeOutside: "margin-box",
    width: `${width}%`,
  };
}

interface WrapInsertion {
  character: number;
  line: number;
}

const getWrapGap = (imageWrap: ImageWrap) =>
  imageWrap === "through" ? 2 : imageWrap === "tight" ? 6 : 12;

function getCharacterRect(textNode: Text, character: number) {
  const range = document.createRange();
  range.setStart(textNode, character);
  range.setEnd(textNode, Math.min(textNode.length, character + 1));
  return range.getBoundingClientRect();
}

function findWrapInsertion(
  measurement: HTMLElement,
  targetY: number,
): WrapInsertion {
  const paragraphs = Array.from(
    measurement.querySelectorAll<HTMLElement>("[data-measure-line]"),
  );

  for (const [line, paragraph] of paragraphs.entries()) {
    const textNode = paragraph.firstChild;
    const text = textNode?.textContent ?? "";
    if (!(textNode instanceof Text) || !text || paragraph.getBoundingClientRect().bottom < targetY) {
      continue;
    }

    let low = 0;
    let high = text.length - 1;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (getCharacterRect(textNode, middle).bottom < targetY) low = middle + 1;
      else high = middle;
    }

    const lineTop = getCharacterRect(textNode, low).top;
    while (low > 0 && Math.abs(getCharacterRect(textNode, low - 1).top - lineTop) < 1) {
      low -= 1;
    }
    return { character: low, line };
  }

  const lastLine = Math.max(0, paragraphs.length - 1);
  return {
    character: paragraphs[lastLine]?.textContent?.length ?? 0,
    line: lastLine,
  };
}

interface LiveArticlePreviewProps {
  article: PreviewArticle;
  language: Language;
  onImagePageChange?: (page: number) => void;
  onImagePositionChange?: (position: PreviewArticle["imagePosition"]) => void;
  onImageSizeChange?: (size: PreviewArticle["imageSize"]) => void;
  readOnly?: boolean;
}

export function LiveArticlePreview({
  article,
  language,
  onImagePageChange,
  onImagePositionChange,
  onImageSizeChange,
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
    Boolean(article.number) &&
    template.showNumber &&
    template.numberPosition !== "hidden";
  const subtitle =
    template.subtitleMode === "fixed"
      ? template.fixedSubtitle
      : template.subtitleMode === "free"
        ? article.subtitle
        : "";
  const pages = useMemo(
    () =>
      paginateArticle(
        article.body,
        article.imageUrl,
        article.imagePage,
        template,
      ),
    [article.body, article.imagePage, article.imageUrl, template],
  );
  const resolvedImagePage = Math.max(
    0,
    pages.findIndex((page) => page.showImage),
  );
  const [previewImagePosition, setPreviewImagePosition] = useState(
    article.imagePosition,
  );
  const [previewImageSize, setPreviewImageSize] = useState(article.imageSize);
  const [previewImagePage, setPreviewImagePage] = useState(resolvedImagePage);
  const [isInteracting, setIsInteracting] = useState(false);
  const pageContentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const bodyRefs = useRef<Array<HTMLDivElement | null>>([]);
  const measurementRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0 });
  const [imageTopBoundary, setImageTopBoundary] = useState(0);
  const [wrapInsertions, setWrapInsertions] = useState<Record<number, WrapInsertion>>({});
  const isOverlayImage =
    article.imageWrap === "behindText" ||
    article.imageWrap === "inFrontOfText";
  const imagePixelHeight =
    (previewImageSize.height / 100) * imageBounds.height;
  const requestedImageTop =
    (previewImagePosition.y / 100) * imageBounds.height -
    imagePixelHeight * 0.5;
  const imagePixelTop = isOverlayImage
    ? requestedImageTop
    : clamp(
        requestedImageTop,
        imageTopBoundary,
        Math.max(imageTopBoundary, imageBounds.height - imagePixelHeight),
      );

  useEffect(() => {
    if (!isInteracting) {
      setPreviewImagePosition(article.imagePosition);
      setPreviewImageSize(article.imageSize);
      setPreviewImagePage(resolvedImagePage);
    }
  }, [article.imagePosition, article.imageSize, isInteracting, resolvedImagePage]);

  useEffect(() => {
    const imageBoundsElement = pageContentRefs.current[previewImagePage];
    if (!imageBoundsElement) return;
    const updateBounds = () => {
      const bounds = imageBoundsElement.getBoundingClientRect();
      setImageBounds({ width: bounds.width, height: bounds.height });
      const body = bodyRefs.current[previewImagePage];
      setImageTopBoundary(
        body ? Math.max(0, body.getBoundingClientRect().top - bounds.top) : 0,
      );
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(imageBoundsElement);
    const body = bodyRefs.current[previewImagePage];
    if (body) observer.observe(body);
    return () => observer.disconnect();
  }, [
    article.number,
    article.title,
    pages.length,
    previewImagePage,
    showNumber,
    subtitle,
    template.numberPosition,
    template.subtitleAlign,
    template.titleAlign,
    template.titleBold,
    template.titleFont,
    template.titleSize,
    template.titleSpacing,
  ]);

  useLayoutEffect(() => {
    if (isOverlayImage || !article.imageUrl || !imageBounds.height) return;
    const measurement = measurementRefs.current[previewImagePage];
    const content = pageContentRefs.current[previewImagePage];
    if (!measurement || !content) return;

    const contentTop = content.getBoundingClientRect().top;
    const imageTop =
      contentTop +
      imagePixelTop -
      getWrapGap(article.imageWrap);
    const insertion = findWrapInsertion(measurement, imageTop);

    setWrapInsertions((current) => {
      const previous = current[previewImagePage];
      return previous?.line === insertion.line &&
        previous.character === insertion.character
        ? current
        : { ...current, [previewImagePage]: insertion };
    });
  }, [
    article.body,
    article.imageUrl,
    article.imageWrap,
    imageBounds.height,
    imagePixelTop,
    isOverlayImage,
    pages,
    previewImagePage,
    previewImagePosition.y,
    previewImageSize.height,
    template.bodyFont,
    template.bodySize,
    template.firstLineIndent,
    template.justify,
    template.lineHeight,
  ]);

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
    const halfWidth = previewImageSize.width / 2;
    const halfHeight = previewImageSize.height / 2;
    const nextPosition = {
      x: clamp(previewImagePosition.x + delta.x, halfWidth, 100 - halfWidth),
      y: clamp(previewImagePosition.y + delta.y, halfHeight, 100 - halfHeight),
    };
    setPreviewImagePosition(nextPosition);
    onImagePositionChange?.(nextPosition);
  };

  const getPercentPosition = (
    x: number,
    y: number,
    size = previewImageSize,
  ) => ({
    x: imageBounds.width
      ? ((x + (size.width / 100) * imageBounds.width * 0.5) /
          imageBounds.width) *
        100
      : previewImagePosition.x,
    y: imageBounds.height
      ? ((y + (size.height / 100) * imageBounds.height * 0.5) /
          imageBounds.height) *
        100
      : previewImagePosition.y,
  });

  const imagePixelPosition = {
    x:
      (previewImagePosition.x / 100) * imageBounds.width -
      (previewImageSize.width / 100) * imageBounds.width * 0.5,
    y: imagePixelTop,
  };

  const getDropTarget = (sourcePage: number, x: number, y: number) => {
    const sourceElement = pageContentRefs.current[sourcePage];
    if (!sourceElement) {
      return {
        page: sourcePage,
        position: getPercentPosition(x, y),
        size: previewImageSize,
      };
    }

    const sourceBounds = sourceElement.getBoundingClientRect();
    const imageWidth = (previewImageSize.width / 100) * sourceBounds.width;
    const imageHeight = (previewImageSize.height / 100) * sourceBounds.height;
    const centerX = sourceBounds.left + x + imageWidth / 2;
    const centerY = sourceBounds.top + y + imageHeight / 2;
    const availablePages = pageContentRefs.current
      .map((element, page) =>
        element ? { bounds: element.getBoundingClientRect(), page } : null,
      )
      .filter((entry): entry is { bounds: DOMRect; page: number } => Boolean(entry));
    const firstPage = availablePages[0];
    if (!firstPage) {
      return {
        page: sourcePage,
        position: getPercentPosition(x, y),
        size: previewImageSize,
      };
    }
    const target = availablePages.reduce<{
      bounds: DOMRect;
      distance: number;
      page: number;
    }>((closest, candidate) => {
      const distance =
        centerY < candidate.bounds.top
          ? candidate.bounds.top - centerY
          : centerY > candidate.bounds.bottom
            ? centerY - candidate.bounds.bottom
            : 0;
      return distance < closest.distance
        ? { ...candidate, distance }
        : closest;
    }, { ...firstPage, distance: Number.POSITIVE_INFINITY });
    const nextSize = {
      width: (imageWidth / target.bounds.width) * 100,
      height: (imageHeight / target.bounds.height) * 100,
    };
    const halfWidth = nextSize.width / 2;
    const halfHeight = nextSize.height / 2;

    return {
      page: target.page,
      position: {
        x: clamp(
          ((centerX - target.bounds.left) / target.bounds.width) * 100,
          halfWidth,
          100 - halfWidth,
        ),
        y: clamp(
          ((centerY - target.bounds.top) / target.bounds.height) * 100,
          halfHeight,
          100 - halfHeight,
        ),
      },
      size: nextSize,
    };
  };

  const renderWrapSpacer = () => (
    <span
      aria-hidden="true"
      style={{
        ...getFlowImageStyle(
          previewImagePosition,
          article.imageWrap,
          previewImageSize,
          imageBounds,
        ),
        visibility: "hidden",
      }}
    />
  );

  const renderImage = (pageIndex: number) => (
    <Rnd
      aria-label={readOnly ? undefined : copy.resizeImage}
      className={`group touch-none select-none outline-none ring-blue-500/30 ${readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing focus-visible:ring-2"}`}
      data-image-wrap={article.imageWrap}
      disableDragging={readOnly}
      enableResizing={!readOnly}
      minHeight="6%"
      minWidth="8%"
      onDrag={(_event, data) => {
        setPreviewImagePosition(getPercentPosition(data.x, data.y));
      }}
      onDragStart={() => setIsInteracting(true)}
      onDragStop={(_event, data) => {
        const target = getDropTarget(pageIndex, data.x, data.y);
        setPreviewImagePage(target.page);
        setPreviewImagePosition(target.position);
        setPreviewImageSize(target.size);
        onImagePageChange?.(target.page);
        onImagePositionChange?.(target.position);
        onImageSizeChange?.(target.size);
        setIsInteracting(false);
      }}
      onKeyDown={handleImageKeyDown}
      onResize={(_event, _direction, element, _delta, position) => {
        const nextSize = {
          width: (element.offsetWidth / imageBounds.width) * 100,
          height: (element.offsetHeight / imageBounds.height) * 100,
        };
        setPreviewImageSize(nextSize);
        setPreviewImagePosition(getPercentPosition(position.x, position.y, nextSize));
      }}
      onResizeStart={() => setIsInteracting(true)}
      onResizeStop={(_event, _direction, element, _delta, position) => {
        const nextSize = {
          width: (element.offsetWidth / imageBounds.width) * 100,
          height: (element.offsetHeight / imageBounds.height) * 100,
        };
        const nextPosition = getPercentPosition(position.x, position.y, nextSize);
        setPreviewImageSize(nextSize);
        setPreviewImagePosition(nextPosition);
        onImageSizeChange?.(nextSize);
        onImagePositionChange?.(nextPosition);
        setIsInteracting(false);
      }}
      position={imagePixelPosition}
      role={readOnly ? undefined : "button"}
      size={{
        height: `${previewImageSize.height}%`,
        width: `${previewImageSize.width}%`,
      }}
      style={{
        opacity: article.imageWrap === "behindText" ? 0.38 : 1,
        zIndex: article.imageWrap === "behindText" ? 0 : 4,
      }}
      tabIndex={readOnly ? -1 : 0}
    >
      <figure className="relative size-full overflow-hidden border border-blue-400/60 bg-slate-50 shadow-md">
        <img
          alt=""
          className="size-full object-cover"
          draggable={false}
          src={article.imageUrl}
        />
        {!readOnly && (
          <>
            <span className="pointer-events-none absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md bg-slate-950/70 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Move className="size-3.5" />
            </span>
            {[
              "left-0 top-0 -translate-x-1/2 -translate-y-1/2",
              "right-0 top-0 translate-x-1/2 -translate-y-1/2",
              "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
              "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
            ].map((position) => (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute size-2 rounded-[2px] border border-white bg-blue-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${position}`}
                key={position}
              />
            ))}
          </>
        )}
      </figure>
    </Rnd>
  );

  const title = (
    <div>
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
      {subtitle && (
        <p
          className="mt-2 break-words text-slate-500"
          style={{
            fontFamily: getFontFamilyStyle(template.titleFont),
            fontSize: `${Math.max(12, template.titleSize * 0.5)}px`,
            lineHeight: 1.4,
            textAlign: template.subtitleAlign,
          }}
        >
          {subtitle}
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
          <span aria-hidden="true">{"\u00b7"}</span>
          {pages.length}{" "}
          {language === "zh"
            ? copy.pages
            : pages.length === 1
              ? "page"
              : copy.pages}
        </div>
      </header>

      <div className="flex flex-col items-center gap-6 bg-muted/40 p-5 sm:p-8 xl:p-10">
        {article.imageUrl && !readOnly && (
          <p className="flex items-center gap-2 self-center text-[10px] font-medium text-muted-foreground">
            <Move className="size-3" />
            {copy.imageHelp}
          </p>
        )}
        {pages.map((page, pageIndex) => {
          const isFirstPage = pageIndex === 0;
          const pageNumber = pageIndex + 1;
          const wrapInsertion = wrapInsertions[pageIndex] ?? {
            character: 0,
            line: 0,
          };

          return (
            <article
              aria-label={`${paper.label} ${copy.title} ${pageNumber}`}
              className={`relative w-full bg-[#fffefa] text-slate-800 shadow-[0_20px_70px_rgba(0,0,0,0.48)] ring-1 ring-black/10 transition-all duration-200 ${page.showImage && isInteracting ? "z-10 overflow-visible" : "overflow-hidden"}`}
              key={pageNumber}
              style={{
                aspectRatio: paper.aspectRatio,
                maxWidth: `${paper.maxWidth}px`,
                padding: marginStyles[template.pageMargin],
              }}
            >
              <div className="flex h-full flex-col">
                <div
                  className={`relative min-h-0 flex-1 ${page.showImage && isInteracting ? "overflow-visible" : "overflow-hidden"}`}
                  ref={(element) => {
                    pageContentRefs.current[pageIndex] = element;
                  }}
                >
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
                    ref={(element) => {
                      bodyRefs.current[pageIndex] = element;
                    }}
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
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 invisible"
                      ref={(element) => {
                        measurementRefs.current[pageIndex] = element;
                      }}
                    >
                      {page.lines.map((line, lineIndex) => (
                        <p
                          data-measure-line={lineIndex + 1}
                          key={`${lineIndex}-${line.slice(0, 12)}`}
                          style={{
                            minHeight: `${template.lineHeight}em`,
                            textIndent: line
                              ? `${template.firstLineIndent}em`
                              : 0,
                          }}
                        >
                          {line || "\u00a0"}
                        </p>
                      ))}
                    </div>
                    {page.lines.map((line, lineIndex) => {
                      const insertsImage =
                        page.showImage &&
                        !isOverlayImage &&
                        lineIndex === wrapInsertion.line;
                      const character = insertsImage
                        ? clamp(wrapInsertion.character, 0, line.length)
                        : 0;

                      return (
                        <p
                          data-preview-line={lineIndex + 1}
                          key={`${lineIndex}-${line.slice(0, 12)}`}
                          style={{
                            minHeight: `${template.lineHeight}em`,
                            textIndent: line
                              ? `${template.firstLineIndent}em`
                              : 0,
                          }}
                        >
                          {insertsImage ? (
                            <>
                              {line.slice(0, character)}
                              {renderWrapSpacer()}
                              {line.slice(character) || "\u00a0"}
                            </>
                          ) : (
                            line || "\u00a0"
                          )}
                        </p>
                      );
                    })}
                  </div>

                  {page.showImage && renderImage(pageIndex)}
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
