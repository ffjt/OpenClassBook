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

import { PublicationPageFooter } from "@/components/publication-page-footer";
import type { Language } from "@/lib/i18n";
import type { ImageWrap, PreviewArticle } from "@/types/article";
import { getTemplateAssetUrl } from "@/mock/template-catalog";
import {
  getPublicationPageChrome,
  getTemplateSubtitle,
  getFontFamilyStyle,
  publicationChromeFontFamily,
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

const marginRatios: Record<PageMargin, { horizontal: number; vertical: number }> = {
  narrow: { horizontal: 0.08, vertical: 0.07 },
  normal: { horizontal: 0.11, vertical: 0.09 },
  wide: { horizontal: 0.15, vertical: 0.12 },
};

const marginCapacity: Record<PageMargin, number> = {
  narrow: 1.18,
  normal: 1,
  wide: 0.76,
};

const paperStyles = {
  a4: { label: "A4", aspectRatio: "210 / 297", maxWidth: 540, widthMm: 210 },
  a5: { label: "A5", aspectRatio: "148 / 210", maxWidth: 440, widthMm: 148 },
  b5: { label: "B5", aspectRatio: "176 / 250", maxWidth: 480, widthMm: 176 },
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

// eslint-disable-next-line react-refresh/only-export-components
export function getPreviewColumnCount(template: Template): 1 | 2 {
  return template.columns;
}

// Measurement and rendering must use the same column geometry.
export function getPreviewColumnGap(
  template: Template,
  bodyFontSize: number,
) {
  return template.columns === 2 ? bodyFontSize * 2.25 : 0;
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
    first: Math.max(
      90,
      Math.round(pageCapacity * 0.815 * titleScale),
    ),
    following: Math.round(pageCapacity * 0.965),
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

interface MeasuredParagraph {
  displayStart: number;
  element: HTMLParagraphElement;
  isEmpty: boolean;
  isFlowTitle: boolean;
  lineStart: number;
}

const FLOW_ARTICLE_TITLE_MARKER = "\ue000openclassbook-flow-title:";

interface FlowPreviewArticle {
  body: string;
  title: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export function buildFlowPreviewBody(
  body: string,
  continuations: FlowPreviewArticle[],
) {
  return [
    body,
    ...continuations.map(
      (article, index) =>
        `${FLOW_ARTICLE_TITLE_MARKER}${index}\n${article.body}`,
    ),
  ].join("\n\n\n\n");
}

function getFlowTitleIndex(line: string) {
  if (!line.startsWith(FLOW_ARTICLE_TITLE_MARKER)) return null;
  const index = Number(line.slice(FLOW_ARTICLE_TITLE_MARKER.length));
  return Number.isInteger(index) && index >= 0 ? index : null;
}

function getMeasuredPageLines(body: string, start: number, end: number) {
  const slice = body.slice(start, end);
  const lines = slice.split("\n");
  if (end < body.length && slice.endsWith("\n")) lines.pop();
  return lines.length ? lines : [""];
}

function appendMeasuredParagraphs(
  container: HTMLElement,
  body: string,
  start: number,
  template: Template,
  flowArticles: FlowPreviewArticle[],
) {
  const paragraphs: MeasuredParagraph[] = [];
  let lineStart = start;

  body.slice(start).split("\n").forEach((line, lineIndex) => {
    const paragraph = document.createElement("p");
    const flowTitleIndex = getFlowTitleIndex(line);
    const flowTitle =
      flowTitleIndex === null ? undefined : flowArticles[flowTitleIndex]?.title;
    const trimmed = line.trimStart();
    const quotePrefix =
      flowTitle === undefined && template.quoteStyle
        ? trimmed.match(/^>\s?/)?.[0]
        : undefined;
    const leadingWhitespace = line.length - trimmed.length;
    const removedCharacters = quotePrefix
      ? leadingWhitespace + quotePrefix.length
      : 0;
    const displayLine = flowTitle ?? (quotePrefix ? trimmed.slice(quotePrefix.length) : line);

    paragraph.dataset.measureLine = String(lineIndex + 1);
    paragraph.dataset.measureQuote = quotePrefix ? "true" : "false";
    paragraph.style.borderLeft = quotePrefix
      ? `2px solid ${template.accentColor}`
      : "";
    paragraph.style.boxSizing = "border-box";
    paragraph.style.fontStyle = quotePrefix ? "italic" : "";
    paragraph.style.margin = "0";
    paragraph.style.minHeight = flowTitle
      ? `${Math.max(10, template.titleSize * 0.5) * 1.25}px`
      : `${template.lineHeight}em`;
    paragraph.style.paddingLeft = quotePrefix ? "0.7em" : "";
    paragraph.style.textIndent = line && !flowTitle
      ? `${template.firstLineIndent}em`
      : "0";
    if (flowTitle) {
      paragraph.dataset.measureFlowTitle = "true";
      paragraph.style.breakInside = "avoid";
      paragraph.style.color = template.themeColor;
      paragraph.style.fontFamily = getFontFamilyStyle(template.titleFont);
      paragraph.style.fontSize = `${Math.max(10, template.titleSize * 0.5)}px`;
      paragraph.style.fontWeight = template.titleBold ? "700" : "400";
      paragraph.style.lineHeight = "1.25";
      paragraph.style.maxWidth = "100%";
      paragraph.style.width = template.titleSurfaceEnabled ? "fit-content" : "100%";
      paragraph.style.marginLeft =
        template.titleAlign === "right" || template.titleAlign === "center"
          ? "auto"
          : "0";
      paragraph.style.marginRight =
        template.titleAlign === "left" || template.titleAlign === "center"
          ? "auto"
          : "0";
      paragraph.style.textAlign = template.titleAlign;
    }
    paragraph.textContent = displayLine || "\u00a0";
    container.append(paragraph);
    paragraphs.push({
      displayStart: lineStart + removedCharacters,
      element: paragraph,
      isEmpty: displayLine.length === 0,
      isFlowTitle: flowTitle !== undefined,
      lineStart,
    });
    lineStart += line.length + 1;
  });

  return paragraphs;
}

function applyMeasurementStyle(
  element: HTMLElement,
  style: CSSProperties,
) {
  Object.entries(style).forEach(([property, value]) => {
    if (value === undefined || value === null) return;
    const cssProperty = property.replace(
      /[A-Z]/g,
      (character) => `-${character.toLowerCase()}`,
    );
    element.style.setProperty(
      cssProperty,
      typeof value === "number" && value !== 0 ? `${value}px` : String(value),
    );
  });
}

function insertMeasuredImageSpacer(
  paragraphs: MeasuredParagraph[],
  insertion: WrapInsertion,
  style: CSSProperties,
) {
  const paragraph = paragraphs[insertion.line]?.element;
  const textNode = paragraph?.firstChild;
  if (!(textNode instanceof Text) || !paragraph) return;

  const character = clamp(insertion.character, 0, textNode.length);
  const followingText = textNode.splitText(character);
  const spacer = document.createElement("span");
  spacer.setAttribute("aria-hidden", "true");
  applyMeasurementStyle(spacer, style);
  spacer.style.visibility = "hidden";
  paragraph.insertBefore(spacer, followingText);
}

function getMeasuredPageEnd(
  container: HTMLElement,
  paragraphs: MeasuredParagraph[],
  bodyLength: number,
  start: number,
  columns: 1 | 2,
) {
  const characters: Array<{
    firstInParagraph: boolean;
    node: Text;
    offset: number;
    sourceOffset: number;
  }> = [];

  paragraphs.forEach((paragraph) => {
    const walker = document.createTreeWalker(
      paragraph.element,
      NodeFilter.SHOW_TEXT,
    );
    let displayOffset = 0;
    let node = walker.nextNode();
    while (node) {
      if (node instanceof Text) {
        for (let offset = 0; offset < node.length; offset += 1) {
          characters.push({
            firstInParagraph: displayOffset === 0 && offset === 0,
            node,
            offset,
            sourceOffset: paragraph.isEmpty
              ? paragraph.lineStart
              : paragraph.displayStart + displayOffset + offset,
          });
        }
        displayOffset += node.length;
      }
      node = walker.nextNode();
    }
  });

  if (!characters.length) return bodyLength;
  const bounds = container.getBoundingClientRect();
  const overflows = (index: number) => {
    const character = characters[index];
    const range = document.createRange();
    range.setStart(character.node, character.offset);
    range.setEnd(character.node, character.offset + 1);
    const rect = range.getBoundingClientRect();
    return columns === 2
      ? rect.left > bounds.right + 0.5
      : rect.bottom > bounds.bottom + 0.5;
  };

  const overflowIndex = characters.findIndex((_character, index) =>
    overflows(index),
  );
  if (overflowIndex < 0) return bodyLength;
  const firstOverflow = characters[overflowIndex];
  const paragraph = paragraphs.find((candidate) =>
    candidate.element.contains(firstOverflow.node),
  );
  return paragraph?.isFlowTitle
    ? paragraph.lineStart
    : firstOverflow.firstInParagraph && paragraph
    ? paragraph.lineStart
    : firstOverflow.sourceOffset;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function getFlowImageLayout(
  position: PreviewArticle["imagePosition"],
  imageWrap: ImageWrap,
  imageSize: PreviewArticle["imageSize"],
  bounds: { height: number; width: number },
  columns: 1 | 2,
  columnGap: number,
) {
  if (!bounds.width) {
    return {
      left: 0,
      placeOnLeft: position.x <= 50,
      width: 0,
      widthInColumn: imageSize.width,
      widthInPage: imageSize.width,
    };
  }
  const columnWidth = (bounds.width - columnGap * (columns - 1)) / columns;
  const columnSpan = columnWidth + columnGap;
  const column = clamp(
    Math.floor(((position.x / 100) * bounds.width) / columnSpan),
    0,
    columns - 1,
  );
  const columnLeft = column * columnSpan;
  const localX = (position.x / 100) * bounds.width - columnLeft;
  const placeOnLeft = localX <= columnWidth / 2;
  const width = Math.min((imageSize.width / 100) * bounds.width, columnWidth);
  const left =
    imageWrap === "topBottom"
      ? columnLeft + (columnWidth - width) / 2
      : columnLeft + (placeOnLeft ? 0 : columnWidth - width);

  return {
    left,
    placeOnLeft,
    width,
    widthInColumn: (width / columnWidth) * 100,
    widthInPage: bounds.width ? (width / bounds.width) * 100 : imageSize.width,
  };
}

function getFlowImageStyle(
  position: PreviewArticle["imagePosition"],
  imageWrap: ImageWrap,
  imageSize: PreviewArticle["imageSize"],
  bounds: { height: number; width: number },
  columns: 1 | 2,
  columnGap: number,
): CSSProperties {
  const layout = getFlowImageLayout(
    position,
    imageWrap,
    imageSize,
    bounds,
    columns,
    columnGap,
  );
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
    float: layout.placeOnLeft ? "left" : "right",
    height: `${height + gap * 2}px`,
    marginLeft: layout.placeOnLeft ? 0 : `${gap}px`,
    marginRight: layout.placeOnLeft ? `${gap}px` : 0,
    shapeOutside: "margin-box",
    width: `${layout.widthInColumn}%`,
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
  targetX: number,
  targetY: number,
): WrapInsertion {
  const paragraphs = Array.from(
    measurement.querySelectorAll<HTMLElement>("[data-measure-line]"),
  );
  const measurementRect = measurement.getBoundingClientRect();
  const columns = getComputedStyle(measurement).columnCount === "2" ? 2 : 1;
  const columnBoundary = measurementRect.left + measurementRect.width / 2;

  let closest: (WrapInsertion & { distance: number; top: number }) | null = null;
  for (const [line, paragraph] of paragraphs.entries()) {
    if (paragraph.dataset.measureQuote === "true") continue;
    const textNode = paragraph.firstChild;
    const text = textNode?.textContent ?? "";
    if (!(textNode instanceof Text) || !text) continue;
    const rects = new Map<number, DOMRect>();
    const rectAt = (character: number) => {
      const cached = rects.get(character);
      if (cached) return cached;
      const rect = getCharacterRect(textNode, character);
      rects.set(character, rect);
      return rect;
    };
    const targetColumn = columns === 2 && targetX >= columnBoundary ? 1 : 0;
    const characterColumn = (character: number) =>
      columns === 2 && rectAt(character).left >= columnBoundary ? 1 : 0;
    let start = 0;
    let end = text.length;

    if (targetColumn === 1) {
      while (start < end) {
        const middle = Math.floor((start + end) / 2);
        if (characterColumn(middle) < targetColumn) start = middle + 1;
        else end = middle;
      }
      if (start >= text.length || characterColumn(start) !== targetColumn) continue;
      end = text.length;
    } else if (columns === 2) {
      while (start < end) {
        const middle = Math.floor((start + end) / 2);
        if (characterColumn(middle) <= targetColumn) start = middle + 1;
        else end = middle;
      }
      end = start;
      start = 0;
      if (end === 0) continue;
    }

    let low = start;
    let high = Math.max(start, end - 1);
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (rectAt(middle).bottom < targetY) low = middle + 1;
      else high = middle;
    }

    const rect = rectAt(low);
    const horizontalDistance =
      targetX < rect.left
        ? rect.left - targetX
        : targetX > rect.right
          ? targetX - rect.right
          : 0;
    const verticalDistance =
      targetY < rect.top
        ? rect.top - targetY
        : targetY > rect.bottom
          ? targetY - rect.bottom
          : 0;
    const distance = verticalDistance * 4 + horizontalDistance;
    if (!closest || distance < closest.distance) {
      closest = { character: low, distance, line, top: rect.top };
    }
  }

  if (closest) {
    const paragraph = paragraphs[closest.line];
    const textNode = paragraph.firstChild as Text;
    let character = closest.character;
    while (character > 0) {
      const previous = getCharacterRect(textNode, character - 1);
      const current = getCharacterRect(textNode, character);
      if (Math.abs(previous.top - closest.top) >= 1 || previous.right > current.left + 1) break;
      character -= 1;
    }
    return { character, line: closest.line };
  }

  let lastLine = Math.max(0, paragraphs.length - 1);
  while (
    lastLine > 0 &&
    paragraphs[lastLine]?.dataset.measureQuote === "true"
  ) {
    lastLine -= 1;
  }
  return {
    character: paragraphs[lastLine]?.textContent?.length ?? 0,
    line: lastLine,
  };
}

export interface PublicationPreviewArticle extends PreviewArticle {
  authorMeta?: string;
  id?: number | string;
}

interface PublicationArticlePreviewProps {
  article: PublicationPreviewArticle;
  articlePageMode: "flow" | "single";
  bookTitle: string;
  compact?: boolean;
  focused?: boolean;
  flowArticles?: PublicationPreviewArticle[];
  language: Language;
  onImagePageChange?: (page: number) => void;
  onImagePositionChange?: (position: PreviewArticle["imagePosition"]) => void;
  onImageSizeChange?: (size: PreviewArticle["imageSize"]) => void;
  pageNumberOffset?: number;
  readOnly?: boolean;
  template: Template;
  visualScale?: number;
}

export function PublicationArticlePreview({
  article,
  articlePageMode,
  bookTitle,
  compact = false,
  focused = false,
  flowArticles = [],
  language,
  onImagePageChange,
  onImagePositionChange,
  onImageSizeChange,
  pageNumberOffset = 0,
  readOnly = false,
  template,
  visualScale = 1,
}: PublicationArticlePreviewProps) {
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
          widthMm: template.customPageWidth,
        }
      : paperStyles[template.pageSize];
  const displayedPaperWidth = compact
    ? Math.min(250, paper.maxWidth)
    : paper.maxWidth;
  const previewScale = displayedPaperWidth / paper.maxWidth;
  const pageMargin = marginRatios[template.pageMargin];
  const pagePadding = `${displayedPaperWidth * pageMargin.vertical}px ${displayedPaperWidth * pageMargin.horizontal}px`;
  const showNumber =
    Boolean(article.number) &&
    template.showNumber &&
    template.numberPosition !== "hidden";
  const subtitle = getTemplateSubtitle(template, article.subtitle);
  const publicationBody = useMemo(
    () =>
      articlePageMode === "flow" && flowArticles.length
        ? buildFlowPreviewBody(article.body, flowArticles)
        : article.body,
    [article.body, articlePageMode, flowArticles],
  );
  const estimatedPages = useMemo(
    () =>
      paginateArticle(
        publicationBody,
        article.imageUrl,
        article.imagePage,
        template,
      ),
    [article.imagePage, article.imageUrl, publicationBody, template],
  );
  const estimatedImagePage = Math.max(
    0,
    estimatedPages.findIndex((page) => page.showImage),
  );
  const [previewImagePosition, setPreviewImagePosition] = useState(
    article.imagePosition,
  );
  const [previewImageSize, setPreviewImageSize] = useState(article.imageSize);
  const [previewImagePage, setPreviewImagePage] = useState(estimatedImagePage);
  const [isInteracting, setIsInteracting] = useState(false);
  const paginationKey = JSON.stringify({
    article: {
      authorMeta: article.authorMeta,
      body: publicationBody,
      imageUrl: article.imageUrl,
      number: article.number,
      subtitle,
      title: article.title,
    },
    bookTitle,
    compact,
    image: {
      page: previewImagePage,
      position: previewImagePosition,
      size: previewImageSize,
      wrap: article.imageWrap,
    },
    template,
  });
  const [measuredPagination, setMeasuredPagination] = useState<{
    key: string;
    pages: PreviewPage[];
  } | null>(null);
  const pages =
    measuredPagination?.key === paginationKey
      ? measuredPagination.pages
      : estimatedPages;
  const resolvedImagePage = Math.max(
    0,
    pages.findIndex((page) => page.showImage),
  );
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
  const bodyFontSize = Math.max(7.5, template.bodySize * previewScale);
  const activeColumns = getPreviewColumnCount(template);
  const columnGap = getPreviewColumnGap(template, bodyFontSize);
  const flowImageLayout = getFlowImageLayout(
    previewImagePosition,
    article.imageWrap,
    previewImageSize,
    imageBounds,
    activeColumns,
    columnGap,
  );
  const displayedImageSize = isOverlayImage
    ? previewImageSize
    : { ...previewImageSize, width: flowImageLayout.widthInPage };

  useEffect(() => {
    if (!isInteracting) {
      setPreviewImagePosition(article.imagePosition);
      setPreviewImageSize(article.imageSize);
      setPreviewImagePage(resolvedImagePage);
    }
  }, [article.imagePosition, article.imageSize, isInteracting, resolvedImagePage]);

  useEffect(() => {
    if (!template.allowImages || !article.imageUrl) return;
    const imageBoundsElement = pageContentRefs.current[previewImagePage];
    if (!imageBoundsElement) return;
    const updateBounds = () => {
      const bounds = imageBoundsElement.getBoundingClientRect();
      setImageBounds({
        width: bounds.width / visualScale,
        height: bounds.height / visualScale,
      });
      const body = bodyRefs.current[previewImagePage];
      setImageTopBoundary(
        body
          ? Math.max(
              0,
              (body.getBoundingClientRect().top - bounds.top) / visualScale,
            )
          : 0,
      );
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(imageBoundsElement);
    const body = bodyRefs.current[previewImagePage];
    if (body) observer.observe(body);
    return () => observer.disconnect();
  }, [
    article.imageUrl,
    article.number,
    article.title,
    pages.length,
    previewImagePage,
    showNumber,
    subtitle,
    template.allowImages,
    template.numberPosition,
    template.subtitleAlign,
    template.titleAlign,
    template.titleBold,
    template.titleFont,
    template.titleSize,
    template.titleSpacing,
    visualScale,
  ]);

  useLayoutEffect(() => {
    if (isInteracting) return;
    const firstBody = bodyRefs.current[0];
    const firstContent = pageContentRefs.current[0];
    if (!firstBody || !firstContent) return;

    const normalizedBody = publicationBody.replace(/\r\n/g, "\n");
    const firstBodyBounds = firstBody.getBoundingClientRect();
    const header = firstContent.querySelector<HTMLElement>(":scope > header");
    const headerStyle = header ? getComputedStyle(header) : null;
    const headerHeight = header
      ? header.getBoundingClientRect().height / visualScale +
        Number.parseFloat(headerStyle?.marginTop || "0") +
        Number.parseFloat(headerStyle?.marginBottom || "0")
      : 0;
    // Derive continuation-page capacity from the fixed paper frame instead of
    // reading page 2. Reading a conditionally rendered page made pagination
    // alternate between two different capacities and caused visible shaking.
    const followingBodyHeight =
      firstContent.getBoundingClientRect().height / visualScale - headerHeight;
    const hasImage = template.allowImages && Boolean(article.imageUrl);
    const canMeasureImage = hasImage && imageBounds.width > 0 && imageBounds.height > 0;

    const measurePages = (imagePage: number | null) => {
      const measuredPages: PreviewPage[] = [];
      let start = 0;
      let pageIndex = 0;

      do {
        const container = document.createElement("div");
        container.setAttribute("aria-hidden", "true");
        Object.assign(container.style, {
          boxSizing: "border-box",
          fontFamily: getFontFamilyStyle(template.bodyFont),
          fontSize: `${bodyFontSize}px`,
          height: `${Math.max(
            1,
            pageIndex === 0
              ? firstBodyBounds.height / visualScale
              : followingBodyHeight,
          )}px`,
          left: "-100000px",
          lineHeight: String(template.lineHeight),
          overflow: "visible",
          overflowWrap: "break-word",
          pointerEvents: "none",
          position: "fixed",
          textAlign: template.justify ? "justify" : "left",
          top: "0",
          visibility: "hidden",
          whiteSpace: "pre-wrap",
          width: `${firstBodyBounds.width / visualScale}px`,
        });
        if (activeColumns === 2) {
          container.style.columnCount = "2";
          container.style.columnFill = "auto";
          container.style.columnGap = `${columnGap}px`;
        }
        document.body.append(container);

        if (
          pageIndex === 0 &&
          template.showAuthorMeta &&
          article.authorMeta
        ) {
          const authorMeta = document.createElement("p");
          authorMeta.textContent = article.authorMeta;
          Object.assign(authorMeta.style, {
            color: template.accentColor,
            fontWeight: "600",
            letterSpacing: "0.025em",
            margin: "0 0 8px",
          });
          container.append(authorMeta);
        }

        const paragraphs = appendMeasuredParagraphs(
          container,
          normalizedBody,
          start,
          template,
          flowArticles,
        );
        const showsImage = imagePage === pageIndex;
        if (showsImage && canMeasureImage && !isOverlayImage) {
          const bounds = container.getBoundingClientRect();
          const insertion = findWrapInsertion(
            container,
            bounds.left + (previewImagePosition.x / 100) * bounds.width,
            bounds.top +
              imagePixelTop -
              imageTopBoundary -
              getWrapGap(article.imageWrap),
          );
          insertMeasuredImageSpacer(
            paragraphs,
            insertion,
            getFlowImageStyle(
              previewImagePosition,
              article.imageWrap,
              previewImageSize,
              imageBounds,
              activeColumns,
              columnGap,
            ),
          );
        }

        let end = getMeasuredPageEnd(
          container,
          paragraphs,
          normalizedBody.length,
          start,
          activeColumns,
        );
        container.remove();
        if (end <= start && start < normalizedBody.length) {
          end = Math.min(normalizedBody.length, start + 1);
        }
        measuredPages.push({
          lines: getMeasuredPageLines(normalizedBody, start, end),
          showImage: showsImage,
        });
        start = end;
        pageIndex += 1;
      } while (start < normalizedBody.length);

      return measuredPages;
    };

    const pagesWithoutImage = measurePages(null);
    const imagePage = hasImage
      ? article.imagePage < 0
        ? pagesWithoutImage.length - 1
        : clamp(previewImagePage, 0, pagesWithoutImage.length - 1)
      : null;
    const nextPages = imagePage === null
      ? pagesWithoutImage
      : measurePages(imagePage);
    setMeasuredPagination((current) => {
      const unchanged =
        current?.key === paginationKey &&
        current.pages.length === nextPages.length &&
        current.pages.every(
          (page, index) =>
            page.showImage === nextPages[index]?.showImage &&
            page.lines.length === nextPages[index]?.lines.length &&
            page.lines.every(
              (line, lineIndex) => line === nextPages[index]?.lines[lineIndex],
            ),
        );
      return unchanged ? current : { key: paginationKey, pages: nextPages };
    });
  }, [
    activeColumns,
    article.authorMeta,
    article.imagePage,
    article.imageUrl,
    article.imageWrap,
    bodyFontSize,
    columnGap,
    imageBounds,
    imagePixelTop,
    imageTopBoundary,
    isInteracting,
    isOverlayImage,
    paginationKey,
    previewImagePage,
    previewImagePosition,
    previewImageSize,
    publicationBody,
    flowArticles,
    template,
    visualScale,
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
    const contentLeft = content.getBoundingClientRect().left;
    const imageCenterX =
      contentLeft + (previewImagePosition.x / 100) * imageBounds.width;
    const insertion = findWrapInsertion(measurement, imageCenterX, imageTop);

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
    imageBounds.width,
    imagePixelTop,
    isOverlayImage,
    pages,
    previewImagePage,
    previewImagePosition.y,
    previewImagePosition.x,
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
    size = displayedImageSize,
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
    x: isOverlayImage
      ? (previewImagePosition.x / 100) * imageBounds.width -
        (displayedImageSize.width / 100) * imageBounds.width * 0.5
      : flowImageLayout.left,
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
    <div
      aria-hidden="true"
      data-preview-image-spacer="true"
      style={{
        ...getFlowImageStyle(
          previewImagePosition,
          article.imageWrap,
          previewImageSize,
          imageBounds,
          activeColumns,
          columnGap,
        ),
        alignItems: "center",
        display: article.imageWrap === "topBottom" ? "flex" : undefined,
        justifyContent: "center",
      }}
    >
      {article.imageWrap === "topBottom" ? (
        <figure
          className="overflow-hidden bg-slate-50 shadow-md"
          style={{
            border: template.imageBorder ? "1px solid #e2e8f0" : "none",
            borderRadius: `${template.imageRadius * previewScale}px`,
            height: `${imagePixelHeight}px`,
            maxWidth: "100%",
            width: `${flowImageLayout.width}px`,
          }}
        >
          <img
            alt=""
            className="size-full object-cover"
            draggable={false}
            src={article.imageUrl}
          />
        </figure>
      ) : null}
    </div>
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
        height: `${displayedImageSize.height}%`,
        width: `${displayedImageSize.width}%`,
      }}
      style={{
        opacity: article.imageWrap === "behindText" ? 0.38 : 1,
        zIndex: article.imageWrap === "behindText" ? 0 : 4,
      }}
      tabIndex={readOnly ? -1 : 0}
    >
      <figure
        className="relative size-full overflow-hidden bg-slate-50 shadow-md"
        style={{
          border: readOnly
            ? template.imageBorder
              ? "1px solid #e2e8f0"
              : "none"
            : "1px solid rgb(96 165 250 / 0.7)",
          borderRadius: `${template.imageRadius * previewScale}px`,
        }}
      >
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

  const titleSurfaceOpacity =
    clamp(template.titleSurfaceOpacity, 0, 100) / 100;
  const titleSurfacePaddingX = Math.max(8, 13 * previewScale);
  const titleSurfacePaddingY = Math.max(4, 7 * previewScale);
  const titleJustifyContent = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
  }[template.titleAlign];
  const renderTitle = (
    titleText: string,
    subtitleText = "",
    isFlowTitle = false,
  ) => (
    <div
      data-flow-article-title={isFlowTitle ? "true" : undefined}
      style={{
        breakInside: isFlowTitle ? "avoid" : undefined,
        display: "flex",
        justifyContent: titleJustifyContent,
      }}
    >
      <div
        style={{
          maxWidth: "100%",
          position: "relative",
          width: template.titleSurfaceEnabled ? "fit-content" : "100%",
        }}
      >
        {template.titleSurfaceEnabled && (
          <span
            aria-hidden="true"
            data-title-surface="true"
            style={{
              backdropFilter:
                titleSurfaceOpacity > 0
                  ? "blur(5px) saturate(0.9)"
                  : undefined,
              background: `rgba(255,255,255,${titleSurfaceOpacity})`,
              border: `1px solid rgba(255,255,255,${titleSurfaceOpacity * 0.75})`,
              borderRadius: `${Math.max(7, 11 * previewScale)}px`,
              bottom: `-${titleSurfacePaddingY}px`,
              boxShadow: `0 ${Math.max(3, 5 * previewScale)}px ${Math.max(10, 18 * previewScale)}px rgba(15,23,42,${titleSurfaceOpacity * 0.14})`,
              left: `-${titleSurfacePaddingX}px`,
              position: "absolute",
              right: `-${titleSurfacePaddingX}px`,
              top: `-${titleSurfacePaddingY}px`,
            }}
          />
        )}
        <h2
          className="relative break-words text-slate-950"
          style={{
            fontFamily: getFontFamilyStyle(template.titleFont),
            fontSize: `${Math.max(10, template.titleSize * previewScale)}px`,
            fontWeight: template.titleBold ? 700 : 400,
            lineHeight: 1.25,
            textAlign: template.titleAlign,
            color: template.themeColor,
          }}
        >
          {titleText || "\u00a0"}
        </h2>
        {subtitleText && (
          <p
            className="relative mt-2 break-words text-slate-500"
            style={{
              fontFamily: getFontFamilyStyle(template.titleFont),
              fontSize: `${Math.max(compact ? 7 : 12, template.titleSize * 0.5 * previewScale)}px`,
              lineHeight: 1.4,
              textAlign: template.subtitleAlign,
            }}
          >
            {subtitleText}
          </p>
        )}
      </div>
    </div>
  );
  const title = renderTitle(article.title, subtitle);
  return (
    <section
      className={compact ? "contents" : "overflow-hidden rounded-xl border border-border bg-card shadow-xl"}
      data-article-page-mode={articlePageMode}
      style={{ zoom: visualScale }}
    >
      {!compact ? <header className="flex h-12 items-center justify-between border-b border-border px-4">
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
      </header> : null}

      <div className={compact ? "flex flex-col items-center gap-4" : "flex flex-col items-center gap-6 overflow-x-auto bg-muted/40 p-5 sm:p-8 xl:p-10"}>
        {article.imageUrl && !readOnly && (
          <p className="flex items-center gap-2 self-center text-[10px] font-medium text-muted-foreground">
            <Move className="size-3" />
            {copy.imageHelp}
          </p>
        )}
        {pages.map((page, pageIndex) => {
          const isFirstPage = pageIndex === 0;
          const pageNumber = pageNumberOffset + pageIndex + 1;
          const pageColumns = getPreviewColumnCount(template);
          const chrome = getPublicationPageChrome({
            bookTitle,
            pageNumber,
            template,
          });
          const wrapInsertion = wrapInsertions[pageIndex] ?? {
            character: 0,
            line: 0,
          };

          return (
            <article
              aria-label={`${paper.label} ${copy.title} ${pageNumber}`}
              className={`relative w-full text-slate-800 shadow-[0_20px_70px_rgba(0,0,0,0.48)] ring-black/10 transition-all duration-200 ${focused && isFirstPage ? "ring-2 ring-blue-500/40" : "ring-1"} ${page.showImage && isInteracting ? "z-10 overflow-visible" : "overflow-hidden"}`}
              data-article-first-page={isFirstPage ? article.id : undefined}
              key={pageNumber}
              style={{
                aspectRatio: paper.aspectRatio,
                containerType: "inline-size",
                // Publication pagination is based on the physical paper width,
                // not the width of the surrounding editor/review grid. Keeping
                // that width stable makes both surfaces match the exported PDF.
                minWidth: compact ? undefined : `${paper.maxWidth}px`,
                maxWidth: `${displayedPaperWidth}px`,
                padding: pagePadding,
                backgroundColor: template.backgroundColor,
                backgroundImage: `url(${getTemplateAssetUrl(template.templateId, "article_background")})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }}
            >
              <div className="flex h-full flex-col">
                <div
                  className={`relative flex min-h-0 flex-1 flex-col ${template.titleSurfaceEnabled || (page.showImage && isInteracting) ? "overflow-visible" : "overflow-hidden"}`}
                  ref={(element) => {
                    pageContentRefs.current[pageIndex] = element;
                  }}
                >
                  {chrome.showHeader && (
                    <header
                      className="mb-4 flex items-center justify-between border-b-2 pb-2 font-semibold tracking-[0.14em]"
                      style={{
                        borderColor: template.accentColor,
                        color: template.themeColor,
                        fontSize: `${8 * previewScale}px`,
                        fontFamily: publicationChromeFontFamily,
                      }}
                    >
                      <span>{chrome.headerText}</span>
                    </header>
                  )}
                  {isFirstPage &&
                    showNumber &&
                    template.numberPosition === "above" && (
                      <p
                        className="mb-3 font-medium tracking-[0.16em] text-slate-500"
                        style={{ fontSize: `${12 * previewScale}px`, textAlign: template.titleAlign }}
                      >
                        {article.number}
                      </p>
                    )}

                  {isFirstPage &&
                    (showNumber && template.numberPosition === "left" ? (
                      <div className="grid grid-cols-[auto_1fr] items-baseline gap-4">
                        <span className="font-medium tracking-[0.12em] text-slate-500" style={{ fontSize: `${12 * previewScale}px` }}>
                          {article.number}
                        </span>
                        {title}
                      </div>
                    ) : (
                      title
                    ))}

                  <div
                    className="min-h-0 flex-1 overflow-hidden break-words whitespace-pre-wrap"
                    data-preview-body={pageNumber}
                    ref={(element) => {
                      bodyRefs.current[pageIndex] = element;
                    }}
                    style={{
                      fontFamily: getFontFamilyStyle(template.bodyFont),
                      fontSize: `${Math.max(7.5, template.bodySize * previewScale)}px`,
                      lineHeight: template.lineHeight,
                      marginTop: isFirstPage
                        ? `${template.titleSpacing * previewScale}px`
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
                      className="pointer-events-none absolute inset-x-0 top-0 max-h-full invisible overflow-hidden"
                      ref={(element) => {
                        measurementRefs.current[pageIndex] = element;
                      }}
                      style={{
                        columnCount: pageColumns === 2 ? 2 : undefined,
                        columnFill: pageColumns === 2 ? "auto" : undefined,
                        columnGap: pageColumns === 2 ? `${columnGap}px` : undefined,
                        height: pageColumns === 2 ? "100%" : undefined,
                      }}
                    >
                      {page.lines.map((line, lineIndex) => {
                        const isQuoteLine =
                          template.quoteStyle &&
                          line.trimStart().startsWith(">");
                        return (
                          <p
                            data-measure-line={lineIndex + 1}
                            data-measure-quote={isQuoteLine ? "true" : "false"}
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
                        );
                      })}
                    </div>
                    <div
                      data-preview-flow={pageNumber}
                      style={{
                        columnCount: pageColumns === 2 ? 2 : undefined,
                        columnFill: pageColumns === 2 ? "auto" : undefined,
                        columnGap: pageColumns === 2 ? `${columnGap}px` : undefined,
                        columnRule:
                          pageColumns === 2
                            ? `1px solid ${template.accentColor}33`
                            : undefined,
                        height: pageColumns === 2 ? "100%" : undefined,
                      }}
                    >
                      {isFirstPage && template.showAuthorMeta && article.authorMeta ? (
                        <p
                          className="mb-2 font-semibold tracking-wide"
                          style={{ color: template.accentColor }}
                        >
                          {article.authorMeta}
                        </p>
                      ) : null}
                      {page.lines.map((line, lineIndex) => {
                        const flowTitleIndex = getFlowTitleIndex(line);
                        const flowArticle =
                          flowTitleIndex === null
                            ? undefined
                            : flowArticles[flowTitleIndex];
                        if (flowArticle !== undefined) {
                          return (
                            <div
                              data-measure-flow-title="true"
                              key={`${lineIndex}-${flowArticle.title}`}
                            >
                              {renderTitle(
                                flowArticle.title,
                                getTemplateSubtitle(
                                  template,
                                  flowArticle.subtitle,
                                ),
                                true,
                              )}
                            </div>
                          );
                        }
                        const insertsImage =
                          page.showImage &&
                          !isOverlayImage &&
                          lineIndex === wrapInsertion.line;
                        const character = insertsImage
                          ? clamp(wrapInsertion.character, 0, line.length)
                          : 0;
                        const isQuoteLine =
                          template.quoteStyle && line.trimStart().startsWith(">");
                        const displayLine = isQuoteLine
                          ? line.trimStart().replace(/^>\s?/, "")
                          : line;
                        const displayCharacter = clamp(
                          character,
                          0,
                          displayLine.length,
                        );
                        const renderLineText = (text: string) =>
                          isQuoteLine ? (
                            <span
                              style={{
                                borderLeft: `2px solid ${template.accentColor}`,
                                display: "block",
                                fontStyle: "italic",
                                minHeight: `${template.lineHeight}em`,
                                paddingLeft: "0.7em",
                                textIndent: text
                                  ? `${template.firstLineIndent}em`
                                  : 0,
                              }}
                            >
                              {text || "\u00a0"}
                            </span>
                          ) : (
                            text || "\u00a0"
                          );

                        if (
                          insertsImage &&
                          article.imageWrap === "topBottom"
                        ) {
                          return (
                            <>
                              {displayCharacter > 0 ? (
                                <p
                                  data-preview-line={lineIndex + 1}
                                  style={{
                                    minHeight: `${template.lineHeight}em`,
                                    textIndent: !isQuoteLine
                                      ? `${template.firstLineIndent}em`
                                      : 0,
                                  }}
                                >
                                  {renderLineText(
                                    displayLine.slice(0, displayCharacter),
                                  )}
                                </p>
                              ) : null}
                              {renderWrapSpacer()}
                              {displayCharacter < displayLine.length ||
                              displayLine.length === 0 ? (
                                <p
                                  data-preview-line={lineIndex + 1}
                                  style={{
                                    minHeight: `${template.lineHeight}em`,
                                    textIndent: !isQuoteLine
                                      ? `${template.firstLineIndent}em`
                                      : 0,
                                  }}
                                >
                                  {renderLineText(
                                    displayLine.slice(displayCharacter),
                                  )}
                                </p>
                              ) : null}
                            </>
                          );
                        }

                        return (
                          <p
                            data-preview-line={lineIndex + 1}
                            key={`${lineIndex}-${line.slice(0, 12)}`}
                            style={{
                              minHeight: `${template.lineHeight}em`,
                              textIndent: line && !isQuoteLine
                                ? `${template.firstLineIndent}em`
                                : 0,
                            }}
                          >
                            {insertsImage ? (
                              <>
                                {displayCharacter > 0
                                  ? renderLineText(
                                      displayLine.slice(0, displayCharacter),
                                    )
                                  : null}
                                {renderWrapSpacer()}
                                {displayCharacter < displayLine.length ||
                                displayLine.length === 0
                                  ? renderLineText(
                                      displayLine.slice(displayCharacter),
                                    )
                                  : null}
                              </>
                            ) : (
                              renderLineText(displayLine)
                            )}
                          </p>
                        );
                      })}
                    </div>
                  </div>

                  {page.showImage && article.imageWrap !== "topBottom" && renderImage(pageIndex)}
                </div>

                <PublicationPageFooter
                  footerColor={template.themeColor}
                  footerFontFamily={getFontFamilyStyle(template.footerFont)}
                  footerFontSize={template.footerSize}
                  footerText={chrome.footerText}
                  pageMargin={template.pageMargin}
                  pageNumber={pageNumber}
                  pageNumberColor={template.accentColor}
                  pageNumberPosition={template.pageNumberPosition}
                  pageWidthMm={paper.widthMm}
                  surfaceOpacity={template.chromeSurfaceOpacity}
                  showFooter={chrome.showFooter}
                  showPageNumber={chrome.showPageNumber}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export const LiveArticlePreview = PublicationArticlePreview;
