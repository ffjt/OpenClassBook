import { apiRequest } from "@/repositories/apiClient";

export interface BookInvite {
  book_id: number;
  title: string;
  owner_name: string;
  invite_code: string;
}

export const inviteRepository = {
  get(bookId: number) {
    return apiRequest<BookInvite>(`/books/${bookId}/invite`);
  },
};
