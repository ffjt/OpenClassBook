export type NumberMode = "none" | "automatic" | "import";
export type BookStatus = "collecting" | "reviewing" | "published";

export interface Book {
  id: number;
  title: string;
  description: string | null;
  owner_name: string;
  invite_code: string;
  number_mode: NumberMode;
  status: BookStatus;
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

export type BookUpdateInput = Partial<BookCreateInput>;

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
import { apiRequest } from "@/repositories/apiClient";
