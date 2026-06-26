import { useEffect, useState } from 'react';
import purchaseService from '../services/purchaseService';

interface Props {
  isOpen: boolean;
  darkMode: boolean;
  vendorCodes: any[];
  onClose: () => void;
  onCreatePO: (draft: any) => void;
}

const formatCurrency = (n: any) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PRToPOModal({ isOpen, darkMode, vendorCodes, onClose, onCreatePO }: Props) {
  const [step, setStep] = useState<'select-pr' | 'review-items'>('select-pr');
  const [prs, setPrs] = useState<any[]>([]);
  const [prSearch, setPrSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPR, setSelectedPR] = useState<any | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('select-pr');
    setSelectedPR(null);
    setPrSearch('');
    void (async () => {
      setIsLoading(true);
      try {
        const res = await purchaseService.pr.getAll();
        setPrs((res.data?.data || []).filter((pr: any) => pr.status === 'APPROVED'));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isOpen]);

  const getVendorDisplay = (vendorCode: string) => {
    if (!vendorCode) return 'ไม่ระบุ Vendor';
    const v = vendorCodes.find((x) => x.vendorCode === vendorCode);
    return v ? `${vendorCode} - ${v.name || vendorCode}` : vendorCode;
  };

  const pendingItems = (pr: any) =>
    (pr.items || []).filter((i: any) => !i.convertedToPo);

  const handleSelectPR = (pr: any) => {
    setSelectedPR(pr);
    setStep('review-items');
  };

  const buildPODraft = () => {
    if (!selectedPR) return;
    const today = new Date().toISOString().slice(0, 10);
    const items = pendingItems(selectedPR);

    const poItems = items.map((item: any) => {
      const cost = Number(item.estimatedPrice || 0);
      const qty = Number(item.qty || 1);
      return {
        id: '',
        productCode: item.productCode || '',
        productName: item.description || '',
        packing: '',
        quantity: String(qty),
        cost: String(cost),
        margin: '0',
        sellingPrice: String(cost),
        totalCost: String(Math.round(cost * qty * 100) / 100),
        totalSellingPrice: String(Math.round(cost * qty * 100) / 100),
        unitId: '',
      };
    });

    onCreatePO({
      _sourcePRId: selectedPR.id,
      _sourcePRItemIds: items.map((i: any) => i.id).filter(Boolean),
      __mode: 'create',
      title: `PO from ${selectedPR.prNumber}`,
      documentDate: today,
      customer: '',
      vendorCode: selectedPR.vendorCode || '',
      supplierName: selectedPR.vendorCode ? getVendorDisplay(selectedPR.vendorCode) : '',
      referenceNo: selectedPR.prNumber,
      status: 'Open',
      remark: `อ้างอิงใบขอซื้อ: ${selectedPR.prNumber}`,
      taxRate: '7',
      paymentTerm: '',
      paymentMethod: '',
      deliveryDate: selectedPR.requiredDate ? selectedPR.requiredDate.slice(0, 10) : '',
      items: poItems,
    });
  };

  if (!isOpen) return null;

  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  const filteredPRs = prs.filter((pr) => {
    const kw = prSearch.trim().toLowerCase();
    if (!kw) return true;
    return [pr.prNumber, pr.title, pr.vendorCode, pr.remark]
      .some((v) => String(v ?? '').toLowerCase().includes(kw));
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-6 px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            {step === 'review-items' && (
              <button
                type="button"
                onClick={() => setStep('select-pr')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                ← กลับ
              </button>
            )}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                สร้าง PO จาก PR
              </p>
              <h3 className={`text-base font-bold ${textPrimary}`}>
                {step === 'select-pr' ? 'เลือกใบขอซื้อ (PR)' : `รายการสินค้า PR: ${selectedPR?.prNumber}`}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg p-1.5 transition ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Step 1: Select PR */}
          {step === 'select-pr' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="ค้นหา PR (เลขที่, ชื่อ, Vendor)..."
                value={prSearch}
                onChange={(e) => setPrSearch(e.target.value)}
                className={`w-full rounded-xl border px-4 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
              />
              {isLoading ? (
                <div className={`text-center py-10 ${textMuted}`}>กำลังโหลด...</div>
              ) : filteredPRs.length === 0 ? (
                <div className={`text-center py-10 ${textMuted}`}>
                  <div className="text-3xl mb-2">📋</div>
                  <p>ไม่พบใบขอซื้อที่อนุมัติแล้ว</p>
                  <p className="text-xs mt-1">เฉพาะ PR สถานะ "อนุมัติแล้ว" เท่านั้นที่สามารถออก PO ได้</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPRs.map((pr) => {
                    const pending = pendingItems(pr).length;
                    const total = pr.items?.length || 0;
                    const allDone = pending === 0 && total > 0;
                    const totalEst = (pr.items || []).reduce(
                      (s: number, i: any) => s + Number(i.qty || 0) * Number(i.estimatedPrice || 0), 0
                    );
                    return (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => !allDone && handleSelectPR(pr)}
                        disabled={allDone}
                        className={`w-full text-left rounded-xl border px-4 py-3.5 transition ${allDone
                          ? (darkMode ? 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed' : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed')
                          : (darkMode ? 'border-gray-700 bg-gray-800 hover:border-orange-500/50' : 'border-gray-200 bg-white hover:border-orange-400 hover:bg-orange-50/40')
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className={`font-semibold ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>{pr.prNumber}</span>
                            <span className={`ml-2 text-sm ${textPrimary}`}>{pr.title}</span>
                          </div>
                          <span className={`text-sm font-semibold whitespace-nowrap ${textPrimary}`}>฿{formatCurrency(totalEst)}</span>
                        </div>
                        <div className={`mt-1 flex items-center gap-3 text-xs ${textMuted}`}>
                          {pr.vendorCode && (
                            <span className={`rounded-full px-2 py-0.5 ${darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                              {getVendorDisplay(pr.vendorCode)}
                            </span>
                          )}
                          {allDone ? (
                            <span className={`rounded-full px-2 py-0.5 font-semibold ${darkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700'}`}>
                              ✓ ออก PO ครบแล้ว
                            </span>
                          ) : (
                            <span>{pending}/{total} รายการรอออก PO</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Review items */}
          {step === 'review-items' && selectedPR && (
            <div className="space-y-4">
              {/* PR summary */}
              <div className={`rounded-xl border px-4 py-3 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className={`text-xs ${textMuted}`}>PR: </span>
                    <span className={`font-semibold ${textPrimary}`}>{selectedPR.prNumber}</span>
                  </div>
                  <div>
                    <span className={`text-xs ${textMuted}`}>ชื่อ: </span>
                    <span className={textPrimary}>{selectedPR.title}</span>
                  </div>
                  {selectedPR.vendorCode ? (
                    <div>
                      <span className={`text-xs ${textMuted}`}>Vendor: </span>
                      <span className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        {getVendorDisplay(selectedPR.vendorCode)}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className={`text-xs ${darkMode ? 'text-amber-300' : 'text-amber-600'}`}>
                        ไม่ระบุ Vendor (ต้องระบุเพิ่มเติมใน PO)
                      </span>
                    </div>
                  )}
                  <div>
                    <span className={`text-xs ${textMuted}`}>รายการ: </span>
                    <span className={textPrimary}>{pendingItems(selectedPR).length} รายการรอดำเนินการ</span>
                  </div>
                </div>
              </div>

              {/* Items table */}
              <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className={`px-4 py-3 flex items-center justify-between border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <div>
                    <span className={`font-semibold text-sm ${textPrimary}`}>รายการสินค้าที่จะออก PO</span>
                    <span className={`ml-2 text-xs ${textMuted}`}>({pendingItems(selectedPR).length} รายการ)</span>
                  </div>
                  <button
                    type="button"
                    onClick={buildPODraft}
                    className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                  >
                    📦 ออก PO
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                        <th className="px-4 py-2 text-left font-medium">#</th>
                        <th className="px-4 py-2 text-left font-medium">รหัสสินค้า</th>
                        <th className="px-4 py-2 text-left font-medium">รายละเอียด</th>
                        <th className="px-4 py-2 text-right font-medium">จำนวน</th>
                        <th className="px-4 py-2 text-right font-medium">หน่วย</th>
                        <th className="px-4 py-2 text-right font-medium">ราคา/หน่วย</th>
                        <th className="px-4 py-2 text-right font-medium">รวม</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                      {pendingItems(selectedPR).map((item: any, idx: number) => {
                        const cost = Number(item.estimatedPrice || 0);
                        const qty = Number(item.qty || 0);
                        return (
                          <tr key={item.id || idx} className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                            <td className="px-4 py-2">{idx + 1}</td>
                            <td className="px-4 py-2 font-medium">{item.productCode || '-'}</td>
                            <td className="px-4 py-2">{item.description || '-'}</td>
                            <td className="px-4 py-2 text-right">{qty}</td>
                            <td className="px-4 py-2 text-right">{item.unit || '-'}</td>
                            <td className="px-4 py-2 text-right">฿{formatCurrency(cost)}</td>
                            <td className="px-4 py-2 text-right font-semibold">฿{formatCurrency(cost * qty)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className={`font-bold border-t ${darkMode ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-200 bg-orange-50 text-gray-900'}`}>
                        <td colSpan={6} className="px-4 py-3 text-right text-xs">ประมาณการรวม</td>
                        <td className={`px-4 py-3 text-right text-xs ${darkMode ? '' : 'text-orange-700'}`}>
                          ฿{formatCurrency(
                            pendingItems(selectedPR).reduce(
                              (s: number, i: any) => s + Number(i.estimatedPrice || 0) * Number(i.qty || 0), 0
                            )
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
