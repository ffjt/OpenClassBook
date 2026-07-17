import { apiRequest } from "@/repositories/apiClient";
import type { Book } from "@/repositories/bookRepository";

export interface Author {
  id: number;
  book_id: number;
  name: string;
  class_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthorDetail extends Author {
  book: Book;
}

export interface AuthorCreateInput {
  name: string;
  class_value?: string;
}

export interface LatestArticlePreview {
  title: string;
  excerpt: string;
  status: "draft" | "pending" | "approved" | "rejected";
  updated_at: string;
}

export interface AuthorSummary extends Author {
  article_count: number;
  latest_article: LatestArticlePreview | null;
}

export type AuthorUpdateInput = Partial<AuthorCreateInput>;

export const authorRepository = {
  list(bookId: number) {
    return apiRequest<AuthorSummary[]>(`/books/${bookId}/authors`);
  },

  search(bookId: number, name: string) {
    const query = new URLSearchParams({ name });
    return apiRequest<AuthorSummary[]>(`/books/${bookId}/authors/search?${query}`);
  },

  listByBook(bookId: number) {
    return this.list(bookId);
  },

  get(id: number) {
    return apiRequest<AuthorDetail>(`/authors/${id}`);
  },

  create(bookId: number, data: AuthorCreateInput) {
    return apiRequest<Author>(`/books/${bookId}/authors`, {
      body: JSON.stringify(data),
      method: "POST",
    });
  },

  update(id: number, data: AuthorUpdateInput) {
    return apiRequest<Author>(`/authors/${id}`, {
      body: JSON.stringify(data),
      method: "PATCH",
    });
  },

  delete(id: number) {
    return apiRequest<void>(`/authors/${id}`, { method: "DELETE" });
  },
};
