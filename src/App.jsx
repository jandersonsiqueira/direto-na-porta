import React, { useEffect, useState } from 'react'

function formatPrice(v) {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function App() {
  const [catalog, setCatalog] = useState({})
  const [q, setQ] = useState('')
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
  }, [cart])

  const addToCart = (prod) => {
    setCart(prev => {
      const idx = prev.findIndex(p => p.variant_id === prod.variant_id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx].qty += 1
        return copy
      }
      return [...prev, { ...prod, qty: 1, note: '' }]
    })
  }

  const updateQty = (variant_id, qty) => {
    setCart(prev => prev.map(p => p.variant_id === variant_id ? { ...p, qty: Math.max(0, qty) } : p).filter(p => p.qty > 0))
  }

  const updateNote = (variant_id, note) => {
    setCart(prev => prev.map(p => p.variant_id === variant_id ? { ...p, note } : p))
  }

  const total = cart.reduce((s, i) => s + Number(i.price || 0) * i.qty, 0)

  const checkoutWhatsApp = () => {
    if (cart.length === 0) { alert('Carrinho vazio'); return }
    const lines = []
    lines.push('NOVO PEDIDO - DIRETO NA PORTA')
    lines.push('')
    cart.forEach((it, idx) => {
      lines.push(`${idx+1}. ${it.nome} — ${it.qty} x R$ ${formatPrice(it.price)} = R$ ${formatPrice(it.price * it.qty)}`)
      if (it.note) lines.push(`Observação: ${it.note}`)
    })
    lines.push('')
    lines.push(`Total: R$ ${formatPrice(total)}`)
    lines.push('')
    lines.push('Obrigado!')

    const message = encodeURIComponent(lines.join('\n'))
    const waNumber = '5585921963325' // formado como 55 + DDD + numero
    const waLink = `https://wa.me/${waNumber}?text=${message}`
    window.open(waLink, '_blank')
  }

  const categorias = Object.keys(catalog).sort()

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20, fontFamily: 'Segoe UI, Roboto, Arial' }}>
      <header style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1>📦 DIRETO NA PORTA</h1>
        <p style={{ color: '#666' }}>Itens disponíveis agora no seu condomínio</p>
        <input placeholder="Buscar produto..." value={q} onChange={e => setQ(e.target.value)} style={{ width: '60%', padding: 8 }} />
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
  
          {categorias.map(cat => {
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
                        <button onClick={() => addToCart(prod)} style={{ padding: '8px 12px', background:'#2e7d32', color:'#fff', border: 'none', borderRadius:6 }}>Adicionar</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </section>

        <aside style={{ width: 340, borderLeft: '1px solid #eee', paddingLeft: 20 }}>
          <h3>Carrinho</h3>
          {cart.length === 0 && <p style={{ color: '#999' }}>Seu carrinho está vazio</p>}
          {cart.map(item => (
            <div key={item.variant_id} style={{ marginBottom: 12 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <strong>{item.nome}</strong>
                <span>R$ {formatPrice(item.price * item.qty)}</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <input type="number" value={item.qty} onChange={e => updateQty(item.variant_id, Number(e.target.value))} min={0} style={{ width: 60 }} />
                <input placeholder="Observação" value={item.note} onChange={e => updateNote(item.variant_id, e.target.value)} style={{ width: '100%', marginTop:6 }} />
              </div>
            </div>
          ))}
          <hr />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop: 8 }}>
            <strong>Total</strong>
            <strong>R$ {formatPrice(total)}</strong>
          </div>
          <button onClick={checkoutWhatsApp} style={{ width:'100%', marginTop: 12, padding: 12, background:'#25D366', color:'#fff', border: 'none', borderRadius:6 }}>Finalizar pelo WhatsApp</button>
        </aside>
      </main>
    </div>
  )
}
