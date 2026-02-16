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
  Question: "var(--color-raspberry)",
  Statement: "var(--color-magenta)",
  Recommendation: "var(--color-purple)",
  Requirement: "var(--color-grape)",
  "Action item": "var(--color-blue)",
  "Positive feedback": "var(--color-grape)",
  "Constructive feedback": "var(--color-magenta)",
  Poll: "var(--color-grape)",
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
