'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { DashboardMetrics, TopProduct, DailySales } from '@/types'
import {
    DollarSign,
    TrendingUp,
    Package,
    AlertTriangle,
    ShoppingCart,
    ArrowUpRight,
} from 'lucide-react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
    const [topProducts, setTopProducts] = useState<TopProduct[]>([])
    const [dailySales, setDailySales] = useState<DailySales[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

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

            // Today's range
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todayISO = today.toISOString()

            // Week start (Monday)
            const weekStart = new Date(today)
            weekStart.setDate(today.getDate() - today.getDay() + 1)
            const weekStartISO = weekStart.toISOString()

            // Month start
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
            const monthStartISO = monthStart.toISOString()

            // Sales today
            const { data: salesToday } = await supabase
                .from('sales')
                .select('total')
                .eq('business_id', businessId)
                .gte('created_at', todayISO)
                .neq('status', 'cancelled')

            // Sales week
            const { data: salesWeek } = await supabase
                .from('sales')
                .select('total')
                .eq('business_id', businessId)
                .gte('created_at', weekStartISO)
                .neq('status', 'cancelled')

            // Sales month
            const { data: salesMonth } = await supabase
                .from('sales')
                .select('total')
                .eq('business_id', businessId)
                .gte('created_at', monthStartISO)
                .neq('status', 'cancelled')

            // Product counts
            const { count: totalProducts } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', businessId)
                .is('deleted_at', null)

            const { data: lowStockProducts } = await supabase
                .from('products')
                .select('id, stock, min_stock')
                .eq('business_id', businessId)
                .is('deleted_at', null)

            const lowStock = lowStockProducts?.filter(p => p.stock > 0 && p.stock <= p.min_stock).length || 0
            const outOfStock = lowStockProducts?.filter(p => p.stock === 0).length || 0

            // Pending/Confirmed orders
            const { count: pending } = await supabase
                .from('sales')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', businessId)
                .eq('status', 'pending')

            const { count: confirmed } = await supabase
                .from('sales')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', businessId)
                .eq('status', 'confirmed')

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

            // Top products (last 30 days)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            const { data: topData } = await supabase
                .from('sale_items')
                .select(`
          product_name,
          quantity,
          subtotal,
          sale:sales!inner(created_at, status, business_id)
        `)
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
                const topArr: TopProduct[] = Array.from(productMap.entries())
                    .map(([name, data]) => ({
                        product_id: name,
                        product_name: name,
                        total_quantity: data.quantity,
                        total_revenue: data.revenue,
                    }))
                    .sort((a, b) => b.total_quantity - a.total_quantity)
                    .slice(0, 5)
                setTopProducts(topArr)
            }

            // Daily sales (last 30 days)
            const { data: allSales } = await supabase
                .from('sales')
                .select('total, created_at')
                .eq('business_id', businessId)
                .neq('status', 'cancelled')
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: true })

            if (allSales) {
                const dayMap = new Map<string, { total: number; count: number }>()
                // Fill all 30 days
                for (let i = 29; i >= 0; i--) {
                    const d = new Date()
                    d.setDate(d.getDate() - i)
                    const key = d.toISOString().split('T')[0]
                    dayMap.set(key, { total: 0, count: 0 })
                }
                allSales.forEach((s: { total: number; created_at: string }) => {
                    const key = s.created_at.split('T')[0]
                    const existing = dayMap.get(key) || { total: 0, count: 0 }
                    dayMap.set(key, { total: existing.total + Number(s.total), count: existing.count + 1 })
                })
                setDailySales(
                    Array.from(dayMap.entries()).map(([date, data]) => ({
                        date: new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
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

    useEffect(() => {
        loadDashboard()
    }, [loadDashboard])

    if (loading) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Dashboard</h1>
                        <p className="page-subtitle">Resumen de tu negocio</p>
                    </div>
                </div>
                <div className="metrics-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-xl)' }} />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Resumen general de tu negocio</p>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="metrics-grid">
                <div className="metric-card card-gradient-dark card">
                    <div className="metric-card-icon" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <DollarSign size={20} color="white" />
                    </div>
                    <div className="metric-card-value">{formatCurrency(metrics?.salesToday || 0)}</div>
                    <div className="metric-card-label">Ventas hoy</div>
                </div>

                <div className="metric-card card-gradient-peach card">
                    <div className="metric-card-icon" style={{ background: 'rgba(255,255,255,0.4)' }}>
                        <TrendingUp size={20} />
                    </div>
                    <div className="metric-card-value">{formatCurrency(metrics?.salesWeek || 0)}</div>
                    <div className="metric-card-label">Ventas esta semana</div>
                </div>

                <div className="metric-card card-gradient-mint card">
                    <div className="metric-card-icon" style={{ background: 'rgba(255,255,255,0.4)' }}>
                        <ShoppingCart size={20} />
                    </div>
                    <div className="metric-card-value">{formatCurrency(metrics?.salesMonth || 0)}</div>
                    <div className="metric-card-label">Ventas este mes</div>
                </div>

                <div className="metric-card card-gradient-lavender card">
                    <div className="metric-card-icon" style={{ background: 'rgba(255,255,255,0.4)' }}>
                        <Package size={20} />
                    </div>
                    <div className="metric-card-value">{metrics?.totalProducts || 0}</div>
                    <div className="metric-card-label">Productos activos</div>
                </div>
            </div>

            {/* Alerts */}
            {(metrics?.lowStockCount || 0) + (metrics?.outOfStockCount || 0) > 0 && (
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-8)',
                    flexWrap: 'wrap',
                }}>
                    {metrics?.outOfStockCount ? (
                        <div className="card" style={{
                            padding: 'var(--space-4) var(--space-5)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            borderLeft: '4px solid var(--color-error)',
                            flex: 1,
                            minWidth: 200,
                        }}>
                            <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                    {metrics.outOfStockCount} producto(s) sin stock
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                    Requieren reposición urgente
                                </div>
                            </div>
                        </div>
                    ) : null}
                    {metrics?.lowStockCount ? (
                        <div className="card" style={{
                            padding: 'var(--space-4) var(--space-5)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            borderLeft: '4px solid var(--color-warning)',
                            flex: 1,
                            minWidth: 200,
                        }}>
                            <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                    {metrics.lowStockCount} producto(s) con stock bajo
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                    Por debajo del mínimo configurado
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Charts + Top products */}
            <div className="dashboard-grid">
                {/* Sales Chart */}
                <div className="card">
                    <div className="card-header">
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                            Ventas (últimos 30 días)
                        </h2>
                    </div>
                    <div className="card-body">
                        {dailySales.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={dailySales}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F2" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11, fill: '#6E6E73' }}
                                        tickLine={false}
                                        axisLine={{ stroke: '#F0F0F2' }}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#6E6E73' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v: number) => `$${v}`}
                                    />
                                    <Tooltip
                                        formatter={(value) => [formatCurrency(Number(value)), 'Ventas']}
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#6366F1"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorTotal)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
                                <p style={{ color: 'var(--color-text-tertiary)' }}>No hay datos de ventas aún</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Products + Order Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                    <div className="card">
                        <div className="card-header">
                            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                                Top 5 Productos
                            </h2>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {topProducts.length > 0 ? (
                                <div>
                                    {topProducts.map((product, index) => (
                                        <div
                                            key={product.product_name}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: 'var(--space-4) var(--space-6)',
                                                borderBottom: index < topProducts.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                <span style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 'var(--radius-full)',
                                                    background: 'var(--color-bg-secondary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 'var(--font-size-xs)',
                                                    fontWeight: 700,
                                                    color: 'var(--color-text-secondary)',
                                                }}>
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                                        {product.product_name}
                                                    </div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                                                        {product.total_quantity} vendidos
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{
                                                fontWeight: 700,
                                                fontSize: 'var(--font-size-sm)',
                                                color: 'var(--color-success)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                            }}>
                                                <ArrowUpRight size={14} />
                                                {formatCurrency(product.total_revenue)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                                    <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                                        Aún no hay ventas registradas
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Order Status */}
                    <div className="card">
                        <div className="card-header">
                            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                                Pedidos
                            </h2>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                                <div style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    padding: 'var(--space-4)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--color-warning-light)',
                                }}>
                                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                                        {metrics?.pendingOrders || 0}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#92400E' }}>Pendientes</div>
                                </div>
                                <div style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    padding: 'var(--space-4)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--color-info-light)',
                                }}>
                                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                                        {metrics?.confirmedOrders || 0}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#1E40AF' }}>Confirmados</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
