const statusCopyMap: Record<string, { title: string; summary: string; action: string; tone: string }> = {
  'activation-token-missing': {
    title: 'Activation token is missing',
    summary: 'ระบบยังไม่เคยถูกเปิดใช้งานครั้งแรก หรือข้อมูล activation token ในฝั่งลูกค้ายังไม่ได้ถูกบันทึกไว้',
    action: 'กรุณาใช้ลิงก์ activation จาก owner/vendor เพื่อตั้งค่า administrator ครั้งแรก',
    tone: 'amber',
  },
  'admin-not-configured': {
    title: 'Administrator setup is incomplete',
    summary: 'พบ activation token แล้ว แต่ยังไม่มี administrator ในระบบ จึงยังไม่สามารถเปิดใช้ DocKey ได้',
    action: 'เปิดลิงก์ activation เดิมอีกครั้ง แล้วทำขั้นตอนตั้งค่า administrator ให้เสร็จ',
    tone: 'amber',
  },
  disabled: {
    title: 'Customer access has been disabled',
    summary: 'owner/vendor ได้ปิด token ของลูกค้ารายนี้จากฝั่ง vendor system แล้ว',
    action: 'กรุณาติดต่อ owner/vendor เพื่อเปิดสิทธิ์หรือออก activation token ใหม่',
    tone: 'rose',
  },
  expired: {
    title: 'Customer token has expired',
    summary: 'token ที่ใช้ผูกสิทธิ์ใช้งานกับระบบลูกค้าหมดอายุแล้ว จึงไม่สามารถเปิดใช้ DocKey ต่อได้',
    action: 'กรุณาติดต่อ owner/vendor เพื่อออก token ใหม่หรือขยายอายุ token เดิม',
    tone: 'rose',
  },
  'vendor-check-failed': {
    title: 'Vendor license check failed',
    summary: 'ระบบลูกค้าไม่สามารถยืนยันสถานะ token กับระบบ vendor ได้ในขณะนี้',
    action: 'ตรวจสอบการเชื่อมต่อไปยัง vendor service หรือแจ้ง owner/vendor ให้ตรวจสอบระบบ',
    tone: 'sky',
  },
  'activation-check-failed': {
    title: 'Activation status check failed',
    summary: 'ระบบไม่สามารถโหลดสถานะ activation ได้ในขณะนี้',
    action: 'ลองใหม่อีกครั้ง หรือให้ผู้ดูแลระบบตรวจสอบ customer backend',
    tone: 'sky',
  },
  'vendor-heartbeat-failed': {
    title: 'Customer presence check failed',
    summary: 'ระบบลูกค้าไม่สามารถอัปเดตสถานะ online ไปยัง vendor system ได้ในขณะนี้',
    action: 'ตรวจสอบการเชื่อมต่อกับ vendor service แล้วกด Refresh Status อีกครั้ง',
    tone: 'sky',
  },
};

const toneClassMap: Record<string, string> = {
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  rose: 'border-rose-200 bg-rose-50 text-rose-900',
  sky: 'border-sky-200 bg-sky-50 text-sky-900',
};

export default function ActivationLocked({
  reason,
  token,
  onRefresh,
  isRefreshing = false,
}: {
  reason?: string | null;
  token?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const statusCopy = statusCopyMap[String(reason || 'activation-token-missing')] || statusCopyMap['activation-token-missing'];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.18),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-2xl shadow-slate-300/40 backdrop-blur lg:grid-cols-[1.05fr_0.95fr]">
          <div className="px-8 py-10 md:px-12 md:py-14">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-600">Activation Required</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-900">DocKey is locked until the owner verifies the first administrator</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
              ระบบนี้ยังไม่ได้ผ่านขั้นตอนเปิดใช้งานครั้งแรก ลูกค้าจะต้องเปิดลิงก์ activation ที่ได้รับจาก owner/vendor และตั้งค่า administrator ให้เสร็จก่อน จึงจะสามารถเข้าใช้งาน DocKey ได้
            </p>

            <div className={`mt-8 rounded-3xl border px-6 py-5 text-sm ${toneClassMap[statusCopy.tone] || toneClassMap.amber}`}>
              <p className="font-semibold">{statusCopy.title}</p>
              <p className="mt-3 leading-7">{statusCopy.summary}</p>
              <p className="mt-3 font-medium">{statusCopy.action}</p>
              {token && (
                <div className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-xs text-slate-700">
                  Current token reference: <span className="font-semibold">{token}</span>
                </div>
              )}

              <button
                type="button"
                onClick={onRefresh}
                disabled={!onRefresh || isRefreshing}
                className="mt-5 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRefreshing ? 'Refreshing status...' : 'Refresh Status'}
              </button>
            </div>
          </div>

          <div className="bg-slate-950 px-8 py-10 text-white md:px-12 md:py-14">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status Guide</p>
            <ol className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
              <li>1. `activation-token-missing` หมายถึงระบบลูกค้ายังไม่ได้ผูก token สำหรับใช้งานครั้งแรก</li>
              <li>2. `admin-not-configured` หมายถึงมี token แล้ว แต่ยังตั้ง administrator ไม่เสร็จ</li>
              <li>3. `disabled` หรือ `expired` หมายถึงต้องให้ owner/vendor จัดการ token ฝั่ง vendor ใหม่</li>
              <li>4. `vendor-check-failed` หมายถึง customer system ติดต่อ vendor service ไม่สำเร็จในขณะนั้น</li>
            </ol>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-slate-300">
              หากคุณเป็นลูกค้า กรุณาส่งสถานะนี้ให้ owner/vendor เพื่อให้ตรวจสอบและปลดล็อกระบบได้เร็วขึ้น
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}