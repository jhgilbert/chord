import { useCallback, useEffect, useRef, useState } from "react";
import {
  removeNote,
  setGroupedUnder,
  type Note,
  type NoteType,
} from "../../notes";
import { NOTE_TYPES } from "../../constants";
import type { Collaboration } from "../../collaborations";
import type { Session } from "../../session";
import { useClickOutside } from "../../hooks/useClickOutside";
import { hasUserInteracted } from "./noteFilters";
import StickyNote from "../StickyNote/StickyNote";
import styles from "./CollabRoute.module.css";

interface CollabNotesListProps {
  collab: Collaboration;
  notes: Note[];
  session: Session;
  isHost: boolean;
  allowedNoteTypes: NoteType[];
}

export default function CollabNotesList({
  collab,
  notes,
  session,
  isHost,
  allowedNoteTypes,
}: CollabNotesListProps) {
  const [filter, setFilter] = useState<"All" | "Inbox" | "Mine" | "Archived">(
    "Mine",
  );
  const [selectedNoteTypes, setSelectedNoteTypes] = useState<Set<NoteType>>(
    new Set(NOTE_TYPES.filter((t) => t !== "Host note")),
  );
  const [showNoteTypeFilter, setShowNoteTypeFilter] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [respondingToNoteId, setRespondingToNoteId] = useState<string | null>(
    null,
  );
  const [expandAllResponses, setExpandAllResponses] = useState(false);
  const noteTypeFilterRef = useRef<HTMLDivElement>(null);

  const closeNoteTypeFilter = useCallback(
    () => setShowNoteTypeFilter(false),
    [],
  );
  useClickOutside(noteTypeFilterRef, closeNoteTypeFilter, showNoteTypeFilter);

  // Auto-check new note types when they first appear
  useEffect(() => {
    if (notes.length === 0) return;

    const existingTypes = new Set(notes.map((note) => note.type));

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedNoteTypes((prevSelected) => {
      const newTypes = Array.from(existingTypes).filter(
        (type) => !prevSelected.has(type) && type !== "Host note",
      );
      if (newTypes.length > 0) {
        const newSet = new Set(prevSelected);
        newTypes.forEach((type) => newSet.add(type));
        return newSet;
      }
      return prevSelected;
    });
  }, [notes]);

  // Build noteGroups map from notes data
  const noteGroups = new Map<string, string[]>();
  for (const note of notes) {
    if (note.groupedUnder) {
      const existing = noteGroups.get(note.groupedUnder) || [];
      noteGroups.set(note.groupedUnder, [...existing, note.id]);
    }
  }

  // Build set of all grouped (child) note IDs
  const allChildIds = new Set<string>();
  for (const children of noteGroups.values()) {
    children.forEach((id) => allChildIds.add(id));
  }

  // Get note types that actually exist in the notes
  const existingNoteTypes = allowedNoteTypes.filter((type) =>
    notes.some((note) => note.type === type),
  );

  // Calculate inbox count
  const inboxCount = notes.filter((n) => {
    const interacted = hasUserInteracted(n, session.userId);
    return (
      (n.type === "Poll" || n.createdBy !== session.userId) &&
      !interacted &&
      !allChildIds.has(n.id) &&
      !n.archived &&
      n.type !== "Host note"
    );
  }).length;

  const archivedCount = notes.filter((n) => n.archived).length;

  let visibleNotes =
    filter === "Archived"
      ? notes.filter((n) => n.archived)
      : filter === "All"
        ? notes.filter((n) => !n.archived && selectedNoteTypes.has(n.type))
        : filter === "Inbox"
          ? notes.filter((n) => {
              const interacted = hasUserInteracted(n, session.userId);
              return (
                (n.type === "Poll" || n.createdBy !== session.userId) &&
                !interacted &&
                (!allChildIds.has(n.id) || n.id === respondingToNoteId) &&
                !n.archived &&
                n.type !== "Host note" &&
                selectedNoteTypes.has(n.type)
              );
            })
          : notes.filter(
              (n) =>
                n.createdBy === session.userId &&
                !n.archived &&
                selectedNoteTypes.has(n.type),
            );

  // Apply sort order (Inbox always shows oldest first)
  const effectiveSortOrder = filter === "Inbox" ? "asc" : sortOrder;
  if (effectiveSortOrder === "desc") {
    visibleNotes = [...visibleNotes].reverse();
  }

  const handleGroupNotes = async (parentId: string, childId: string) => {
    if (!isHost) return;
    if (parentId === childId) return;
    await setGroupedUnder(collab.id, childId, parentId);
  };

  const toggleGroup = (noteId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  // Build display list including grouped notes
  const displayNotes: Array<{
    note: Note;
    isGrouped: boolean;
    groupDepth: number;
    isParent: boolean;
  }> = [];

  for (const note of visibleNotes) {
    if (allChildIds.has(note.id) && note.id !== respondingToNoteId) continue;

    const children = noteGroups.get(note.id) || [];
    displayNotes.push({
      note,
      isGrouped: false,
      groupDepth: 0,
      isParent: children.length > 0,
    });

    if (expandedGroups.has(note.id)) {
      for (const childId of children) {
        const childNote = notes.find((n) => n.id === childId);
        if (childNote) {
          displayNotes.push({
            note: childNote,
            isGrouped: true,
            groupDepth: 1,
            isParent: false,
          });
        }
      }
    }
  }

  return (
    <main className={styles.collabMain}>
      <div className={styles.filterBar}>
        {(["Mine", "Inbox", "All", "Archived"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={styles.filterButton}
            data-active={filter === t}
            data-filter={t}
          >
            {t === "Mine"
              ? "Your notes"
              : t === "Inbox"
                ? `Inbox (${inboxCount})`
                : t === "Archived"
                  ? `Archived (${archivedCount})`
                  : t}
          </button>
        ))}
        <div ref={noteTypeFilterRef} className={styles.noteTypeFilterContainer}>
          <button
            onClick={() => setShowNoteTypeFilter(!showNoteTypeFilter)}
            className={styles.filterButton}
            data-active={selectedNoteTypes.size < existingNoteTypes.length}
          >
            Note types {showNoteTypeFilter ? "▲" : "▼"}
          </button>
          {showNoteTypeFilter && (
            <div className={styles.noteTypeFilterDropdown}>
              {existingNoteTypes.map((t) => (
                <label key={t} className={styles.noteTypeFilterOption}>
                  <input
                    type="checkbox"
                    checked={selectedNoteTypes.has(t)}
                    onChange={(e) => {
                      const newSet = new Set(selectedNoteTypes);
                      if (e.target.checked) {
                        newSet.add(t);
                      } else {
                        newSet.delete(t);
                      }
                      setSelectedNoteTypes(newSet);
                    }}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {isHost && (
          <button
            onClick={() => setExpandAllResponses((prev) => !prev)}
            className={styles.filterButton}
            data-active={expandAllResponses}
          >
            {expandAllResponses ? "Collapse responses" : "Expand responses"}
          </button>
        )}
        <div className={styles.sortOrderContainer}>
          <select
            value={filter === "Inbox" ? "asc" : sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className={styles.filterButton}
            data-active={sortOrder === "asc"}
            disabled={filter === "Inbox"}
            title={
              filter === "Inbox"
                ? "Inbox is always sorted oldest first"
                : undefined
            }
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
      </div>
      <div className={styles.notesList}>
        {displayNotes.map(({ note: n, isGrouped, groupDepth, isParent }) => (
          <div
            key={n.id}
            onClick={
              isParent && !isGrouped ? () => toggleGroup(n.id) : undefined
            }
            style={{
              cursor: isParent && !isGrouped ? "pointer" : undefined,
            }}
          >
            <StickyNote
              note={n}
              collaborationId={collab.id}
              sessionId={session.userId}
              displayName={session.displayName}
              canDelete={
                !collab.paused &&
                collab.active &&
                n.createdBy === session.userId &&
                (!n.responses || n.responses.length === 0)
              }
              canReact={
                !collab.paused &&
                collab.active &&
                n.createdBy !== session.userId
              }
              paused={!!collab.paused}
              onDelete={async () => {
                try {
                  await removeNote(collab.id, n.id);
                } catch (error) {
                  console.error("Failed to delete note:", error);
                  alert("Failed to delete note. Please try again.");
                }
              }}
              canDrag={isHost && !isGrouped}
              onDragStart={() => setDraggedNoteId(n.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedNoteId && draggedNoteId !== n.id) {
                  handleGroupNotes(n.id, draggedNoteId);
                  setDraggedNoteId(null);
                }
              }}
              isGrouped={isGrouped}
              groupDepth={groupDepth}
              canUngroup={isHost && isGrouped}
              onUngroup={() => setGroupedUnder(collab.id, n.id, null)}
              canEdit={
                !collab.paused &&
                collab.active &&
                n.createdBy === session.userId
              }
              canArchive={isHost && collab.active && !!collab.paused}
              onRespondingChange={(isResponding) =>
                setRespondingToNoteId(isResponding ? n.id : null)
              }
              hideYouBadge={filter === "Mine"}
              isHost={isHost}
              showAuthorNames={collab.showAuthorNames}
              forceExpandResponses={expandAllResponses}
            />
            {isParent && !isGrouped && (
              <div className={styles.groupIndicator}>
                {noteGroups.get(n.id)?.length || 0} grouped note
                {(noteGroups.get(n.id)?.length || 0) !== 1 ? "s" : ""}
                {expandedGroups.has(n.id) ? " ▲" : " ▼"}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
