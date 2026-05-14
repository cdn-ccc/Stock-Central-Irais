// ========================
// Business Types
// ========================
export interface Business {
    id: string
    name: string
    slug: string
    description: string | null
    logo_url: string | null
    whatsapp_number: string | null
    primary_color: string
    secondary_color: string
    status: 'active' | 'inactive'
    created_at: string
    updated_at: string
}

// ========================
// User Types
// ========================
export type UserRole = 'admin' | 'employee'

export interface User {
    id: string
    business_id: string
    email: string
    full_name: string
    role: UserRole
    is_active: boolean
    created_at: string
    updated_at: string
}

// ========================
// Category Types
// ========================
export interface Category {
    id: string
    business_id: string
    name: string
    description: string | null
    image_url: string | null
    sort_order: number
    created_at: string
    updated_at: string
    deleted_at: string | null
    product_count?: number
}

// ========================
// Product Types
// ========================
export type ProductStatus = 'active' | 'inactive'

export interface Product {
    id: string
    business_id: string
    category_id: string | null
    name: string
    description: string | null
    sku: string | null
    price: number
    wholesale_price: number | null
    stock: number
    min_stock: number
    status: ProductStatus
    is_featured: boolean
    created_at: string
    updated_at: string
    deleted_at: string | null
    category?: Category
    images?: ProductImage[]
}

export interface ProductImage {
    id: string
    product_id: string
    url: string
    thumbnail_url: string | null
    sort_order: number
    is_primary: boolean
    created_at: string
}

// ========================
// Customer Types
// ========================
export interface Customer {
    id: string
    business_id: string
    full_name: string
    phone: string | null
    email: string | null
    locality: string | null
    notes: string | null
    created_at: string
    updated_at: string
    deleted_at: string | null
    total_purchases?: number
    order_count?: number
    last_purchase_date?: string | null
}

// ========================
// Sale Types
// ========================
export type SaleStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled'

export interface Sale {
    id: string
    business_id: string
    customer_id: string | null
    status: SaleStatus
    subtotal: number
    discount: number
    total: number
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    customer?: Customer
    items?: SaleItem[]
}

export interface SaleItem {
    id: string
    sale_id: string
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
    product?: Product
}

// ========================
// Inventory Types
// ========================
export type InventoryMovementType =
    | 'sale'
    | 'sale_cancellation'
    | 'adjustment_in'
    | 'adjustment_out'
    | 'restock'

export interface InventoryMovement {
    id: string
    business_id: string
    product_id: string
    type: InventoryMovementType
    quantity: number
    stock_before: number
    stock_after: number
    reference_id: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    product?: Product
}

// ========================
// Dashboard Types
// ========================
export interface DashboardMetrics {
    salesToday: number
    salesWeek: number
    salesMonth: number
    totalProducts: number
    lowStockCount: number
    outOfStockCount: number
    pendingOrders: number
    confirmedOrders: number
}

export interface TopProduct {
    product_id: string
    product_name: string
    total_quantity: number
    total_revenue: number
}

export interface DailySales {
    date: string
    total: number
    count: number
}

// ========================
// Cart Types (Public Catalog)
// ========================
export interface CartItem {
    product_id: string
    product_name: string
    price: number
    quantity: number
    image_url: string | null
    max_stock: number
}

export interface OrderForm {
    customer_name: string
    customer_phone: string
    customer_locality: string
}
