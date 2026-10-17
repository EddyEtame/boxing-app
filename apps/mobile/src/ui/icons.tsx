import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { color } from '@/ui/theme';

export type IconProps = { size?: number; color?: string; strokeWidth?: number };

const defaults = { size: 24, color: color.text, strokeWidth: 1.75 };

/** Le ring vu du dessus : un carré et ses quatre poteaux. */
export function IconRing({ size = defaults.size, color: c = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4.5} y={4.5} width={15} height={15} stroke={c} strokeWidth={strokeWidth} />
      <Circle cx={4.5} cy={4.5} r={1.6} fill={c} />
      <Circle cx={19.5} cy={4.5} r={1.6} fill={c} />
      <Circle cx={4.5} cy={19.5} r={1.6} fill={c} />
      <Circle cx={19.5} cy={19.5} r={1.6} fill={c} />
    </Svg>
  );
}

/** Le badge : trois coins de QR et un point. */
export function IconBadge({ size = defaults.size, color: c = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={3.5} width={6.5} height={6.5} stroke={c} strokeWidth={strokeWidth} />
      <Rect x={14} y={3.5} width={6.5} height={6.5} stroke={c} strokeWidth={strokeWidth} />
      <Rect x={3.5} y={14} width={6.5} height={6.5} stroke={c} strokeWidth={strokeWidth} />
      <Rect x={6} y={6} width={1.6} height={1.6} fill={c} />
      <Rect x={16.5} y={6} width={1.6} height={1.6} fill={c} />
      <Rect x={6} y={16.5} width={1.6} height={1.6} fill={c} />
      <Path d="M14 14h2.5v2.5H14zM18 14h2.5v2.5H18zM14 18h2.5v2.5H14zM18 18h2.5v2.5H18z" fill={c} />
    </Svg>
  );
}

/** Le planning : une grille de la semaine. */
export function IconPlanning({ size = defaults.size, color: c = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={5} width={17} height={15} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M3.5 9.5h17M8 5V3M16 5V3" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Rect x={6.5} y={12} width={3} height={3} fill={c} />
      <Rect x={11} y={12} width={3} height={3} fill={c} opacity={0.5} />
    </Svg>
  );
}

/** S’entraîner : le sac de frappe. */
export function IconBag({ size = defaults.size, color: c = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2.5v3.5" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M8.5 6h7l.8 3H7.7z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Rect x={7.5} y={9} width={9} height={11.5} rx={1.5} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M7.5 15h9" stroke={c} strokeWidth={strokeWidth} opacity={0.6} />
    </Svg>
  );
}

/** Moi : la silhouette. */
export function IconMe({ size = defaults.size, color: c = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.75} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M4.5 20.5c.8-4 3.9-6 7.5-6s6.7 2 7.5 6" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconArrow({ size = defaults.size, color: c = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h13M13 6l6 6-6 6" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconChevron({ size = defaults.size, color: c = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconClose({ size = defaults.size, color: c = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconLock({ size = defaults.size, color: c = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={10.5} width={14} height={10} rx={1.5} stroke={c} strokeWidth={strokeWidth} />
      <Path d="M8 10.5V7.5a4 4 0 018 0v3" stroke={c} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={15.5} r={1.3} fill={c} />
    </Svg>
  );
}

export function IconPin({ size = defaults.size, color: c = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s6-5.6 6-11a6 6 0 10-12 0c0 5.4 6 11 6 11z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Circle cx={12} cy={10} r={2} stroke={c} strokeWidth={strokeWidth} />
    </Svg>
  );
}
