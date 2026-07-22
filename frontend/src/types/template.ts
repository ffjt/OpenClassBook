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
export type ColumnCount = 1 | 2;

export type AppearanceAlignment = "left" | "center" | "right";
export type SpineDirection = "vertical" | "horizontal";

/** Normalized rectangles make appearance templates independent of output size. */
export interface AppearanceArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CoverTypographyProfile {
  safeArea: AppearanceArea;
  heroArea: AppearanceArea;
  title: { align: AppearanceAlignment; maxSize: number; minSize: number; weight: number };
  subtitle: { align: AppearanceAlignment; maxSize: number; minSize: number };
  meta: { align: AppearanceAlignment; maxSize: number; minSize: number };
  /** Handcrafted field slots for official covers; renderer never invents their placement. */
  layout: {
    title: FixedTypographySlot;
    subtitle: FixedTypographySlot;
    author: FixedTypographySlot;
    school: FixedTypographySlot;
    publisher: FixedTypographySlot;
    year: FixedTypographySlot;
  };
}

export interface FixedTypographySlot extends AppearanceArea {
  align: AppearanceAlignment;
  scale: number;
}

/** A reusable publishing-canvas primitive. Coordinates are percentages of its page. */
export type CanvasObjectType = "text" | "image" | "logo" | "sticker" | "qrcode" | "line";
export type CanvasTextSource =
  | "title"
  | "subtitle"
  | "author"
  | "school"
  | "publisher"
  | "year"
  | "logo"
  | "summary"
  | "copyright"
  | "custom";

export interface CanvasObject extends AppearanceArea {
  id: string;
  type: CanvasObjectType;
  source?: CanvasTextSource;
  content?: string;
  rotation: number;
  locked: boolean;
  hidden: boolean;
  fontFamily?: FontSelection;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  align?: AppearanceAlignment;
  color?: string;
  opacity?: number;
  shadow?: boolean;
  stroke?: boolean;
  uppercase?: boolean;
}

export interface BookAppearance {
  frontCover: {
    illustration: { assetKind: "cover" };
    typography: CoverTypographyProfile;
    /** Generic layer stack shared by text, logos, images and future decorations. */
    canvasObjects: CanvasObject[];
    palette: { text: string; accent: string };
  };
  spine: {
    canvasObjects: CanvasObject[];
    direction: SpineDirection;
    alignment: AppearanceAlignment;
    showAuthor: boolean;
    showSchool: boolean;
    showLogo: boolean;
    fontScale: number;
    /** Millimetres at 40 pages; calculation is deliberately isolated for future paper specs. */
    baseWidthMm: number;
    mmPerPage: number;
  };
  backCover: {
    canvasObjects: CanvasObject[];
    background: { assetKind: "cover_back" };
    summaryArea: AppearanceArea;
    footerArea: AppearanceArea;
    summaryMaxLength: number;
    footer: string;
  };
}

/** Shared in-memory contract for every book publishing surface. */
export interface Template {
  /** Built-in visual system identifier; assets are resolved from /templates/<id>. */
  templateId: string;
  /** Safe, near-white article background shared by preview and export metadata. */
  backgroundColor: string;
  themeColor: string;
  accentColor: string;
  columns: ColumnCount;
  showHeader: boolean;
  headerText: string;
  showFooter: boolean;
  footerText: string;
  footerFont: FontSelection;
  /** Footer font size in points. */
  footerSize: number;
  /** Translucent footer and page-number surface opacity from 0 to 100. */
  chromeSurfaceOpacity: number;
  showAuthorMeta: boolean;
  imageRadius: number;
  imageBorder: boolean;
  quoteStyle: boolean;
  titleSurfaceEnabled: boolean;
  /** White title-surface opacity as a percentage from 0 to 100. */
  titleSurfaceOpacity: number;

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
  /** Complete metadata-driven exterior publishing system. */
  appearance: BookAppearance;
}

export function getSpineWidthMm(appearance: BookAppearance, pageCount: number) {
  const spine = appearance.spine;
  return Math.max(spine.baseWidthMm, spine.baseWidthMm + Math.max(0, pageCount - 40) * spine.mmPerPage);
}

export type BookTemplate = Template;

export function withColumnLayout(
  template: Template,
  columns: ColumnCount,
): Template {
  const isTwoColumn = columns === 2;
  return {
    ...template,
    columns,
    pageNumberPosition: "center",
    showFooter: isTwoColumn,
    showHeader: isTwoColumn,
    subtitleAlign: isTwoColumn ? template.subtitleAlign : "center",
    titleAlign: isTwoColumn ? "left" : "center",
    titleSurfaceEnabled: isTwoColumn,
    titleSurfaceOpacity: isTwoColumn ? 15 : template.titleSurfaceOpacity,
  };
}

export function getTemplateSubtitle(
  template: Template,
  articleSubtitle = "",
): string {
  if (template.subtitleMode === "fixed") return template.fixedSubtitle;
  if (template.subtitleMode === "free") return articleSubtitle;
  return "";
}

/** Matches the CJK-safe sans font embedded by the PDF renderer for page chrome. */
export const publicationChromeFontFamily =
  '"Microsoft YaHei", "PingFang SC", sans-serif';

const defaultLayeredTitleTemplateIds = new Set([
  "spring-blossom",
  "summer-forest",
  "graduation",
]);

export function isTitleSurfaceEnabledByDefault(templateId: string) {
  return defaultLayeredTitleTemplateIds.has(templateId);
}

export function getFontFamilyStyle(font: FontSelection) {
  if (font.family === "literary-serif") {
    return '"LXGW WenKai Lite", "LXGW WenKai", "Source Han Serif SC", "Noto Serif CJK SC", serif';
  }
  if (font.family === "serif" || font.family === "sans-serif") {
    return font.family;
  }

  const safeFamily = font.family.replace(/["\\]/g, "");
  return `"${safeFamily}", sans-serif`;
}

export function getPublicationPageChrome({
  bookTitle,
  pageNumber,
  template,
}: {
  bookTitle: string;
  pageNumber: number;
  template: Template;
}) {
  return {
    footerText: template.footerText || "OpenClassBook",
    headerText: template.headerText || bookTitle,
    showFooter: template.showFooter,
    showHeader: template.showHeader,
    showPageNumber:
      pageNumber > 1 && template.pageNumberPosition !== "hidden",
  };
}
