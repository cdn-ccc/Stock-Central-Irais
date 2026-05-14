'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Customer } from '@/types'
import { Plus, Edit2, Trash2, X, Loader2, Users, Search, Eye } from 'lucide-react'

export default function ClientesPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Customer | null>(null)
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')
    const [showDetail, setShowDetail] = useState<Customer | null>(null)
    const [customerSales, setCustomerSales] = useState<Array<{ id: string; total: number; status: string; created_at: string }>>([])
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [businessId, setBusinessId] = useState('')

    const [formName, setFormName] = useState('')
    const [formPhone, setFormPhone] = useState('')
    const [formEmail, setFormEmail] = useState('')
    const [formLocality, setFormLocality] = useState('')
    const [formNotes, setFormNotes] = useState('')
    const [formError, setFormError] = useState('')

    const supabase = createClient()

    const loadCustomers = useCallback(async function loadCustomers() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase.from('users').select('business_id').eq('id', user.id).single()
        if (!userData) return
        setBusinessId(userData.business_id)

        const { data: custs } = await supabase
            .from('customers')
            .select('*')
            .eq('business_id', userData.business_id)
            .is('deleted_at', null)
            .order('full_name')

        if (custs) {
            // Load stats for each customer
            const enriched = await Promise.all(
                custs.map(async (c) => {
                    const { data: sales } = await supabase
                        .from('sales')
                        .select('total, created_at')
                        .eq('customer_id', c.id)
                        .neq('status', 'cancelled')

                    const totalPurchases = sales?.reduce((sum, s) => sum + Number(s.total), 0) || 0
                    const orderCount = sales?.length || 0
                    const lastPurchase = sales?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

                    return {
                        ...c,
                        total_purchases: totalPurchases,
                        order_count: orderCount,
                        last_purchase_date: lastPurchase?.created_at || null,
                    } as Customer
                })
            )
            setCustomers(enriched)
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => { loadCustomers() }, [loadCustomers])

    function openCreate() {
        setEditing(null)
        setFormName(''); setFormPhone(''); setFormEmail(''); setFormLocality(''); setFormNotes(''); setFormError('')
        setShowModal(true)
    }

    function openEdit(c: Customer) {
        setEditing(c)
        setFormName(c.full_name); setFormPhone(c.phone || ''); setFormEmail(c.email || ''); setFormLocality(c.locality || ''); setFormNotes(c.notes || ''); setFormError('')
        setShowModal(true)
    }

    async function openDetail(c: Customer) {
        setShowDetail(c)
        const { data } = await supabase
            .from('sales')
            .select('id, total, status, created_at')
            .eq('customer_id', c.id)
            .order('created_at', { ascending: false })
            .limit(20)
        setCustomerSales((data || []) as Array<{ id: string; total: number; status: string; created_at: string }>)
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true); setFormError('')
        if (!formName.trim()) { setFormError('El nombre es obligatorio.'); setSaving(false); return }

        try {
            const data = {
                full_name: formName.trim(),
                phone: formPhone.trim() || null,
                email: formEmail.trim() || null,
                locality: formLocality.trim() || null,
                notes: formNotes.trim() || null,
            }

            if (editing) {
                await supabase.from('customers').update(data).eq('id', editing.id)
            } else {
                await supabase.from('customers').insert({ ...data, business_id: businessId })
            }
            setShowModal(false)
            loadCustomers()
        } catch { setFormError('Error al guardar.') }
        finally { setSaving(false) }
    }

    async function handleDelete(id: string) {
        const { data: activeSales } = await supabase
            .from('sales')
            .select('id')
            .eq('customer_id', id)
            .neq('status', 'cancelled')
            .limit(1)

        if (activeSales && activeSales.length > 0) {
            await supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        } else {
            await supabase.from('customers').delete().eq('id', id)
        }
        setDeleteConfirm(null)
        loadCustomers()
    }

    const filtered = customers.filter(c => {
        if (!search) return true
        const s = search.toLowerCase()
        return c.full_name.toLowerCase().includes(s) || (c.phone && c.phone.includes(s)) || (c.locality && c.locality.toLowerCase().includes(s))
    })

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Clientes</h1>
                    <p className="page-subtitle">{customers.length} cliente(s)</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Nuevo Cliente</button>
            </div>

            <div className="filters-bar">
                <div className="admin-search" style={{ flex: 1, maxWidth: 400 }}>
                    <Search size={18} />
                    <input placeholder="Buscar por nombre, teléfono o localidad..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {[1, 2, 3].map(i => (<div key={i} className="skeleton" style={{ height: 56 }} />))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Users size={64} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-4)' }} />
                        <div className="empty-state-title">No hay clientes</div>
                        <div className="empty-state-description">{search ? 'No se encontraron resultados.' : 'Agrega tu primer cliente.'}</div>
                        {!search && <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Agregar Cliente</button>}
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Teléfono</th>
                                    <th>Localidad</th>
                                    <th>Compras</th>
                                    <th>Total</th>
                                    <th>Última compra</th>
                                    <th style={{ textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(c => (
                                    <tr key={c.id}>
                                        <td style={{ fontWeight: 600 }}>{c.full_name}</td>
                                        <td style={{ color: 'var(--color-text-secondary)' }}>{c.phone || '—'}</td>
                                        <td style={{ color: 'var(--color-text-secondary)' }}>{c.locality || '—'}</td>
                                        <td><span className="badge badge-neutral">{c.order_count || 0}</span></td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(c.total_purchases || 0)}</td>
                                        <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                                            {c.last_purchase_date ? formatDate(c.last_purchase_date) : '—'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
                                                <button className="btn btn-ghost btn-icon" onClick={() => openDetail(c)}><Eye size={16} /></button>
                                                <button className="btn btn-ghost btn-icon" onClick={() => openEdit(c)}><Edit2 size={16} /></button>
                                                <button className="btn btn-ghost btn-icon" onClick={() => setDeleteConfirm(c.id)} style={{ color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                                {formError && <div style={{ padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--color-error-light)', color: '#991B1B', fontSize: 'var(--font-size-sm)' }}>{formError}</div>}
                                <div className="input-group"><label className="input-label">Nombre completo *</label><input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} required placeholder="Nombre del cliente" /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                    <div className="input-group"><label className="input-label">Teléfono</label><input className="input" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="5512345678" /></div>
                                    <div className="input-group"><label className="input-label">Correo</label><input className="input" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="correo@ejemplo.com" /></div>
                                </div>
                                <div className="input-group"><label className="input-label">Comunidad / Localidad</label><input className="input" value={formLocality} onChange={(e) => setFormLocality(e.target.value)} placeholder="Ej: San Juan del Río" /></div>
                                <div className="input-group"><label className="input-label">Notas</label><textarea className="textarea" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notas internas..." /></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving && <Loader2 size={16} className="spinner" />}{saving ? 'Guardando...' : editing ? 'Guardar' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetail && (
                <div className="modal-overlay" onClick={() => setShowDetail(null)}>
                    <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{showDetail.full_name}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowDetail(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                                <div style={{ textAlign: 'center', padding: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)' }}>{formatCurrency(showDetail.total_purchases || 0)}</div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Total comprado</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)' }}>{showDetail.order_count || 0}</div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Pedidos</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)' }}>{showDetail.last_purchase_date ? formatDate(showDetail.last_purchase_date) : '—'}</div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Última compra</div>
                                </div>
                            </div>

                            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-3)' }}>Historial de compras</h3>
                            {customerSales.length > 0 ? (
                                <div className="table-container">
                                    <table className="table">
                                        <thead><tr><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
                                        <tbody>
                                            {customerSales.map(s => (
                                                <tr key={s.id}>
                                                    <td>{formatDate(s.created_at)}</td>
                                                    <td style={{ fontWeight: 600 }}>{formatCurrency(s.total)}</td>
                                                    <td><span className="badge badge-neutral">{s.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>Sin compras registradas.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h2>Eliminar Cliente</h2></div>
                        <div className="modal-body"><p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>¿Eliminar este cliente? Si tiene ventas activas, será eliminación lógica.</p></div>
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
