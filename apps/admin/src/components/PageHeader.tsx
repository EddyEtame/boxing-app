import type { ReactNode } from 'react';

/**
 * L'en-tête de chaque rubrique, en affiche : l'avant-titre dit le paragraphe
 * du cahier des charges, le titre est en Bebas navy (l'encre des affiches),
 * le chapeau dit à quoi sert la page en une phrase.
 */
export function PageHeader({ kicker, title, lead, actions, meta }: { kicker: ReactNode; title: string; lead?: ReactNode; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        <div className="page-kicker eyebrow">{kicker}</div>
        <h1 className="page-title">{title}</h1>
        {lead ? <p className="page-lead">{lead}</p> : null}
        {meta}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}
