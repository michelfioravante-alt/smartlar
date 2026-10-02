export type StatusPedido =
  | 'orcamento'
  | 'aprovado'
  | 'agendado'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado'

export type FormaPagamento =
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'dinheiro'
  | 'boleto'
  | 'transferencia'

export type Categoria = 'seguranca' | 'iluminacao' | 'automacao' | 'assistentes_voz'

export interface Cliente {
  id: string
  nome: string
  telefone: string
  email: string | null
  endereco: string
  bairro: string | null
  cidade: string
  observacoes: string | null
  created_at: string
}

export interface Tecnico {
  id: string
  nome: string
  telefone: string
  especialidade: string
  ativo: boolean
}

export interface Produto {
  id: string
  nome: string
  categoria: Categoria
  preco_unitario: number
  descricao: string | null
  ativo: boolean
}

export interface PedidoResumo {
  id: string
  numero: number
  status: StatusPedido
  valor_total: number
  forma_pagamento: FormaPagamento | null
  data_instalacao: string | null
  observacoes: string | null
  concluido_em: string | null
  created_at: string
  cliente_id: string
  cliente_nome: string
  cliente_telefone: string
  cliente_email: string | null
  cliente_endereco: string
  cliente_bairro: string | null
  cliente_cidade: string
  tecnico_id: string | null
  tecnico_nome: string | null
  tecnico_telefone: string | null
  qtd_itens: number
}

export interface ItemPedido {
  id: string
  quantidade: number
  preco_unitario: number
  subtotal: number
  produto: { nome: string; categoria: Categoria } | null
}

export interface HistoricoStatus {
  id: string
  status_anterior: StatusPedido | null
  status_novo: StatusPedido
  alterado_em: string
}

export const STATUS_LABEL: Record<StatusPedido, string> = {
  orcamento: 'Orçamento',
  aprovado: 'Aprovado',
  agendado: 'Agendado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export const STATUS_ORDEM: StatusPedido[] = [
  'orcamento',
  'aprovado',
  'agendado',
  'em_andamento',
  'concluido',
  'cancelado',
]

/**
 * Espelho da função transicoes_permitidas() do banco. Serve só para a tela
 * mostrar os botões certos; quem garante a regra é o trigger no Supabase.
 */
export const TRANSICOES: Record<StatusPedido, StatusPedido[]> = {
  orcamento: ['aprovado', 'cancelado'],
  aprovado: ['agendado', 'cancelado'],
  agendado: ['em_andamento'],
  em_andamento: ['concluido'],
  concluido: [],
  cancelado: [],
}

export const ACAO_LABEL: Record<StatusPedido, string> = {
  orcamento: 'Voltar para orçamento',
  aprovado: 'Aprovar orçamento',
  agendado: 'Agendar instalação',
  em_andamento: 'Iniciar instalação',
  concluido: 'Concluir instalação',
  cancelado: 'Cancelar pedido',
}

export const PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  dinheiro: 'Dinheiro',
  boleto: 'Boleto',
  transferencia: 'Transferência',
}

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  seguranca: 'Segurança',
  iluminacao: 'Iluminação',
  automacao: 'Automação',
  assistentes_voz: 'Assistentes de voz',
}
