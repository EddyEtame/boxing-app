import type { ReactNode } from 'react';

/**
 * L'état vide d'une rubrique : jamais une page blanche. Il dit ce que la
 * rubrique contient (la définition, en mono), pourquoi elle est vide, et
 * propose de commencer — un bouton, ou des modèles prêts à remplir.
 */
export function Empty({ def, title, text, children }: { def?: ReactNode; title: string; text?: ReactNode; children?: ReactNode }) {
  return (
    <section className="panel empty reveal">
      {def ? <p className="empty-def">{def}</p> : null}
      <h2 className="empty-title">{title}</h2>
      {text ? <p className="empty-text">{text}</p> : null}
      {children}
    </section>
  );
}
