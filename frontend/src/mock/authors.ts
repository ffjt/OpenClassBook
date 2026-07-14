export type AuthorStatus = "Invited" | "Joined" | "Not Joined";
export type ArticleStatus = "Submitted" | "Draft" | "Not Started";

export interface Author {
  id: string;
  number: string;
  name: string;
  status: AuthorStatus;
  articleStatus: ArticleStatus;
  joinedAt: string | null;
  updatedAt: string | null;
}

export const authors: Author[] = [
  {
    id: "author-001",
    number: "001",
    name: "张三",
    status: "Joined",
    articleStatus: "Submitted",
    joinedAt: "2026-07-14T10:12:00",
    updatedAt: "2 minutes ago",
  },
  {
    id: "author-002",
    number: "002",
    name: "李四",
    status: "Joined",
    articleStatus: "Draft",
    joinedAt: "2026-07-13T15:20:00",
    updatedAt: "Yesterday",
  },
  {
    id: "author-003",
    number: "003",
    name: "王五",
    status: "Not Joined",
    articleStatus: "Not Started",
    joinedAt: null,
    updatedAt: null,
  },
  {
    id: "author-004",
    number: "004",
    name: "赵六",
    status: "Invited",
    articleStatus: "Not Started",
    joinedAt: null,
    updatedAt: "3 days ago",
  },
  {
    id: "author-005",
    number: "005",
    name: "陈晨",
    status: "Joined",
    articleStatus: "Submitted",
    joinedAt: "2026-07-10T09:00:00",
    updatedAt: "4 hours ago",
  },
  {
    id: "author-006",
    number: "006",
    name: "刘洋",
    status: "Joined",
    articleStatus: "Draft",
    joinedAt: "2026-07-11T11:30:00",
    updatedAt: "Today",
  },
  {
    id: "author-007",
    number: "007",
    name: "孙悦",
    status: "Not Joined",
    articleStatus: "Not Started",
    joinedAt: null,
    updatedAt: null,
  },
  {
    id: "author-008",
    number: "008",
    name: "周凯",
    status: "Joined",
    articleStatus: "Submitted",
    joinedAt: "2026-07-09T08:45:00",
    updatedAt: "Yesterday",
  },
  {
    id: "author-009",
    number: "009",
    name: "胡敏",
    status: "Invited",
    articleStatus: "Draft",
    joinedAt: null,
    updatedAt: "5 days ago",
  },
];
