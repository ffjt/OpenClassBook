import { ApiError, apiRequest } from "@/repositories/apiClient";
import { defaultTemplate } from "@/mock/template";
import {
  isTitleSurfaceEnabledByDefault,
  type Alignment,
  type ColumnCount,
  type FontSelection,
  type NumberPosition,
  type PageMargin,
  type PageNumberPosition,
  type PageSize,
  type SubtitleMode,
  type Template,
} from "@/types/template";

export interface BookTemplate {
  id: number;
  book_id: number;
  title_format: Record<string, unknown> | null;
  body_format: Record<string, unknown> | null;
  image_rules: Record<string, unknown> | null;
  numbering_rules: Record<string, unknown> | null;
  page_rules: Record<string, unknown> | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function readFont(value: unknown, fallback: FontSelection): FontSelection {
  if (typeof value === "string") {
    return {
      family: value,
      fullName: value,
      postscriptName: value,
      style: "Regular",
    };
  }

  if (!isRecord(value)) return { ...fallback };

  return {
    family: typeof value.family === "string" ? value.family : fallback.family,
    fullName:
      typeof value.fullName === "string" ? value.fullName : fallback.fullName,
    postscriptName:
      typeof value.postscriptName === "string"
        ? value.postscriptName
        : fallback.postscriptName,
    style: typeof value.style === "string" ? value.style : fallback.style,
  };
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readOption<Value extends string | number>(
  value: unknown,
  options: readonly Value[],
  fallback: Value,
) {
  return (typeof value === "string" || typeof value === "number") &&
    options.includes(value as Value)
    ? (value as Value)
    : fallback;
}

export function deserializeTemplate(stored: BookTemplate): Template {
  const title = stored.title_format ?? {};
  const body = stored.body_format ?? {};
  const images = stored.image_rules ?? {};
  const numbering = stored.numbering_rules ?? {};
  const page = stored.page_rules ?? {};
  const presentation = isRecord(page.presentation) ? page.presentation : {};
  const templateId =
    typeof presentation.template_id === "string"
      ? presentation.template_id
      : defaultTemplate.templateId;

  return {
    templateId,
    backgroundColor:
      typeof presentation.background_color === "string"
        ? presentation.background_color
        : defaultTemplate.backgroundColor,
    themeColor:
      typeof presentation.theme_color === "string"
        ? presentation.theme_color
        : defaultTemplate.themeColor,
    accentColor:
      typeof presentation.accent_color === "string"
        ? presentation.accent_color
        : defaultTemplate.accentColor,
    columns: readOption<ColumnCount>(
      presentation.columns,
      [1, 2],
      defaultTemplate.columns,
    ),
    showHeader: readBoolean(presentation.show_header, defaultTemplate.showHeader),
    headerText:
      typeof presentation.header_text === "string"
        ? presentation.header_text
        : defaultTemplate.headerText,
    showFooter: readBoolean(presentation.show_footer, defaultTemplate.showFooter),
    footerText:
      typeof presentation.footer_text === "string"
        ? presentation.footer_text
        : defaultTemplate.footerText,
    footerFont: readFont(presentation.footer_font, defaultTemplate.footerFont),
    footerSize: Math.min(
      18,
      Math.max(
        6,
        readNumber(presentation.footer_size, defaultTemplate.footerSize),
      ),
    ),
    chromeSurfaceOpacity: Math.min(
      100,
      Math.max(
        0,
        readNumber(
          presentation.chrome_surface_opacity,
          defaultTemplate.chromeSurfaceOpacity,
        ),
      ),
    ),
    showAuthorMeta: readBoolean(
      presentation.show_author_meta,
      defaultTemplate.showAuthorMeta,
    ),
    imageRadius: readNumber(presentation.image_radius, defaultTemplate.imageRadius),
    imageBorder: readBoolean(presentation.image_border, defaultTemplate.imageBorder),
    quoteStyle: readBoolean(presentation.quote_style, defaultTemplate.quoteStyle),
    titleSurfaceEnabled: readBoolean(
      presentation.title_surface_enabled,
      isTitleSurfaceEnabledByDefault(templateId),
    ),
    titleSurfaceOpacity: Math.min(
      100,
      Math.max(
        0,
        readNumber(
          presentation.title_surface_opacity,
          defaultTemplate.titleSurfaceOpacity,
        ),
      ),
    ),
    titleFont: readFont(title.font, defaultTemplate.titleFont),
    titleSize: readNumber(title.size, defaultTemplate.titleSize),
    titleBold: readBoolean(title.bold, defaultTemplate.titleBold),
    titleAlign: readOption<Alignment>(
      title.align,
      ["left", "center", "right"],
      defaultTemplate.titleAlign,
    ),
    subtitleMode: readOption<SubtitleMode>(
      title.subtitle_mode,
      ["disabled", "fixed", "free"],
      readBoolean(title.show_subtitle, true) ? "free" : "disabled",
    ),
    fixedSubtitle:
      typeof title.fixed_subtitle === "string"
        ? title.fixed_subtitle
        : defaultTemplate.fixedSubtitle,
    subtitleAlign: readOption<Alignment>(
      title.subtitle_align,
      ["left", "center", "right"],
      defaultTemplate.subtitleAlign,
    ),
    titleSpacing: readNumber(title.spacing, defaultTemplate.titleSpacing),
    showNumber: readBoolean(numbering.show, defaultTemplate.showNumber),
    numberPosition: readOption<NumberPosition>(
      numbering.position,
      ["above", "left", "hidden"],
      defaultTemplate.numberPosition,
    ),
    bodyFont: readFont(body.font, defaultTemplate.bodyFont),
    bodySize: readNumber(body.size, defaultTemplate.bodySize),
    lineHeight: readNumber(body.line_height, defaultTemplate.lineHeight),
    firstLineIndent: readNumber(
      body.first_line_indent,
      defaultTemplate.firstLineIndent,
    ),
    justify: readBoolean(body.justify, defaultTemplate.justify),
    allowImages: readBoolean(images.allow, defaultTemplate.allowImages),
    imageAlign: readOption<Alignment>(
      images.align,
      ["left", "center", "right"],
      defaultTemplate.imageAlign,
    ),
    imageMaxWidth: readNumber(
      images.max_width,
      defaultTemplate.imageMaxWidth,
    ),
    pageSize: readOption<PageSize>(
      page.size,
      ["a4", "a5", "b5", "custom"],
      defaultTemplate.pageSize,
    ),
    pageMargin: readOption<PageMargin>(
      page.margin,
      ["narrow", "normal", "wide"],
      defaultTemplate.pageMargin,
    ),
    pageNumberPosition: readOption<PageNumberPosition>(
      page.number_position,
      ["center", "right", "hidden"],
      defaultTemplate.pageNumberPosition,
    ),
    customPageWidth: readNumber(
      page.custom_width,
      defaultTemplate.customPageWidth,
    ),
    customPageHeight: readNumber(
      page.custom_height,
      defaultTemplate.customPageHeight,
    ),
  };
}

export const templateRepository = {
  async getByBook(bookId: number) {
    try {
      return await apiRequest<BookTemplate>(`/books/${bookId}/template`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  async getSettingsByBook(bookId: number) {
    const stored = await this.getByBook(bookId);
    return stored ? deserializeTemplate(stored) : null;
  },

  async save(bookId: number, template: Template) {
    const stored = await apiRequest<BookTemplate>(`/books/${bookId}/template`, {
      body: JSON.stringify({
        title_format: {
          font: template.titleFont,
          size: template.titleSize,
          bold: template.titleBold,
          align: template.titleAlign,
          subtitle_mode: template.subtitleMode,
          fixed_subtitle: template.fixedSubtitle,
          // Retained for clients that still read the former boolean setting.
          show_subtitle: template.subtitleMode !== "disabled",
          subtitle_align: template.subtitleAlign,
          spacing: template.titleSpacing,
        },
        body_format: {
          font: template.bodyFont,
          size: template.bodySize,
          line_height: template.lineHeight,
          first_line_indent: template.firstLineIndent,
          justify: template.justify,
        },
        image_rules: {
          allow: template.allowImages,
          align: template.imageAlign,
          max_width: template.imageMaxWidth,
        },
        numbering_rules: {
          show: template.showNumber,
          position: template.numberPosition,
        },
        page_rules: {
          size: template.pageSize,
          margin: template.pageMargin,
          number_position: template.pageNumberPosition,
          custom_width: template.customPageWidth,
          custom_height: template.customPageHeight,
          presentation: {
            template_id: template.templateId,
            background_color: template.backgroundColor,
            theme_color: template.themeColor,
            accent_color: template.accentColor,
            columns: template.columns,
            show_header: template.showHeader,
            header_text: template.headerText,
            show_footer: template.showFooter,
            footer_text: template.footerText,
            footer_font: template.footerFont,
            footer_size: template.footerSize,
            chrome_surface_opacity: template.chromeSurfaceOpacity,
            show_author_meta: template.showAuthorMeta,
            image_radius: template.imageRadius,
            image_border: template.imageBorder,
            quote_style: template.quoteStyle,
            title_surface_enabled: template.titleSurfaceEnabled,
            title_surface_opacity: template.titleSurfaceOpacity,
          },
        },
      }),
      method: "PATCH",
    });
    return deserializeTemplate(stored);
  },
};
