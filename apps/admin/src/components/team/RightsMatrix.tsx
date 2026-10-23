'use client';

import { RoleIcon } from './TeamBits';
import { IconCheck } from '@/components/icons';
import { useT } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { capLabel, roleLabel } from '@/lib/team/labels';
import { CAPABILITIES, MATRIX } from '@/lib/permissions';
import { ROLES } from '@/lib/types';

/**
 * Les droits par profil, lus dans la table qui les applique (lib/permissions.ts) :
 * ce tableau ne peut pas mentir, il n'est pas recopié.
 */
export function RightsMatrix({ highlight }: { highlight?: string | null }) {
  const t = useT();
  return (
    <div className="tbl-wrap team-matrix-wrap">
      <table className="tbl team-matrix">
        <caption className="sr-only">{t('team.matrix.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('team.matrix.rubrique')}</th>
            {ROLES.map((r) => (
              <th key={r} scope="col" className="team-matrix-col" data-hi={highlight === r || undefined}>
                <span className="team-matrix-role">
                  <RoleIcon role={r} size={16} />
                  <span className="team-role-long">{roleLabel(t, r)}</span>
                  {/* Sur téléphone, quatre colonnes tiennent avec un nom court ; le nom entier reste dans l'abréviation. */}
                  <abbr className="team-role-short" title={roleLabel(t, r)}>
                    {t(`team.role.short.${r}` as MessageKey)}
                  </abbr>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAPABILITIES.map((cap) => (
            <tr key={cap}>
              <th scope="row">{capLabel(t, cap)}</th>
              {ROLES.map((r) => {
                const yes = MATRIX[r].includes(cap);
                return (
                  <td key={r} data-yes={yes} data-hi={highlight === r || undefined} aria-label={`${roleLabel(t, r)} · ${capLabel(t, cap)} : ${yes ? t('team.matrix.yes') : t('team.matrix.no')}`}>
                    {yes ? <IconCheck size={16} /> : <span aria-hidden="true">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
