import { useContext } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { OnPhotoContext } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export type IconProps = { size?: number; color?: string; strokeWidth?: number };

/**
 * Les glyphes maison : un seul style (trait 1,75 sur une grille de 24, bouts
 * ronds). Sans couleur donnée, ils prennent la couleur du texte de l'ambiance,
 * ou le blanc quand ils sont posés sur une photo.
 */
function useIcon(color?: string): string {
  const t = useTheme();
  const onPhoto = useContext(OnPhotoContext);
  return color ?? (onPhoto ? t.photo.text : t.text);
}

const SW = 1.75;

/** Accueil : le ring vu du dessus, un carré et ses quatre poteaux. */
export function IconRing({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4.5} y={4.5} width={15} height={15} rx={1.5} stroke={c} strokeWidth={strokeWidth} />
      <Circle cx={4.5} cy={4.5} r={1.7} fill={c} />
      <Circle cx={19.5} cy={4.5} r={1.7} fill={c} />
      <Circle cx={4.5} cy={19.5} r={1.7} fill={c} />
      <Circle cx={19.5} cy={19.5} r={1.7} fill={c} />
    </Svg>
  );
}

/** Le badge : trois coins de QR et un motif. */
export function IconBadge({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={3.5} width={6.5} height={6.5} rx={1.2} stroke={c} strokeWidth={strokeWidth} />
      <Rect x={14} y={3.5} width={6.5} height={6.5} rx={1.2} stroke={c} strokeWidth={strokeWidth} />
      <Rect x={3.5} y={14} width={6.5} height={6.5} rx={1.2} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M14 14h2.5v2.5H14zM18 14h2.5v2.5H18zM14 18h2.5v2.5H14zM18 18h2.5v2.5H18z" fill={c} />
    </Svg>
  );
}

export function IconPlanning({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M3.5 9.8h17M8 3v3.6M16 3v3.6" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Rect x={7} y={12.6} width={3} height={3} rx={0.6} fill={c} />
      <Rect x={11.5} y={12.6} width={3} height={3} rx={0.6} fill={c} opacity={0.45} />
    </Svg>
  );
}

/** Messages : la bulle. */
export function IconChat({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20.5 11.6c0 4.4-3.8 7.9-8.5 7.9-1.2 0-2.3-.2-3.3-.6L4 20.5l1.3-3.9C4.2 15.2 3.5 13.5 3.5 11.6 3.5 7.2 7.3 3.7 12 3.7s8.5 3.5 8.5 7.9z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Circle cx={8.3} cy={11.6} r={1.05} fill={c} />
      <Circle cx={12} cy={11.6} r={1.05} fill={c} />
      <Circle cx={15.7} cy={11.6} r={1.05} fill={c} />
    </Svg>
  );
}

/** Plus : toutes les rubriques, en grille. */
export function IconGrid({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={6.6} height={6.6} rx={2} stroke={c} strokeWidth={strokeWidth} />
      <Rect x={13.4} y={4} width={6.6} height={6.6} rx={2} stroke={c} strokeWidth={strokeWidth} />
      <Rect x={4} y={13.4} width={6.6} height={6.6} rx={2} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M16.7 13.6v6.2M13.6 16.7h6.2" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** S'entraîner : le sac de frappe. */
export function IconBag({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2.5v3.5" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M8.5 6h7l.8 3H7.7z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Rect x={7.5} y={9} width={9} height={11.5} rx={2.5} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M7.5 15h9" stroke={c} strokeWidth={strokeWidth} opacity={0.55} />
    </Svg>
  );
}

export function IconMe({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.75} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M4.5 20.5c.8-4 3.9-6 7.5-6s6.7 2 7.5 6" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconUsers({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8.5} r={3.2} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M3 19.5c.7-3.4 3.2-5.2 6-5.2s5.3 1.8 6 5.2" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M15.5 5.6a3 3 0 010 5.8M17.8 14.6c1.6.7 2.8 2.2 3.2 4.6" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconBell({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 16.5V11a6 6 0 1112 0v5.5l1.5 2h-15z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M10 20.5a2.2 2.2 0 004 0" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconCard({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2.8} y={5.5} width={18.4} height={13} rx={2.6} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M2.8 10h18.4M6.5 14.8h4" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconChart({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 20v-6M12 20V5M18 20v-9" stroke={c} strokeWidth={strokeWidth + 0.5} strokeLinecap="round" />
    </Svg>
  );
}

export function IconPlay({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M10.2 8.6l5.2 3.4-5.2 3.4z" fill={c} />
    </Svg>
  );
}

export function IconNews({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={4.5} width={14} height={15} rx={2.2} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M17.5 8.5h1.8a1.2 1.2 0 011.2 1.2v7.6a2.2 2.2 0 01-4.4 0M7 8.5h7M7 12h7M7 15.5h4" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Combats : la ceinture. */
export function IconBelt({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2.5 9.5h5M16.5 9.5h5M2.5 14.5h5M16.5 14.5h5" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Rect x={7.5} y={6} width={9} height={12} rx={4.5} stroke={c} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={12} r={2} fill={c} />
    </Svg>
  );
}

export function IconShop({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 8h14l-1 12H6z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M9 10.5V7a3 3 0 016 0v3.5" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconDisciplines({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={7.5} cy={7.5} r={3.5} stroke={c} strokeWidth={strokeWidth} />
      <Circle cx={16.5} cy={16.5} r={3.5} stroke={c} strokeWidth={strokeWidth} />
      <Rect x={13} y={4} width={7} height={7} rx={2} stroke={c} strokeWidth={strokeWidth} />
      <Rect x={4} y={13} width={7} height={7} rx={2} stroke={c} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconGear({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={12} cy={12} r={6.4} stroke={c} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconSun({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7L5.3 5.3" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconMoon({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19.5 14.6A8 8 0 019.4 4.5 8 8 0 1019.5 14.6z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

export function IconPhone({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={6.5} y={2.5} width={11} height={19} rx={2.8} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M10.5 18.5h3" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconGlobe({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

export function IconSend({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19.5V5M6 10.5l6-6 6 6" stroke={c} strokeWidth={strokeWidth + 0.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCheck({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c} strokeWidth={strokeWidth + 0.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconInfo({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M12 11v5.5" stroke={c} strokeWidth={strokeWidth + 0.3} strokeLinecap="round" />
      <Circle cx={12} cy={7.8} r={1.1} fill={c} />
    </Svg>
  );
}

export function IconMail({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5.5} width={18} height={13} rx={2.6} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M3.8 7l8.2 6 8.2-6" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

export function IconArrow({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h13M13 6l6 6-6 6" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconChevron({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconBack({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={c} strokeWidth={strokeWidth + 0.25} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconClose({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconLock({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={10.5} width={14} height={10} rx={2.5} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M8 10.5V7.5a4 4 0 018 0v3" stroke={c} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={15.5} r={1.3} fill={c} />
    </Svg>
  );
}

export function IconPin({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s6-5.6 6-11a6 6 0 10-12 0c0 5.4 6 11 6 11z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Circle cx={12} cy={10} r={2} stroke={c} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconClock({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M12 7v5l3.2 2" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconTrash({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12.2a1.6 1.6 0 001.6 1.3h6.2a1.6 1.6 0 001.6-1.3L17.5 7" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconShield({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l7 2.8v5.4c0 4.4-3 8.2-7 9.8-4-1.6-7-5.4-7-9.8V5.8z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

export function IconStar({ size = 24, color, strokeWidth = SW, fill }: IconProps & { fill?: string }) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8L12 3.5z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" fill={fill ?? 'none'} />
    </Svg>
  );
}

export function IconShare({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.5v11" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M8 7.5l4-4 4 4" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 11.5H5a1.5 1.5 0 00-1.5 1.5v6A1.5 1.5 0 005 20.5h14a1.5 1.5 0 001.5-1.5v-6a1.5 1.5 0 00-1.5-1.5h-1" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconCalendarPlus({ size = 24, color, strokeWidth = SW }: IconProps) {
  const c = useIcon(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M3.5 9.5h17M8 3v4M16 3v4" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M12 12v5M9.5 14.5h5" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
