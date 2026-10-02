-- =====================================================================
-- SmartLar - Migration 2: regras de negócio
-- As regras críticas (cálculo de valores e fluxo de status) ficam no
-- banco. Assim valem para qualquer origem: frontend, n8n ou painel.
-- =====================================================================

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.set_updated_at();
create trigger produtos_updated_at before update on public.produtos
  for each row execute function public.set_updated_at();
create trigger pedidos_updated_at before update on public.pedidos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Fluxo de status
--   orcamento -> aprovado -> agendado -> em_andamento -> concluido
--   orcamento -> cancelado
--   aprovado  -> cancelado
-- ---------------------------------------------------------------------
create or replace function public.transicoes_permitidas(p_status public.status_pedido)
returns public.status_pedido[]
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'orcamento'    then array['aprovado', 'cancelado']::public.status_pedido[]
    when 'aprovado'     then array['agendado', 'cancelado']::public.status_pedido[]
    when 'agendado'     then array['em_andamento']::public.status_pedido[]
    when 'em_andamento' then array['concluido']::public.status_pedido[]
    else array[]::public.status_pedido[]
  end;
$$;

comment on function public.transicoes_permitidas is 'Para cada status, lista os próximos status válidos. Fonte única da regra de fluxo.';

-- ---------------------------------------------------------------------
-- pedidos: regras ao criar
-- ---------------------------------------------------------------------
create or replace function public.pedidos_antes_de_inserir()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Todo pedido nasce como orçamento e com total zero (os itens somam depois).
  new.status := 'orcamento';
  new.valor_total := 0;
  new.concluido_em := null;
  return new;
end;
$$;

create trigger pedidos_antes_de_inserir before insert on public.pedidos
  for each row execute function public.pedidos_antes_de_inserir();

-- ---------------------------------------------------------------------
-- pedidos: regras ao atualizar
-- ---------------------------------------------------------------------
create or replace function public.pedidos_antes_de_atualizar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if not (new.status = any (public.transicoes_permitidas(old.status))) then
      raise exception 'Mudança de status inválida: de "%" para "%".', old.status, new.status
        using errcode = 'P0001',
              hint = 'Fluxo: orcamento > aprovado > agendado > em_andamento > concluido. Cancelar só a partir de orcamento ou aprovado.';
    end if;

    if new.status = 'agendado' and (new.tecnico_id is null or new.data_instalacao is null) then
      raise exception 'Para agendar, selecione o técnico e a data de instalação.'
        using errcode = 'P0001';
    end if;

    if new.status = 'concluido' then
      if new.forma_pagamento is null then
        raise exception 'Para concluir, informe a forma de pagamento.'
          using errcode = 'P0001';
      end if;
      new.concluido_em := now();
    end if;
  end if;

  -- O total é sempre recalculado a partir dos itens. Ninguém edita na mão.
  new.valor_total := coalesce(
    (select sum(i.subtotal) from public.itens_pedido i where i.pedido_id = new.id),
    0
  );

  return new;
end;
$$;

create trigger pedidos_antes_de_atualizar before update on public.pedidos
  for each row execute function public.pedidos_antes_de_atualizar();

-- ---------------------------------------------------------------------
-- pedidos: histórico de status (bônus)
-- ---------------------------------------------------------------------
create or replace function public.pedidos_registrar_historico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.historico_status (pedido_id, status_anterior, status_novo, alterado_por)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.historico_status (pedido_id, status_anterior, status_novo, alterado_por)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return null;
end;
$$;

create trigger pedidos_registrar_historico after insert or update of status on public.pedidos
  for each row execute function public.pedidos_registrar_historico();

-- ---------------------------------------------------------------------
-- itens_pedido: preço congelado + itens só editáveis no orçamento
-- ---------------------------------------------------------------------
create or replace function public.itens_pedido_antes_de_gravar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_pedido_id uuid := coalesce(new.pedido_id, old.pedido_id);
  v_status public.status_pedido;
begin
  select p.status into v_status from public.pedidos p where p.id = v_pedido_id;

  -- Pedido não encontrado = está sendo excluído em cascata; deixa passar.
  if v_status is not null and v_status <> 'orcamento' then
    raise exception 'Os itens só podem ser alterados enquanto o pedido está em orçamento.'
      using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  -- Se o preço não veio, usa o preço atual do catálogo.
  if new.preco_unitario is null then
    select pr.preco_unitario into new.preco_unitario
    from public.produtos pr where pr.id = new.produto_id;
  end if;

  return new;
end;
$$;

create trigger itens_pedido_antes_de_gravar before insert or update or delete on public.itens_pedido
  for each row execute function public.itens_pedido_antes_de_gravar();

-- ---------------------------------------------------------------------
-- itens_pedido: recalcula o total do pedido a cada mudança
-- ---------------------------------------------------------------------
create or replace function public.itens_pedido_recalcular_total()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- O trigger de update em pedidos recalcula valor_total a partir dos itens.
  update public.pedidos
     set valor_total = valor_total
   where id = coalesce(new.pedido_id, old.pedido_id);
  return null;
end;
$$;

create trigger itens_pedido_recalcular_total after insert or update or delete on public.itens_pedido
  for each row execute function public.itens_pedido_recalcular_total();

-- ---------------------------------------------------------------------
-- criar_pedido: cria o pedido e seus itens numa única transação
-- (ou grava tudo, ou não grava nada)
-- p_itens: [{"produto_id": "...", "quantidade": 2}, ...]
-- ---------------------------------------------------------------------
create or replace function public.criar_pedido(
  p_cliente_id uuid,
  p_itens jsonb,
  p_observacoes text default null,
  p_forma_pagamento public.forma_pagamento default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_pedido_id uuid;
  v_item jsonb;
begin
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'O pedido precisa ter pelo menos um produto.' using errcode = 'P0001';
  end if;

  insert into public.pedidos (cliente_id, observacoes, forma_pagamento)
  values (p_cliente_id, nullif(trim(p_observacoes), ''), p_forma_pagamento)
  returning id into v_pedido_id;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    if coalesce((v_item->>'quantidade')::int, 0) <= 0 then
      raise exception 'Quantidade inválida para um dos produtos.' using errcode = 'P0001';
    end if;

    insert into public.itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
    select v_pedido_id, pr.id, (v_item->>'quantidade')::int, pr.preco_unitario
    from public.produtos pr
    where pr.id = (v_item->>'produto_id')::uuid and pr.ativo;

    if not found then
      raise exception 'Produto não encontrado ou inativo.' using errcode = 'P0001';
    end if;
  end loop;

  return v_pedido_id;
end;
$$;

comment on function public.criar_pedido is 'Cria pedido (status orcamento) + itens de forma atômica. O total é calculado pelos triggers.';
