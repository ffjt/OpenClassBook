export type ArticleStatus = "pending" | "approved" | "rejected";

export interface Article {
  id: string;
  number: string;
  title: string;
  content: string;
  image: string;
  author: string;
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
}

export const mockArticles: Article[] = [
  {
    id: "article-001",
    number: "001",
    title: "The Quiet Work of Paying Attention",
    content:
      "Attention is the first material of any classroom. Before a page can teach us anything, we have to stay with it long enough for the obvious answer to loosen its grip.\n\nIn my first year of teaching, I mistook speed for understanding. Now I leave more room for questions, sketches, and the small pauses where a student decides to try again.",
    image: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=80",
    author: "Maya Chen",
    status: "pending",
    createdAt: "2026-07-08T09:20:00Z",
    updatedAt: "2026-07-13T15:42:00Z",
  },
  {
    id: "article-002",
    number: "002",
    title: "A Field Guide to Shared Tables",
    content:
      "The best discussions rarely begin at the center of the table. They begin at the edges: a note passed across, a question someone is not quite ready to ask aloud, a disagreement that makes space for a new map.\n\nThis guide is a collection of rituals for making those edges visible and welcoming.",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
    author: "Jon Bell",
    status: "approved",
    createdAt: "2026-07-07T11:05:00Z",
    updatedAt: "2026-07-12T10:18:00Z",
  },
  {
    id: "article-003",
    number: "003",
    title: "Notes from the Orchard",
    content:
      "Every autumn, the orchard teaches the same lesson in a new accent: abundance is not the same as excess. We gather what is ready, leave what needs another week, and return the fallen fruit to the soil.\n\nA curriculum can be tended in much the same way, with patience for uneven ripening.",
    image: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80",
    author: "Lina Park",
    status: "pending",
    createdAt: "2026-07-05T08:45:00Z",
    updatedAt: "2026-07-11T17:26:00Z",
  },
  {
    id: "article-004",
    number: "004",
    title: "The Shape of a Question",
    content:
      "A question is not an empty container waiting for an answer. It is a shape we build together. The wording sets its walls; the silence around it sets its depth.\n\nWhen we teach students to revise a question, we give them a way to revise the world they can imagine.",
    image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80",
    author: "Amir Hassan",
    status: "rejected",
    createdAt: "2026-07-03T13:10:00Z",
    updatedAt: "2026-07-10T14:02:00Z",
  },
  {
    id: "article-005",
    number: "005",
    title: "After the Bell",
    content:
      "The hallway after the bell is a kind of archive. It holds fragments of every lesson: a metaphor still being debated, a diagram folded into a pocket, a laugh that arrives a beat late.\n\nThese are not leftovers. They are evidence that learning keeps moving after the room has emptied.",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
    author: "Sofia Williams",
    status: "approved",
    createdAt: "2026-06-29T16:35:00Z",
    updatedAt: "2026-07-09T09:47:00Z",
  },
  {
    id: "article-006",
    number: "006",
    title: "Learning in Public",
    content:
      "There is a particular courage in making a first draft where others can see it. Public learning turns the private act of uncertainty into a shared practice.\n\nOur job is not to remove the risk from the room, but to make sure nobody has to carry it alone.",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    author: "Theo Martin",
    status: "pending",
    createdAt: "2026-06-27T10:12:00Z",
    updatedAt: "2026-07-08T12:31:00Z",
  },
  {
    id: "article-007",
    number: "007",
    title: "A Small Manual for Beginnings",
    content:
      "Begin with what is close enough to touch. A pencil, a name, a line of text, a story someone trusts you to hold. Large projects become possible when the first gesture is small and deliberate.\n\nThis manual is an invitation to begin again, without pretending the previous attempt did not matter.",
    image: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=80",
    author: "Elena Rossi",
    status: "rejected",
    createdAt: "2026-06-25T09:01:00Z",
    updatedAt: "2026-07-07T16:08:00Z",
  },
  {
    id: "article-008",
    number: "008",
    title: "Maps We Draw Together",
    content:
      "A map is a promise that somewhere can be found. In a classroom, we draw maps together by naming what we notice and leaving enough blank space for someone else to add a path.\n\nThe finished map is less important than the trust built while making it.",
    image: "https://images.unsplash.com/photo-1524666041070-9cffc5a7c5e0?auto=format&fit=crop&w=1200&q=80",
    author: "Noah Adeyemi",
    status: "approved",
    createdAt: "2026-06-21T14:50:00Z",
    updatedAt: "2026-07-06T11:24:00Z",
  },
  {
    id: "article-009",
    number: "009",
    title: "The Work Between Words",
    content:
      "Meaning lives in the spaces between words as much as in the words themselves. A pause can change a sentence; a margin can change a page.\n\nEditing is the patient art of making those spaces generous enough for another reader to enter.",
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
    author: "Grace Okafor",
    status: "pending",
    createdAt: "2026-06-18T12:30:00Z",
    updatedAt: "2026-07-05T18:01:00Z",
  },
];
