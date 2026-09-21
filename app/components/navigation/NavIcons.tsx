import type { ReactNode, SVGProps } from "react";

export type NavIconName =
  | "sparkle"
  | "learn"
  | "gear"
  | "users"
  | "tag"
  | "globe"
  | "user"
  | "userPlus"
  | "chevron"
  | "chevronDown"
  | "arrow"
  | "close"
  | "menu"
  | "dashboard"
  | "reports"
  | "plan"
  | "history"
  | "stethoscope"
  | "notes"
  | "bell"
  | "sun"
  | "moon"
  | "monitor"
  | "logout";

const PATHS: Record<NavIconName, ReactNode> = {
  sparkle: (
    <>
      <path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9L11 3.5z" />
      <path d="M18.5 3v3M17 4.5h3" />
      <path d="M18 16.5v3M16.5 18h3" />
    </>
  ),
  learn: (
    <>
      <path d="M2.5 9.5L12 5l9.5 4.5L12 14 2.5 9.5z" />
      <path d="M6.5 11.5v4.2c0 1.2 2.5 2.8 5.5 2.8s5.5-1.6 5.5-2.8v-4.2" />
      <path d="M21.5 9.5v5" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14.6a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3h0a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5h0a1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8v0a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20c.4-3.4 3-5.4 6.2-5.4s5.8 2 6.2 5.4" />
      <circle cx="17.5" cy="9" r="2.5" />
      <path d="M17 14.4c2.4.1 4.1 1.7 4.4 4.4" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.2V4.5a1 1 0 011-1h7.7a1 1 0 01.7.3l7.6 7.6a1 1 0 010 1.4l-7.7 7.7a1 1 0 01-1.4 0l-7.6-7.6a1 1 0 01-.3-.7z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.6 2.4 3.9 5.4 3.9 9S14.6 18.6 12 21c-2.6-2.4-3.9-5.4-3.9-9S9.4 5.4 12 3z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.6-4 3.6-6 7.5-6s6.9 2 7.5 6" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="9.5" cy="8" r="3.8" />
      <path d="M2.8 20.5c.6-3.8 3.3-5.8 6.7-5.8 1.3 0 2.5.3 3.5.9" />
      <path d="M18.5 14v6M15.5 17h6" />
    </>
  ),
  chevron: <path d="M9 5.5l6.5 6.5L9 18.5" />,
  chevronDown: <path d="M5.5 9l6.5 6.5L18.5 9" />,
  arrow: (
    <>
      <path d="M4.5 12h15" />
      <path d="M13.5 6l6 6-6 6" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.6" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.6" />
      <rect x="3.5" y="14.5" width="7" height="6" rx="1.6" />
    </>
  ),
  reports: (
    <>
      <path d="M6 3h8l5 5v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13h7M8.5 16.5h5" />
    </>
  ),
  plan: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M3.5 6l1.2 1.2L6.8 5M3.5 12l1.2 1.2 2.1-2.2M3.5 18l1.2 1.2 2.1-2.2" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 108.5-8.5c-2.6 0-4.9 1.1-6.6 3" />
      <path d="M3.5 4v4h4" />
      <path d="M12 8v4.5l3 1.8" />
    </>
  ),
  stethoscope: (
    <>
      <path d="M6 3.5v6a4 4 0 008 0v-6" />
      <path d="M5 3.5h2M13 3.5h2" />
      <path d="M10 13.5V16a4.5 4.5 0 009 0v-1.6" />
      <circle cx="19" cy="12.4" r="2" />
    </>
  ),
  notes: (
    <>
      <path d="M5 4.5A1.5 1.5 0 016.5 3h11A1.5 1.5 0 0119 4.5v15a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 19.5v-15z" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 1112 0v5.5l1.5 2h-15l1.5-2z" />
      <path d="M10 21a2.2 2.2 0 004 0" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
    </>
  ),
  moon: <path d="M20.5 14.2A8.5 8.5 0 019.8 3.5a8.5 8.5 0 1010.7 10.7z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8.5 20h7M12 16v4" />
    </>
  ),
  logout: (
    <>
      <path d="M9.5 20.5h-4a1.5 1.5 0 01-1.5-1.5V5a1.5 1.5 0 011.5-1.5h4" />
      <path d="M16 8l4 4-4 4M20 12H9.5" />
    </>
  ),
};

type NavIconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: NavIconName;
  size?: number;
};

export default function NavIcon({
  name,
  size = 22,
  ...props
}: NavIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
