/**
 * Le logo officiel, toujours un fichier (charte), jamais recomposé en texte :
 * la version transparente sur la toile claire ; en sombre, le fichier
 * « plaque » posé sur une plaque blanche arrondie, parce que les lettres navy
 * disparaissent sur le navy — la même règle que l'app (apps/mobile/src/ui/Logo.tsx).
 * Le choix suit l'ambiance de l'admin (attribut data-theme), pas seulement
 * celle de l'ordinateur. Les fichiers sont servis depuis les assets de l'app.
 */
const TRANSPARENT = '/api/media/app/brand/logo-transparent-600.png';
const PLAQUE = '/api/media/app/brand/logo-plaque-750.png';

export function Logo({ width, className, variant = 'auto' }: { width: number; className?: string; variant?: 'auto' | 'plaque' }) {
  if (variant === 'plaque') {
    // eslint-disable-next-line @next/next/no-img-element -- fichier de marque servi tel quel
    return <img src={PLAQUE} alt="Boxing Center" width={width} height={Math.round((width * 400) / 750)} className={className} />;
  }
  return (
    <span className={`logo${className ? ` ${className}` : ''}`} style={{ width }} role="img" aria-label="Boxing Center">
      {/* eslint-disable-next-line @next/next/no-img-element -- fichier de marque servi tel quel */}
      <img className="logo-light" src={TRANSPARENT} alt="" width={width} height={Math.round((width * 280) / 600)} />
      <span className="logo-dark">
        {/* eslint-disable-next-line @next/next/no-img-element -- fichier de marque servi tel quel */}
        <img src={PLAQUE} alt="" width={width - 24} height={Math.round(((width - 24) * 400) / 750)} />
      </span>
    </span>
  );
}
