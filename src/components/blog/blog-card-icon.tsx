export function BlogCardIcon({
  type,
  color = "var(--color-primary)",
  size = 46,
}: {
  type: string;
  color?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {type === "chart" ? (
        <>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </>
      ) : type === "menu" ? (
        <>
          <path d="M15 11h.01M11 15h.01M16 16h.01M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0Z" />
          <path d="M7 9h4M7 13h2" />
        </>
      ) : type === "palette" ? (
        <>
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-4.9-4.5-8.3-10-8.3Z" />
        </>
      ) : type === "megaphone" ? (
        <>
          <path d="m3 11 18-5v12L3 13v-2Z" />
          <path d="M11.6 15.8 15 20v-9" />
        </>
      ) : (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3M20 20v.01M14 20h.01M20 14v3" />
        </>
      )}
    </svg>
  );
}
