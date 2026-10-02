const FUSO = 'America/Sao_Paulo'

const moedaFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function moeda(valor: number | string | null | undefined): string {
  return moedaFmt.format(Number(valor ?? 0))
}

export function dataHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function data(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: FUSO })
}

export function diaSemana(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: FUSO,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

export function hora(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' })
}

export function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, '')
}

/** Formata enquanto digita: (31) 99123-4501 */
export function mascaraTelefone(texto: string): string {
  const d = apenasDigitos(texto).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/**
 * Subtotal calculado em centavos (números inteiros) para evitar erros de
 * arredondamento do JavaScript. É só uma prévia: o valor oficial é o do banco.
 */
export function subtotalPrevia(preco: number, quantidade: number): number {
  return (Math.round(preco * 100) * quantidade) / 100
}

/** Converte o valor de um <input type="datetime-local"> para ISO (com fuso). */
export function localParaIso(valor: string): string {
  return new Date(valor).toISOString()
}

/** Mensagem de erro amigável a partir de um erro do Supabase. */
export function mensagemErro(erro: unknown): string {
  if (erro && typeof erro === 'object' && 'message' in erro) {
    const msg = String((erro as { message: string }).message)
    if (msg.includes('clientes_telefone_check')) return 'Telefone inválido: informe DDD + número.'
    if (msg.includes('clientes_email_check')) return 'E-mail inválido.'
    if (msg.includes('violates foreign key')) return 'Este registro está ligado a outros e não pode ser removido.'
    return msg
  }
  return 'Erro inesperado. Tente novamente.'
}
