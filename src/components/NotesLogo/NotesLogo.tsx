import styles from "./NotesLogo.module.css";

const COLORS = [
  "var(--color-magenta)",
  "var(--color-purple)",
  "var(--color-blue)",
  "var(--color-sky-blue)",
  "var(--color-cyan)",
];

interface NotesLogoProps {
  tick: number;
}

export default function NotesLogo({ tick }: NotesLogoProps) {
  const offset = ((tick % COLORS.length) + COLORS.length) % COLORS.length;
  const rotatedColors = [
    ...COLORS.slice(COLORS.length - offset),
    ...COLORS.slice(0, COLORS.length - offset),
  ];

  return (
    <div className={styles.notesLogo}>
      {rotatedColors.map((color, i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={styles.note}
          style={{ color }}
        >
          <path
            fill="currentColor"
            d="M16 3h-2v10.56a3.96 3.96 0 0 0-2-.56a4 4 0 1 0 4 4zm-4 16a2 2 0 1 1 2-2a2 2 0 0 1-2 2"
          />
        </svg>
      ))}
    </div>
  );
}
