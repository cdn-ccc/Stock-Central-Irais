'use client'

import { useState, useMemo } from 'react'
import { formatCurrency, buildWhatsAppUrl, buildOrderMessage } from '@/lib/utils'
import type { Business, Category, Product, CartItem, OrderForm } from '@/types'
import {
    Search,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    X,
    Send,
    Package,
    ChevronDown,
    Image as ImageIcon,
} from 'lucide-react'

interface Props {
    business: Business
    categories: Category[]
    products: Product[]
}

export default function CatalogoContent({ business, categories, products }: Props) {
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [cart, setCart] = useState<CartItem[]>([])
    const [showCart, setShowCart] = useState(false)
    const [showOrderForm, setShowOrderForm] = useState(false)
    const [orderForm, setOrderForm] = useState<OrderForm>({
        customer_name: '',
        customer_phone: '',
        customer_locality: '',
    })

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            if (selectedCategory && p.category_id !== selectedCategory) return false
            if (search) {
                return p.name.toLowerCase().includes(search.toLowerCase())
            }
            return true
        })
    }, [products, selectedCategory, search])

    // Cart functions
    function addToCart(product: Product) {
        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.id)
            if (existing) {
                if (existing.quantity >= product.stock) return prev
                return prev.map(item =>
                    item.product_id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            const primaryImage = (product.images || []).find(img => img.is_primary) || (product.images || [])[0]
            return [...prev, {
                product_id: product.id,
                product_name: product.name,
                price: product.price,
                quantity: 1,
                image_url: primaryImage?.url || null,
                max_stock: product.stock,
            }]
        })
    }

    function updateCartQuantity(productId: string, delta: number) {
        setCart(prev =>
            prev.map(item => {
                if (item.product_id !== productId) return item
                const newQty = item.quantity + delta
                if (newQty <= 0) return item
                if (newQty > item.max_stock) return item
                return { ...item, quantity: newQty }
            })
        )
    }

    function removeFromCart(productId: string) {
        setCart(prev => prev.filter(item => item.product_id !== productId))
    }

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    function handleSendOrder() {
        if (!orderForm.customer_name || !orderForm.customer_phone) return

        const message = buildOrderMessage(
            business.name,
            orderForm.customer_name,
            orderForm.customer_phone,
            orderForm.customer_locality,
            cart.map(item => ({
                name: item.product_name,
                quantity: item.quantity,
                subtotal: item.price * item.quantity,
            })),
            cartTotal
        )

        const url = buildWhatsAppUrl(business.whatsapp_number || '', message)
        window.open(url, '_blank')
    }

    const primaryColor = business.primary_color || '#6366f1'

    return (
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
            {/* Header */}
            <header style={{
                background: primaryColor,
                color: 'white',
                padding: '16px 20px',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
                <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {business.logo_url ? (
                            <img src={business.logo_url} alt={business.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                            <div style={{
                                width: 36, height: 36, borderRadius: 8,
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: 16,
                            }}>
                                {business.name[0]}
                            </div>
                        )}
                        <span style={{ fontWeight: 700, fontSize: 18 }}>{business.name}</span>
                    </div>

                    <button
                        onClick={() => setShowCart(true)}
                        style={{
                            position: 'relative',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: 12,
                            padding: '8px 16px',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 600,
                            fontSize: 14,
                        }}
                    >
                        <ShoppingCart size={18} />
                        {cartCount > 0 && (
                            <span style={{
                                background: 'white',
                                color: primaryColor,
                                borderRadius: '50%',
                                width: 20,
                                height: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 800,
                            }}>
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>
                {/* Search */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'white',
                    borderRadius: 12,
                    padding: '10px 16px',
                    marginBottom: '16px',
                    border: '1px solid #E5E7EB',
                }}>
                    <Search size={18} color="#9CA3AF" />
                    <input
                        type="text"
                        placeholder="Buscar productos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14, background: 'transparent' }}
                    />
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        marginBottom: '20px',
                        paddingBottom: '4px',
                    }}>
                        <button
                            onClick={() => setSelectedCategory(null)}
                            style={{
                                padding: '6px 16px',
                                borderRadius: 20,
                                border: 'none',
                                background: !selectedCategory ? primaryColor : '#F3F4F6',
                                color: !selectedCategory ? 'white' : '#4B5563',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s',
                            }}
                        >
                            Todos
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                style={{
                                    padding: '6px 16px',
                                    borderRadius: 20,
                                    border: 'none',
                                    background: selectedCategory === cat.id ? primaryColor : '#F3F4F6',
                                    color: selectedCategory === cat.id ? 'white' : '#4B5563',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Products Grid */}
                {filteredProducts.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#9CA3AF',
                    }}>
                        <Package size={48} style={{ marginBottom: 12 }} />
                        <p style={{ fontWeight: 600, fontSize: 16 }}>No se encontraron productos</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '16px',
                    }}>
                        {filteredProducts.map(product => {
                            const primaryImage = (product.images || []).find((img: { is_primary: boolean }) => img.is_primary) || (product.images || [])[0]
                            const isOutOfStock = product.stock === 0
                            const inCart = cart.find(item => item.product_id === product.id)

                            return (
                                <div
                                    key={product.id}
                                    style={{
                                        background: 'white',
                                        borderRadius: 16,
                                        overflow: 'hidden',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                        transition: 'box-shadow 0.2s, transform 0.2s',
                                        opacity: isOutOfStock ? 0.6 : 1,
                                    }}
                                >
                                    {/* Image */}
                                    <div style={{
                                        aspectRatio: '1',
                                        background: '#F3F4F6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                    }}>
                                        {primaryImage ? (
                                            <img
                                                src={primaryImage.url}
                                                alt={product.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <ImageIcon size={32} color="#D1D5DB" />
                                        )}
                                        {isOutOfStock && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                background: '#EF4444',
                                                color: 'white',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                            }}>
                                                Sin disponibilidad
                                            </div>
                                        )}
                                        {product.is_featured && !isOutOfStock && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 8,
                                                left: 8,
                                                background: primaryColor,
                                                color: 'white',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                            }}>
                                                ⭐ Destacado
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ padding: '12px' }}>
                                        {product.category && (
                                            <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>
                                                {(product.category as unknown as { name: string }).name}
                                            </span>
                                        )}
                                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '2px 0 8px', lineHeight: 1.3 }}>
                                            {product.name}
                                        </h3>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 800, fontSize: 16, color: primaryColor }}>
                                                {formatCurrency(product.price)}
                                            </span>
                                            {!isOutOfStock && (
                                                inCart ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <button
                                                            onClick={() => {
                                                                if (inCart.quantity <= 1) removeFromCart(product.id)
                                                                else updateCartQuantity(product.id, -1)
                                                            }}
                                                            style={{
                                                                width: 28, height: 28, borderRadius: '50%',
                                                                border: '1px solid #E5E7EB', background: 'white',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <span style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: 'center' }}>
                                                            {inCart.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => updateCartQuantity(product.id, 1)}
                                                            disabled={inCart.quantity >= product.stock}
                                                            style={{
                                                                width: 28, height: 28, borderRadius: '50%',
                                                                border: 'none', background: primaryColor,
                                                                color: 'white',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                opacity: inCart.quantity >= product.stock ? 0.4 : 1,
                                                            }}
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => addToCart(product)}
                                                        style={{
                                                            width: 32, height: 32, borderRadius: '50%',
                                                            border: 'none', background: primaryColor,
                                                            color: 'white', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'transform 0.15s',
                                                        }}
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Cart Drawer */}
            {showCart && (
                <>
                    <div
                        onClick={() => setShowCart(false)}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                            zIndex: 999, animation: 'fadeIn 0.2s',
                        }}
                    />
                    <div style={{
                        position: 'fixed', top: 0, right: 0, bottom: 0,
                        width: '100%', maxWidth: 420,
                        background: 'white', zIndex: 1000,
                        display: 'flex', flexDirection: 'column',
                        animation: 'slideInRight 0.3s ease-out',
                        boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
                    }}>
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid #F3F4F6',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <h2 style={{ fontWeight: 700, fontSize: 18 }}>
                                Tu pedido {cartCount > 0 && `(${cartCount})`}
                            </h2>
                            <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                            {cart.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                                    <ShoppingCart size={40} style={{ marginBottom: 12 }} />
                                    <p style={{ fontWeight: 600 }}>Tu carrito está vacío</p>
                                    <p style={{ fontSize: 13 }}>Agrega productos para hacer un pedido</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {cart.map(item => (
                                        <div key={item.product_id} style={{
                                            display: 'flex', gap: '12px', padding: '12px',
                                            background: '#F9FAFB', borderRadius: 12,
                                        }}>
                                            <div style={{
                                                width: 56, height: 56, borderRadius: 8,
                                                background: '#E5E7EB',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0, overflow: 'hidden',
                                            }}>
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <ImageIcon size={20} color="#9CA3AF" />
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.product_name}</div>
                                                <div style={{ fontWeight: 700, color: primaryColor, fontSize: 14 }}>
                                                    {formatCurrency(item.price * item.quantity)}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <button onClick={() => {
                                                        if (item.quantity <= 1) removeFromCart(item.product_id)
                                                        else updateCartQuantity(item.product_id, -1)
                                                    }} style={{
                                                        width: 24, height: 24, borderRadius: '50%', border: '1px solid #E5E7EB',
                                                        background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                    }}><Minus size={12} /></button>
                                                    <span style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                                                    <button onClick={() => updateCartQuantity(item.product_id, 1)} style={{
                                                        width: 24, height: 24, borderRadius: '50%', border: 'none',
                                                        background: primaryColor, color: 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                    }}><Plus size={12} /></button>
                                                </div>
                                                <button onClick={() => removeFromCart(item.product_id)} style={{
                                                    background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2,
                                                }}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div style={{ padding: '16px 20px', borderTop: '1px solid #F3F4F6' }}>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', marginBottom: 16,
                                    fontWeight: 800, fontSize: 18,
                                }}>
                                    <span>Total:</span>
                                    <span style={{ color: primaryColor }}>{formatCurrency(cartTotal)}</span>
                                </div>
                                <button
                                    onClick={() => { setShowCart(false); setShowOrderForm(true) }}
                                    style={{
                                        width: '100%', padding: '14px',
                                        background: primaryColor, color: 'white',
                                        border: 'none', borderRadius: 12,
                                        fontWeight: 700, fontSize: 15, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    }}
                                >
                                    <Send size={18} /> Enviar pedido por WhatsApp
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Order Form Modal */}
            {showOrderForm && (
                <div
                    onClick={() => setShowOrderForm(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, padding: 16,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'white', borderRadius: 20,
                            width: '100%', maxWidth: 440, padding: '24px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                        }}
                    >
                        <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Completa tu pedido</h2>
                        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
                            Ingresa tus datos para enviar el pedido por WhatsApp
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                                    Nombre *
                                </label>
                                <input
                                    className="input"
                                    placeholder="Tu nombre"
                                    value={orderForm.customer_name}
                                    onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                                    Teléfono *
                                </label>
                                <input
                                    className="input"
                                    placeholder="Tu número de teléfono"
                                    value={orderForm.customer_phone}
                                    onChange={(e) => setOrderForm({ ...orderForm, customer_phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                                    Comunidad / Localidad
                                </label>
                                <input
                                    className="input"
                                    placeholder="Ej: San Juan del Río"
                                    value={orderForm.customer_locality}
                                    onChange={(e) => setOrderForm({ ...orderForm, customer_locality: e.target.value })}
                                />
                            </div>

                            {/* Order Summary */}
                            <div style={{
                                padding: 16, background: '#F9FAFB', borderRadius: 12,
                            }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Resumen del pedido</div>
                                {cart.map(item => (
                                    <div key={item.product_id} style={{
                                        display: 'flex', justifyContent: 'space-between', fontSize: 13,
                                        padding: '4px 0', color: '#4B5563',
                                    }}>
                                        <span>{item.product_name} x{item.quantity}</span>
                                        <span style={{ fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    borderTop: '1px solid #E5E7EB', marginTop: 8, paddingTop: 8,
                                    fontWeight: 800, fontSize: 15,
                                }}>
                                    <span>Total:</span>
                                    <span style={{ color: primaryColor }}>{formatCurrency(cartTotal)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSendOrder}
                                disabled={!orderForm.customer_name || !orderForm.customer_phone}
                                style={{
                                    width: '100%', padding: '14px',
                                    background: '#25D366', color: 'white',
                                    border: 'none', borderRadius: 12,
                                    fontWeight: 700, fontSize: 15, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    opacity: (!orderForm.customer_name || !orderForm.customer_phone) ? 0.5 : 1,
                                }}
                            >
                                <Send size={18} /> Enviar por WhatsApp
                            </button>

                            <button
                                onClick={() => setShowOrderForm(false)}
                                style={{
                                    width: '100%', padding: '12px',
                                    background: 'transparent', color: '#6B7280',
                                    border: '1px solid #E5E7EB', borderRadius: 12,
                                    fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating cart button (mobile) */}
            {cartCount > 0 && !showCart && !showOrderForm && (
                <div style={{
                    position: 'fixed', bottom: 20, left: 16, right: 16,
                    zIndex: 50,
                }}>
                    <button
                        onClick={() => setShowCart(true)}
                        style={{
                            width: '100%', padding: '14px 20px',
                            background: primaryColor, color: 'white',
                            border: 'none', borderRadius: 16,
                            fontWeight: 700, fontSize: 15, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShoppingCart size={18} />
                            Ver pedido ({cartCount} {cartCount === 1 ? 'producto' : 'productos'})
                        </div>
                        <span>{formatCurrency(cartTotal)}</span>
                    </button>
                </div>
            )}
        </div>
    )
}
