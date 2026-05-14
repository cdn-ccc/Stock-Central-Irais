'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@/types'
import {
    Package,
    LayoutDashboard,
    ShoppingBag,
    Warehouse,
    Receipt,
    Users,
    FolderOpen,
    Settings,
    LogOut,
    Search,
    Bell,
    Menu,
    X,
} from 'lucide-react'

const navigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/productos', label: 'Productos', icon: ShoppingBag },
    { href: '/categorias', label: 'Categorías', icon: FolderOpen },
    { href: '/inventario', label: 'Inventario', icon: Warehouse },
    { href: '/ventas', label: 'Ventas', icon: Receipt },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/configuracion', label: 'Configuración', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        async function loadUser() {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) {
                router.push('/login')
                return
            }

            const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single()

            if (userData) {
                setUser(userData as User)
            }
            setLoading(false)
        }
        loadUser()
    }, [supabase, router])

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    function getInitials(name: string): string {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'var(--color-bg)',
            }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        )
    }

    return (
        <div className="admin-layout">
            {/* Sidebar Overlay (mobile) */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <Package size={18} />
                    </div>
                    <span className="sidebar-logo-text">StockMain</span>
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setSidebarOpen(false)}
                        style={{ marginLeft: 'auto', display: sidebarOpen ? 'flex' : 'none' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-section-title">Menú principal</div>
                    {navigationItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-user-avatar">
                            {user ? getInitials(user.full_name) : '??'}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{user?.full_name || 'Usuario'}</div>
                            <div className="sidebar-user-role">
                                {user?.role === 'admin' ? 'Administrador' : 'Empleado'}
                            </div>
                        </div>
                        <button
                            className="btn-ghost btn-icon"
                            onClick={handleLogout}
                            title="Cerrar sesión"
                            style={{ flexShrink: 0 }}
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="admin-main">
                <header className="admin-header">
                    <div className="admin-header-left">
                        <button
                            className="mobile-menu-btn"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <div className="admin-search">
                            <Search size={18} />
                            <input type="text" placeholder="Buscar..." />
                        </div>
                    </div>

                    <div className="admin-header-right">
                        <button className="header-icon-btn" title="Notificaciones">
                            <Bell size={20} />
                        </button>
                    </div>
                </header>

                <div className="admin-content">
                    {children}
                </div>
            </main>
        </div>
    )
}
