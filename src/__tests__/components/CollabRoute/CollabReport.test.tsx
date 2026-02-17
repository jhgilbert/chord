import { render, screen } from "@testing-library/react";
import CollabReport from "../../../components/CollabRoute/CollabReport";
import type { Collaboration } from "../../../collaborations";
import type { Note } from "../../../notes";
import type { Session } from "../../../session";

vi.mock("../../../collaborations", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../collaborations")>();
  return {
    ...actual,
    resumeCollaboration: vi.fn(() => Promise.resolve()),
  };
});

const session: Session = {
  userId: "host-1",
  displayName: "Host User",
  email: "host@example.com",
};

const baseCollab: Collaboration = {
  id: "collab-1",
  title: "Test Collaboration",
  prompt: "<p>What do you think?</p>",
  startedBy: "host-1",
  startedByName: "Host User",
  active: false,
  allowedNoteTypes: ["Question", "Statement", "Recommendation"],
};

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    type: "Statement",
    content: "<p>A statement</p>",
    createdBy: "user-2",
    createdByName: "Alice",
    createdAt: 1700000000000,
    ...overrides,
  };
}

describe("CollabReport", () => {
  it("shows the collaboration title", () => {
    render(
      <CollabReport
        collab={baseCollab}
        notes={[]}
        session={session}
        isHost
      />,
    );
    expect(
      screen.getByText(/Collaboration: Test Collaboration/),
    ).toBeInTheDocument();
  });

  it("shows the host name", () => {
    render(
      <CollabReport
        collab={baseCollab}
        notes={[]}
        session={session}
        isHost
      />,
    );
    expect(screen.getByText("Host User")).toBeInTheDocument();
  });

  it("shows 'Reopen collaboration' button for host", () => {
    render(
      <CollabReport
        collab={baseCollab}
        notes={[]}
        session={session}
        isHost
      />,
    );
    expect(screen.getByText("Reopen collaboration")).toBeInTheDocument();
  });

  it("hides 'Reopen collaboration' button for non-host", () => {
    render(
      <CollabReport
        collab={baseCollab}
        notes={[]}
        session={session}
        isHost={false}
      />,
    );
    expect(
      screen.queryByText("Reopen collaboration"),
    ).not.toBeInTheDocument();
  });

  it("shows copy buttons", () => {
    render(
      <CollabReport
        collab={baseCollab}
        notes={[]}
        session={session}
        isHost
      />,
    );
    expect(screen.getByText("Copy as Markdown")).toBeInTheDocument();
    expect(screen.getByText("Copy for Google Docs")).toBeInTheDocument();
  });

  // --- Key Takeaways ---

  it("shows Key Takeaways section when action items exist", () => {
    const notes = [
      makeNote({ type: "Action item", content: "<p>Do the thing</p>" }),
    ];
    render(
      <CollabReport
        collab={baseCollab}
        notes={notes}
        session={session}
        isHost
      />,
    );
    expect(screen.getByText("Key Takeaways")).toBeInTheDocument();
    expect(screen.getByText("Action Items")).toBeInTheDocument();
  });

  it("shows Key Takeaways section when requirements exist", () => {
    const notes = [
      makeNote({
        id: "req-1",
        type: "Requirement",
        content: "<p>Must support X</p>",
      }),
    ];
    render(
      <CollabReport
        collab={baseCollab}
        notes={notes}
        session={session}
        isHost
      />,
    );
    expect(screen.getByText("Key Takeaways")).toBeInTheDocument();
    expect(screen.getByText("Requirements")).toBeInTheDocument();
  });

  it("shows Key Takeaways section when constructive feedback exists", () => {
    const notes = [
      makeNote({
        id: "cf-1",
        type: "Constructive feedback",
        content: "<p>Improve Y</p>",
      }),
    ];
    render(
      <CollabReport
        collab={baseCollab}
        notes={notes}
        session={session}
        isHost
      />,
    );
    expect(screen.getByText("Key Takeaways")).toBeInTheDocument();
    expect(screen.getByText("Constructive Feedback")).toBeInTheDocument();
  });

  it("does not show Key Takeaways when no special note types exist", () => {
    const notes = [makeNote()]; // Statement — not a key takeaway type
    render(
      <CollabReport
        collab={baseCollab}
        notes={notes}
        session={session}
        isHost
      />,
    );
    expect(screen.queryByText("Key Takeaways")).not.toBeInTheDocument();
  });

  // --- Polls ---

  it("shows poll results in Key Takeaways", () => {
    const notes = [
      makeNote({
        id: "poll-1",
        type: "Poll",
        content: "<p>Favorite color?</p>",
        pollOptions: ["Red", "Blue"],
        pollVotes: { "user-2": 0, "user-3": 1 },
      }),
    ];
    render(
      <CollabReport
        collab={baseCollab}
        notes={notes}
        session={session}
        isHost
      />,
    );
    expect(screen.getByText("Polls")).toBeInTheDocument();
    // Check that poll options appear in the table
    expect(screen.getAllByText("Red").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Blue").length).toBeGreaterThanOrEqual(1);
  });

  // --- Timeline ---

  it("shows collaboration timeline with notes", () => {
    const notes = [
      makeNote({ id: "n1", content: "<p>First note</p>" }),
      makeNote({
        id: "n2",
        type: "Question",
        content: "<p>Second note</p>",
        createdBy: "user-3",
        createdByName: "Bob",
      }),
    ];
    render(
      <CollabReport
        collab={baseCollab}
        notes={notes}
        session={session}
        isHost
      />,
    );
    expect(screen.getByText(/Collaboration Timeline \(2\)/)).toBeInTheDocument();
  });

  it("shows '(host)' suffix for host notes in timeline", () => {
    const notes = [
      makeNote({
        id: "n1",
        createdBy: "host-1",
        createdByName: "Host User",
      }),
    ];
    render(
      <CollabReport
        collab={baseCollab}
        notes={notes}
        session={session}
        isHost
      />,
    );
    expect(
      screen.getByText(/Host User \(host\)/),
    ).toBeInTheDocument();
  });

  // --- Reactions in timeline ---

  it("shows reactions section for notes with reactions", () => {
    const notes = [
      makeNote({
        reactions: { "user-3": "agree" },
      }),
    ];
    render(
      <CollabReport
        collab={baseCollab}
        notes={notes}
        session={session}
        isHost
      />,
    );
    expect(screen.getByText("Reactions")).toBeInTheDocument();
  });

  // --- Responses in timeline ---

  it("shows responses section for notes with responses", () => {
    const notes = [
      makeNote({
        responses: [
          {
            content: "<p>I agree</p>",
            createdAt: Date.now(),
            createdBy: "user-3",
            createdByName: "Bob",
          },
        ],
      }),
    ];
    render(
      <CollabReport
        collab={baseCollab}
        notes={notes}
        session={session}
        isHost
      />,
    );
    expect(screen.getByText(/Responses \(1\)/)).toBeInTheDocument();
  });
});
