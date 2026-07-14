import type { Template } from "@/types/template";

export type {
  Alignment,
  FontSelection,
  NumberPosition,
  PageMargin,
  PageNumberPosition,
  PageSize as PaperSize,
} from "@/types/template";
export { getFontFamilyStyle } from "@/types/template";

/** @deprecated Use Template from @/types/template. */
export type BookFormatSettings = Template;
