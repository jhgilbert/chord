import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StickyNote from "../../../components/StickyNote/StickyNote";
import type { Note } from "../../../notes";

// Mock notes module (Firebase calls)
vi.mock("../../../notes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../notes")>();
  return {
    ...actual,
    setReaction: vi.fn(() => Promise.resolve()),
    toggleArchive: vi.fn(() => Promise.resolve()),
    editNote: vi.fn(() => Promise.resolve()),
    addResponse: vi.fn(() => Promise.resolve()),
    setResponseReaction: vi.fn(() => Promise.resolve()),
    votePoll: vi.fn(() => Promise.resolve()),
    closePoll: vi.fn(() => Promise.resolve()),
  };
});

// Mock ReactQuill — it relies on DOM APIs not available in jsdom
vi.mock("react-quill-new", () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <textarea
      data-testid="quill-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("react-quill-new/dist/quill.snow.css", () => ({}));

const SESSION_ID = "user-1";
const OTHER_USER = "user-2";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    type: "Statement",
    content: "<p>Test note content</p>",
    createdBy: OTHER_USER,
    createdByName: "Other User",
    ...overrides,
  };
}

const baseProps = {
  collaborationId: "collab-1",
  sessionId: SESSION_ID,
  displayName: "Test User",
  canDelete: false,
  canReact: true,
  paused: false,
  onDelete: vi.fn(),
};

describe("StickyNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Badges ---

  it("shows the note type badge", () => {
    render(<StickyNote {...baseProps} note={makeNote()} />);
    expect(screen.getByText("Statement")).toBeInTheDocument();
  });

  it("shows the author name by default", () => {
    render(<StickyNote {...baseProps} note={makeNote()} />);
    expect(screen.getByText("Other User")).toBeInTheDocument();
  });

  it("hides the author name when showAuthorNames is false", () => {
    render(
      <StickyNote
        {...baseProps}
        note={makeNote()}
        showAuthorNames={false}
      />,
    );
    expect(screen.queryByText("Other User")).not.toBeInTheDocument();
  });

  it("shows 'You' badge for own notes", () => {
    render(
      <StickyNote
        {...baseProps}
        note={makeNote({ createdBy: SESSION_ID, createdByName: "Test User" })}
      />,
    );
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("hides 'You' badge when hideYouBadge is true", () => {
    render(
      <StickyNote
        {...baseProps}
        note={makeNote({ createdBy: SESSION_ID, createdByName: "Test User" })}
        hideYouBadge
      />,
    );
    expect(screen.queryByText("You")).not.toBeInTheDocument();
  });

  // --- Content ---

  it("renders note content", () => {
    render(<StickyNote {...baseProps} note={makeNote()} />);
    expect(screen.getByText("Test note content")).toBeInTheDocument();
  });

  // --- Delete button ---

  it("shows delete button when canDelete is true", () => {
    render(
      <StickyNote {...baseProps} note={makeNote()} canDelete />,
    );
    expect(screen.getByLabelText("Delete note")).toBeInTheDocument();
  });

  it("hides delete button when canDelete is false", () => {
    render(
      <StickyNote {...baseProps} note={makeNote()} canDelete={false} />,
    );
    expect(screen.queryByLabelText("Delete note")).not.toBeInTheDocument();
  });

  it("calls onDelete when delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <StickyNote
        {...baseProps}
        note={makeNote()}
        canDelete
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByLabelText("Delete note"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  // --- Edit button ---

  it("shows edit button when canEdit is true", () => {
    render(
      <StickyNote {...baseProps} note={makeNote()} canEdit />,
    );
    expect(screen.getByLabelText("Edit note")).toBeInTheDocument();
  });

  it("hides edit button when canEdit is false", () => {
    render(
      <StickyNote {...baseProps} note={makeNote()} />,
    );
    expect(screen.queryByLabelText("Edit note")).not.toBeInTheDocument();
  });

  // --- Archive button ---

  it("shows archive button when canArchive is true", () => {
    render(
      <StickyNote {...baseProps} note={makeNote()} canArchive />,
    );
    expect(screen.getByLabelText("Archive")).toBeInTheDocument();
  });

  it("shows 'Unarchive' label when note is archived", () => {
    render(
      <StickyNote
        {...baseProps}
        note={makeNote({ archived: true })}
        canArchive
      />,
    );
    expect(screen.getByLabelText("Unarchive")).toBeInTheDocument();
  });

  it("calls toggleArchive when archive button is clicked", async () => {
    const user = userEvent.setup();
    const { toggleArchive } = await import("../../../notes");
    render(
      <StickyNote {...baseProps} note={makeNote()} canArchive />,
    );
    await user.click(screen.getByLabelText("Archive"));
    expect(toggleArchive).toHaveBeenCalledWith("collab-1", "note-1", false);
  });

  // --- Reactions ---

  it("shows upvote and mark-read buttons for non-poll notes", () => {
    render(<StickyNote {...baseProps} note={makeNote()} />);
    expect(screen.getByTitle("Upvote")).toBeInTheDocument();
    expect(screen.getByTitle("Mark as read")).toBeInTheDocument();
  });

  it("hides upvote button for poll notes", () => {
    render(
      <StickyNote
        {...baseProps}
        note={makeNote({ type: "Poll", pollOptions: ["A", "B"] })}
      />,
    );
    expect(screen.queryByTitle("Upvote")).not.toBeInTheDocument();
  });

  it("calls setReaction on upvote click for another user's note", async () => {
    const user = userEvent.setup();
    const { setReaction } = await import("../../../notes");
    render(<StickyNote {...baseProps} note={makeNote()} />);
    await user.click(screen.getByTitle("Upvote"));
    expect(setReaction).toHaveBeenCalledWith(
      "collab-1",
      "note-1",
      SESSION_ID,
      "agree",
    );
  });

  it("shows aggregate reaction counts when paused", () => {
    const note = makeNote({
      reactions: {
        "user-a": "agree",
        "user-b": "agree",
        "user-c": "markRead",
      },
    });
    render(<StickyNote {...baseProps} note={note} paused />);
    // Upvote button should show count 2
    const upvoteBtn = screen.getByTitle("Upvote");
    expect(upvoteBtn).toHaveTextContent("2");
    // Mark-read button should show count 1
    const readBtn = screen.getByTitle("Mark as read");
    expect(readBtn).toHaveTextContent("1");
  });

  // --- Ungroup button ---

  it("shows ungroup button when canUngroup is true", () => {
    render(
      <StickyNote {...baseProps} note={makeNote()} canUngroup />,
    );
    expect(screen.getByLabelText("Ungroup note")).toBeInTheDocument();
  });

  it("calls onUngroup when ungroup button is clicked", async () => {
    const user = userEvent.setup();
    const onUngroup = vi.fn();
    render(
      <StickyNote
        {...baseProps}
        note={makeNote()}
        canUngroup
        onUngroup={onUngroup}
      />,
    );
    await user.click(screen.getByLabelText("Ungroup note"));
    expect(onUngroup).toHaveBeenCalledOnce();
  });

  // --- Respond button ---

  it("shows respond button when not paused", () => {
    render(<StickyNote {...baseProps} note={makeNote()} />);
    expect(screen.getByLabelText("Add response")).toBeInTheDocument();
  });

  it("hides respond button when paused", () => {
    render(<StickyNote {...baseProps} note={makeNote()} paused />);
    expect(screen.queryByLabelText("Add response")).not.toBeInTheDocument();
  });

  it("shows response count", () => {
    const note = makeNote({
      responses: [
        {
          content: "reply",
          createdAt: Date.now(),
          createdBy: OTHER_USER,
          createdByName: "Other User",
        },
        {
          content: "reply 2",
          createdAt: Date.now(),
          createdBy: OTHER_USER,
          createdByName: "Other User",
        },
      ],
    });
    render(<StickyNote {...baseProps} note={note} />);
    const btn = screen.getByLabelText("Add response");
    expect(btn).toHaveTextContent("2");
  });

  // --- Responses toggle ---

  it("shows responses toggle when there are responses", () => {
    const note = makeNote({
      responses: [
        {
          content: "<p>A reply</p>",
          createdAt: Date.now(),
          createdBy: OTHER_USER,
          createdByName: "Other User",
        },
      ],
    });
    render(<StickyNote {...baseProps} note={note} />);
    expect(screen.getByText(/Show 1 response$/)).toBeInTheDocument();
  });

  it("shows responses expanded when forceExpandResponses is true", () => {
    const note = makeNote({
      responses: [
        {
          content: "<p>A reply</p>",
          createdAt: Date.now(),
          createdBy: OTHER_USER,
          createdByName: "Other User",
        },
      ],
    });
    render(
      <StickyNote {...baseProps} note={note} forceExpandResponses />,
    );
    expect(screen.getByText(/Hide 1 response$/)).toBeInTheDocument();
  });

  // --- Edit history ---

  it("shows edit history toggle when note has edit history", () => {
    const note = makeNote({
      editHistory: [{ content: "old content", editedAt: Date.now() }],
    });
    render(<StickyNote {...baseProps} note={note} />);
    expect(screen.getByText(/Show edit history/)).toBeInTheDocument();
  });

  it("hides edit history toggle when note has no history", () => {
    render(<StickyNote {...baseProps} note={makeNote()} />);
    expect(screen.queryByText(/edit history/)).not.toBeInTheDocument();
  });

  // --- Action item metadata ---

  it("shows assignee and due date for action items", () => {
    const note = makeNote({
      type: "Action item",
      assignee: "Alice",
      dueDate: "2026-03-01",
    });
    render(<StickyNote {...baseProps} note={note} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText(/Due:/)).toBeInTheDocument();
  });

  it("hides action item metadata for non-action-item notes", () => {
    render(<StickyNote {...baseProps} note={makeNote()} />);
    expect(screen.queryByText("Assignee:")).not.toBeInTheDocument();
  });

  // --- Poll ---

  it("renders poll options for Poll notes", () => {
    const note = makeNote({
      type: "Poll",
      content: "<p>Favorite color?</p>",
      pollOptions: ["Red", "Blue", "Green"],
    });
    render(<StickyNote {...baseProps} note={note} />);
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
    expect(screen.getByText("Green")).toBeInTheDocument();
  });

  it("shows 'Poll closed' message when poll is closed", () => {
    const note = makeNote({
      type: "Poll",
      pollOptions: ["A", "B"],
      pollClosed: true,
    });
    render(<StickyNote {...baseProps} note={note} />);
    expect(screen.getByText("Poll closed")).toBeInTheDocument();
  });

  it("shows 'Close poll' button for host when paused and poll is open", () => {
    const note = makeNote({
      type: "Poll",
      pollOptions: ["A", "B"],
    });
    render(
      <StickyNote {...baseProps} note={note} isHost paused />,
    );
    expect(screen.getByText("Close poll")).toBeInTheDocument();
  });

  it("hides 'Close poll' button for non-hosts", () => {
    const note = makeNote({
      type: "Poll",
      pollOptions: ["A", "B"],
    });
    render(
      <StickyNote {...baseProps} note={note} paused />,
    );
    expect(screen.queryByText("Close poll")).not.toBeInTheDocument();
  });
});
