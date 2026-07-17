import type { Template } from "@/types/template";

export type {
  Alignment,
  ColumnCount,
  FontSelection,
  NumberPosition,
  PageMargin,
  PageNumberPosition,
  PageSize as PaperSize,
  PublishingPreset,
} from "@/types/template";
export {
  getFontFamilyStyle,
  publicationChromeFontFamily,
} from "@/types/template";

/** @deprecated Use Template from @/types/template. */
export type BookFormatSettings = Template;
