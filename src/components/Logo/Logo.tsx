import styles from "./Logo.module.css";

const LETTERS = ["C", "H", "O", "R", "D"] as const;
const COLORS = [
  "var(--color-magenta)",
  "var(--color-purple)",
  "var(--color-blue)",
  "var(--color-sky-blue)",
  "var(--color-cyan)",
];

export default function Logo() {
  return (
    <h1 className={styles.logo}>
      {LETTERS.map((letter, i) => (
        <span
          key={letter}
          className={styles.logoColumn}
          style={{ color: COLORS[i] }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="1 0 24 24"
            className={styles.logoNote}
          >
            <path
              fill="currentColor"
              d="M16 3h-2v10.56a3.96 3.96 0 0 0-2-.56a4 4 0 1 0 4 4zm-4 16a2 2 0 1 1 2-2a2 2 0 0 1-2 2"
            />
          </svg>
          <span className={styles.logoLetter}>{letter}</span>
        </span>
      ))}
    </h1>
  );
}
