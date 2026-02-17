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

  const isActionItem = label === "Action item";
  const isPoll = label === "Poll";
  const color = NOTE_TYPE_COLORS[label];
  const hasContent = value && value.replace(/<[^>]*>/g, "").trim() !== "";

  const handleSubmit = async () => {
    const isEmpty = value === "" || value === "<p><br></p>";
    if (isEmpty) return;

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

  return (
    <div className={styles.noteTypePanel} data-disabled={disabled}>
      <div className={styles.colorBar} style={{ backgroundColor: color }} />
      <div className={styles.noteTypePanelContent}>
        <PanelHeader
          label={label}
          isOpen={isOpen}
          disabled={disabled}
          onToggle={onToggle}
        />

        {isOpen && !disabled && (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className={styles.noteTypePanelForm}>
            <ReactQuill
              theme="snow"
              value={value}
              onChange={setValue}
              className={styles.noteTypePanelEditor}
              modules={QUILL_MODULES}
            />
            {isActionItem && (
              <ActionItemFields
                label={label}
                assignee={assignee}
                dueDate={dueDate}
                onAssigneeChange={setAssignee}
                onDueDateChange={setDueDate}
              />
            )}
            {isPoll && (
              <PollFields
                options={pollOptions}
                multipleChoice={pollMultipleChoice}
                onOptionsChange={setPollOptions}
                onMultipleChoiceChange={setPollMultipleChoice}
              />
            )}
            <div className={styles.noteTypePanelActions}>
              <button
                type="submit"
                className={styles.noteTypePanelSubmit}
                style={{
                  backgroundColor: color,
                  color: "#fff",
                  opacity: hasContent ? 1 : 0.4,
                }}
                disabled={!hasContent}
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

function PanelHeader({
  label,
  isOpen,
  disabled,
  onToggle,
}: {
  label: NoteType;
  isOpen: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const exampleText = NOTE_TYPE_EXAMPLES[label];

  return (
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
  );
}

function ActionItemFields({
  label,
  assignee,
  dueDate,
  onAssigneeChange,
  onDueDateChange,
}: {
  label: NoteType;
  assignee: string;
  dueDate: string;
  onAssigneeChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
}) {
  return (
    <div className={styles.actionItemFields}>
      <div className={styles.actionItemField}>
        <label htmlFor={`assignee-${label}`}>Assignee (optional):</label>
        <input
          type="text"
          id={`assignee-${label}`}
          value={assignee}
          onChange={(e) => onAssigneeChange(e.target.value)}
          placeholder="Enter assignee name"
        />
      </div>
      <div className={styles.actionItemField}>
        <label htmlFor={`dueDate-${label}`}>Due date (optional):</label>
        <input
          type="date"
          id={`dueDate-${label}`}
          value={dueDate}
          onChange={(e) => onDueDateChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function PollFields({
  options,
  multipleChoice,
  onOptionsChange,
  onMultipleChoiceChange,
}: {
  options: string[];
  multipleChoice: boolean;
  onOptionsChange: (options: string[]) => void;
  onMultipleChoiceChange: (value: boolean) => void;
}) {
  return (
    <div className={styles.pollOptionsFields}>
      <label>Poll options:</label>
      {options.map((option, index) => (
        <div key={index} className={styles.pollOptionField}>
          <input
            type="text"
            value={option}
            onChange={(e) => {
              const newOptions = [...options];
              newOptions[index] = e.target.value;
              onOptionsChange(newOptions);
            }}
            placeholder={`Option ${index + 1}`}
          />
          {options.length > 2 && (
            <button
              type="button"
              onClick={() => onOptionsChange(options.filter((_, i) => i !== index))}
              className={styles.pollOptionRemove}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onOptionsChange([...options, ""])}
        className={styles.pollOptionAdd}
      >
        + Add option
      </button>
      <label className={styles.pollMultipleChoiceLabel}>
        <input
          type="checkbox"
          checked={multipleChoice}
          onChange={(e) => onMultipleChoiceChange(e.target.checked)}
        />
        Allow multiple selections
      </label>
    </div>
  );
}
