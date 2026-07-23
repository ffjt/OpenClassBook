import { ApiError } from "@/repositories/apiClient";
import {
  authorBookApiRequest,
  authenticatedApiRequest,
  authRepository,
} from "@/repositories/authRepository";
import { getTemplateCatalogEntry, isLegacyDefaultSpineTextColor } from "@/mock/template-catalog";
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
  type BookAppearance,
  type CanvasObject,
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

function serializeCanvasObject(object: CanvasObject) {
  return {
    ...object,
    font_family: object.fontFamily,
    font_size: object.fontSize,
    font_weight: object.fontWeight,
    line_height: object.lineHeight,
    letter_spacing: object.letterSpacing,
    fontFamily: undefined,
    fontSize: undefined,
    fontWeight: undefined,
    lineHeight: undefined,
    letterSpacing: undefined,
  };
}

function readAppearance(value: unknown, templateId: string, defaultFont: FontSelection): BookAppearance {
  const catalog = getTemplateCatalogEntry(templateId);
  const recolorSpineObject = (object: CanvasObject) =>
    object.type === "text" || object.type === "logo"
      ? { ...object, color: catalog.coverTextColor, fontFamily: { ...defaultFont } }
      : object;
  const fallback: BookAppearance = {
    ...defaultTemplate.appearance,
    spine: {
      ...defaultTemplate.appearance.spine,
      backgroundColor: catalog.spineColor,
      textColor: catalog.coverTextColor,
      canvasObjects: defaultTemplate.appearance.spine.canvasObjects.map(recolorSpineObject),
    },
  };
  if (!isRecord(value)) return fallback;
  const front = isRecord(value.front_cover) ? value.front_cover : {};
  const typography = isRecord(front.typography) ? front.typography : {};
  const back = isRecord(value.back_cover) ? value.back_cover : {};
  const spine = isRecord(value.spine) ? value.spine : {};
  const area = (candidate: unknown, fallbackArea: BookAppearance["frontCover"]["typography"]["safeArea"]) => {
    if (!isRecord(candidate)) return fallbackArea;
    return { x: readNumber(candidate.x, fallbackArea.x), y: readNumber(candidate.y, fallbackArea.y), width: readNumber(candidate.width, fallbackArea.width), height: readNumber(candidate.height, fallbackArea.height) };
  };
  const slot = (candidate: unknown, fallbackSlot: BookAppearance["frontCover"]["typography"]["layout"]["title"]) => ({
    ...area(candidate, fallbackSlot),
    align: isRecord(candidate) ? readOption(candidate.align, ["left", "center", "right"], fallbackSlot.align) : fallbackSlot.align,
    scale: isRecord(candidate) ? readNumber(candidate.scale, fallbackSlot.scale) : fallbackSlot.scale,
  });
  const canvasObjects: CanvasObject[] = Array.isArray(front.canvas_objects)
    ? front.canvas_objects.flatMap((candidate, index) => {
        if (!isRecord(candidate) || typeof candidate.id !== "string") return [];
        const fallbackObject = fallback.frontCover.canvasObjects[index] ?? fallback.frontCover.canvasObjects[0];
        return [{
          ...fallbackObject,
          id: candidate.id,
          type: readOption(candidate.type, ["text", "image", "logo", "sticker", "qrcode", "line"], fallbackObject.type),
          source: readOption(candidate.source, ["title", "subtitle", "author", "school", "publisher", "year", "logo", "summary", "copyright", "custom"] as const, fallbackObject.source ?? "custom") as CanvasObject["source"],
          content: typeof candidate.content === "string" ? candidate.content : fallbackObject.content,
          x: readNumber(candidate.x, fallbackObject.x), y: readNumber(candidate.y, fallbackObject.y), width: readNumber(candidate.width, fallbackObject.width), height: readNumber(candidate.height, fallbackObject.height), rotation: readNumber(candidate.rotation, 0), locked: readBoolean(candidate.locked, false), hidden: readBoolean(candidate.hidden, false),
          fontFamily: readFont(candidate.font_family, fallbackObject.fontFamily ?? defaultTemplate.titleFont), fontSize: readNumber(candidate.font_size, fallbackObject.fontSize ?? 6), fontWeight: readNumber(candidate.font_weight, fallbackObject.fontWeight ?? 400), lineHeight: readNumber(candidate.line_height, fallbackObject.lineHeight ?? 1.25), letterSpacing: readNumber(candidate.letter_spacing, fallbackObject.letterSpacing ?? 0), align: readOption(candidate.align, ["left", "center", "right"] as const, fallbackObject.align ?? "center") as CanvasObject["align"], color: typeof candidate.color === "string" ? candidate.color : fallbackObject.color, opacity: readNumber(candidate.opacity, fallbackObject.opacity ?? 100), shadow: readBoolean(candidate.shadow, false), stroke: readBoolean(candidate.stroke, false), uppercase: readBoolean(candidate.uppercase, false),
        }];
      })
    : fallback.frontCover.canvasObjects;
  const backCanvasObjects = Array.isArray(back.canvas_objects)
    ? back.canvas_objects as CanvasObject[]
    : fallback.backCover.canvasObjects;
  const normalizedBackCanvasObjects = backCanvasObjects.some((object) => object.type === "line")
    ? backCanvasObjects
    : [...backCanvasObjects, fallback.backCover.canvasObjects.find((object) => object.type === "line")!];
  return {
    frontCover: {
      illustration: { assetKind: "cover" },
      canvasObjects: canvasObjects.length ? canvasObjects : fallback.frontCover.canvasObjects,
      typography: {
        safeArea: area(typography.safe_area, fallback.frontCover.typography.safeArea),
        heroArea: area(typography.hero_area, fallback.frontCover.typography.heroArea),
        title: { ...fallback.frontCover.typography.title, ...(isRecord(typography.title) ? typography.title : {}) },
        subtitle: { ...fallback.frontCover.typography.subtitle, ...(isRecord(typography.subtitle) ? typography.subtitle : {}) },
        meta: { ...fallback.frontCover.typography.meta, ...(isRecord(typography.meta) ? typography.meta : {}) },
        layout: {
          title: slot(isRecord(typography.layout) ? typography.layout.title : undefined, fallback.frontCover.typography.layout.title),
          subtitle: slot(isRecord(typography.layout) ? typography.layout.subtitle : undefined, fallback.frontCover.typography.layout.subtitle),
          author: slot(isRecord(typography.layout) ? typography.layout.author : undefined, fallback.frontCover.typography.layout.author),
          school: slot(isRecord(typography.layout) ? typography.layout.school : undefined, fallback.frontCover.typography.layout.school),
          publisher: slot(isRecord(typography.layout) ? typography.layout.publisher : undefined, fallback.frontCover.typography.layout.publisher),
          year: slot(isRecord(typography.layout) ? typography.layout.year : undefined, fallback.frontCover.typography.layout.year),
        },
      },
      palette: { text: typeof (front.palette as Record<string, unknown>)?.text === "string" ? String((front.palette as Record<string, unknown>).text) : fallback.frontCover.palette.text, accent: typeof (front.palette as Record<string, unknown>)?.accent === "string" ? String((front.palette as Record<string, unknown>).accent) : fallback.frontCover.palette.accent },
    },
    spine: { ...fallback.spine, ...spine, backgroundColor: typeof spine.background_color === "string" ? spine.background_color : fallback.spine.backgroundColor, textColor: typeof spine.text_color === "string" && !isLegacyDefaultSpineTextColor(templateId, spine.text_color) ? spine.text_color : fallback.spine.textColor, canvasObjects: Array.isArray(spine.canvas_objects) ? (typeof spine.text_color === "string" && !isLegacyDefaultSpineTextColor(templateId, spine.text_color) ? spine.canvas_objects : (spine.canvas_objects as CanvasObject[]).map(recolorSpineObject)) as CanvasObject[] : fallback.spine.canvasObjects, direction: spine.direction === "horizontal" ? "horizontal" : "vertical", alignment: readOption(spine.alignment, ["left", "center", "right"], fallback.spine.alignment), showAuthor: readBoolean(spine.show_author, fallback.spine.showAuthor), showSchool: readBoolean(spine.show_school, fallback.spine.showSchool), showLogo: readBoolean(spine.show_logo, fallback.spine.showLogo) },
    backCover: { background: { assetKind: "cover_back" }, canvasObjects: normalizedBackCanvasObjects, summaryArea: area(back.summary_area, fallback.backCover.summaryArea), footerArea: area(back.footer_area, fallback.backCover.footerArea), summaryMaxLength: Math.min(600, Math.max(300, readNumber(back.summary_max_length, fallback.backCover.summaryMaxLength))), footer: typeof back.footer === "string" ? back.footer : fallback.backCover.footer },
  };
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
  const storedTitleFont = readFont(title.font, defaultTemplate.titleFont);
  const usesLegacySpringTitleFont =
    templateId === "spring-blossom" &&
    (title.font === undefined || storedTitleFont.family === "serif");
  const titleFont = usesLegacySpringTitleFont
    ? { ...defaultTemplate.titleFont }
    : storedTitleFont;
  const storedTitleSize = readNumber(title.size, defaultTemplate.titleSize);
  const titleSize =
    templateId === "spring-blossom" && storedTitleSize === 24
      ? defaultTemplate.titleSize
      : storedTitleSize;

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
    titleFont,
    titleSize,
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
    appearance: readAppearance(presentation.appearance, templateId, titleFont),
  };
}

export const templateRepository = {
  async getByBook(bookId: number) {
    try {
      return await (authRepository.hasSession()
        ? authenticatedApiRequest<BookTemplate>(`/books/${bookId}/template`)
        : authorBookApiRequest<BookTemplate>(`/books/${bookId}/template`, bookId));
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
    const stored = await authenticatedApiRequest<BookTemplate>(`/books/${bookId}/template`, {
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
            appearance: {
              front_cover: {
                illustration: template.appearance.frontCover.illustration,
                canvas_objects: template.appearance.frontCover.canvasObjects.map(serializeCanvasObject),
                typography: {
                  safe_area: template.appearance.frontCover.typography.safeArea,
                  hero_area: template.appearance.frontCover.typography.heroArea,
                  title: template.appearance.frontCover.typography.title,
                  subtitle: template.appearance.frontCover.typography.subtitle,
                  meta: template.appearance.frontCover.typography.meta,
                  layout: template.appearance.frontCover.typography.layout,
                },
                palette: template.appearance.frontCover.palette,
              },
              spine: { direction: template.appearance.spine.direction, alignment: template.appearance.spine.alignment, background_color: template.appearance.spine.backgroundColor, text_color: template.appearance.spine.textColor, canvas_objects: template.appearance.spine.canvasObjects.map(serializeCanvasObject), show_author: template.appearance.spine.showAuthor, show_school: template.appearance.spine.showSchool, show_logo: template.appearance.spine.showLogo, fontScale: template.appearance.spine.fontScale, baseWidthMm: template.appearance.spine.baseWidthMm, mmPerPage: template.appearance.spine.mmPerPage },
              back_cover: { background: template.appearance.backCover.background, canvas_objects: template.appearance.backCover.canvasObjects.map(serializeCanvasObject), summary_area: template.appearance.backCover.summaryArea, footer_area: template.appearance.backCover.footerArea, summary_max_length: template.appearance.backCover.summaryMaxLength, footer: template.appearance.backCover.footer },
            },
          },
        },
      }),
      method: "PATCH",
    });
    return deserializeTemplate(stored);
  },
};
