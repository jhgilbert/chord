import { useState } from "react";
import { resumeCollaboration, type Collaboration } from "../../collaborations";
import type { Note } from "../../notes";
import type { Session } from "../../session";
import {
  buildPromptTimeline,
  categorizeReactions,
  formatTimestamp,
  getAuthorName,
  getPromptForNote,
  stripHtml,
} from "./summaryUtils";
import styles from "./CollabRoute.module.css";

interface CollabSummaryProps {
  collab: Collaboration;
  notes: Note[];
  session: Session;
  isHost: boolean;
}

export default function CollabSummary({
  collab,
  notes,
  session: _session,
  isHost,
}: CollabSummaryProps) {
  const [summaryFormat, setSummaryFormat] = useState<"html" | "markdown">(
    "html",
  );

  const allPrompts = buildPromptTimeline(collab);
  const hostId = collab.startedBy;

  const formatReactionsText = (reactions: {
    agreed: string[];
    disagreed: string[];
    markRead: string[];
  }) => {
    let text = "";
    if (reactions.agreed.length > 0)
      text += `Agreed (${reactions.agreed.length}): ${reactions.agreed.join(", ")} `;
    if (reactions.disagreed.length > 0)
      text += `Disagreed (${reactions.disagreed.length}): ${reactions.disagreed.join(", ")} `;
    if (reactions.markRead.length > 0)
      text += `Marked as read (${reactions.markRead.length}): ${reactions.markRead.join(", ")}`;
    return text;
  };

  const generateHTML = () => {
    let html = "";

    const renderNoteHTML = (note: Note, idx: number) => {
      const authorName = getAuthorName(
        note.createdBy,
        hostId,
        note.createdByName,
        note.type,
      );
      const timestamp = formatTimestamp(note.createdAt);
      html += `<h3>${idx + 1}. ${note.type} by ${authorName}</h3>`;
      html += `<p><em>${timestamp}</em></p>`;

      if (note.type === "Action item" && (note.assignee || note.dueDate)) {
        html += `<p>`;
        if (note.assignee)
          html += `<strong>Assignee:</strong> ${note.assignee}<br>`;
        if (note.dueDate) {
          const dueDate = new Date(note.dueDate).toLocaleDateString();
          html += `<strong>Due date:</strong> ${dueDate}<br>`;
        }
        html += `</p>`;
      }

      html += `<div>${note.content}</div>`;

      if (note.reactions && Object.keys(note.reactions).length > 0) {
        const reactions = categorizeReactions(note.reactions, notes, hostId);
        html += `<h4>Reactions</h4>`;
        html += `<p>${formatReactionsText(reactions)}</p>`;
      }

      if (note.responses && note.responses.length > 0) {
        html += `<h4>Responses (${note.responses.length})</h4>`;
        html += `<ul>`;
        note.responses.forEach((response) => {
          const timestamp = response.createdAt
            ? new Date(response.createdAt as number).toLocaleString()
            : "Unknown time";
          const responseAuthorName = getAuthorName(
            response.createdBy,
            hostId,
            response.createdByName,
          );
          html += `<li><strong>${responseAuthorName}</strong> (${timestamp}): <div style="display:inline">${response.content}</div></li>`;
        });
        html += `</ul>`;
      }

      if (note.editHistory && note.editHistory.length > 0) {
        html += `<p><strong>Edit History (${note.editHistory.length} version${note.editHistory.length !== 1 ? "s" : ""}):</strong></p><ol>`;
        note.editHistory.forEach((version) => {
          const timestamp = version.editedAt
            ? new Date(version.editedAt as number).toLocaleString()
            : "Unknown time";
          html += `<li>${timestamp}: <div style="display:inline">${version.content}</div></li>`;
        });
        html += `</ol>`;
      }

      html += `<hr>`;
    };

    // Key takeaways section
    const actionItems = notes.filter((n) => n.type === "Action item");
    const requirements = notes.filter((n) => n.type === "Requirement");
    const constructiveFeedback = notes.filter(
      (n) => n.type === "Constructive feedback",
    );

    if (
      actionItems.length > 0 ||
      requirements.length > 0 ||
      constructiveFeedback.length > 0
    ) {
      html += `<h2>Key Takeaways</h2>`;

      if (actionItems.length > 0) {
        html += `<h3>Action Items</h3>`;
        html += `<table border="1" style="width:100%; border-collapse:collapse; margin-bottom:20px;">`;
        html += `<thead><tr><th style="padding: 8px 12px;">Prompt</th><th style="padding: 8px 12px;">Note</th><th style="padding: 8px 12px;">Author</th><th style="padding: 8px 12px;">Assignee</th><th style="padding: 8px 12px;">Due Date</th></tr></thead>`;
        html += `<tbody>`;
        actionItems.forEach((note) => {
          const authorName = getAuthorName(
            note.createdBy,
            hostId,
            note.createdByName,
            note.type,
          );
          const assignee = note.assignee || "-";
          const dueDate = note.dueDate
            ? new Date(note.dueDate).toLocaleDateString()
            : "-";
          html += `<tr>`;
          html += `<td style="padding: 8px 12px;">${getPromptForNote(note, allPrompts)}</td>`;
          html += `<td style="padding: 8px 12px;">${note.content}</td>`;
          html += `<td style="padding: 8px 12px;">${authorName}</td>`;
          html += `<td style="padding: 8px 12px;">${assignee}</td>`;
          html += `<td style="padding: 8px 12px;">${dueDate}</td>`;
          html += `</tr>`;
        });
        html += `</tbody></table>`;
      }

      const renderSimpleTableHTML = (title: string, items: Note[]) => {
        html += `<h3>${title}</h3>`;
        html += `<table border="1" style="width:100%; border-collapse:collapse; margin-bottom:20px;">`;
        html += `<thead><tr><th style="padding: 8px 12px;">Prompt</th><th style="padding: 8px 12px;">Note</th><th style="padding: 8px 12px;">Author</th></tr></thead>`;
        html += `<tbody>`;
        items.forEach((note) => {
          const authorName = getAuthorName(
            note.createdBy,
            hostId,
            note.createdByName,
            note.type,
          );
          html += `<tr>`;
          html += `<td style="padding: 8px 12px;">${getPromptForNote(note, allPrompts)}</td>`;
          html += `<td style="padding: 8px 12px;">${note.content}</td>`;
          html += `<td style="padding: 8px 12px;">${authorName}</td>`;
          html += `</tr>`;
        });
        html += `</tbody></table>`;
      };

      if (requirements.length > 0)
        renderSimpleTableHTML("Requirements", requirements);
      if (constructiveFeedback.length > 0)
        renderSimpleTableHTML("Constructive Feedback", constructiveFeedback);
    }

    if (notes.length > 0) {
      html += `<h2>Collaboration Timeline (${notes.length})</h2>`;
      notes.forEach((note, idx) => renderNoteHTML(note, idx));
    }

    return html;
  };

  const generateMarkdown = () => {
    let md = "";

    const renderNote = (note: Note, idx: number) => {
      const noteText = stripHtml(note.content);
      const authorName = getAuthorName(
        note.createdBy,
        hostId,
        note.createdByName,
        note.type,
      );
      const timestamp = formatTimestamp(note.createdAt);
      md += `### ${idx + 1}. ${note.type} by ${authorName}\n\n`;
      md += `*${timestamp}*\n\n`;

      if (note.type === "Action item" && (note.assignee || note.dueDate)) {
        if (note.assignee) md += `**Assignee:** ${note.assignee}  \n`;
        if (note.dueDate) {
          const dueDate = new Date(note.dueDate).toLocaleDateString();
          md += `**Due date:** ${dueDate}  \n`;
        }
        md += `\n`;
      }

      md += `${noteText}\n\n`;

      if (note.reactions && Object.keys(note.reactions).length > 0) {
        const reactions = categorizeReactions(note.reactions, notes, hostId);
        md += `#### Reactions\n\n`;
        md += formatReactionsText(reactions);
        md += `\n\n`;
      }

      if (note.responses && note.responses.length > 0) {
        md += `#### Responses (${note.responses.length})\n\n`;
        note.responses.forEach((response) => {
          const responseText = stripHtml(response.content);
          const timestamp = response.createdAt
            ? new Date(response.createdAt as number).toLocaleString()
            : "Unknown time";
          const responseAuthorName = getAuthorName(
            response.createdBy,
            hostId,
            response.createdByName,
          );
          md += `- **${responseAuthorName}** (${timestamp}): ${responseText}\n`;
        });
        md += `\n`;
      }

      if (note.editHistory && note.editHistory.length > 0) {
        md += `**Edit History (${note.editHistory.length} version${note.editHistory.length !== 1 ? "s" : ""}):**\n\n`;
        note.editHistory.forEach((version, vIdx) => {
          const versionText = stripHtml(version.content);
          const timestamp = version.editedAt
            ? new Date(version.editedAt as number).toLocaleString()
            : "Unknown time";
          md += `${vIdx + 1}. ${timestamp}: ${versionText}\n`;
        });
        md += `\n`;
      }

      md += `---\n\n`;
    };

    // Key takeaways
    const actionItems = notes.filter((n) => n.type === "Action item");
    const requirements = notes.filter((n) => n.type === "Requirement");
    const constructiveFeedback = notes.filter(
      (n) => n.type === "Constructive feedback",
    );

    if (
      actionItems.length > 0 ||
      requirements.length > 0 ||
      constructiveFeedback.length > 0
    ) {
      md += `## Key Takeaways\n\n`;

      if (actionItems.length > 0) {
        md += `### Action Items\n\n`;
        md += `| Prompt | Note | Author | Assignee | Due Date |\n`;
        md += `|--------|------|--------|----------|----------|\n`;
        actionItems.forEach((note) => {
          const noteText = stripHtml(note.content)
            .replace(/\|/g, "\\|")
            .replace(/\n/g, " ");
          const authorName = getAuthorName(
            note.createdBy,
            hostId,
            note.createdByName,
            note.type,
          );
          const promptText = getPromptForNote(note, allPrompts)
            .replace(/\|/g, "\\|")
            .replace(/\n/g, " ");
          const assignee = note.assignee || "-";
          const dueDate = note.dueDate
            ? new Date(note.dueDate).toLocaleDateString()
            : "-";
          md += `| ${promptText} | ${noteText} | ${authorName} | ${assignee} | ${dueDate} |\n`;
        });
        md += `\n`;
      }

      const renderSimpleTableMd = (title: string, items: Note[]) => {
        md += `### ${title}\n\n`;
        md += `| Prompt | Note | Author |\n`;
        md += `|--------|------|--------|\n`;
        items.forEach((note) => {
          const noteText = stripHtml(note.content)
            .replace(/\|/g, "\\|")
            .replace(/\n/g, " ");
          const authorName = getAuthorName(
            note.createdBy,
            hostId,
            note.createdByName,
            note.type,
          );
          const promptText = getPromptForNote(note, allPrompts)
            .replace(/\|/g, "\\|")
            .replace(/\n/g, " ");
          md += `| ${promptText} | ${noteText} | ${authorName} |\n`;
        });
        md += `\n`;
      };

      if (requirements.length > 0)
        renderSimpleTableMd("Requirements", requirements);
      if (constructiveFeedback.length > 0)
        renderSimpleTableMd("Constructive Feedback", constructiveFeedback);
    }

    if (notes.length > 0) {
      md += `## Collaboration Timeline (${notes.length})\n\n`;
      notes.forEach((note, idx) => renderNote(note, idx));
    }

    return md;
  };

  return (
    <div className={styles.stoppedScreen}>
      <div className={styles.stoppedHeader}>
        <h1 className={styles.stoppedTitle}>Collaboration Results</h1>
        <p className={styles.stoppedMessage}>
          This collaboration was closed by the host,{" "}
          <b>{collab.startedByName}</b>.
        </p>
        {isHost && (
          <button
            onClick={() => resumeCollaboration(collab.id)}
            className={styles.resumeButton}
          >
            Reopen collaboration
          </button>
        )}
      </div>
      <div className={styles.stoppedSummary}>
        <div className={styles.summaryHeader}>
          <h2 className={styles.summaryTitle}>Summary</h2>
          <div className={styles.summaryControls}>
            <div className={styles.formatToggle}>
              <button
                onClick={() => setSummaryFormat("html")}
                className={styles.formatButton}
                data-active={summaryFormat === "html"}
              >
                HTML
              </button>
              <button
                onClick={() => setSummaryFormat("markdown")}
                className={styles.formatButton}
                data-active={summaryFormat === "markdown"}
              >
                Markdown
              </button>
            </div>
            <button
              onClick={async () => {
                if (summaryFormat === "markdown") {
                  await navigator.clipboard.writeText(generateMarkdown());
                  alert("Copied Markdown to clipboard!");
                } else {
                  const html = generateHTML();
                  const blob = new Blob([html], { type: "text/html" });
                  const clipboardItem = new ClipboardItem({
                    "text/html": blob,
                  });
                  await navigator.clipboard.write([clipboardItem]);
                  alert(
                    "Copied HTML to clipboard! Paste into Google Docs to preserve formatting.",
                  );
                }
              }}
              className={styles.copyButton}
            >
              Copy
            </button>
          </div>
        </div>
        {summaryFormat === "markdown" ? (
          <pre className={styles.summaryContent}>
            {generateMarkdown().replace(/&nbsp;/g, " ")}
          </pre>
        ) : (
          <div
            className={styles.summaryContent}
            dangerouslySetInnerHTML={{
              __html: generateHTML().replace(/&nbsp;/g, " "),
            }}
          />
        )}
      </div>
    </div>
  );
}
