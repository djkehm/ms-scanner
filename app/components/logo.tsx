interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = "", size = 24 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="MS Scanner logo"
    >
      {/* Radar base circle */}
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.15"
      />
      <circle
        cx="16"
        cy="16"
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.1"
      />

      {/* Radar sweep arc — accent colored */}
      <path
        d="M16 2a14 14 0 0 1 14 14"
        stroke="var(--color-accent, #3b82f6)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Minecraft-style pickaxe / crosshair center — 4 pixel blocks */}
      <rect
        x="14"
        y="6"
        width="4"
        height="4"
        rx="0.5"
        fill="currentColor"
        opacity="0.7"
      />
      <rect
        x="14"
        y="22"
        width="4"
        height="4"
        rx="0.5"
        fill="currentColor"
        opacity="0.7"
      />
      <rect
        x="6"
        y="14"
        width="4"
        height="4"
        rx="0.5"
        fill="currentColor"
        opacity="0.7"
      />
      <rect
        x="22"
        y="14"
        width="4"
        height="4"
        rx="0.5"
        fill="currentColor"
        opacity="0.7"
      />

      {/* Center dot */}
      <circle cx="16" cy="16" r="2.5" fill="var(--color-accent, #3b82f6)" />
    </svg>
  );
}
