/**
 * Line-icon set for Opportunity Radar.
 *
 * Emoji were replaced with these because the DPA Brand Guide calls for a
 * silver-metal, premium treatment — emoji render in their own colours and
 * break both the palette and the "crisp, high-contrast" typography principle.
 * All glyphs are stroke-based and inherit `currentColor`.
 */
export type IconName =
  | 'radar'
  | 'bookmark'
  | 'bookmark-filled'
  | 'layers'
  | 'settings'
  | 'search'
  | 'signal'
  | 'trend'
  | 'compass'
  | 'gauge'
  | 'target'
  | 'route'
  | 'link'
  | 'document'
  | 'alert'
  | 'satellite';

const PATHS: Record<IconName, React.ReactNode> = {
  radar: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12 19 6.5" />
    </>
  ),
  bookmark: <path d="M6 4h12v16l-6-4.5L6 20z" />,
  'bookmark-filled': <path d="M6 4h12v16l-6-4.5L6 20z" fill="currentColor" />,
  layers: (
    <>
      <path d="M12 3 3 8l9 5 9-5z" />
      <path d="M3 13.5 12 18.5l9-5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  signal: <path d="M12 3.5 13.9 9l5.6.4-4.3 3.7 1.4 5.4L12 15.6 7.4 18.5l1.4-5.4L4.5 9.4 10.1 9z" />,
  trend: (
    <>
      <path d="M3 17.5 9.5 11l4 4L21 7" />
      <path d="M15.5 7H21v5.5" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5.5-5.5 2 2-5.5z" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 17a8.5 8.5 0 1 1 16 0" />
      <path d="M12 17 16 10.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.75" fill="currentColor" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 18h4a4 4 0 0 0 0-8H11a4 4 0 0 1 0-8h.5" />
    </>
  ),
  link: <path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.6 1.6M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.6-1.6" />,
  document: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 2.5 20h19z" />
      <path d="M12 10v4.5M12 17.5v.5" />
    </>
  ),
  satellite: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5M12 2a10 10 0 0 1 10 10" />
      <path d="M9.5 14.5 4 20" />
    </>
  ),
};

export function Icon({
  name,
  size = 16,
  className = '',
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block flex-shrink-0 ${className}`}
    >
      {PATHS[name]}
    </svg>
  );
}
