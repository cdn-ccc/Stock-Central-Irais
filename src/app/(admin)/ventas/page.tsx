'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { SALE_STATUS_LABELS, SALE_STATUS_COLORS, SALE_TRANSITIONS } from '@/lib/constants'
import type { Sale, Product, Customer, SaleItem } from '@/types'
import { Plus, X, Loader2, Receipt, Eye, ChevronRight, Trash2, Search } from 'lucide-react'

export default function VentasPage() {
    const [sales, setSales] = useState<Sale[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState<Sale | null>(null)
    const [saving, setSaving] = useState(false)
    const [businessId, setBusinessId] = useState('')
    const [userId, setUserId] = useState('')
    const [filterStatus, setFilterStatus] = useState('')

    // Create sale form
    const [saleCustomerId, setSaleCustomerId] = useState('')
    const [saleItems, setSaleItems] = useState<Array<{ product_id: string; quantity: number; product?: Product }>>([])
    const [saleNotes, setSaleNotes] = useState('')
    const [saleError, setSaleError] = useState('')

    const supabase = createClient()

    const loadData = useCallback(async function loadData() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        const { data: userData } = await supabase.from('users').select('business_id').eq('id', user.id).single()
        if (!userData) return
        setBusinessId(userData.business_id)

        // Load sales
        let query = supabase
            .from('sales')
            .select('*, customer:customers(full_name, phone), items:sale_items(*)')
            .eq('business_id', userData.business_id)
            .order('created_at', { ascending: false })

        if (filterStatus) query = query.eq('status', filterStatus)

        const { data: salesData } = await query
        if (salesData) setSales(salesData as unknown as Sale[])

        // Load products & customers
        const { data: prods } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', userData.business_id)
            .eq('status', 'active')
            .is('deleted_at', null)
            .order('name')

        if (prods) setProducts(prods as Product[])

        const { data: custs } = await supabase
            .from('customers')
            .select('*')
            .eq('business_id', userData.business_id)
            .is('deleted_at', null)
            .order('full_name')

        if (custs) setCustomers(custs as Customer[])
        setLoading(false)
    }, [supabase, filterStatus])

    useEffect(() => { loadData() }, [loadData])

    function addSaleItem() {
        setSaleItems([...saleItems, { product_id: '', quantity: 1 }])
    }

    function removeSaleItem(index: number) {
        setSaleItems(saleItems.filter((_, i) => i !== index))
    }

    function updateSaleItem(index: number, field: string, value: string | number) {
        const items = [...saleItems]
        if (field === 'product_id') {
            const product = products.find(p => p.id === value)
            items[index] = { ...items[index], product_id: value as string, product }
        } else {
            items[index] = { ...items[index], [field]: value }
        }
        setSaleItems(items)
    }

    function calculateTotal(): { subtotal: number; total: number } {
        let subtotal = 0
        saleItems.forEach(item => {
            if (item.product) {
                subtotal += item.product.price * item.quantity
            }
        })
        return { subtotal, total: subtotal }
    }

    async function handleCreateSale(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setSaleError('')

        if (saleItems.length === 0) { setSaleError('Agrega al menos un producto.'); setSaving(false); return }

        // Validate stock
        for (const item of saleItems) {
            if (!item.product) { setSaleError('Selecciona un producto válido para cada línea.'); setSaving(false); return }
            if (item.quantity > item.product.stock) {
                setSaleError(`Stock insuficiente para "${item.product.name}". Disponible: ${item.product.stock}`)
                setSaving(false)
                return
            }
        }

        const { subtotal, total } = calculateTotal()

        try {
            // Create sale
            const { data: newSale, error: saleErr } = await supabase
                .from('sales')
                .insert({
                    business_id: businessId,
                    customer_id: saleCustomerId || null,
                    status: 'pending',
                    subtotal,
                    discount: 0,
                    total,
                    notes: saleNotes.trim() || null,
                    created_by: userId,
                })
                .select()
                .single()

            if (saleErr) throw saleErr

            // Create sale items
            const items = saleItems.map(item => ({
                sale_id: newSale.id,
                product_id: item.product_id,
                product_name: item.product!.name,
                quantity: item.quantity,
                unit_price: item.product!.price,
                subtotal: item.product!.price * item.quantity,
            }))

            const { error: itemsErr } = await supabase.from('sale_items').insert(items)
            if (itemsErr) throw itemsErr

            setShowCreateModal(false)
            setSaleCustomerId('')
            setSaleItems([])
            setSaleNotes('')
            loadData()
        } catch {
            setSaleError('Error al crear la venta.')
        } finally { setSaving(false) }
    }

    async function updateSaleStatus(saleId: string, newStatus: string) {
        const sale = sales.find(s => s.id === saleId)
        if (!sale) return

        try {
            if (newStatus === 'confirmed' && sale.status === 'pending') {
                // Deduct inventory
                const saleWithItems = sale as Sale & { items: SaleItem[] }
                if (saleWithItems.items) {
                    for (const item of saleWithItems.items) {
                        const product = products.find(p => p.id === item.product_id)
                        if (product) {
                            const newStock = product.stock - item.quantity
                            if (newStock < 0) {
                                alert(`Stock insuficiente para "${item.product_name}".`)
                                return
                            }
                            await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id)
                            await supabase.from('inventory_movements').insert({
                                business_id: businessId,
                                product_id: item.product_id,
                                type: 'sale',
                                quantity: item.quantity,
                                stock_before: product.stock,
                                stock_after: newStock,
                                reference_id: saleId,
                                notes: `Venta #${saleId.slice(0, 8)}`,
                                created_by: userId,
                            })
                        }
                    }
                }
            }

            if (newStatus === 'cancelled' && sale.status === 'confirmed') {
                // Revert inventory
                const saleWithItems = sale as Sale & { items: SaleItem[] }
                if (saleWithItems.items) {
                    for (const item of saleWithItems.items) {
                        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single()
                        if (prod) {
                            const newStock = prod.stock + item.quantity
                            await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id)
                            await supabase.from('inventory_movements').insert({
                                business_id: businessId,
                                product_id: item.product_id,
                                type: 'sale_cancellation',
                                quantity: item.quantity,
                                stock_before: prod.stock,
                                stock_after: newStock,
                                reference_id: saleId,
                                notes: `Cancelación de venta #${saleId.slice(0, 8)}`,
                                created_by: userId,
                            })
                        }
                    }
                }
            }

            await supabase.from('sales').update({ status: newStatus }).eq('id', saleId)
            loadData()
            if (showDetailModal?.id === saleId) {
                setShowDetailModal(null)
            }
        } catch {
            alert('Error al actualizar el estado.')
        }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Ventas</h1>
                    <p className="page-subtitle">{sales.length} venta(s)</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setSaleItems([{ product_id: '', quantity: 1 }]); setShowCreateModal(true) }}>
                    <Plus size={18} /> Nueva Venta
                </button>
            </div>

            {/* Filter */}
            <div className="filters-bar">
                <select className="select" style={{ width: 'auto', minWidth: 180 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">Todos los estados</option>
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="delivered">Entregado</option>
                    <option value="cancelled">Cancelado</option>
                </select>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {[1, 2, 3].map(i => (<div key={i} className="skeleton" style={{ height: 72 }} />))}
                </div>
            ) : sales.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Receipt size={64} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-4)' }} />
                        <div className="empty-state-title">No hay ventas</div>
                        <div className="empty-state-description">Registra tu primera venta para comenzar.</div>
                        <button className="btn btn-primary" onClick={() => { setSaleItems([{ product_id: '', quantity: 1 }]); setShowCreateModal(true) }}>
                            <Plus size={18} /> Nueva Venta
                        </button>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Cliente</th>
                                    <th>Estado</th>
                                    <th>Total</th>
                                    <th style={{ textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map(sale => (
                                    <tr key={sale.id}>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--font-size-sm)' }}>
                                            {formatDateTime(sale.created_at)}
                                        </td>
                                        <td style={{ fontWeight: 500 }}>
                                            {(sale as unknown as { customer: { full_name: string } | null }).customer?.full_name || 'Sin cliente'}
                                        </td>
                                        <td>
                                            <span className="badge" style={{
                                                background: SALE_STATUS_COLORS[sale.status] + '20',
                                                color: SALE_STATUS_COLORS[sale.status],
                                            }}>
                                                {SALE_STATUS_LABELS[sale.status]}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 700 }}>{formatCurrency(sale.total)}</td>
                                        <td>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                                                <button className="btn btn-ghost btn-icon" onClick={() => setShowDetailModal(sale)} title="Ver detalle">
                                                    <Eye size={16} />
                                                </button>
                                                {SALE_TRANSITIONS[sale.status]?.map(nextStatus => (
                                                    <button
                                                        key={nextStatus}
                                                        className="btn btn-sm btn-outline"
                                                        onClick={() => updateSaleStatus(sale.id, nextStatus)}
                                                        style={{
                                                            borderColor: SALE_STATUS_COLORS[nextStatus],
                                                            color: SALE_STATUS_COLORS[nextStatus],
                                                        }}
                                                    >
                                                        <ChevronRight size={12} />
                                                        {SALE_STATUS_LABELS[nextStatus]}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Sale Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Nueva Venta</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateSale}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                                {saleError && (
                                    <div style={{ padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--color-error-light)', color: '#991B1B', fontSize: 'var(--font-size-sm)' }}>{saleError}</div>
                                )}

                                <div className="input-group">
                                    <label className="input-label">Cliente (opcional)</label>
                                    <select className="select" value={saleCustomerId} onChange={(e) => setSaleCustomerId(e.target.value)}>
                                        <option value="">Sin cliente</option>
                                        {customers.map(c => (<option key={c.id} value={c.id}>{c.full_name}</option>))}
                                    </select>
                                </div>

                                <div>
                                    <label className="input-label" style={{ marginBottom: 'var(--space-3)' }}>Productos *</label>
                                    {saleItems.map((item, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px auto', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', alignItems: 'center' }}>
                                            <select className="select" value={item.product_id} onChange={(e) => updateSaleItem(idx, 'product_id', e.target.value)} required>
                                                <option value="">Seleccionar producto</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)} (Stock: {p.stock})</option>
                                                ))}
                                            </select>
                                            <input className="input" type="number" min="1" value={item.quantity} onChange={(e) => updateSaleItem(idx, 'quantity', parseInt(e.target.value) || 1)} style={{ textAlign: 'center' }} />
                                            <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                                {item.product ? formatCurrency(item.product.price * item.quantity) : '$0.00'}
                                            </span>
                                            <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeSaleItem(idx)} style={{ color: 'var(--color-error)' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" className="btn btn-sm btn-outline" onClick={addSaleItem}>
                                        <Plus size={14} /> Agregar producto
                                    </button>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Notas</label>
                                    <textarea className="textarea" value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} placeholder="Notas opcionales..." />
                                </div>

                                <div style={{ padding: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>
                                        <span>Total:</span>
                                        <span>{formatCurrency(calculateTotal().total)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving && <Loader2 size={16} className="spinner" />}
                                    {saving ? 'Creando...' : 'Crear Venta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sale Detail Modal */}
            {showDetailModal && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(null)}>
                    <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detalle de Venta</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowDetailModal(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Fecha</div>
                                    <div style={{ fontWeight: 600 }}>{formatDateTime(showDetailModal.created_at)}</div>
                                </div>
                                <span className="badge" style={{
                                    background: SALE_STATUS_COLORS[showDetailModal.status] + '20',
                                    color: SALE_STATUS_COLORS[showDetailModal.status],
                                }}>
                                    {SALE_STATUS_LABELS[showDetailModal.status]}
                                </span>
                            </div>
                            {(showDetailModal as unknown as { customer: { full_name: string } | null }).customer && (
                                <div style={{ marginBottom: 'var(--space-4)' }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Cliente</div>
                                    <div style={{ fontWeight: 600 }}>{(showDetailModal as unknown as { customer: { full_name: string } }).customer.full_name}</div>
                                </div>
                            )}
                            <div className="table-container" style={{ marginBottom: 'var(--space-4)' }}>
                                <table className="table">
                                    <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
                                    <tbody>
                                        {((showDetailModal as unknown as { items: SaleItem[] }).items || []).map((item: SaleItem) => (
                                            <tr key={item.id}>
                                                <td>{item.product_name}</td>
                                                <td>{item.quantity}</td>
                                                <td>{formatCurrency(item.unit_price)}</td>
                                                <td style={{ fontWeight: 600 }}>{formatCurrency(item.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 'var(--font-size-xl)' }}>
                                Total: {formatCurrency(showDetailModal.total)}
                            </div>
                            {showDetailModal.notes && (
                                <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                    <strong>Notas:</strong> {showDetailModal.notes}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
