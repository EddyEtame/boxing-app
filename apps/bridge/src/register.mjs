// @bc/contract importe ses fichiers sans extension : Node ne les resout pas.
// Ce chargeur branche le resolveur du paquet avant le serveur et les tests.
import { register } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const resolver = join(dirname(fileURLToPath(import.meta.url)), '../../../packages/contract/test/resolver.mjs');
register(pathToFileURL(resolver).href, import.meta.url);
