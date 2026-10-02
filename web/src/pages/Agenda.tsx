import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { dataHora, diaSemana, hora, mensagemErro } from '../lib/formato'
import type { PedidoResumo, Tecnico } from '../lib/tipos'
import { MudarStatus } from '../components/MudarStatus'
import { Aviso, Card, Carregando, Pagina, SeloStatus, Vazio } from '../components/ui'

export function Agenda() {
  const [params, setParams] = useSearchParams()
  const tecnicoId = params.get('tecnico') ?? ''

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [pendentes, setPendentes] = useState<PedidoResumo[]>([])
  const [concluidas, setConcluidas] = useState<PedidoResumo[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('tecnicos')
      .select('*')
      .eq('ativo', true)
      .order('nome')
      .then(({ data, error }) => {
        if (error) setErro(mensagemErro(error))
        const lista = (data as Tecnico[]) ?? []
        setTecnicos(lista)
        if (!tecnicoId && lista.length > 0) setParams({ tecnico: lista[0].id }, { replace: true })
      })
  }, [])

  const carregar = useCallback(async () => {
    if (!tecnicoId) return
    setCarregando(true)
    const seteDiasAtras = new Date()
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

    const [abertas, feitas] = await Promise.all([
      supabase
        .from('vw_pedidos')
        .select('*')
        .eq('tecnico_id', tecnicoId)
        .in('status', ['agendado', 'em_andamento'])
        .order('data_instalacao'),
      supabase
        .from('vw_pedidos')
        .select('*')
        .eq('tecnico_id', tecnicoId)
        .eq('status', 'concluido')
        .gte('concluido_em', seteDiasAtras.toISOString())
        .order('concluido_em', { ascending: false }),
    ])
    const falha = abertas.error ?? feitas.error
    if (falha) setErro(mensagemErro(falha))
    setPendentes((abertas.data as PedidoResumo[]) ?? [])
    setConcluidas((feitas.data as PedidoResumo[]) ?? [])
    setCarregando(false)
  }, [tecnicoId])

  useEffect(() => {
    carregar()
  }, [carregar])

  const tecnico = tecnicos.find((t) => t.id === tecnicoId)

  return (
    <Pagina titulo="Agenda dos técnicos" subtitulo="Instalações agendadas e em andamento de cada técnico">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tecnicos.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setAviso(null)
                setParams({ tecnico: t.id })
              }}
              className={`rounded-xl border px-4 py-2 text-left text-sm ${
                t.id === tecnicoId ? 'border-marca-600 bg-marca-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <p className="font-semibold">{t.nome}</p>
              <p className="text-xs text-slate-500">{t.especialidade}</p>
            </button>
          ))}
        </div>

        {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
        {erro && <Aviso>{erro}</Aviso>}

        <Card titulo={tecnico ? `Instalações de ${tecnico.nome}` : 'Instalações'}>
          {carregando ? (
            <Carregando />
          ) : pendentes.length === 0 ? (
            <Vazio>Nenhuma instalação agendada.</Vazio>
          ) : (
            <ul className="space-y-3">
              {pendentes.map((p) => (
                <li key={p.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center">
                  <div className="w-24 shrink-0 text-center">
                    <p className="text-xs uppercase text-slate-500">{diaSemana(p.data_instalacao!)}</p>
                    <p className="text-xl font-bold">{hora(p.data_instalacao)}</p>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Link to={`/pedidos/${p.id}`} className="font-semibold hover:underline">
                        #{p.numero} · {p.cliente_nome}
                      </Link>
                      <SeloStatus status={p.status} />
                    </div>
                    <p className="text-slate-600">
                      📍 {p.cliente_endereco}
                      {p.cliente_bairro ? ` · ${p.cliente_bairro}` : ''}
                    </p>
                    <p className="text-slate-600">📞 {p.cliente_telefone}</p>
                    {p.observacoes && <p className="text-amber-700">📝 {p.observacoes}</p>}
                  </div>
                  <MudarStatus
                    pedido={p}
                    permitir={['em_andamento', 'concluido']}
                    aoMudar={() => {
                      setAviso(`Pedido #${p.numero} atualizado.`)
                      carregar()
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {concluidas.length > 0 && (
          <Card titulo="Concluídas nos últimos 7 dias">
            <ul className="divide-y divide-slate-100 text-sm">
              {concluidas.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <Link to={`/pedidos/${p.id}`} className="hover:underline">
                    #{p.numero} · {p.cliente_nome}
                  </Link>
                  <span className="text-slate-500">{dataHora(p.concluido_em)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </Pagina>
  )
}
