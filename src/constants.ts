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
  Question: "#f72585",
  Statement: "#b5179e",
  Recommendation: "#7209b7",
  Requirement: "#560bad",
  "Action item": "#3f37c9",
  "Positive feedback": "#560bad",
  "Constructive feedback": "#b5179e",
  Poll: "#560bad",
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
