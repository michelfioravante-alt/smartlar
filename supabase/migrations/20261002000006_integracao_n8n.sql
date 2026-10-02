-- =====================================================================
-- SmartLar - Migration 6: integração com o n8n
--
-- 1) O banco avisa o n8n (webhook) quando um pedido é criado ou concluído.
-- 2) Colunas de controle registram se o aviso já foi processado. O n8n
--    tem uma rotina de recuperação que reenvia o que ficou pendente.
--
-- O endereço do n8n e o segredo do webhook ficam no Supabase Vault
-- (cofre de segredos), nunca neste arquivo:
--   n8n_base_url        ex.: https://<instancia>.app.n8n.cloud
--   n8n_webhook_secret  texto aleatório enviado no cabeçalho x-smartlar-secret
-- =====================================================================

create extension if not exists pg_net with schema extensions;

alter table public.pedidos
  add column notificado_em timestamptz,
  add column faturamento_registrado_em timestamptz;

comment on column public.pedidos.notificado_em is 'Quando o n8n registrou o aviso de novo pedido (Automação 1).';
comment on column public.pedidos.faturamento_registrado_em is 'Quando o n8n registrou o faturamento (Automação 3).';

-- Pedidos que já existiam antes da integração não geram aviso retroativo.
update public.pedidos set notificado_em = now();

-- A view passa a expor as colunas de controle (adicionadas no final).
create or replace view public.vw_pedidos
with (security_invoker = true) as
select
  p.id, p.numero, p.status, p.valor_total, p.forma_pagamento, p.data_instalacao, p.observacoes,
  p.concluido_em, p.created_at, p.updated_at,
  p.cliente_id,
  c.nome as cliente_nome, c.telefone as cliente_telefone, c.email as cliente_email,
  c.endereco as cliente_endereco, c.bairro as cliente_bairro, c.cidade as cliente_cidade,
  p.tecnico_id,
  t.nome as tecnico_nome, t.telefone as tecnico_telefone,
  (select count(*) from public.itens_pedido i where i.pedido_id = p.id) as qtd_itens,
  p.notificado_em,
  p.faturamento_registrado_em
from public.pedidos p
join public.clientes c on c.id = p.cliente_id
left join public.tecnicos t on t.id = p.tecnico_id;

-- ---------------------------------------------------------------------
-- Envia o evento para o n8n. pg_net só dispara depois do COMMIT, então
-- quando o n8n consultar o pedido os itens e o total já estão gravados.
-- Se o Vault não estiver configurado, não faz nada (não quebra o pedido).
-- ---------------------------------------------------------------------
create or replace function public.notificar_n8n()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_segredo text;
  v_evento text;
  v_caminho text;
begin
  if tg_op = 'INSERT' then
    v_evento := 'pedido_criado';
    v_caminho := '/webhook/smartlar-novo-pedido';
  elsif new.status = 'concluido' and old.status is distinct from 'concluido' then
    v_evento := 'pedido_concluido';
    v_caminho := '/webhook/smartlar-pedido-concluido';
  else
    return null;
  end if;

  select decrypted_secret into v_base from vault.decrypted_secrets where name = 'n8n_base_url';
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'n8n_webhook_secret';
  if v_base is null or v_segredo is null then
    return null;
  end if;

  perform net.http_post(
    url := rtrim(v_base, '/') || v_caminho,
    body := jsonb_build_object(
      'evento', v_evento,
      'pedido_id', new.id,
      'numero', new.numero,
      'status', new.status,
      'ocorrido_em', now()
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-smartlar-secret', v_segredo
    ),
    timeout_milliseconds := 5000
  );
  return null;
end;
$$;

revoke execute on function public.notificar_n8n() from public, anon, authenticated;

create trigger pedidos_notificar_n8n
  after insert or update of status on public.pedidos
  for each row execute function public.notificar_n8n();
