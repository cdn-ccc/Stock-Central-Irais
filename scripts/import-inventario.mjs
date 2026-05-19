import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim()
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan variables en .env.local: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// --- CSV Parser ---
function parseCSV(content) {
  const rows = []
  let i = content.charCodeAt(0) === 0xfeff ? 1 : 0
  while (i < content.length) {
    const { fields, nextPos } = parseRow(content, i)
    i = nextPos
    if (fields.length > 0 && fields.some(f => f)) rows.push(fields)
  }
  return rows
}

function parseRow(content, startPos) {
  const fields = []
  let i = startPos
  let field = ''
  let inQuotes = false

  while (i < content.length) {
    const ch = content[i]
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') { field += '"'; i += 2 }
        else { inQuotes = false; i++ }
      } else { field += ch; i++ }
    } else {
      if (ch === '"') { inQuotes = true; i++ }
      else if (ch === ',') { fields.push(field.trim()); field = ''; i++ }
      else if (ch === '\r') {
        if (content[i + 1] === '\n') i++
        fields.push(field.trim())
        return { fields, nextPos: i + 1 }
      } else if (ch === '\n') {
        fields.push(field.trim())
        return { fields, nextPos: i + 1 }
      } else { field += ch; i++ }
    }
  }
  if (field || fields.length > 0) fields.push(field.trim())
  return { fields, nextPos: i }
}

function parsePrice(str) {
  return parseFloat(str.replace(/[$,\s]/g, '')) || 0
}

function cleanName(str) {
  return str.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
}

// --- Cleanup: elimina negocio existente y su usuario auth para poder reiniciar limpio ---
async function cleanup() {
  console.log('0. Limpiando datos previos (si existen)...')

  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', 'distribuidora-irais')
    .maybeSingle()

  if (!existing) { console.log('   Nada que limpiar\n'); return }

  const bizId = existing.id

  // Eliminar en orden por FK
  await supabase.from('products').delete().eq('business_id', bizId)
  await supabase.from('categories').delete().eq('business_id', bizId)

  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('business_id', bizId)

  for (const u of users ?? []) {
    await supabase.auth.admin.deleteUser(u.id)
  }

  await supabase.from('users').delete().eq('business_id', bizId)
  await supabase.from('businesses').delete().eq('id', bizId)

  console.log(`   Negocio anterior eliminado (${bizId})\n`)
}

// --- Main ---
async function main() {
  const csvPath = resolve(__dirname, '../../Inventario.csv')
  const content = readFileSync(csvPath, 'utf8')
  const rows = parseCSV(content)
  const [, ...dataRows] = rows
  const validRows = dataRows.filter(r => r[1]?.trim())
  console.log(`CSV leído: ${validRows.length} productos\n`)

  await cleanup()

  // 1. Crear negocio
  console.log('1. Creando negocio...')
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .insert({
      name: 'Distribuidora Irais',
      slug: 'distribuidora-irais',
      primary_color: '#7C3AED',
      secondary_color: '#DDD6FE',
      status: 'active'
    })
    .select()
    .single()

  if (bizError) throw new Error(`Error al crear negocio: ${bizError.message}`)
  console.log(`   OK — business_id: ${business.id}`)

  // 2. Crear usuario auth
  console.log('\n2. Creando usuario admin...')
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'Iraiscc_1501@outlook.com',
    password: 'Orizaba10',
    email_confirm: true
  })

  if (authError) throw new Error(`Error al crear usuario: ${authError.message}`)
  console.log(`   OK — user_id: ${authData.user.id}`)

  // 3. Crear perfil de usuario
  console.log('\n3. Creando perfil de usuario...')
  const { error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      business_id: business.id,
      email: 'Iraiscc_1501@outlook.com',
      full_name: 'Irais',
      role: 'admin',
      is_active: true
    })

  if (userError) throw new Error(`Error al crear perfil: ${userError.message}`)
  console.log('   OK')

  // 4. Crear categorías
  console.log('\n4. Creando categorías...')
  const categoryNames = [...new Set(validRows.map(r => r[0]).filter(Boolean))]
  const categoryMap = {}

  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i]
    const { data: cat, error: catError } = await supabase
      .from('categories')
      .insert({ business_id: business.id, name, sort_order: i })
      .select()
      .single()

    if (catError) throw new Error(`Error al crear categoría "${name}": ${catError.message}`)
    categoryMap[name] = cat.id
    console.log(`   + ${name}`)
  }

  // 5. Importar productos (deduplicando nombres repetidos)
  console.log('\n5. Importando productos...')
  const seenNames = {}
  const products = validRows.map(row => {
    let name = cleanName(row[1])
    const key = name.toLowerCase()
    if (seenNames[key] !== undefined) {
      seenNames[key]++
      name = `${name} (${seenNames[key]})`
    } else {
      seenNames[key] = 1
    }
    return {
      business_id: business.id,
      category_id: categoryMap[row[0]] ?? null,
      name,
      price: parsePrice(row[2]),
      stock: parseInt(row[3]) || 0,
      min_stock: 0,
      status: 'active',
      is_featured: false
    }
  })

  const BATCH = 100
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH)
    const { error: prodError } = await supabase.from('products').insert(batch)
    if (prodError) throw new Error(`Error al insertar lote ${Math.floor(i / BATCH) + 1}: ${prodError.message}`)
    console.log(`   ${Math.min(i + BATCH, products.length)} / ${products.length}`)
  }

  console.log('\n✓ Importación completada')
  console.log(`  Negocio:     Distribuidora Irais (${business.id})`)
  console.log(`  Categorías:  ${categoryNames.length}`)
  console.log(`  Productos:   ${products.length}`)
}

main().catch(err => {
  console.error('\nError:', err.message)
  process.exit(1)
})
