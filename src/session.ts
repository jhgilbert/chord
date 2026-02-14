export function slugifyNameToId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const KEY = "todo_session_id";
const NAME_KEY = "todo_display_name";

export function getOrCreateSession() {
  const existing = localStorage.getItem(KEY);
  const existingName = localStorage.getItem(NAME_KEY);
  if (existing && existingName)
    return { sessionId: existing, displayName: existingName };

  let displayName = "";
  while (!displayName) {
    displayName = window.prompt("What’s your name?")?.trim() ?? "";
  }
  const sessionId = slugifyNameToId(displayName);

  localStorage.setItem(KEY, sessionId);
  localStorage.setItem(NAME_KEY, displayName);

  return { sessionId, displayName };
}
