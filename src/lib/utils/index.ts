import { CURRENCY_SYMBOL } from '@/lib/constants'

/**
 * Formats a number as Mexican Peso currency.
 */
export function formatCurrency(amount: number): string {
    return `${CURRENCY_SYMBOL}${amount.toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

/**
 * Formats a date string to a localized display format.
 */
export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

/**
 * Formats a date with time.
 */
export function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

/**
 * Generates a URL-safe slug from a string.
 */
export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
}

/**
 * Truncates text to a maximum length with ellipsis.
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength).trim() + '...'
}

/**
 * Builds a WhatsApp URL with a pre-filled message.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
    const cleanPhone = phone.replace(/\D/g, '')
    const encodedMessage = encodeURIComponent(message)
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`
}

/**
 * Generates a structured WhatsApp order message.
 */
export function buildOrderMessage(
    businessName: string,
    customerName: string,
    customerPhone: string,
    customerLocality: string,
    items: Array<{ name: string; quantity: number; subtotal: number }>,
    total: number
): string {
    const itemLines = items
        .map((item) => `- ${item.name} x${item.quantity} - ${formatCurrency(item.subtotal)}`)
        .join('\n')

    return `*Nuevo Pedido - ${businessName}*

Nombre: ${customerName}
Teléfono: ${customerPhone}
Comunidad: ${customerLocality}

*Productos solicitados:*
${itemLines}

*Total estimado: ${formatCurrency(total)}*`
}

/**
 * Classifies stock level for visual indicators.
 */
export function getStockLevel(stock: number, minStock: number): 'ok' | 'low' | 'out' {
    if (stock === 0) return 'out'
    if (stock <= minStock) return 'low'
    return 'ok'
}

/**
 * Returns CSS class name based on stock level.
 */
export function getStockClassName(stock: number, minStock: number): string {
    const level = getStockLevel(stock, minStock)
    switch (level) {
        case 'out': return 'stock-out'
        case 'low': return 'stock-low'
        default: return 'stock-ok'
    }
}
