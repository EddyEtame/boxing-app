import path from 'node:path';

import type { NextConfig } from 'next';

/**
 * L'admin vit dans le monorepo : Turbopack doit voir la racine pour résoudre
 * les paquets partagés (@bc/brand, @bc/contract), écrits en TypeScript et
 * compilés ici. Les en-têtes de sécurité généraux sont posés ici ; la
 * politique de contenu (CSP, avec un nonce par requête) est posée par
 * src/proxy.ts.
 */
const root = path.join(__dirname, '..', '..');

const nextConfig: NextConfig = {
  transpilePackages: ['@bc/brand', '@bc/contract'],
  turbopack: { root },
  outputFileTracingRoot: root,
  // Le lecteur des fichiers de l'app (src/server/app-source.ts) charge TypeScript à l'exécution.
  serverExternalPackages: ['typescript'],
  poweredByHeader: false,
  reactStrictMode: true,
  // Le badge « N » de développement masquerait le bas des écrans ; les erreurs s'affichent toujours.
  devIndicators: false,
  // Next 16 n'écrit pas de fichier AGENTS.md dans l'admin.
  agentRules: false,
  experimental: {
    // Le serveur MCP de développement écrit .next/dev/logs à chaque requête ; Turbopack, qui
    // surveille tout le monorepo, y voyait un changement et rechargeait la page : boucle sans fin
    // (constatée le 22/10/2026, onze rechargements en quinze secondes sur /connexion).
    mcpServer: false,
  },
  // Test depuis un téléphone du réseau local (192.168.x.x:3001) pendant le développement.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
    ];
  },
};

export default nextConfig;
