const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  viewBox: '0 0 24 24',
};

export const Bus = ({ size = 22 }) => (
  <svg {...base} width={size} height={size}><rect x="4" y="3" width="16" height="14" rx="3" /><path d="M4 11h16M8 17v3M16 17v3" /></svg>
);
export const Pin = ({ size = 18 }) => (
  <svg {...base} width={size} height={size}><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>
);
export const Phone = ({ size = 18 }) => (
  <svg {...base} width={size} height={size}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>
);
export const Bell = ({ size = 18, width = 2 }) => (
  <svg {...base} strokeWidth={width} width={size} height={size}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
export const Back = ({ size = 20 }) => (
  <svg {...base} width={size} height={size}><path d="M15 18l-6-6 6-6" /></svg>
);
export const Next = ({ size = 20 }) => (
  <svg {...base} width={size} height={size}><path d="M9 18l6-6-6-6" /></svg>
);
export const Sun = ({ size = 20 }) => (
  <svg {...base} width={size} height={size}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const Moon = ({ size = 20 }) => (
  <svg {...base} width={size} height={size}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
);
export const Auto = ({ size = 20 }) => (
  <svg {...base} width={size} height={size}><circle cx="12" cy="12" r="9" /><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></svg>
);
