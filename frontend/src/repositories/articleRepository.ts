import {
  authorApiRequest,
  authenticatedApiRequest,
} from "@/repositories/authRepository";

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
    return authenticatedApiRequest<Article[]>(`/books/${bookId}/articles`);
  },

  listSubmitted(bookId: number) {
    return authenticatedApiRequest<Article[]>(
      `/books/${bookId}/articles?include_drafts=false`,
    );
  },

  listByAuthor(authorId: number) {
    return authorApiRequest<Article[]>(`/authors/${authorId}/articles`, authorId);
  },

  listByBook(bookId: number) {
    return this.list(bookId).then((articles) =>
      articles.map((article) => ({
        ...article,
        review_status: article.status as Article["review_status"],
      })),
    );
  },

  get(id: number, authorId?: number) {
    return authorId === undefined
      ? authenticatedApiRequest<Article>(`/articles/${id}`)
      : authorApiRequest<Article>(`/articles/${id}`, authorId);
  },

  create(bookId: number, data: ArticleCreateInput) {
    return authorApiRequest<Article>(`/books/${bookId}/articles`, data.author_id, {
      body: JSON.stringify(data),
      method: "POST",
    });
  },

  update(id: number, data: ArticleUpdateInput, authorId?: number) {
    return authorId === undefined
      ? authenticatedApiRequest<Article>(`/articles/${id}`, {
          body: JSON.stringify(data),
          method: "PATCH",
        })
      : authorApiRequest<Article>(`/articles/${id}`, authorId, {
          body: JSON.stringify(data),
          method: "PATCH",
        });
  },

  updateStatus(id: number, status: ArticleStatus) {
    return authenticatedApiRequest<Article>(`/articles/${id}/status`, {
      body: JSON.stringify({ status }),
      method: "PATCH",
    });
  },

  requestEdit(id: number, authorId?: number) {
    return authorId === undefined
      ? authenticatedApiRequest<Article>(`/articles/${id}/edit-request`, {
          method: "POST",
        })
      : authorApiRequest<Article>(`/articles/${id}/edit-request`, authorId, {
      method: "POST",
    });
  },

  resolveEditRequest(id: number, action: "approve" | "reject") {
    return authenticatedApiRequest<Article>(`/articles/${id}/edit-request`, {
      body: JSON.stringify({ action }),
      method: "PATCH",
    });
  },

  assignNumbers(bookId: number, articleIds: number[]) {
    return authenticatedApiRequest<Article[]>(`/books/${bookId}/articles/numbers`, {
      body: JSON.stringify({ article_ids: articleIds }),
      method: "PATCH",
    });
  },

  saveLayoutOrder(bookId: number, articleIds: number[]) {
    return authenticatedApiRequest<Article[]>(`/books/${bookId}/articles/order`, {
      body: JSON.stringify({ article_ids: articleIds }),
      method: "PATCH",
    });
  },

  delete(id: number, authorId?: number) {
    return authorId === undefined
      ? authenticatedApiRequest<void>(`/articles/${id}`, { method: "DELETE" })
      : authorApiRequest<void>(`/articles/${id}`, authorId, { method: "DELETE" });
  },
};
