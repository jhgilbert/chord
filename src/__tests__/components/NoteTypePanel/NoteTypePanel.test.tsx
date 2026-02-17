import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NoteTypePanel from "../../../components/NoteTypePanel/NoteTypePanel";

// Mock ReactQuill
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

const baseProps = {
  label: "Statement" as const,
  isOpen: false,
  onToggle: vi.fn(),
  onSubmit: vi.fn(() => Promise.resolve()),
};

describe("NoteTypePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Toggle behavior ---

  it("shows the note type label", () => {
    render(<NoteTypePanel {...baseProps} />);
    expect(screen.getByText("Statement")).toBeInTheDocument();
  });

  it("shows down arrow when closed", () => {
    render(<NoteTypePanel {...baseProps} />);
    expect(screen.getByText("▼")).toBeInTheDocument();
  });

  it("shows up arrow when open", () => {
    render(<NoteTypePanel {...baseProps} isOpen />);
    expect(screen.getByText("▲")).toBeInTheDocument();
  });

  it("calls onToggle when button is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<NoteTypePanel {...baseProps} onToggle={onToggle} />);
    await user.click(screen.getByText("Statement"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("does not call onToggle when disabled", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<NoteTypePanel {...baseProps} onToggle={onToggle} disabled />);
    await user.click(screen.getByText("Statement"));
    expect(onToggle).not.toHaveBeenCalled();
  });

  // --- Form display ---

  it("shows editor when open", () => {
    render(<NoteTypePanel {...baseProps} isOpen />);
    expect(screen.getByTestId("quill-editor")).toBeInTheDocument();
  });

  it("hides editor when closed", () => {
    render(<NoteTypePanel {...baseProps} />);
    expect(screen.queryByTestId("quill-editor")).not.toBeInTheDocument();
  });

  it("shows 'Post note' button when open", () => {
    render(<NoteTypePanel {...baseProps} isOpen />);
    expect(screen.getByText("Post note")).toBeInTheDocument();
  });

  // --- Example text ---

  it("shows example text for Question type", () => {
    render(<NoteTypePanel {...baseProps} label="Question" isOpen />);
    expect(screen.getByText("Is it possible to ...?")).toBeInTheDocument();
  });

  it("does not show example text for Poll type", () => {
    render(<NoteTypePanel {...baseProps} label="Poll" isOpen />);
    expect(
      screen.queryByText("Is it possible to ...?"),
    ).not.toBeInTheDocument();
  });

  // --- Action item fields ---

  it("shows assignee and due date fields for Action item", () => {
    render(<NoteTypePanel {...baseProps} label="Action item" isOpen />);
    expect(screen.getByText("Assignee (optional):")).toBeInTheDocument();
    expect(screen.getByText("Due date (optional):")).toBeInTheDocument();
  });

  it("hides assignee and due date fields for other types", () => {
    render(<NoteTypePanel {...baseProps} isOpen />);
    expect(
      screen.queryByText("Assignee (optional):"),
    ).not.toBeInTheDocument();
  });

  // --- Poll fields ---

  it("shows poll options for Poll type", () => {
    render(<NoteTypePanel {...baseProps} label="Poll" isOpen />);
    expect(screen.getByText("Poll options:")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Option 1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Option 2")).toBeInTheDocument();
    expect(
      screen.getByText("Allow multiple selections"),
    ).toBeInTheDocument();
  });

  it("adds a poll option when '+ Add option' is clicked", async () => {
    const user = userEvent.setup();
    render(<NoteTypePanel {...baseProps} label="Poll" isOpen />);
    await user.click(screen.getByText("+ Add option"));
    expect(screen.getByPlaceholderText("Option 3")).toBeInTheDocument();
  });

  it("removes a poll option when × is clicked", async () => {
    const user = userEvent.setup();
    render(<NoteTypePanel {...baseProps} label="Poll" isOpen />);
    // Add a third option first
    await user.click(screen.getByText("+ Add option"));
    expect(screen.getByPlaceholderText("Option 3")).toBeInTheDocument();
    // Remove buttons only appear when > 2 options
    const removeButtons = screen.getAllByText("×");
    await user.click(removeButtons[0]);
    expect(screen.queryByPlaceholderText("Option 3")).not.toBeInTheDocument();
  });

  it("does not show remove buttons with only 2 poll options", () => {
    render(<NoteTypePanel {...baseProps} label="Poll" isOpen />);
    expect(screen.queryByText("×")).not.toBeInTheDocument();
  });

  // --- Submit ---

  it("calls onSubmit with content when form is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => Promise.resolve());
    render(<NoteTypePanel {...baseProps} isOpen onSubmit={onSubmit} />);
    await user.type(screen.getByTestId("quill-editor"), "My note");
    await user.click(screen.getByText("Post note"));
    expect(onSubmit).toHaveBeenCalledWith(
      "My note",
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it("clears content after successful submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => Promise.resolve());
    render(<NoteTypePanel {...baseProps} isOpen onSubmit={onSubmit} />);
    const editor = screen.getByTestId("quill-editor");
    await user.type(editor, "My note");
    await user.click(screen.getByText("Post note"));
    expect(editor).toHaveValue("");
  });

  it("does not submit when content is empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => Promise.resolve());
    render(<NoteTypePanel {...baseProps} isOpen onSubmit={onSubmit} />);
    await user.click(screen.getByText("Post note"));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
