# Automações n8n — como importar e ativar

Os arquivos desta pasta são os workflows exportados. **Não contêm senhas**:
as chaves ficam nas credenciais do n8n.

| Arquivo | Workflow | Gatilho |
|---|---|---|
| `0-tratamento-de-erros.json` | Registra falhas de qualquer workflow na aba "Erros" | Error Trigger |
| `1-novo-pedido.json` | Automação 1: novo pedido → aba "Novos pedidos" | Webhook do Supabase + recuperação a cada 15 min |
| `2-alerta-instalacoes.json` | Automação 2: instalações de amanhã → aba "Alertas instalacoes" | Todo dia às 18h |
| `3-faturamento.json` | Automação 3 (bônus): pedido concluído → aba "Faturamento" | Webhook do Supabase + recuperação a cada 15 min |

## 1. Criar as 3 credenciais no n8n

No n8n: **Overview → Create → Credential** (ou botão "+" ao lado de Credentials).

### a) `Supabase SmartLar` — tipo **Supabase API**
- **Host**: Project URL do Supabase (*Project Settings → Data API*)
- **Service Role Secret**: chave `service_role` em
  *Project Settings → API Keys → aba "Legacy API Keys" → service_role → Reveal*

> A `service_role` ignora o RLS. Ela só pode existir aqui no n8n (servidor),
> nunca no site nem no GitHub.

### b) `SmartLar Webhook` — tipo **Header Auth**
- **Name**: `x-smartlar-secret`
- **Value**: o segredo guardado no Vault do Supabase
  (*Integrations → Vault → `n8n_webhook_secret` → revelar e copiar*)

> O Supabase envia esse cabeçalho em todo aviso. O webhook recusa (403)
> qualquer chamada sem ele, então ninguém consegue registrar pedidos falsos.

### c) `Google Sheets SmartLar` — tipo **Google Sheets OAuth2 API**
- Clique em **Sign in with Google** e autorize.

Use exatamente esses nomes: os workflows procuram as credenciais por eles.

## 2. Importar os workflows (nesta ordem: 0, 1, 2, 3)

1. **Workflows → Create workflow**.
2. Menu **⋯** (canto superior direito) → **Import from File…** → escolha o arquivo.
3. Abra cada nó com alerta vermelho e selecione a credencial correspondente.
4. Nos nós de planilha, confira se a planilha "SmartLar - Automações" está selecionada.
5. **Save**.

## 3. Ligar o tratamento de erros

Nos workflows 1, 2 e 3: **⋯ → Settings → Error workflow →
"SmartLar | 0. Tratamento de erros" → Save**.

## 4. Ativar

Nos workflows 1, 2 e 3: ligue o botão **Active** (ou **Publish**, nas versões
mais novas). Só assim os webhooks usam o endereço de produção e os horários
rodam sozinhos.

## Como cada automação lida com falhas

| Situação | O que acontece |
|---|---|
| n8n fora do ar quando o pedido é criado | O pedido fica com `notificado_em` vazio; a rotina de 15 min encontra e registra depois |
| O mesmo aviso chega duas vezes | Ignorado: só registra pedidos com `notificado_em` vazio |
| Nenhuma instalação amanhã | Registra a linha "Nenhuma instalação agendada para amanhã" (prova de que rodou) |
| Erro em qualquer passo (ex.: Google fora do ar) | O workflow 0 grava o erro na aba "Erros"; como o pedido não foi marcado, a recuperação tenta de novo |
| Chamada falsa no webhook | Recusada pelo Header Auth |
