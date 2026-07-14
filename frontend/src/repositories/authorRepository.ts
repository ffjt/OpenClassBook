import { apiRequest } from "@/repositories/apiClient";

export interface Author {
  id: number;
  book_id: number;
  name: string;
  number: string;
  join_status: string;
  created_at: string;
}

export const authorRepository = {
  listByBook(bookId: number) {
    return apiRequest<Author[]>(`/books/${bookId}/authors`);
  },
};
