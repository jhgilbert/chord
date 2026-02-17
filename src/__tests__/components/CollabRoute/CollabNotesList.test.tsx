import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CollabNotesList from "../../../components/CollabRoute/CollabNotesList";
import type { Collaboration } from "../../../collaborations";
import type { Note, NoteType } from "../../../notes";
import type { Session } from "../../../session";

// Mock modules that CollabNotesList imports but we don't need in tests
vi.mock("../../../notes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../notes")>();
  return {
    ...actual,
    removeNote: vi.fn(),
    setGroupedUnder: vi.fn(),
  };
});

vi.mock("../../../components/CollabRoute/noteFilters", () => ({
  hasUserInteracted: () => false,
}));

vi.mock("../../../components/StickyNote/StickyNote", () => ({
  default: ({ note }: { note: Note }) => (
    <div data-testid={`note-${note.id}`}>{note.content}</div>
  ),
}));

const session: Session = {
  userId: "user-1",
  displayName: "Test User",
  email: "test@example.com",
};

const baseCollab: Collaboration = {
  id: "collab-1",
  title: "Test Collaboration",
  prompt: "<p>Test prompt</p>",
  startedBy: "host-1",
  startedByName: "Host User",
  active: true,
  allowedNoteTypes: ["Question", "Statement", "Recommendation"],
};

const allowedNoteTypes: NoteType[] = [
  "Question",
  "Statement",
  "Recommendation",
];

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    type: "Statement",
    content: "Test note",
    createdBy: session.userId,
    createdByName: session.displayName,
    ...overrides,
  };
}

describe("CollabNotesList", () => {
  it("shows hint text when user has no notes and collab is not paused", () => {
    render(
      <CollabNotesList
        collab={baseCollab}
        notes={[]}
        session={session}
        isHost={false}
        allowedNoteTypes={allowedNoteTypes}
      />,
    );

    expect(
      screen.getByText(/Use the sidebar to add your thoughts/),
    ).toBeInTheDocument();
  });

  it("hides hint text when collab is paused", () => {
    render(
      <CollabNotesList
        collab={{ ...baseCollab, paused: true }}
        notes={[]}
        session={session}
        isHost={false}
        allowedNoteTypes={allowedNoteTypes}
      />,
    );

    expect(
      screen.queryByText(/Use the sidebar to add your thoughts/),
    ).not.toBeInTheDocument();
  });

  it("hides hint text when user has notes", () => {
    render(
      <CollabNotesList
        collab={baseCollab}
        notes={[makeNote()]}
        session={session}
        isHost={false}
        allowedNoteTypes={allowedNoteTypes}
      />,
    );

    expect(
      screen.queryByText(/Use the sidebar to add your thoughts/),
    ).not.toBeInTheDocument();
  });

  it("shows filter tabs with correct labels", () => {
    render(
      <CollabNotesList
        collab={baseCollab}
        notes={[]}
        session={session}
        isHost={false}
        allowedNoteTypes={allowedNoteTypes}
      />,
    );

    expect(screen.getByText("Your notes")).toBeInTheDocument();
    expect(screen.getByText("Inbox (0)")).toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Archived (0)")).toBeInTheDocument();
  });

  it("hides hint text after switching away from Mine filter", async () => {
    const user = userEvent.setup();

    render(
      <CollabNotesList
        collab={baseCollab}
        notes={[]}
        session={session}
        isHost={false}
        allowedNoteTypes={allowedNoteTypes}
      />,
    );

    expect(
      screen.getByText(/Use the sidebar to add your thoughts/),
    ).toBeInTheDocument();

    await user.click(screen.getByText("All"));

    expect(
      screen.queryByText(/Use the sidebar to add your thoughts/),
    ).not.toBeInTheDocument();
  });
});
