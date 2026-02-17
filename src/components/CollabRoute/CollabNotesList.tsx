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

type Filter = "All" | "Inbox" | "Mine" | "Archived";
type SortOrder = "asc" | "desc" | "upvotes";

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
  const [filter, setFilter] = useState<Filter>("Mine");
  const [selectedNoteTypes, setSelectedNoteTypes] = useState<Set<NoteType>>(
    new Set(NOTE_TYPES.filter((t) => t !== "Host note")),
  );
  const [showNoteTypeFilter, setShowNoteTypeFilter] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
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

  const { noteGroups, allChildIds } = buildNoteGroups(notes);

  const existingNoteTypes = allowedNoteTypes.filter((type) =>
    notes.some((note) => note.type === type),
  );

  const inboxCount = getInboxCount(notes, session.userId, allChildIds);
  const archivedCount = notes.filter((n) => n.archived).length;

  const visibleNotes = sortNotes(
    filterNotes(notes, filter, selectedNoteTypes, session.userId, allChildIds, respondingToNoteId),
    filter === "Inbox" ? "asc" : sortOrder,
  );

  const handleDeleteNote = async (noteId: string) => {
    try {
      await removeNote(collab.id, noteId);
    } catch (error) {
      console.error("Failed to delete note:", error);
      alert("Failed to delete note. Please try again.");
    }
  };

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

  const displayNotes = buildDisplayList(
    visibleNotes, notes, noteGroups, allChildIds, expandedGroups, respondingToNoteId,
  );

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
        <NoteTypeDropdown
          existingNoteTypes={existingNoteTypes}
          selectedNoteTypes={selectedNoteTypes}
          onSelectedNoteTypesChange={setSelectedNoteTypes}
          showDropdown={showNoteTypeFilter}
          onShowDropdownChange={setShowNoteTypeFilter}
          dropdownRef={noteTypeFilterRef}
        />
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
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className={styles.filterButton}
            data-active={sortOrder !== "desc"}
            disabled={filter === "Inbox"}
            title={
              filter === "Inbox"
                ? "Inbox is always sorted oldest first"
                : undefined
            }
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
            {isHost && <option value="upvotes">Most upvotes</option>}
          </select>
        </div>
      </div>
      <div className={styles.notesList}>
        {filter === "Mine" && displayNotes.length === 0 && !collab.paused && (
          <EmptyHint />
        )}
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
              onDelete={() => handleDeleteNote(n.id)}
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

interface DisplayNote {
  note: Note;
  isGrouped: boolean;
  groupDepth: number;
  isParent: boolean;
}

function buildNoteGroups(notes: Note[]) {
  const noteGroups = new Map<string, string[]>();
  for (const note of notes) {
    if (note.groupedUnder) {
      const existing = noteGroups.get(note.groupedUnder) || [];
      noteGroups.set(note.groupedUnder, [...existing, note.id]);
    }
  }

  const allChildIds = new Set<string>();
  for (const children of noteGroups.values()) {
    children.forEach((id) => allChildIds.add(id));
  }

  return { noteGroups, allChildIds };
}

function getInboxCount(notes: Note[], userId: string, allChildIds: Set<string>) {
  return notes.filter((n) => {
    const interacted = hasUserInteracted(n, userId);
    return (
      (n.type === "Poll" || n.createdBy !== userId) &&
      !interacted &&
      !allChildIds.has(n.id) &&
      !n.archived &&
      !n.markedDuplicate &&
      n.type !== "Host note"
    );
  }).length;
}

function filterNotes(
  notes: Note[],
  filter: Filter,
  selectedNoteTypes: Set<NoteType>,
  userId: string,
  allChildIds: Set<string>,
  respondingToNoteId: string | null,
): Note[] {
  switch (filter) {
    case "Archived":
      return notes.filter((n) => n.archived);
    case "All":
      return notes.filter((n) => !n.archived && selectedNoteTypes.has(n.type));
    case "Inbox":
      return notes.filter((n) => {
        const interacted = hasUserInteracted(n, userId);
        return (
          (n.type === "Poll" || n.createdBy !== userId) &&
          !interacted &&
          (!allChildIds.has(n.id) || n.id === respondingToNoteId) &&
          !n.archived &&
          !n.markedDuplicate &&
          n.type !== "Host note" &&
          selectedNoteTypes.has(n.type)
        );
      });
    case "Mine":
      return notes.filter(
        (n) =>
          n.createdBy === userId &&
          !n.archived &&
          selectedNoteTypes.has(n.type),
      );
  }
}

function sortNotes(notes: Note[], order: SortOrder): Note[] {
  if (order === "upvotes") {
    return [...notes].sort((a, b) => {
      const aCount = Object.values(a.reactions ?? {}).filter(
        (r) => r === "agree",
      ).length;
      const bCount = Object.values(b.reactions ?? {}).filter(
        (r) => r === "agree",
      ).length;
      return bCount - aCount;
    });
  }
  if (order === "desc") {
    return [...notes].reverse();
  }
  return notes;
}

function buildDisplayList(
  visibleNotes: Note[],
  allNotes: Note[],
  noteGroups: Map<string, string[]>,
  allChildIds: Set<string>,
  expandedGroups: Set<string>,
  respondingToNoteId: string | null,
): DisplayNote[] {
  const result: DisplayNote[] = [];

  for (const note of visibleNotes) {
    if (allChildIds.has(note.id) && note.id !== respondingToNoteId) continue;

    const children = noteGroups.get(note.id) || [];
    result.push({
      note,
      isGrouped: false,
      groupDepth: 0,
      isParent: children.length > 0,
    });

    if (expandedGroups.has(note.id)) {
      for (const childId of children) {
        const childNote = allNotes.find((n) => n.id === childId);
        if (childNote) {
          result.push({
            note: childNote,
            isGrouped: true,
            groupDepth: 1,
            isParent: false,
          });
        }
      }
    }
  }

  return result;
}

function NoteTypeDropdown({
  existingNoteTypes,
  selectedNoteTypes,
  onSelectedNoteTypesChange,
  showDropdown,
  onShowDropdownChange,
  dropdownRef,
}: {
  existingNoteTypes: NoteType[];
  selectedNoteTypes: Set<NoteType>;
  onSelectedNoteTypesChange: (types: Set<NoteType>) => void;
  showDropdown: boolean;
  onShowDropdownChange: (show: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={dropdownRef} className={styles.noteTypeFilterContainer}>
      <button
        onClick={() => onShowDropdownChange(!showDropdown)}
        className={styles.filterButton}
        data-active={selectedNoteTypes.size < existingNoteTypes.length}
      >
        Note types {showDropdown ? "▲" : "▼"}
      </button>
      {showDropdown && (
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
                  onSelectedNoteTypesChange(newSet);
                }}
              />
              <span>{t}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className={styles.hintText}>
      <p>
        Only your notes appear here.
        <br />
        Use the sidebar to add your thoughts to the conversation.
      </p>
      <br />
      <p>
        When you're finished adding notes, click <strong>Inbox</strong> <br />
        to start reacting to others' notes.
      </p>
    </div>
  );
}
