import { IconBell, IconChart, IconChat, IconDatabase, IconJournal, IconNews, IconPlanning, IconPlay, IconPlug, IconRing, IconShieldCheck, IconSliders, IconTicket, IconToggle, IconUsers } from './icons';
import type { IconName } from '@/lib/nav';

const MAP = {
  ring: IconRing,
  news: IconNews,
  ticket: IconTicket,
  play: IconPlay,
  planning: IconPlanning,
  chat: IconChat,
  bell: IconBell,
  shieldCheck: IconShieldCheck,
  chart: IconChart,
  sliders: IconSliders,
  toggle: IconToggle,
  plug: IconPlug,
  database: IconDatabase,
  users: IconUsers,
  journal: IconJournal,
} as const;

export function NavIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  const Icon = MAP[name];
  return <Icon size={size} />;
}
