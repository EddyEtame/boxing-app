import type { SVGProps } from 'react';

/**
 * Les glyphes de l'admin : le même dessin que l'app (apps/mobile/src/ui/icons.tsx,
 * trait 1,75 sur une grille de 24, bouts ronds), en SVG web qui prend la
 * couleur du texte. Les glyphes propres à l'admin suivent la même grille.
 * Décoratifs par défaut (aria-hidden) : le libellé est toujours écrit à côté.
 */
type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

/* --- Repris de l'app ------------------------------------------------ */

export const IconRing = (p: P) => (
  <Svg {...p}>
    <rect x={4.5} y={4.5} width={15} height={15} rx={1.5} />
    <circle cx={4.5} cy={4.5} r={1.7} fill="currentColor" stroke="none" />
    <circle cx={19.5} cy={4.5} r={1.7} fill="currentColor" stroke="none" />
    <circle cx={4.5} cy={19.5} r={1.7} fill="currentColor" stroke="none" />
    <circle cx={19.5} cy={19.5} r={1.7} fill="currentColor" stroke="none" />
  </Svg>
);

export const IconPlanning = (p: P) => (
  <Svg {...p}>
    <rect x={3.5} y={5} width={17} height={15.5} rx={2.5} />
    <path d="M3.5 9.8h17M8 3v3.6M16 3v3.6" />
    <rect x={7} y={12.6} width={3} height={3} rx={0.6} fill="currentColor" stroke="none" />
    <rect x={11.5} y={12.6} width={3} height={3} rx={0.6} fill="currentColor" stroke="none" opacity={0.45} />
  </Svg>
);

export const IconChat = (p: P) => (
  <Svg {...p}>
    <path d="M20.5 11.6c0 4.4-3.8 7.9-8.5 7.9-1.2 0-2.3-.2-3.3-.6L4 20.5l1.3-3.9C4.2 15.2 3.5 13.5 3.5 11.6 3.5 7.2 7.3 3.7 12 3.7s8.5 3.5 8.5 7.9z" />
    <circle cx={8.3} cy={11.6} r={1.05} fill="currentColor" stroke="none" />
    <circle cx={12} cy={11.6} r={1.05} fill="currentColor" stroke="none" />
    <circle cx={15.7} cy={11.6} r={1.05} fill="currentColor" stroke="none" />
  </Svg>
);

export const IconGrid = (p: P) => (
  <Svg {...p}>
    <rect x={4} y={4} width={6.6} height={6.6} rx={2} />
    <rect x={13.4} y={4} width={6.6} height={6.6} rx={2} />
    <rect x={4} y={13.4} width={6.6} height={6.6} rx={2} />
    <path d="M16.7 13.6v6.2M13.6 16.7h6.2" />
  </Svg>
);

export const IconBag = (p: P) => (
  <Svg {...p}>
    <path d="M12 2.5v3.5M8.5 6h7l.8 3H7.7z" />
    <rect x={7.5} y={9} width={9} height={11.5} rx={2.5} />
    <path d="M7.5 15h9" opacity={0.55} />
  </Svg>
);

export const IconMe = (p: P) => (
  <Svg {...p}>
    <circle cx={12} cy={8} r={3.75} />
    <path d="M4.5 20.5c.8-4 3.9-6 7.5-6s6.7 2 7.5 6" />
  </Svg>
);

export const IconUsers = (p: P) => (
  <Svg {...p}>
    <circle cx={9} cy={8.5} r={3.2} />
    <path d="M3 19.5c.7-3.4 3.2-5.2 6-5.2s5.3 1.8 6 5.2M15.5 5.6a3 3 0 010 5.8M17.8 14.6c1.6.7 2.8 2.2 3.2 4.6" />
  </Svg>
);

export const IconBell = (p: P) => (
  <Svg {...p}>
    <path d="M6 16.5V11a6 6 0 1112 0v5.5l1.5 2h-15z" />
    <path d="M10 20.5a2.2 2.2 0 004 0" />
  </Svg>
);

export const IconChart = (p: P) => (
  <Svg {...p}>
    <path d="M6 20v-6M12 20V5M18 20v-9" strokeWidth={2.25} />
  </Svg>
);

export const IconPlay = (p: P) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={9} />
    <path d="M10.2 8.6l5.2 3.4-5.2 3.4z" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconNews = (p: P) => (
  <Svg {...p}>
    <rect x={3.5} y={4.5} width={14} height={15} rx={2.2} />
    <path d="M17.5 8.5h1.8a1.2 1.2 0 011.2 1.2v7.6a2.2 2.2 0 01-4.4 0M7 8.5h7M7 12h7M7 15.5h4" />
  </Svg>
);

export const IconBelt = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 9.5h5M16.5 9.5h5M2.5 14.5h5M16.5 14.5h5" />
    <rect x={7.5} y={6} width={9} height={12} rx={4.5} />
    <circle cx={12} cy={12} r={2} fill="currentColor" stroke="none" />
  </Svg>
);

export const IconShop = (p: P) => (
  <Svg {...p}>
    <path d="M5 8h14l-1 12H6z" />
    <path d="M9 10.5V7a3 3 0 016 0v3.5" />
  </Svg>
);

export const IconSun = (p: P) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={4} />
    <path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7L5.3 5.3" />
  </Svg>
);

export const IconMoon = (p: P) => (
  <Svg {...p}>
    <path d="M19.5 14.6A8 8 0 019.4 4.5 8 8 0 1019.5 14.6z" />
  </Svg>
);

export const IconPhone = (p: P) => (
  <Svg {...p}>
    <rect x={6.5} y={2.5} width={11} height={19} rx={2.8} />
    <path d="M10.5 18.5h3" />
  </Svg>
);

export const IconGlobe = (p: P) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={9} />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
  </Svg>
);

export const IconSend = (p: P) => (
  <Svg {...p}>
    <path d="M12 19.5V5M6 10.5l6-6 6 6" strokeWidth={2.25} />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth={2.25} />
  </Svg>
);

export const IconInfo = (p: P) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={9} />
    <path d="M12 11v5.5" strokeWidth={2.05} />
    <circle cx={12} cy={7.8} r={1.1} fill="currentColor" stroke="none" />
  </Svg>
);

export const IconMail = (p: P) => (
  <Svg {...p}>
    <rect x={3} y={5.5} width={18} height={13} rx={2.6} />
    <path d="M3.8 7l8.2 6 8.2-6" />
  </Svg>
);

export const IconArrow = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h13M13 6l6 6-6 6" />
  </Svg>
);

export const IconChevron = (p: P) => (
  <Svg {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);

export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" strokeWidth={2} />
  </Svg>
);

export const IconChevronDown = (p: P) => (
  <Svg {...p}>
    <path d="M5 9l7 7 7-7" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x={5} y={10.5} width={14} height={10} rx={2.5} />
    <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    <circle cx={12} cy={15.5} r={1.3} fill="currentColor" stroke="none" />
  </Svg>
);

export const IconPin = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s6-5.6 6-11a6 6 0 10-12 0c0 5.4 6 11 6 11z" />
    <circle cx={12} cy={10} r={2} />
  </Svg>
);

export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={9} />
    <path d="M12 7v5l3.2 2" />
  </Svg>
);

export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12.2a1.6 1.6 0 001.6 1.3h6.2a1.6 1.6 0 001.6-1.3L17.5 7" />
  </Svg>
);

export const IconShield = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l7 2.8v5.4c0 4.4-3 8.2-7 9.8-4-1.6-7-5.4-7-9.8V5.8z" />
  </Svg>
);

export const IconShare = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5v11M8 7.5l4-4 4 4M6 11.5H5a1.5 1.5 0 00-1.5 1.5v6A1.5 1.5 0 005 20.5h14a1.5 1.5 0 001.5-1.5v-6a1.5 1.5 0 00-1.5-1.5h-1" />
  </Svg>
);

export const IconCalendarPlus = (p: P) => (
  <Svg {...p}>
    <rect x={3.5} y={5} width={17} height={15.5} rx={2.5} />
    <path d="M3.5 9.5h17M8 3v4M16 3v4M12 12v5M9.5 14.5h5" />
  </Svg>
);

/* --- Propres à l'admin, même grille --------------------------------- */

/** Modération : le bouclier coché. */
export const IconShieldCheck = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l7 2.8v5.4c0 4.4-3 8.2-7 9.8-4-1.6-7-5.4-7-9.8V5.8z" />
    <path d="M8.8 12.2l2.2 2.2 4.2-4.6" />
  </Svg>
);

/** Fonctions : l'interrupteur. */
export const IconToggle = (p: P) => (
  <Svg {...p}>
    <rect x={2.5} y={7} width={19} height={10} rx={5} />
    <circle cx={16.5} cy={12} r={2.6} fill="currentColor" stroke="none" />
  </Svg>
);

/** Branchements : deux prises qui se rejoignent. */
export const IconPlug = (p: P) => (
  <Svg {...p}>
    <path d="M9 3.5v4M15 3.5v4M6.5 7.5h11v3.2a5.5 5.5 0 01-11 0z" />
    <path d="M12 16.2v4.3" />
  </Svg>
);

/** Deciplus : la base de données reliée. */
export const IconDatabase = (p: P) => (
  <Svg {...p}>
    <ellipse cx={11} cy={5.8} rx={6.5} ry={2.6} />
    <path d="M4.5 5.8v11.4c0 1.4 2.9 2.6 6.5 2.6M17.5 5.8v5M4.5 11.5c0 1.4 2.9 2.6 6.5 2.6" />
    <path d="M15 17.5h6M18.5 15l2.5 2.5-2.5 2.5" />
  </Svg>
);

/** Démo des statistiques : les curseurs. */
export const IconSliders = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx={15} cy={7} r={2.2} />
    <circle cx={9} cy={17} r={2.2} />
  </Svg>
);

/** Journal : la liste horodatée. */
export const IconJournal = (p: P) => (
  <Svg {...p}>
    <path d="M9 6.5h11M9 12h11M9 17.5h7" />
    <circle cx={4.8} cy={6.5} r={1.15} fill="currentColor" stroke="none" />
    <circle cx={4.8} cy={12} r={1.15} fill="currentColor" stroke="none" />
    <circle cx={4.8} cy={17.5} r={1.15} fill="currentColor" stroke="none" />
  </Svg>
);

/** Événements : le billet. */
export const IconTicket = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 7.5A1.5 1.5 0 015 6h14a1.5 1.5 0 011.5 1.5V10a2 2 0 000 4v2.5A1.5 1.5 0 0119 18H5a1.5 1.5 0 01-1.5-1.5V14a2 2 0 000-4z" />
    <path d="M14.5 6.5v11" strokeDasharray="1.6 2.2" />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx={10.8} cy={10.8} r={6.3} />
    <path d="M20 20l-4.4-4.4" />
  </Svg>
);

export const IconHelp = (p: P) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={9} />
    <path d="M9.6 9.4a2.5 2.5 0 014.8 1c0 1.7-2.4 2.1-2.4 3.6" />
    <circle cx={12} cy={17.2} r={1.1} fill="currentColor" stroke="none" />
  </Svg>
);

export const IconMonitor = (p: P) => (
  <Svg {...p}>
    <rect x={3} y={4.5} width={18} height={12} rx={2.2} />
    <path d="M9 20h6M12 16.5V20" />
  </Svg>
);

export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" strokeWidth={2.1} />
  </Svg>
);

export const IconMinus = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" strokeWidth={2.1} />
  </Svg>
);

export const IconEdit = (p: P) => (
  <Svg {...p}>
    <path d="M14.5 5.5l4 4M4.5 19.5l1-4.5L15.8 4.7a1.8 1.8 0 012.5 0l1 1a1.8 1.8 0 010 2.5L9 18.5z" />
  </Svg>
);

export const IconCopy = (p: P) => (
  <Svg {...p}>
    <rect x={8.5} y={8.5} width={11} height={11} rx={2.2} />
    <path d="M15.5 8.5V6.2a1.7 1.7 0 00-1.7-1.7H6.2a1.7 1.7 0 00-1.7 1.7v7.6a1.7 1.7 0 001.7 1.7h2.3" />
  </Svg>
);

export const IconExternal = (p: P) => (
  <Svg {...p}>
    <path d="M13.5 4.5h6v6M19.5 4.5l-8 8M17.5 13.5v4.3a1.7 1.7 0 01-1.7 1.7H6.2a1.7 1.7 0 01-1.7-1.7V8.2a1.7 1.7 0 011.7-1.7h4.3" />
  </Svg>
);

export const IconArchive = (p: P) => (
  <Svg {...p}>
    <rect x={3.5} y={4.5} width={17} height={4.5} rx={1.3} />
    <path d="M5 9v9.3a1.7 1.7 0 001.7 1.7h10.6a1.7 1.7 0 001.7-1.7V9M10 13h4" />
  </Svg>
);

export const IconUndo = (p: P) => (
  <Svg {...p}>
    <path d="M8.5 5.5L4.5 9.5l4 4" />
    <path d="M4.5 9.5h10a5 5 0 010 10h-3" />
  </Svg>
);

export const IconFilter = (p: P) => (
  <Svg {...p}>
    <path d="M4 6h16M7 12h10M10.5 18h3" />
  </Svg>
);

export const IconDownload = (p: P) => (
  <Svg {...p}>
    <path d="M12 4.5v11M7.5 11l4.5 4.5 4.5-4.5M5 19.5h14" />
  </Svg>
);

export const IconPrint = (p: P) => (
  <Svg {...p}>
    <path d="M7 8.5V4h10v4.5M7 16.5H5.2a1.7 1.7 0 01-1.7-1.7v-4.6a1.7 1.7 0 011.7-1.7h13.6a1.7 1.7 0 011.7 1.7v4.6a1.7 1.7 0 01-1.7 1.7H17" />
    <rect x={7} y={13.5} width={10} height={6.5} rx={1} />
  </Svg>
);

export const IconRefresh = (p: P) => (
  <Svg {...p}>
    <path d="M19.5 12a7.5 7.5 0 11-2.2-5.3M19.5 4.5v3.8h-3.8" />
  </Svg>
);

export const IconLogout = (p: P) => (
  <Svg {...p}>
    <path d="M10 4.5H6.2a1.7 1.7 0 00-1.7 1.7v11.6a1.7 1.7 0 001.7 1.7H10M15 8l4 4-4 4M19 12H9.5" />
  </Svg>
);

export const IconMenu = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const IconDots = (p: P) => (
  <Svg {...p}>
    <circle cx={6} cy={12} r={1.4} fill="currentColor" stroke="none" />
    <circle cx={12} cy={12} r={1.4} fill="currentColor" stroke="none" />
    <circle cx={18} cy={12} r={1.4} fill="currentColor" stroke="none" />
  </Svg>
);

export const IconPhoto = (p: P) => (
  <Svg {...p}>
    <rect x={3.5} y={5} width={17} height={14} rx={2.4} />
    <circle cx={9} cy={10} r={1.7} />
    <path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4" />
  </Svg>
);

export const IconLink = (p: P) => (
  <Svg {...p}>
    <path d="M10 14a3.5 3.5 0 005 0l3.5-3.5a3.5 3.5 0 00-5-5L12 7" />
    <path d="M14 10a3.5 3.5 0 00-5 0l-3.5 3.5a3.5 3.5 0 005 5L12 17" />
  </Svg>
);

export const IconFlag = (p: P) => (
  <Svg {...p}>
    <path d="M5.5 20.5V4.5M5.5 5h11.5l-2.2 3.8 2.2 3.7H5.5" />
  </Svg>
);

export const IconEye = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx={12} cy={12} r={3} />
  </Svg>
);

export const IconEyeOff = (p: P) => (
  <Svg {...p}>
    <path d="M4 4l16 16M10.2 6a9.7 9.7 0 011.8-.5c6 0 9.5 6.5 9.5 6.5a17 17 0 01-2.6 3.4M6.6 7.4A16.4 16.4 0 002.5 12S6 18.5 12 18.5a8.7 8.7 0 004.2-1.1" />
    <path d="M9.9 10a3 3 0 004.1 4.2" />
  </Svg>
);

export const IconAlert = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.8l9 15.6a.9.9 0 01-.8 1.3H3.8a.9.9 0 01-.8-1.3z" />
    <path d="M12 9.5v4.5" strokeWidth={2.05} />
    <circle cx={12} cy={17.2} r={1.1} fill="currentColor" stroke="none" />
  </Svg>
);

export const IconUpload = (p: P) => (
  <Svg {...p}>
    <path d="M12 15.5v-11M7.5 9L12 4.5 16.5 9M5 19.5h14" />
  </Svg>
);

export const IconMove = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5v17M3.5 12h17M9 6.5l3-3 3 3M9 17.5l3 3 3-3M6.5 9l-3 3 3 3M17.5 9l3 3-3 3" />
  </Svg>
);

export const IconBan = (p: P) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={8.5} />
    <path d="M6 6l12 12" />
  </Svg>
);

export const IconKeyboard = (p: P) => (
  <Svg {...p}>
    <rect x={2.5} y={6} width={19} height={12} rx={2.4} />
    <path d="M6.5 10h1M10.5 10h1M14.5 10h1M17.5 10h.5M7 14h10" />
  </Svg>
);

export const IconSparkle = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z" />
    <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
  </Svg>
);

export const IconInbox = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 13.5l2.4-7.2a1.7 1.7 0 011.6-1.3h9a1.7 1.7 0 011.6 1.3l2.4 7.2v4.8a1.7 1.7 0 01-1.7 1.7H5.2a1.7 1.7 0 01-1.7-1.7z" />
    <path d="M3.5 13.5h4.8l1.2 2.4h5l1.2-2.4h4.8" />
  </Svg>
);

export const IconTable = (p: P) => (
  <Svg {...p}>
    <rect x={3.5} y={4.5} width={17} height={15} rx={2.5} />
    <path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10" />
  </Svg>
);

export const IconCalendarOff = (p: P) => (
  <Svg {...p}>
    <rect x={3.5} y={5} width={17} height={15.5} rx={2.5} />
    <path d="M3.5 9.8h17M8 3v3.6M16 3v3.6M9.5 13.2l5 5M14.5 13.2l-5 5" />
  </Svg>
);
