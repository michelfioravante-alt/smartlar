import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { dataHora, diaSemana, hora, mensagemErro, moeda } from '../lib/formato'
import type { PedidoResumo } from '../lib/tipos'
import { Aviso, Card, Carregando, Pagina, Vazio } from '../components/ui'

interface Indicadores {
  pedidos_no_mes: number
  faturado_no_mes: number
  a_receber: number
  pendentes_agendamento: number
  orcamentos_abertos: number
}

export function Dashboard() {
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null)
  const [proximas, setProximas] = useState<PedidoResumo[]>([])
  const [orcamentos, setOrcamentos] = useState<PedidoResumo[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const inicioHoje = new Date()
      inicioHoje.setHours(0, 0, 0, 0)
      const daqui7dias = new Date(inicioHoje)
      daqui7dias.setDate(daqui7dias.getDate() + 8)

      const [ind, prox, orc] = await Promise.all([
        supabase.rpc('dashboard_indicadores').single<Indicadores>(),
        supabase
          .from('vw_pedidos')
          .select('*')
          .eq('status', 'agendado')
          .gte('data_instalacao', inicioHoje.toISOString())
          .lt('data_instalacao', daqui7dias.toISOString())
          .order('data_instalacao'),
        supabase.from('vw_pedidos').select('*').eq('status', 'orcamento').order('created_at', { ascending: false }),
      ])

      const falha = ind.error ?? prox.error ?? orc.error
      if (falha) setErro(mensagemErro(falha))
      setIndicadores(ind.data)
      setProximas((prox.data as PedidoResumo[]) ?? [])
      setOrcamentos((orc.data as PedidoResumo[]) ?? [])
      setCarregando(false)
    }
    carregar()
  }, [])

  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <Pagina titulo="Dashboard" subtitulo={`Visão geral de ${mes}`}>
      {erro && <Aviso>{erro}</Aviso>}
      {carregando ? (
        <Carregando />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador rotulo="Pedidos no mês" valor={String(indicadores?.pedidos_no_mes ?? 0)} />
            <Indicador rotulo="Faturado no mês" valor={moeda(indicadores?.faturado_no_mes)} dica="Pedidos concluídos" destaque />
            <Indicador rotulo="A receber" valor={moeda(indicadores?.a_receber)} dica="Aprovados + agendados + em andamento" />
            <Indicador
              rotulo="Pendentes de agendamento"
              valor={String(indicadores?.pendentes_agendamento ?? 0)}
              dica="Aprovados sem data"
              link="/pedidos?status=aprovado"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card titulo="Próximas instalações (7 dias)">
              {proximas.length === 0 ? (
                <Vazio>Nenhuma instalação agendada para os próximos 7 dias.</Vazio>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {proximas.map((p) => (
                    <li key={p.id}>
                      <Link to={`/pedidos/${p.id}`} className="flex gap-3 py-3 hover:bg-slate-50">
                        <div className="w-20 shrink-0 text-center">
                          <p className="text-xs uppercase text-slate-500">{diaSemana(p.data_instalacao!)}</p>
                          <p className="text-lg font-semibold text-slate-800">{hora(p.data_instalacao)}</p>
                        </div>
                        <div className="min-w-0 text-sm">
                          <p className="font-medium text-slate-800">{p.cliente_nome}</p>
                          <p className="truncate text-slate-500">
                            {p.cliente_endereco}
                            {p.cliente_bairro ? ` · ${p.cliente_bairro}` : ''}
                          </p>
                          <p className="text-slate-500">Técnico: {p.tecnico_nome}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card titulo={`Orçamentos aguardando aprovação (${orcamentos.length})`}>
              {orcamentos.length === 0 ? (
                <Vazio>Nenhum orçamento aguardando.</Vazio>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {orcamentos.map((p) => (
                    <li key={p.id}>
                      <Link to={`/pedidos/${p.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-slate-50">
                        <div>
                          <p className="font-medium text-slate-800">
                            #{p.numero} · {p.cliente_nome}
                          </p>
                          <p className="text-slate-500">Criado em {dataHora(p.created_at)}</p>
                        </div>
                        <p className="font-semibold text-slate-800">{moeda(p.valor_total)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </Pagina>
  )
}

function Indicador({ rotulo, valor, dica, destaque, link }: {
  rotulo: string
  valor: string
  dica?: string
  destaque?: boolean
  link?: string
}) {
  const conteudo = (
    <div className={`h-full rounded-xl border p-4 shadow-sm ${destaque ? 'border-marca-100 bg-marca-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className={`mt-1 text-2xl font-bold ${destaque ? 'text-marca-700' : 'text-slate-900'}`}>{valor}</p>
      {dica && <p className="mt-1 text-xs text-slate-500">{dica}</p>}
    </div>
  )
  return link ? <Link to={link}>{conteudo}</Link> : conteudo
}
