import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../../session";
import { startCollaboration } from "../../collaborations";
import { type NoteType } from "../../notes";
import { NOTE_TYPES, QUILL_MODULES } from "../../constants";
import styles from "./StartScreen.module.css";

export default function StartScreen() {
  const navigate = useNavigate();
  const session = getSession();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!session) {
      navigate("/login", { replace: true });
    }
  }, [session, navigate]);

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [allowedNoteTypes, setAllowedNoteTypes] = useState<NoteType[]>([
    "Question",
    "Statement",
    "Recommendation",
  ]);
  const [showAuthorNames, setShowAuthorNames] = useState(true);

  if (!session) return null;

  const handleStart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Check if title is empty
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }
    // Check if prompt is empty by stripping HTML and checking text content
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = prompt;
    const textContent = (tempDiv.textContent || tempDiv.innerText || "").trim();
    if (!textContent) {
      alert("Please enter a collaboration prompt");
      return;
    }
    if (allowedNoteTypes.length === 0) {
      alert("Please select at least one note type");
      return;
    }
    const id = crypto.randomUUID();
    // Always include "Host note" in allowed types
    const noteTypesWithHostNote = [
      ...allowedNoteTypes,
      "Host note" as NoteType,
    ];
    try {
      await startCollaboration(
        id,
        session.userId,
        session.displayName,
        title,
        prompt,
        noteTypesWithHostNote,
        showAuthorNames,
      );
      navigate(`/collabs/${id}`, { replace: true });
    } catch (error) {
      console.error("Failed to start collaboration:", error);
      alert("Failed to start collaboration. Please try again.");
    }
  };

  const toggleNoteType = (type: NoteType) => {
    setAllowedNoteTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  return (
    <div className={styles.startScreen}>
      <h1 className={styles.logo}>
        {["C", "H", "O", "R", "D"].map((letter, i) => {
          const colors = ["#b5179e", "#7209b7", "#3f37c9", "#4895ef", "#4cc9f0"];
          return (
            <span key={letter} className={styles.logoColumn} style={{ color: colors[i] }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={styles.logoNote}>
                <path fill="currentColor" d="M16 3h-2v10.56a3.96 3.96 0 0 0-2-.56a4 4 0 1 0 4 4zm-4 16a2 2 0 1 1 2-2a2 2 0 0 1-2 2" />
              </svg>
              <span className={styles.logoLetter}>{letter}</span>
            </span>
          );
        })}
      </h1>
      <p className={styles.startScreenUser}>
        You are: <b>{session.displayName}</b>
      </p>
      <form onSubmit={handleStart} className={styles.startScreenForm}>
        <label className={styles.startScreenLabel}>
          Title <span style={{ color: "#b5179e" }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.startScreenInput}
          placeholder="Enter a title for this collaboration"
        />
        <label className={styles.startScreenLabel}>
          Collaboration prompt <span style={{ color: "#b5179e" }}>*</span>
        </label>
        <ReactQuill
          theme="snow"
          value={prompt}
          onChange={setPrompt}
          className={styles.startScreenEditor}
          modules={QUILL_MODULES}
        />
        <div className={styles.noteTypesSelection}>
          <label className={styles.noteTypesLabel}>Allowed note types</label>
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}
            >
              Quick presets:
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {(() => {
                const discussionPreset: NoteType[] = [
                  "Question",
                  "Statement",
                  "Recommendation",
                ];
                const retroPreset: NoteType[] = [
                  "Positive feedback",
                  "Constructive feedback",
                ];
                const qaPreset: NoteType[] = ["Question"];

                const arraysMatch = (a: NoteType[], b: NoteType[]) =>
                  a.length === b.length &&
                  a.every((item) => b.includes(item)) &&
                  b.every((item) => a.includes(item));

                const isDiscussionActive = arraysMatch(
                  allowedNoteTypes,
                  discussionPreset,
                );
                const isRetroActive = arraysMatch(
                  allowedNoteTypes,
                  retroPreset,
                );
                const isQAActive = arraysMatch(allowedNoteTypes, qaPreset);

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setAllowedNoteTypes(discussionPreset)}
                      style={{
                        padding: "8px 14px",
                        fontSize: "14px",
                        cursor: "pointer",
                        border: isDiscussionActive
                          ? "2px solid #4895ef"
                          : "1px solid #4895ef",
                        borderRadius: "6px",
                        backgroundColor: isDiscussionActive
                          ? "#4895ef"
                          : "#e8f2fe",
                        color: isDiscussionActive ? "#ffffff" : "#4895ef",
                        fontWeight: isDiscussionActive ? "600" : "500",
                        boxShadow: isDiscussionActive
                          ? "0 2px 4px rgba(72,149,239,0.3)"
                          : "none",
                      }}
                    >
                      📋 Discussion
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllowedNoteTypes(retroPreset)}
                      style={{
                        padding: "8px 14px",
                        fontSize: "14px",
                        cursor: "pointer",
                        border: isRetroActive
                          ? "2px solid #4895ef"
                          : "1px solid #4895ef",
                        borderRadius: "6px",
                        backgroundColor: isRetroActive ? "#4895ef" : "#e8f2fe",
                        color: isRetroActive ? "#ffffff" : "#4895ef",
                        fontWeight: isRetroActive ? "600" : "500",
                        boxShadow: isRetroActive
                          ? "0 2px 4px rgba(72,149,239,0.3)"
                          : "none",
                      }}
                    >
                      🔄 Retro
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllowedNoteTypes(qaPreset)}
                      style={{
                        padding: "8px 14px",
                        fontSize: "14px",
                        cursor: "pointer",
                        border: isQAActive
                          ? "2px solid #4895ef"
                          : "1px solid #4895ef",
                        borderRadius: "6px",
                        backgroundColor: isQAActive ? "#4895ef" : "#e8f2fe",
                        color: isQAActive ? "#ffffff" : "#4895ef",
                        fontWeight: isQAActive ? "600" : "500",
                        boxShadow: isQAActive
                          ? "0 2px 4px rgba(72,149,239,0.3)"
                          : "none",
                      }}
                    >
                      ❓ Q & A
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
          <div className={styles.noteTypesCheckboxes}>
            {NOTE_TYPES.filter((type) => type !== "Host note").map((type) => (
              <label key={type} className={styles.noteTypeCheckbox}>
                <input
                  type="checkbox"
                  checked={allowedNoteTypes.includes(type)}
                  onChange={() => toggleNoteType(type)}
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>
        <div style={{ marginTop: "20px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
            }}
          >
            <input
              type="checkbox"
              checked={showAuthorNames}
              onChange={(e) => setShowAuthorNames(e.target.checked)}
              style={{ cursor: "pointer", accentColor: "#7209b7" }}
            />
            <span>Show author names</span>
          </label>
        </div>
        <div className={styles.startScreenActions}>
          <button type="submit" className={styles.startScreenSubmit}>
            Start collaboration
          </button>
        </div>
      </form>
    </div>
  );
}
