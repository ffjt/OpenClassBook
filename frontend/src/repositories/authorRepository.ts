import {
  authorApiRequest,
  authenticatedApiRequest,
} from "@/repositories/authRepository";
import type { NumberMode } from "@/repositories/bookRepository";

export interface Author {
  id: number;
  book_id: number;
  name: string;
  class_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthorDetail extends Author {
  book: AuthorBook;
}

export interface AuthorBook {
  id: number;
  title: string;
  description: string | null;
  owner_name: string;
  author_count: number;
  submission_enabled: boolean;
  submission_deadline: string | null;
  allow_multiple_articles: boolean;
  limit_articles_per_author: boolean;
  max_articles_per_author: number;
  allow_edit_after_submit: boolean;
  allow_delete_article: boolean;
  number_mode: NumberMode;
  claim_number_start: number;
  claim_number_end: number;
  number_prefix: string;
  number_digits: number;
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
    return authenticatedApiRequest<AuthorSummary[]>(`/books/${bookId}/authors`);
  },

  search(bookId: number, name: string) {
    const query = new URLSearchParams({ name });
    return authenticatedApiRequest<AuthorSummary[]>(`/books/${bookId}/authors/search?${query}`);
  },

  listByBook(bookId: number) {
    return this.list(bookId);
  },

  get(id: number) {
    return authorApiRequest<AuthorDetail>(`/authors/${id}`, id);
  },

  create(bookId: number, data: AuthorCreateInput) {
    return authenticatedApiRequest<Author>(`/books/${bookId}/authors`, {
      body: JSON.stringify(data),
      method: "POST",
    });
  },

  update(id: number, data: AuthorUpdateInput) {
    return authenticatedApiRequest<Author>(`/authors/${id}`, {
      body: JSON.stringify(data),
      method: "PATCH",
    });
  },

  delete(id: number) {
    return authenticatedApiRequest<void>(`/authors/${id}`, { method: "DELETE" });
  },
};
