import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StartScreen from "../../../components/StartScreen/StartScreen";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/" }),
  Link: ({
    to,
    children,
  }: {
    to: string;
    children: React.ReactNode;
  }) => <a href={to}>{children}</a>,
}));

// Mock session — logged in by default
vi.mock("../../../session", () => ({
  getSession: () => ({
    userId: "user-1",
    displayName: "Test User",
    email: "test@example.com",
  }),
}));

// Mock collaborations
vi.mock("../../../collaborations", () => ({
  startCollaboration: vi.fn(() => Promise.resolve()),
}));

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

describe("StartScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the signed-in user name", () => {
    render(<StartScreen />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("shows the sign out link", () => {
    render(<StartScreen />);
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  // --- Form elements ---

  it("shows the title input", () => {
    render(<StartScreen />);
    expect(
      screen.getByPlaceholderText("Enter a title for this collaboration"),
    ).toBeInTheDocument();
  });

  it("shows the prompt editor", () => {
    render(<StartScreen />);
    expect(screen.getByTestId("quill-editor")).toBeInTheDocument();
  });

  it("shows the 'Start collaboration' button", () => {
    render(<StartScreen />);
    expect(screen.getByText("Start collaboration")).toBeInTheDocument();
  });

  // --- Preset buttons ---

  it("shows preset buttons", () => {
    render(<StartScreen />);
    expect(screen.getByText("Discussion")).toBeInTheDocument();
    expect(screen.getByText("Retro")).toBeInTheDocument();
    expect(screen.getByText("Q & A")).toBeInTheDocument();
  });

  it("selects Discussion preset note types by default", () => {
    render(<StartScreen />);
    const questionCheckbox = screen.getByLabelText("Question");
    const statementCheckbox = screen.getByLabelText("Statement");
    const recommendationCheckbox = screen.getByLabelText("Recommendation");
    expect(questionCheckbox).toBeChecked();
    expect(statementCheckbox).toBeChecked();
    expect(recommendationCheckbox).toBeChecked();
  });

  it("changes note types when Retro preset is clicked", async () => {
    const user = userEvent.setup();
    render(<StartScreen />);
    await user.click(screen.getByText("Retro"));
    expect(screen.getByLabelText("Positive feedback")).toBeChecked();
    expect(screen.getByLabelText("Constructive feedback")).toBeChecked();
    expect(screen.getByLabelText("Question")).not.toBeChecked();
    expect(screen.getByLabelText("Statement")).not.toBeChecked();
  });

  it("changes note types when Q & A preset is clicked", async () => {
    const user = userEvent.setup();
    render(<StartScreen />);
    await user.click(screen.getByText("Q & A"));
    expect(screen.getByLabelText("Question")).toBeChecked();
    expect(screen.getByLabelText("Statement")).not.toBeChecked();
    expect(screen.getByLabelText("Recommendation")).not.toBeChecked();
  });

  // --- Note type toggles ---

  it("toggles a note type checkbox", async () => {
    const user = userEvent.setup();
    render(<StartScreen />);
    const pollCheckbox = screen.getByLabelText("Poll");
    expect(pollCheckbox).not.toBeChecked();
    await user.click(pollCheckbox);
    expect(pollCheckbox).toBeChecked();
    await user.click(pollCheckbox);
    expect(pollCheckbox).not.toBeChecked();
  });

  // --- Anonymity toggle ---

  it("shows 'Show author names' checkbox checked by default", () => {
    render(<StartScreen />);
    expect(screen.getByLabelText("Show author names")).toBeChecked();
  });

  it("toggles the 'Show author names' checkbox", async () => {
    const user = userEvent.setup();
    render(<StartScreen />);
    const checkbox = screen.getByLabelText("Show author names");
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  // --- Form validation ---

  it("alerts when title is empty on submit", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<StartScreen />);
    // Fill in prompt but leave title empty
    await user.type(screen.getByTestId("quill-editor"), "Some prompt");
    await user.click(screen.getByText("Start collaboration"));
    expect(alertSpy).toHaveBeenCalledWith("Please enter a title");
    alertSpy.mockRestore();
  });

  it("alerts when prompt is empty on submit", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<StartScreen />);
    // Fill in title but leave prompt empty
    await user.type(
      screen.getByPlaceholderText("Enter a title for this collaboration"),
      "My Title",
    );
    await user.click(screen.getByText("Start collaboration"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Please enter a collaboration prompt",
    );
    alertSpy.mockRestore();
  });

  it("alerts when no note types are selected", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<StartScreen />);
    // Fill in title and prompt
    await user.type(
      screen.getByPlaceholderText("Enter a title for this collaboration"),
      "My Title",
    );
    await user.type(screen.getByTestId("quill-editor"), "Some prompt");
    // Uncheck all default note types
    await user.click(screen.getByLabelText("Question"));
    await user.click(screen.getByLabelText("Statement"));
    await user.click(screen.getByLabelText("Recommendation"));
    await user.click(screen.getByText("Start collaboration"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Please select at least one note type",
    );
    alertSpy.mockRestore();
  });

  it("calls startCollaboration and navigates on valid submit", async () => {
    const user = userEvent.setup();
    const { startCollaboration } = await import("../../../collaborations");
    render(<StartScreen />);
    await user.type(
      screen.getByPlaceholderText("Enter a title for this collaboration"),
      "My Title",
    );
    await user.type(screen.getByTestId("quill-editor"), "Some prompt");
    await user.click(screen.getByText("Start collaboration"));
    expect(startCollaboration).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalled();
  });
});
