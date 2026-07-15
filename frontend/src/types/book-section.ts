export type BookSectionType =
  | "cover"
  | "preface"
  | "articles"
  | "afterword"
  | "acknowledgement"
  | "back_cover";

/** Reserved for the future BookSection data model; no persistence yet. */
export interface BookSection {
  id: string;
  book_id: number;
  type: BookSectionType;
  title: string;
  content: string;
  order: number;
}
