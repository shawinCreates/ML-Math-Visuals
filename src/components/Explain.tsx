import { ReactNode } from "react";

/** A titled explanation block shown under each sandbox. */
export function Explain({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="explain">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="hint">{children}</p>;
}

export function Stat({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
