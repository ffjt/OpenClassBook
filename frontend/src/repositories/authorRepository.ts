import { apiRequest } from "@/repositories/apiClient";
import type { Book } from "@/repositories/bookRepository";

export type AuthorStatus = "invited" | "joined" | "not_joined";
export type AuthorArticleStatus = "not_started" | "draft" | "submitted";

export interface Author {
  id: number;
  book_id: number;
  number: string;
  name: string;
  status: AuthorStatus;
  article_status: AuthorArticleStatus;
  joined_at: string | null;
  updated_at: string;
}

export interface AuthorDetail extends Author {
  book: Book;
}

export interface AuthorCreateInput {
  number: string;
  name: string;
  status?: AuthorStatus;
  article_status?: AuthorArticleStatus;
  joined_at?: string | null;
}

export type AuthorUpdateInput = Partial<AuthorCreateInput>;

export const authorRepository = {
  list(bookId: number) {
    return apiRequest<Author[]>(`/books/${bookId}/authors`);
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
