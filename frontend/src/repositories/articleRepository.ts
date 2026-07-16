import { apiRequest } from "@/repositories/apiClient";

export type ArticleStatus = "draft" | "pending" | "approved" | "rejected";

export interface ArticleImageSettings {
  page: number;
  wrap: "square" | "tight" | "through" | "topBottom" | "behindText" | "inFrontOfText";
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface Article {
  id: number;
  book_id: number;
  author_id: number;
  number: string;
  title: string;
  subtitle: string;
  content: string;
  image: string | null;
  image_settings: ArticleImageSettings | null;
  status: ArticleStatus;
  review_status: Exclude<ArticleStatus, "draft">;
  submitted_at: string | null;
  edit_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleCreateInput {
  author_id: number;
  number?: string;
  title: string;
  subtitle?: string;
  content: string;
  image?: string | null;
  image_settings?: ArticleImageSettings | null;
  status?: ArticleStatus;
}

export type ArticleUpdateInput = Partial<ArticleCreateInput>;

export const articleRepository = {
  list(bookId: number) {
    return apiRequest<Article[]>(`/books/${bookId}/articles`);
  },

  listSubmitted(bookId: number) {
    return apiRequest<Article[]>(
      `/books/${bookId}/articles?include_drafts=false`,
    );
  },

  listByAuthor(authorId: number) {
    return apiRequest<Article[]>(`/authors/${authorId}/articles`);
  },

  listByBook(bookId: number) {
    return this.list(bookId).then((articles) =>
      articles.map((article) => ({
        ...article,
        review_status: article.status as Article["review_status"],
      })),
    );
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

  requestEdit(id: number) {
    return apiRequest<Article>(`/articles/${id}/edit-request`, {
      method: "POST",
    });
  },

  resolveEditRequest(id: number, action: "approve" | "reject") {
    return apiRequest<Article>(`/articles/${id}/edit-request`, {
      body: JSON.stringify({ action }),
      method: "PATCH",
    });
  },

  assignNumbers(bookId: number, articleIds: number[]) {
    return apiRequest<Article[]>(`/books/${bookId}/articles/numbers`, {
      body: JSON.stringify({ article_ids: articleIds }),
      method: "PATCH",
    });
  },

  saveLayoutOrder(bookId: number, articleIds: number[]) {
    return apiRequest<Article[]>(`/books/${bookId}/articles/order`, {
      body: JSON.stringify({ article_ids: articleIds }),
      method: "PATCH",
    });
  },

  delete(id: number) {
    return apiRequest<void>(`/articles/${id}`, { method: "DELETE" });
  },
};
