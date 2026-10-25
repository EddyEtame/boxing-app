// Regles d'acces de la base, verifiees sur un Postgres en memoire (PGlite) :
// le schema auth de Supabase y est reduit a ce que la migration utilise.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

const here = dirname(fileURLToPath(import.meta.url));
const migrations = join(here, '..', 'migrations');

const AUTH_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`;

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

async function setup() {
  const db = new PGlite();
  await db.exec(AUTH_STUB);
  for (const f of readdirSync(migrations).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrations, f), 'utf8'));
  }
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${A}', 'A@EX.FR', '{"prenom":"Camille","nom":"Durand","telephone":"+33612345678","date_naissance":"1996-04-12"}'),
      ('${B}', 'b@ex.fr', '{"prenom":"Lea","nom":"Petit","date_naissance":"2015-01-01"}');
    insert into public.deciplus_snapshots (profile_id, abonnement_actif) values ('${A}', true), ('${B}', false);
    insert into public.link_requests (profile_id, order_id) values ('${A}', 'app-a-1');
  `);
  return db;
}

async function as(db, role, sub, sql) {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub ?? ''}', false);`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec('reset role;');
  }
}

test('le profil nait avec le compte, e-mail en minuscules, consentement parental sous 15 ans', async () => {
  const db = await setup();
  const { rows } = await db.query(`select id, email, prenom, date_naissance::text as dn, consentement_parental_requis as c, link_status from public.profiles order by email`);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => [r.email, r.c, r.link_status]),
    [
      ['a@ex.fr', false, 'en_attente'],
      ['b@ex.fr', true, 'en_attente'],
    ],
  );
});

test('un adherent ne lit que son profil et sa fiche', async () => {
  const db = await setup();
  const own = await as(db, 'authenticated', A, 'select id from public.profiles');
  assert.deepEqual(own.rows.map((r) => r.id), [A]);
  const snap = await as(db, 'authenticated', A, 'select profile_id from public.deciplus_snapshots');
  assert.deepEqual(snap.rows.map((r) => r.profile_id), [A]);
});

test('un visiteur sans compte ne lit rien', async () => {
  const db = await setup();
  const r = await as(db, 'anon', null, 'select id from public.profiles');
  assert.equal(r.rows.length, 0);
});

test('un adherent ne peut pas se donner le statut actif ni toucher la fiche', async () => {
  const db = await setup();
  await assert.rejects(as(db, 'authenticated', A, `update public.profiles set link_status = 'lie' where id = '${A}'`));
  await assert.rejects(as(db, 'authenticated', A, `update public.deciplus_snapshots set abonnement_actif = true where profile_id = '${B}'`));
  await assert.rejects(as(db, 'authenticated', A, `insert into public.staff_roles (user_id, role) values ('${A}', 'direction')`));
});

test('les demandes de rapprochement, appareils et journaux restent au serveur', async () => {
  const db = await setup();
  for (const t of ['link_requests', 'devices', 'audit_log', 'app_events']) {
    await assert.rejects(as(db, 'authenticated', A, `select * from public.${t}`), undefined, t);
  }
  const svc = await as(db, 'service_role', null, 'select order_id from public.link_requests');
  assert.equal(svc.rows.length, 1);
});

test('supprimer le compte efface profil, fiche et demandes', async () => {
  const db = await setup();
  await db.exec(`delete from auth.users where id = '${A}'`);
  for (const t of ['profiles where id', 'deciplus_snapshots where profile_id', 'link_requests where profile_id']) {
    const { rows } = await db.query(`select count(*)::int as n from public.${t} = '${A}'`);
    assert.equal(rows[0].n, 0, t);
  }
});
