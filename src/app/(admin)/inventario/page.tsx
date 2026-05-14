'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import { getStockLevel } from '@/lib/utils'
import { MOVEMENT_TYPE_LABELS } from '@/lib/constants'
import type { Product, InventoryMovement } from '@/types'
import { AlertTriangle, XCircle, Plus, X, Loader2, Warehouse, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

export default function InventarioPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [movements, setMovements] = useState<InventoryMovement[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'alerts' | 'movements'>('alerts')
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [adjustType, setAdjustType] = useState<'adjustment_in' | 'adjustment_out' | 'restock'>('adjustment_in')
    const [adjustQuantity, setAdjustQuantity] = useState('')
    const [adjustNotes, setAdjustNotes] = useState('')
    const [saving, setSaving] = useState(false)
    const [adjustError, setAdjustError] = useState('')
    const [businessId, setBusinessId] = useState('')
    const [userId, setUserId] = useState('')
    const supabase = createClient()

    const loadData = useCallback(async function loadData() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        const { data: userData } = await supabase.from('users').select('business_id').eq('id', user.id).single()
        if (!userData) return
        setBusinessId(userData.business_id)

        const { data: prods } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', userData.business_id)
            .is('deleted_at', null)
            .order('stock', { ascending: true })

        if (prods) setProducts(prods as Product[])

        const { data: movs } = await supabase
            .from('inventory_movements')
            .select('*, product:products(name)')
            .eq('business_id', userData.business_id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (movs) setMovements(movs as unknown as InventoryMovement[])
        setLoading(false)
    }, [supabase])

    useEffect(() => { loadData() }, [loadData])

    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= p.min_stock)
    const outOfStockProducts = products.filter(p => p.stock === 0)

    function openAdjust(product: Product) {
        setSelectedProduct(product)
        setAdjustType('adjustment_in')
        setAdjustQuantity('')
        setAdjustNotes('')
        setAdjustError('')
        setShowAdjustModal(true)
    }

    async function handleAdjust(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedProduct) return
        setSaving(true)
        setAdjustError('')

        const qty = parseInt(adjustQuantity)
        if (isNaN(qty) || qty <= 0) { setAdjustError('La cantidad debe ser mayor a 0.'); setSaving(false); return }

        const isOut = adjustType === 'adjustment_out'
        if (isOut && qty > selectedProduct.stock) {
            setAdjustError(`No hay suficiente stock. Disponible: ${selectedProduct.stock}`)
            setSaving(false)
            return
        }

        const stockBefore = selectedProduct.stock
        const stockAfter = isOut ? stockBefore - qty : stockBefore + qty

        try {
            // Update product stock
            const { error: updateError } = await supabase
                .from('products')
                .update({ stock: stockAfter })
                .eq('id', selectedProduct.id)

            if (updateError) throw updateError

            // Record movement
            const { error: movError } = await supabase.from('inventory_movements').insert({
                business_id: businessId,
                product_id: selectedProduct.id,
                type: adjustType,
                quantity: qty,
                stock_before: stockBefore,
                stock_after: stockAfter,
                notes: adjustNotes.trim() || null,
                created_by: userId,
            })

            if (movError) throw movError

            setShowAdjustModal(false)
            loadData()
        } catch {
            setAdjustError('Error al realizar el ajuste.')
        } finally { setSaving(false) }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Inventario</h1>
                    <p className="page-subtitle">Control de stock y movimientos</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
                <button className={`btn ${tab === 'alerts' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('alerts')}>
                    <AlertTriangle size={16} /> Alertas de Stock ({lowStockProducts.length + outOfStockProducts.length})
                </button>
                <button className={`btn ${tab === 'movements' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('movements')}>
                    <Warehouse size={16} /> Movimientos
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {[1, 2, 3].map(i => (<div key={i} className="skeleton" style={{ height: 56 }} />))}
                </div>
            ) : tab === 'alerts' ? (
                <>
                    {outOfStockProducts.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-6)' }}>
                            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <XCircle size={18} style={{ color: 'var(--color-error)' }} />
                                Sin stock ({outOfStockProducts.length})
                            </h3>
                            <div className="card">
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Producto</th>
                                                <th>Stock mín.</th>
                                                <th style={{ textAlign: 'right' }}>Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {outOfStockProducts.map(p => (
                                                <tr key={p.id}>
                                                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                                                    <td>{p.min_stock}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button className="btn btn-sm btn-primary" onClick={() => openAdjust(p)}>
                                                            <Plus size={14} /> Ajustar Stock
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {lowStockProducts.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-6)' }}>
                            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
                                Stock bajo ({lowStockProducts.length})
                            </h3>
                            <div className="card">
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Producto</th>
                                                <th>Stock actual</th>
                                                <th>Stock mín.</th>
                                                <th style={{ textAlign: 'right' }}>Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lowStockProducts.map(p => (
                                                <tr key={p.id}>
                                                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                                                    <td><span className="stock-low" style={{ fontWeight: 700 }}>{p.stock}</span></td>
                                                    <td>{p.min_stock}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button className="btn btn-sm btn-primary" onClick={() => openAdjust(p)}>
                                                            <Plus size={14} /> Ajustar Stock
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {outOfStockProducts.length === 0 && lowStockProducts.length === 0 && (
                        <div className="card">
                            <div className="empty-state">
                                <div style={{ fontSize: 48, marginBottom: 'var(--space-4)' }}>✅</div>
                                <div className="empty-state-title">Todo bien</div>
                                <div className="empty-state-description">No hay productos con stock bajo o sin stock.</div>
                            </div>
                        </div>
                    )}

                    {/* All products view for adjustments */}
                    <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                        Todos los productos
                    </h3>
                    <div className="card">
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Stock</th>
                                        <th>Mínimo</th>
                                        <th>Estado</th>
                                        <th style={{ textAlign: 'right' }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(p => {
                                        const level = getStockLevel(p.stock, p.min_stock)
                                        return (
                                            <tr key={p.id}>
                                                <td style={{ fontWeight: 600 }}>{p.name}</td>
                                                <td><span className={`stock-${level}`} style={{ fontWeight: 700 }}>{p.stock}</span></td>
                                                <td>{p.min_stock}</td>
                                                <td>
                                                    <span className={`badge ${level === 'ok' ? 'badge-success' : level === 'low' ? 'badge-warning' : 'badge-error'}`}>
                                                        {level === 'ok' ? 'Normal' : level === 'low' ? 'Bajo' : 'Sin stock'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button className="btn btn-sm btn-outline" onClick={() => openAdjust(p)}>Ajustar</button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                // Movements tab
                <div className="card">
                    {movements.length === 0 ? (
                        <div className="empty-state">
                            <Warehouse size={64} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-4)' }} />
                            <div className="empty-state-title">Sin movimientos</div>
                            <div className="empty-state-description">Los movimientos aparecerán aquí al registrar ventas o ajustes.</div>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Producto</th>
                                        <th>Tipo</th>
                                        <th>Cantidad</th>
                                        <th>Stock</th>
                                        <th>Notas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movements.map(m => {
                                        const isIn = ['adjustment_in', 'restock', 'sale_cancellation'].includes(m.type)
                                        return (
                                            <tr key={m.id}>
                                                <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--font-size-xs)' }}>{formatDateTime(m.created_at)}</td>
                                                <td style={{ fontWeight: 600 }}>{(m as unknown as { product: { name: string } }).product?.name || '—'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                        {isIn ? <ArrowDownCircle size={14} style={{ color: 'var(--color-success)' }} /> : <ArrowUpCircle size={14} style={{ color: 'var(--color-error)' }} />}
                                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{MOVEMENT_TYPE_LABELS[m.type] || m.type}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{ fontWeight: 700, color: isIn ? 'var(--color-success)' : 'var(--color-error)' }}>
                                                        {isIn ? '+' : '-'}{m.quantity}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                                    {m.stock_before} → {m.stock_after}
                                                </td>
                                                <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{m.notes || '—'}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Adjust Modal */}
            {showAdjustModal && selectedProduct && (
                <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Ajustar Inventario</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowAdjustModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAdjust}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                                <div style={{ padding: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontWeight: 700 }}>{selectedProduct.name}</div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Stock actual: <strong>{selectedProduct.stock}</strong></div>
                                </div>

                                {adjustError && (
                                    <div style={{ padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--color-error-light)', color: '#991B1B', fontSize: 'var(--font-size-sm)' }}>{adjustError}</div>
                                )}

                                <div className="input-group">
                                    <label className="input-label">Tipo de movimiento</label>
                                    <select className="select" value={adjustType} onChange={(e) => setAdjustType(e.target.value as typeof adjustType)}>
                                        <option value="adjustment_in">Ajuste de entrada</option>
                                        <option value="adjustment_out">Ajuste de salida</option>
                                        <option value="restock">Reposición</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Cantidad *</label>
                                    <input className="input" type="number" min="1" value={adjustQuantity} onChange={(e) => setAdjustQuantity(e.target.value)} required placeholder="0" />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Nota justificativa</label>
                                    <textarea className="textarea" value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} placeholder="Razón del ajuste..." />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving && <Loader2 size={16} className="spinner" />}
                                    {saving ? 'Guardando...' : 'Aplicar Ajuste'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
