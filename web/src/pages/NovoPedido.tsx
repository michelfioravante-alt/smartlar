import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { mensagemErro, moeda, subtotalPrevia } from '../lib/formato'
import { CATEGORIA_LABEL, PAGAMENTO_LABEL, type Cliente, type FormaPagamento, type Produto } from '../lib/tipos'
import { FormCliente } from '../components/FormCliente'
import { AreaTexto, Aviso, Botao, Campo, Card, Carregando, Entrada, Pagina, Selecao, Vazio } from '../components/ui'

interface ItemCarrinho {
  produto: Produto
  quantidade: number
}

export function NovoPedido() {
  const navegar = useNavigate()
  const [params] = useSearchParams()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carregando, setCarregando] = useState(true)

  const [clienteId, setClienteId] = useState(params.get('cliente') ?? '')
  const [cadastrandoCliente, setCadastrandoCliente] = useState(false)

  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [itens, setItens] = useState<ItemCarrinho[]>([])

  const [observacoes, setObservacoes] = useState('')
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | ''>('')

  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
    ]).then(([c, p]) => {
      if (c.error || p.error) setErro(mensagemErro(c.error ?? p.error))
      setClientes((c.data as Cliente[]) ?? [])
      setProdutos((p.data as Produto[]) ?? [])
      setCarregando(false)
    })
  }, [])

  const cliente = clientes.find((c) => c.id === clienteId)
  const produtoSelecionado = produtos.find((p) => p.id === produtoId)

  const total = useMemo(
    () => itens.reduce((soma, i) => soma + subtotalPrevia(i.produto.preco_unitario, i.quantidade), 0),
    [itens],
  )

  function adicionarItem() {
    if (!produtoSelecionado || quantidade < 1) return
    setItens((atual) => {
      const existente = atual.find((i) => i.produto.id === produtoSelecionado.id)
      if (existente) {
        return atual.map((i) =>
          i.produto.id === produtoSelecionado.id ? { ...i, quantidade: i.quantidade + quantidade } : i,
        )
      }
      return [...atual, { produto: produtoSelecionado, quantidade }]
    })
    setProdutoId('')
    setQuantidade(1)
  }

  function alterarQuantidade(id: string, qtd: number) {
    if (!Number.isFinite(qtd) || qtd < 1) return
    setItens((atual) => atual.map((i) => (i.produto.id === id ? { ...i, quantidade: Math.floor(qtd) } : i)))
  }

  function removerItem(id: string) {
    setItens((atual) => atual.filter((i) => i.produto.id !== id))
  }

  async function salvar() {
    setErro(null)
    if (!clienteId) return setErro('Selecione o cliente.')
    if (itens.length === 0) return setErro('Adicione pelo menos um produto.')

    setSalvando(true)
    const { data: pedidoId, error } = await supabase.rpc('criar_pedido', {
      p_cliente_id: clienteId,
      p_itens: itens.map((i) => ({ produto_id: i.produto.id, quantidade: i.quantidade })),
      p_observacoes: observacoes,
      p_forma_pagamento: formaPagamento || null,
    })
    setSalvando(false)

    if (error) return setErro(mensagemErro(error))
    navegar(`/pedidos/${pedidoId}?criado=1`)
  }

  if (carregando) return <Pagina titulo="Novo pedido"><Carregando /></Pagina>

  return (
    <Pagina titulo="Novo pedido" subtitulo="O pedido é salvo como orçamento e pode ser aprovado depois.">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card titulo="1. Cliente">
            {cadastrandoCliente ? (
              <FormCliente
                aoCancelar={() => setCadastrandoCliente(false)}
                aoSalvar={(novo) => {
                  setClientes((atual) => [...atual, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
                  setClienteId(novo.id)
                  setCadastrandoCliente(false)
                }}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Selecao value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="flex-1">
                    <option value="">Selecione um cliente…</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} · {c.telefone}
                      </option>
                    ))}
                  </Selecao>
                  <Botao variante="secundario" onClick={() => setCadastrandoCliente(true)}>
                    + Cadastrar novo
                  </Botao>
                </div>
                {cliente && (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <p>📍 {cliente.endereco}{cliente.bairro ? ` · ${cliente.bairro}` : ''} · {cliente.cidade}</p>
                    {cliente.observacoes && <p className="mt-1 text-amber-700">⚠️ {cliente.observacoes}</p>}
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card titulo="2. Produtos">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Campo rotulo="Produto">
                <Selecao value={produtoId} onChange={(e) => setProdutoId(e.target.value)} className="sm:min-w-72">
                  <option value="">Selecione…</option>
                  {Object.entries(CATEGORIA_LABEL).map(([cat, rotulo]) => (
                    <optgroup key={cat} label={rotulo}>
                      {produtos
                        .filter((p) => p.categoria === cat)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} · {moeda(p.preco_unitario)}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Qtd.">
                <Entrada
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  className="sm:w-20"
                />
              </Campo>
              <div className="text-sm text-slate-500 sm:pb-2 sm:min-w-28">
                {produtoSelecionado && <>= {moeda(subtotalPrevia(produtoSelecionado.preco_unitario, quantidade))}</>}
              </div>
              <Botao onClick={adicionarItem} disabled={!produtoSelecionado}>
                Adicionar
              </Botao>
            </div>

            <div className="mt-4">
              {itens.length === 0 ? (
                <Vazio>Nenhum produto adicionado.</Vazio>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="py-2 pr-3">Produto</th>
                        <th className="py-2 pr-3 text-right">Preço un.</th>
                        <th className="py-2 pr-3 text-center">Qtd.</th>
                        <th className="py-2 pr-3 text-right">Subtotal</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itens.map((i) => (
                        <tr key={i.produto.id}>
                          <td className="py-2 pr-3 font-medium">{i.produto.nome}</td>
                          <td className="whitespace-nowrap py-2 pr-3 text-right">{moeda(i.produto.preco_unitario)}</td>
                          <td className="py-2 pr-3 text-center">
                            <Entrada
                              type="number"
                              min={1}
                              value={i.quantidade}
                              onChange={(e) => alterarQuantidade(i.produto.id, Number(e.target.value))}
                              className="w-20 text-center"
                            />
                          </td>
                          <td className="whitespace-nowrap py-2 pr-3 text-right font-semibold">
                            {moeda(subtotalPrevia(i.produto.preco_unitario, i.quantidade))}
                          </td>
                          <td className="py-2 text-right">
                            <Botao variante="fantasma" onClick={() => removerItem(i.produto.id)} aria-label="Remover">
                              ✕
                            </Botao>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          <Card titulo="3. Detalhes">
            <div className="space-y-3">
              <Campo rotulo="Observações" dica='Ex.: "portão eletrônico antigo, verificar compatibilidade"'>
                <AreaTexto value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
              </Campo>
              <Campo rotulo="Forma de pagamento (opcional)" dica="Pode ser definida depois, ao aprovar ou concluir.">
                <Selecao value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento | '')}>
                  <option value="">A definir</option>
                  {Object.entries(PAGAMENTO_LABEL).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card titulo="Resumo">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Cliente</dt>
                <dd className="text-right font-medium">{cliente?.nome ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Itens</dt>
                <dd className="font-medium">{itens.reduce((s, i) => s + i.quantidade, 0)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-t border-slate-100 pt-3">
                <dt className="font-semibold">Total</dt>
                <dd className="text-2xl font-bold text-marca-700">{moeda(total)}</dd>
              </div>
            </dl>
            {erro && <div className="mt-3"><Aviso>{erro}</Aviso></div>}
            <Botao className="mt-4 w-full" onClick={salvar} disabled={salvando || !clienteId || itens.length === 0}>
              {salvando ? 'Salvando…' : 'Salvar como orçamento'}
            </Botao>
            <p className="mt-2 text-xs text-slate-500">O total oficial é recalculado pelo banco ao salvar.</p>
          </Card>
        </aside>
      </div>
    </Pagina>
  )
}
