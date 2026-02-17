import "@testing-library/jest-dom/vitest";

// Mock Firebase so it never initializes during tests
vi.mock("./firebase", () => ({
  app: {},
  db: {},
  auth: { currentUser: null },
}));
