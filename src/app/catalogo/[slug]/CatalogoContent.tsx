'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { formatCurrency, buildWhatsAppUrl, buildOrderMessage } from '@/lib/utils'
import type { Business, Category, Product, CartItem, OrderForm } from '@/types'
import {
    Search, ShoppingCart, Plus, Minus, Trash2, X, Send, Package,
    ChevronLeft, ChevronRight, Image as ImageIcon, ArrowRight,
} from 'lucide-react'

interface Props {
    business: Business
    categories: Category[]
    products: Product[]
}

const C = {
    bg: '#FDF8F9',
    white: '#FFFFFF',
    border: '#EEE0E5',
    rose: '#C4637A',
    roseHover: '#B05570',
    roseLight: '#FBF0F3',
    roseMid: '#E8A0B0',
    dark: '#1C1218',
    mid: '#6B5B63',
    muted: '#A89CA3',
    green: '#25D366',
    greenHover: '#20BB5A',
    red: '#EF4444',
    hero: '#D94070',
    heroDark: '#B83060',
    heroMid: '#E06090',
}

const PROMO = [
    { label: 'Skincare\nEsencial', sub: 'Cuida tu piel', bg: 'linear-gradient(145deg,#FF9A9E 0%,#F2567A 100%)', emoji: '🌸' },
    { label: 'Maquillaje\nPremium', sub: 'Las mejores marcas', bg: 'linear-gradient(145deg,#F5D26C 0%,#E8A030 100%)', emoji: '💄' },
    { label: 'Cabello &\nCuidado', sub: 'Brillo y suavidad', bg: 'linear-gradient(145deg,#C8B4E5 0%,#A07FCC 100%)', emoji: '✨' },
    { label: 'Kits &\nSets', sub: 'Regalos perfectos', bg: 'linear-gradient(145deg,#5C4D6D 0%,#3D2A52 100%)', emoji: '🎁' },
]

const css = `
.s-root{min-height:100vh;background:${C.bg};font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;color:${C.dark};}

/* ── Header ── */
.s-header{background:rgba(255,255,255,0.96);backdrop-filter:blur(12px);border-bottom:1px solid ${C.border};position:sticky;top:0;z-index:200;padding:0 20px;height:64px;display:flex;align-items:center;}
.s-header-inner{max-width:1280px;margin:0 auto;width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;}
.s-logo{display:flex;align-items:center;gap:10px;flex-shrink:0;text-decoration:none;}
.s-logo-img{width:40px;height:40px;border-radius:10px;object-fit:cover;}
.s-logo-ph{width:40px;height:40px;border-radius:10px;background:${C.hero};display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:18px;}
.s-biz-name{font-weight:700;font-size:17px;letter-spacing:-0.3px;color:${C.dark};}
.s-nav{display:none;align-items:center;gap:2px;flex:1;padding:0 16px;}
.s-nav-a{padding:7px 12px;font-size:14px;font-weight:500;color:${C.mid};border-radius:8px;background:none;border:none;cursor:pointer;transition:all .2s;text-decoration:none;display:inline-block;}
.s-nav-a:hover{background:${C.roseLight};color:${C.rose};}
.s-header-right{display:flex;align-items:center;gap:8px;}
.s-search-wrap{position:relative;display:none;}
.s-search-input{width:220px;padding:9px 16px 9px 38px;border:1.5px solid ${C.border};border-radius:100px;font-size:14px;outline:none;background:${C.bg};color:${C.dark};box-sizing:border-box;transition:border-color .2s,box-shadow .2s;}
.s-search-input:focus{border-color:${C.rose};background:white;box-shadow:0 0 0 3px ${C.roseLight};}
.s-search-icon{position:absolute;left:13px;top:50%;transform:translateY(-50%);pointer-events:none;color:${C.muted};}
.s-cart-btn{display:flex;align-items:center;gap:8px;padding:9px 18px;background:${C.hero};color:white;border:none;border-radius:100px;font-weight:600;font-size:14px;cursor:pointer;flex-shrink:0;transition:background .2s,transform .15s;}
.s-cart-btn:hover{background:${C.heroDark};transform:scale(1.03);}
.s-cart-badge{background:white;color:${C.hero};border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;}

/* ── Hero ── */
.s-hero-outer{padding:16px 16px 0;max-width:1440px;margin:0 auto;}
.s-hero{background:linear-gradient(140deg,${C.heroDark} 0%,${C.hero} 55%,${C.heroMid} 100%);border-radius:20px;overflow:hidden;padding:36px 28px 28px;position:relative;}
.s-hero-deco{position:absolute;right:-80px;top:-80px;width:320px;height:320px;border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none;z-index:0;}
.s-hero-deco2{position:absolute;left:-50px;bottom:-100px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.05);pointer-events:none;z-index:0;}
.s-hero-inner{display:flex;align-items:center;justify-content:space-between;gap:16px;position:relative;z-index:1;}
.s-hero-left{flex:1;min-width:0;}
.s-hero-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.2);color:white;padding:5px 14px;border-radius:100px;font-size:12px;font-weight:600;margin-bottom:14px;letter-spacing:.2px;}
.s-hero-title{font-size:34px;font-weight:800;color:white;line-height:1.15;letter-spacing:-1px;margin-bottom:10px;}
.s-hero-sub{font-size:14px;color:rgba(255,255,255,.85);line-height:1.65;margin-bottom:20px;max-width:360px;}
.s-hero-btns{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;}
.s-hero-btn-p{padding:11px 22px;background:white;color:${C.hero};border:none;border-radius:100px;font-weight:700;font-size:13px;cursor:pointer;transition:transform .2s,box-shadow .2s;display:flex;align-items:center;gap:6px;}
.s-hero-btn-p:hover{transform:scale(1.04);box-shadow:0 4px 16px rgba(0,0,0,.18);}
.s-hero-btn-o{padding:11px 22px;background:transparent;color:white;border:2px solid rgba(255,255,255,.5);border-radius:100px;font-weight:600;font-size:13px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px;}
.s-hero-btn-o:hover{background:rgba(255,255,255,.15);border-color:white;}
.s-hero-social{display:flex;align-items:center;gap:10px;}
.s-hero-avs{display:flex;}
.s-hero-av{width:30px;height:30px;border-radius:50%;border:2px solid white;overflow:hidden;margin-left:-8px;background:rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${C.hero};flex-shrink:0;}
.s-hero-av:first-child{margin-left:0;}
.s-hero-soc-lbl{font-size:11px;color:rgba(255,255,255,.8);font-weight:500;}
.s-hero-stars{display:flex;align-items:center;gap:4px;margin-top:1px;}
.s-hero-rating{font-size:12px;font-weight:700;color:white;}
.s-hero-reviews{font-size:11px;color:rgba(255,255,255,.65);}
.s-hero-right{flex-shrink:0;display:none;align-items:flex-end;}
.s-hero-circle{width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.18);overflow:hidden;display:flex;align-items:flex-end;justify-content:center;}
.s-hero-circle img{width:100%;height:100%;object-fit:cover;object-position:center top;}
.s-hero-bottom{display:flex;align-items:center;gap:10px;margin-top:16px;position:relative;z-index:1;}
.s-hero-bottom-txt{font-size:12px;color:rgba(255,255,255,.75);}
.s-hero-bottom-btn{padding:7px 16px;background:transparent;color:white;border:1.5px solid rgba(255,255,255,.6);border-radius:100px;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;}
.s-hero-bottom-btn:hover{background:rgba(255,255,255,.15);}

/* ── Promo Section ── */
.s-promo-outer{padding:28px 0 0;}
.s-sec-hdr{text-align:center;margin-bottom:20px;}
.s-sec-hdr-title{font-size:22px;font-weight:800;color:${C.rose};letter-spacing:-.3px;}
.s-sec-dots{display:flex;justify-content:center;gap:4px;margin-top:6px;}
.s-sec-dot{width:7px;height:7px;border-radius:50%;background:${C.roseMid};}
.s-sec-dot.lg{width:14px;border-radius:4px;background:${C.rose};}
.s-promo-scroll{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;padding:4px 16px 12px;}
.s-promo-scroll::-webkit-scrollbar{display:none;}
.s-pcard{min-width:200px;width:200px;border-radius:20px;padding:28px 22px 24px;flex-shrink:0;cursor:pointer;transition:transform .2s,box-shadow .2s;position:relative;overflow:hidden;}
.s-pcard:hover{transform:translateY(-4px);box-shadow:0 12px 28px rgba(0,0,0,.18);}
.s-pcard-emoji{font-size:34px;position:absolute;right:14px;bottom:12px;opacity:.35;}
.s-pcard-label{font-size:15px;font-weight:800;line-height:1.25;color:white;margin-bottom:3px;white-space:pre-line;}
.s-pcard-sub{font-size:11px;color:rgba(255,255,255,.8);font-weight:500;margin-bottom:14px;}
.s-pcard-cta{font-size:11px;font-weight:700;color:white;background:rgba(255,255,255,.25);border:none;border-radius:100px;padding:5px 12px;cursor:pointer;transition:background .2s;}
.s-pcard-cta:hover{background:rgba(255,255,255,.4);}

/* ── Main ── */
.s-main{max-width:1280px;margin:0 auto;padding:24px 16px 80px;}
.s-mobile-search{position:relative;margin-bottom:20px;}
.s-mobile-input{width:100%;padding:12px 16px 12px 44px;border:1.5px solid ${C.border};border-radius:14px;font-size:15px;outline:none;background:white;color:${C.dark};box-sizing:border-box;transition:border-color .2s,box-shadow .2s;}
.s-mobile-input:focus{border-color:${C.rose};box-shadow:0 0 0 3px ${C.roseLight};}
.s-mobile-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:${C.muted};}

/* ── Categories ── */
.s-cats-sec{margin-bottom:8px;}
.s-cats-hd{text-align:center;margin-bottom:14px;}
.s-cats-hd-title{font-size:22px;font-weight:800;color:${C.rose};letter-spacing:-.3px;}
.s-cats-hd-dots{display:flex;justify-content:center;gap:4px;margin-top:5px;}
.s-cats{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;padding-bottom:4px;margin-bottom:24px;}
.s-cats::-webkit-scrollbar{display:none;}
.s-cat{padding:7px 18px;border-radius:100px;border:1.5px solid transparent;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .2s;flex-shrink:0;}
.s-cat.on{background:${C.rose};color:white;border-color:${C.rose};}
.s-cat.off{background:white;color:${C.mid};border-color:${C.border};}
.s-cat.off:hover{border-color:${C.roseMid};color:${C.rose};background:${C.roseLight};}

/* ── Section header ── */
.s-sec-hd{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px;}
.s-sec-title{font-size:20px;font-weight:700;letter-spacing:-0.3px;}
.s-sec-count{font-size:13px;color:${C.muted};font-weight:500;}

/* ── Grid ── */
.s-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}

/* ── Product Card ── */
.s-card{background:white;border-radius:16px;overflow:hidden;border:1px solid ${C.border};transition:box-shadow .25s,transform .25s;cursor:pointer;}
.s-card:hover{box-shadow:0 8px 28px rgba(196,99,122,.15);transform:translateY(-3px);}
.s-card.oos{opacity:.65;}
.s-card-img{aspect-ratio:1;background:${C.roseLight};overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;}
.s-card-img img{width:100%;height:100%;object-fit:cover;transition:transform .4s;}
.s-card:hover .s-card-img img{transform:scale(1.06);}
.s-badge{position:absolute;padding:3px 10px;border-radius:100px;font-size:10px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;}
.s-badge.feat{top:8px;left:8px;background:${C.rose};color:white;}
.s-badge.agot{top:8px;right:8px;background:rgba(28,18,24,.7);color:white;}
.s-card-body{padding:12px;}
.s-card-cat{font-size:10px;font-weight:600;color:${C.rose};text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
.s-card-name{font-size:14px;font-weight:600;color:${C.dark};line-height:1.35;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.s-card-ft{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.s-price{font-size:16px;font-weight:800;color:${C.rose};letter-spacing:-.3px;}
.s-add{width:32px;height:32px;border-radius:50%;border:none;background:${C.rose};color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .2s,transform .15s;}
.s-add:hover{background:${C.roseHover};transform:scale(1.12);}
.s-qty{display:flex;align-items:center;gap:6px;}
.s-qbtn{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;border:1.5px solid ${C.border};background:white;color:${C.dark};transition:all .2s;}
.s-qbtn:hover{border-color:${C.rose};color:${C.rose};}
.s-qbtn.p{border:none;background:${C.rose};color:white;}
.s-qbtn.p:hover{background:${C.roseHover};}
.s-qnum{font-weight:700;font-size:14px;min-width:20px;text-align:center;}

/* ── Empty ── */
.s-empty{text-align:center;padding:80px 20px;color:${C.muted};}
.s-empty-t{font-weight:700;font-size:18px;margin-top:16px;color:${C.mid};}
.s-empty-s{font-size:14px;margin-top:6px;}

/* ── Overlay ── */
.s-ov{position:fixed;inset:0;background:rgba(20,10,15,.55);z-index:300;animation:sFadeIn .2s;backdrop-filter:blur(4px);}

/* ── Product Modal ── */
.s-pmodal{position:fixed;inset:0;z-index:301;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;}
.s-pmodal-inner{pointer-events:all;background:white;border-radius:24px 24px 0 0;width:100%;max-height:92vh;overflow-y:auto;animation:sSlideUp .32s cubic-bezier(.34,1.56,.64,1);position:relative;}
.s-pmodal-imgwrap{background:${C.roseLight};aspect-ratio:1;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.s-pmodal-imgwrap img{width:100%;height:100%;object-fit:cover;}
.s-pmodal-close{position:absolute;top:12px;right:12px;width:32px;height:32px;background:rgba(255,255,255,.92);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.12);z-index:2;transition:transform .2s;}
.s-pmodal-close:hover{transform:scale(1.1);}
.s-pmodal-nav{position:absolute;top:50%;transform:translateY(-50%);width:36px;height:36px;background:rgba(255,255,255,.92);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.12);transition:background .2s,transform .2s;}
.s-pmodal-nav:hover{background:white;transform:translateY(-50%) scale(1.1);}
.s-pmodal-nav.prev{left:12px;}
.s-pmodal-nav.next{right:12px;}
.s-dots{display:flex;gap:6px;justify-content:center;position:absolute;bottom:10px;left:0;right:0;}
.s-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.5);border:none;cursor:pointer;padding:0;transition:background .2s,transform .2s;}
.s-dot.on{background:white;transform:scale(1.4);}
.s-pmodal-body{padding:22px 20px 36px;}
.s-pmodal-cat{font-size:11px;font-weight:600;color:${C.rose};text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px;}
.s-pmodal-name{font-size:22px;font-weight:800;color:${C.dark};line-height:1.2;letter-spacing:-.4px;margin-bottom:6px;}
.s-pmodal-price{font-size:26px;font-weight:800;color:${C.rose};letter-spacing:-.5px;margin-bottom:14px;}
.s-pmodal-desc{font-size:14px;color:${C.mid};line-height:1.65;margin-bottom:16px;}
.s-stock-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 13px;border-radius:100px;font-size:12px;font-weight:600;margin-bottom:20px;}
.s-stock-chip.in{background:#F0FDF4;color:#16A34A;}
.s-stock-chip.low{background:#FFF7ED;color:#EA580C;}
.s-stock-chip.out{background:#FEF2F2;color:#DC2626;}
.s-stock-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0;}
.s-modal-add{width:100%;padding:15px;background:${C.rose};color:white;border:none;border-radius:14px;font-weight:700;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s,transform .15s;}
.s-modal-add:hover{background:${C.roseHover};transform:scale(1.01);}
.s-modal-add:disabled{background:#D1D5DB;cursor:default;transform:none;}
.s-modal-qty{display:flex;align-items:center;gap:16px;margin-bottom:14px;}
.s-modal-qty-label{font-size:14px;font-weight:600;color:${C.mid};}
.s-modal-qty-ctrl{display:flex;align-items:center;gap:12px;}

/* ── Cart Drawer ── */
.s-cart{position:fixed;top:0;right:0;bottom:0;width:100%;max-width:420px;background:white;z-index:400;display:flex;flex-direction:column;animation:sSlideRight .28s cubic-bezier(.34,1.56,.64,1);box-shadow:-8px 0 40px rgba(0,0,0,.12);}
.s-cart-hd{padding:20px 20px 16px;border-bottom:1px solid ${C.border};display:flex;align-items:center;justify-content:space-between;}
.s-cart-title{font-size:20px;font-weight:800;letter-spacing:-.3px;}
.s-cart-x{width:36px;height:36px;border-radius:50%;border:1.5px solid ${C.border};background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;color:${C.mid};transition:all .2s;}
.s-cart-x:hover{border-color:${C.rose};color:${C.rose};}
.s-cart-items{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:10px;}
.s-cart-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:${C.muted};text-align:center;padding:40px 20px;}
.s-cart-empty-t{font-weight:700;font-size:16px;color:${C.mid};margin-top:12px;}
.s-cart-empty-s{font-size:13px;margin-top:4px;}
.s-citem{display:flex;gap:12px;padding:12px;background:${C.bg};border-radius:14px;border:1px solid ${C.border};}
.s-citem-img{width:60px;height:60px;border-radius:10px;background:${C.roseLight};overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.s-citem-img img{width:100%;height:100%;object-fit:cover;}
.s-citem-info{flex:1;min-width:0;}
.s-citem-name{font-size:14px;font-weight:600;color:${C.dark};margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.s-citem-price{font-size:15px;font-weight:800;color:${C.rose};}
.s-citem-ctrl{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;}
.s-del{background:none;border:none;cursor:pointer;color:${C.muted};padding:2px;transition:color .2s;}
.s-del:hover{color:${C.red};}
.s-cart-ft{padding:16px 20px 28px;border-top:1px solid ${C.border};}
.s-cart-total{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding:14px 16px;background:${C.roseLight};border-radius:12px;}
.s-cart-total-lbl{font-size:14px;font-weight:600;color:${C.mid};}
.s-cart-total-amt{font-size:22px;font-weight:800;color:${C.rose};letter-spacing:-.5px;}
.s-checkout{width:100%;padding:15px;background:${C.green};color:white;border:none;border-radius:14px;font-weight:700;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s;}
.s-checkout:hover{background:${C.greenHover};}

/* ── Order Form ── */
.s-omodal{position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;}
.s-omodal-inner{background:white;border-radius:24px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;padding:28px 24px;box-shadow:0 24px 60px rgba(0,0,0,.2);animation:sSlideUp .3s;}
.s-omodal-title{font-size:22px;font-weight:800;letter-spacing:-.4px;margin-bottom:4px;}
.s-omodal-sub{font-size:13px;color:${C.muted};margin-bottom:22px;}
.s-field{margin-bottom:16px;}
.s-label{display:block;font-size:13px;font-weight:600;color:${C.mid};margin-bottom:6px;}
.s-input{width:100%;padding:11px 14px;border:1.5px solid ${C.border};border-radius:10px;font-size:15px;outline:none;color:${C.dark};transition:border-color .2s,box-shadow .2s;box-sizing:border-box;background:white;}
.s-input:focus{border-color:${C.rose};box-shadow:0 0 0 3px ${C.roseLight};}
.s-osummary{padding:14px 16px;background:${C.bg};border-radius:12px;margin-bottom:16px;border:1px solid ${C.border};}
.s-osummary-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${C.muted};margin-bottom:10px;}
.s-osummary-item{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:${C.mid};}
.s-osummary-total{display:flex;justify-content:space-between;border-top:1px solid ${C.border};margin-top:8px;padding-top:8px;font-weight:800;font-size:15px;}
.s-send{width:100%;padding:14px;background:${C.green};color:white;border:none;border-radius:12px;font-weight:700;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s;margin-bottom:10px;}
.s-send:hover{background:${C.greenHover};}
.s-send:disabled{opacity:.5;cursor:default;}
.s-cancel{width:100%;padding:12px;background:transparent;color:${C.muted};border:1.5px solid ${C.border};border-radius:12px;font-weight:600;font-size:14px;cursor:pointer;transition:all .2s;}
.s-cancel:hover{border-color:${C.rose};color:${C.rose};}

/* ── Float Cart ── */
.s-float{position:fixed;bottom:20px;left:16px;right:16px;z-index:50;}
.s-float-btn{width:100%;padding:14px 20px;background:${C.hero};color:white;border:none;border-radius:16px;font-weight:700;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;box-shadow:0 8px 28px rgba(217,64,112,.4);transition:transform .2s;}
.s-float-btn:hover{transform:scale(1.01);}

/* ── Footer ── */
.s-footer{background:${C.dark};color:white;padding:48px 24px 28px;margin-top:40px;}
.s-footer-inner{max-width:1280px;margin:0 auto;}
.s-footer-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:36px;}
.s-footer-brand{grid-column:1/-1;}
.s-footer-logo{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.s-footer-logo-ph{width:40px;height:40px;border-radius:10px;background:${C.rose};display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:18px;flex-shrink:0;}
.s-footer-name{font-weight:700;font-size:18px;color:white;}
.s-footer-desc{font-size:13px;color:rgba(255,255,255,.55);line-height:1.7;max-width:320px;}
.s-footer-col-title{font-size:13px;font-weight:700;color:rgba(255,255,255,.9);margin-bottom:14px;text-transform:uppercase;letter-spacing:.5px;}
.s-footer-link{display:block;font-size:13px;color:rgba(255,255,255,.55);margin-bottom:10px;text-decoration:none;transition:color .2s;background:none;border:none;cursor:pointer;padding:0;text-align:left;}
.s-footer-link:hover{color:${C.roseMid};}
.s-footer-hr{border:none;border-top:1px solid rgba(255,255,255,.1);margin-bottom:20px;}
.s-footer-bottom{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.s-footer-copy{font-size:12px;color:rgba(255,255,255,.35);}
.s-footer-wa{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;background:${C.green};color:white;border:none;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s;text-decoration:none;}
.s-footer-wa:hover{background:${C.greenHover};}

/* ── Animations ── */
@keyframes sFadeIn{from{opacity:0}to{opacity:1}}
@keyframes sSlideUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
@keyframes sSlideRight{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}

/* ── Responsive ── */
@media(min-width:640px){
    .s-grid{grid-template-columns:repeat(3,1fr);gap:16px;}
    .s-search-wrap{display:block;}
    .s-mobile-search{display:none;}
    .s-main{padding:28px 24px 80px;}
    .s-card-name{font-size:15px;}
    .s-hero-title{font-size:40px;}
    .s-pcard{min-width:200px;width:200px;}
    .s-footer-brand{grid-column:auto;}
}
@media(min-width:768px){
    .s-nav{display:flex;}
    .s-hero-right{display:flex;}
    .s-hero-title{font-size:42px;}
}
@media(min-width:1024px){
    .s-grid{grid-template-columns:repeat(4,1fr);gap:20px;}
    .s-main{padding:36px 40px 80px;}
    .s-float{display:none;}
    .s-pmodal{align-items:center;}
    .s-pmodal-inner{border-radius:24px;max-width:820px;max-height:86vh;display:flex;flex-direction:row;overflow:hidden;}
    .s-pmodal-imgwrap{width:45%;min-height:480px;aspect-ratio:auto;flex-shrink:0;border-radius:0;}
    .s-pmodal-body{flex:1;padding:36px;overflow-y:auto;display:flex;flex-direction:column;justify-content:center;}
    .s-pmodal-name{font-size:26px;}
    .s-pmodal-price{font-size:28px;}
    .s-hero-outer{padding:24px 40px 0;}
    .s-hero{padding:48px 48px 40px;}
    .s-hero-circle{width:280px;height:280px;}
    .s-hero-title{font-size:48px;}
    .s-footer-grid{grid-template-columns:2fr 1fr 1fr;}
}
`

export default function CatalogoContent({ business, categories, products }: Props) {
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [cart, setCart] = useState<CartItem[]>([])
    const [showCart, setShowCart] = useState(false)
    const [showOrderForm, setShowOrderForm] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [imgIdx, setImgIdx] = useState(0)
    const [orderForm, setOrderForm] = useState<OrderForm>({
        customer_name: '',
        customer_phone: '',
        customer_locality: '',
    })
    const productsRef = useRef<HTMLDivElement>(null)

    const filtered = useMemo(() => products.filter(p => {
        if (selectedCategory && p.category_id !== selectedCategory) return false
        if (search) return p.name.toLowerCase().includes(search.toLowerCase())
        return true
    }), [products, selectedCategory, search])

    function addToCart(product: Product) {
        setCart(prev => {
            const existing = prev.find(i => i.product_id === product.id)
            if (existing) {
                if (existing.quantity >= product.stock) return prev
                return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
            }
            const img = (product.images || []).find((i: { is_primary: boolean }) => i.is_primary) || (product.images || [])[0]
            return [...prev, {
                product_id: product.id,
                product_name: product.name,
                price: product.price,
                quantity: 1,
                image_url: img?.url || null,
                max_stock: product.stock,
            }]
        })
    }

    function updateQty(productId: string, delta: number) {
        setCart(prev => prev.map(i => {
            if (i.product_id !== productId) return i
            const q = i.quantity + delta
            if (q <= 0 || q > i.max_stock) return i
            return { ...i, quantity: q }
        }))
    }

    function removeFromCart(productId: string) {
        setCart(prev => prev.filter(i => i.product_id !== productId))
    }

    const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
    const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

    function handleSendOrder() {
        if (!orderForm.customer_name || !orderForm.customer_phone) return
        const msg = buildOrderMessage(
            business.name,
            orderForm.customer_name,
            orderForm.customer_phone,
            orderForm.customer_locality,
            cart.map(i => ({ name: i.product_name, quantity: i.quantity, subtotal: i.price * i.quantity })),
            cartTotal
        )
        window.open(buildWhatsAppUrl(business.whatsapp_number || '', msg), '_blank')
    }

    function openProduct(p: Product) { setSelectedProduct(p); setImgIdx(0) }

    function scrollToProducts() {
        productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const pImages = selectedProduct?.images || []
    const pInCart = selectedProduct ? cart.find(i => i.product_id === selectedProduct.id) : null

    const waLink = business.whatsapp_number
        ? `https://wa.me/${business.whatsapp_number.replace(/\D/g, '')}`
        : '#'

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: css }} />

            <div className="s-root">
                {/* ── Header ── */}
                <header className="s-header">
                    <div className="s-header-inner">
                        <a className="s-logo" href="#">
                            {business.logo_url
                                ? <img src={business.logo_url} alt={business.name} className="s-logo-img" />
                                : <div className="s-logo-ph">{business.name[0]}</div>
                            }
                            <span className="s-biz-name">{business.name}</span>
                        </a>

                        <nav className="s-nav">
                            <a className="s-nav-a" href="#" onClick={e => { e.preventDefault() }}>Inicio</a>
                            <a className="s-nav-a" href="#" onClick={e => { e.preventDefault(); scrollToProducts() }}>Tienda</a>
                            <a className="s-nav-a" href="#" onClick={e => { e.preventDefault(); scrollToProducts() }}>Ofertas</a>
                            <Link className="s-nav-a" href={`/catalogo/${business.slug}/nosotros`}>Sobre Nosotros</Link>
                        </nav>

                        <div className="s-header-right">
                            <div className="s-search-wrap">
                                <Search size={15} className="s-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Buscar productos..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="s-search-input"
                                />
                            </div>
                            <button className="s-cart-btn" onClick={() => setShowCart(true)}>
                                <ShoppingCart size={18} />
                                <span>Carrito</span>
                                {cartCount > 0 && <span className="s-cart-badge">{cartCount}</span>}
                            </button>
                        </div>
                    </div>
                </header>

                {/* ── Hero ── */}
                <div className="s-hero-outer">
                    <div className="s-hero">
                        <div className="s-hero-deco" />
                        <div className="s-hero-deco2" />
                        <div className="s-hero-inner">
                            <div className="s-hero-left">
                                <div className="s-hero-badge">✨ Oferta Exclusiva Esta Semana</div>
                                <h1 className="s-hero-title">Belleza que<br />Transforma</h1>
                                <p className="s-hero-sub">Tu distribuidora de confianza en cosméticos, skincare y cuidado personal de las mejores marcas.</p>
                                <div className="s-hero-btns">
                                    <button className="s-hero-btn-p" onClick={scrollToProducts}>
                                        Ver Catálogo <ArrowRight size={14} />
                                    </button>
                                    <button className="s-hero-btn-o" onClick={scrollToProducts}>
                                        Seleccionar Categoría ↓
                                    </button>
                                </div>
                                <div className="s-hero-social">
                                    <div className="s-hero-avs">
                                        <div className="s-hero-av">A</div>
                                        <div className="s-hero-av">M</div>
                                        <div className="s-hero-av">L</div>
                                    </div>
                                    <div>
                                        <div className="s-hero-soc-lbl">Nuestros Clientes Felices</div>
                                        <div className="s-hero-stars">
                                            <span style={{ color: '#FFD700', fontSize: 13 }}>★★★★★</span>
                                            <span className="s-hero-rating">4.9</span>
                                            <span className="s-hero-reviews">(2k+ Reseñas)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="s-hero-right">
                                <div className="s-hero-circle">
                                    <img src="/avatar-hero.png" alt="Modelo belleza" />
                                </div>
                            </div>
                        </div>
                        <div className="s-hero-bottom">
                            <span className="s-hero-bottom-txt">¿Primera vez?</span>
                            <button className="s-hero-bottom-btn" onClick={scrollToProducts}>Descubre nuestras ofertas</button>
                        </div>
                    </div>
                </div>

                {/* ── Promo Cards ── */}
                <div className="s-promo-outer">
                    <div className="s-sec-hdr">
                        <div className="s-sec-hdr-title">Colecciones Destacadas</div>
                        <div className="s-sec-dots">
                            <span className="s-sec-dot" />
                            <span className="s-sec-dot lg" />
                            <span className="s-sec-dot" />
                        </div>
                    </div>
                    <div className="s-promo-scroll">
                        {PROMO.map((card, i) => (
                            <div
                                key={i}
                                className="s-pcard"
                                style={{ background: card.bg }}
                                onClick={scrollToProducts}
                            >
                                <div className="s-pcard-emoji">{card.emoji}</div>
                                <div className="s-pcard-label">{card.label}</div>
                                <div className="s-pcard-sub">{card.sub}</div>
                                <button className="s-pcard-cta">Ver todo →</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Main ── */}
                <main className="s-main" ref={productsRef}>
                    {/* Mobile search */}
                    <div className="s-mobile-search">
                        <Search size={18} className="s-mobile-icon" />
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="s-mobile-input"
                        />
                    </div>

                    {/* Categories */}
                    {categories.length > 0 && (
                        <div className="s-cats-sec">
                            <div className="s-cats-hd">
                                <div className="s-cats-hd-title">Categoría</div>
                                <div className="s-cats-hd-dots">
                                    <span className="s-sec-dot" />
                                    <span className="s-sec-dot lg" />
                                    <span className="s-sec-dot" />
                                </div>
                            </div>
                            <div className="s-cats">
                                <button className={`s-cat ${!selectedCategory ? 'on' : 'off'}`} onClick={() => setSelectedCategory(null)}>
                                    Todos
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        className={`s-cat ${selectedCategory === cat.id ? 'on' : 'off'}`}
                                        onClick={() => setSelectedCategory(cat.id)}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Section header */}
                    <div className="s-sec-hd">
                        <h2 className="s-sec-title">
                            {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Productos'}
                        </h2>
                        <span className="s-sec-count">
                            {filtered.length} {filtered.length === 1 ? 'producto' : 'productos'}
                        </span>
                    </div>

                    {/* Grid */}
                    {filtered.length === 0 ? (
                        <div className="s-empty">
                            <Package size={52} strokeWidth={1.2} />
                            <p className="s-empty-t">Sin resultados</p>
                            <p className="s-empty-s">Intenta con otros términos de búsqueda</p>
                        </div>
                    ) : (
                        <div className="s-grid">
                            {filtered.map(product => {
                                const img = (product.images || []).find((i: { is_primary: boolean }) => i.is_primary) || (product.images || [])[0]
                                const oos = product.stock === 0
                                const inCart = cart.find(i => i.product_id === product.id)

                                return (
                                    <div key={product.id} className={`s-card${oos ? ' oos' : ''}`} onClick={() => openProduct(product)}>
                                        <div className="s-card-img">
                                            {img
                                                ? <img src={img.url} alt={product.name} />
                                                : <ImageIcon size={38} strokeWidth={1.2} color={C.roseMid} />
                                            }
                                            {product.is_featured && !oos && <span className="s-badge feat">Destacado</span>}
                                            {oos && <span className="s-badge agot">Agotado</span>}
                                        </div>
                                        <div className="s-card-body">
                                            {product.category && (
                                                <div className="s-card-cat">{(product.category as unknown as { name: string }).name}</div>
                                            )}
                                            <div className="s-card-name">{product.name}</div>
                                            <div className="s-card-ft">
                                                <span className="s-price">{formatCurrency(product.price)}</span>
                                                {!oos && (
                                                    inCart ? (
                                                        <div className="s-qty" onClick={e => e.stopPropagation()}>
                                                            <button className="s-qbtn" onClick={() => inCart.quantity <= 1 ? removeFromCart(product.id) : updateQty(product.id, -1)}>
                                                                <Minus size={13} />
                                                            </button>
                                                            <span className="s-qnum">{inCart.quantity}</span>
                                                            <button className="s-qbtn p" onClick={() => updateQty(product.id, 1)} disabled={inCart.quantity >= product.stock}>
                                                                <Plus size={13} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button className="s-add" onClick={e => { e.stopPropagation(); addToCart(product) }}>
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
                </main>

                {/* ── Footer ── */}
                <footer className="s-footer">
                    <div className="s-footer-inner">
                        <div className="s-footer-grid">
                            <div className="s-footer-brand">
                                <div className="s-footer-logo">
                                    {business.logo_url
                                        ? <img src={business.logo_url} alt={business.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
                                        : <div className="s-footer-logo-ph">{business.name[0]}</div>
                                    }
                                    <span className="s-footer-name">{business.name}</span>
                                </div>
                                <p className="s-footer-desc">
                                    Distribuidora oficial de productos de belleza, cosméticos y cuidado personal. Calidad garantizada en cada producto.
                                </p>
                            </div>
                            <div>
                                <div className="s-footer-col-title">Tienda</div>
                                <button className="s-footer-link" onClick={scrollToProducts}>Todos los productos</button>
                                <button className="s-footer-link" onClick={scrollToProducts}>Ofertas especiales</button>
                                <button className="s-footer-link" onClick={scrollToProducts}>Novedades</button>
                            </div>
                            <div>
                                <div className="s-footer-col-title">Información</div>
                                <Link className="s-footer-link" href={`/catalogo/${business.slug}/nosotros`}>Sobre Nosotros</Link>
                                <Link className="s-footer-link" href={`/catalogo/${business.slug}/privacidad`}>Políticas de Privacidad</Link>
                                {business.whatsapp_number && (
                                    <a className="s-footer-link" href={waLink} target="_blank" rel="noopener noreferrer">Contacto</a>
                                )}
                            </div>
                        </div>
                        <hr className="s-footer-hr" />
                        <div className="s-footer-bottom">
                            <span className="s-footer-copy">© {new Date().getFullYear()} {business.name}. Todos los derechos reservados.</span>
                            {business.whatsapp_number && (
                                <a className="s-footer-wa" href={waLink} target="_blank" rel="noopener noreferrer">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                    WhatsApp
                                </a>
                            )}
                        </div>
                    </div>
                </footer>

                {/* ── Product Modal ── */}
                {selectedProduct && (
                    <>
                        <div className="s-ov" onClick={() => setSelectedProduct(null)} />
                        <div className="s-pmodal">
                            <div className="s-pmodal-inner">
                                <div className="s-pmodal-imgwrap">
                                    <button className="s-pmodal-close" onClick={() => setSelectedProduct(null)}><X size={15} /></button>
                                    {pImages.length > 0
                                        ? <img src={pImages[imgIdx].url} alt={selectedProduct.name} />
                                        : <ImageIcon size={72} strokeWidth={1} color={C.roseMid} />
                                    }
                                    {pImages.length > 1 && (
                                        <>
                                            <button className="s-pmodal-nav prev" onClick={() => setImgIdx(i => (i - 1 + pImages.length) % pImages.length)}><ChevronLeft size={18} /></button>
                                            <button className="s-pmodal-nav next" onClick={() => setImgIdx(i => (i + 1) % pImages.length)}><ChevronRight size={18} /></button>
                                            <div className="s-dots">
                                                {pImages.map((_, i) => (
                                                    <button key={i} className={`s-dot${i === imgIdx ? ' on' : ''}`} onClick={() => setImgIdx(i)} />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="s-pmodal-body">
                                    {selectedProduct.category && (
                                        <div className="s-pmodal-cat">{(selectedProduct.category as unknown as { name: string }).name}</div>
                                    )}
                                    <div className="s-pmodal-name">{selectedProduct.name}</div>
                                    <div className="s-pmodal-price">{formatCurrency(selectedProduct.price)}</div>
                                    {selectedProduct.description && (
                                        <p className="s-pmodal-desc">{selectedProduct.description}</p>
                                    )}
                                    <div className={`s-stock-chip ${selectedProduct.stock === 0 ? 'out' : selectedProduct.stock <= 5 ? 'low' : 'in'}`}>
                                        <span className="s-stock-dot" />
                                        {selectedProduct.stock === 0 ? 'Sin disponibilidad' : selectedProduct.stock <= 5 ? `Últimas ${selectedProduct.stock} unidades` : 'Disponible'}
                                    </div>
                                    {selectedProduct.stock > 0 && (
                                        pInCart ? (
                                            <div>
                                                <div className="s-modal-qty">
                                                    <span className="s-modal-qty-label">Cantidad:</span>
                                                    <div className="s-modal-qty-ctrl">
                                                        <button className="s-qbtn" style={{ width: 36, height: 36 }} onClick={() => pInCart.quantity <= 1 ? removeFromCart(selectedProduct.id) : updateQty(selectedProduct.id, -1)}><Minus size={15} /></button>
                                                        <span className="s-qnum" style={{ fontSize: 18, minWidth: 28 }}>{pInCart.quantity}</span>
                                                        <button className="s-qbtn p" style={{ width: 36, height: 36 }} onClick={() => updateQty(selectedProduct.id, 1)} disabled={pInCart.quantity >= selectedProduct.stock}><Plus size={15} /></button>
                                                    </div>
                                                </div>
                                                <button className="s-modal-add" onClick={() => { setSelectedProduct(null); setShowCart(true) }}>
                                                    <ShoppingCart size={18} /> Ver carrito
                                                </button>
                                            </div>
                                        ) : (
                                            <button className="s-modal-add" onClick={() => addToCart(selectedProduct)}>
                                                <Plus size={18} /> Agregar al carrito
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ── Cart Drawer ── */}
                {showCart && (
                    <>
                        <div className="s-ov" onClick={() => setShowCart(false)} />
                        <div className="s-cart">
                            <div className="s-cart-hd">
                                <h2 className="s-cart-title">Tu pedido{cartCount > 0 ? ` (${cartCount})` : ''}</h2>
                                <button className="s-cart-x" onClick={() => setShowCart(false)}><X size={18} /></button>
                            </div>
                            {cart.length === 0 ? (
                                <div className="s-cart-empty">
                                    <ShoppingCart size={52} strokeWidth={1.2} color={C.roseMid} />
                                    <p className="s-cart-empty-t">Tu carrito está vacío</p>
                                    <p className="s-cart-empty-s">Agrega productos para hacer un pedido</p>
                                </div>
                            ) : (
                                <>
                                    <div className="s-cart-items">
                                        {cart.map(item => (
                                            <div key={item.product_id} className="s-citem">
                                                <div className="s-citem-img">
                                                    {item.image_url ? <img src={item.image_url} alt="" /> : <ImageIcon size={22} strokeWidth={1.5} color={C.roseMid} />}
                                                </div>
                                                <div className="s-citem-info">
                                                    <div className="s-citem-name">{item.product_name}</div>
                                                    <div className="s-citem-price">{formatCurrency(item.price * item.quantity)}</div>
                                                </div>
                                                <div className="s-citem-ctrl">
                                                    <button className="s-del" onClick={() => removeFromCart(item.product_id)}><Trash2 size={14} /></button>
                                                    <div className="s-qty">
                                                        <button className="s-qbtn" style={{ width: 26, height: 26 }} onClick={() => item.quantity <= 1 ? removeFromCart(item.product_id) : updateQty(item.product_id, -1)}><Minus size={11} /></button>
                                                        <span className="s-qnum" style={{ fontSize: 13 }}>{item.quantity}</span>
                                                        <button className="s-qbtn p" style={{ width: 26, height: 26 }} onClick={() => updateQty(item.product_id, 1)}><Plus size={11} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="s-cart-ft">
                                        <div className="s-cart-total">
                                            <span className="s-cart-total-lbl">Total del pedido</span>
                                            <span className="s-cart-total-amt">{formatCurrency(cartTotal)}</span>
                                        </div>
                                        <button className="s-checkout" onClick={() => { setShowCart(false); setShowOrderForm(true) }}>
                                            <Send size={18} /> Enviar pedido por WhatsApp
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}

                {/* ── Order Form ── */}
                {showOrderForm && (
                    <>
                        <div className="s-ov" onClick={() => setShowOrderForm(false)} />
                        <div className="s-omodal">
                            <div className="s-omodal-inner" onClick={e => e.stopPropagation()}>
                                <h2 className="s-omodal-title">Completa tu pedido</h2>
                                <p className="s-omodal-sub">Ingresa tus datos para enviar el pedido por WhatsApp</p>
                                <div className="s-field">
                                    <label className="s-label">Nombre *</label>
                                    <input className="s-input" placeholder="Tu nombre completo" value={orderForm.customer_name} onChange={e => setOrderForm({ ...orderForm, customer_name: e.target.value })} />
                                </div>
                                <div className="s-field">
                                    <label className="s-label">Teléfono *</label>
                                    <input className="s-input" placeholder="Tu número de teléfono" value={orderForm.customer_phone} onChange={e => setOrderForm({ ...orderForm, customer_phone: e.target.value })} />
                                </div>
                                <div className="s-field">
                                    <label className="s-label">Comunidad / Localidad</label>
                                    <input className="s-input" placeholder="Ej: San Juan del Río" value={orderForm.customer_locality} onChange={e => setOrderForm({ ...orderForm, customer_locality: e.target.value })} />
                                </div>
                                <div className="s-osummary">
                                    <div className="s-osummary-title">Resumen del pedido</div>
                                    {cart.map(item => (
                                        <div key={item.product_id} className="s-osummary-item">
                                            <span>{item.product_name} ×{item.quantity}</span>
                                            <span style={{ fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                    <div className="s-osummary-total">
                                        <span>Total</span>
                                        <span style={{ color: C.rose }}>{formatCurrency(cartTotal)}</span>
                                    </div>
                                </div>
                                <button className="s-send" onClick={handleSendOrder} disabled={!orderForm.customer_name || !orderForm.customer_phone}>
                                    <Send size={18} /> Enviar por WhatsApp
                                </button>
                                <button className="s-cancel" onClick={() => setShowOrderForm(false)}>Cancelar</button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── Floating Cart (mobile) ── */}
                {cartCount > 0 && !showCart && !showOrderForm && !selectedProduct && (
                    <div className="s-float">
                        <button className="s-float-btn" onClick={() => setShowCart(true)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ShoppingCart size={18} />
                                Ver pedido ({cartCount} {cartCount === 1 ? 'producto' : 'productos'})
                            </div>
                            <span>{formatCurrency(cartTotal)}</span>
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}
