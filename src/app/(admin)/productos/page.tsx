'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { getStockLevel } from '@/lib/utils'
import { PRODUCT_STATUS_LABELS } from '@/lib/constants'
import type { Product, Category } from '@/types'
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Eye,
    EyeOff,
    AlertTriangle,
    XCircle,
    X,
    Loader2,
    Upload,
    Image as ImageIcon,
} from 'lucide-react'

export default function ProductosPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterCategory, setFilterCategory] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [saving, setSaving] = useState(false)
    const [businessId, setBusinessId] = useState<string>('')
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    // Form fields
    const [formName, setFormName] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formSku, setFormSku] = useState('')
    const [formPrice, setFormPrice] = useState('')
    const [formWholesalePrice, setFormWholesalePrice] = useState('')
    const [formStock, setFormStock] = useState('')
    const [formMinStock, setFormMinStock] = useState('')
    const [formCategory, setFormCategory] = useState('')
    const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active')
    const [formFeatured, setFormFeatured] = useState(false)
    const [formImages, setFormImages] = useState<File[]>([])
    const [formError, setFormError] = useState('')

    const supabase = createClient()

    const loadProducts = useCallback(async function loadProducts() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
            .from('users')
            .select('business_id')
            .eq('id', user.id)
            .single()

        if (!userData) return
        setBusinessId(userData.business_id)

        // Load categories
        const { data: cats } = await supabase
            .from('categories')
            .select('*')
            .eq('business_id', userData.business_id)
            .is('deleted_at', null)
            .order('name')

        if (cats) setCategories(cats as Category[])

        // Load products
        let query = supabase
            .from('products')
            .select('*, category:categories(id, name)')
            .eq('business_id', userData.business_id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })

        if (filterCategory) query = query.eq('category_id', filterCategory)
        if (filterStatus) query = query.eq('status', filterStatus)

        const { data: prods } = await query
        if (prods) setProducts(prods as Product[])
        setLoading(false)
    }, [supabase, filterCategory, filterStatus])

    useEffect(() => { loadProducts() }, [loadProducts])

    function resetForm() {
        setFormName('')
        setFormDescription('')
        setFormSku('')
        setFormPrice('')
        setFormWholesalePrice('')
        setFormStock('')
        setFormMinStock('')
        setFormCategory('')
        setFormStatus('active')
        setFormFeatured(false)
        setFormImages([])
        setFormError('')
        setEditingProduct(null)
    }

    function openCreateModal() {
        resetForm()
        setShowModal(true)
    }

    function openEditModal(product: Product) {
        setEditingProduct(product)
        setFormName(product.name)
        setFormDescription(product.description || '')
        setFormSku(product.sku || '')
        setFormPrice(product.price.toString())
        setFormWholesalePrice(product.wholesale_price?.toString() || '')
        setFormStock(product.stock.toString())
        setFormMinStock(product.min_stock.toString())
        setFormCategory(product.category_id || '')
        setFormStatus(product.status)
        setFormFeatured(product.is_featured)
        setFormImages([])
        setFormError('')
        setShowModal(true)
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setFormError('')

        const price = parseFloat(formPrice)
        const wholesalePrice = formWholesalePrice ? parseFloat(formWholesalePrice) : null
        const stock = parseInt(formStock) || 0
        const minStock = parseInt(formMinStock) || 0

        if (!formName.trim()) { setFormError('El nombre es obligatorio.'); setSaving(false); return }
        if (isNaN(price) || price < 0) { setFormError('El precio es inválido.'); setSaving(false); return }

        const productData = {
            business_id: businessId,
            name: formName.trim(),
            description: formDescription.trim() || null,
            sku: formSku.trim() || null,
            price,
            wholesale_price: wholesalePrice,
            stock: editingProduct ? editingProduct.stock : stock,
            min_stock: minStock,
            category_id: formCategory || null,
            status: formStatus,
            is_featured: formFeatured,
        }

        try {
            if (editingProduct) {
                const { error } = await supabase
                    .from('products')
                    .update({ ...productData, business_id: undefined })
                    .eq('id', editingProduct.id)

                if (error) throw error
            } else {
                const { data: newProduct, error } = await supabase
                    .from('products')
                    .insert(productData)
                    .select()
                    .single()

                if (error) {
                    if (error.code === '23505') {
                        setFormError('Ya existe un producto con este nombre o SKU.')
                        setSaving(false)
                        return
                    }
                    throw error
                }

                // Upload images for new product
                if (formImages.length > 0 && newProduct) {
                    for (let i = 0; i < formImages.length; i++) {
                        const file = formImages[i]
                        const ext = file.name.split('.').pop()
                        const path = `${businessId}/${newProduct.id}/${Date.now()}_${i}.${ext}`
                        const { data: uploadData } = await supabase.storage
                            .from('product-images')
                            .upload(path, file)

                        if (uploadData) {
                            const { data: { publicUrl } } = supabase.storage
                                .from('product-images')
                                .getPublicUrl(uploadData.path)

                            await supabase.from('product_images').insert({
                                product_id: newProduct.id,
                                url: publicUrl,
                                sort_order: i,
                                is_primary: i === 0,
                            })
                        }
                    }
                }
            }

            setShowModal(false)
            resetForm()
            loadProducts()
        } catch {
            setFormError('Error al guardar el producto.')
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(productId: string) {
        const { data: saleItems } = await supabase
            .from('sale_items')
            .select('id')
            .eq('product_id', productId)
            .limit(1)

        if (saleItems && saleItems.length > 0) {
            // Soft delete
            await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', productId)
        } else {
            await supabase.from('products').delete().eq('id', productId)
        }
        setDeleteConfirm(null)
        loadProducts()
    }

    async function toggleStatus(product: Product) {
        const newStatus = product.status === 'active' ? 'inactive' : 'active'
        await supabase.from('products').update({ status: newStatus }).eq('id', product.id)
        loadProducts()
    }

    // Filtered products
    const filteredProducts = products.filter((p) => {
        if (search) {
            const s = search.toLowerCase()
            return p.name.toLowerCase().includes(s) || (p.sku && p.sku.toLowerCase().includes(s))
        }
        return true
    })

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Productos</h1>
                    <p className="page-subtitle">{products.length} producto(s) registrados</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} /> Nuevo Producto
                </button>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="admin-search" style={{ flex: 1, maxWidth: 400 }}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select className="select" style={{ width: 'auto', minWidth: 180 }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="">Todas las categorías</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
                <select className="select" style={{ width: 'auto', minWidth: 140 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">Todos los estados</option>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                </select>
            </div>

            {/* Products Table */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="skeleton" style={{ height: 56 }} />
                    ))}
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon"><ShoppingBagIcon /></div>
                        <div className="empty-state-title">No hay productos</div>
                        <div className="empty-state-description">
                            {search ? 'No se encontraron productos con esa búsqueda.' : 'Comienza agregando tu primer producto.'}
                        </div>
                        {!search && (
                            <button className="btn btn-primary" onClick={openCreateModal}>
                                <Plus size={18} /> Agregar Producto
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>SKU</th>
                                    <th>Categoría</th>
                                    <th>Precio</th>
                                    <th>Stock</th>
                                    <th>Estado</th>
                                    <th style={{ textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => {
                                    const stockLevel = getStockLevel(product.stock, product.min_stock)
                                    return (
                                        <tr key={product.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                    <div style={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 'var(--radius-sm)',
                                                        background: 'var(--color-bg-secondary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}>
                                                        <ImageIcon size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{product.name}</div>
                                                        {product.is_featured && (
                                                            <span className="badge badge-info" style={{ marginTop: 2 }}>Destacado</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--color-text-secondary)' }}>{product.sku || '—'}</td>
                                            <td>{product.category?.name || '—'}</td>
                                            <td style={{ fontWeight: 600 }}>{formatCurrency(product.price)}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                    {stockLevel === 'out' && <XCircle size={14} style={{ color: 'var(--color-error)' }} />}
                                                    {stockLevel === 'low' && <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />}
                                                    <span className={`stock-${stockLevel}`} style={{ fontWeight: 600 }}>
                                                        {product.stock}
                                                    </span>
                                                    {product.min_stock > 0 && (
                                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                                                            / min: {product.min_stock}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${product.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                                                    {PRODUCT_STATUS_LABELS[product.status]}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
                                                    <button className="btn btn-ghost btn-icon" onClick={() => openEditModal(product)} title="Editar">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button className="btn btn-ghost btn-icon" onClick={() => toggleStatus(product)} title={product.status === 'active' ? 'Desactivar' : 'Activar'}>
                                                        {product.status === 'active' ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                    <button className="btn btn-ghost btn-icon" onClick={() => setDeleteConfirm(product.id)} title="Eliminar" style={{ color: 'var(--color-error)' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                                {formError && (
                                    <div style={{
                                        padding: 'var(--space-3) var(--space-4)',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--color-error-light)',
                                        color: '#991B1B',
                                        fontSize: 'var(--font-size-sm)',
                                    }}>
                                        {formError}
                                    </div>
                                )}

                                <div className="input-group">
                                    <label className="input-label">Nombre *</label>
                                    <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} required placeholder="Nombre del producto" />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Descripción</label>
                                    <textarea className="textarea" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Descripción del producto..." />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                    <div className="input-group">
                                        <label className="input-label">SKU</label>
                                        <input className="input" value={formSku} onChange={(e) => setFormSku(e.target.value)} placeholder="ABC-001" />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Categoría</label>
                                        <select className="select" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                                            <option value="">Sin categoría</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                    <div className="input-group">
                                        <label className="input-label">Precio de menudeo *</label>
                                        <input className="input" type="number" step="0.01" min="0" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} required placeholder="0.00" />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Precio de mayoreo</label>
                                        <input className="input" type="number" step="0.01" min="0" value={formWholesalePrice} onChange={(e) => setFormWholesalePrice(e.target.value)} placeholder="0.00" />
                                    </div>
                                </div>

                                {!editingProduct && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                        <div className="input-group">
                                            <label className="input-label">Stock inicial</label>
                                            <input className="input" type="number" min="0" value={formStock} onChange={(e) => setFormStock(e.target.value)} placeholder="0" />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Stock mínimo</label>
                                            <input className="input" type="number" min="0" value={formMinStock} onChange={(e) => setFormMinStock(e.target.value)} placeholder="0" />
                                        </div>
                                    </div>
                                )}

                                {editingProduct && (
                                    <div className="input-group">
                                        <label className="input-label">Stock mínimo</label>
                                        <input className="input" type="number" min="0" value={formMinStock} onChange={(e) => setFormMinStock(e.target.value)} placeholder="0" />
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                                        <input type="checkbox" checked={formStatus === 'active'} onChange={(e) => setFormStatus(e.target.checked ? 'active' : 'inactive')} />
                                        Activo
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                                        <input type="checkbox" checked={formFeatured} onChange={(e) => setFormFeatured(e.target.checked)} />
                                        Destacado
                                    </label>
                                </div>

                                {!editingProduct && (
                                    <div className="input-group">
                                        <label className="input-label">Imágenes (máx. 5)</label>
                                        <label style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 'var(--space-8)',
                                            border: '2px dashed var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            transition: 'border-color var(--transition-fast)',
                                        }}>
                                            <Upload size={24} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }} />
                                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                                Haz clic para subir imágenes
                                            </span>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                                                JPG, PNG o WebP · Máximo 5MB cada una
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                multiple
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    if (e.target.files) {
                                                        setFormImages(Array.from(e.target.files).slice(0, 5))
                                                    }
                                                }}
                                            />
                                        </label>
                                        {formImages.length > 0 && (
                                            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                                                {formImages.map((file, i) => (
                                                    <span key={i} className="badge badge-neutral">{file.name}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving && <Loader2 size={16} className="spinner" />}
                                    {saving ? 'Guardando...' : editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Eliminar Producto</h2>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                ¿Estás seguro de que deseas eliminar este producto? Si tiene ventas asociadas, se marcará como eliminado pero mantendrá su historial.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function ShoppingBagIcon() {
    return (
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
    )
}
