'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';

import { toggleFeature } from './actions';
import { Dialog } from '@/components/Dialog';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/components/Toast';
import { useNow } from '@/components/useNow';
import { IconAlert, IconCheck, IconInfo, IconPlug, IconToggle } from '@/components/icons';
import { Switch } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { relative } from '@/lib/format';
import { FEATURE_GROUPS, FEATURE_META, type FeatureMeta } from '@/lib/team/features';
import type { FeatureKey, FeatureState } from '@/lib/types';

/**
 * Les interrupteurs de l'app. Chaque ligne dit ce que l'adhérent perd quand on
 * coupe, qui a changé quoi et quand, et si l'admin applique déjà la coupure
 * lui-même ou si c'est à l'app de lire l'interrupteur.
 */
export function FeaturesView({ state: initial }: { state: FeatureState }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const now = useNow(60_000);
  const [pending, startTransition] = useTransition();
  // L'interrupteur bouge tout de suite ; la page rafraîchie fait foi ensuite (une autre personne a pu changer le sien).
  const [state, setOptimistic] = useOptimistic(initial, (s: FeatureState, p: { key: FeatureKey; on: boolean }) => ({ ...s, [p.key]: { ...s[p.key], on: p.on } }));
  const [ask, setAsk] = useState<FeatureKey | null>(null);

  const name = (k: FeatureKey) => t(`team.feat.${k}.title` as MessageKey);
  const effective = (k: FeatureKey) => state[k].on && (!FEATURE_META[k].parent || state[FEATURE_META[k].parent!].on);
  const onCount = FEATURE_GROUPS.flatMap((g) => g.items).filter((i) => effective(i.key)).length;
  const total = FEATURE_GROUPS.flatMap((g) => g.items).length;

  const apply = (key: FeatureKey, on: boolean, undoing = false) =>
    startTransition(async () => {
      setOptimistic({ key, on });
      const res = await toggleFeature(key, on);
      if (!res.ok) {
        toast({ text: t(`err.${res.error}` as MessageKey), kind: 'err' });
        return;
      }
      if (!undoing && res.data.changed) {
        toast({
          text: on ? t('team.feat.toast.on', { name: name(key) }) : t('team.feat.toast.off', { name: name(key) }),
          undo: () => apply(key, res.data.previous, true),
        });
      }
      router.refresh();
    });

  const flip = (meta: FeatureMeta) => {
    const next = !state[meta.key].on;
    if (!next && meta.heavy) setAsk(meta.key);
    else apply(meta.key, next);
  };

  return (
    <>
      <PageHeader
        kicker={t('team.feat.kicker')}
        title={t('nav.fonctions')}
        lead={t('team.feat.lead')}
        meta={
          <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
            <span className={`tag ${onCount === total ? 'tag-pos' : 'tag-warn'}`}>{t('team.feat.count', { n: onCount, total })}</span>
          </div>
        }
      />

      <div className="stack" style={{ '--gap': '22px' } as React.CSSProperties}>
        <div className="callout" role="note">
          <IconPlug />
          <span>
            <span className="callout-title">{t('team.feat.how.title')}. </span>
            {t('team.feat.how.body')}
          </span>
        </div>

        {FEATURE_GROUPS.map((g) => (
          <section key={g.id} className="panel" aria-labelledby={`feat-${g.id}`}>
            <div className="panel-head">
              <div>
                <h2 id={`feat-${g.id}`} className="panel-title">
                  {t(`team.feat.group.${g.id}` as MessageKey)}
                </h2>
                <p className="panel-sub">{t(`team.feat.group.${g.id}.sub` as MessageKey)}</p>
              </div>
              <span className="tag mono">CDC {g.cdc}</span>
            </div>
            <ul className="team-features">
              {g.items.map((meta) => {
                const s = state[meta.key];
                const parentOff = meta.parent ? !state[meta.parent].on : false;
                const on = s.on && !parentOff;
                return (
                  <li key={meta.key} className="team-feature" data-child={meta.parent ? true : undefined} data-off={!on || undefined}>
                    <div className="team-feature-text">
                      <p className="team-feature-name">
                        {name(meta.key)}
                        {meta.heavy ? <span className="tag tag-warn">{t('team.feat.heavy')}</span> : null}
                      </p>
                      <p className="small muted">{on ? t(`team.feat.${meta.key}.on` as MessageKey) : t(`team.feat.${meta.key}.off` as MessageKey)}</p>
                      <p className="small dim team-feature-meta">
                        {parentOff ? (
                          <span className="team-feature-flag">
                            <IconInfo size={14} />
                            {t('team.feat.parentOff', { name: name(meta.parent!) })}
                          </span>
                        ) : null}
                        <span className="team-feature-flag" data-kind={meta.enforcedBy}>
                          {meta.enforcedBy === 'admin' ? <IconCheck size={14} /> : <IconAlert size={14} />}
                          {meta.enforcedBy === 'admin' ? t('team.feat.enforced.admin') : t('team.feat.enforced.app')}
                        </span>
                        <span>{s.updatedAt ? t('team.feat.changed', { who: s.updatedBy ?? '—', when: relative(t, locale, s.updatedAt, now) }) : t('team.feat.origin')}</span>
                      </p>
                    </div>
                    <div className="team-feature-switch">
                      <span className="small strong" aria-hidden="true">
                        {s.on ? t('state.on') : t('state.off')}
                      </span>
                      <Switch id={`feat-${meta.key}`} checked={s.on} onChange={() => flip(meta)} label={`${name(meta.key)} : ${s.on ? t('state.on') : t('state.off')}`} disabled={pending || parentOff} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <Dialog open={ask !== null} onClose={() => setAsk(null)} className="modal" labelledBy="feat-confirm-title">
        {ask ? (
          <>
            <div className="modal-head">
              <h2 id="feat-confirm-title" className="modal-title">
                <IconToggle size={20} style={{ display: 'inline', verticalAlign: '-4px', marginRight: 8 }} />
                {t('team.feat.confirm.title', { name: name(ask) })}
              </h2>
            </div>
            <div className="modal-body stack" style={{ '--gap': '12px' } as React.CSSProperties}>
              <p>{t(`team.feat.${ask}.off` as MessageKey)}</p>
              <p className="small">{t(`team.feat.${ask}.why` as MessageKey)}</p>
              <p className="small dim">{t('team.feat.confirm.undo')}</p>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setAsk(null)}>
                {t('btn.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  const key = ask;
                  setAsk(null);
                  apply(key, false);
                }}
              >
                {t('team.feat.confirm.cut')}
              </button>
            </div>
          </>
        ) : null}
      </Dialog>
    </>
  );
}
