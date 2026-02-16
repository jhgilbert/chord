import type { Reaction } from "../../notes";
import { sanitizeHtml } from "../../utils";
import styles from "./ResponseItem.module.css";

export default function ResponseItem({
  response,
  timestamp,
  paused,
  canReact,
  myReaction,
  counts,
  getReactionOpacity,
  handleReaction,
  showAuthorNames,
}: {
  response: { content: string; createdBy: string; createdByName: string };
  timestamp: string;
  paused: boolean;
  canReact: boolean;
  myReaction: Reaction | null;
  counts: { agree: number; disagree: number; markRead: number };
  getReactionOpacity: (r: Reaction) => number;
  handleReaction: (r: Reaction) => void;
  showAuthorNames?: boolean;
}) {
  return (
    <div className={styles.responseItem}>
      <div className={styles.responseDivider} />
      {(canReact || paused) && (
        <div className={styles.responseReactions}>
          <button
            onClick={canReact ? () => handleReaction("agree") : undefined}
            className={styles.responseReactionButton}
            data-active={myReaction === "agree"}
            data-paused={paused}
            style={{ opacity: getReactionOpacity("agree") }}
          >
            ➕ <span>{counts.agree}</span>
          </button>
        </div>
      )}
      <div className={styles.responseHeader}>
        <span className={styles.responseTimestamp}>{timestamp}</span>
        {showAuthorNames !== false && (
          <span className={styles.responseAuthor}>
            {response.createdByName}
          </span>
        )}
      </div>
      <div
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(response.content.replace(/&nbsp;/g, " ")),
        }}
        className={styles.responseContent}
      />
    </div>
  );
}
