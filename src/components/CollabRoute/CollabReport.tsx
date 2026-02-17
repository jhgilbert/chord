import { resumeCollaboration, type Collaboration } from "../../collaborations";
import type { Note } from "../../notes";
import {
  buildPromptTimeline,
  categorizeReactions,
  formatTimestamp,
  getAuthorName,
  getPromptForNote,
  stripHtml,
} from "./summaryUtils";
import { sanitizeHtml } from "../../utils";
import styles from "./CollabRoute.module.css";

interface CollabReportProps {
  collab: Collaboration;
  notes: Note[];
  isHost: boolean;
}

export default function CollabReport({
  collab,
  notes,
  isHost,
}: CollabReportProps) {
  const allPrompts = buildPromptTimeline(collab);
  const hostId = collab.startedBy;

  const formatReactionsText = (reactions: {
    agreed: string[];
    markRead: string[];
  }) => {
    let text = "";
    if (reactions.agreed.length > 0)
      text += `Agreed (${reactions.agreed.length}): ${reactions.agreed.join(", ")} `;
    if (reactions.markRead.length > 0)
      text += `Marked as read (${reactions.markRead.length}): ${reactions.markRead.join(", ")}`;
    return text;
  };

  const noteAuthor = (note: Note) =>
    getAuthorName(note.createdBy, hostId, note.createdByName, note.type);

  const getPollVoters = (note: Note, optionIdx: number) => {
    const voters = Object.entries(note.pollVotes || {}).filter(([, v]) =>
      Array.isArray(v) ? v.includes(optionIdx) : v === optionIdx,
    );
    return voters.map(([sessionId]) => {
      const noteByUser = notes.find((n) => n.createdBy === sessionId);
      if (!noteByUser) return sessionId;
      return sessionId === hostId
        ? `${noteByUser.createdByName} (host)`
        : noteByUser.createdByName;
    });
  };

  const generateHTML = () => {
    let html = "";

    const renderNoteHTML = (note: Note, idx: number) => {
      const authorName = noteAuthor(note);
      const timestamp = formatTimestamp(note.createdAt);
      html += `<h3>${idx + 1}. ${note.type} by ${authorName}</h3>`;
      html += `<p><em>${timestamp}</em></p>`;

      if (note.type === "Action item" && (note.assignee || note.dueDate)) {
        html += `<p>`;
        if (note.assignee)
          html += `<strong>Assignee:</strong> ${note.assignee}<br>`;
        if (note.dueDate) {
          html += `<strong>Due date:</strong> ${new Date(note.dueDate).toLocaleDateString()}<br>`;
        }
        html += `</p>`;
      }

      html += `<div>${sanitizeHtml(note.content)}</div>`;

      if (note.reactions && Object.keys(note.reactions).length > 0) {
        const reactions = categorizeReactions(note.reactions, notes, hostId);
        html += `<h4>Reactions</h4>`;
        html += `<p>${formatReactionsText(reactions)}</p>`;
      }

      if (note.responses && note.responses.length > 0) {
        html += `<h4>Responses (${note.responses.length})</h4><ul>`;
        note.responses.forEach((response) => {
          const ts = response.createdAt
            ? new Date(response.createdAt as number).toLocaleString()
            : "Unknown time";
          const name = getAuthorName(response.createdBy, hostId, response.createdByName);
          html += `<li><strong>${name}</strong> (${ts}): <div style="display:inline">${sanitizeHtml(response.content)}</div></li>`;
        });
        html += `</ul>`;
      }

      if (note.editHistory && note.editHistory.length > 0) {
        html += `<p><strong>Edit History (${plural(note.editHistory.length, "version")}):</strong></p><ol>`;
        note.editHistory.forEach((version) => {
          const ts = version.editedAt
            ? new Date(version.editedAt as number).toLocaleString()
            : "Unknown time";
          html += `<li>${ts}: <div style="display:inline">${sanitizeHtml(version.content)}</div></li>`;
        });
        html += `</ol>`;
      }

      html += `<hr>`;
    };

    const actionItems = notes.filter((n) => n.type === "Action item");
    const requirements = notes.filter((n) => n.type === "Requirement");
    const constructiveFeedback = notes.filter((n) => n.type === "Constructive feedback");
    const polls = notes.filter((n) => n.type === "Poll" && n.pollOptions);

    if (actionItems.length + requirements.length + constructiveFeedback.length + polls.length > 0) {
      html += `<h2>Key Takeaways</h2>`;

      if (actionItems.length > 0) {
        html += `<h3>Action Items</h3>`;
        html += table(
          tr(th("Prompt", TRUNCATE_STYLE), th("Note"), th("Author"), th("Assignee"), th("Due Date")),
          actionItems.map((note) => {
            const dueDate = note.dueDate ? new Date(note.dueDate).toLocaleDateString() : "-";
            return tr(
              td(getPromptForNote(note, allPrompts), TRUNCATE_STYLE),
              td(sanitizeHtml(note.content)),
              td(noteAuthor(note)),
              td(note.assignee || "-"),
              td(dueDate),
            );
          }),
        );
      }

      const renderSimpleTable = (title: string, items: Note[]) => {
        html += `<h3>${title}</h3>`;
        html += table(
          tr(th("Prompt", TRUNCATE_STYLE), th("Note"), th("Author")),
          items.map((note) =>
            tr(
              td(getPromptForNote(note, allPrompts), TRUNCATE_STYLE),
              td(sanitizeHtml(note.content)),
              td(noteAuthor(note)),
            ),
          ),
        );
      };

      if (requirements.length > 0) renderSimpleTable("Requirements", requirements);
      if (constructiveFeedback.length > 0) renderSimpleTable("Constructive Feedback", constructiveFeedback);

      if (polls.length > 0) {
        html += `<h3>Polls</h3>`;
        polls.forEach((note) => {
          const totalVoters = Object.keys(note.pollVotes || {}).length;
          html += `<h4>${sanitizeHtml(note.content)}</h4>`;
          html += `<p>Created by ${noteAuthor(note)} · ${plural(totalVoters, "vote")}${note.pollMultipleChoice ? " · Multiple choice" : ""}</p>`;
          html += table(
            tr(th("Option"), th("Votes"), th("%"), th("Participants")),
            note.pollOptions!.map((option, idx) => {
              const voterNames = getPollVoters(note, idx);
              const percentage = totalVoters > 0 ? Math.round((voterNames.length / totalVoters) * 100) : 0;
              return tr(
                td(option),
                td(String(voterNames.length)),
                td(`${percentage}%`),
                td(voterNames.join(", ")),
              );
            }),
          );
        });
      }
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
      const authorName = noteAuthor(note);
      const timestamp = formatTimestamp(note.createdAt);
      md += `### ${idx + 1}. ${note.type} by ${authorName}\n\n`;
      md += `*${timestamp}*\n\n`;

      if (note.type === "Action item" && (note.assignee || note.dueDate)) {
        if (note.assignee) md += `**Assignee:** ${note.assignee}  \n`;
        if (note.dueDate) {
          md += `**Due date:** ${new Date(note.dueDate).toLocaleDateString()}  \n`;
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
          const ts = response.createdAt
            ? new Date(response.createdAt as number).toLocaleString()
            : "Unknown time";
          const name = getAuthorName(response.createdBy, hostId, response.createdByName);
          md += `- **${name}** (${ts}): ${responseText}\n`;
        });
        md += `\n`;
      }

      if (note.editHistory && note.editHistory.length > 0) {
        md += `**Edit History (${plural(note.editHistory.length, "version")}):**\n\n`;
        note.editHistory.forEach((version, vIdx) => {
          const versionText = stripHtml(version.content);
          const ts = version.editedAt
            ? new Date(version.editedAt as number).toLocaleString()
            : "Unknown time";
          md += `${vIdx + 1}. ${ts}: ${versionText}\n`;
        });
        md += `\n`;
      }

      md += `---\n\n`;
    };

    const actionItems = notes.filter((n) => n.type === "Action item");
    const requirements = notes.filter((n) => n.type === "Requirement");
    const constructiveFeedback = notes.filter((n) => n.type === "Constructive feedback");
    const polls = notes.filter((n) => n.type === "Poll" && n.pollOptions);

    if (actionItems.length + requirements.length + constructiveFeedback.length + polls.length > 0) {
      md += `## Key Takeaways\n\n`;

      if (actionItems.length > 0) {
        md += `### Action Items\n\n`;
        md += `| Prompt | Note | Author | Assignee | Due Date |\n`;
        md += `|--------|------|--------|----------|----------|\n`;
        actionItems.forEach((note) => {
          const noteText = mdEscape(stripHtml(note.content));
          const promptText = mdEscape(getPromptForNote(note, allPrompts));
          const dueDate = note.dueDate ? new Date(note.dueDate).toLocaleDateString() : "-";
          md += `| ${promptText} | ${noteText} | ${noteAuthor(note)} | ${note.assignee || "-"} | ${dueDate} |\n`;
        });
        md += `\n`;
      }

      const renderSimpleTableMd = (title: string, items: Note[]) => {
        md += `### ${title}\n\n`;
        md += `| Prompt | Note | Author |\n`;
        md += `|--------|------|--------|\n`;
        items.forEach((note) => {
          const noteText = mdEscape(stripHtml(note.content));
          const promptText = mdEscape(getPromptForNote(note, allPrompts));
          md += `| ${promptText} | ${noteText} | ${noteAuthor(note)} |\n`;
        });
        md += `\n`;
      };

      if (requirements.length > 0) renderSimpleTableMd("Requirements", requirements);
      if (constructiveFeedback.length > 0) renderSimpleTableMd("Constructive Feedback", constructiveFeedback);

      if (polls.length > 0) {
        md += `### Polls\n\n`;
        polls.forEach((note) => {
          const noteText = stripHtml(note.content).replace(/\n/g, " ");
          const totalVoters = Object.keys(note.pollVotes || {}).length;
          md += `**${noteText}**\n\n`;
          md += `Created by ${noteAuthor(note)} · ${plural(totalVoters, "vote")}${note.pollMultipleChoice ? " · Multiple choice" : ""}\n\n`;
          md += `| Option | Votes | % | Participants |\n`;
          md += `|--------|-------|---|---------------|\n`;
          note.pollOptions!.forEach((option, idx) => {
            const voterNames = getPollVoters(note, idx);
            const percentage = totalVoters > 0 ? Math.round((voterNames.length / totalVoters) * 100) : 0;
            md += `| ${mdEscape(option)} | ${voterNames.length} | ${percentage}% | ${voterNames.join(", ")} |\n`;
          });
          md += `\n`;
        });
      }
    }

    if (notes.length > 0) {
      md += `## Collaboration Timeline (${notes.length})\n\n`;
      notes.forEach((note, idx) => renderNote(note, idx));
    }

    return md;
  };

  const handleReopen = async () => {
    try {
      await resumeCollaboration(collab.id);
    } catch (error) {
      console.error("Failed to reopen collaboration:", error);
      alert("Failed to reopen collaboration. Please try again.");
    }
  };

  const handleCopyMarkdown = async () => {
    await navigator.clipboard.writeText(generateMarkdown());
    alert("Copied Markdown to clipboard!");
  };

  const handleCopyHTML = async () => {
    const html = generateHTML();
    const blob = new Blob([html], { type: "text/html" });
    const clipboardItem = new ClipboardItem({ "text/html": blob });
    await navigator.clipboard.write([clipboardItem]);
    alert("Copied to clipboard! Paste into Google Docs to preserve formatting.");
  };

  return (
    <div className={styles.stoppedScreen}>
      <div className={styles.stoppedHeader}>
        <h1 className={styles.stoppedTitle}>Collaboration: {collab.title}</h1>
        <p className={styles.stoppedMessage}>
          This collaboration was closed by the host,{" "}
          <b>{collab.startedByName}</b>.
        </p>
        {isHost && (
          <button onClick={handleReopen} className={styles.resumeButton}>
            Reopen collaboration
          </button>
        )}
      </div>
      <div className={styles.stoppedReport}>
        <div className={styles.reportHeader}>
          <h2 className={styles.reportTitle}>Results</h2>
          <div className={styles.reportControls}>
            <button onClick={handleCopyMarkdown} className={styles.copyButton}>
              Copy as Markdown
            </button>
            <button onClick={handleCopyHTML} className={styles.copyButton}>
              Copy for Google Docs
            </button>
          </div>
        </div>
        <div
          className={styles.reportContent}
          dangerouslySetInnerHTML={{
            __html: generateHTML().replace(/&nbsp;/g, " "),
          }}
        />
      </div>
    </div>
  );
}

// --- HTML templating helpers ---

const TRUNCATE_STYLE = "max-width: 300px; overflow: hidden; text-overflow: ellipsis;";

function th(content: string, style?: string): string {
  const s = style ? `padding: 8px 12px; ${style}` : "padding: 8px 12px;";
  return `<th style="${s}">${content}</th>`;
}

function td(content: string, style?: string): string {
  const s = style ? `padding: 8px 12px; ${style}` : "padding: 8px 12px;";
  return `<td style="${s}">${content}</td>`;
}

function tr(...cells: string[]): string {
  return `<tr>${cells.join("")}</tr>`;
}

function table(headRow: string, bodyRows: string[]): string {
  return `<table border="1" style="width:100%; border-collapse:collapse; margin-bottom:20px;"><thead>${headRow}</thead><tbody>${bodyRows.join("")}</tbody></table>`;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count !== 1 ? "s" : ""}`;
}

function mdEscape(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
