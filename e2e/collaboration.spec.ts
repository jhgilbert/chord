import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { clearEmulatorData, createTestUser, signIn } from "./helpers";

const HOST = { email: "host@test.com", password: "password123", displayName: "Host User" };
const P1 = { email: "alice@test.com", password: "password123", displayName: "Alice" };
const P2 = { email: "bob@test.com", password: "password123", displayName: "Bob" };

test.describe("Collaboration flow", () => {
  let hostContext: BrowserContext;
  let p1Context: BrowserContext;
  let p2Context: BrowserContext;
  let hostPage: Page;
  let p1Page: Page;
  let p2Page: Page;

  test.beforeAll(async ({ browser }) => {
    await clearEmulatorData();
    await createTestUser(HOST.email, HOST.password, HOST.displayName);
    await createTestUser(P1.email, P1.password, P1.displayName);
    await createTestUser(P2.email, P2.password, P2.displayName);

    hostContext = await browser.newContext();
    p1Context = await browser.newContext();
    p2Context = await browser.newContext();
    hostPage = await hostContext.newPage();
    p1Page = await p1Context.newPage();
    p2Page = await p2Context.newPage();
  });

  test.afterAll(async () => {
    await hostContext.close();
    await p1Context.close();
    await p2Context.close();
  });

  test("host creates collaboration and participants join", async () => {
    // 1. Host signs in and sees the start screen
    await signIn(hostPage, HOST.email, HOST.password, HOST.displayName);
    await expect(hostPage.getByText("Start collaboration")).toBeVisible();
    await expect(hostPage).toHaveScreenshot("host-start-screen.png");

    // 2. Host creates a collaboration
    await hostPage.getByPlaceholder("Enter a title").fill("E2E Test Session");
    // Quill editor — click into it and type
    const quillEditor = hostPage.locator(".ql-editor");
    await quillEditor.click();
    await quillEditor.fill("What should we discuss today?");
    await hostPage.getByRole("button", { name: "Start collaboration" }).click();

    // 3. Host lands on the collaboration page
    await expect(hostPage.getByText("You are the host.")).toBeVisible();
    const collabUrl = hostPage.url();
    await expect(hostPage).toHaveScreenshot("host-collab-empty.png");

    // 4. Participant 1 signs in and navigates to the collaboration
    await signIn(p1Page, P1.email, P1.password, P1.displayName);
    await p1Page.goto(collabUrl);
    await expect(p1Page.getByText("Waiting for the host")).toBeVisible();
    await expect(p1Page).toHaveScreenshot("participant-waiting-room.png");

    // 5. Participant 2 signs in and navigates to the collaboration
    await signIn(p2Page, P2.email, P2.password, P2.displayName);
    await p2Page.goto(collabUrl);
    await expect(p2Page.getByText("Waiting for the host")).toBeVisible();

    // 6. Host admits both participants
    await expect(hostPage.getByText("Waiting to join")).toBeVisible();
    await hostPage.getByLabel("Select all").check();
    await hostPage.getByRole("button", { name: "Admit selected" }).click();

    // 7. Participants auto-transition from waiting room to collaboration
    await expect(p1Page.getByText("Hosted by")).toBeVisible({ timeout: 10000 });
    await expect(p2Page.getByText("Hosted by")).toBeVisible({ timeout: 10000 });

    // 8. Final screenshots
    await expect(hostPage).toHaveScreenshot("host-collab-with-participants.png");
    await expect(p1Page).toHaveScreenshot("participant-collab-view.png");
  });
});
