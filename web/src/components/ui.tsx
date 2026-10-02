import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { STATUS_LABEL, type StatusPedido } from '../lib/tipos'

export function Pagina({ titulo, subtitulo, acoes, children }: {
  titulo: string
  subtitulo?: string
  acoes?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex gap-2">{acoes}</div>}
      </header>
      {children}
    </div>
  )
}

export function Card({ titulo, acoes, children, className = '' }: {
  titulo?: string
  acoes?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(titulo || acoes) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          {titulo && <h2 className="font-semibold text-slate-800">{titulo}</h2>}
          {acoes}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-marca-600 text-white hover:bg-marca-700 disabled:bg-slate-300',
  secundario: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400',
  perigo: 'border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:text-slate-400',
  fantasma: 'text-slate-600 hover:bg-slate-100',
}

export function Botao({ variante = 'primario', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${VARIANTES[variante]} ${className}`}
      {...props}
    />
  )
}

export function Campo({ rotulo, obrigatorio, children, dica }: {
  rotulo: string
  obrigatorio?: boolean
  children: ReactNode
  dica?: string
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">
        {rotulo}
        {obrigatorio && <span className="text-red-600"> *</span>}
      </span>
      {children}
      {dica && <span className="mt-1 block text-xs text-slate-500">{dica}</span>}
    </label>
  )
}

const BASE_INPUT =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-marca-500 focus:ring-2 focus:ring-marca-100'

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${BASE_INPUT} ${props.className ?? ''}`} />
}

export function Selecao(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${BASE_INPUT} ${props.className ?? ''}`} />
}

export function AreaTexto(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${BASE_INPUT} ${props.className ?? ''}`} />
}

const CORES_STATUS: Record<StatusPedido, string> = {
  orcamento: 'bg-amber-100 text-amber-800',
  aprovado: 'bg-sky-100 text-sky-800',
  agendado: 'bg-indigo-100 text-indigo-800',
  em_andamento: 'bg-orange-100 text-orange-800',
  concluido: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-slate-200 text-slate-600',
}

export function SeloStatus({ status }: { status: StatusPedido }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${CORES_STATUS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'sucesso' | 'info'; children: ReactNode }) {
  const cores = {
    erro: 'border-red-200 bg-red-50 text-red-800',
    sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  }[tipo]
  return <div className={`rounded-lg border px-3 py-2 text-sm ${cores}`}>{children}</div>
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return <p className="py-6 text-center text-sm text-slate-500">{texto}</p>
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>
}

export function Modal({ titulo, aberto, aoFechar, children }: {
  titulo: string
  aberto: boolean
  aoFechar: () => void
  children: ReactNode
}) {
  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={aoFechar}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold">{titulo}</h2>
          <button type="button" className="text-slate-400 hover:text-slate-700" onClick={aoFechar} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
