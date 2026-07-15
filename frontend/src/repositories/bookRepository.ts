import { apiRequest } from "@/repositories/apiClient";

export type NumberMode = "none" | "automatic" | "import";
export type BookStatus = "collecting" | "reviewing" | "published";
export type LayoutSectionKind = "page" | "articles";
export type LayoutSectionPreset =
  | "cover"
  | "preface"
  | "articles"
  | "principal_message"
  | "teacher_message"
  | "afterword"
  | "closing"
  | "acknowledgement"
  | "back_cover";

export interface BookLayoutSection {
  id: string;
  kind: LayoutSectionKind;
  preset: LayoutSectionPreset | null;
  name: string | null;
  file: string | null;
}

export interface Book {
  id: number;
  title: string;
  description: string | null;
  owner_name: string;
  invite_code: string;
  number_mode: NumberMode;
  status: BookStatus;
  cover_file: string | null;
  preface_file: string | null;
  afterword_file: string | null;
  acknowledgement_file: string | null;
  back_cover_file: string | null;
  layout_sections: BookLayoutSection[] | null;
  layout_article_order: number[] | null;
  author_count: number;
  created_at: string;
  updated_at: string;
}

export interface BookCreateInput {
  title: string;
  description: string | null;
  owner_name: string;
  number_mode: NumberMode;
}

export type BookUpdateInput = Partial<
  Pick<
    Book,
    | "title"
    | "description"
    | "owner_name"
    | "number_mode"
    | "status"
    | "cover_file"
    | "preface_file"
    | "afterword_file"
    | "acknowledgement_file"
    | "back_cover_file"
    | "layout_sections"
  >
>;

export const bookRepository = {
  create(data: BookCreateInput) {
    return apiRequest<Book>("/books", {
      body: JSON.stringify(data),
      method: "POST",
    });
  },

  list() {
    return apiRequest<Book[]>("/books");
  },

  get(id: number) {
    return apiRequest<Book>(`/books/${id}`);
  },

  update(id: number, data: BookUpdateInput) {
    return apiRequest<Book>(`/books/${id}`, {
      body: JSON.stringify(data),
      method: "PATCH",
    });
  },

  delete(id: number) {
    return apiRequest<void>(`/books/${id}`, {
      method: "DELETE",
    });
  },
};
