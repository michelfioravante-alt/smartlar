# SmartLar — Guia de defesa da arquitetura

> Documento de estudo para a entrevista. Escrito em linguagem simples.
> Atualizado a cada etapa do projeto.

---

## 1. A ideia em uma frase

**O banco de dados é o guardião das regras.** O frontend é a "cara" do sistema
e o n8n é o "mensageiro", mas quem garante que o valor do pedido está certo e
que o status segue o fluxo é o próprio Supabase. Assim, não importa de onde
venha a alteração (tela, n8n ou alguém mexendo direto no painel), a regra vale.

## 2. Visão geral (as 3 peças)

```
 [Frontend React]  --lê/grava-->  [Supabase: banco + regras + login]
                                         |
                                         | avisa quando algo acontece (webhook)
                                         v
                                    [n8n: automações]  --> Google Sheets / e-mail
                                         ^
                                         | todo dia às 18h consulta o banco
```

| Peça | Papel | Analogia |
|---|---|---|
| Supabase | Guarda os dados e aplica as regras de negócio | O cofre com um segurança na porta |
| Frontend | Telas que o Rafael e os técnicos usam | O balcão de atendimento |
| n8n | Avisos e relatórios automáticos | O office-boy que leva recados |

---

## 3. Banco de dados

### 3.1 As tabelas e como se ligam

```
clientes 1 ──── N pedidos N ──── 1 tecnicos
                    │
                    1
                    │
                    N
              itens_pedido N ──── 1 produtos

pedidos 1 ──── N historico_status
```

Leitura: **um** cliente pode ter **vários** pedidos; **um** pedido tem
**vários** itens; cada item aponta para **um** produto.

Essas ligações são as **foreign keys** (chaves estrangeiras): o banco não
deixa criar um pedido para um cliente que não existe, nem apagar um cliente que
já tem pedidos (`on delete restrict`). Se um pedido for apagado, os itens dele
vão junto (`on delete cascade`), porque item sem pedido não faz sentido.

### 3.2 Por que `itens_pedido` é uma tabela separada?

Porque um pedido pode ter vários produtos, e um produto aparece em vários
pedidos. Isso é uma relação "muitos para muitos", e a forma correta de
representar é uma tabela no meio, que guarda também **quantidade** e **preço**.

### 3.3 Campos que adicionei além do mínimo (e por quê)

| Campo | Tabela | Por quê |
|---|---|---|
| `numero` (1001, 1002…) | pedidos | O Rafael fala "pedido 1005" com o cliente. Ninguém dita um UUID. |
| `concluido_em` | pedidos | Saber **quando** foi faturado, para o dashboard do mês. |
| `updated_at` | clientes, produtos, pedidos | Saber quando algo foi alterado pela última vez. |
| `bairro`, `cidade` | clientes | Ajuda o técnico a planejar o trajeto. |
| `observacoes` | clientes | Ex.: "avisar portaria antes". |
| `ativo` | produtos, tecnicos | Tirar um produto do catálogo sem apagar pedidos antigos que o usam. |
| `email` | tecnicos | Futuro envio da agenda. |
| `preco_unitario` | itens_pedido | **Preço congelado** (ver 3.5). |

### 3.4 Tipos de dados (decisões que mostram cuidado)

- **Dinheiro em `numeric(10,2)`**, não em `float`. O `float` faz contas
  aproximadas (0,1 + 0,2 vira 0,30000000004). Com dinheiro isso é inaceitável.
- **Datas em `timestamptz`** (data + hora + fuso). O horário da instalação
  importa e o servidor pode estar em outro fuso. Todas as consultas convertem
  para `America/Sao_Paulo`.
- **Status, categoria e forma de pagamento como `enum`**: lista fechada de
  valores. O banco recusa "concluído" com acento ou "aprovadoo" digitado errado.
- **IDs em `uuid`**: identificadores únicos e difíceis de adivinhar, padrão do
  Supabase.

### 3.5 Preço congelado

Quando um item entra no pedido, o preço do catálogo é **copiado** para o item.
Se amanhã o Rafael aumentar a câmera de R$ 450 para R$ 500, o orçamento que ele
já mandou continua R$ 450. Isso é o que acontece num comércio de verdade.

### 3.6 Validações básicas no banco

- Nome, telefone e endereço do cliente são obrigatórios.
- Telefone precisa ter de 10 a 13 dígitos (com DDD).
- E-mail, se preenchido, precisa ter formato válido.
- Quantidade sempre maior que zero; preço nunca negativo.

---

## 4. Regras de negócio (o coração do sistema)

### 4.1 Cálculo dos valores

- **Subtotal** do item = quantidade × preço unitário. É uma **coluna calculada**
  (`generated always as`): o banco calcula sozinho, ninguém consegue gravar um
  subtotal errado.
- **Valor total** do pedido = soma dos subtotais. Toda vez que um item é
  incluído, alterado ou removido, um **trigger** recalcula o total.
- Se alguém tentar alterar o total na mão, o banco ignora e recalcula.
  (Testado: tentei gravar R$ 1,00 no pedido #1001 e ele continuou R$ 1.080,00.)

**Prova do enunciado:** pedido #1001 = 2 × Câmera IP (R$ 450) + 1 × Sensor de
presença (R$ 180) = **R$ 1.080,00**. ✔

> **Trigger** = uma ação automática que o banco executa quando algo acontece
> numa tabela. Como um alarme: "quando abrir a porta, acenda a luz".

### 4.2 Fluxo de status

```
orcamento → aprovado → agendado → em_andamento → concluido
    │           │
    └→ cancelado └→ cancelado
```

- A regra está numa função única, `transicoes_permitidas`, que diz para cada
  status quais são os próximos válidos. Um trigger consulta essa função antes de
  qualquer mudança de status e **recusa** o que não estiver na lista.
- Não dá para voltar, nem pular. (Testado: tentei levar o #1001 de orçamento
  direto para concluído e o banco respondeu "Mudança de status inválida".)
- **Todo pedido nasce como orçamento**, mesmo que alguém tente criar já como
  "concluído".
- **Agendar exige técnico e data.** (Testado.)
- **Concluir exige forma de pagamento**, porque o faturamento precisa dela.
- **Itens só podem ser alterados enquanto o pedido é orçamento.** Depois que o
  cliente aprovou, o que foi aprovado não muda.

**Por que no banco e não só na tela?** Se a regra estiver só no frontend, basta
alguém editar pelo painel do Supabase, ou o n8n atualizar algo, e a regra é
furada. No banco, ela vale para todo mundo. A tela também mostra só os botões
válidos, mas isso é conforto; a garantia é o banco.

### 4.3 Criar pedido de forma "tudo ou nada"

A função `criar_pedido` recebe o cliente e a lista de produtos e grava o
pedido **e** os itens numa única **transação**. Se qualquer item falhar (produto
inexistente, quantidade zero), nada é gravado. Não existe pedido "pela metade",
sem itens e com total zero.

### 4.4 Histórico de status (bônus)

Toda mudança de status gera uma linha em `historico_status` com o status
anterior, o novo, quem mudou e quando. Serve para responder ao cliente "seu
pedido foi aprovado dia tal" e para auditoria.

---

## 5. Consultas prontas

| Nome | O que entrega | Quem usa |
|---|---|---|
| `vw_pedidos` (view) | Pedido + nome/telefone/endereço do cliente + nome do técnico, numa linha | Telas de lista e o n8n |
| `dashboard_indicadores()` | Pedidos do mês, faturado no mês, a receber, pendentes de agendamento, orçamentos abertos | Tela 1 |
| `instalacoes_agendadas_em(dia)` | Instalações agendadas num dia (padrão: amanhã), com horário | Automação 2 |

> **View** = uma "consulta salva" que se comporta como uma tabela de leitura.

Definições dos indicadores (o entrevistador pode perguntar):
- **Faturado** = soma dos pedidos **concluídos no mês atual**.
- **A receber** = soma dos pedidos **aprovados + agendados + em andamento**.
- **Pendentes de agendamento** = pedidos **aprovados** que ainda não têm agenda.

---

## 6. Segurança

- **RLS (Row Level Security) ligado em todas as tabelas.** A chave pública do
  Supabase fica no código do site, ou seja, qualquer pessoa pode vê-la. Sem RLS,
  qualquer um com essa chave leria os dados dos clientes do Rafael. Com RLS,
  só usuários **logados** acessam.
- **O n8n usa a chave `service_role`**, que fica guardada só no n8n (servidor),
  nunca no site.
- Rodei o verificador de segurança do Supabase (Advisors). Ele apontou que a
  função do histórico podia ser chamada pela API; corrigi tirando a permissão
  (migration 4). Hoje não há alertas.

---

## 7. Dados de exemplo

- 2 técnicos, 11 produtos em 4 categorias, 6 clientes, 11 pedidos.
- Pedidos em todos os status: 3 orçamentos, 1 aprovado, 3 agendados (2 para
  amanhã, para testar a Automação 2), 1 em andamento, 2 concluídos, 1 cancelado.
- Os pedidos de exemplo foram criados **passando pelas mesmas regras** do
  sistema (nasceram como orçamento e avançaram passo a passo). Isso também
  serviu de teste das regras.

---

## 8. Como o projeto está organizado (GitHub)

```
supabase/migrations/   ← cada alteração no banco, em ordem, versionada
supabase/seed.sql      ← dados de exemplo
docs/                  ← este guia e o checklist
```

> **Migration** = um arquivo com uma alteração no banco. Guardá-las no GitHub
> permite recriar o banco do zero em outro projeto e ver o histórico das mudanças.

---

## 9. Perguntas prováveis na entrevista

**"Por que você colocou as regras no banco?"**
Porque é o único ponto por onde todos os dados passam. Tela, n8n e painel do
Supabase gravam no banco. Se a regra mora lá, ninguém fura.

**"Como você garante que o total está certo?"**
O subtotal é coluna calculada pelo banco e o total é recalculado por trigger
sempre que um item muda. Ninguém digita valor. O exemplo do enunciado
(R$ 1.080) está no pedido #1001.

**"E se o preço do produto mudar?"**
O item guarda o preço do momento do pedido. Pedidos antigos não mudam.

**"Por que `numeric` e não `float`?"**
`float` faz conta aproximada; dinheiro precisa de exatidão.

**"O que acontece se tentar pular de orçamento para concluído?"**
O banco recusa com a mensagem "Mudança de status inválida". Posso mostrar.

**"Por que uma tabela de itens?"**
Um pedido tem vários produtos e um produto está em vários pedidos.

**"Para que serve o RLS?"**
A chave pública fica no site; sem RLS, qualquer um leria os dados. Com RLS,
só quem está logado.

**"O que faria com mais tempo?"**
(Será completado ao final.)

---

## 10. Glossário

| Termo | Significado simples |
|---|---|
| Tabela | Uma planilha com colunas fixas |
| Chave primária (PK) | O "RG" de cada linha (`id`) |
| Foreign key (FK) | Coluna que aponta para o RG de outra tabela |
| Trigger | Ação automática do banco quando algo acontece |
| Função (RPC) | Um procedimento guardado no banco que pode ser chamado pelo site |
| View | Consulta salva que funciona como tabela de leitura |
| Enum | Lista fechada de valores permitidos |
| Transação | Pacote de operações: ou tudo dá certo, ou nada é gravado |
| Migration | Arquivo com uma alteração do banco, versionado |
| RLS | Regra que decide quem pode ver/alterar cada linha |
| Webhook | Um "aviso" que um sistema manda para outro pela internet |
| Cron | Agendamento: "rode isso todo dia às 18h" |

---

## 11. Uso de IA (rascunho honesto)

- Usei o Cursor (assistente de IA) para escrever o SQL das tabelas, regras e
  dados de exemplo, e para revisar segurança.
- Eu defini junto com a IA as decisões de negócio (ex.: preço congelado, itens
  travados após aprovação, concluir exige forma de pagamento) e testei cada
  regra no banco.
- (Será completado ao longo do projeto.)

---

## Diário de decisões

| Data | Decisão | Motivo |
|---|---|---|
| 01/10 | Projeto Supabase novo e separado (`smartlar`) | Banco limpo para a avaliação |
| 01/10 | Regras de valor e status no banco (triggers) | Valem para tela, n8n e painel |
| 01/10 | Preço congelado no item | Orçamento enviado não muda se o catálogo mudar |
| 01/10 | `criar_pedido` em transação | Evita pedido sem itens |
| 01/10 | RLS desde o início | Chave pública fica exposta no site |
| 01/10 | Frontend em React + Vite no Cursor | Mesma tecnologia do Lovable, controle total e commits limpos |
