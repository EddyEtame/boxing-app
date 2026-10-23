'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useT } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';

/**
 * La visite guidée du premier lancement : six étapes, un projecteur sur
 * l'élément présenté, le reste de l'écran dans l'ombre. Clavier : flèches pour
 * avancer et reculer, Échap pour passer. Elle ne revient pas une fois vue
 * (enregistré par compte), et se rejoue depuis le menu du compte ou l'aide.
 */
type Step = { n: number; target: string | null };

const STEPS: Step[] = [
  { n: 1, target: null },
  { n: 2, target: '[data-tour="rail"], .mobilebar' },
  { n: 3, target: '[data-tour="today"]' },
  { n: 4, target: '[data-tour="create"], .search-btn' },
  { n: 5, target: '[data-tour="help"]' },
  { n: 6, target: '.topbar [data-tour="apparence"], [data-tour="apparence"]' },
];

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(selector: string | null): HTMLElement | null {
  if (!selector) return null;
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    if (el.getClientRects().length > 0 && el.offsetParent !== null) return el;
  }
  return null;
}

const PAD = 8;
const CARD_W = 380;
const MARGIN = 16;

export function Tour({ onEnd }: { onEnd: () => void }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [hole, setHole] = useState<Rect | null>(null);
  const [card, setCard] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;

  const place = useCallback(() => {
    const el = findTarget(step.target);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = Math.min(CARD_W, vw - MARGIN * 2);
    const ch = cardRef.current?.offsetHeight ?? 220;
    if (!el) {
      setHole(null);
      setCard({ top: Math.max(MARGIN, (vh - ch) / 2), left: (vw - cw) / 2 });
      return;
    }
    const r = el.getBoundingClientRect();
    const top = Math.max(MARGIN / 2, r.top - PAD);
    const left = Math.max(MARGIN / 2, r.left - PAD);
    const bottom = Math.min(vh - MARGIN / 2, r.bottom + PAD);
    const right = Math.min(vw - MARGIN / 2, r.right + PAD);
    const h: Rect = { top, left, width: right - left, height: bottom - top };
    setHole(h);
    // À droite si la place existe, sinon dessous, sinon au-dessus, sinon à l'intérieur en bas.
    let pos: { top: number; left: number };
    if (h.left + h.width + MARGIN + cw <= vw - MARGIN && h.width < vw * 0.5) {
      pos = { top: Math.min(Math.max(MARGIN, h.top), vh - ch - MARGIN), left: h.left + h.width + MARGIN };
    } else if (h.top + h.height + MARGIN + ch <= vh - MARGIN) {
      pos = { top: h.top + h.height + MARGIN, left: Math.min(Math.max(MARGIN, h.left), vw - cw - MARGIN) };
    } else if (h.top - MARGIN - ch >= MARGIN) {
      pos = { top: h.top - MARGIN - ch, left: Math.min(Math.max(MARGIN, h.left + h.width - cw), vw - cw - MARGIN) };
    } else {
      pos = { top: Math.max(MARGIN, h.top + h.height - ch - MARGIN * 2), left: Math.min(Math.max(MARGIN, h.left + MARGIN * 2), vw - cw - MARGIN) };
    }
    setCard(pos);
  }, [step.target]);

  useLayoutEffect(() => {
    // Mesurer la page puis placer la carte : c'est l'usage prévu de useLayoutEffect (avant que l'écran ne se peigne).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    place();
  }, [place]);

  useEffect(() => {
    nextRef.current?.focus();
    const onResize = () => place();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [place, i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEnd();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (last) onEnd();
        else setI((x) => x + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setI((x) => Math.max(0, x - 1));
      } else if (e.key === 'Tab') {
        // Le focus reste dans la carte.
        const focusables = cardRef.current?.querySelectorAll<HTMLElement>('button');
        if (!focusables?.length) return;
        const list = [...focusables];
        const idx = list.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        const next = e.shiftKey ? (idx <= 0 ? list.length - 1 : idx - 1) : idx === list.length - 1 ? 0 : idx + 1;
        list[next]?.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [last, onEnd]);

  return (
    <div className="tour-layer" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      {hole ? <div className="tour-hole" style={hole} /> : <div className="tour-hole" style={{ top: '50%', left: '50%', width: 0, height: 0 }} />}
      <div ref={cardRef} className="tour-card" style={card ?? { visibility: 'hidden' }}>
        <div className="tour-progress" aria-hidden="true">
          {STEPS.map((s, k) => (
            <span key={s.n} data-on={k <= i} />
          ))}
        </div>
        <p className="eyebrow" style={{ marginBottom: 8 }}>
          {t('tour.step', { n: i + 1, total: STEPS.length })}
        </p>
        <h2 id="tour-title" className="tour-title">
          {t(`tour.${step.n}.title` as MessageKey)}
        </h2>
        <p id="tour-body" className="tour-body">
          {t(`tour.${step.n}.body` as MessageKey)}
        </p>
        <div className="tour-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEnd}>
            {t('tour.skip')}
          </button>
          <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
            {i > 0 ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setI((x) => x - 1)}>
                {t('tour.prev')}
              </button>
            ) : null}
            <button ref={nextRef} type="button" className="btn btn-primary btn-sm" onClick={() => (last ? onEnd() : setI((x) => x + 1))}>
              {last ? t('tour.done') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
