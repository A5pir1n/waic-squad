interface IconProps {
  size?: number;
}

const base = (size = 20) => ({
  width: size, height: size, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const IconMap = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);

export const IconBooth = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 9.5 12 4l8 5.5" />
    <path d="M5.5 10.5V20h13v-9.5" />
    <path d="M9.5 20v-5.5h5V20" />
  </svg>
);

export const IconGlass = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M5 3h10l-4 7v6" />
    <path d="M7.4 7h5.2" />
    <path d="M8 20h6M11 16v4" />
    <path d="m17 8 2.2-2.2M19.5 9.5 21 8" />
  </svg>
);

export const IconTeam = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
    <circle cx="16.8" cy="9.5" r="2.4" />
    <path d="M16.5 14.6c2.2.2 3.7 1.7 4.2 4.2" />
  </svg>
);

export const IconSearch = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const IconNav = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 3 4 20l8-4 8 4-8-17Z" />
  </svg>
);

export const IconLink = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M10 14 20 4" />
    <path d="M15 4h5v5" />
    <path d="M19 13v6a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19V7a1.5 1.5 0 0 1 1.5-1.5H11" />
  </svg>
);

export const IconBack = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M14.5 5 8 12l6.5 7" />
  </svg>
);

export const IconClose = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const IconPin = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.2" />
  </svg>
);
