import assert from 'node:assert/strict';
import { test } from 'node:test';

import { verifyBridgeSignature } from '../../bridge/src/signature';
import { BRIDGE_HEADERS, bridgeErrorOf, signedHeaders } from '../src/lib/bridge/sign';

// La signature que l'admin pose doit être celle que le serveur applicatif vérifie : même code, pas une copie.
test('le serveur applicatif accepte la signature de l’admin', () => {
  const body = JSON.stringify({ link_request_id: 'r1', resolution: 'lie', actor: 'acc_1' });
  const now = Date.UTC(2026, 9, 30, 9, 0, 0);
  const headers = signedHeaders('secret-de-test', body, now);
  assert.equal(headers['content-type'], 'application/json');
  assert.equal(
    verifyBridgeSignature({ secret: 'secret-de-test', timestamp: headers[BRIDGE_HEADERS.timestamp]!, signature: headers[BRIDGE_HEADERS.signature]!, rawBody: body, nowSec: Math.floor(now / 1000) + 60 }),
    true,
  );
  assert.equal(verifyBridgeSignature({ secret: 'autre-secret', timestamp: headers[BRIDGE_HEADERS.timestamp]!, signature: headers[BRIDGE_HEADERS.signature]!, rawBody: body, nowSec: Math.floor(now / 1000) }), false);
  assert.equal(verifyBridgeSignature({ secret: 'secret-de-test', timestamp: headers[BRIDGE_HEADERS.timestamp]!, signature: headers[BRIDGE_HEADERS.signature]!, rawBody: body, nowSec: Math.floor(now / 1000) + 600 }), false, 'dix minutes plus tard, trop vieux');
});

test('les codes du serveur se lisent, et un code inconnu retombe sur « pont »', () => {
  assert.equal(bridgeErrorOf(409, { error: 'fiche_deja_liee' }), 'fiche_deja_liee');
  assert.equal(bridgeErrorOf(401, 'pas du JSON'), 'signature_invalide');
  assert.equal(bridgeErrorOf(404, {}), 'demande_inconnue');
  assert.equal(bridgeErrorOf(503, null), 'robot_indisponible');
  assert.equal(bridgeErrorOf(500, { error: 'boom' }), 'pont');
});
