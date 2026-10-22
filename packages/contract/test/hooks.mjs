// Node exige l'extension sur les imports relatifs ; Metro et TypeScript s'en passent.
// Ce crochet ajoute `.ts` quand il manque, pour les tests seulement.
import { register } from 'node:module';

register('./resolver.mjs', import.meta.url);
