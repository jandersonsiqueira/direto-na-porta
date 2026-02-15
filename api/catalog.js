export default async function handler(req, res) {
  const token = process.env.LOYVERSE_TOKEN
  if (!token) return res.status(500).json({ error: 'LOYVERSE_TOKEN not configured' })

  const base = 'https://api.loyverse.com/v1.0'
  const fetchJson = async (url) => {
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
    if (!r.ok) throw new Error(`Bad response ${r.status} for ${url}`)
    return r.json()
  }

  try {
    const [catsRaw, itemsRaw, invRaw] = await Promise.all([
      fetchJson(base + '/categories'),
      fetchJson(base + '/items?limit=250'),
      fetchJson(base + '/inventory?limit=250')
    ])

    const categorias = catsRaw.categories || []
    const items = itemsRaw.items || []
    const inventory = invRaw.inventory_levels || []

    const estoqueMap = {}
    inventory.forEach(i => { estoqueMap[i.variant_id] = i.in_stock })

    const catMap = {}
    categorias.forEach(c => { catMap[c.id] = c.name })

    const grouped = {}
    items.forEach(item => {
      const variante = item.variants?.[0]
      if (!variante) return
      const loja = variante.stores?.[0] || {}
      const estoqueReal = estoqueMap[variante.variant_id] || 0
      const temRastreio = item.track_stock === true
      const temEstoque = estoqueReal > 0
      const exibir = loja.available_for_sale && temRastreio && temEstoque
      if (!exibir) return

      const nomeCat = catMap[item.category_id] || 'DIVERSOS'
      if (!grouped[nomeCat]) grouped[nomeCat] = []
      grouped[nomeCat].push({
        id: item.id,
        nome: item.item_name,
        price: loja.price ?? 0,
        currency: loja.currency ?? 'BRL',
        image_url: item.image_url || null,
        variant_id: variante.variant_id
      })
    })

    res.setHeader('Content-Type', 'application/json')
    res.status(200).json({ catalog: grouped })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
