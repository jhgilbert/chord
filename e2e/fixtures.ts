import {
  test as base,
  expect,
  type Page,
  type BrowserContext,
} from "@playwright/test";
import { clearEmulatorData, createTestUser, signIn } from "./helpers";

export { expect };

export const HOST = {
  email: "jen@test.com",
  password: "password123",
  displayName: "Jen Gilbert",
};

export const P_FRANK = {
  email: "frank@test.com",
  password: "password123",
  displayName: "Frank Dog",
};

export const P_ALFIE = {
  email: "alfie@test.com",
  password: "password123",
  displayName: "Alfie Dog",
};

export const P_EVEY = {
  email: "evey@test.com",
  password: "password123",
  displayName: "Evey Cat",
};

const PARTICIPANTS = [P_FRANK, P_ALFIE, P_EVEY];

interface CollabPages {
  hostPage: Page;
  frankPage: Page;
  alfiePage: Page;
  eveyPage: Page;
  collabUrl: string;
}

interface CollabFixture extends CollabPages {
  collab: CollabPages;
}

/**
 * Extended test with a ready-to-use collaboration.
 *
 * The `collab` fixture:
 *   1. Clears emulator data
 *   2. Creates all user accounts (host + 3 participants)
 *   3. Host signs in, creates a "Dinner plans" collaboration (Discussion preset)
 *   4. Each participant signs in, navigates to the collab, and lands in the waiting room
 *   5. Host admits all participants
 *   6. Yields page objects for all four users, plus the collaboration URL
 *   7. Cleans up participant browser contexts after the test
 *
 * Usage:
 *   import { test, expect } from "./fixtures";
 *
 *   test("my feature", async ({ hostPage, frankPage, alfiePage, eveyPage, collabUrl }) => {
 *     // All four users are signed in and viewing the active collaboration
 *   });
 */
export const test = base.extend<CollabFixture>({
  collab: [
    async ({ page, browser }, use) => {
      // --- Create users ---
      await clearEmulatorData();
      await createTestUser(HOST.email, HOST.password, HOST.displayName);
      for (const p of PARTICIPANTS) {
        await createTestUser(p.email, p.password, p.displayName);
      }

      // --- Host creates collaboration ---
      await signIn(page, HOST.email, HOST.password, HOST.displayName);
      await page
        .getByPlaceholder("Enter a title for this collaboration")
        .fill("Dinner plans");
      const promptEditor = page.locator(".ql-editor").first();
      await promptEditor.click();
      await promptEditor.fill(
        "What should we have for dinner? All ideas are welcome. Make sure to share any cravings, dietary restrictions, or allergies.",
      );
      await page.getByRole("button", { name: "Start collaboration" }).click();
      await expect(page).toHaveURL(/\/collabs\//);
      await expect(page.getByText("Dinner plans")).toBeVisible();

      const collabUrl = page.url();

      // --- Participants join ---
      const participantContexts: BrowserContext[] = [];
      const participantPages: Page[] = [];

      for (const p of PARTICIPANTS) {
        const context = await browser.newContext();
        const pPage = await context.newPage();
        await signIn(pPage, p.email, p.password, p.displayName);
        await pPage.goto(collabUrl);
        await expect(pPage.getByText("Waiting for the host")).toBeVisible();
        participantContexts.push(context);
        participantPages.push(pPage);
      }

      // --- Host admits all participants ---
      for (const p of PARTICIPANTS) {
        await expect(
          page.getByText(p.displayName, { exact: true }),
        ).toBeVisible();
      }
      await page.getByText("Select all").click();
      await page.getByRole("button", { name: "Admit selected" }).click();
      await expect(page.getByText("Participants (4)")).toBeVisible();

      // Wait for each participant to see the collaboration
      for (const pPage of participantPages) {
        await expect(
          pPage.getByRole("button", { name: "Your notes" }),
        ).toBeVisible();
      }

      // --- Yield to the test ---
      await use({
        hostPage: page,
        frankPage: participantPages[0],
        alfiePage: participantPages[1],
        eveyPage: participantPages[2],
        collabUrl,
      });

      // --- Cleanup ---
      for (const context of participantContexts) {
        await context.close();
      }
    },
    { scope: "test" },
  ],

  /* eslint-disable react-hooks/rules-of-hooks */
  hostPage: async ({ collab }, use) => {
    await use(collab.hostPage);
  },
  frankPage: async ({ collab }, use) => {
    await use(collab.frankPage);
  },
  alfiePage: async ({ collab }, use) => {
    await use(collab.alfiePage);
  },
  eveyPage: async ({ collab }, use) => {
    await use(collab.eveyPage);
  },
  collabUrl: async ({ collab }, use) => {
    await use(collab.collabUrl);
  },
  /* eslint-enable react-hooks/rules-of-hooks */
});
