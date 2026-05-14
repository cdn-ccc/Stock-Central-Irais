'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/types'
import { Plus, Edit2, Trash2, X, Loader2, FolderOpen } from 'lucide-react'

export default function CategoriasPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Category | null>(null)
    const [saving, setSaving] = useState(false)
    const [formName, setFormName] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formError, setFormError] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [deleteError, setDeleteError] = useState('')
    const [businessId, setBusinessId] = useState('')
    const supabase = createClient()

    const loadCategories = useCallback(async function loadCategories() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase.from('users').select('business_id').eq('id', user.id).single()
        if (!userData) return
        setBusinessId(userData.business_id)

        const { data: cats } = await supabase
            .from('categories')
            .select('*')
            .eq('business_id', userData.business_id)
            .is('deleted_at', null)
            .order('sort_order', { ascending: true })

        // Count products per category
        if (cats) {
            const catsWithCount = await Promise.all(
                cats.map(async (cat) => {
                    const { count } = await supabase
                        .from('products')
                        .select('*', { count: 'exact', head: true })
                        .eq('category_id', cat.id)
                        .is('deleted_at', null)
                    return { ...cat, product_count: count || 0 } as Category
                })
            )
            setCategories(catsWithCount)
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => { loadCategories() }, [loadCategories])

    function openCreate() {
        setEditing(null)
        setFormName('')
        setFormDescription('')
        setFormError('')
        setShowModal(true)
    }

    function openEdit(cat: Category) {
        setEditing(cat)
        setFormName(cat.name)
        setFormDescription(cat.description || '')
        setFormError('')
        setShowModal(true)
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setFormError('')

        if (!formName.trim()) { setFormError('El nombre es obligatorio.'); setSaving(false); return }

        try {
            if (editing) {
                const { error } = await supabase.from('categories').update({
                    name: formName.trim(),
                    description: formDescription.trim() || null,
                }).eq('id', editing.id)
                if (error) throw error
            } else {
                const maxSort = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 1 : 0
                const { error } = await supabase.from('categories').insert({
                    business_id: businessId,
                    name: formName.trim(),
                    description: formDescription.trim() || null,
                    sort_order: maxSort,
                })
                if (error) {
                    if (error.code === '23505') { setFormError('Ya existe una categoría con ese nombre.'); setSaving(false); return }
                    throw error
                }
            }
            setShowModal(false)
            loadCategories()
        } catch {
            setFormError('Error al guardar la categoría.')
        } finally { setSaving(false) }
    }

    async function handleDelete(catId: string) {
        setDeleteError('')
        const cat = categories.find(c => c.id === catId)
        if (cat && (cat.product_count || 0) > 0) {
            setDeleteError('No se puede eliminar una categoría con productos activos.')
            return
        }
        await supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', catId)
        setDeleteConfirm(null)
        loadCategories()
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Categorías</h1>
                    <p className="page-subtitle">{categories.length} categoría(s)</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    <Plus size={18} /> Nueva Categoría
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {[1, 2, 3].map(i => (<div key={i} className="skeleton" style={{ height: 72 }} />))}
                </div>
            ) : categories.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <FolderOpen size={64} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-4)' }} />
                        <div className="empty-state-title">No hay categorías</div>
                        <div className="empty-state-description">Crea categorías para organizar tus productos.</div>
                        <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Crear Categoría</button>
                    </div>
                </div>
            ) : (
                <div className="data-grid">
                    {categories.map((cat) => (
                        <div key={cat.id} className="card" style={{ padding: 'var(--space-5)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-1)' }}>{cat.name}</h3>
                                    {cat.description && (
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                                            {cat.description}
                                        </p>
                                    )}
                                    <span className="badge badge-neutral">{cat.product_count || 0} productos</span>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                                    <button className="btn btn-ghost btn-icon" onClick={() => openEdit(cat)}><Edit2 size={16} /></button>
                                    <button className="btn btn-ghost btn-icon" onClick={() => setDeleteConfirm(cat.id)} style={{ color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                                {formError && (
                                    <div style={{ padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--color-error-light)', color: '#991B1B', fontSize: 'var(--font-size-sm)' }}>{formError}</div>
                                )}
                                <div className="input-group">
                                    <label className="input-label">Nombre *</label>
                                    <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} required placeholder="Ej: Cremas faciales" />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Descripción</label>
                                    <textarea className="textarea" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Descripción opcional..." />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving && <Loader2 size={16} className="spinner" />}
                                    {saving ? 'Guardando...' : editing ? 'Guardar' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => { setDeleteConfirm(null); setDeleteError('') }}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h2>Eliminar Categoría</h2></div>
                        <div className="modal-body">
                            {deleteError ? (
                                <div style={{ padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--color-error-light)', color: '#991B1B', fontSize: 'var(--font-size-sm)' }}>{deleteError}</div>
                            ) : (
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>¿Estás seguro de que deseas eliminar esta categoría?</p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => { setDeleteConfirm(null); setDeleteError('') }}>Cancelar</button>
                            {!deleteError && <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Eliminar</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
