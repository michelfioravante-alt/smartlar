-- =====================================================================
-- SmartLar - Migration 1: estrutura das tabelas
-- =====================================================================

-- Tipos enumerados: limitam os valores possíveis direto no banco.
create type public.status_pedido as enum (
  'orcamento',
  'aprovado',
  'agendado',
  'em_andamento',
  'concluido',
  'cancelado'
);

create type public.forma_pagamento as enum (
  'pix',
  'cartao_credito',
  'cartao_debito',
  'dinheiro',
  'boleto',
  'transferencia'
);

create type public.categoria_produto as enum (
  'seguranca',
  'iluminacao',
  'automacao',
  'assistentes_voz'
);

-- ---------------------------------------------------------------------
-- clientes
-- ---------------------------------------------------------------------
create table public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (length(trim(nome)) > 0),
  telefone    text not null check (length(regexp_replace(telefone, '\D', '', 'g')) between 10 and 13),
  email       text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  endereco    text not null check (length(trim(endereco)) > 0),
  bairro      text,
  cidade      text not null default 'Belo Horizonte',
  observacoes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on column public.clientes.telefone is 'WhatsApp do cliente (obrigatório).';
comment on column public.clientes.endereco is 'Endereço onde será feita a instalação.';

create index clientes_nome_idx on public.clientes (lower(nome));
create index clientes_telefone_idx on public.clientes (telefone);

-- ---------------------------------------------------------------------
-- tecnicos
-- ---------------------------------------------------------------------
create table public.tecnicos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (length(trim(nome)) > 0),
  telefone      text not null,
  email         text,
  especialidade text not null,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- produtos
-- ---------------------------------------------------------------------
create table public.produtos (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null check (length(trim(nome)) > 0),
  categoria      public.categoria_produto not null,
  preco_unitario numeric(10,2) not null check (preco_unitario >= 0),
  descricao      text,
  ativo          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index produtos_categoria_idx on public.produtos (categoria);

-- ---------------------------------------------------------------------
-- pedidos
-- ---------------------------------------------------------------------
create table public.pedidos (
  id               uuid primary key default gen_random_uuid(),
  numero           bigint generated always as identity (start with 1001) unique,
  cliente_id       uuid not null references public.clientes (id) on delete restrict,
  tecnico_id       uuid references public.tecnicos (id) on delete restrict,
  status           public.status_pedido not null default 'orcamento',
  data_instalacao  timestamptz,
  valor_total      numeric(12,2) not null default 0 check (valor_total >= 0),
  forma_pagamento  public.forma_pagamento,
  observacoes      text,
  concluido_em     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- A partir de "agendado", o pedido precisa ter técnico e data.
  constraint pedidos_agendamento_completo check (
    status not in ('agendado', 'em_andamento', 'concluido')
    or (tecnico_id is not null and data_instalacao is not null)
  )
);

comment on column public.pedidos.numero is 'Número amigável do pedido (#1001, #1002...) para o Rafael e os clientes.';
comment on column public.pedidos.valor_total is 'Soma dos subtotais de itens_pedido. Calculado pelo banco, nunca pelo frontend.';

create index pedidos_status_idx on public.pedidos (status);
create index pedidos_cliente_idx on public.pedidos (cliente_id);
create index pedidos_tecnico_data_idx on public.pedidos (tecnico_id, data_instalacao);
create index pedidos_data_instalacao_idx on public.pedidos (data_instalacao);

-- ---------------------------------------------------------------------
-- itens_pedido
-- ---------------------------------------------------------------------
create table public.itens_pedido (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references public.pedidos (id) on delete cascade,
  produto_id     uuid not null references public.produtos (id) on delete restrict,
  quantidade     integer not null check (quantidade > 0),
  preco_unitario numeric(10,2) not null check (preco_unitario >= 0),
  subtotal       numeric(12,2) generated always as (quantidade * preco_unitario) stored,
  created_at     timestamptz not null default now()
);

comment on column public.itens_pedido.preco_unitario is 'Preço "congelado" no momento do pedido. Se o catálogo mudar, o pedido antigo não muda.';
comment on column public.itens_pedido.subtotal is 'quantidade x preco_unitario, calculado automaticamente pelo banco.';

create index itens_pedido_pedido_idx on public.itens_pedido (pedido_id);
create index itens_pedido_produto_idx on public.itens_pedido (produto_id);

-- ---------------------------------------------------------------------
-- historico_status (bônus)
-- ---------------------------------------------------------------------
create table public.historico_status (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references public.pedidos (id) on delete cascade,
  status_anterior public.status_pedido,
  status_novo     public.status_pedido not null,
  alterado_por    uuid references auth.users (id) on delete set null,
  alterado_em     timestamptz not null default now()
);

create index historico_status_pedido_idx on public.historico_status (pedido_id, alterado_em);
