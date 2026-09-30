// components/Icon.jsx - hand-drawn line icon set from the redesign, ported to a
// standalone component (the design file kept them inline in App.tsx).
const PATHS = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M10 20v-6h4v6" /></>,
  journey: <><path d="M6 4v5c0 2 1.5 3 3.5 3h5c2 0 3.5 1 3.5 3v5" /><circle cx="6" cy="4" r="2" /><circle cx="18" cy="20" r="2" /><circle cx="12" cy="12" r="2" /></>,
  heart: <path d="M12 20S4 15.5 4 9.5C4 6.5 7.8 4.7 12 8c4.2-3.3 8-1.5 8 1.5 0 6-8 10.5-8 10.5Z" />,
  journal: <><path d="M5 3h13a1 1 0 0 1 1 1v17H6a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1Z" /><path d="M8 3v18M11 8h5M11 12h5" /></>,
  shield: <path d="M12 3 5 6v5c0 4.8 2.8 8.2 7 10 4.2-1.8 7-5.2 7-10V6l-7-3Z" />,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-2.5c0-3 2.2-5.5 5.5-5.5s5.5 2.5 5.5 5.5V20" /><circle cx="17" cy="9" r="2.5" /><path d="M15 14c3.7-1.2 6 1.2 6 4v2" /></>,
  clinic: <><path d="M4 21V7h16v14M8 7V3h8v4M9 12h6M12 9v6M9 21v-4h6v4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M5 21c.5-5 3-7 7-7s6.5 2 7 7" /></>,
  arrow: <><path d="m5 12 14 0M14 7l5 5-5 5" /></>,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></>,
  phone: <path d="M7 3h10v18H7zM10 17h4" />,
  leaf: <><path d="M5 19c7-1 12-6 14-14-8 0-14 4-14 11v3Z" /><path d="M5 19c3-4 6-7 11-10" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  wifi: <><path d="M4 9a12 12 0 0 1 16 0M7 13a7 7 0 0 1 10 0M10.5 17a2.5 2.5 0 0 1 3 0" /><circle cx="12" cy="20" r=".5" /></>,
};

export default function Icon({ name, size = 20 }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {path}
    </svg>
  );
}
