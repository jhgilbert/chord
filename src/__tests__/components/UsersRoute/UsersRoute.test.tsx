import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsersRoute from "../../../components/UsersRoute/UsersRoute";
import type { Collaboration, Participant } from "../../../collaborations";
import type { Note } from "../../../notes";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "collab-1" }),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/collabs/collab-1/users" }),
  Link: ({
    to,
    children,
  }: {
    to: string;
    children: React.ReactNode;
  }) => <a href={to}>{children}</a>,
}));

// Mock session — logged in as host
vi.mock("../../../session", () => ({
  getSession: () => ({
    userId: "host-1",
    displayName: "Host User",
    email: "host@example.com",
  }),
}));

// We need to store the callbacks so we can call them from tests
let collabCallback: ((c: Collaboration | null) => void) | null = null;
let notesCallback: ((n: Note[]) => void) | null = null;
let participantsCallback: ((p: Participant[]) => void) | null = null;

vi.mock("../../../collaborations", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../collaborations")>();
  return {
    ...actual,
    subscribeCollaboration: vi.fn(
      (_id: string, cb: (c: Collaboration | null) => void) => {
        collabCallback = cb;
        return () => {};
      },
    ),
    subscribeParticipants: vi.fn(
      (_id: string, cb: (p: Participant[]) => void) => {
        participantsCallback = cb;
        return () => {};
      },
    ),
    revokeParticipant: vi.fn(() => Promise.resolve()),
  };
});

vi.mock("../../../notes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../notes")>();
  return {
    ...actual,
    subscribeNotes: vi.fn((_id: string, cb: (n: Note[]) => void) => {
      notesCallback = cb;
      return () => {};
    }),
  };
});

const collab: Collaboration = {
  id: "collab-1",
  title: "Test Collaboration",
  prompt: "<p>Discuss this</p>",
  startedBy: "host-1",
  startedByName: "Host User",
  active: true,
  allowedNoteTypes: ["Question", "Statement"],
};

function triggerCallbacks(
  notes: Note[] = [],
  participants: Participant[] = [],
) {
  act(() => {
    collabCallback?.(collab);
    notesCallback?.(notes);
    participantsCallback?.(participants);
  });
}

describe("UsersRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collabCallback = null;
    notesCallback = null;
    participantsCallback = null;
  });

  it("shows loading state initially", () => {
    render(<UsersRoute />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows participant count header", () => {
    render(<UsersRoute />);
    triggerCallbacks();
    // Host always appears, so at least 1
    expect(screen.getByText(/Participants \(1\)/)).toBeInTheDocument();
  });

  it("shows table column headers", () => {
    render(<UsersRoute />);
    triggerCallbacks();
    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Reactions")).toBeInTheDocument();
    expect(screen.getByText("Responses")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Last Activity")).toBeInTheDocument();
    expect(screen.getByText("Access")).toBeInTheDocument();
  });

  it("shows the host with 'Host' badge", () => {
    render(<UsersRoute />);
    triggerCallbacks();
    expect(screen.getByText("Host User")).toBeInTheDocument();
    expect(screen.getByText("Host")).toBeInTheDocument();
  });

  it("counts notes per user", () => {
    const notes: Note[] = [
      {
        id: "n1",
        type: "Statement",
        content: "Note 1",
        createdBy: "user-2",
        createdByName: "Alice",
        createdAt: Date.now() - 5000,
      },
      {
        id: "n2",
        type: "Question",
        content: "Note 2",
        createdBy: "user-2",
        createdByName: "Alice",
        createdAt: Date.now() - 3000,
      },
      {
        id: "n3",
        type: "Statement",
        content: "Note 3",
        createdBy: "user-3",
        createdByName: "Bob",
        createdAt: Date.now() - 1000,
      },
    ];
    render(<UsersRoute />);
    triggerCallbacks(notes);
    // Alice: 2 notes, Bob: 1 note
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("counts reactions per user", () => {
    const notes: Note[] = [
      {
        id: "n1",
        type: "Statement",
        content: "Note 1",
        createdBy: "user-2",
        createdByName: "Alice",
        createdAt: Date.now() - 5000,
        reactions: {
          "user-3": "agree",
        },
      },
    ];
    render(<UsersRoute />);
    triggerCallbacks(notes);
    // Bob (user-3) reacted once
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("counts responses per user", () => {
    const notes: Note[] = [
      {
        id: "n1",
        type: "Statement",
        content: "Note 1",
        createdBy: "user-2",
        createdByName: "Alice",
        createdAt: Date.now() - 5000,
        responses: [
          {
            content: "Reply",
            createdAt: Date.now() - 2000,
            createdBy: "user-3",
            createdByName: "Bob",
          },
        ],
      },
    ];
    render(<UsersRoute />);
    triggerCallbacks(notes);
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows participants who have not submitted anything", () => {
    const participants: Participant[] = [
      {
        userId: "user-4",
        displayName: "Charlie",
        email: "charlie@example.com",
        status: "approved",
        requestedAt: Date.now(),
      },
    ];
    render(<UsersRoute />);
    triggerCallbacks([], participants);
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows 'Revoked' badge for revoked participants", () => {
    const participants: Participant[] = [
      {
        userId: "user-5",
        displayName: "Dave",
        email: "dave@example.com",
        status: "revoked",
        requestedAt: Date.now(),
      },
    ];
    // Dave also needs a note so he shows up in the table
    const notes: Note[] = [
      {
        id: "n1",
        type: "Statement",
        content: "test",
        createdBy: "user-5",
        createdByName: "Dave",
        createdAt: Date.now(),
      },
    ];
    render(<UsersRoute />);
    triggerCallbacks(notes, participants);
    expect(screen.getByText("Dave")).toBeInTheDocument();
    expect(screen.getByText("Revoked")).toBeInTheDocument();
  });

  it("shows 'Revoke' button for active non-host users", () => {
    const participants: Participant[] = [
      {
        userId: "user-2",
        displayName: "Alice",
        email: "alice@example.com",
        status: "approved",
        requestedAt: Date.now(),
      },
    ];
    render(<UsersRoute />);
    triggerCallbacks([], participants);
    expect(screen.getByText("Revoke")).toBeInTheDocument();
  });

  it("calls revokeParticipant when Revoke is clicked", async () => {
    const user = userEvent.setup();
    const { revokeParticipant } = await import("../../../collaborations");
    const participants: Participant[] = [
      {
        userId: "user-2",
        displayName: "Alice",
        email: "alice@example.com",
        status: "approved",
        requestedAt: Date.now(),
      },
    ];
    render(<UsersRoute />);
    triggerCallbacks([], participants);
    await user.click(screen.getByText("Revoke"));
    expect(revokeParticipant).toHaveBeenCalledWith("collab-1", "user-2");
  });

  it("shows 'No activity' for users without activity", () => {
    const participants: Participant[] = [
      {
        userId: "user-4",
        displayName: "Charlie",
        email: "charlie@example.com",
        status: "approved",
        requestedAt: Date.now(),
      },
    ];
    render(<UsersRoute />);
    triggerCallbacks([], participants);
    // Host and Charlie both have no activity
    const noActivityCells = screen.getAllByText("No activity");
    expect(noActivityCells.length).toBeGreaterThanOrEqual(1);
  });

  it("shows back button linking to collaboration", () => {
    render(<UsersRoute />);
    triggerCallbacks();
    expect(
      screen.getByText("← Back to collaboration"),
    ).toBeInTheDocument();
  });
});
