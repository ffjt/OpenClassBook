import type { AuthorDetail } from "@/repositories/authorRepository";
import type { Book } from "@/repositories/bookRepository";
import { apiRequest } from "@/repositories/apiClient";

interface JoinBookResponse {
  book: Book;
}

interface JoinResponse {
  mode: "created" | "selection_required";
  author_id: number | null;
}

export const joinRepository = {
  get(inviteCode: string) {
    return apiRequest<JoinBookResponse>(`/join/${encodeURIComponent(inviteCode)}`);
  },

  join(inviteCode: string, name: string) {
    return apiRequest<JoinResponse>(`/join/${encodeURIComponent(inviteCode)}`, {
      body: JSON.stringify({ name }),
      method: "POST",
    });
  },

  getAuthor(authorId: number) {
    return apiRequest<AuthorDetail>(`/authors/${authorId}`);
  },
};
