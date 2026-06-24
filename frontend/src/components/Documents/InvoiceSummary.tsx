import { bahttext } from 'bahttext';

interface InvoiceSummaryProps {
  subtotal: number;
  vat: number;
  grandTotal: number;
  taxRate: number;
  depositAmount?: number;
  depositReceiptNumber?: string;
  darkMode?: boolean;
}

const fmt = (n: number): string =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoiceSummary({
  subtotal,
  vat,
  grandTotal,
  taxRate,
  depositAmount,
  depositReceiptNumber,
  darkMode = false,
}: InvoiceSummaryProps) {
  const hasDeposit = (depositAmount ?? 0) > 0;
  const netPayable = grandTotal - (depositAmount ?? 0);

  const border = darkMode ? 'border-gray-700' : 'border-gray-200';
  const bg = darkMode ? 'bg-gray-800/60' : 'bg-gray-50';
  const text = darkMode ? 'text-white' : 'text-gray-900';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const divider = darkMode ? 'border-gray-600' : 'border-gray-300';

  return (
    <div className={`rounded-b-xl border-t ${border} ${bg} px-4 py-4`}>
      <div className="ml-auto max-w-xs space-y-1.5 text-sm">
        {/* Subtotal */}
        <div className={`flex justify-between ${muted}`}>
          <span>รวมเป็นเงิน</span>
          <span>{fmt(subtotal)}</span>
        </div>

        {/* VAT */}
        <div className={`flex justify-between ${muted}`}>
          <span>ภาษีมูลค่าเพิ่ม {taxRate}%</span>
          <span>{fmt(vat)}</span>
        </div>

        {/* Grand Total */}
        <div className={`flex justify-between border-t pt-1.5 font-semibold ${divider} ${text}`}>
          <span>จำนวนเงินรวมทั้งสิ้น</span>
          <span>{fmt(grandTotal)}</span>
        </div>

        {/* Deposit deduction (conditional) */}
        {hasDeposit && (
          <div className={`flex justify-between ${muted}`}>
            <span>หัก เงินมัดจำ</span>
            <span className="text-red-500">({fmt(depositAmount!)})</span>
          </div>
        )}

        {/* Net Payable */}
        <div className={`flex justify-between border-t pt-1.5 font-bold ${divider} ${text}`}>
          <span>จำนวนเงินที่ต้องชำระทั้งสิ้น</span>
          <span>฿{fmt(netPayable)}</span>
        </div>

        {/* Thai baht text */}
        <div className={`pt-0.5 text-xs italic ${muted}`}>
          ({bahttext(Math.round(netPayable * 100) / 100)})
        </div>
      </div>

      {/* Deposit receipt reference note */}
      {depositReceiptNumber && (
        <p className={`mt-3 border-t pt-3 text-xs ${divider} ${muted}`}>
          หมายเหตุ: อ้างอิงใบรับมัดจำ {depositReceiptNumber}
        </p>
      )}
    </div>
  );
}
