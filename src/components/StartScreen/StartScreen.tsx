import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getSession } from "../../session";
import { startCollaboration } from "../../collaborations";
import { type NoteType } from "../../notes";
import { NOTE_TYPES, QUILL_MODULES } from "../../constants";
import Logo from "../Logo/Logo";
import styles from "./StartScreen.module.css";

export default function StartScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!session) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
    }
  }, [session, navigate, location.pathname]);

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
      <Logo />
      <p className={styles.startScreenUser}>
        Signed in as <b>{session.displayName}</b>.{" "}
        <Link to="/logout" className={styles.signOutLink}>Sign out</Link>
      </p>
      <form onSubmit={handleStart} className={styles.startScreenForm}>
        <label className={styles.startScreenLabel}>
          Title <span style={{ color: "var(--color-magenta)" }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.startScreenInput}
          placeholder="Enter a title for this collaboration"
        />
        <label className={styles.startScreenLabel}>
          Collaboration prompt{" "}
          <span style={{ color: "var(--color-magenta)" }}>*</span>
        </label>
        <ReactQuill
          theme="snow"
          value={prompt}
          onChange={setPrompt}
          className={styles.startScreenEditor}
          modules={QUILL_MODULES}
        />
        <div style={{ marginTop: "28px" }}>
          <label className={styles.noteTypeCheckbox}>
            <input
              type="checkbox"
              checked={showAuthorNames}
              onChange={(e) => setShowAuthorNames(e.target.checked)}
            />
            <span>Show author names</span>
          </label>
        </div>
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
                          ? "2px solid var(--color-sky-blue)"
                          : "1px solid var(--color-sky-blue)",
                        borderRadius: "6px",
                        backgroundColor: isDiscussionActive
                          ? "var(--color-sky-blue)"
                          : "#e8f2fe",
                        color: isDiscussionActive
                          ? "#ffffff"
                          : "var(--color-sky-blue)",
                        fontWeight: isDiscussionActive ? "600" : "500",
                        boxShadow: isDiscussionActive
                          ? "0 2px 4px rgba(72,149,239,0.3)"
                          : "none",
                      }}
                    >
                      Discussion
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllowedNoteTypes(retroPreset)}
                      style={{
                        padding: "8px 14px",
                        fontSize: "14px",
                        cursor: "pointer",
                        border: isRetroActive
                          ? "2px solid var(--color-sky-blue)"
                          : "1px solid var(--color-sky-blue)",
                        borderRadius: "6px",
                        backgroundColor: isRetroActive
                          ? "var(--color-sky-blue)"
                          : "#e8f2fe",
                        color: isRetroActive
                          ? "#ffffff"
                          : "var(--color-sky-blue)",
                        fontWeight: isRetroActive ? "600" : "500",
                        boxShadow: isRetroActive
                          ? "0 2px 4px rgba(72,149,239,0.3)"
                          : "none",
                      }}
                    >
                      Retro
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllowedNoteTypes(qaPreset)}
                      style={{
                        padding: "8px 14px",
                        fontSize: "14px",
                        cursor: "pointer",
                        border: isQAActive
                          ? "2px solid var(--color-sky-blue)"
                          : "1px solid var(--color-sky-blue)",
                        borderRadius: "6px",
                        backgroundColor: isQAActive
                          ? "var(--color-sky-blue)"
                          : "#e8f2fe",
                        color: isQAActive ? "#ffffff" : "var(--color-sky-blue)",
                        fontWeight: isQAActive ? "600" : "500",
                        boxShadow: isQAActive
                          ? "0 2px 4px rgba(72,149,239,0.3)"
                          : "none",
                      }}
                    >
                      Q & A
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
        <div className={styles.startScreenActions}>
          <button type="submit" className={styles.startScreenSubmit}>
            Start collaboration
          </button>
        </div>
      </form>
    </div>
  );
}
