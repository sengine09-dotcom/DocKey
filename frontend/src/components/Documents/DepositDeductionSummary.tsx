interface Props {
  qtTotal: number;
  dpNumber: string;
  depositPercentage: number;
  depositAmount: number;
  balanceNet: number;
  balanceBase: number;
  vatAmount: number;
  darkMode?: boolean;
}

const fmt = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DepositDeductionSummary({
  qtTotal, dpNumber, depositPercentage, depositAmount,
  balanceNet, balanceBase, vatAmount, darkMode = false,
}: Props) {
  const border = darkMode ? 'border-gray-700' : 'border-gray-200';
  const bg = darkMode ? 'bg-gray-800/60' : 'bg-gray-50';
  const text = darkMode ? 'text-white' : 'text-gray-900';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`rounded-xl border ${border} ${bg} p-4 text-sm`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${muted}`}>
        สรุปการชำระเงิน
      </p>
      <div className="space-y-2">
        <div className={`flex justify-between font-semibold ${text}`}>
          <span>รวมมูลค่าสินค้าทั้งสิ้น (Total 100%)</span>
          <span>{fmt(qtTotal)}</span>
        </div>
        <div className={`flex justify-between ${muted}`}>
          <span>หัก เงินมัดจำตาม {dpNumber} ({depositPercentage}%)</span>
          <span className="text-red-500">-{fmt(depositAmount)}</span>
        </div>
        <div className={`flex justify-between font-bold border-t pt-2 ${border} ${text}`}>
          <span>ยอดสุทธิที่รับชำระครั้งนี้</span>
          <span>{fmt(balanceNet)}</span>
        </div>
        <div className={`mt-3 pt-3 border-t ${border} space-y-1 ${muted} text-xs`}>
          <div className="flex justify-between">
            <span>ฐานภาษีงวดนี้ (ก่อน VAT 7%)</span>
            <span>{fmt(balanceBase)}</span>
          </div>
          <div className="flex justify-between">
            <span>ภาษีมูลค่าเพิ่มงวดนี้ (VAT 7%)</span>
            <span>{fmt(vatAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
