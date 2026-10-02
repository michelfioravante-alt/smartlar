-- =====================================================================
-- SmartLar - Migration 5: busca de cliente por telefone só com números
-- "(31) 99123-4501" vira "31991234501", para buscar por "99123" etc.
-- =====================================================================
alter table public.clientes
  add column telefone_digitos text
  generated always as (regexp_replace(telefone, '\D', '', 'g')) stored;

create index clientes_telefone_digitos_idx on public.clientes (telefone_digitos);
