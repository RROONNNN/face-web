import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <section className="page-heading page-heading-row">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </section>
  );
}
