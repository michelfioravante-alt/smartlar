# SmartLar — Sistema de gestão

Sistema de gestão para a SmartLar (automação residencial): clientes, catálogo,
orçamentos/pedidos, agenda dos técnicos e automações.

Teste prático — IAplicada · Dev No-Code Junior · 2026

## Stack

- **Supabase** — banco Postgres, regras de negócio (triggers/funções), autenticação e RLS
- **Frontend** — React + Vite + TypeScript
- **n8n** — automações (novo pedido, alerta diário de instalações, faturamento)
- **GitHub** — versionamento

## Estrutura

```
supabase/migrations/   alterações do banco, em ordem
supabase/seed.sql      dados de exemplo
docs/                  decisões de arquitetura e checklist do teste
```

## Banco de dados

Tabelas: `clientes`, `tecnicos`, `produtos`, `pedidos`, `itens_pedido`, `historico_status`.

Regras garantidas pelo banco:
- `itens_pedido.subtotal` = quantidade × preço (coluna calculada)
- `pedidos.valor_total` = soma dos subtotais (recalculado por trigger)
- Fluxo de status: `orcamento → aprovado → agendado → em_andamento → concluido`,
  cancelamento só a partir de `orcamento` ou `aprovado`
- Agendar exige técnico e data; concluir exige forma de pagamento
- Itens só podem ser alterados enquanto o pedido é orçamento

Detalhes e justificativas em [`docs/DEFESA-ARQUITETURA.md`](docs/DEFESA-ARQUITETURA.md).
