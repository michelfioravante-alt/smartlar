import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { apenasDigitos, data, mensagemErro, moeda } from '../lib/formato'
import type { Cliente, PedidoResumo } from '../lib/tipos'
import { FormCliente } from '../components/FormCliente'
import { Aviso, Botao, Card, Carregando, Entrada, Modal, Pagina, SeloStatus, Vazio } from '../components/ui'

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [novoAberto, setNovoAberto] = useState(false)
  const [selecionado, setSelecionado] = useState<Cliente | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  const carregar = useCallback(async (termo: string) => {
    setCarregando(true)
    let consulta = supabase.from('clientes').select('*').order('nome')
    const texto = termo.trim()
    if (texto) {
      const digitos = apenasDigitos(texto)
      const nomeSeguro = texto.replace(/[,()%]/g, ' ')
      consulta = digitos.length >= 3
        ? consulta.or(`nome.ilike.%${nomeSeguro}%,telefone_digitos.ilike.%${digitos}%`)
        : consulta.ilike('nome', `%${nomeSeguro}%`)
    }
    const { data: linhas, error } = await consulta
    if (error) setErro(mensagemErro(error))
    setClientes((linhas as Cliente[]) ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => carregar(busca), 250)
    return () => clearTimeout(t)
  }, [busca, carregar])

  return (
    <Pagina
      titulo="Clientes"
      subtitulo="Cadastro e histórico de pedidos de cada cliente"
      acoes={<Botao onClick={() => setNovoAberto(true)}>+ Novo cliente</Botao>}
    >
      <div className="space-y-4">
        {sucesso && <Aviso tipo="sucesso">{sucesso}</Aviso>}
        {erro && <Aviso>{erro}</Aviso>}

        <Entrada
          placeholder="Buscar por nome ou telefone…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-md"
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card titulo={`${clientes.length} cliente(s)`}>
            {carregando ? (
              <Carregando />
            ) : clientes.length === 0 ? (
              <Vazio>Nenhum cliente encontrado.</Vazio>
            ) : (
              <ul className="divide-y divide-slate-100">
                {clientes.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelecionado(c)}
                      className={`w-full px-2 py-3 text-left text-sm hover:bg-slate-50 ${selecionado?.id === c.id ? 'bg-marca-50' : ''}`}
                    >
                      <p className="font-medium text-slate-800">{c.nome}</p>
                      <p className="text-slate-500">
                        {c.telefone}
                        {c.email ? ` · ${c.email}` : ''}
                      </p>
                      <p className="truncate text-slate-500">
                        {c.endereco}
                        {c.bairro ? ` · ${c.bairro}` : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {selecionado ? (
            <PedidosDoCliente cliente={selecionado} />
          ) : (
            <Card>
              <Vazio>Clique num cliente para ver os pedidos dele.</Vazio>
            </Card>
          )}
        </div>
      </div>

      <Modal titulo="Novo cliente" aberto={novoAberto} aoFechar={() => setNovoAberto(false)}>
        <FormCliente
          aoCancelar={() => setNovoAberto(false)}
          aoSalvar={(c) => {
            setNovoAberto(false)
            setSucesso(`Cliente "${c.nome}" cadastrado.`)
            setSelecionado(c)
            carregar(busca)
          }}
        />
      </Modal>
    </Pagina>
  )
}

function PedidosDoCliente({ cliente }: { cliente: Cliente }) {
  const [pedidos, setPedidos] = useState<PedidoResumo[] | null>(null)

  useEffect(() => {
    setPedidos(null)
    supabase
      .from('vw_pedidos')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })
      .then(({ data: linhas }) => setPedidos((linhas as PedidoResumo[]) ?? []))
  }, [cliente.id])

  return (
    <Card
      titulo={`Pedidos de ${cliente.nome}`}
      acoes={
        <Link to={`/pedidos/novo?cliente=${cliente.id}`} className="text-sm font-medium text-marca-700 hover:underline">
          + Novo pedido
        </Link>
      }
    >
      {cliente.observacoes && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{cliente.observacoes}</p>}
      {pedidos === null ? (
        <Carregando />
      ) : pedidos.length === 0 ? (
        <Vazio>Este cliente ainda não tem pedidos.</Vazio>
      ) : (
        <ul className="divide-y divide-slate-100">
          {pedidos.map((p) => (
            <li key={p.id}>
              <Link to={`/pedidos/${p.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-slate-50">
                <div>
                  <p className="font-medium">
                    #{p.numero} · {moeda(p.valor_total)}
                  </p>
                  <p className="text-slate-500">Criado em {data(p.created_at)}</p>
                </div>
                <SeloStatus status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
