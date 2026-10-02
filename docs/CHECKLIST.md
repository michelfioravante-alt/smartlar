# Checklist do teste — o que o documento pede

Legenda: [x] feito · [ ] pendente · (B) = bônus

## 3.1 Banco de dados (Supabase)
- [x] Projeto gratuito no Supabase (`smartlar`, região São Paulo)
- [x] Tabela `clientes` (telefone obrigatório, endereço de instalação)
- [x] Tabela `tecnicos` com Lucas (câmeras e sensores) e Pedro (fechaduras e iluminação)
- [x] Tabela `produtos` com 6+ produtos em 3+ categorias (11 produtos, 4 categorias)
- [x] Tabela `pedidos` com status e fluxo controlado
- [x] Tabela `itens_pedido` (vários produtos por pedido, total = soma dos subtotais)
- [x] Fluxo de status travado no banco (não volta, não pula)
- [x] Foreign keys corretas e tipos adequados (dinheiro em `numeric`, datas com fuso)
- [x] (B) RLS configurado
- [x] (B) Tabela `historico_status`

## 3.2 Frontend
- [x] Repositório público no GitHub
- [x] Tela 1 — Dashboard (4 indicadores + próximas instalações 7 dias + orçamentos aguardando)
- [x] Tela 2 — Clientes (cadastro, lista, busca por nome/telefone, ver pedidos do cliente)
- [x] Tela 3 — Produtos (por categoria, cadastrar, editar preço)
- [x] Tela 4 — Novo pedido (cliente existente ou novo, vários itens, subtotal e total ao vivo, observações, salva como orçamento)
- [x] Tela 5 — Gestão de pedidos (filtro por status, detalhes, avançar status, agendar exige técnico + data)
- [x] Tela 6 — Agenda dos técnicos (por técnico, marcar em andamento / concluído)
- [x] (B) Login com Supabase Auth
- [ ] Cadastro público desligado no Supabase (Authentication > Sign In / Providers)
- [ ] Conferência visual das telas no navegador
- [ ] (B) Deploy público (Vercel)

## 3.3 Automações (n8n)
- [ ] Automação 1 — Novo pedido → destino externo (cliente, valor total, data)
- [ ] Automação 2 — Cron diário → instalações de amanhã → resumo (cliente, endereço, técnico, horário)
- [ ] Tratamento de erro (falha no trigger, dia sem instalações)
- [ ] Rodando em produção (workflows ativos, não só "test")
- [ ] (B) Automação 3 — Pedido concluído → registro de faturamento

## 4. Regras importantes
- [x] 5+ clientes (6), 6+ produtos em 3 categorias (11 em 4), 8+ pedidos em vários status (11)
- [x] Cálculo: 2x Câmera (R$ 450) + 1x Sensor (R$ 180) = R$ 1.080 (pedido #1001)
- [x] Orçamento não pula para concluído (testado: banco recusa)
- [x] Front ↔ banco conectados nos dois sentidos (teste automatizado: 31/31 OK)
- [ ] Automações disparando com dados reais do banco

## 5. Entregáveis
- [ ] Link do projeto funcionando
- [ ] Prints do Supabase (tabelas, relações, dados)
- [ ] Prints dos workflows n8n + logs de execução
- [ ] Explicação das decisões técnicas
- [ ] Onde usou IA e para quê
- [ ] Link do repositório GitHub (público, com histórico de commits)

## Antes de entregar
- [ ] Teste ponta a ponta: cliente novo → pedido com 3 produtos → avançar até concluído → conferir dashboard e automações
- [ ] Atualizar as datas dos pedidos de exemplo para ficarem próximas do dia da avaliação
