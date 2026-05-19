'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { DashboardMetrics, TopProduct, DailySales } from '@/types'
import {
    DollarSign,
    TrendingUp,
    Package,
    ShoppingCart,
    AlertTriangle,
    ArrowUpRight,
    XCircle,
} from 'lucide-react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

const CARD_ACCENTS = [
    { border: '#6366F1', bg: '#EEF2FF', icon: '#6366F1' },
    { border: '#10B981', bg: '#D1FAE5', icon: '#10B981' },
    { border: '#3B82F6', bg: '#DBEAFE', icon: '#3B82F6' },
    { border: '#8B5CF6', bg: '#EDE9FE', icon: '#8B5CF6' },
]

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
    const [topProducts, setTopProducts] = useState<TopProduct[]>([])
    const [dailySales, setDailySales] = useState<DailySales[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const todayLabel = new Date().toLocaleDateString('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    const loadDashboard = useCallback(async function loadDashboard() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userData } = await supabase
                .from('users')
                .select('business_id')
                .eq('id', user.id)
                .single()

            if (!userData) return
            const businessId = userData.business_id

            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todayISO = today.toISOString()

            const weekStart = new Date(today)
            weekStart.setDate(today.getDate() - today.getDay() + 1)
            const weekStartISO = weekStart.toISOString()

            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
            const monthStartISO = monthStart.toISOString()

            const [{ data: salesToday }, { data: salesWeek }, { data: salesMonth }] = await Promise.all([
                supabase.from('sales').select('total').eq('business_id', businessId).gte('created_at', todayISO).neq('status', 'cancelled'),
                supabase.from('sales').select('total').eq('business_id', businessId).gte('created_at', weekStartISO).neq('status', 'cancelled'),
                supabase.from('sales').select('total').eq('business_id', businessId).gte('created_at', monthStartISO).neq('status', 'cancelled'),
            ])

            const { count: totalProducts } = await supabase
                .from('products').select('*', { count: 'exact', head: true })
                .eq('business_id', businessId).is('deleted_at', null)

            const { data: lowStockProducts } = await supabase
                .from('products').select('id, stock, min_stock')
                .eq('business_id', businessId).is('deleted_at', null)

            const lowStock = lowStockProducts?.filter(p => p.stock > 0 && p.stock <= p.min_stock).length || 0
            const outOfStock = lowStockProducts?.filter(p => p.stock === 0).length || 0

            const [{ count: pending }, { count: confirmed }] = await Promise.all([
                supabase.from('sales').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'pending'),
                supabase.from('sales').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'confirmed'),
            ])

            setMetrics({
                salesToday: salesToday?.reduce((sum, s) => sum + Number(s.total), 0) || 0,
                salesWeek: salesWeek?.reduce((sum, s) => sum + Number(s.total), 0) || 0,
                salesMonth: salesMonth?.reduce((sum, s) => sum + Number(s.total), 0) || 0,
                totalProducts: totalProducts || 0,
                lowStockCount: lowStock,
                outOfStockCount: outOfStock,
                pendingOrders: pending || 0,
                confirmedOrders: confirmed || 0,
            })

            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const { data: topData } = await supabase
                .from('sale_items')
                .select('product_name, quantity, subtotal, sale:sales!inner(created_at, status, business_id)')
                .eq('sale.business_id', businessId)
                .neq('sale.status', 'cancelled')
                .gte('sale.created_at', thirtyDaysAgo.toISOString())

            if (topData) {
                const productMap = new Map<string, { quantity: number; revenue: number }>()
                topData.forEach((item: { product_name: string; quantity: number; subtotal: number }) => {
                    const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 }
                    productMap.set(item.product_name, {
                        quantity: existing.quantity + item.quantity,
                        revenue: existing.revenue + Number(item.subtotal),
                    })
                })
                setTopProducts(
                    Array.from(productMap.entries())
                        .map(([name, data]) => ({
                            product_id: name,
                            product_name: name,
                            total_quantity: data.quantity,
                            total_revenue: data.revenue,
                        }))
                        .sort((a, b) => b.total_quantity - a.total_quantity)
                        .slice(0, 5)
                )
            }

            const { data: allSales } = await supabase
                .from('sales').select('total, created_at')
                .eq('business_id', businessId).neq('status', 'cancelled')
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: true })

            if (allSales) {
                const dayMap = new Map<string, { total: number; count: number }>()
                for (let i = 29; i >= 0; i--) {
                    const d = new Date()
                    d.setDate(d.getDate() - i)
                    dayMap.set(d.toISOString().split('T')[0], { total: 0, count: 0 })
                }
                allSales.forEach((s: { total: number; created_at: string }) => {
                    const key = s.created_at.split('T')[0]
                    const existing = dayMap.get(key) || { total: 0, count: 0 }
                    dayMap.set(key, { total: existing.total + Number(s.total), count: existing.count + 1 })
                })
                setDailySales(
                    Array.from(dayMap.entries()).map(([date, data]) => ({
                        date: new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
                        total: data.total,
                        count: data.count,
                    }))
                )
            }
        } catch (err) {
            console.error('Error loading dashboard:', err)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => { loadDashboard() }, [loadDashboard])

    if (loading) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Dashboard</h1>
                        <p className="page-subtitle">Cargando...</p>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="skeleton" style={{ height: 110, borderRadius: 16 }} />
                    ))}
                </div>
                <div className="skeleton" style={{ height: 320, borderRadius: 16, marginBottom: 20 }} />
            </div>
        )
    }

    const metricCards = [
        {
            label: 'Ventas hoy',
            value: formatCurrency(metrics?.salesToday || 0),
            sub: `Esta semana ${formatCurrency(metrics?.salesWeek || 0)}`,
            icon: <DollarSign size={16} color={CARD_ACCENTS[0].icon} />,
            accent: CARD_ACCENTS[0],
        },
        {
            label: 'Ventas del mes',
            value: formatCurrency(metrics?.salesMonth || 0),
            sub: 'Últimos 30 días',
            icon: <TrendingUp size={16} color={CARD_ACCENTS[1].icon} />,
            accent: CARD_ACCENTS[1],
        },
        {
            label: 'Productos',
            value: (metrics?.totalProducts || 0).toString(),
            sub: metrics?.outOfStockCount ? `${metrics.outOfStockCount} sin stock` : 'Todos con stock',
            icon: <Package size={16} color={CARD_ACCENTS[2].icon} />,
            accent: CARD_ACCENTS[2],
        },
        {
            label: 'Pedidos activos',
            value: ((metrics?.pendingOrders || 0) + (metrics?.confirmedOrders || 0)).toString(),
            sub: `${metrics?.pendingOrders || 0} pendientes · ${metrics?.confirmedOrders || 0} confirmados`,
            icon: <ShoppingCart size={16} color={CARD_ACCENTS[3].icon} />,
            accent: CARD_ACCENTS[3],
        },
    ]

    const hasAlerts = (metrics?.lowStockCount || 0) + (metrics?.outOfStockCount || 0) > 0

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{todayLabel}</p>
                </div>
            </div>

            {/* Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
                {metricCards.map((card) => (
                    <div key={card.label} style={{
                        background: 'var(--color-surface)',
                        borderRadius: 16,
                        border: '1px solid var(--color-border-light)',
                        borderTop: `3px solid ${card.accent.border}`,
                        padding: '20px 22px',
                        boxShadow: 'var(--shadow-xs)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--color-text-tertiary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                            }}>
                                {card.label}
                            </span>
                            <div style={{
                                width: 30, height: 30, borderRadius: 8,
                                background: card.accent.bg,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {card.icon}
                            </div>
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', lineHeight: 1, marginBottom: 6 }}>
                            {card.value}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                            {card.sub}
                        </div>
                    </div>
                ))}
            </div>

            {/* Alerts — compact */}
            {hasAlerts && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                    {(metrics?.outOfStockCount ?? 0) > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 16px',
                            background: '#FEF2F2',
                            borderRadius: 10,
                            border: '1px solid #FECACA',
                        }}>
                            <XCircle size={15} color="#EF4444" />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#991B1B' }}>
                                {metrics!.outOfStockCount} producto{metrics!.outOfStockCount !== 1 ? 's' : ''} sin stock
                            </span>
                        </div>
                    )}
                    {(metrics?.lowStockCount ?? 0) > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 16px',
                            background: '#FFFBEB',
                            borderRadius: 10,
                            border: '1px solid #FDE68A',
                        }}>
                            <AlertTriangle size={15} color="#F59E0B" />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>
                                {metrics!.lowStockCount} producto{metrics!.lowStockCount !== 1 ? 's' : ''} con stock bajo
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Sales Chart */}
            <div style={{
                background: 'var(--color-surface)',
                borderRadius: 16,
                border: '1px solid var(--color-border-light)',
                marginBottom: 20,
                boxShadow: 'var(--shadow-xs)',
            }}>
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--color-border-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            Tendencia de ventas
                        </h2>
                        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                            Últimos 30 días · {formatCurrency(metrics?.salesMonth || 0)} en total
                        </p>
                    </div>
                </div>
                <div style={{ padding: '16px 8px 8px' }}>
                    {dailySales.length > 0 ? (
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={dailySales} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.15} />
                                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 11, fill: '#AEAEB2' }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={4}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#AEAEB2' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v: number) => v === 0 ? '' : `$${v}`}
                                    width={48}
                                />
                                <Tooltip
                                    formatter={(value) => [formatCurrency(Number(value)), 'Ventas']}
                                    contentStyle={{
                                        borderRadius: 10,
                                        border: '1px solid var(--color-border-light)',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                        fontSize: 13,
                                    }}
                                    cursor={{ stroke: '#E5E5EA', strokeWidth: 1 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#6366F1"
                                    strokeWidth={2}
                                    fill="url(#grad)"
                                    dot={false}
                                    activeDot={{ r: 4, fill: '#6366F1', stroke: 'white', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: 'var(--color-text-tertiary)', fontSize: 14 }}>
                            Sin datos de ventas aún
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom grid: Top Products + Orders */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>

                {/* Top Products */}
                <div style={{
                    background: 'var(--color-surface)',
                    borderRadius: 16,
                    border: '1px solid var(--color-border-light)',
                    boxShadow: 'var(--shadow-xs)',
                    overflow: 'hidden',
                }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--color-border-light)' }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Top productos · 30 días</h2>
                    </div>
                    {topProducts.length > 0 ? (
                        <div>
                            {topProducts.map((p, i) => (
                                <div key={p.product_name} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '14px 22px',
                                    borderBottom: i < topProducts.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                                    gap: 14,
                                }}>
                                    <span style={{
                                        width: 24, height: 24, borderRadius: 6,
                                        background: i === 0 ? '#EEF2FF' : 'var(--color-bg-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 800,
                                        color: i === 0 ? '#6366F1' : 'var(--color-text-tertiary)',
                                        flexShrink: 0,
                                    }}>
                                        {i + 1}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {p.product_name}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                                            {p.total_quantity} {p.total_quantity === 1 ? 'unidad' : 'unidades'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-success)', fontWeight: 700, fontSize: 13 }}>
                                        <ArrowUpRight size={13} />
                                        {formatCurrency(p.total_revenue)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                            Aún no hay ventas registradas
                        </div>
                    )}
                </div>

                {/* Right column: Orders + Stock */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Orders */}
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: 16,
                        border: '1px solid var(--color-border-light)',
                        boxShadow: 'var(--shadow-xs)',
                        overflow: 'hidden',
                    }}>
                        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--color-border-light)' }}>
                            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Pedidos</h2>
                        </div>
                        <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{
                                padding: '14px 16px',
                                borderRadius: 12,
                                background: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#92400E', letterSpacing: '-0.02em', lineHeight: 1 }}>
                                    {metrics?.pendingOrders || 0}
                                </div>
                                <div style={{ fontSize: 11, color: '#B45309', marginTop: 4, fontWeight: 600 }}>Pendientes</div>
                            </div>
                            <div style={{
                                padding: '14px 16px',
                                borderRadius: 12,
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E40AF', letterSpacing: '-0.02em', lineHeight: 1 }}>
                                    {metrics?.confirmedOrders || 0}
                                </div>
                                <div style={{ fontSize: 11, color: '#1D4ED8', marginTop: 4, fontWeight: 600 }}>Confirmados</div>
                            </div>
                        </div>
                    </div>

                    {/* Stock Summary */}
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: 16,
                        border: '1px solid var(--color-border-light)',
                        boxShadow: 'var(--shadow-xs)',
                        overflow: 'hidden',
                    }}>
                        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--color-border-light)' }}>
                            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Inventario</h2>
                        </div>
                        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Total de productos</span>
                                <span style={{ fontSize: 14, fontWeight: 700 }}>{metrics?.totalProducts || 0}</span>
                            </div>
                            <div style={{ height: 1, background: 'var(--color-border-light)' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Stock bajo</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: metrics?.lowStockCount ? '#D97706' : 'var(--color-success)' }}>
                                    {metrics?.lowStockCount || 0}
                                </span>
                            </div>
                            <div style={{ height: 1, background: 'var(--color-border-light)' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Sin stock</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: metrics?.outOfStockCount ? '#EF4444' : 'var(--color-success)' }}>
                                    {metrics?.outOfStockCount || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
