import { useState } from "react";
import React from 'react';

// ===== DATA =====
const NAV_LINKS = [
    { label: "ผลิตภัณฑ์", href: "#products" },
    { label: "ฟีเจอร์", href: "#features" },
    { label: "ราคา", href: "#pricing" },
    { label: "ติดต่อ", href: "#contact" },
];

const STATS = [
    { value: "2,400+", label: "ธุรกิจที่ไว้วางใจ" },
    { value: "99.9%", label: "Uptime SLA" },
    { value: "5 นาที", label: "ตั้งค่าเริ่มต้น" },
    { value: "24/7", label: "ทีมซัพพอร์ต" },
];

const PRODUCTS = [
    {
        id: 1,
        icon: (
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0120 9.414V19a2 2 0 01-2 2z" />
            </svg>
        ),
        iconBg: "bg-blue-900/60 border-blue-700/30",
        name: "ระบบจัดการเอกสาร",
        desc: "สร้างใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และเอกสารทางธุรกิจทุกประเภท รองรับ e-Tax Invoice มาตรฐานกรมสรรพากร",
        tags: ["ใบเสนอราคา", "ใบแจ้งหนี้", "e-Tax Invoice"],
        price: "฿490",
        featured: true,
    },
    {
        id: 2,
        icon: (
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        iconBg: "bg-cyan-900/40 border-cyan-700/30",
        name: "ระบบงานขาย (Sales)",
        desc: "ติดตามลูกค้า จัดการ Pipeline บันทึกการขาย และวิเคราะห์ยอดขายแบบ Real-time ด้วย Dashboard อัตโนมัติ",
        tags: ["CRM", "Sales Pipeline", "รายงาน"],
        price: "฿590",
        featured: false,
    },
    {
        id: 3,
        icon: (
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        iconBg: "bg-violet-900/40 border-violet-700/30",
        name: "ระบบหลังบ้าน (Back-office)",
        desc: "จัดการสินค้า คลังสินค้า การสั่งซื้อ และบัญชีเบื้องต้น ในแดชบอร์ดเดียว ควบคุมได้ทุกมิติ",
        tags: ["สต็อกสินค้า", "PO / PR", "บัญชี"],
        price: "฿690",
        featured: false,
    },
];

const FEATURES = [
    { emoji: "🇹🇭", title: "รองรับมาตรฐานไทย", desc: "ภาษีมูลค่าเพิ่ม, หักภาษี ณ ที่จ่าย, e-Tax Invoice มาตรฐานกรมสรรพากร" },
    { emoji: "☁️", title: "Cloud-based 100%", desc: "ไม่ต้องติดตั้ง ใช้งานได้ทันทีผ่านเบราว์เซอร์ ทุกอุปกรณ์ ทุกที่" },
    { emoji: "🔒", title: "ข้อมูลปลอดภัย", desc: "เข้ารหัส SSL ทุกการเชื่อมต่อ สำรองข้อมูลอัตโนมัติทุกวัน" },
    { emoji: "🤝", title: "ซัพพอร์ตภาษาไทย", desc: "ทีมงานพร้อมช่วยเหลือทาง Line, โทรศัพท์ และ Chat ตลอด 24 ชั่วโมง" },
];

const FOOTER_LINKS = {
    ผลิตภัณฑ์: ["ระบบเอกสาร", "ระบบงานขาย", "ระบบหลังบ้าน", "แพ็กเกจ Bundle"],
    บริษัท: ["เกี่ยวกับเรา", "Blog", "ร่วมงานกับเรา", "ติดต่อ"],
    ช่วยเหลือ: ["คู่มือการใช้งาน", "FAQ", "นโยบายความเป็นส่วนตัว", "เงื่อนไขการใช้บริการ"],
};

// ===== SUB COMPONENTS =====

const Logo = () => (
    <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h12M6 12h8m-8 6h12" />
            </svg>
        </div>
        <span className="font-bold text-lg tracking-tight text-white">
            PO Soft<span className="text-blue-400"> Solution</span>
        </span>
    </div>
);

const ProductCard = ({ product }) => (
    <div
        className={`bg-slate-900 border rounded-2xl p-6 relative transition-all duration-250 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(37,99,235,0.12)] hover:border-blue-500 ${product.featured ? "border-blue-700/40" : "border-slate-800"
            }`}
    >
        {product.featured && (
            <span className="absolute top-4 right-4 bg-blue-900/60 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-700/40">
                ยอดนิยม
            </span>
        )}
        <div className={`w-11 h-11 border rounded-xl flex items-center justify-center mb-5 ${product.iconBg}`}>
            {product.icon}
        </div>
        <h3 className="font-bold text-white text-lg mb-2">{product.name}</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-4">{product.desc}</p>
        <div className="flex flex-wrap gap-2 mb-5">
            {product.tags.map((tag) => (
                <span key={tag} className="bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full">
                    {tag}
                </span>
            ))}
        </div>
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
            <div>
                <span className="text-xl font-bold text-white">{product.price}</span>
                <span className="text-slate-500 text-xs"> / เดือน</span>
            </div>
            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                ดูรายละเอียด →
            </button>
        </div>
    </div>
);


const Home: React.FC = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased">

            {/* NAVBAR */}
            <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Logo />
                    <nav className="hidden md:flex items-center gap-8">
                        {NAV_LINKS.map((link) => (
                            <a key={link.label} href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                                {link.label}
                            </a>
                        ))}
                    </nav>
                    <div className="flex items-center gap-3">
                        <button className="hidden md:block text-sm text-slate-300 hover:text-white transition-colors px-4 py-2">
                            เข้าสู่ระบบ
                        </button>
                        <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                            ทดลองใช้ฟรี
                        </button>
                        {/* Mobile menu button */}
                        <button
                            className="md:hidden text-slate-400 hover:text-white transition-colors"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                {mobileMenuOpen
                                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                            </svg>
                        </button>
                    </div>
                </div>
                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-800 px-6 py-4 flex flex-col gap-4">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="text-sm text-slate-400 hover:text-white transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>
                )}
            </header>

            {/* HERO */}
            <section className="pt-20 pb-16 px-6" style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,235,0.18) 0%, transparent 70%)" }}>
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-blue-900/50 border border-blue-700/40 text-blue-300 text-xs font-medium px-4 py-1.5 rounded-full mb-8">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                        ระบบใหม่ล่าสุด — รองรับ e-Tax Invoice และ e-Receipt
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white mb-6">
                        จัดการธุรกิจ SME
                        <br />
                        <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            ให้ง่ายขึ้น 10 เท่า
                        </span>
                    </h1>
                    <p className="text-slate-400 text-base md:text-lg font-light max-w-2xl mx-auto mb-10">
                        Web Application ครบวงจรสำหรับธุรกิจขนาดเล็ก — จัดการเอกสาร งานขาย และระบบหลังบ้าน
                        <br className="hidden md:block" />
                        ในที่เดียว ใช้งานได้ทุกที่ ทุกอุปกรณ์
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-medium px-8 py-3.5 rounded-xl transition-colors text-sm">
                            เริ่มต้นฟรี 30 วัน →
                        </button>
                        <button className="w-full sm:w-auto border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium px-8 py-3.5 rounded-xl transition-colors text-sm">
                            ดูตัวอย่างระบบ
                        </button>
                    </div>
                    <p className="text-slate-600 text-xs mt-8">
                        ไม่ต้องใช้บัตรเครดิต · ยกเลิกได้ตลอด · ข้อมูลปลอดภัย 100%
                    </p>
                </div>
            </section>

            {/* STATS */}
            <section className="py-10 px-6 border-y border-slate-800">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {STATS.map((stat) => (
                        <div key={stat.label}>
                            <div className="text-3xl font-bold text-white">{stat.value}</div>
                            <div className="text-slate-500 text-sm mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* PRODUCTS */}
            <section id="products" className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-12">
                        <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-2">ผลิตภัณฑ์ของเรา</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">ระบบที่ออกแบบมาเพื่อ SME</h2>
                        <p className="text-slate-400 text-sm mt-3 max-w-lg">เลือกใช้แยกโมดูล หรือแบบรวมทุกระบบในราคาพิเศษ</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {PRODUCTS.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>

                    {/* Bundle */}
                    <div id="pricing" className="mt-6 bg-gradient-to-r from-blue-900/40 to-cyan-900/20 border border-blue-700/30 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-blue-800/50 text-blue-300 text-xs px-3 py-1 rounded-full mb-3">
                                ✦ แพ็กเกจ Bundle — ประหยัดสูงสุด 35%
                            </div>
                            <h3 className="text-xl font-bold text-white">PO Soft All-in-One</h3>
                            <p className="text-slate-400 text-sm mt-1">
                                ครบทุกโมดูล · ผู้ใช้ไม่จำกัด · พื้นที่เก็บข้อมูล 50 GB · ซัพพอร์ต Priority
                            </p>
                        </div>
                        <div className="flex items-center gap-6 flex-shrink-0">
                            <div className="text-right">
                                <div className="text-slate-500 text-xs line-through">฿1,770 / เดือน</div>
                                <div className="text-3xl font-bold text-white">
                                    ฿1,150
                                    <span className="text-slate-400 text-base font-normal"> / เดือน</span>
                                </div>
                            </div>
                            <button className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-xl text-sm transition-colors whitespace-nowrap">
                                เริ่มต้นฟรี →
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* DIVIDER */}
            <div className="mx-6 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

            {/* FEATURES */}
            <section id="features" className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-12 text-center">
                        <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-2">ทำไมถึงเลือก PO Soft</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                            ออกแบบมาเพื่อธุรกิจไทยโดยเฉพาะ
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {FEATURES.map((f) => (
                            <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                                <div className="text-2xl mb-3">{f.emoji}</div>
                                <h4 className="font-semibold text-white text-sm mb-2">{f.title}</h4>
                                <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section id="contact" className="py-16 px-6">
                <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-blue-900/50 to-slate-900 border border-blue-700/30 rounded-3xl px-8 py-14">
                    <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
                        พร้อมเริ่มต้นแล้วหรือยัง?
                    </h2>
                    <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
                        ทดลองใช้งานฟรี 30 วัน ไม่ต้องผูกบัตรเครดิต
                        <br />
                        ทีมงานพร้อมช่วยตั้งค่าระบบให้โดยไม่มีค่าใช้จ่าย
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-medium px-8 py-3.5 rounded-xl transition-colors text-sm">
                            ทดลองใช้ฟรี 30 วัน →
                        </button>
                        <button className="w-full sm:w-auto border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium px-8 py-3.5 rounded-xl transition-colors text-sm">
                            📞 โทรปรึกษาฟรี
                        </button>
                    </div>
                    <p className="text-slate-600 text-xs mt-6">
                        สอบถามได้ที่ Line: @posoftsolution · Tel: 02-xxx-xxxx
                    </p>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-slate-800 py-10 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="mb-3">
                                <Logo />
                            </div>
                            <p className="text-slate-500 text-xs leading-relaxed">
                                Web Application ครบวงจร
                                <br />
                                สำหรับธุรกิจ SME ไทย
                            </p>
                        </div>
                        {Object.entries(FOOTER_LINKS).map(([section, links]) => (
                            <div key={section}>
                                <h5 className="text-white font-semibold text-sm mb-3">{section}</h5>
                                <ul className="space-y-2">
                                    {links.map((link) => (
                                        <li key={link}>
                                            <a href="#" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
                                                {link}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
                        <p className="text-slate-600 text-xs">© 2026 PO Soft Solution Co., Ltd. สงวนลิขสิทธิ์ทุกประการ</p>
                        <p className="text-slate-600 text-xs">พัฒนาด้วย ❤️ สำหรับธุรกิจไทย</p>
                    </div>
                </div>
            </footer>

        </div>
    );

};

export default Home;
