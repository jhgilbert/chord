import styles from "./CollabRoute.module.css";

interface WaitingRoomProps {
  title: string;
}

export default function WaitingRoom({ title }: WaitingRoomProps) {
  return (
    <div className={styles.waitingRoom}>
      <div className={styles.waitingTitle}>{title}</div>
      <div className={styles.waitingMessage}>Waiting for the host ...</div>
    </div>
  );
}
