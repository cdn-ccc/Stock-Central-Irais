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
    return { title: business ? `Políticas de Privacidad — ${business.name}` : 'Políticas de Privacidad' }
}

export default async function PrivacidadPage({ params }: Props) {
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
    const muted = '#A89CA3'

    const updated = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;}
.p-root{min-height:100vh;background:${bg};color:${dark};}
.p-header{background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-bottom:1px solid ${border};position:sticky;top:0;z-index:100;height:64px;display:flex;align-items:center;padding:0 24px;}
.p-header-inner{max-width:900px;margin:0 auto;width:100%;display:flex;align-items:center;gap:16px;}
.p-back{display:flex;align-items:center;gap:6px;color:${mid};font-size:14px;font-weight:500;text-decoration:none;padding:8px 14px;border-radius:100px;border:1.5px solid ${border};transition:all .2s;flex-shrink:0;}
.p-back:hover{border-color:${rose};color:${rose};background:${roseLight};}
.p-logo{display:flex;align-items:center;gap:10px;text-decoration:none;flex:1;justify-content:center;}
.p-logo-ph{width:36px;height:36px;border-radius:9px;background:${hero};display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:16px;}
.p-logo-img{width:36px;height:36px;border-radius:9px;object-fit:cover;}
.p-biz{font-weight:700;font-size:16px;color:${dark};}
.p-spacer{width:120px;flex-shrink:0;}

.p-hero{background:linear-gradient(140deg,${heroDark} 0%,${hero} 55%,#E06090 100%);padding:48px 24px;text-align:center;position:relative;overflow:hidden;}
.p-hero-deco{position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none;}
.p-hero-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.2);color:white;padding:5px 14px;border-radius:100px;font-size:12px;font-weight:600;margin-bottom:14px;}
.p-hero-title{font-size:32px;font-weight:800;color:white;letter-spacing:-1px;line-height:1.15;margin-bottom:10px;position:relative;z-index:1;}
.p-hero-updated{font-size:13px;color:rgba(255,255,255,.7);position:relative;z-index:1;}

.p-content{max-width:900px;margin:0 auto;padding:48px 24px 80px;}
.p-toc{background:white;border:1px solid ${border};border-radius:16px;padding:24px;margin-bottom:40px;}
.p-toc-title{font-size:14px;font-weight:700;color:${dark};margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px;}
.p-toc-list{list-style:none;display:flex;flex-direction:column;gap:6px;}
.p-toc-link{font-size:14px;color:${rose};text-decoration:none;font-weight:500;transition:color .2s;}
.p-toc-link:hover{color:${heroDark};}

.p-section{margin-bottom:40px;scroll-margin-top:80px;}
.p-section-title{font-size:20px;font-weight:800;color:${dark};letter-spacing:-.4px;margin-bottom:12px;display:flex;align-items:center;gap:10px;}
.p-section-title::before{content:'';width:4px;height:22px;background:${hero};border-radius:2px;flex-shrink:0;}
.p-section-text{font-size:14px;color:${mid};line-height:1.8;margin-bottom:10px;}
.p-list{list-style:none;display:flex;flex-direction:column;gap:8px;margin:10px 0;}
.p-list li{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:${mid};line-height:1.7;}
.p-list li::before{content:'•';color:${rose};font-weight:800;flex-shrink:0;margin-top:1px;}

.p-highlight{background:${roseLight};border-left:4px solid ${rose};border-radius:0 12px 12px 0;padding:16px 18px;margin:14px 0;}
.p-highlight-text{font-size:13px;color:${dark};font-weight:500;line-height:1.7;}

.p-contact-box{background:white;border:1px solid ${border};border-radius:16px;padding:24px;margin-top:12px;}
.p-contact-title{font-size:15px;font-weight:700;color:${dark};margin-bottom:8px;}
.p-contact-text{font-size:13px;color:${mid};line-height:1.7;}
.p-contact-wa{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;background:#25D366;color:white;border-radius:100px;font-size:13px;font-weight:600;text-decoration:none;transition:background .2s;margin-top:12px;}
.p-contact-wa:hover{background:#20BB5A;}

.p-divider{border:none;border-top:1px solid ${border};margin:32px 0;}
.p-footer-note{font-size:12px;color:${muted};text-align:center;line-height:1.7;}
                `
            }} />

            <div className="p-root">
                <header className="p-header">
                    <div className="p-header-inner">
                        <Link className="p-back" href={`/catalogo/${slug}`}>
                            ← Volver a la tienda
                        </Link>
                        <Link className="p-logo" href={`/catalogo/${slug}`}>
                            {business.logo_url
                                ? <img src={business.logo_url} alt={business.name} className="p-logo-img" />
                                : <div className="p-logo-ph">{business.name[0]}</div>
                            }
                            <span className="p-biz">{business.name}</span>
                        </Link>
                        <div className="p-spacer" />
                    </div>
                </header>

                <div className="p-hero">
                    <div className="p-hero-deco" />
                    <div className="p-hero-badge">🔒 Tus datos, seguros</div>
                    <h1 className="p-hero-title">Políticas de Privacidad</h1>
                    <p className="p-hero-updated">Última actualización: {updated}</p>
                </div>

                <div className="p-content">
                    {/* Índice */}
                    <div className="p-toc">
                        <div className="p-toc-title">Contenido</div>
                        <ol className="p-toc-list">
                            {[
                                '1. Responsable del tratamiento',
                                '2. Datos personales que recopilamos',
                                '3. Finalidad del tratamiento',
                                '4. Uso de datos en pedidos por WhatsApp',
                                '5. Conservación de datos',
                                '6. Derechos ARCO',
                                '7. Seguridad de la información',
                                '8. Cambios a esta política',
                                '9. Contacto',
                            ].map((item, i) => (
                                <li key={i}>
                                    <a className="p-toc-link" href={`#sec-${i + 1}`}>{item}</a>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="p-highlight">
                        <p className="p-highlight-text">
                            En <strong>{business.name}</strong> respetamos tu privacidad y nos comprometemos a proteger tus datos personales conforme a la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> y demás normativa aplicable en México.
                        </p>
                    </div>

                    <div id="sec-1" className="p-section">
                        <h2 className="p-section-title">Responsable del tratamiento</h2>
                        <p className="p-section-text">
                            El responsable del tratamiento de tus datos personales es <strong>{business.name}</strong>, con catálogo de productos en línea accesible a través de nuestra tienda digital.
                        </p>
                    </div>

                    <div id="sec-2" className="p-section">
                        <h2 className="p-section-title">Datos personales que recopilamos</h2>
                        <p className="p-section-text">Para procesar tus pedidos y brindarte atención, podemos recopilar los siguientes datos:</p>
                        <ul className="p-list">
                            <li>Nombre completo</li>
                            <li>Número de teléfono (WhatsApp)</li>
                            <li>Comunidad o localidad de entrega</li>
                            <li>Historial de pedidos realizados</li>
                        </ul>
                        <p className="p-section-text">No recopilamos datos bancarios, contraseñas ni información sensible adicional.</p>
                    </div>

                    <div id="sec-3" className="p-section">
                        <h2 className="p-section-title">Finalidad del tratamiento</h2>
                        <p className="p-section-text">Tus datos personales son utilizados exclusivamente para:</p>
                        <ul className="p-list">
                            <li>Procesar y confirmar tus pedidos</li>
                            <li>Coordinar la entrega de productos en tu localidad</li>
                            <li>Enviarte información sobre promociones y nuevos productos (solo si así lo deseas)</li>
                            <li>Brindarte atención al cliente y resolver dudas o incidencias</li>
                        </ul>
                        <p className="p-section-text">No compartimos tus datos con terceros para fines comerciales ajenos a {business.name}.</p>
                    </div>

                    <div id="sec-4" className="p-section">
                        <h2 className="p-section-title">Uso de datos en pedidos por WhatsApp</h2>
                        <p className="p-section-text">
                            Al realizar un pedido a través de WhatsApp, los datos que compartes (nombre, teléfono y localidad) son enviados directamente a nuestro número de atención. Esta comunicación está sujeta también a las <a href="https://www.whatsapp.com/legal/privacy-policy-eea" target="_blank" rel="noopener noreferrer" style={{ color: '#C4637A' }}>Políticas de Privacidad de WhatsApp</a>.
                        </p>
                        <div className="p-highlight">
                            <p className="p-highlight-text">Tu número de teléfono solo será utilizado para la gestión de tu pedido y no será cedido a terceros bajo ninguna circunstancia.</p>
                        </div>
                    </div>

                    <div id="sec-5" className="p-section">
                        <h2 className="p-section-title">Conservación de datos</h2>
                        <p className="p-section-text">
                            Conservamos tus datos personales únicamente durante el tiempo necesario para cumplir con las finalidades descritas en esta política, o mientras exista una relación comercial activa contigo. Transcurrido ese periodo, los datos serán eliminados de forma segura.
                        </p>
                    </div>

                    <div id="sec-6" className="p-section">
                        <h2 className="p-section-title">Derechos ARCO</h2>
                        <p className="p-section-text">
                            De conformidad con la LFPDPPP, tienes derecho a:
                        </p>
                        <ul className="p-list">
                            <li><strong>Acceso:</strong> conocer qué datos personales tenemos sobre ti y cómo los usamos.</li>
                            <li><strong>Rectificación:</strong> solicitar la corrección de datos inexactos o incompletos.</li>
                            <li><strong>Cancelación:</strong> pedir la eliminación de tus datos cuando ya no sean necesarios.</li>
                            <li><strong>Oposición:</strong> oponerte al tratamiento de tus datos para fines específicos.</li>
                        </ul>
                        <p className="p-section-text">
                            Para ejercer cualquiera de estos derechos, contáctanos a través de WhatsApp indicando tu solicitud. Responderemos en un plazo máximo de 20 días hábiles.
                        </p>
                    </div>

                    <div id="sec-7" className="p-section">
                        <h2 className="p-section-title">Seguridad de la información</h2>
                        <p className="p-section-text">
                            Adoptamos medidas técnicas y organizativas razonables para proteger tus datos personales contra accesos no autorizados, pérdida, alteración o divulgación indebida. Sin embargo, ningún sistema de transmisión por internet es completamente seguro, por lo que no podemos garantizar una seguridad absoluta.
                        </p>
                    </div>

                    <div id="sec-8" className="p-section">
                        <h2 className="p-section-title">Cambios a esta política</h2>
                        <p className="p-section-text">
                            Nos reservamos el derecho de actualizar esta Política de Privacidad en cualquier momento. Los cambios serán publicados en esta misma página con la fecha de actualización correspondiente. Te recomendamos revisarla periódicamente.
                        </p>
                    </div>

                    <div id="sec-9" className="p-section">
                        <h2 className="p-section-title">Contacto</h2>
                        <p className="p-section-text">
                            Si tienes preguntas, dudas o solicitudes relacionadas con esta Política de Privacidad o el tratamiento de tus datos personales, puedes contactarnos:
                        </p>
                        <div className="p-contact-box">
                            <div className="p-contact-title">{business.name}</div>
                            <p className="p-contact-text">
                                Estamos disponibles para atenderte y resolver cualquier inquietud relacionada con tu privacidad y tus datos personales.
                            </p>
                            {business.whatsapp_number && (
                                <a
                                    className="p-contact-wa"
                                    href={`https://wa.me/${business.whatsapp_number.replace(/\D/g, '')}?text=Hola, tengo una consulta sobre la política de privacidad.`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                    Escribir por WhatsApp
                                </a>
                            )}
                        </div>
                    </div>

                    <hr className="p-divider" />
                    <p className="p-footer-note">
                        Esta política fue elaborada de conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento. · {business.name} · {updated}
                    </p>
                </div>
            </div>
        </>
    )
}
