import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { data, dataHora, mensagemErro, moeda } from '../lib/formato'
import { STATUS_LABEL, STATUS_ORDEM, type PedidoResumo, type StatusPedido } from '../lib/tipos'
import { Aviso, Card, Carregando, Entrada, Pagina, SeloStatus, Vazio } from '../components/ui'

export function Pedidos() {
  const [params, setParams] = useSearchParams()
  const filtro = (params.get('status') as StatusPedido | null) ?? null

  const [pedidos, setPedidos] = useState<PedidoResumo[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('vw_pedidos')
      .select('*')
      .order('numero', { ascending: false })
      .then(({ data: linhas, error }) => {
        if (error) setErro(mensagemErro(error))
        setPedidos((linhas as PedidoResumo[]) ?? [])
        setCarregando(false)
      })
  }, [])

  const contagem = useMemo(() => {
    const c = {} as Record<StatusPedido, number>
    STATUS_ORDEM.forEach((s) => (c[s] = 0))
    pedidos.forEach((p) => c[p.status]++)
    return c
  }, [pedidos])

  const visiveis = pedidos.filter((p) => {
    if (filtro && p.status !== filtro) return false
    const termo = busca.trim().toLowerCase()
    if (!termo) return true
    return p.cliente_nome.toLowerCase().includes(termo) || String(p.numero).includes(termo)
  })

  function escolherFiltro(s: StatusPedido | null) {
    setParams(s ? { status: s } : {})
  }

  return (
    <Pagina
      titulo="Pedidos"
      subtitulo="Acompanhe e avance o status dos pedidos"
      acoes={
        <Link to="/pedidos/novo" className="rounded-lg bg-marca-600 px-3 py-2 text-sm font-medium text-white hover:bg-marca-700">
          + Novo pedido
        </Link>
      }
    >
      <div className="space-y-4">
        {erro && <Aviso>{erro}</Aviso>}

        <div className="flex flex-wrap gap-2">
          <Filtro ativo={!filtro} onClick={() => escolherFiltro(null)}>
            Todos ({pedidos.length})
          </Filtro>
          {STATUS_ORDEM.map((s) => (
            <Filtro key={s} ativo={filtro === s} onClick={() => escolherFiltro(s)}>
              {STATUS_LABEL[s]} ({contagem[s] ?? 0})
            </Filtro>
          ))}
        </div>

        <Entrada placeholder="Buscar por cliente ou nº do pedido…" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-md" />

        <Card>
          {carregando ? (
            <Carregando />
          ) : visiveis.length === 0 ? (
            <Vazio>Nenhum pedido encontrado.</Vazio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Nº</th>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Técnico</th>
                    <th className="py-2 pr-3">Instalação</th>
                    <th className="py-2 pr-3">Criado em</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiveis.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2 pr-3">
                        <Link to={`/pedidos/${p.id}`} className="font-semibold text-marca-700 hover:underline">
                          #{p.numero}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">
                        <Link to={`/pedidos/${p.id}`} className="hover:underline">
                          {p.cliente_nome}
                        </Link>
                      </td>
                      <td className="py-2 pr-3"><SeloStatus status={p.status} /></td>
                      <td className="py-2 pr-3 text-slate-600">{p.tecnico_nome ?? '—'}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-slate-600">{dataHora(p.data_instalacao)}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-slate-600">{data(p.created_at)}</td>
                      <td className="whitespace-nowrap py-2 text-right font-semibold">{moeda(p.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Pagina>
  )
}

function Filtro({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${
        ativo ? 'border-marca-600 bg-marca-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}
