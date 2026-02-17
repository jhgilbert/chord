import { test, expect } from "@playwright/test";
import { clearEmulatorData, createTestUser, signIn } from "./helpers";

const HOST = {
  email: "jen@test.com",
  password: "password123",
  displayName: "Jen Gilbert",
};

const P_FRANK = {
  email: "frank@test.com",
  password: "password123",
  displayName: "Frank Dog",
};

const P_ALFIE = {
  email: "alfie@test.com",
  password: "password123",
  displayName: "Alfie Dog",
};

const P_EVEY = {
  email: "evey@test.com",
  password: "password123",
  displayName: "Evey Cat",
};

test.beforeEach(async () => {
  await clearEmulatorData();
});

test("host starts a collaboration", async ({ page, browser }) => {
  // Create host user and sign in
  await createTestUser(HOST.email, HOST.password, HOST.displayName);
  await signIn(page, HOST.email, HOST.password, HOST.displayName);

  // Should land on the start screen
  await expect(
    page.getByRole("button", { name: "Start collaboration" }),
  ).toBeVisible();

  // Fill in the title
  await page
    .getByPlaceholder("Enter a title for this collaboration")
    .fill("Dinner plans");

  // Fill in the prompt via the Quill editor
  const promptEditor = page.locator(".ql-editor").first();
  await promptEditor.click();
  await promptEditor.fill(
    "What should we have for dinner? All ideas are welcome. Make sure to share any cravings, dietary restrictions, or allergies.",
  );

  // Discussion preset is already selected by default — verify it
  await expect(page.getByLabel("Question")).toBeChecked();
  await expect(page.getByLabel("Statement")).toBeChecked();
  await expect(page.getByLabel("Recommendation")).toBeChecked();

  // Switch to Retro preset briefly
  await page.getByRole("button", { name: "Retro" }).click();
  await expect(page.getByLabel("Positive feedback")).toBeChecked();
  await expect(page.getByLabel("Constructive feedback")).toBeChecked();
  await expect(page.getByLabel("Question")).not.toBeChecked();

  // Screenshot with the changed preset
  await expect(page).toHaveScreenshot("01-changed-preset.png");

  // Switch back to Discussion
  await page.getByRole("button", { name: "Discussion" }).click();
  await expect(page.getByLabel("Question")).toBeChecked();
  await expect(page.getByLabel("Statement")).toBeChecked();
  await expect(page.getByLabel("Recommendation")).toBeChecked();

  // Screenshot the completed start screen
  await expect(page).toHaveScreenshot("02-completed-start-screen.png");

  // Start the collaboration
  await page.getByRole("button", { name: "Start collaboration" }).click();

  // Should navigate to the collaboration page
  await expect(page).toHaveURL(/\/collabs\//);

  // Wait for the collaboration to be visible
  await expect(page.getByText("Dinner plans")).toBeVisible();
  await expect(page.getByText("You are the host.")).toBeVisible();

  // Screenshot the new empty collaboration
  await expect(page).toHaveScreenshot("03-new-active-empty-collaboration.png");

  // --- Participants join ---

  const collabUrl = page.url();
  const participants = [P_FRANK, P_ALFIE, P_EVEY];

  // Create all participant users
  for (const p of participants) {
    await createTestUser(p.email, p.password, p.displayName);
  }

  // Sign each participant in via their own browser context and navigate to the collab
  const participantPages = [];
  for (const p of participants) {
    const context = await browser.newContext();
    const pPage = await context.newPage();
    await signIn(pPage, p.email, p.password, p.displayName);
    await pPage.goto(collabUrl);
    // Each participant should see the waiting room
    await expect(pPage.getByText("Waiting for the host")).toBeVisible();
    participantPages.push({ page: pPage, context });
  }

  // Host should see all three in the "Waiting to join" section
  for (const p of participants) {
    await expect(page.getByText(p.displayName, { exact: true })).toBeVisible();
  }

  // Screenshot participants awaiting approval
  await expect(page).toHaveScreenshot("04-participants-awaiting-approval.png");

  // Host admits all participants via "Select all" then "Admit selected"
  await page.getByText("Select all").click();
  await page.getByRole("button", { name: "Admit selected" }).click();

  // Verify participants now appear in the approved list
  await expect(page.getByText("Participants (4)")).toBeVisible();

  // Screenshot participants accepted
  await expect(page).toHaveScreenshot("05-participants-accepted.png");

  // --- Participants submit notes ---

  const frankPage = participantPages[0].page;
  const alfiePage = participantPages[1].page;
  const eveyPage = participantPages[2].page;

  // After approval, participants should see the collaboration (auto-updated via Firestore)
  await expect(
    alfiePage.getByRole("button", { name: "Your notes" }),
  ).toBeVisible();
  await expect(
    frankPage.getByRole("button", { name: "Your notes" }),
  ).toBeVisible();
  await expect(
    eveyPage.getByRole("button", { name: "Your notes" }),
  ).toBeVisible();

  // Alfie posts a Question
  await alfiePage.getByRole("button", { name: "Question" }).click();
  // Verify "Post note" is disabled before typing
  await expect(
    alfiePage.getByRole("button", { name: "Post note" }),
  ).toBeDisabled();
  // Type the question in the Quill editor inside the open panel
  const alfieEditor = alfiePage.locator(".ql-editor").first();
  await alfieEditor.click();
  await alfieEditor.fill("What time is dinner? I'm hungry");
  await alfiePage.getByRole("button", { name: "Post note" }).click();
  // Verify the note shows up in "Your notes"
  await expect(
    alfiePage.getByText("What time is dinner? I'm hungry"),
  ).toBeVisible();

  // Frank posts a Recommendation
  await frankPage.getByRole("button", { name: "Recommendation" }).click();
  const frankEditor = frankPage.locator(".ql-editor").first();
  await frankEditor.click();
  await frankEditor.fill(
    "We should avoid spicy foods. I have a sensitive stomach.",
  );
  await frankPage.getByRole("button", { name: "Post note" }).click();
  await expect(
    frankPage.getByText("We should avoid spicy foods."),
  ).toBeVisible();

  // Evey posts a Statement
  await eveyPage.getByRole("button", { name: "Statement" }).click();
  const eveyEditor = eveyPage.locator(".ql-editor").first();
  await eveyEditor.click();
  await eveyEditor.fill("MEOW");
  await eveyPage.getByRole("button", { name: "Post note" }).click();
  await expect(eveyPage.getByText("MEOW")).toBeVisible();

  // Alfie clicks "All" and verifies all notes are visible
  await alfiePage.getByRole("button", { name: "All" }).click();
  await expect(
    alfiePage.getByText("What time is dinner? I'm hungry"),
  ).toBeVisible();
  await expect(
    alfiePage.getByText("We should avoid spicy foods."),
  ).toBeVisible();
  await expect(alfiePage.getByText("MEOW")).toBeVisible();

  // Screenshot: Alfie views all notes
  await expect(alfiePage).toHaveScreenshot(
    "06-participant-alfie-views-all-notes.png",
  );

  // Host clicks "All" and verifies all notes are visible
  await page.getByRole("button", { name: "All" }).click();
  await expect(page.getByText("What time is dinner? I'm hungry")).toBeVisible();
  await expect(page.getByText("We should avoid spicy foods.")).toBeVisible();
  await expect(page.getByText("MEOW")).toBeVisible();

  // Screenshot: Host views all notes
  await expect(page).toHaveScreenshot("07-host-views-all-notes.png");

  // --- Host responds to notes ---

  // Host comments on Alfie's question
  const alfieNote = page.locator('[data-testid="note"]').filter({
    hasText: "What time is dinner? I'm hungry",
  });
  await alfieNote.getByRole("button", { name: "Add response" }).click();
  const hostResponseEditor = alfieNote.locator(".ql-editor").first();
  await hostResponseEditor.click();
  await hostResponseEditor.fill(
    "7 PM. Dinner is at the same time every day, Alfie.",
  );
  await alfieNote.getByRole("button", { name: "Send" }).click();

  // Expand the thread to view the comment
  await alfieNote.getByText("Show 1 response").click();
  await expect(
    alfieNote.getByText("7 PM. Dinner is at the same time every day, Alfie."),
  ).toBeVisible();

  // Host upvotes Frank's recommendation about spicy foods
  const frankNote = page.locator('[data-testid="note"]').filter({
    hasText: "We should avoid spicy foods.",
  });
  await frankNote.locator('[data-testid="upvote"]').click();

  // Screenshot: Host responded to notes
  await expect(page).toHaveScreenshot("08-host-responded-to-notes.png");

  // --- More recommendations ---

  // Frank adds a Recommendation (panel still open from his first post)
  const frankEditor2 = frankPage.locator(".ql-editor").first();
  await frankEditor2.click();
  await frankEditor2.fill("We should get pizza.");
  await frankPage.getByRole("button", { name: "Post note" }).click();
  await expect(frankPage.getByText("We should get pizza.")).toBeVisible();

  // Host adds a Recommendation via the sidebar panel
  await page.getByRole("button", { name: "Recommendation" }).click();
  const hostRecEditor = page.locator(".ql-editor").first();
  await hostRecEditor.click();
  await hostRecEditor.fill(
    "I would love to get Indian food, I've been daydreaming about butter paneer!",
  );
  await page.getByRole("button", { name: "Post note" }).click();
  await expect(page.getByText("I would love to get Indian food")).toBeVisible();

  // Alfie adds a Recommendation
  await alfiePage.getByRole("button", { name: "Recommendation" }).click();
  const alfieEditor2 = alfiePage.locator(".ql-editor").first();
  await alfieEditor2.click();
  await alfieEditor2.fill("We could eat the plants in the yard");
  await alfiePage.getByRole("button", { name: "Post note" }).click();
  await expect(
    alfiePage.getByText("We could eat the plants in the yard"),
  ).toBeVisible();

  // --- Host prepares a poll ---

  // Host opens the Poll panel
  await page.getByRole("button", { name: "Poll" }).click();

  // Type the poll question
  const pollEditor = page.locator(".ql-editor").first();
  await pollEditor.click();
  await pollEditor.fill("Which of these would you eat for dinner?");

  // Fill in the three poll options (two fields exist by default)
  await page.getByPlaceholder("Option 1").fill("Pizza");
  await page.getByPlaceholder("Option 2").fill("Indian food");
  await page.getByRole("button", { name: "+ Add option" }).click();
  await page.getByPlaceholder("Option 3").fill("Plants from the yard");

  // Enable multi-select
  await page.getByLabel("Allow multiple selections").check();

  // Verify the poll form state
  await expect(page.getByPlaceholder("Option 1")).toHaveValue("Pizza");
  await expect(page.getByPlaceholder("Option 2")).toHaveValue("Indian food");
  await expect(page.getByPlaceholder("Option 3")).toHaveValue(
    "Plants from the yard",
  );
  await expect(page.getByLabel("Allow multiple selections")).toBeChecked();
  await expect(
    page.getByText("Which of these would you eat for dinner?"),
  ).toBeVisible();

  // Screenshot: Host prepares poll
  await expect(page).toHaveScreenshot("09-host-prepares-poll.png");

  // --- Host submits the poll ---
  await page.getByRole("button", { name: "Post note" }).click();

  // --- Participants vote on the poll ---

  // Frank clicks Inbox and sees the poll
  await frankPage.getByRole("button", { name: /Inbox/ }).click();
  await expect(
    frankPage.getByText("Which of these would you eat for dinner?"),
  ).toBeVisible();

  // Frank chooses Pizza and submits
  await frankPage.getByRole("button", { name: "Pizza" }).click();
  await frankPage.getByRole("button", { name: "Submit vote" }).click();
  // Verify Frank's selection is reflected (button shows as voted)
  await expect(
    frankPage.getByRole("button", { name: "Pizza" }),
  ).toHaveAttribute("data-voted", "true");
  await expect(
    frankPage.getByRole("button", { name: "Indian food" }),
  ).toHaveAttribute("data-voted", "false");

  // Host clicks All, finds the poll, and votes for Pizza and Indian food
  await page.getByRole("button", { name: "All" }).click();
  await expect(
    page.getByText("Which of these would you eat for dinner?"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pizza" }).click();
  await page.getByRole("button", { name: "Indian food" }).click();
  await page.getByRole("button", { name: "Submit vote" }).click();

  // Alfie clicks Inbox and votes for all three
  await alfiePage.getByRole("button", { name: /Inbox/ }).click();
  // Alfie upvotes Frank's recommendation for pizza
  const frankPizzaNote = alfiePage.locator('[data-testid="note"]').filter({
    hasText: "We should get pizza.",
  });
  await frankPizzaNote.locator('[data-testid="upvote"]').click();

  // Alfie upvotes the host's recommendation for Indian food
  const hostIndianNote = alfiePage.locator('[data-testid="note"]').filter({
    hasText: "I would love to get Indian food",
  });
  await hostIndianNote.locator('[data-testid="upvote"]').click();

  await expect(
    alfiePage.getByText("Which of these would you eat for dinner?"),
  ).toBeVisible();
  await alfiePage.getByRole("button", { name: "Pizza" }).click();
  await alfiePage.getByRole("button", { name: "Indian food" }).click();
  await alfiePage.getByRole("button", { name: "Plants from the yard" }).click();
  await alfiePage.getByRole("button", { name: "Submit vote" }).click();

  // Evey clicks Inbox and votes for Pizza
  await eveyPage.getByRole("button", { name: /Inbox/ }).click();
  await expect(
    eveyPage.getByText("Which of these would you eat for dinner?"),
  ).toBeVisible();
  await eveyPage.getByRole("button", { name: "Pizza" }).click();
  await eveyPage.getByRole("button", { name: "Submit vote" }).click();

  // --- Host pauses the collaboration ---
  await page.getByRole("button", { name: "Pause" }).click();

  // Verify poll results are visible on the host's view
  // Pizza: 4/4 = 100%, Indian food: 2/4 = 50%, Plants from the yard: 1/4 = 25%
  const hostPoll = page.locator('[data-testid="note"]').filter({
    hasText: "Which of these would you eat for dinner?",
  });
  await expect(hostPoll.getByText("4 (100%)")).toBeVisible();
  await expect(hostPoll.getByText("2 (50%)")).toBeVisible();
  await expect(hostPoll.getByText("1 (25%)")).toBeVisible();

  // Screenshot: Host views poll results
  await expect(page).toHaveScreenshot("10-host-views-poll-results.png");

  // Screenshot: Participant views poll results during pause
  await alfiePage.getByRole("button", { name: "All" }).click();
  await expect(
    alfiePage.getByText("Which of these would you eat for dinner?"),
  ).toBeVisible();
  const alfiePoll = alfiePage.locator('[data-testid="note"]').filter({
    hasText: "Which of these would you eat for dinner?",
  });
  await expect(alfiePoll.getByText("4 (100%)")).toBeVisible();
  await expect(alfiePage).toHaveScreenshot(
    "11-participant-views-poll-results.png",
  );

  // --- Host verifies upvotes and sorts by most upvotes ---

  // Verify upvote counts on the host's All view
  const findNote = (text: string) =>
    page.locator('[data-testid="note"]').filter({ hasText: text });

  // Notes with 1 upvote each:
  await expect(findNote("We should avoid spicy foods.").locator('[data-testid="upvote"] span')).toHaveText("1");
  await expect(findNote("We should get pizza.").locator('[data-testid="upvote"] span')).toHaveText("1");
  await expect(findNote("I would love to get Indian food").locator('[data-testid="upvote"] span')).toHaveText("1");
  // Notes with 0 upvotes:
  await expect(findNote("MEOW").locator('[data-testid="upvote"] span')).toHaveText("0");
  await expect(findNote("What time is dinner?").locator('[data-testid="upvote"] span')).toHaveText("0");
  await expect(findNote("We could eat the plants in the yard").locator('[data-testid="upvote"] span')).toHaveText("0");

  // Sort by most upvotes
  await page.getByRole("combobox").selectOption("upvotes");

  // Verify the three upvoted notes appear before the non-upvoted ones
  const notesList = page.locator('[class*="notesList"]');
  const allUpvoteButtons = notesList.locator('[data-testid="upvote"] span');
  await expect(allUpvoteButtons.nth(0)).toHaveText("1");
  await expect(allUpvoteButtons.nth(1)).toHaveText("1");
  await expect(allUpvoteButtons.nth(2)).toHaveText("1");
  await expect(allUpvoteButtons.nth(3)).toHaveText("0");
  await expect(allUpvoteButtons.nth(4)).toHaveText("0");
  await expect(allUpvoteButtons.nth(5)).toHaveText("0");

  // Screenshot: Host views upvotes sorted
  await expect(page).toHaveScreenshot("12-host-views-upvotes.png");

  // --- Host unpauses and adds an action item ---

  await page.getByRole("button", { name: "Resume" }).click();

  // Host opens the Action item panel
  await page.getByRole("button", { name: "Action item" }).click();

  // Type the action item text
  const actionItemEditor = page.locator(".ql-editor").first();
  await actionItemEditor.click();
  await actionItemEditor.fill("Order pizza");

  // Assign to Jen
  await page.getByPlaceholder("Enter assignee name").fill("Jen");

  // Verify the action item form state before submitting
  await expect(page.getByText("Order pizza")).toBeVisible();
  await expect(page.getByPlaceholder("Enter assignee name")).toHaveValue("Jen");
  await expect(page.getByLabel("Due date (optional):")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Post note" })).toBeEnabled();

  // Submit the action item
  await page.getByRole("button", { name: "Post note" }).click();

  // Switch to All view, newest first
  await page.getByRole("button", { name: "All" }).click();
  await page.getByRole("combobox").selectOption("desc");

  // Verify the action item is visible
  await expect(page.getByText("Order pizza")).toBeVisible();

  // Screenshot: Host final view
  await expect(page).toHaveScreenshot("13-host-view-final.png");

  // Screenshot: Participant final view
  await frankPage.getByRole("button", { name: "All" }).click();
  await expect(frankPage.getByText("Order pizza")).toBeVisible();
  await expect(frankPage).toHaveScreenshot("14-participant-view-final.png");

  // --- Host views users page ---

  await page.goto(page.url() + "/users");
  await expect(
    page.getByRole("button", { name: "← Back to collaboration" }),
  ).toBeVisible();

  // Verify all users are listed in the table
  const usersTable = page.locator("table");
  await expect(usersTable.getByText("Jen Gilbert")).toBeVisible();
  await expect(usersTable.getByText("Frank Dog")).toBeVisible();
  await expect(usersTable.getByText("Alfie Dog")).toBeVisible();
  await expect(usersTable.getByText("Evey Cat")).toBeVisible();

  // Screenshot: Users page
  await expect(page).toHaveScreenshot("15-collab-users-page.png");

  // --- Host revokes Evey's access ---

  // Find Evey's row in the table and click Revoke
  const eveyRow = usersTable.getByRole("row").filter({ hasText: "Evey" });
  await eveyRow.getByRole("button", { name: "Revoke" }).click();

  // Verify the users page reflects the change
  await expect(eveyRow.getByText("Revoked")).toBeVisible();
  await expect(
    eveyRow.getByRole("button", { name: "Revoke" }),
  ).not.toBeVisible();

  // Verify Evey sees the lobby/waiting room instead of the collaboration
  await expect(eveyPage.getByText("Waiting for the host")).toBeVisible();

  // --- Host ends the collaboration ---

  // Navigate back to the collaboration
  await page.getByRole("button", { name: "← Back to collaboration" }).click();

  // Open host actions dropdown and end the collaboration
  await page.getByRole("button", { name: /Host actions/ }).click();
  await page.getByRole("button", { name: "End collaboration" }).click();

  // Verify the report is shown
  await expect(page.getByText("Results")).toBeVisible();
  await expect(page.getByText("Key Takeaways")).toBeVisible();

  // Verify the action item is in key takeaways
  await expect(page.getByText("Action Items")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Order pizza" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Jen", exact: true })).toBeVisible();

  // Verify poll results in the report
  await expect(page.getByText("Polls")).toBeVisible();
  await expect(page.getByText("4 votes")).toBeVisible();
  await expect(page.getByText("Multiple choice")).toBeVisible();
  // Poll results table: check vote counts and percentages
  await expect(page.getByRole("cell", { name: "100%" })).toBeVisible(); // Pizza
  await expect(page.getByRole("cell", { name: "50%" })).toBeVisible(); // Indian food
  await expect(page.getByRole("cell", { name: "25%" })).toBeVisible(); // Plants

  // Screenshot: Final report (host view)
  await expect(page).toHaveScreenshot("16-collab-final-report-host-view.png");

  // Screenshot: Final report (participant view)
  await expect(frankPage.getByText("Results")).toBeVisible();
  await expect(frankPage).toHaveScreenshot(
    "17-collab-final-report-participant-view.png",
  );

  // Verify Evey cannot see the report (she was revoked)
  await expect(
    eveyPage.getByText("This collaboration has ended."),
  ).toBeVisible();

  // Clean up participant contexts
  for (const { context } of participantPages) {
    await context.close();
  }
});
