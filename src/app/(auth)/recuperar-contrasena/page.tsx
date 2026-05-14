'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Package, Loader2, ArrowLeft } from 'lucide-react'

export default function RecuperarContrasenaPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    async function handleReset(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login`,
        })

        if (resetError) {
            setError('Error al enviar el correo. Verifica tu dirección e intenta de nuevo.')
            setLoading(false)
            return
        }

        setSent(true)
        setLoading(false)
    }

    if (sent) {
        return (
            <div className="auth-container">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div className="auth-logo">
                        <div className="auth-logo-icon">
                            <Package size={24} />
                        </div>
                        <span className="auth-logo-text">StockMain</span>
                    </div>
                    <h1 className="auth-title">Correo enviado</h1>
                    <p className="auth-subtitle">
                        Si existe una cuenta con el correo <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña.
                    </p>
                    <Link href="/login" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '16px' }}>
                        Volver a iniciar sesión
                    </Link>
                </div>
            </div>
        )
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

                <h1 className="auth-title">Recuperar contraseña</h1>
                <p className="auth-subtitle">
                    Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
                </p>

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

                <form className="auth-form" onSubmit={handleReset}>
                    <div className="input-group">
                        <label className="input-label" htmlFor="resetEmail">Correo electrónico</label>
                        <input
                            id="resetEmail"
                            className="input"
                            type="email"
                            placeholder="tu@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
                        {loading ? <Loader2 size={20} className="spinner" /> : null}
                        {loading ? 'Enviando...' : 'Enviar enlace'}
                    </button>
                </form>

                <div className="auth-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <ArrowLeft size={14} />
                    <Link href="/login">Volver a iniciar sesión</Link>
                </div>
            </div>
        </div>
    )
}
