import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { lienSur, routeInterne } from './liens.ts';

describe('les liens venus du serveur', () => {
  it('une adresse https passe, telle quelle', () => {
    assert.equal(lienSur('https://boutique.boxingcenter.fr/inscription?product=x&gym=portet'), 'https://boutique.boxingcenter.fr/inscription?product=x&gym=portet');
    assert.equal(lienSur('  https://exemple.fr  '), 'https://exemple.fr');
  });

  it('tout le reste est refuse', () => {
    for (const url of ['http://exemple.fr', 'tel:+33612345678', 'intent://scan/#Intent;end', 'boxingcenter://badge', 'javascript:alert(1)', 'https://membre:secret@exemple.fr/x', 'https://', '', null, undefined]) {
      assert.equal(lienSur(url), null, String(url));
    }
  });

  it('une annonce ne vise que les ecrans connus', () => {
    assert.equal(routeInterne('/planning'), '/planning');
    assert.equal(routeInterne('/evenements'), '/actualites');
    assert.equal(routeInterne('/videos'), '/entrainer');
    assert.equal(routeInterne('/fil/un-autre-fil'), null);
    assert.equal(routeInterne('/connexion?email=x'), null);
  });
});
