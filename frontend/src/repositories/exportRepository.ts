import { ApiError, apiBaseUrl, apiRequest } from "@/repositories/apiClient";

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
  template_id: string;
  theme_color: string;
  accent_color: string;
  background_color: string;
  columns: number;
  article_page_mode: "single" | "flow" | string;
  show_header: boolean;
  header_text: string;
  show_footer: boolean;
  footer_text: string;
  footer_font: string;
  footer_size: number;
  chrome_surface_opacity: number;
  show_author_meta: boolean;
  image_radius: number;
  image_border: boolean;
  quote_style: boolean;
  title_surface_enabled: boolean;
  title_surface_opacity: number;
}

export interface ExportBookInfo {
  id: number;
  title: string;
  description: string | null;
  owner_name: string;
  created_at: string;
  updated_at: string;
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
  book: ExportBookInfo;
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
  getPreview(
    bookId: number,
    options: { preflight?: boolean; signal?: AbortSignal } = {},
  ) {
    const preflight = options.preflight ?? true;
    return apiRequest<ExportPreview>(
      `/books/${bookId}/export?preflight=${preflight}`,
      { signal: options.signal },
    );
  },

  generate(bookId: number) {
    return apiRequest<ExportResult>(`/books/${bookId}/export`, {
      method: "POST",
    });
  },

  fileUrl(downloadUrl: string, options: { inline?: boolean } = {}) {
    const url = /^https?:\/\//.test(downloadUrl)
      ? downloadUrl
      : `${apiBaseUrl}${downloadUrl}`;
    if (!options.inline) return url;
    return `${url}${url.includes("?") ? "&" : "?"}inline=true`;
  },

  async ensureFileAvailable(
    downloadUrl: string,
    options: { inline?: boolean; signal?: AbortSignal } = {},
  ) {
    const url = this.fileUrl(downloadUrl, { inline: options.inline });
    const response = await fetch(url, {
      cache: "no-store",
      method: "HEAD",
      signal: options.signal,
    });
    if (!response.ok) {
      throw new ApiError(`PDF is unavailable (${response.status})`, response.status);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.toLowerCase().includes("application/pdf")) {
      throw new ApiError("Export response is not a PDF", 502);
    }
    return url;
  },
};
