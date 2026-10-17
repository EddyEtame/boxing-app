import { BadgeA } from '@/screens/badge/BadgeA';
import { BadgeB } from '@/screens/badge/BadgeB';
import { BadgeC } from '@/screens/badge/BadgeC';
import { useDirection } from '@/state/direction';

const BY_DIRECTION = { A: BadgeA, B: BadgeB, C: BadgeC } as const;

export function Screen() {
  const direction = useDirection((s) => s.direction);
  const Badge = BY_DIRECTION[direction];
  return <Badge key={direction} />;
}
