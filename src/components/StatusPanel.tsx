export interface StatusPanelProps {
  readonly title?: string;
  readonly message: string;
  readonly detail?: string;
  readonly tone?: "neutral" | "error";
  readonly loading?: boolean;
  readonly role?: "status" | "alert";
}

export function StatusPanel({
  title,
  message,
  detail,
  tone = "neutral",
  loading = false,
  role = "status",
}: StatusPanelProps) {
  return (
    <section className={`status-panel status-${tone}`} role={role}>
      {loading ? <span className="spinner" aria-hidden="true" /> : null}
      {title ? <h2>{title}</h2> : null}
      <p>{message}</p>
      {detail ? <p className="status-detail">{detail}</p> : null}
    </section>
  );
}
