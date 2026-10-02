-- =====================================================================
-- SmartLar - Migration 3: consultas prontas (views/funções) e segurança
-- =====================================================================

-- ---------------------------------------------------------------------
-- vw_pedidos: pedido + cliente + técnico numa linha só.
-- Usada pelo frontend (listas) e pelo n8n (buscar dados completos).
-- security_invoker: a view respeita o RLS de quem consulta.
-- ---------------------------------------------------------------------
create view public.vw_pedidos
with (security_invoker = true) as
select
  p.id,
  p.numero,
  p.status,
  p.valor_total,
  p.forma_pagamento,
  p.data_instalacao,
  p.observacoes,
  p.concluido_em,
  p.created_at,
  p.updated_at,
  p.cliente_id,
  c.nome      as cliente_nome,
  c.telefone  as cliente_telefone,
  c.email     as cliente_email,
  c.endereco  as cliente_endereco,
  c.bairro    as cliente_bairro,
  c.cidade    as cliente_cidade,
  p.tecnico_id,
  t.nome      as tecnico_nome,
  t.telefone  as tecnico_telefone,
  (select count(*) from public.itens_pedido i where i.pedido_id = p.id) as qtd_itens
from public.pedidos p
join public.clientes c on c.id = p.cliente_id
left join public.tecnicos t on t.id = p.tecnico_id;

-- ---------------------------------------------------------------------
-- Indicadores do dashboard (fuso de Belo Horizonte / São Paulo)
-- ---------------------------------------------------------------------
create or replace function public.dashboard_indicadores()
returns table (
  pedidos_no_mes          bigint,
  faturado_no_mes         numeric,
  a_receber               numeric,
  pendentes_agendamento   bigint,
  orcamentos_abertos      bigint
)
language sql
stable
set search_path = ''
as $$
  with limites as (
    select
      (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as inicio_mes,
      ((date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month') at time zone 'America/Sao_Paulo') as fim_mes
  )
  select
    count(*) filter (where p.created_at >= l.inicio_mes and p.created_at < l.fim_mes),
    coalesce(sum(p.valor_total) filter (
      where p.status = 'concluido' and p.concluido_em >= l.inicio_mes and p.concluido_em < l.fim_mes
    ), 0),
    coalesce(sum(p.valor_total) filter (where p.status in ('aprovado', 'agendado', 'em_andamento')), 0),
    count(*) filter (where p.status = 'aprovado'),
    count(*) filter (where p.status = 'orcamento')
  from public.pedidos p
  cross join limites l;
$$;

comment on function public.dashboard_indicadores is
  'Faturado = concluídos no mês. A receber = aprovado + agendado + em_andamento. Pendentes de agendamento = aprovados sem agenda.';

-- ---------------------------------------------------------------------
-- Instalações agendadas num dia (padrão: amanhã). Usada pela Automação 2.
-- ---------------------------------------------------------------------
create or replace function public.instalacoes_agendadas_em(
  p_dia date default ((now() at time zone 'America/Sao_Paulo')::date + 1)
)
returns table (
  pedido_numero    bigint,
  cliente_nome     text,
  cliente_telefone text,
  endereco         text,
  tecnico_nome     text,
  data_instalacao  timestamptz,
  horario          text,
  valor_total      numeric
)
language sql
stable
set search_path = ''
as $$
  select
    v.numero,
    v.cliente_nome,
    v.cliente_telefone,
    concat_ws(', ', v.cliente_endereco, v.cliente_bairro, v.cliente_cidade),
    v.tecnico_nome,
    v.data_instalacao,
    to_char(v.data_instalacao at time zone 'America/Sao_Paulo', 'HH24:MI'),
    v.valor_total
  from public.vw_pedidos v
  where v.status = 'agendado'
    and (v.data_instalacao at time zone 'America/Sao_Paulo')::date = p_dia
  order by v.data_instalacao;
$$;

-- ---------------------------------------------------------------------
-- RLS: só usuários logados acessam os dados.
-- O n8n usa a chave service_role (servidor), que ignora o RLS.
-- ---------------------------------------------------------------------
alter table public.clientes         enable row level security;
alter table public.tecnicos         enable row level security;
alter table public.produtos         enable row level security;
alter table public.pedidos          enable row level security;
alter table public.itens_pedido     enable row level security;
alter table public.historico_status enable row level security;

create policy "equipe logada acessa clientes" on public.clientes
  for all to authenticated using (true) with check (true);
create policy "equipe logada acessa tecnicos" on public.tecnicos
  for all to authenticated using (true) with check (true);
create policy "equipe logada acessa produtos" on public.produtos
  for all to authenticated using (true) with check (true);
create policy "equipe logada acessa pedidos" on public.pedidos
  for all to authenticated using (true) with check (true);
create policy "equipe logada acessa itens" on public.itens_pedido
  for all to authenticated using (true) with check (true);
create policy "equipe logada le historico" on public.historico_status
  for select to authenticated using (true);

-- Funções de negócio: só usuários logados (e o servidor) podem chamar.
revoke execute on function public.criar_pedido(uuid, jsonb, text, public.forma_pagamento) from public, anon;
revoke execute on function public.dashboard_indicadores() from public, anon;
revoke execute on function public.instalacoes_agendadas_em(date) from public, anon;
grant execute on function public.criar_pedido(uuid, jsonb, text, public.forma_pagamento) to authenticated, service_role;
grant execute on function public.dashboard_indicadores() to authenticated, service_role;
grant execute on function public.instalacoes_agendadas_em(date) to authenticated, service_role;
