// Les tests de l'admin tournent sous Node (`node --experimental-strip-types`), sans Next :
// ce crochet résout les alias `@/…` de tsconfig vers `src/`, et ajoute l'extension `.ts`
// qui manque aux imports relatifs (TypeScript et Turbopack s'en passent, Node non).
import { register } from 'node:module';

register('./resolver.mjs', import.meta.url);
