import type { Metadata } from 'next';

import { UsageView } from './UsageView';
import { requireUser } from '@/server/session';
import { usageReport } from '@/server/usage';

export const metadata: Metadata = { title: 'Statistiques' };

const PERIODS = [7, 30, 90] as const;

export default async function UsagePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser('statistiques');
  const params = await searchParams;
  const asked = Number(Array.isArray(params.periode) ? params.periode[0] : params.periode);
  const period = (PERIODS as readonly number[]).includes(asked) ? asked : 30;
  const includeDemo = params.demo !== '0';
  const report = await usageReport(period, includeDemo);
  // La part de démo se calcule sur tout le fichier : on la montre même quand elle est masquée.
  return <UsageView report={report} period={period} includeDemo={includeDemo} />;
}
