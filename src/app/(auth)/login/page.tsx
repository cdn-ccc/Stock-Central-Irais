'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Package, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { Suspense } from 'react'

function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const justRegistered = searchParams.get('registered') === 'true'
    const authError = searchParams.get('error') === 'auth'

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError) {
            setError(
                authError.message === 'Invalid login credentials'
                    ? 'Correo o contraseña incorrectos.'
                    : authError.message === 'Email not confirmed'
                        ? 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.'
                        : 'Error al iniciar sesión. Intenta de nuevo.'
            )
            setLoading(false)
            return
        }

        router.push('/dashboard')
        router.refresh()
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

                <h1 className="auth-title">Bienvenido de vuelta</h1>
                <p className="auth-subtitle">Ingresa a tu cuenta para gestionar tu negocio</p>

                {justRegistered && (
                    <div style={{
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-success-light)',
                        color: '#065F46',
                        fontSize: 'var(--font-size-sm)',
                        marginBottom: 'var(--space-4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                    }}>
                        <CheckCircle size={16} />
                        ¡Cuenta creada! Revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.
                    </div>
                )}

                {authError && (
                    <div style={{
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-error-light)',
                        color: '#991B1B',
                        fontSize: 'var(--font-size-sm)',
                        marginBottom: 'var(--space-4)',
                    }}>
                        Error al verificar tu cuenta. Intenta registrarte de nuevo.
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-error-light)',
                        color: '#991B1B',
                        fontSize: 'var(--font-size-sm)',
                        marginBottom: 'var(--space-4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                    }}>
                        {error}
                    </div>
                )}

                <form className="auth-form" onSubmit={handleLogin}>
                    <div className="input-group">
                        <label className="input-label" htmlFor="email">Correo electrónico</label>
                        <input
                            id="email"
                            className="input"
                            type="email"
                            placeholder="tu@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label" htmlFor="password">Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="password"
                                className="input"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
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

                    <div style={{ textAlign: 'right', marginTop: '-8px' }}>
                        <Link
                            href="/recuperar-contrasena"
                            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', fontWeight: 500 }}
                        >
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

                    <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
                        {loading ? <Loader2 size={20} className="spinner" /> : null}
                        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </button>
                </form>

                <div className="auth-footer">
                    ¿No tienes una cuenta?{' '}
                    <Link href="/registro">Regístrate</Link>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    )
}
