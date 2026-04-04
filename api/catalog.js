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
    const catsRaw = await fetchJson(base + '/categories')
    const categorias = catsRaw.categories || []

    const fetchAll = async (path) => {
      const pageSize = 250
      let all = []

      const baseSep = path.includes('?') ? '&' : '?'
      let url = base + path + `${baseSep}limit=${pageSize}`
      let iterations = 0
      const maxIterations = 50

      while (url && iterations < maxIterations) {
        iterations++
        const chunk = await fetchJson(url)
        const arr = chunk.items || chunk.inventory_levels || chunk.categories || []
        if (!Array.isArray(arr) || arr.length === 0) break
        all = all.concat(arr)

        const nextCursor = chunk.next_cursor || chunk.nextCursor || chunk.next || chunk.cursor
        if (nextCursor) {
          const sep = path.includes('?') ? '&' : '?'
          url = base + path + `${sep}limit=${pageSize}&cursor=${encodeURIComponent(nextCursor)}`
          continue
        }

        if (arr.length < pageSize) break

        const sep = path.includes('?') ? '&' : '?'
        url = base + path + `${sep}limit=${pageSize}&offset=${all.length}`
      }

      return all
    }

    const items = await fetchAll('/items')
    const inventory = await fetchAll('/inventory')

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
