'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, Eye, EyeOff, Loader2 } from 'lucide-react'
import { generateSlug } from '@/lib/utils'

export default function RegistroPage() {
    const [step, setStep] = useState<1 | 2>(1)
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [businessName, setBusinessName] = useState('')
    const [whatsappNumber, setWhatsappNumber] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.')
            setLoading(false)
            return
        }

        try {
            const slug = generateSlug(businessName)

            // Sign up with metadata — the trigger will create business + user
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                    data: {
                        full_name: fullName,
                        business_name: businessName,
                        business_slug: slug,
                        whatsapp_number: whatsappNumber || null,
                    },
                },
            })

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError('Este correo ya está registrado. Intenta iniciar sesión.')
                } else {
                    setError('Error al crear la cuenta. Intenta de nuevo.')
                }
                setLoading(false)
                return
            }

            if (!authData.user) {
                setError('Error inesperado al crear la cuenta.')
                setLoading(false)
                return
            }

            // Redirect to login with registered flag
            router.push('/login?registered=true')
        } catch {
            setError('Error inesperado. Intenta de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">
                        <Package size={24} />
                    </div>
                    <span className="auth-logo-text">StockMain</span>
                </div>

                <h1 className="auth-title">Crea tu cuenta</h1>
                <p className="auth-subtitle">
                    {step === 1 ? 'Registra tus datos personales' : 'Configura tu negocio'}
                </p>

                {/* Step indicator */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'center',
                    marginBottom: '24px',
                }}>
                    <div style={{
                        width: '60px',
                        height: '4px',
                        borderRadius: '2px',
                        background: 'var(--color-primary)',
                    }} />
                    <div style={{
                        width: '60px',
                        height: '4px',
                        borderRadius: '2px',
                        background: step === 2 ? 'var(--color-primary)' : 'var(--color-border)',
                        transition: 'background 0.3s',
                    }} />
                </div>

                {error && (
                    <div style={{
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-error-light)',
                        color: '#991B1B',
                        fontSize: 'var(--font-size-sm)',
                        marginBottom: 'var(--space-4)',
                    }}>
                        {error}
                    </div>
                )}

                <form className="auth-form" onSubmit={handleRegister}>
                    {step === 1 && (
                        <>
                            <div className="input-group">
                                <label className="input-label" htmlFor="fullName">Nombre completo</label>
                                <input
                                    id="fullName"
                                    className="input"
                                    type="text"
                                    placeholder="Juan Pérez"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label" htmlFor="regEmail">Correo electrónico</label>
                                <input
                                    id="regEmail"
                                    className="input"
                                    type="email"
                                    placeholder="tu@correo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label" htmlFor="regPassword">Contraseña</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="regPassword"
                                        className="input"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Mínimo 6 caracteres"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        style={{ paddingRight: '44px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--color-text-tertiary)',
                                            cursor: 'pointer',
                                            padding: '4px',
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="btn btn-primary btn-lg"
                                style={{ width: '100%' }}
                                onClick={() => {
                                    if (fullName && email && password.length >= 6) {
                                        setStep(2)
                                        setError(null)
                                    } else {
                                        setError('Completa todos los campos correctamente.')
                                    }
                                }}
                            >
                                Siguiente
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="input-group">
                                <label className="input-label" htmlFor="businessName">Nombre del negocio</label>
                                <input
                                    id="businessName"
                                    className="input"
                                    type="text"
                                    placeholder="Mi Tienda de Belleza"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    required
                                />
                                {businessName && (
                                    <span style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--color-text-tertiary)',
                                    }}>
                                        Tu catálogo estará en: /catalogo/{generateSlug(businessName)}
                                    </span>
                                )}
                            </div>

                            <div className="input-group">
                                <label className="input-label" htmlFor="whatsapp">Número de WhatsApp (opcional)</label>
                                <input
                                    id="whatsapp"
                                    className="input"
                                    type="tel"
                                    placeholder="521234567890"
                                    value={whatsappNumber}
                                    onChange={(e) => setWhatsappNumber(e.target.value)}
                                />
                                <span style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-text-tertiary)',
                                }}>
                                    Incluye código de país. Ej: 521234567890
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-lg"
                                    style={{ flex: 1 }}
                                    onClick={() => setStep(1)}
                                >
                                    Atrás
                                </button>
                                <button
                                    className="btn btn-primary btn-lg"
                                    type="submit"
                                    disabled={loading || !businessName}
                                    style={{ flex: 2 }}
                                >
                                    {loading ? <Loader2 size={20} className="spinner" /> : null}
                                    {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                                </button>
                            </div>
                        </>
                    )}
                </form>

                <div className="auth-footer">
                    ¿Ya tienes una cuenta?{' '}
                    <Link href="/login">Inicia sesión</Link>
                </div>
            </div>
        </div>
    )
}
