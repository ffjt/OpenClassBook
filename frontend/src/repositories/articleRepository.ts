import { apiRequest } from "@/repositories/apiClient";

export type ArticleStatus = "draft" | "pending" | "approved" | "rejected";

export interface Article {
  id: number;
  book_id: number;
  author_id: number;
  number: string;
  title: string;
  content: string;
  image: string | null;
  status: ArticleStatus;
  created_at: string;
  updated_at: string;
}

export interface ArticleCreateInput {
  author_id: number;
  number: string;
  title: string;
  content: string;
  image?: string | null;
  status?: ArticleStatus;
}

export type ArticleUpdateInput = Partial<ArticleCreateInput>;

export const articleRepository = {
  list(bookId: number) {
    return apiRequest<Article[]>(`/books/${bookId}/articles`);
  },

  get(id: number) {
    return apiRequest<Article>(`/articles/${id}`);
  },

  create(bookId: number, data: ArticleCreateInput) {
    return apiRequest<Article>(`/books/${bookId}/articles`, {
      body: JSON.stringify(data),
      method: "POST",
    });
  },

  update(id: number, data: ArticleUpdateInput) {
    return apiRequest<Article>(`/articles/${id}`, {
      body: JSON.stringify(data),
      method: "PATCH",
    });
  },

  updateStatus(id: number, status: ArticleStatus) {
    return apiRequest<Article>(`/articles/${id}/status`, {
      body: JSON.stringify({ status }),
      method: "PATCH",
    });
  },

  delete(id: number) {
    return apiRequest<void>(`/articles/${id}`, { method: "DELETE" });
  },
};
