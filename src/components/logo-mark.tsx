type Props = {
  size?: number;
  className?: string;
};

export function LogoMark({ size = 40, className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="48" height="48" rx="12" fill="var(--color-primary)" />
      <rect x="10" y="10" width="12" height="12" rx="3" stroke="#fff" strokeWidth="2.6" />
      <rect x="14.5" y="14.5" width="3" height="3" rx="1" fill="#fff" />
      <rect x="26" y="10" width="12" height="12" rx="3" stroke="#fff" strokeWidth="2.6" />
      <rect x="30.5" y="14.5" width="3" height="3" rx="1" fill="#fff" />
      <rect x="10" y="26" width="12" height="12" rx="3" stroke="#fff" strokeWidth="2.6" />
      <rect x="14.5" y="30.5" width="3" height="3" rx="1" fill="#fff" />
      <rect x="26" y="26" width="5" height="5" rx="1.4" fill="#34D399" />
      <rect x="33" y="26" width="5" height="5" rx="1.4" fill="#fff" />
      <rect x="26" y="33" width="5" height="5" rx="1.4" fill="#fff" />
      <rect x="33" y="33" width="5" height="5" rx="1.4" fill="#34D399" />
    </svg>
  );
}
