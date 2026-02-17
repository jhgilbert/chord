import type { Page } from "@playwright/test";

const PROJECT_ID = "chord-jgilbert";
const AUTH_EMULATOR = "http://127.0.0.1:9099";
const FIRESTORE_EMULATOR = "http://127.0.0.1:8080";

export async function clearEmulatorData() {
  await fetch(
    `${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: "DELETE" },
  );
  await fetch(
    `${FIRESTORE_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}

export async function createTestUser(
  email: string,
  password: string,
  displayName: string,
) {
  const response = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName, returnSecureToken: true }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to create test user: ${await response.text()}`);
  }
  return response.json();
}

export async function signIn(
  page: Page,
  email: string,
  password: string,
  displayName: string,
) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(
    async ({ email, password, displayName }) => {
      await (window as any).__e2eSignIn(email, password, displayName);
    },
    { email, password, displayName },
  );
  // Reload so the app sees the authenticated session on fresh mount
  await page.reload();
  await page.waitForLoadState("networkidle");
}
