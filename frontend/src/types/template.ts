export interface FontSelection {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
}

export type Alignment = "left" | "center" | "right";
export type NumberPosition = "above" | "left" | "hidden";
export type PageMargin = "narrow" | "normal" | "wide";
export type PageNumberPosition = "center" | "right" | "hidden";
export type PageSize = "a4" | "a5" | "b5" | "custom";
export type SubtitleMode = "disabled" | "fixed" | "free";
export type PublishingPreset = "collection" | "magazine";
export type ColumnCount = 1 | 2;

/** Shared in-memory contract for every book publishing surface. */
export interface Template {
  /** Official publishing preset. Advanced settings below override its defaults. */
  preset: PublishingPreset;
  themeColor: string;
  accentColor: string;
  columns: ColumnCount;
  showHeader: boolean;
  headerText: string;
  showFooter: boolean;
  footerText: string;
  showAuthorMeta: boolean;
  imageRadius: number;
  imageBorder: boolean;
  quoteStyle: boolean;

  titleFont: FontSelection;
  titleSize: number;
  titleBold: boolean;
  titleAlign: Alignment;

  showNumber: boolean;
  numberPosition: NumberPosition;

  bodyFont: FontSelection;
  bodySize: number;
  lineHeight: number;
  firstLineIndent: number;
  justify: boolean;

  allowImages: boolean;
  imageAlign: Alignment;
  imageMaxWidth: number;

  pageSize: PageSize;
  pageMargin: PageMargin;
  pageNumberPosition: PageNumberPosition;

  subtitleMode: SubtitleMode;
  fixedSubtitle: string;
  subtitleAlign: Alignment;
  titleSpacing: number;
  customPageWidth: number;
  customPageHeight: number;
}

export type BookTemplate = Template;

/** Matches the CJK-safe sans font embedded by the PDF renderer for page chrome. */
export const publicationChromeFontFamily =
  '"Microsoft YaHei", "PingFang SC", sans-serif';

export function getFontFamilyStyle(font: FontSelection) {
  if (font.family === "serif" || font.family === "sans-serif") {
    return font.family;
  }

  const safeFamily = font.family.replace(/["\\]/g, "");
  return `"${safeFamily}", sans-serif`;
}
