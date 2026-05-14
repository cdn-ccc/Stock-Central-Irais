'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Business } from '@/types'
import { ExternalLink, Loader2, Save, Upload } from 'lucide-react'

export default function ConfiguracionPage() {
    const [business, setBusiness] = useState<Business | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)

    const [formName, setFormName] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formSlug, setFormSlug] = useState('')
    const [formWhatsapp, setFormWhatsapp] = useState('')
    const [formPrimaryColor, setFormPrimaryColor] = useState('#6366f1')
    const [formSecondaryColor, setFormSecondaryColor] = useState('#8b5cf6')
    const [formError, setFormError] = useState('')

    const supabase = createClient()

    const loadBusiness = useCallback(async function loadBusiness() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase.from('users').select('business_id').eq('id', user.id).single()
        if (!userData) return

        const { data: biz } = await supabase.from('businesses').select('*').eq('id', userData.business_id).single()
        if (biz) {
            const b = biz as Business
            setBusiness(b)
            setFormName(b.name)
            setFormDescription(b.description || '')
            setFormSlug(b.slug)
            setFormWhatsapp(b.whatsapp_number || '')
            setFormPrimaryColor(b.primary_color)
            setFormSecondaryColor(b.secondary_color)
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => { loadBusiness() }, [loadBusiness])

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true); setFormError(''); setSuccess(false)

        try {
            const { error } = await supabase.from('businesses').update({
                name: formName.trim(),
                description: formDescription.trim() || null,
                whatsapp_number: formWhatsapp.trim() || null,
                primary_color: formPrimaryColor,
                secondary_color: formSecondaryColor,
            }).eq('id', business!.id)

            if (error) throw error
            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        } catch { setFormError('Error al guardar.') }
        finally { setSaving(false) }
    }

    async function handleLogoUpload(file: File) {
        if (!business) return
        const ext = file.name.split('.').pop()
        const path = `${business.id}/logo.${ext}`

        const { data } = await supabase.storage.from('business-logos').upload(path, file, { upsert: true })
        if (data) {
            const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(data.path)
            await supabase.from('businesses').update({ logo_url: publicUrl }).eq('id', business.id)
            loadBusiness()
        }
    }

    if (loading) {
        return (
            <div>
                <div className="page-header"><h1 className="page-title">Configuración</h1></div>
                <div className="skeleton" style={{ height: 400 }} />
            </div>
        )
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Configuración</h1>
                    <p className="page-subtitle">Datos de tu negocio y catálogo</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
                <div className="card">
                    <div className="card-header"><h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Información del Negocio</h2></div>
                    <form onSubmit={handleSave}>
                        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                            {formError && <div style={{ padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--color-error-light)', color: '#991B1B', fontSize: 'var(--font-size-sm)' }}>{formError}</div>}
                            {success && <div style={{ padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--color-success-light)', color: '#065F46', fontSize: 'var(--font-size-sm)' }}>✓ Cambios guardados correctamente.</div>}

                            <div className="input-group">
                                <label className="input-label">Nombre del negocio *</label>
                                <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Descripción</label>
                                <textarea className="textarea" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Describe tu negocio..." />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Link de tu tienda</label>
                                <a
                                    href={`/catalogo/${formSlug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-2)',
                                        padding: 'var(--space-3) var(--space-4)',
                                        background: 'var(--color-bg-secondary)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--color-primary)',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        wordBreak: 'break-all',
                                        transition: 'background 0.2s, border-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--color-primary-light, #ede9fe)'
                                        e.currentTarget.style.borderColor = 'var(--color-primary)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--color-bg-secondary)'
                                        e.currentTarget.style.borderColor = 'var(--color-border)'
                                    }}
                                >
                                    <ExternalLink size={16} style={{ flexShrink: 0 }} />
                                    <span>
                                        {typeof window !== 'undefined' ? window.location.origin : ''}/catalogo/{formSlug}
                                    </span>
                                </a>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                                    Haz clic para abrir tu catálogo público en una nueva pestaña
                                </span>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Número de WhatsApp</label>
                                <input className="input" value={formWhatsapp} onChange={(e) => setFormWhatsapp(e.target.value)} placeholder="521234567890" />
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Incluye código de país. Ejemplo: 521234567890</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label className="input-label">Color primario</label>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                        <input type="color" value={formPrimaryColor} onChange={(e) => setFormPrimaryColor(e.target.value)} style={{ width: 40, height: 40, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} />
                                        <input className="input" value={formPrimaryColor} onChange={(e) => setFormPrimaryColor(e.target.value)} style={{ flex: 1 }} />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Color secundario</label>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                        <input type="color" value={formSecondaryColor} onChange={(e) => setFormSecondaryColor(e.target.value)} style={{ width: 40, height: 40, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} />
                                        <input className="input" value={formSecondaryColor} onChange={(e) => setFormSecondaryColor(e.target.value)} style={{ flex: 1 }} />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
                                {saving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>

                <div>
                    <div className="card">
                        <div className="card-header"><h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Logo</h2></div>
                        <div className="card-body" style={{ textAlign: 'center' }}>
                            {business?.logo_url ? (
                                <img
                                    src={business.logo_url}
                                    alt="Logo"
                                    style={{
                                        width: 120,
                                        height: 120,
                                        borderRadius: 'var(--radius-lg)',
                                        objectFit: 'cover',
                                        marginBottom: 'var(--space-4)',
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: 120,
                                    height: 120,
                                    borderRadius: 'var(--radius-lg)',
                                    background: 'var(--color-bg-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto var(--space-4)',
                                    fontSize: 'var(--font-size-3xl)',
                                    fontWeight: 800,
                                    color: 'var(--color-text-tertiary)',
                                }}>
                                    {business?.name?.[0] || '?'}
                                </div>
                            )}
                            <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                                <Upload size={16} /> Subir Logo
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    style={{ display: 'none' }}
                                    onChange={(e) => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]) }}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: 'var(--space-5)' }}>
                        <div className="card-header"><h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Vista previa del catálogo</h2></div>
                        <div className="card-body">
                            <div style={{
                                padding: 'var(--space-4)',
                                background: formPrimaryColor,
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                textAlign: 'center',
                                marginBottom: 'var(--space-3)',
                            }}>
                                <div style={{ fontWeight: 700 }}>{formName}</div>
                            </div>
                            <div style={{
                                padding: 'var(--space-3)',
                                background: formSecondaryColor + '20',
                                borderRadius: 'var(--radius-md)',
                                border: `1px solid ${formSecondaryColor}40`,
                                textAlign: 'center',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-secondary)',
                            }}>
                                Color secundario
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
