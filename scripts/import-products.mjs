/**
 * Script de importación de productos desde Inventario.csv
 * Uso: node scripts/import-products.mjs <business_id>
 *
 * Ejemplo:
 *   node scripts/import-products.mjs xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Configuración ──────────────────────────────────────────────
const SUPABASE_URL      = 'https://olqvxiisyfrfkdptqtpk.supabase.co'
const CSV_PATH          = path.resolve(__dirname, '../../Inventario.csv')

const BUSINESS_ID       = process.argv[2]
const SERVICE_ROLE_KEY  = process.argv[3]

if (!BUSINESS_ID || !SERVICE_ROLE_KEY) {
  console.error('❌  Faltan argumentos.')
  console.error('   Uso: node scripts/import-products.mjs <business_id> <service_role_key>')
  console.error('\n   El service_role key está en:')
  console.error('   Supabase → Project Settings → Data API → service_role (secret)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ── Parsear CSV ────────────────────────────────────────────────
function parseCSV(filePath) {
  const raw  = fs.readFileSync(filePath, 'utf-8')
  const lines = raw.split(/\r?\n/).filter(l => l.trim())
  const products = []

  for (let i = 1; i < lines.length; i++) {
    // Manejar campos con comas dentro de comillas
    const cols = []
    let current = ''
    let inQuotes = false
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ''; continue }
      current += ch
    }
    cols.push(current.trim())

    if (cols.length < 4) continue

    const categoria  = cols[0]?.trim() || 'General'
    const nombre     = cols[1]?.trim()
    const precioRaw  = cols[2]?.replace(/[$,]/g, '').trim()
    const stockRaw   = cols[3]?.trim()

    if (!nombre) continue

    const precio = parseFloat(precioRaw) || 0
    const stock  = parseInt(stockRaw)    || 0

    products.push({ categoria, nombre, precio, stock })
  }

  return products
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log(`\n📦  Leyendo ${CSV_PATH}...`)
  const rows = parseCSV(CSV_PATH)
  console.log(`✅  ${rows.length} productos encontrados.\n`)

  // 1. Obtener categorías únicas
  const categoryNames = [...new Set(rows.map(r => r.categoria.toLowerCase()))]
  console.log(`🏷️   Categorías detectadas: ${categoryNames.join(', ')}\n`)

  // 2. Crear categorías que no existan
  const categoryMap = {}    // nombre_lower → UUID

  for (const catName of categoryNames) {
    // Buscar si ya existe
    const { data: existing } = await supabase
      .from('categories')
      .select('id, name')
      .eq('business_id', BUSINESS_ID)
      .ilike('name', catName)
      .maybeSingle()

    if (existing) {
      categoryMap[catName] = existing.id
      console.log(`  ♻️  Categoría existente: "${existing.name}" → ${existing.id}`)
    } else {
      const displayName = catName.charAt(0).toUpperCase() + catName.slice(1)
      const { data: newCat, error } = await supabase
        .from('categories')
        .insert({ business_id: BUSINESS_ID, name: displayName })
        .select('id')
        .single()

      if (error) {
        console.error(`  ❌  Error creando categoría "${catName}":`, error.message)
        continue
      }
      categoryMap[catName] = newCat.id
      console.log(`  ✅  Categoría creada: "${displayName}" → ${newCat.id}`)
    }
  }

  console.log('\n')

  // 3. Insertar productos uno por uno (maneja duplicados)
  let inserted = 0, skipped = 0

  const productsToInsert = rows.map(r => ({
    business_id:  BUSINESS_ID,
    category_id:  categoryMap[r.categoria.toLowerCase()] || null,
    name:         r.nombre,
    price:        r.precio,
    stock:        r.stock,
    min_stock:    3,
    status:       'active',
    is_featured:  false,
  }))

  for (let i = 0; i < productsToInsert.length; i++) {
    const product = productsToInsert[i]
    const { error } = await supabase.from('products').insert(product)

    if (error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        // Reintentar con precio en el nombre para diferenciar
        const fallbackName = `${product.name} ($${product.price})`
        const { error: err2 } = await supabase.from('products').insert({ ...product, name: fallbackName })
        if (err2) {
          console.error(`\n  ⚠️   Saltando "${product.name}": ${err2.message}`)
          skipped++
        } else {
          console.log(`\n  🔄  Renombrado: "${product.name}" → "${fallbackName}"`)
          inserted++
        }
      } else {
        console.error(`\n  ❌  Error en "${product.name}": ${error.message}`)
        skipped++
      }
    } else {
      inserted++
      process.stdout.write(`  📥  Importados: ${inserted}/${productsToInsert.length}\r`)
    }
  }

  console.log(`\n\n🎉  Importación completa.`)
  console.log(`   ✅  Insertados:  ${inserted}`)
  if (skipped) console.log(`   ⚠️   Saltados:    ${skipped}`)
}

main().catch(err => { console.error('Error fatal:', err); process.exit(1) })
