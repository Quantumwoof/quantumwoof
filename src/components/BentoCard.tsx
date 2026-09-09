import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  label?: string;
  id?: string;
};

export function BentoCard({ children, className = "", label, id }: Props) {
  return (
    <section id={id} className={`bento-card p-5 sm:p-6 ${className}`}>
      {label ? <p className="card-label mb-3">{label}</p> : null}
      {children}
    </section>
  );
}
