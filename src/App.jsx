import React, { useEffect, useState } from 'react'

function formatPrice(v) {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function App() {
  const [catalog, setCatalog] = useState({})
  const [q, setQ] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [orderNote, setOrderNote] = useState(() => localStorage.getItem('orderNote') || '')
  const [paymentMethod, setPaymentMethod] = useState(() => localStorage.getItem('paymentMethod') || 'Pix')

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 800)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/catalog')
        // Debug info
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          console.error('Fetch /api/catalog error', res.status, text)
          if (!mounted) return
          setError(`Erro ao buscar catálogo: ${res.status} ${res.statusText}`)
          setCatalog({})
          return
        }

        const data = await res.json()
        if (!mounted) return
        setCatalog(data.catalog || {})
      } catch (err) {
        console.error('Fetch /api/catalog exception', err)
        if (!mounted) return
        setError(err.message || String(err))
        setCatalog({})
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
    localStorage.setItem('orderNote', orderNote)
    localStorage.setItem('paymentMethod', paymentMethod)
  }, [cart, orderNote, paymentMethod])

  const addToCart = (prod) => {
    setCart(prev => {
      const idx = prev.findIndex(p => p.variant_id === prod.variant_id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx].qty += 1
        return copy
      }
      return [...prev, { ...prod, qty: 1 }]
    })
    // show quick visual feedback on FAB
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
    // open cart on mobile when an item is added
    //setCartOpen(true)
  }

  const updateQty = (variant_id, qty) => {
    setCart(prev => prev.map(p => p.variant_id === variant_id ? { ...p, qty: Math.max(0, qty) } : p).filter(p => p.qty > 0))
  }

  // increment / decrement helpers for +/- buttons
  const incQty = (variant_id) => {
    setCart(prev => prev.map(p => p.variant_id === variant_id ? { ...p, qty: p.qty + 1 } : p))
  }

  const decQty = (variant_id) => {
    setCart(prev => prev.map(p => p.variant_id === variant_id ? { ...p, qty: Math.max(0, p.qty - 1) } : p).filter(p => p.qty > 0))
  }

  const removeItem = (variant_id) => {
    setCart(prev => prev.filter(p => p.variant_id !== variant_id))
  }

  // handlers for order meta
  const onChangeOrderNote = (v) => setOrderNote(v)
  const onChangePaymentMethod = (v) => setPaymentMethod(v)

  const total = cart.reduce((s, i) => s + Number(i.price || 0) * i.qty, 0)

  const checkoutWhatsApp = () => {
    if (cart.length === 0) { alert('Carrinho vazio'); return }
    const lines = []
    lines.push('NOVO PEDIDO - DIRETO NA PORTA')
    lines.push('')
    cart.forEach((it, idx) => {
      lines.push(`${idx+1}. ${it.nome} — ${it.qty} x R$ ${formatPrice(it.price)} = R$ ${formatPrice(it.price * it.qty)}`)
    })
    lines.push('')
    lines.push(`Total: R$ ${formatPrice(total)}`)
    lines.push('')
    lines.push(`Forma de pagamento: ${paymentMethod}`)
    if (orderNote && orderNote.trim()) {
      lines.push('')
      lines.push(`Observação do pedido: ${orderNote.trim()}`)
    }
    lines.push('')
    lines.push('Obrigado!')

    const message = encodeURIComponent(lines.join('\n'))
    const waNumber = '5585921963325' // formado como 55 + DDD + numero
    const waLink = `https://wa.me/${waNumber}?text=${message}`
    window.open(waLink, '_blank')
    // limpar carrinho e dados persistidos após finalizar o pedido e fechar o painel
    try {
      // reset state
      setCart([])
      setOrderNote('')
      setPaymentMethod('Pix')
      setCartOpen(false)
      // explicitly write cleared values to localStorage so returning to the page starts from zero
      localStorage.setItem('cart', JSON.stringify([]))
      localStorage.setItem('orderNote', '')
      localStorage.setItem('paymentMethod', 'Pix')
    } catch (e) {
      console.warn('Erro ao limpar localStorage após checkout', e)
    }
  }

  const categorias = Object.keys(catalog).sort()
  const categoriasToShow = (selectedCategory && selectedCategory !== 'Todos') ? [selectedCategory] : categorias

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20, fontFamily: 'Segoe UI, Roboto, Arial' }}>
      <header style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1>📦 DIRETO NA PORTA</h1>
        <p style={{ color: '#666' }}>Seu Mercado no Condomínio</p>
        <input className="search-input" placeholder="Buscar produto..." value={q} onChange={e => setQ(e.target.value)} />
        {/* Category filter select (label above the select) */}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'left', flexDirection: 'column', alignItems: 'flex-start' }}>
          <label htmlFor="category-select" style={{ marginBottom: 6, fontWeight: 700 }}>Categoria</label>
          <select id="category-select" className="category-select" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
            <option value="Todos">Todos</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
       </header>

      <main style={{ display: 'flex', gap: 20 }}>
        <section style={{ flex: 1 }}>
          {loading && <p>Carregando catálogo...</p>}
          {!loading && error && (
            <div style={{ color: '#b00020', marginBottom: 12 }}>
              <p>Erro ao carregar catálogo: {error}</p>
              <p style={{ fontSize: 12, color: '#666' }}>Se estiver em desenvolvimento local, a rota <code>/api/catalog</code> não existe por padrão — na Vercel essa rota funciona. Clique para abrir a rota e ver o corpo da resposta.</p>
              <button onClick={() => window.open('/api/catalog', '_blank')} style={{ padding: '6px 10px', borderRadius: 6 }}>Abrir /api/catalog</button>
            </div>
          )}
          {!loading && !error && categorias.length === 0 && <p>Nenhum item disponível no momento.</p>}
  
          {categoriasToShow.map(cat => {
            const prods = (catalog[cat] || []).filter(p => p.nome.toLowerCase().includes(q.toLowerCase()))
            if (prods.length === 0) return null
            return (
              <div key={cat} style={{ marginBottom: 20 }}>
                <h3 style={{ background: '#f4f4f4', padding: 8, borderRadius: 6 }}>{cat}</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {prods.sort((a,b) => a.nome.localeCompare(b.nome)).map(prod => (
                    <li key={prod.variant_id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, borderBottom: '1px solid #eee' }}>
                      <img src={prod.image_url || 'https://via.placeholder.com/80'} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16 }}>{prod.nome}</div>
                        <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>R$ {formatPrice(prod.price)}</div>
                      </div>
                      <div>
                        <button onClick={() => { addToCart(prod) }} style={{ padding: '8px 12px', background:'#2e7d32', color:'#fff', border: 'none', borderRadius:6 }}>Adicionar</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </section>

        {isMobile ? (
          <>
            {cartOpen && <div className="cart-backdrop" onClick={() => setCartOpen(false)} />}
            {cartOpen && (
              <aside className={`cart-panel open`} style={{ paddingLeft: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Carrinho</h3>
                </div>
                {cart.length === 0 && <p style={{ color: '#999' }}>Seu carrinho está vazio</p>}
                {cart.map(item => (
                  <div key={item.variant_id} className="cart-item" style={{ marginBottom: 10 }}>
                    <img src={item.image_url || 'https://via.placeholder.com/80'} alt="thumb" />
                    <div className="meta">
                      <div className="name">{item.nome}</div>
                      <div className="price">R$ {formatPrice(item.price * item.qty)}</div>
                    </div>
                    <div className="controls">
                      <div className="qty-controls">
                        <div className="qty-count">{item.qty}</div>
                        <button className="qty-btn dec" aria-label={`Diminuir quantidade de ${item.nome}`} onClick={() => decQty(item.variant_id)}>−</button>
                        <button className="qty-btn inc" aria-label={`Aumentar quantidade de ${item.nome}`} onClick={() => incQty(item.variant_id)}>+</button>
                      </div>
                      <button className="remove-btn" aria-label={`Remover ${item.nome}`} onClick={() => removeItem(item.variant_id)}>🗑️</button>
                    </div>
                  </div>
                ))}
                {/* order-level fields */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontWeight: 700 }}>Forma de pagamento</label>
                  <select value={paymentMethod} onChange={e => onChangePaymentMethod(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 6 }}>
                    <option>Pix</option>
                    <option>Cartão de Crédito</option>
                    <option>Cartão de Débito</option>
                    <option>Dinheiro</option>
                  </select>
                  {paymentMethod === 'Pix' && (
                    <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: '#f7fff7', border: '1px solid #e6f3ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>Chave Pix (CNPJ)</div>
                        <div style={{ color: '#333', fontFamily: 'monospace', marginTop: 6 }}>64637329000140</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                        <button onClick={() => navigator.clipboard?.writeText('64637329000140')} style={{ padding: '6px 10px', borderRadius: 6, background: '#2e7d32', color: '#fff', border: 'none' }}>Copiar</button>
                        <div style={{ fontSize: 12, color: '#666' }}>Envie o comprovante pelo WhatsApp</div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontWeight: 700 }}>Observação geral do pedido</label>
                  <textarea value={orderNote} onChange={e => onChangeOrderNote(e.target.value)} placeholder="Ex: Deixar na maçaneta ou próximo a porta." style={{ width: '100%', padding: 8, marginTop: 6 }} rows={3} />
                </div>
                 <hr />
                 <div style={{ display:'flex', justifyContent:'space-between', marginTop: 8 }}>
                   <strong>Total</strong>
                   <strong>R$ {formatPrice(total)}</strong>
                 </div>
                 <button onClick={checkoutWhatsApp} style={{ width:'100%', marginTop: 12, padding: 12, background:'#25D366', color:'#fff', border: 'none', borderRadius:6 }} className="checkout-btn">Finalizar pelo WhatsApp</button>
               </aside>
            )}
            <button className={`fab-cart ${justAdded ? 'added' : ''}`} onClick={() => setCartOpen(prev => !prev)} aria-label="Abrir carrinho" title="Carrinho">
              <span style={{ fontSize: 18 }}>🛒</span>
              <span className="count">{cart.length}</span>
            </button>
          </>
        ) : (
          <aside className="cart-panel desktop" style={{ width: 340, borderLeft: '1px solid #eee', paddingLeft: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Carrinho</h3>
            </div>
            {cart.length === 0 && <p style={{ color: '#999' }}>Seu carrinho está vazio</p>}
            {cart.map(item => (
              <div key={item.variant_id} className="cart-item" style={{ marginBottom: 10 }}>
                <img src={item.image_url || 'https://via.placeholder.com/80'} alt="thumb" />
                <div className="meta">
                  <div className="name">{item.nome}</div>
                  <div className="price">R$ {formatPrice(item.price * item.qty)}</div>
                </div>
                <div className="controls">
                  <div className="qty-controls">
                    <div className="qty-count">{item.qty}</div>
                    <button className="qty-btn dec" aria-label={`Diminuir quantidade de ${item.nome}`} onClick={() => decQty(item.variant_id)}>−</button>
                    <button className="qty-btn inc" aria-label={`Aumentar quantidade de ${item.nome}`} onClick={() => incQty(item.variant_id)}>+</button>
                  </div>
                  <button className="remove-btn" aria-label={`Remover ${item.nome}`} onClick={() => removeItem(item.variant_id)}>🗑️</button>
                </div>
              </div>
            ))}
            {/* order-level fields */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 700 }}>Forma de pagamento</label>
              <select value={paymentMethod} onChange={e => onChangePaymentMethod(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 6 }}>
                <option>Pix</option>
                <option>Cartão de Crédito</option>
                <option>Cartão de Débito</option>
                <option>Dinheiro</option>
              </select>
              {paymentMethod === 'Pix' && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: '#f7fff7', border: '1px solid #e6f3ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Chave Pix (CNPJ)</div>
                    <div style={{ color: '#333', fontFamily: 'monospace', marginTop: 6 }}>64637329000140</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <button onClick={() => navigator.clipboard?.writeText('64637329000140')} style={{ padding: '6px 10px', borderRadius: 6, background: '#2e7d32', color: '#fff', border: 'none' }}>Copiar</button>
                    <div style={{ fontSize: 12, color: '#666' }}>Envie o comprovante pelo WhatsApp</div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 700 }}>Observação geral do pedido</label>
              <textarea value={orderNote} onChange={e => onChangeOrderNote(e.target.value)} placeholder="Ex: Deixar na maçaneta ou próximo a porta." style={{ width: '100%', padding: 8, marginTop: 6 }} rows={3} />
            </div>
            <hr />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop: 8 }}>
              <strong>Total</strong>
              <strong>R$ {formatPrice(total)}</strong>
            </div>
            <button onClick={checkoutWhatsApp} style={{ width:'100%', marginTop: 12, padding: 12, background:'#25D366', color:'#fff', border: 'none', borderRadius:6 }} className="checkout-btn">Finalizar pelo WhatsApp</button>
          </aside>
        )}
       </main>
     </div>
   )
 }
