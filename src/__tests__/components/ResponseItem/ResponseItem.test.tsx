import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResponseItem from "../../../components/ResponseItem/ResponseItem";

const baseProps = {
  response: {
    content: "<p>Great point!</p>",
    createdBy: "user-2",
    createdByName: "Alice",
  },
  timestamp: "2/16/2026, 3:00:00 PM",
  paused: false,
  canReact: true,
  myReaction: null as null,
  counts: { agree: 0, disagree: 0, markRead: 0 },
  getReactionOpacity: () => 1,
  handleReaction: vi.fn(),
};

describe("ResponseItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders response content", () => {
    render(<ResponseItem {...baseProps} />);
    expect(screen.getByText("Great point!")).toBeInTheDocument();
  });

  it("shows the timestamp", () => {
    render(<ResponseItem {...baseProps} />);
    expect(screen.getByText("2/16/2026, 3:00:00 PM")).toBeInTheDocument();
  });

  it("shows the author name by default", () => {
    render(<ResponseItem {...baseProps} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("hides the author name when showAuthorNames is false", () => {
    render(<ResponseItem {...baseProps} showAuthorNames={false} />);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("shows reaction button when canReact is true", () => {
    render(<ResponseItem {...baseProps} />);
    expect(screen.getByText("➕", { exact: false })).toBeInTheDocument();
  });

  it("shows reaction button when paused (even if canReact is false)", () => {
    render(<ResponseItem {...baseProps} canReact={false} paused />);
    expect(screen.getByText("➕", { exact: false })).toBeInTheDocument();
  });

  it("hides reaction button when not paused and canReact is false", () => {
    render(<ResponseItem {...baseProps} canReact={false} paused={false} />);
    expect(screen.queryByText("➕", { exact: false })).not.toBeInTheDocument();
  });

  it("calls handleReaction when upvote is clicked", async () => {
    const user = userEvent.setup();
    const handleReaction = vi.fn();
    render(<ResponseItem {...baseProps} handleReaction={handleReaction} />);
    await user.click(screen.getByText("➕", { exact: false }));
    expect(handleReaction).toHaveBeenCalledWith("agree");
  });

  it("does not call handleReaction when canReact is false", async () => {
    const user = userEvent.setup();
    const handleReaction = vi.fn();
    render(
      <ResponseItem
        {...baseProps}
        canReact={false}
        paused
        handleReaction={handleReaction}
      />,
    );
    await user.click(screen.getByText("➕", { exact: false }));
    expect(handleReaction).not.toHaveBeenCalled();
  });

  it("shows agree count", () => {
    render(
      <ResponseItem
        {...baseProps}
        counts={{ agree: 5, disagree: 0, markRead: 0 }}
      />,
    );
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
