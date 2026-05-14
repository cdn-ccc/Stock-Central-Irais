// Sale statuses
export const SALE_STATUSES = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
} as const

export const SALE_STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
}

export const SALE_STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b',
    confirmed: '#3b82f6',
    delivered: '#10b981',
    cancelled: '#ef4444',
}

// Valid sale transitions
export const SALE_TRANSITIONS: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
}

// Inventory movement types
export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
    sale: 'Venta',
    sale_cancellation: 'Cancelación de venta',
    adjustment_in: 'Ajuste de entrada',
    adjustment_out: 'Ajuste de salida',
    restock: 'Reposición',
}

// Product statuses
export const PRODUCT_STATUS_LABELS: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
}

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 50

// Images
export const MAX_PRODUCT_IMAGES = 5
export const MAX_IMAGE_SIZE_MB = 5
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Currency
export const CURRENCY = 'MXN'
export const CURRENCY_SYMBOL = '$'
