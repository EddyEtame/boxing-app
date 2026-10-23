'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { IconChart, IconTable } from '@/components/icons';
import { useI18n, useT } from '@/i18n/client';

/**
 * Les graphiques de l'admin, en HTML (net à toutes les tailles, lisible par un
 * lecteur d'écran). Chaque marque est une cible de survol ET de clavier qui
 * montre sa valeur ; chaque graphique a sa vue en tableau. Une série, une
 * couleur ; le rouge ne marque que l'état présent (la semaine en cours).
 */
type Tip = { x: number; y: number; value: string; label: string } | null;

function TipBox({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }} role="presentation">
      <strong>{tip.value}</strong>
      <span>{tip.label}</span>
    </div>
  );
}

/** Le bascule graphique ⇄ tableau, au-dessus à droite de chaque graphique. */
export function ChartFrame({ title, sub, table, children, actions }: { title: string; sub?: ReactNode; table: { head: string[]; rows: (string | number)[][] }; children: ReactNode; actions?: ReactNode }) {
  const t = useT();
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  return (
    <section className="panel" aria-labelledby={id}>
      <div className="panel-head">
        <div>
          <h3 id={id} className="panel-title">
            {title}
          </h3>
          {sub ? <p className="panel-sub">{sub}</p> : null}
        </div>
        <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
          {actions}
          <button type="button" className="btn btn-ghost btn-sm" aria-pressed={asTable} aria-label={asTable ? t('chart.view') : t('table.view')} onClick={() => setAsTable((v) => !v)}>
            {asTable ? <IconChart size={16} /> : <IconTable size={16} />}
            <span className="hide-sm">{asTable ? t('chart.view') : t('table.view')}</span>
          </button>
        </div>
      </div>
      <div className="panel-body">
        {asTable ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  {table.head.map((h, i) => (
                    <th key={h} data-num={i > 0}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j} data-num={j > 0}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export type Col = { key: string; label: string; axis?: string; value: number; display?: string; hi?: boolean; soft?: boolean };

/**
 * Les repères de l'axe qui tiennent sans se chevaucher. Le dernier s'écrit toujours (calé à droite),
 * le premier est calé à gauche, les autres centrés sur leur colonne ; un repère régulier n'est gardé
 * que s'il laisse 8 px de part et d'autre. La largeur d'un repère s'estime sur la police mono de 11 px.
 */
function visibleAxis(data: Col[], width: number, every: number): Set<number> {
  const last = data.length - 1;
  const out = new Set<number>(last >= 0 ? [last] : []);
  if (width <= 0) {
    for (let i = 0; i < last; i += every) if (last - i >= Math.ceil(every / 2)) out.add(i);
    return out;
  }
  const pitch = width / data.length;
  const span = (i: number): [number, number] => {
    const w = (data[i].axis ?? '').length * 6.6 + 6;
    if (i === 0) return [0, w];
    if (i === last) return [width - w, width];
    const c = (i + 0.5) * pitch;
    return [c - w / 2, c + w / 2];
  };
  const lastLeft = span(last)[0];
  let right = -Infinity;
  for (let i = 0; i < last; i += every) {
    const [l, r] = span(i);
    if (l >= right + 8 && r <= lastLeft - 8) {
      out.add(i);
      right = r;
    }
  }
  return out;
}

/** Colonnes (semaines, jours) : bout arrondi, ligne de base unique, valeur au survol. */
export function Columns({ data, height = 180, barWidth = 24, gap = 6, goal, goalLabel, labelEvery = 1, showValues = 'extremes', ariaLabel }: { data: Col[]; height?: number; barWidth?: number; gap?: number; goal?: number; goalLabel?: string; labelEvery?: number; showValues?: 'none' | 'extremes' | 'all'; ariaLabel: string }) {
  const [tip, setTip] = useState<Tip>(null);
  // L'écart entre deux repères suit la largeur réelle : un repère fait ~60 px, il n'en chevauche jamais un autre.
  const colsRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = colsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const every = width > 0 && data.length > 0 ? Math.max(labelEvery, Math.ceil(60 / (width / data.length))) : labelEvery;
  const shownAxis = visibleAxis(data, width, every);
  const max = Math.max(1, goal ?? 0, ...data.map((d) => d.value));
  const plot = height - 22;
  const peak = Math.max(...data.map((d) => d.value));
  const lastIdx = data.length - 1;
  const show = (d: Col, i: number) => showValues === 'all' || (showValues === 'extremes' && d.value > 0 && (d.value === peak || i === lastIdx || d.hi));

  const point = (e: React.MouseEvent | React.FocusEvent, d: Col) => {
    const col = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const box = (e.currentTarget as HTMLElement).closest('.chart')!.getBoundingClientRect();
    const h = Math.max(3, (d.value / max) * plot);
    setTip({ x: col.left - box.left + col.width / 2, y: col.bottom - box.top - h, value: d.display ?? String(d.value), label: d.label });
  };

  return (
    <div className="chart" role="img" aria-label={ariaLabel} onMouseLeave={() => setTip(null)}>
      <div ref={colsRef} className="chart-cols" style={{ '--chart-h': `${height}px`, '--bar-w': `${barWidth}px`, '--bar-gap': `${gap}px` } as React.CSSProperties}>
        {goal ? (
          <div className="chart-goal" style={{ bottom: (goal / max) * plot, borderTop: '1.5px dashed var(--text-dim)', borderImage: 'none' }} aria-hidden="true">
            {goalLabel ? <span>{goalLabel}</span> : null}
          </div>
        ) : null}
        {data.map((d, i) => {
          const h = Math.max(0, (d.value / max) * plot);
          return (
            <button
              key={d.key}
              type="button"
              className="chart-col"
              aria-label={`${d.label} : ${d.display ?? d.value}`}
              onMouseEnter={(e) => point(e, d)}
              onFocus={(e) => point(e, d)}
              onBlur={() => setTip(null)}
              style={{ '--h': `${Math.max(h, 3)}px`, animationDelay: `${Math.min(i, 12) * 20}ms` } as React.CSSProperties}
            >
              <span className="chart-bar" data-hi={d.hi || undefined} data-soft={d.soft || undefined} data-empty={d.value === 0 || undefined} style={{ height: h, animationDelay: `${Math.min(i, 12) * 24}ms` }} />
              {show(d, i) ? (
                <span className="chart-val" aria-hidden="true">
                  {d.display ?? d.value}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="chart-axis" style={{ '--bar-gap': `${gap}px` } as React.CSSProperties} aria-hidden="true">
        {data.map((d, i) => {
          const shown = shownAxis.has(i);
          return (
            <span key={d.key} data-edge={i === 0 ? 'start' : i === lastIdx ? 'end' : undefined}>
              {shown ? (d.axis ?? '') : ''}
            </span>
          );
        })}
      </div>
      <TipBox tip={tip} />
    </div>
  );
}

export type HBar = { key: string; label: string; value: number; display?: string; note?: string };

/** Barres horizontales : une seule teinte, le nom écrit à gauche, la valeur au bout. */
export function HBars({ data, ariaLabel, max: forcedMax, onSelect }: { data: HBar[]; ariaLabel: string; max?: number; onSelect?: (key: string) => void }) {
  const max = forcedMax ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="hbars" role="list" aria-label={ariaLabel}>
      {data.map((d, i) => (
        <div key={d.key} role="listitem">
          <button type="button" className="hbar" onClick={onSelect ? () => onSelect(d.key) : undefined} style={{ width: '100%', cursor: onSelect ? 'pointer' : 'default' }} aria-label={`${d.label} : ${d.display ?? d.value}${d.note ? ` (${d.note})` : ''}`}>
            <span className="hbar-label">{d.label}</span>
            <span className="hbar-track">
              <span className="hbar-fill" style={{ display: 'block', width: `${(d.value / max) * 100}%`, animationDelay: `${Math.min(i, 8) * 40}ms` }} />
            </span>
            <span className="hbar-value">
              {d.display ?? d.value}
              {d.note ? <small>{d.note}</small> : null}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}

export type FunnelStep = { key: string; label: string; sub?: string; value: number };

/** L'entonnoir : la part du départ en barre, la perte depuis l'étape d'avant en rouge (convention du panneau de la boutique). */
export function Funnel({ steps, ariaLabel, hiLast = false }: { steps: FunnelStep[]; ariaLabel: string; hiLast?: boolean }) {
  const { t, locale } = useI18n();
  const first = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className="funnel" aria-label={ariaLabel}>
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1]!.value : s.value;
        const loss = i > 0 && prev > 0 ? Math.round(((prev - s.value) / prev) * 100) : 0;
        return (
          <li key={s.key} className="funnel-step">
            <span className="funnel-label">
              {s.label}
              {s.sub ? <small>{s.sub}</small> : null}
            </span>
            <span className="funnel-track" aria-hidden="true">
              <span className="funnel-fill" data-hi={hiLast && i === steps.length - 1 ? 'true' : undefined} style={{ width: `${(s.value / first) * 100}%`, animationDelay: `${i * 83}ms` }} />
            </span>
            <span className="funnel-num">
              <strong>{s.value.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB')}</strong>
              <span>
                {Math.round((s.value / first) * 100)} %{i > 0 && loss > 0 ? <span className="loss"> · −{loss} %</span> : null}
              </span>
              <span className="sr-only">{i > 0 ? t('chart.loss', { n: loss }) : ''}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export type HeatCell = { date: string; count: number; future: boolean; today: boolean; label: string };

/** La carte de régularité : une case par jour, du plus clair (rien) au plus foncé (trois passages et plus). */
export function Heatmap({ columns, dayLabels, ariaLabel, cell = 16, legend }: { columns: HeatCell[][]; dayLabels: string[]; ariaLabel: string; cell?: number; legend: { less: string; more: string } }) {
  const [tip, setTip] = useState<Tip>(null);
  const level = (n: number) => (n <= 0 ? 0 : n >= 3 ? 3 : n);
  const point = (e: React.MouseEvent | React.FocusEvent, c: HeatCell) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const box = (e.currentTarget as HTMLElement).closest('.chart')!.getBoundingClientRect();
    setTip({ x: r.left - box.left + r.width / 2, y: r.top - box.top, value: String(c.count), label: c.label });
  };
  return (
    <div className="chart" role="img" aria-label={ariaLabel} onMouseLeave={() => setTip(null)} style={{ '--cell': `${cell}px` } as React.CSSProperties}>
      <div className="heat">
        <div className="heat-days" aria-hidden="true">
          {dayLabels.map((d, i) => (
            <span key={d}>{i % 2 === 0 ? d : ''}</span>
          ))}
        </div>
        <div className="heat-grid">
          {columns.flatMap((col) =>
            col.map((c) => (
              <button
                key={c.date}
                type="button"
                className="heat-cell"
                data-level={c.future ? undefined : level(c.count)}
                data-future={c.future || undefined}
                data-today={c.today || undefined}
                aria-label={`${c.label} : ${c.count}`}
                onMouseEnter={(e) => point(e, c)}
                onFocus={(e) => point(e, c)}
                onBlur={() => setTip(null)}
              />
            )),
          )}
        </div>
      </div>
      <div className="heat-scale" aria-hidden="true">
        <span>{legend.less}</span>
        {[0, 1, 2, 3].map((l) => (
          <span key={l} className="heat-cell" data-level={l} />
        ))}
        <span>{legend.more}</span>
      </div>
      <TipBox tip={tip} />
    </div>
  );
}

/** Une tuile chiffrée : le libellé, la valeur (chiffres proportionnels), ce qu'il faut en retenir. */
export function Kpi({ label, value, unit, sub, delta, icon, hero }: { label: string; value: string | number; unit?: string; sub?: ReactNode; delta?: { text: string; good: boolean } | null; icon?: ReactNode; hero?: boolean }) {
  const { locale } = useI18n();
  return (
    <div className={`kpi${hero ? ' kpi-hero' : ''}`}>
      <span className="kpi-label">
        {icon}
        {label}
      </span>
      <span className="kpi-value">
        {typeof value === 'number' ? value.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB') : value}
        {unit ? <small>{unit}</small> : null}
      </span>
      {delta ? (
        <span className="kpi-delta" data-good={delta.good}>
          {delta.text}
        </span>
      ) : null}
      {sub ? <span className="kpi-sub">{sub}</span> : null}
    </div>
  );
}
