import { apiRequest } from "@/repositories/apiClient";

export type ArticleReviewStatus = "pending" | "approved" | "rejected";

export interface Article {
  id: number;
  book_id: number;
  author_id: number;
  title: string;
  content: string;
  images: string[];
  number: string;
  review_status: ArticleReviewStatus;
  created_at: string;
  updated_at: string;
}

export const articleRepository = {
  listByBook(bookId: number) {
    return apiRequest<Article[]>(`/books/${bookId}/articles`);
  },
};
