import { HomeA } from '@/screens/home/HomeA';
import { HomeB } from '@/screens/home/HomeB';
import { HomeC } from '@/screens/home/HomeC';
import { useDirection } from '@/state/direction';

const BY_DIRECTION = { A: HomeA, B: HomeB, C: HomeC } as const;

export function Screen() {
  const direction = useDirection((s) => s.direction);
  const Home = BY_DIRECTION[direction];
  return <Home />;
}
