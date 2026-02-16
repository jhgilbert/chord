import type { NoteType } from "./notes";

export const NOTE_TYPES: NoteType[] = [
  "Question",
  "Statement",
  "Recommendation",
  "Requirement",
  "Positive feedback",
  "Constructive feedback",
  "Action item",
  "Poll",
  "Host note",
];

export const NOTE_TYPE_EXAMPLES: Partial<Record<NoteType, string>> = {
  Question: "Are we expected to ...?",
  Statement: "I'm planning to ...",
  Recommendation: "We should ...",
  Requirement: "The solution must ...",
  "Positive feedback": "I liked ...",
  "Constructive feedback": "I struggled with ...",
};

export const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  Question: "#6930c3",
  Statement: "#5e60ce",
  Recommendation: "#5390d9",
  Requirement: "#4ea8de",
  "Action item": "#ff477e",
  "Positive feedback": "#36b7b7",
  "Constructive feedback": "#ff5c8a",
  Poll: "#ff5c8a",
  "Host note": "#6b7280",
};

export const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic"],
    [{ list: "bullet" }, { list: "ordered" }],
    ["link"],
  ],
};
