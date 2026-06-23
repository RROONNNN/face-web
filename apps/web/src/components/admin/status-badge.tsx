type StatusBadgeProps = {
  active?: boolean;
  children?: string;
};

export function StatusBadge({ active, children }: StatusBadgeProps) {
  const label = children ?? (active ? 'Active' : 'Inactive');

  return (
    <span className={active === false ? 'badge badge-muted' : 'badge'}>
      {label}
    </span>
  );
}
