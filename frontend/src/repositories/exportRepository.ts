import { apiDownload, apiRequest } from "@/repositories/apiClient";

export interface ExportTemplateInfo {
  font: string;
  font_size: number;
  page_size: string;
  page_margin: string;
  allow_images: boolean;
  image_align: string;
  image_width: number;
  numbering_style: string;
  line_height: number;
  title_size: number;
  title_align: string;
  title_bold: boolean;
  body_justify: boolean;
  first_line_indent: number;
  page_number_position: string;
  custom_page_width: number;
  custom_page_height: number;
}

export interface ExportStats {
  article_count: number;
  estimated_page_count: number;
  image_count: number;
  last_updated: string;
}

export interface ExportSection {
  id: string;
  kind: "page" | "articles";
  preset: string | null;
  label_en: string;
  label_zh: string;
  included: boolean;
  has_source: boolean;
}

export interface ExportPreviewPage {
  page_number: number;
  kind: "page" | "article";
  label_en: string;
  label_zh: string;
  is_placeholder: boolean;
}

export interface ExportPreview {
  template: ExportTemplateInfo;
  stats: ExportStats;
  sections: ExportSection[];
  preview_pages: ExportPreviewPage[];
  warnings: string[];
  warnings_zh: string[];
  can_export: boolean;
}

export interface ExportResult {
  status: "success";
  task_id: string;
  download_url: string;
  page_count: number;
  generated_at: string;
}

export const exportRepository = {
  getPreview(bookId: number, signal?: AbortSignal) {
    return apiRequest<ExportPreview>(`/books/${bookId}/export`, { signal });
  },

  generate(bookId: number) {
    return apiRequest<ExportResult>(`/books/${bookId}/export`, {
      method: "POST",
    });
  },

  download(downloadUrl: string) {
    return apiDownload(downloadUrl);
  },
};
