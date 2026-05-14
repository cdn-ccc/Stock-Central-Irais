import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StockMain - Gestión de Inventario y Ventas',
  description: 'Plataforma SaaS para gestión de inventario, ventas y catálogo digital para pequeños comercios de productos de belleza.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
