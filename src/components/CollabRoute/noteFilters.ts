import type { Note } from "../../notes";

export function hasUserInteracted(note: Note, userId: string): boolean {
  if (note.type === "Poll") {
    const userVote = note.pollVotes?.[userId];
    const hasVoted =
      userVote !== undefined &&
      (Array.isArray(userVote) ? userVote.length > 0 : true);
    return hasVoted || !!note.pollClosed;
  }
  return !!note.reactions?.[userId];
}
