'use client';

import { IconBelt, IconInbox, IconNews, IconShieldCheck } from '@/components/icons';
import { useT } from '@/i18n/client';
import { initials, roleLabel } from '@/lib/team/labels';
import type { Role } from '@/lib/types';

/**
 * Les petites pièces de l'équipe, partagées par les comptes, l'assistant et
 * le journal : l'étiquette de profil, l'avatar, et la bulle qui montre ce que
 * l'adhérent lit sous un message de l'équipe (CDC §10).
 */
const ROLE_ICON: Record<Role, typeof IconShieldCheck> = {
  direction: IconShieldCheck,
  communication: IconNews,
  administratif: IconInbox,
  coach: IconBelt,
};

export function RoleIcon({ role, size = 18 }: { role: Role; size?: number }) {
  const Icon = ROLE_ICON[role];
  return <Icon size={size} />;
}

export function RoleTag({ role }: { role: Role }) {
  const t = useT();
  return (
    <span className="tag team-role" data-role={role}>
      <RoleIcon role={role} size={14} />
      {roleLabel(t, role)}
    </span>
  );
}

export function Avatar({ name, shop, size = 36 }: { name: string; shop?: boolean; size?: number }) {
  return (
    <span className="avatar team-avatar" data-shop={shop || undefined} style={{ '--size': `${size}px` } as React.CSSProperties} aria-hidden="true">
      {shop ? 'BC' : initials(name)}
    </span>
  );
}

/** Une notification de l'app, telle que l'adhérent la reçoit d'un membre de l'équipe. */
export function SignatureBubble({ signature, text }: { signature: string; text?: string }) {
  const t = useT();
  return (
    <figure className="team-bubble" aria-label={t('team.bubble.aria')}>
      <div className="team-bubble-head">
        <span className="team-bubble-app" aria-hidden="true">
          BC
        </span>
        <span>{t('team.bubble.app')}</span>
        <span className="team-bubble-when">{t('team.bubble.when')}</span>
      </div>
      <p className="team-bubble-title">{t('team.bubble.title')}</p>
      <p className="team-bubble-text">{text ?? t('team.bubble.sample')}</p>
      <figcaption className="team-bubble-sign">— {signature.trim() || t('team.bubble.noSign')}</figcaption>
    </figure>
  );
}
