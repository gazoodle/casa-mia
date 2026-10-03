/** Line icons for the module tiles (24px grid, currentColor). */

const base = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const FirmwareIcon = () => (
  <svg {...base}>
    <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
    <path d="M12 7v7M9 11.5l3 3 3-3M10 18.5h4" />
  </svg>
);

export const CameraGridIcon = () => (
  <svg {...base}>
    <rect x="3" y="4" width="8" height="7" rx="1.5" />
    <rect x="13" y="4" width="8" height="7" rx="1.5" />
    <rect x="3" y="13" width="8" height="7" rx="1.5" />
    <rect x="13" y="13" width="8" height="7" rx="1.5" />
  </svg>
);

export const CameraIcon = () => (
  <svg {...base}>
    <rect x="2.5" y="6" width="13" height="12" rx="2" />
    <path d="M15.5 10.5 21 7.5v9l-5.5-3" />
    <circle cx="9" cy="12" r="2.5" />
  </svg>
);

export const GuestIcon = () => (
  <svg {...base}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3M21 14v.01M14 21h7v-4M17.5 17.5h.01" />
  </svg>
);

export const ModuleIcon = () => (
  <svg {...base}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    <path d="M8 12h8M12 8v8" />
  </svg>
);

export const PeopleIcon = () => (
  <svg {...base}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M17 14.5c2.4 0 4 1.5 4.5 4" />
  </svg>
);

export const PhoneIcon = () => (
  <svg {...base}>
    <path d="M5 3.5h3.5l1.8 4.5-2.3 1.5a11 11 0 0 0 6.5 6.5l1.5-2.3 4.5 1.8V19a1.5 1.5 0 0 1-1.6 1.5C10.5 20 4 13.5 3.5 5.1A1.5 1.5 0 0 1 5 3.5Z" />
  </svg>
);

export const ShieldIcon = () => (
  <svg {...base}>
    <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const TabletIcon = () => (
  <svg {...base}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M6.5 9h6M6.5 12.5h9M18 12h.01" />
  </svg>
);
