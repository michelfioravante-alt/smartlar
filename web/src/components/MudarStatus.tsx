import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localParaIso, mensagemErro } from '../lib/formato'
import {
  ACAO_LABEL,
  PAGAMENTO_LABEL,
  STATUS_LABEL,
  TRANSICOES,
  type FormaPagamento,
  type StatusPedido,
  type Tecnico,
} from '../lib/tipos'
import { Aviso, Botao, Campo, Entrada, Modal, Selecao } from './ui'

interface PedidoBase {
  id: string
  numero: number
  status: StatusPedido
  forma_pagamento: FormaPagamento | null
  tecnico_id: string | null
}

/** Botões com os próximos status válidos + formulário quando a mudança exige dados. */
export function MudarStatus({ pedido, aoMudar, permitir }: {
  pedido: PedidoBase
  aoMudar: () => void
  permitir?: StatusPedido[]
}) {
  const [destino, setDestino] = useState<StatusPedido | null>(null)
  const opcoes = TRANSICOES[pedido.status].filter((s) => !permitir || permitir.includes(s))

  if (opcoes.length === 0) {
    return <p className="text-sm text-slate-500">Pedido {STATUS_LABEL[pedido.status].toLowerCase()}: não há próximos passos.</p>
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((s) => (
          <Botao key={s} variante={s === 'cancelado' ? 'perigo' : 'primario'} onClick={() => setDestino(s)}>
            {ACAO_LABEL[s]}
          </Botao>
        ))}
      </div>
      <Modal titulo={destino ? ACAO_LABEL[destino] : ''} aberto={!!destino} aoFechar={() => setDestino(null)}>
        {destino && (
          <FormMudanca
            pedido={pedido}
            destino={destino}
            aoConcluir={() => {
              setDestino(null)
              aoMudar()
            }}
          />
        )}
      </Modal>
    </>
  )
}

function FormMudanca({ pedido, destino, aoConcluir }: {
  pedido: PedidoBase
  destino: StatusPedido
  aoConcluir: () => void
}) {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [tecnicoId, setTecnicoId] = useState(pedido.tecnico_id ?? '')
  const [dataHora, setDataHora] = useState('')
  const [pagamento, setPagamento] = useState<FormaPagamento | ''>(pedido.forma_pagamento ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const pedeAgenda = destino === 'agendado'
  const pedePagamento = destino === 'aprovado' || destino === 'concluido'
  const pagamentoObrigatorio = destino === 'concluido'

  useEffect(() => {
    if (pedeAgenda) {
      supabase
        .from('tecnicos')
        .select('*')
        .eq('ativo', true)
        .order('nome')
        .then(({ data }) => setTecnicos((data as Tecnico[]) ?? []))
    }
  }, [pedeAgenda])

  async function confirmar() {
    setErro(null)
    const alteracao: Record<string, unknown> = { status: destino }

    if (pedeAgenda) {
      if (!tecnicoId || !dataHora) return setErro('Selecione o técnico e a data/hora da instalação.')
      if (new Date(dataHora) < new Date()) return setErro('A data da instalação precisa ser no futuro.')
      alteracao.tecnico_id = tecnicoId
      alteracao.data_instalacao = localParaIso(dataHora)
    }
    if (pedePagamento) {
      if (pagamentoObrigatorio && !pagamento) return setErro('Informe a forma de pagamento para concluir.')
      if (pagamento) alteracao.forma_pagamento = pagamento
    }

    setSalvando(true)
    const { error } = await supabase.from('pedidos').update(alteracao).eq('id', pedido.id)
    setSalvando(false)
    if (error) return setErro(mensagemErro(error))
    aoConcluir()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Pedido #{pedido.numero}: <strong>{STATUS_LABEL[pedido.status]}</strong> → <strong>{STATUS_LABEL[destino]}</strong>
      </p>

      {pedeAgenda && (
        <>
          <Campo rotulo="Técnico responsável" obrigatorio>
            <Selecao value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
              <option value="">Selecione…</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} · {t.especialidade}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Data e hora da instalação" obrigatorio>
            <Entrada type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} />
          </Campo>
        </>
      )}

      {pedePagamento && (
        <Campo rotulo="Forma de pagamento" obrigatorio={pagamentoObrigatorio}>
          <Selecao value={pagamento} onChange={(e) => setPagamento(e.target.value as FormaPagamento | '')}>
            <option value="">{pagamentoObrigatorio ? 'Selecione…' : 'A definir'}</option>
            {Object.entries(PAGAMENTO_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>
      )}

      {destino === 'cancelado' && <Aviso tipo="info">O cancelamento não pode ser desfeito.</Aviso>}
      {erro && <Aviso>{erro}</Aviso>}

      <Botao variante={destino === 'cancelado' ? 'perigo' : 'primario'} onClick={confirmar} disabled={salvando} className="w-full">
        {salvando ? 'Salvando…' : 'Confirmar'}
      </Botao>
    </div>
  )
}
