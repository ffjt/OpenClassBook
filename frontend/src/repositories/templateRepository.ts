import { ApiError, apiRequest } from "@/repositories/apiClient";
import type { Template } from "@/types/template";

export interface BookTemplate {
  id: number;
  book_id: number;
  title_format: Record<string, unknown> | null;
  body_format: Record<string, unknown> | null;
  image_rules: Record<string, unknown> | null;
  numbering_rules: Record<string, unknown> | null;
  page_rules: Record<string, unknown> | null;
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

  save(bookId: number, template: Template) {
    return apiRequest<BookTemplate>(`/books/${bookId}/template`, {
      body: JSON.stringify({
        title_format: {
          font: template.titleFont,
          size: template.titleSize,
          bold: template.titleBold,
          align: template.titleAlign,
          show_subtitle: template.showSubtitle,
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
        },
      }),
      method: "PATCH",
    });
  },
};
