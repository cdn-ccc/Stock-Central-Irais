import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'

interface Props {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const supabase = await createClient()
    const { data: business } = await supabase
        .from('businesses')
        .select('name')
        .eq('slug', slug)
        .eq('status', 'active')
        .single()
    return { title: business ? `Sobre Nosotros — ${business.name}` : 'Sobre Nosotros' }
}

export default async function NosotrosPage({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .single()

    if (!business) notFound()

    const rose = '#C4637A'
    const hero = '#D94070'
    const heroDark = '#B83060'
    const dark = '#1C1218'
    const mid = '#6B5B63'
    const bg = '#FDF8F9'
    const border = '#EEE0E5'
    const roseLight = '#FBF0F3'
    const green = '#25D366'

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;}
.n-root{min-height:100vh;background:${bg};color:${dark};}
.n-header{background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-bottom:1px solid ${border};position:sticky;top:0;z-index:100;height:64px;display:flex;align-items:center;padding:0 24px;}
.n-header-inner{max-width:1100px;margin:0 auto;width:100%;display:flex;align-items:center;gap:16px;}
.n-back{display:flex;align-items:center;gap:6px;color:${mid};font-size:14px;font-weight:500;text-decoration:none;padding:8px 14px;border-radius:100px;border:1.5px solid ${border};transition:all .2s;flex-shrink:0;}
.n-back:hover{border-color:${rose};color:${rose};background:${roseLight};}
.n-logo{display:flex;align-items:center;gap:10px;text-decoration:none;flex:1;justify-content:center;}
.n-logo-ph{width:36px;height:36px;border-radius:9px;background:${hero};display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:16px;}
.n-logo-img{width:36px;height:36px;border-radius:9px;object-fit:cover;}
.n-biz{font-weight:700;font-size:16px;color:${dark};}
.n-spacer{width:120px;flex-shrink:0;}

.n-hero{background:linear-gradient(140deg,${heroDark} 0%,${hero} 55%,#E06090 100%);padding:60px 24px;text-align:center;position:relative;overflow:hidden;}
.n-hero-deco{position:absolute;right:-60px;top:-60px;width:250px;height:250px;border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none;}
.n-hero-deco2{position:absolute;left:-40px;bottom:-60px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.05);pointer-events:none;}
.n-hero-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.2);color:white;padding:5px 14px;border-radius:100px;font-size:12px;font-weight:600;margin-bottom:16px;}
.n-hero-title{font-size:36px;font-weight:800;color:white;letter-spacing:-1px;line-height:1.15;margin-bottom:12px;position:relative;z-index:1;}
.n-hero-sub{font-size:15px;color:rgba(255,255,255,.85);max-width:480px;margin:0 auto;line-height:1.65;position:relative;z-index:1;}

.n-content{max-width:1100px;margin:0 auto;padding:56px 24px 80px;}
.n-section{margin-bottom:56px;}
.n-section-badge{display:inline-block;background:${roseLight};color:${rose};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;padding:4px 12px;border-radius:100px;margin-bottom:14px;}
.n-section-title{font-size:26px;font-weight:800;color:${dark};letter-spacing:-.5px;margin-bottom:16px;line-height:1.2;}
.n-section-text{font-size:15px;color:${mid};line-height:1.75;}
.n-section-text+.n-section-text{margin-top:12px;}

.n-values-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:8px;}
.n-value-card{background:white;border:1px solid ${border};border-radius:16px;padding:22px 20px;}
.n-value-icon{font-size:28px;margin-bottom:10px;}
.n-value-title{font-size:15px;font-weight:700;color:${dark};margin-bottom:6px;}
.n-value-text{font-size:13px;color:${mid};line-height:1.6;}

.n-why-grid{display:grid;grid-template-columns:1fr;gap:12px;margin-top:8px;}
.n-why-item{display:flex;align-items:flex-start;gap:14px;background:white;border:1px solid ${border};border-radius:14px;padding:18px 20px;}
.n-why-num{width:32px;height:32px;border-radius:50%;background:${hero};color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;}
.n-why-body{}
.n-why-title{font-size:14px;font-weight:700;color:${dark};margin-bottom:4px;}
.n-why-text{font-size:13px;color:${mid};line-height:1.6;}

.n-cta{background:linear-gradient(140deg,${heroDark} 0%,${hero} 100%);border-radius:20px;padding:40px 28px;text-align:center;position:relative;overflow:hidden;}
.n-cta-deco{position:absolute;right:-40px;top:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.08);pointer-events:none;}
.n-cta-title{font-size:24px;font-weight:800;color:white;margin-bottom:10px;position:relative;z-index:1;}
.n-cta-sub{font-size:14px;color:rgba(255,255,255,.85);margin-bottom:22px;position:relative;z-index:1;}
.n-cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;position:relative;z-index:1;}
.n-cta-btn-p{padding:12px 24px;background:white;color:${hero};border:none;border-radius:100px;font-weight:700;font-size:14px;cursor:pointer;transition:transform .2s,box-shadow .2s;text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
.n-cta-btn-p:hover{transform:scale(1.04);box-shadow:0 4px 16px rgba(0,0,0,.15);}
.n-cta-btn-wa{padding:12px 24px;background:${green};color:white;border:none;border-radius:100px;font-weight:700;font-size:14px;cursor:pointer;transition:background .2s;text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
.n-cta-btn-wa:hover{background:#20BB5A;}

@media(min-width:640px){
    .n-values-grid{grid-template-columns:repeat(2,1fr);}
    .n-why-grid{grid-template-columns:repeat(2,1fr);}
    .n-hero-title{font-size:44px;}
}
@media(min-width:768px){
    .n-values-grid{grid-template-columns:repeat(4,1fr);}
    .n-why-grid{grid-template-columns:repeat(2,1fr);}
}
                `
            }} />

            <div className="n-root">
                <header className="n-header">
                    <div className="n-header-inner">
                        <Link className="n-back" href={`/catalogo/${slug}`}>
                            ← Volver a la tienda
                        </Link>
                        <Link className="n-logo" href={`/catalogo/${slug}`}>
                            {business.logo_url
                                ? <img src={business.logo_url} alt={business.name} className="n-logo-img" />
                                : <div className="n-logo-ph">{business.name[0]}</div>
                            }
                            <span className="n-biz">{business.name}</span>
                        </Link>
                        <div className="n-spacer" />
                    </div>
                </header>

                <div className="n-hero">
                    <div className="n-hero-deco" />
                    <div className="n-hero-deco2" />
                    <div className="n-hero-badge">💄 Nuestra historia</div>
                    <h1 className="n-hero-title">Sobre Nosotros</h1>
                    <p className="n-hero-sub">Conoce a la distribuidora de belleza que lleva confianza, calidad y glamour directamente a tus manos.</p>
                </div>

                <div className="n-content">
                    {/* Quiénes somos */}
                    <div className="n-section">
                        <span className="n-section-badge">Quiénes somos</span>
                        <h2 className="n-section-title">Tu aliada en el mundo de la belleza</h2>
                        <p className="n-section-text">
                            Somos <strong>{business.name}</strong>, una distribuidora especializada en productos de belleza, cosméticos y cuidado personal. Nacimos con la misión de acercar las mejores marcas y productos a cada mujer que busca verse y sentirse increíble.
                        </p>
                        <p className="n-section-text">
                            Contamos con un catálogo cuidadosamente seleccionado que incluye maquillaje, skincare, cuidado del cabello, fragancias y mucho más. Trabajamos directamente con proveedores de confianza para garantizar autenticidad y calidad en cada producto que llega a tus manos.
                        </p>
                    </div>

                    {/* Misión y visión */}
                    <div className="n-section">
                        <div className="n-values-grid">
                            <div className="n-value-card">
                                <div className="n-value-icon">🎯</div>
                                <div className="n-value-title">Misión</div>
                                <div className="n-value-text">Distribuir productos de belleza de alta calidad, accesibles y confiables, que realcen la belleza natural de cada persona.</div>
                            </div>
                            <div className="n-value-card">
                                <div className="n-value-icon">🌟</div>
                                <div className="n-value-title">Visión</div>
                                <div className="n-value-text">Ser la distribuidora de referencia en belleza, reconocida por nuestra calidad, variedad y excelente servicio al cliente.</div>
                            </div>
                            <div className="n-value-card">
                                <div className="n-value-icon">💎</div>
                                <div className="n-value-title">Calidad</div>
                                <div className="n-value-text">Solo trabajamos con productos auténticos y marcas verificadas, cuidando cada detalle de lo que ofrecemos.</div>
                            </div>
                            <div className="n-value-card">
                                <div className="n-value-icon">🤝</div>
                                <div className="n-value-title">Confianza</div>
                                <div className="n-value-text">Construimos relaciones duraderas basadas en la honestidad, el trato justo y el compromiso con nuestras clientas.</div>
                            </div>
                        </div>
                    </div>

                    {/* Por qué elegirnos */}
                    <div className="n-section">
                        <span className="n-section-badge">¿Por qué elegirnos?</span>
                        <h2 className="n-section-title">Razones para confiar en nosotros</h2>
                        <div className="n-why-grid">
                            {[
                                { title: 'Productos 100% auténticos', text: 'Garantizamos que todos nuestros productos son originales, adquiridos directamente de proveedores certificados.' },
                                { title: 'Amplia variedad', text: 'Contamos con cientos de productos en todas las categorías de belleza para que encuentres exactamente lo que buscas.' },
                                { title: 'Atención personalizada', text: 'Te asesoramos para que elijas el producto ideal según tu tipo de piel, tono y necesidades específicas.' },
                                { title: 'Pedidos por WhatsApp', text: 'Realiza tu pedido de forma rápida y sencilla desde WhatsApp, sin complicaciones ni registros.' },
                                { title: 'Precios competitivos', text: 'Al ser distribuidores directos, podemos ofrecerte los mejores precios del mercado sin sacrificar calidad.' },
                                { title: 'Entregas en tu comunidad', text: 'Llevamos tus productos favoritos hasta tu localidad para que no tengas que desplazarte.' },
                            ].map((item, i) => (
                                <div key={i} className="n-why-item">
                                    <div className="n-why-num">{i + 1}</div>
                                    <div className="n-why-body">
                                        <div className="n-why-title">{item.title}</div>
                                        <div className="n-why-text">{item.text}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="n-cta">
                        <div className="n-cta-deco" />
                        <h2 className="n-cta-title">¿Lista para lucir increíble?</h2>
                        <p className="n-cta-sub">Explora nuestro catálogo y encuentra los productos que te harán brillar.</p>
                        <div className="n-cta-btns">
                            <Link className="n-cta-btn-p" href={`/catalogo/${slug}`}>
                                Ver catálogo →
                            </Link>
                            {business.whatsapp_number && (
                                <a
                                    className="n-cta-btn-wa"
                                    href={`https://wa.me/${business.whatsapp_number.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                    Contáctanos
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
