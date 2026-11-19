-- Avis de rapprochement Deciplus (abonnement retrouve ou introuvable).

alter table public.member_notices drop constraint if exists member_notices_kind_check;

alter table public.member_notices add constraint member_notices_kind_check
  check (kind in (
    'prelevement_retry',
    'prelevement_resilie',
    'lien_trouve',
    'lien_introuvable',
    'lien_revue'
  ));
