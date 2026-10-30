'use client';

import { Dialog } from '@/components/Dialog';
import { IconAlert, IconBan, IconCheck, IconClose } from '@/components/icons';
import { useNow } from '@/components/useNow';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_LABEL } from '@/lib/clubs';
import { fmtDate, relative } from '@/lib/format';
import { fieldLabel, linkTag, nameOf, reasonLabel } from '@/lib/members/labels';
import type { LinkDecision, LinkQueueItem, Member } from '@/lib/members/types';

/**
 * La fiche d'un adhérent, ouverte d'un clic dans l'annuaire ou depuis la
 * palette : ce qu'il a déclaré à l'inscription, ce que le robot a lu sur sa
 * fiche Deciplus, l'abonnement pris depuis l'app, et ses demandes de
 * rapprochement — celle qui attend se tranche d'ici.
 */
export function MemberSheet({
  member,
  queue,
  decisions,
  canDecide,
  pending,
  onClose,
  onDecide,
}: {
  member: Member | null;
  queue: LinkQueueItem[];
  decisions: LinkDecision[];
  canDecide: boolean;
  pending: boolean;
  onClose: () => void;
  onDecide: (item: LinkQueueItem, resolution: 'lie' | 'refuse') => void;
}) {
  const { t, locale } = useI18n();
  const now = useNow();
  const m = member;
  const waiting = m ? queue.filter((q) => q.member.id === m.id) : [];
  const past = m ? decisions.filter((d) => d.member.id === m.id) : [];
  const date = (ymd: string) => fmtDate(locale, ymd, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Dialog open={Boolean(m)} onClose={onClose} className="sheet" labelledBy="adh-sheet-title">
      {m ? (
        <>
          <div className="sheet-head">
            <div>
              <p className="eyebrow">{m.clubPrincipal ? CLUB_LABEL[m.clubPrincipal] : t('adh.noClub')}</p>
              <h2 id="adh-sheet-title" className="slot-title">
                {nameOf(t, m)}
              </h2>
              <div className="adh-tags">
                <span className={linkTag(m.linkStatus)}>{t(`adh.link.${m.linkStatus}` as MessageKey)}</span>
                <span className={m.statut === 'actif' ? 'tag tag-pos' : 'tag'}>{t(`adh.statut.${m.statut}` as MessageKey)}</span>
                {m.parental ? <span className="tag tag-warn">{t('adh.sheet.parental')}</span> : null}
              </div>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('btn.close')}>
              <IconClose />
            </button>
          </div>

          <div className="sheet-body stack" style={{ '--gap': '22px' } as React.CSSProperties}>
            <section>
              <h3 className="drawer-h">{t('adh.sheet.declared')}</h3>
              <dl className="facts">
                <div>
                  <dt>{t('adh.sheet.email')}</dt>
                  <dd>{m.email || '—'}</dd>
                </div>
                <div>
                  <dt>{t('adh.sheet.phone')}</dt>
                  <dd>{m.telephone || '—'}</dd>
                </div>
                <div>
                  <dt>{t('adh.sheet.birth')}</dt>
                  <dd>{m.dateNaissance ? date(m.dateNaissance) : '—'}</dd>
                </div>
                <div>
                  <dt>{t('adh.sheet.created')}</dt>
                  <dd>{relative(t, locale, m.createdAt, now)}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="drawer-h">{t('adh.sheet.fiche')}</h3>
              {m.snapshot || m.deciplusMemberId ? (
                <dl className="facts">
                  <div>
                    <dt>{t('adh.sheet.memberId')}</dt>
                    <dd>{m.deciplusMemberId ? <code>{m.deciplusMemberId}</code> : '—'}</dd>
                  </div>
                  {m.snapshot ? (
                    <>
                      <div>
                        <dt>{t('adh.sheet.abo')}</dt>
                        <dd>{m.snapshot.abonnementActif ? t('adh.yes') : m.snapshot.abonnementEnAttente ? t('adh.sheet.aboWait') : t('adh.no')}</dd>
                      </div>
                      <div>
                        <dt>{t('adh.sheet.badge')}</dt>
                        <dd>{m.snapshot.badgeEnregistre ? t('adh.yes') : t('adh.no')}</dd>
                      </div>
                      <div>
                        <dt>{t('adh.sheet.contrats')}</dt>
                        <dd>{m.snapshot.contrats.length ? m.snapshot.contrats.join(' · ') : '—'}</dd>
                      </div>
                      <div>
                        <dt>{t('adh.sheet.club')}</dt>
                        <dd>{m.snapshot.club ? CLUB_LABEL[m.snapshot.club] : '—'}</dd>
                      </div>
                    </>
                  ) : null}
                </dl>
              ) : (
                <p className="muted">{t('adh.sheet.noFiche')}</p>
              )}
              {m.snapshot ? <p className="field-help">{t('adh.sheet.readAt', { when: relative(t, locale, m.snapshot.readAt, now) })}</p> : null}
            </section>

            {m.subscription ? (
              <section>
                <h3 className="drawer-h">{t('adh.sheet.sub')}</h3>
                <dl className="facts">
                  <div>
                    <dt>{t('adh.c.sub')}</dt>
                    <dd>
                      {t(`adh.sub.${m.subscription.status}` as MessageKey)}
                      {m.subscription.planLabel ? ` · ${m.subscription.planLabel}` : ''}
                    </dd>
                  </div>
                  {m.subscription.nextChargeDate ? (
                    <div>
                      <dt>{t('adh.sheet.next', { date: date(m.subscription.nextChargeDate) })}</dt>
                      <dd />
                    </div>
                  ) : null}
                  {m.subscription.currentPeriodEnd ? (
                    <div>
                      <dt>{t('adh.sheet.until', { date: date(m.subscription.currentPeriodEnd) })}</dt>
                      <dd />
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}

            <section>
              <h3 className="drawer-h">{t('adh.sheet.history')}</h3>
              {!waiting.length && !past.length ? <p className="muted">{t('adh.sheet.history.none')}</p> : null}
              <ol className="adh-history">
                {waiting.map((q) => (
                  <li key={q.id} data-pending>
                    <span className="tag tag-warn">{t('adh.sheet.pending')}</span>
                    <span className="adh-history-text">
                      {q.deciplusMemberId ? t('adh.queue.found', { id: q.deciplusMemberId }) : t('adh.queue.notFound')}
                      {q.mismatchFields.length ? ` · ${t('adh.queue.mismatch', { fields: q.mismatchFields.map((f) => fieldLabel(t, f)).join(', ') })}` : ''}
                      {q.reason ? ` · ${reasonLabel(t, q.reason)}` : ''}
                    </span>
                    <span className="row-sub">{relative(t, locale, q.createdAt, now)}</span>
                    {canDecide ? (
                      <span className="adh-history-actions">
                        {q.deciplusMemberId ? (
                          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => onDecide(q, 'lie')}>
                            <IconCheck size={15} />
                            {t('adh.confirm.go.link')}
                          </button>
                        ) : (
                          <span className="small dim">
                            <IconAlert size={14} /> {t('adh.err.identifiant_manquant')}
                          </span>
                        )}
                        <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => onDecide(q, 'refuse')}>
                          <IconBan size={15} />
                          {t('adh.queue.refuse')}
                        </button>
                      </span>
                    ) : null}
                  </li>
                ))}
                {past.map((d) => (
                  <li key={d.id}>
                    <span className={d.resolution === 'lie' ? 'tag tag-pos' : 'tag'}>{t(`adh.decision.${d.resolution}` as MessageKey)}</span>
                    <span className="adh-history-text">
                      {d.deciplusMemberId ? `n° ${d.deciplusMemberId}` : '—'}
                      {d.resolvedBy ? ` · ${t('adh.decision.by', { who: d.resolvedBy })}` : ''}
                    </span>
                    <span className="row-sub">{d.resolvedAt ? relative(t, locale, d.resolvedAt, now) : ''}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}
