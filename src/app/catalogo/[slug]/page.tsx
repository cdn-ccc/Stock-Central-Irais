import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import CatalogoContent from './CatalogoContent'

interface Props {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const supabase = await createClient()
    const { data: business } = await supabase
        .from('businesses')
        .select('name, description')
        .eq('slug', slug)
        .eq('status', 'active')
        .single()

    if (!business) return { title: 'Catálogo no encontrado' }

    return {
        title: `${business.name} — Catálogo`,
        description: business.description || `Explora el catálogo de productos de ${business.name}`,
    }
}

export default async function CatalogoPage({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .single()

    if (!business) notFound()

    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', business.id)
        .is('deleted_at', null)
        .order('sort_order')

    const { data: products } = await supabase
        .from('products')
        .select('*, images:product_images(*), category:categories(name)')
        .eq('business_id', business.id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('is_featured', { ascending: false })
        .order('name')

    return (
        <CatalogoContent
            business={business}
            categories={categories || []}
            products={products || []}
        />
    )
}
