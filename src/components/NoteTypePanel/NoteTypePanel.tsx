import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useState } from "react";
import type { NoteType } from "../../notes";
import {
  NOTE_TYPE_EXAMPLES,
  NOTE_TYPE_COLORS,
  QUILL_MODULES,
} from "../../constants";
import styles from "./NoteTypePanel.module.css";

export default function NoteTypePanel({
  label,
  isOpen,
  onToggle,
  onSubmit,
  disabled = false,
}: {
  label: NoteType;
  isOpen: boolean;
  onToggle: () => void;
  onSubmit: (
    html: string,
    assignee?: string,
    dueDate?: string,
    pollOptions?: string[],
    pollMultipleChoice?: boolean,
  ) => Promise<void>;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollMultipleChoice, setPollMultipleChoice] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const isEmpty = value === "" || value === "<p><br></p>";
    if (isEmpty) return;

    // Filter out empty poll options
    const validPollOptions = isPoll
      ? pollOptions.filter((opt) => opt.trim() !== "")
      : undefined;

    await onSubmit(
      value,
      assignee || undefined,
      dueDate || undefined,
      validPollOptions,
      isPoll ? pollMultipleChoice : undefined,
    );
    setValue("");
    setAssignee("");
    setDueDate("");
    setPollOptions(["", ""]);
    setPollMultipleChoice(false);
  };

  const isActionItem = label === "Action item";
  const isPoll = label === "Poll";

  const exampleText = NOTE_TYPE_EXAMPLES[label];
  const color = NOTE_TYPE_COLORS[label];

  return (
    <div className={styles.noteTypePanel} data-disabled={disabled}>
      <div className={styles.colorBar} style={{ backgroundColor: color }} />
      <div className={styles.noteTypePanelContent}>
        <button
          type="button"
          onClick={disabled ? undefined : onToggle}
          className={styles.noteTypePanelButton}
          data-open={isOpen}
          data-disabled={disabled}
          disabled={disabled}
        >
          <span>{label}</span>
          {exampleText && (
            <span className={styles.noteTypePanelExample}>{exampleText}</span>
          )}
          {!disabled && (
            <span className={styles.noteTypePanelArrow}>
              {isOpen ? "▲" : "▼"}
            </span>
          )}
        </button>

        {isOpen && !disabled && (
          <form onSubmit={handleSubmit} className={styles.noteTypePanelForm}>
            <ReactQuill
              theme="snow"
              value={value}
              onChange={setValue}
              className={styles.noteTypePanelEditor}
              modules={QUILL_MODULES}
            />
            {isActionItem && (
              <div className={styles.actionItemFields}>
                <div className={styles.actionItemField}>
                  <label htmlFor={`assignee-${label}`}>
                    Assignee (optional):
                  </label>
                  <input
                    type="text"
                    id={`assignee-${label}`}
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="Enter assignee name"
                  />
                </div>
                <div className={styles.actionItemField}>
                  <label htmlFor={`dueDate-${label}`}>
                    Due date (optional):
                  </label>
                  <input
                    type="date"
                    id={`dueDate-${label}`}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            )}
            {isPoll && (
              <div className={styles.pollOptionsFields}>
                <label>Poll options:</label>
                {pollOptions.map((option, index) => (
                  <div key={index} className={styles.pollOptionField}>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...pollOptions];
                        newOptions[index] = e.target.value;
                        setPollOptions(newOptions);
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOptions = pollOptions.filter(
                            (_, i) => i !== index,
                          );
                          setPollOptions(newOptions);
                        }}
                        className={styles.pollOptionRemove}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ""])}
                  className={styles.pollOptionAdd}
                >
                  + Add option
                </button>
                <label className={styles.pollMultipleChoiceLabel}>
                  <input
                    type="checkbox"
                    checked={pollMultipleChoice}
                    onChange={(e) => setPollMultipleChoice(e.target.checked)}
                  />
                  Allow multiple selections
                </label>
              </div>
            )}
            <div className={styles.noteTypePanelActions}>
              <button
                type="submit"
                className={styles.noteTypePanelSubmit}
                style={{
                  backgroundColor: color,
                  color: "#fff",
                  opacity:
                    !value || value.replace(/<[^>]*>/g, "").trim() === ""
                      ? 0.4
                      : 1,
                }}
                disabled={!value || value.replace(/<[^>]*>/g, "").trim() === ""}
              >
                Post note
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
