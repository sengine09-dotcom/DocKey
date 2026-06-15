import { useEffect, useState } from 'react';
import soService, { SaleOrder } from '../services/soService';
import documentService from '../services/documentService';

interface Props {
  isOpen: boolean;
  darkMode: boolean;
  vendorCodes: any[];
  onClose: () => void;
  onCreatePO: (draft: any) => void;
}

interface EnrichedItem {
  soItemId: string;
  productCode: string;
  description: string;
  productName: string;
  qty: number;
  unit: string;
  soUnitPrice: number;
  cost: number;
  totalCost: number;
  vendorCode: string;
  vendorName: string;
}

interface VendorGroup {
  vendorCode: string;
  vendorName: string;
  items: EnrichedItem[];
}

const formatCurrency = (n: any) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SOToPOModal({ isOpen, darkMode, vendorCodes, onClose, onCreatePO }: Props) {
  const [step, setStep] = useState<'select-so' | 'select-vendor'>('select-so');
  const [sos, setSos] = useState<SaleOrder[]>([]);
  const [soSearch, setSoSearch] = useState('');
  const [isLoadingSOs, setIsLoadingSOs] = useState(false);
  const [selectedSO, setSelectedSO] = useState<SaleOrder | null>(null);
  const [quotationRef, setQuotationRef] = useState('');
  const [vendorGroups, setVendorGroups] = useState<VendorGroup[]>([]);
  const [isFetchingQT, setIsFetchingQT] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep('select-so');
    setSelectedSO(null);
    setSoSearch('');
    setVendorGroups([]);
    setQuotationRef('');
    void (async () => {
      setIsLoadingSOs(true);
      try {
        const res = await soService.getAll();
        setSos(res.data?.data || []);
      } finally {
        setIsLoadingSOs(false);
      }
    })();
  }, [isOpen]);

  const handleSelectSO = async (so: SaleOrder) => {
    setSelectedSO(so);
    setIsFetchingQT(true);
    setVendorGroups([]);
    setQuotationRef('');

    // Maps from QT (productCode → data)
    let qtCostMap: Record<string, number> = {};
    let qtVendorMap: Record<string, string> = {};  // productCode → vendorCode
    let qtNameMap: Record<string, string> = {};    // productCode → productName
    let qtRef = '';

    try {
      const qtMatch = so.remark?.match(/อ้างอิงใบเสนอราคา:\s*(\S+)/);
      qtRef = qtMatch?.[1]?.replace(/[.,]+$/, '') || '';
      if (qtRef) {
        setQuotationRef(qtRef);
        const res = await documentService.getAll('quotation', { search: qtRef });
        const quotations: any[] = res?.data?.data || [];
        const qt = quotations.find((q) => q.documentNumber === qtRef);
        if (qt?.items?.length) {
          for (const item of qt.items as any[]) {
            const code = String(item.productCode || '').trim();
            if (!code) continue;
            qtCostMap[code] = Number(item.cost || 0);
            qtVendorMap[code] = String(item.vendorCode || '').trim();
            qtNameMap[code] = String(item.productName || '').trim();
          }
        }
      }
    } catch { /* continue without QT data */ }

    // Build enriched items from SO items (primary source) — skip already-converted items
    const groups: Record<string, VendorGroup> = {};
    const NO_VENDOR = '__none__';

    for (const soItem of (so.items || []).filter((i) => !i.convertedToPr)) {
      const code = String(soItem.productCode || '').trim();
      const vendorCode = (code && qtVendorMap[code]) || '';
      const groupKey = vendorCode || NO_VENDOR;
      const vendorInfo = vendorCode ? vendorCodes.find((v) => v.vendorCode === vendorCode) : null;
      const vendorName = vendorInfo?.name || vendorCode || 'ไม่ระบุ Vendor';
      const cost = (code && qtCostMap[code]) ? qtCostMap[code] : 0;
      const productName = (code && qtNameMap[code]) ? qtNameMap[code] : soItem.description || '';

      if (!groups[groupKey]) {
        groups[groupKey] = { vendorCode, vendorName, items: [] };
      }
      groups[groupKey].items.push({
        soItemId: soItem.id,
        productCode: code,
        description: soItem.description || '',
        productName,
        qty: Number(soItem.qty) || 1,
        unit: soItem.unit || 'ชิ้น',
        soUnitPrice: Number(soItem.unitPrice) || 0,
        cost,
        totalCost: Math.round(cost * (Number(soItem.qty) || 1) * 100) / 100,
        vendorCode,
        vendorName,
      });
    }

    // Put "no vendor" group last
    const sortedGroups = [
      ...Object.values(groups).filter((g) => g.vendorCode),
      ...Object.values(groups).filter((g) => !g.vendorCode),
    ];
    setVendorGroups(sortedGroups);
    setIsFetchingQT(false);
    setStep('select-vendor');
  };

  const buildPODraft = (group: VendorGroup) => {
    if (!selectedSO) return;
    const today = new Date().toISOString().slice(0, 10);
    const refPart = quotationRef ? ` (${quotationRef})` : '';

    const poItems = group.items.map((item) => ({
      id: '',
      productCode: item.productCode,
      productName: item.productName || item.description,
      packing: '',
      quantity: String(item.qty),
      cost: String(item.cost),
      margin: '0',
      sellingPrice: String(item.cost),
      totalCost: String(item.totalCost),
      totalSellingPrice: String(item.totalCost),
      unitId: '',
    }));

    onCreatePO({
      _sourceSOId: selectedSO.id,
      _sourceSOItemIds: group.items.map((i) => i.soItemId),
      __mode: 'create',
      title: `PO from ${selectedSO.soNumber}`,
      documentDate: today,
      customer: '',
      vendorCode: group.vendorCode,
      supplierName: group.vendorCode ? group.vendorName : '',
      referenceNo: selectedSO.soNumber,
      status: 'Open',
      remark: `อ้างอิงใบสั่งขาย: ${selectedSO.soNumber}${refPart}`,
      taxRate: '7',
      paymentTerm: selectedSO.paymentTerm || '',
      paymentMethod: '',
      deliveryDate: selectedSO.requiredDate ? selectedSO.requiredDate.slice(0, 10) : '',
      items: poItems,
    });
  };

  if (!isOpen) return null;

  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  const filteredSOs = sos.filter((so) => {
    const kw = soSearch.trim().toLowerCase();
    if (!kw) return true;
    return [so.soNumber, so.customerCode, so.customerName, so.remark]
      .some((v) => String(v ?? '').toLowerCase().includes(kw));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-6 px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}>
      <div className={`relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            {step === 'select-vendor' && (
              <button type="button" onClick={() => setStep('select-so')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                ← กลับ
              </button>
            )}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-violet-300' : 'text-violet-600'}`}>
                สร้าง PO จาก SO
              </p>
              <h3 className={`text-base font-bold ${textPrimary}`}>
                {step === 'select-so'
                  ? 'เลือกใบสั่งขาย (SO)'
                  : `รายการสินค้า SO: ${selectedSO?.soNumber}${quotationRef ? ` → QT: ${quotationRef}` : ''}`}
              </h3>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className={`rounded-lg p-1.5 transition ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Step 1: Select SO ── */}
          {step === 'select-so' && (
            <div className="space-y-4">
              <input type="text" placeholder="ค้นหา SO (เลขที่, ลูกค้า, หมายเหตุ)..."
                value={soSearch} onChange={(e) => setSoSearch(e.target.value)}
                className={`w-full rounded-xl border px-4 py-2 text-sm outline-none transition ${darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
              />
              {isLoadingSOs ? (
                <div className={`text-center py-10 ${textMuted}`}>กำลังโหลด...</div>
              ) : filteredSOs.length === 0 ? (
                <div className={`text-center py-10 ${textMuted}`}>ไม่พบใบสั่งขาย</div>
              ) : (
                <div className="space-y-2">
                  {filteredSOs.map((so) => {
                    const total = (so.items || []).reduce((s, i) => s + Number(i.amount || 0), 0);
                    const qtRef = so.remark?.match(/อ้างอิงใบเสนอราคา:\s*(\S+)/)?.[1]?.replace(/[.,]+$/, '') || '';
                    const pendingCount = (so.items || []).filter((i) => !i.convertedToPr).length;
                    const totalCount = so.items?.length || 0;
                    const allDone = pendingCount === 0 && totalCount > 0;
                    return (
                      <button key={so.id} type="button"
                        onClick={() => !allDone && void handleSelectSO(so)}
                        disabled={allDone}
                        className={`w-full text-left rounded-xl border px-4 py-3.5 transition ${allDone
                          ? (darkMode ? 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed' : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed')
                          : (darkMode ? 'border-gray-700 bg-gray-800 hover:border-violet-500/50' : 'border-gray-200 bg-white hover:border-violet-400 hover:bg-violet-50/40')}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className={`font-semibold ${darkMode ? 'text-violet-300' : 'text-violet-700'}`}>{so.soNumber}</span>
                            <span className={`ml-2 text-sm ${textPrimary}`}>{so.customerName}</span>
                            {so.customerCode && <span className={`ml-2 text-xs ${textMuted}`}>{so.customerCode}</span>}
                          </div>
                          <span className={`text-sm font-semibold ${textPrimary}`}>฿{formatCurrency(total)}</span>
                        </div>
                        <div className={`mt-1 flex items-center gap-3 text-xs ${textMuted}`}>
                          <span>{new Date(so.soDate).toLocaleDateString('th-TH')}</span>
                          {allDone
                            ? <span className={`rounded-full px-2 py-0.5 font-semibold ${darkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700'}`}>✓ ออก PO ครบแล้ว</span>
                            : <span>{pendingCount}/{totalCount} รายการรอออก PO</span>
                          }
                          {qtRef && (
                            <span className={`rounded-full px-2 py-0.5 ${darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                              QT: {qtRef}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Show SO items grouped by vendor ── */}
          {step === 'select-vendor' && (
            <div className="space-y-4">
              {isFetchingQT ? (
                <div className={`text-center py-10 ${textMuted}`}>กำลังโหลดข้อมูล...</div>
              ) : (
                <>
                  {/* SO summary */}
                  <div className={`rounded-xl border px-4 py-3 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div><span className={`text-xs ${textMuted}`}>SO: </span><span className={`font-semibold ${textPrimary}`}>{selectedSO?.soNumber}</span></div>
                      <div><span className={`text-xs ${textMuted}`}>ลูกค้า: </span><span className={textPrimary}>{selectedSO?.customerName}</span></div>
                      <div><span className={`text-xs ${textMuted}`}>รายการ: </span><span className={textPrimary}>{selectedSO?.items?.length || 0} รายการ</span></div>
                      {quotationRef
                        ? <div><span className={`text-xs ${textMuted}`}>Quotation: </span><span className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{quotationRef}</span></div>
                        : <div><span className={`text-xs ${darkMode ? 'text-amber-300' : 'text-amber-600'}`}>ไม่พบ Quotation (ราคาทุนต้องระบุเพิ่มเติม)</span></div>
                      }
                    </div>
                  </div>

                  {vendorGroups.length === 0 ? (
                    <div className={`rounded-xl border px-6 py-10 text-center ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="text-3xl mb-2">✅</div>
                      <p className={`font-semibold ${textPrimary}`}>รายการสินค้าทั้งหมดถูกออก PO ไปแล้ว</p>
                      <p className={`text-sm mt-1 ${textMuted}`}>ไม่มีรายการที่รอดำเนินการใน SO นี้</p>
                    </div>
                  ) : (
                    <>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>
                        เลือก Vendor เพื่อออก PO
                      </p>
                      {vendorGroups.map((group) => {
                        const groupTotal = group.items.reduce((s, i) => s + i.totalCost, 0);
                        const hasVendor = !!group.vendorCode;
                        return (
                          <div key={group.vendorCode || '__none__'} className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div className={`px-4 py-3 flex items-center justify-between ${darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'}`}>
                              <div className="flex items-center gap-2">
                                {hasVendor ? (
                                  <>
                                    <span className={`font-semibold text-sm ${darkMode ? 'text-violet-300' : 'text-violet-700'}`}>{group.vendorCode}</span>
                                    {group.vendorName !== group.vendorCode && (
                                      <span className={`text-sm ${textPrimary}`}>{group.vendorName}</span>
                                    )}
                                  </>
                                ) : (
                                  <span className={`font-semibold text-sm ${textMuted}`}>ไม่ระบุ Vendor</span>
                                )}
                                <span className={`text-xs ${textMuted}`}>({group.items.length} รายการ)</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {hasVendor && groupTotal > 0 && (
                                  <span className={`text-sm font-semibold ${textPrimary}`}>฿{formatCurrency(groupTotal)}</span>
                                )}
                                <button type="button" onClick={() => buildPODraft(group)}
                                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition">
                                  📦 ออก PO
                                </button>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                                    <th className="px-4 py-2 text-left font-medium">รหัสสินค้า</th>
                                    <th className="px-4 py-2 text-left font-medium">ชื่อสินค้า</th>
                                    <th className="px-4 py-2 text-right font-medium">จำนวน</th>
                                    <th className="px-4 py-2 text-right font-medium">Unit</th>
                                    <th className="px-4 py-2 text-right font-medium">ราคาขาย (SO)</th>
                                    {quotationRef && <th className="px-4 py-2 text-right font-medium">ราคาทุน (QT)</th>}
                                    {quotationRef && <th className="px-4 py-2 text-right font-medium">รวมทุน</th>}
                                  </tr>
                                </thead>
                                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                                  {group.items.map((item, idx) => (
                                    <tr key={idx} className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                                      <td className="px-4 py-2 font-medium">{item.productCode || '-'}</td>
                                      <td className="px-4 py-2">{item.productName || item.description || '-'}</td>
                                      <td className="px-4 py-2 text-right">{item.qty}</td>
                                      <td className="px-4 py-2 text-right">{item.unit || '-'}</td>
                                      <td className="px-4 py-2 text-right">฿{formatCurrency(item.soUnitPrice)}</td>
                                      {quotationRef && <td className="px-4 py-2 text-right">{item.cost > 0 ? `฿${formatCurrency(item.cost)}` : <span className={textMuted}>-</span>}</td>}
                                      {quotationRef && <td className="px-4 py-2 text-right">{item.totalCost > 0 ? `฿${formatCurrency(item.totalCost)}` : <span className={textMuted}>-</span>}</td>}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
