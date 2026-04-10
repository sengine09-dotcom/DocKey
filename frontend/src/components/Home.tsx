import React from 'react';

// นำ HTML จาก Home.tsx มาปรับเป็น React Component
const Home: React.FC = () => {
  return (
    <div className="bg-slate-950 text-slate-100 antialiased">
      {/* ===== NAVBAR ===== */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h12M6 12h8m-8 6h12" />
              </svg>
            </div>
            <span className="font-display font-800 text-lg tracking-tight text-white">PO Soft<span className="text-brand-400"> Solution</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#products" className="text-sm text-slate-400 hover:text-white transition-colors">ผลิตภัณฑ์</a>
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">ฟีเจอร์</a>
            <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">ราคา</a>
            <a href="#contact" className="text-sm text-slate-400 hover:text-white transition-colors">ติดต่อ</a>
          </nav>
          <div className="flex items-center gap-3">
            <button className="hidden md:block text-sm text-slate-300 hover:text-white transition-colors px-4 py-2">เข้าสู่ระบบ</button>
            <button className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              ทดลองใช้ฟรี
            </button>
          </div>
        </div>
      </header>
      {/* ...existing code... */}
    </div>
  );
};

export default Home;
