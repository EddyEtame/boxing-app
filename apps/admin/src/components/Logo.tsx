/**
 * Le logo officiel, toujours un fichier (charte), jamais recomposé en texte :
 * la version transparente sur la toile claire ; en sombre (et sur le rail
 * navy), l'autocollant — un fond blanc qui épouse la silhouette, parce que les
 * lettres navy disparaissent sur le navy. La même règle que l'app
 * (apps/mobile/src/ui/Logo.tsx, depuis le 23/10/2026 : la plaque blanche
 * faisait « boîte »). Le choix suit l'ambiance de l'admin (attribut
 * data-theme), pas seulement celle de l'ordinateur. Les fichiers sont servis
 * depuis les assets de l'app.
 */
const TRANSPARENT = '/api/media/app/brand/logo-transparent-600.png';
const STICKER = '/api/media/app/brand/logo-sticker-750.png';
// Liseré affiné le 24/10/2026 (app) : 750 × 358.
const STICKER_RATIO = 358 / 750;

export function Logo({ width, className, variant = 'auto' }: { width: number; className?: string; variant?: 'auto' | 'sticker' }) {
  if (variant === 'sticker') {
    // eslint-disable-next-line @next/next/no-img-element -- fichier de marque servi tel quel
    return <img src={STICKER} alt="Boxing Center" width={width} height={Math.round(width * STICKER_RATIO)} className={className} />;
  }
  return (
    <span className={`logo${className ? ` ${className}` : ''}`} style={{ width }} role="img" aria-label="Boxing Center">
      {/* eslint-disable-next-line @next/next/no-img-element -- fichier de marque servi tel quel */}
      <img className="logo-light" src={TRANSPARENT} alt="" width={width} height={Math.round((width * 280) / 600)} />
      {/* eslint-disable-next-line @next/next/no-img-element -- fichier de marque servi tel quel */}
      <img className="logo-dark" src={STICKER} alt="" width={width} height={Math.round(width * STICKER_RATIO)} />
    </span>
  );
}
