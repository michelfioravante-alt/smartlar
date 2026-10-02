import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { mensagemErro, moeda } from '../lib/formato'
import { CATEGORIA_LABEL, type Categoria, type Produto } from '../lib/tipos'
import { AreaTexto, Aviso, Botao, Campo, Card, Carregando, Entrada, Modal, Pagina, Selecao } from '../components/ui'

const CATEGORIAS = Object.keys(CATEGORIA_LABEL) as Categoria[]

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [novoAberto, setNovoAberto] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)

  async function carregar() {
    const { data, error } = await supabase.from('produtos').select('*').order('nome')
    if (error) setErro(mensagemErro(error))
    setProdutos((data as Produto[]) ?? [])
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  return (
    <Pagina
      titulo="Catálogo de produtos"
      subtitulo="Produtos organizados por categoria"
      acoes={<Botao onClick={() => setNovoAberto(true)}>+ Novo produto</Botao>}
    >
      <div className="space-y-4">
        {sucesso && <Aviso tipo="sucesso">{sucesso}</Aviso>}
        {erro && <Aviso>{erro}</Aviso>}
        {carregando ? (
          <Carregando />
        ) : (
          CATEGORIAS.map((cat) => {
            const daCategoria = produtos.filter((p) => p.categoria === cat)
            if (daCategoria.length === 0) return null
            return (
              <Card key={cat} titulo={`${CATEGORIA_LABEL[cat]} (${daCategoria.length})`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="py-2 pr-3">Produto</th>
                        <th className="py-2 pr-3">Descrição</th>
                        <th className="py-2 pr-3 text-right">Preço</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {daCategoria.map((p) => (
                        <tr key={p.id} className={p.ativo ? '' : 'text-slate-400'}>
                          <td className="py-2 pr-3 font-medium">
                            {p.nome}
                            {!p.ativo && <span className="ml-2 text-xs">(inativo)</span>}
                          </td>
                          <td className="py-2 pr-3 text-slate-500">{p.descricao}</td>
                          <td className="whitespace-nowrap py-2 pr-3 text-right font-semibold">{moeda(p.preco_unitario)}</td>
                          <td className="py-2 text-right">
                            <Botao variante="fantasma" onClick={() => setEditando(p)}>
                              Editar
                            </Botao>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          })
        )}
      </div>

      <Modal titulo="Novo produto" aberto={novoAberto} aoFechar={() => setNovoAberto(false)}>
        <FormProduto
          aoSalvar={(p) => {
            setNovoAberto(false)
            setSucesso(`Produto "${p.nome}" cadastrado.`)
            carregar()
          }}
        />
      </Modal>

      <Modal titulo="Editar produto" aberto={!!editando} aoFechar={() => setEditando(null)}>
        {editando && (
          <FormProduto
            produto={editando}
            aoSalvar={(p) => {
              setEditando(null)
              setSucesso(`Produto "${p.nome}" atualizado.`)
              carregar()
            }}
          />
        )}
      </Modal>
    </Pagina>
  )
}

function FormProduto({ produto, aoSalvar }: { produto?: Produto; aoSalvar: (p: Produto) => void }) {
  const [nome, setNome] = useState(produto?.nome ?? '')
  const [categoria, setCategoria] = useState<Categoria>(produto?.categoria ?? 'seguranca')
  const [preco, setPreco] = useState(produto ? String(produto.preco_unitario) : '')
  const [descricao, setDescricao] = useState(produto?.descricao ?? '')
  const [ativo, setAtivo] = useState(produto?.ativo ?? true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    const valor = Number(preco.replace(',', '.'))
    if (!Number.isFinite(valor) || valor < 0) {
      setErro('Informe um preço válido.')
      return
    }
    const dados = {
      nome: nome.trim(),
      categoria,
      preco_unitario: Math.round(valor * 100) / 100,
      descricao: descricao.trim() || null,
      ativo,
    }
    setSalvando(true)
    const resposta = produto
      ? await supabase.from('produtos').update(dados).eq('id', produto.id).select().single<Produto>()
      : await supabase.from('produtos').insert(dados).select().single<Produto>()
    setSalvando(false)
    if (resposta.error) {
      setErro(mensagemErro(resposta.error))
      return
    }
    aoSalvar(resposta.data)
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <Campo rotulo="Nome" obrigatorio>
        <Entrada value={nome} onChange={(e) => setNome(e.target.value)} required />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Categoria" obrigatorio>
          <Selecao value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_LABEL[c]}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Preço unitário (R$)" obrigatorio>
          <Entrada value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" placeholder="0,00" required />
        </Campo>
      </div>
      <Campo rotulo="Descrição">
        <AreaTexto value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
      </Campo>
      {produto && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Produto ativo (aparece para novos pedidos)
        </label>
      )}
      {produto && (
        <p className="text-xs text-slate-500">
          Alterar o preço vale só para pedidos novos. Pedidos já criados mantêm o preço da época.
        </p>
      )}
      {erro && <Aviso>{erro}</Aviso>}
      <Botao type="submit" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar'}
      </Botao>
    </form>
  )
}
