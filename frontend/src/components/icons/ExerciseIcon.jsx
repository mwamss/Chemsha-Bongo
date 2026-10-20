import React from 'react';

const iconShapes = {
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17h1.1a2 2 0 0 0 1.4-3.4l-.7-.7a1.7 1.7 0 0 1 1.2-2.9h2a3 3 0 0 0 3-3A8.5 8.5 0 0 0 12 3.5Z" />
      <circle cx="7.8" cy="10" r=".9" />
      <circle cx="10.4" cy="7.2" r=".9" />
      <circle cx="14.3" cy="7.5" r=".9" />
      <circle cx="17" cy="10.2" r=".9" />
    </>
  ),
  memory: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
      <path d="M10 7h4M7 10v4m10-4v4m-7 3h4" />
    </>
  ),
  calculate: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8v3H8zM8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01M16 17h.01" strokeWidth="2.5" />
    </>
  ),
  explore: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.1 5-4.9 2 2-4.9 5-2.1Z" />
      <path d="M12 3v2m9 7h-2m-7 9v-2m-9-7h2" />
    </>
  ),
  schema: (
    <>
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M11 7.3 7 15.7m6-8.4 4 8.4M8.5 18h7" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="8" r="5" />
      <path d="m8.5 12-1 9 4.5-2.5 4.5 2.5-1-9M10 8l1.3 1.3L14.5 6" />
    </>
  ),
  sports_esports: (
    <>
      <path d="M7 8h10a4 4 0 0 1 3.8 5.2l-1.3 4a2 2 0 0 1-3.3.8L14 16H10l-2.2 2a2 2 0 0 1-3.3-.8l-1.3-4A4 4 0 0 1 7 8Z" />
      <path d="M7 11v4m-2-2h4m8-1h.01M17 14h.01" />
    </>
  ),
};

export function ExerciseIcon({ name, className = '', size = 24 }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {iconShapes[name] || iconShapes.schema}
    </svg>
  );
}
