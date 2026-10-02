import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { dataHora, mensagemErro, moeda } from '../lib/formato'
import { PAGAMENTO_LABEL, STATUS_LABEL, type HistoricoStatus, type ItemPedido, type PedidoResumo } from '../lib/tipos'
import { MudarStatus } from '../components/MudarStatus'
import { Aviso, Card, Carregando, Pagina, SeloStatus } from '../components/ui'

export function PedidoDetalhe() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const [pedido, setPedido] = useState<PedidoResumo | null>(null)
  const [itens, setItens] = useState<ItemPedido[]>([])
  const [historico, setHistorico] = useState<HistoricoStatus[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(params.get('criado') ? 'Orçamento criado com sucesso.' : null)

  const carregar = useCallback(async () => {
    if (!id) return
    const [p, i, h] = await Promise.all([
      supabase.from('vw_pedidos').select('*').eq('id', id).single<PedidoResumo>(),
      supabase
        .from('itens_pedido')
        .select('id, quantidade, preco_unitario, subtotal, produto:produtos(nome, categoria)')
        .eq('pedido_id', id)
        .order('created_at'),
      supabase.from('historico_status').select('*').eq('pedido_id', id).order('alterado_em'),
    ])
    const falha = p.error ?? i.error ?? h.error
    if (falha) setErro(mensagemErro(falha))
    setPedido(p.data)
    setItens((i.data as unknown as ItemPedido[]) ?? [])
    setHistorico((h.data as HistoricoStatus[]) ?? [])
  }, [id])

  useEffect(() => {
    carregar()
  }, [carregar])

  if (!pedido) {
    return (
      <Pagina titulo="Pedido">
        {erro ? <Aviso>{erro}</Aviso> : <Carregando />}
      </Pagina>
    )
  }

  return (
    <Pagina
      titulo={`Pedido #${pedido.numero}`}
      subtitulo={`Criado em ${dataHora(pedido.created_at)}`}
      acoes={
        <Link to="/pedidos" className="text-sm text-slate-600 hover:underline">
          ← Voltar para pedidos
        </Link>
      }
    >
      <div className="space-y-6">
        {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
        {erro && <Aviso>{erro}</Aviso>}

        <Card titulo="Status">
          <div className="flex flex-wrap items-center gap-4">
            <SeloStatus status={pedido.status} />
            <MudarStatus
              pedido={pedido}
              aoMudar={() => {
                setAviso('Status atualizado.')
                carregar()
              }}
            />
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card titulo="Cliente">
            <dl className="space-y-1 text-sm">
              <p className="font-medium text-slate-800">{pedido.cliente_nome}</p>
              <p className="text-slate-600">📞 {pedido.cliente_telefone}</p>
              {pedido.cliente_email && <p className="text-slate-600">✉️ {pedido.cliente_email}</p>}
              <p className="text-slate-600">
                📍 {pedido.cliente_endereco}
                {pedido.cliente_bairro ? ` · ${pedido.cliente_bairro}` : ''} · {pedido.cliente_cidade}
              </p>
            </dl>
          </Card>

          <Card titulo="Instalação e pagamento">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-slate-500">Técnico</dt>
              <dd>{pedido.tecnico_nome ?? 'A definir'}</dd>
              <dt className="text-slate-500">Data</dt>
              <dd>{dataHora(pedido.data_instalacao)}</dd>
              <dt className="text-slate-500">Pagamento</dt>
              <dd>{pedido.forma_pagamento ? PAGAMENTO_LABEL[pedido.forma_pagamento] : 'A definir'}</dd>
              {pedido.concluido_em && (
                <>
                  <dt className="text-slate-500">Concluído em</dt>
                  <dd>{dataHora(pedido.concluido_em)}</dd>
                </>
              )}
            </dl>
          </Card>
        </div>

        <Card titulo="Produtos">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Produto</th>
                  <th className="py-2 pr-3 text-right">Preço un.</th>
                  <th className="py-2 pr-3 text-center">Qtd.</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itens.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2 pr-3 font-medium">{i.produto?.nome}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right">{moeda(i.preco_unitario)}</td>
                    <td className="py-2 pr-3 text-center">{i.quantidade}</td>
                    <td className="whitespace-nowrap py-2 text-right font-semibold">{moeda(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={3} className="py-3 pr-3 text-right font-semibold">Total</td>
                  <td className="whitespace-nowrap py-3 text-right text-lg font-bold text-marca-700">{moeda(pedido.valor_total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {pedido.observacoes && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">📝 {pedido.observacoes}</p>
          )}
        </Card>

        <Card titulo="Histórico de status">
          <ol className="space-y-2 text-sm">
            {historico.map((h) => (
              <li key={h.id} className="flex gap-3">
                <span className="w-36 shrink-0 text-slate-500">{dataHora(h.alterado_em)}</span>
                <span>
                  {h.status_anterior ? `${STATUS_LABEL[h.status_anterior]} → ` : 'Criado como '}
                  <strong>{STATUS_LABEL[h.status_novo]}</strong>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </Pagina>
  )
}
