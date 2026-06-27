import React from 'react';

interface InvoicePrintItem {
  lineNo: number;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
}

interface InvoicePrintProps {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerAddress: string;
  customerTaxId: string;
  customerBranch: string;
  paymentTerm: string;
  items: InvoicePrintItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
  depositAmount: number;
  netPayable: number;
  netPayableText: string;
  referenceNo: string;
  depositReceiptNumber?: string;
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
}

const fmtNum = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const PAGES = [
  { docType: 'ใบส่งสินค้า / ใบแจ้งหนี้ / ใบกำกับภาษี', copy: 'ต้นฉบับ' },
  { docType: 'ใบส่งสินค้า', copy: 'สำเนา' },
  { docType: 'ใบแจ้งหนี้ / ใบกำกับภาษี', copy: 'สำเนา' },
];

// ─── HTML string builder (used by printDocumentContent / html2pdf) ────────────
const buildPage = (p: InvoicePrintProps, docType: string, copy: string): string => {
  const badgeColor = copy === 'ต้นฉบับ' ? '#1d4ed8' : '#64748b';
  const companyMeta = [p.companyAddress, p.companyTaxId ? `เลขภาษี: ${p.companyTaxId}` : '']
    .filter(Boolean).join('  |  ');

  const itemRows = p.items.length === 0
    ? `<tr><td colspan="7" style="text-align:center;color:#94a3b8;border:1px solid #cbd5e1;padding:7px 8px">-</td></tr>`
    : p.items.map((item, idx) => {
        const bg = idx % 2 === 1 ? 'background:#f8fafc;' : '';
        return `<tr>
          <td style="${bg}border:1px solid #cbd5e1;padding:7px 8px;text-align:center">${esc(item.lineNo)}</td>
          <td style="${bg}border:1px solid #cbd5e1;padding:7px 8px;text-align:center">${esc(item.productCode)}</td>
          <td style="${bg}border:1px solid #cbd5e1;padding:7px 8px">${esc(item.productName)}</td>
          <td style="${bg}border:1px solid #cbd5e1;padding:7px 8px;text-align:right">${item.quantity.toLocaleString('th-TH')}</td>
          <td style="${bg}border:1px solid #cbd5e1;padding:7px 8px;text-align:center">${esc(item.unit)}</td>
          <td style="${bg}border:1px solid #cbd5e1;padding:7px 8px;text-align:right">${fmtNum(item.unitPrice)}</td>
          <td style="${bg}border:1px solid #cbd5e1;padding:7px 8px;text-align:right">${fmtNum(item.totalAmount)}</td>
        </tr>`;
      }).join('');

  const depositRows = p.depositAmount > 0 ? `
    <tr>
      <td style="border:1px solid #cbd5e1;padding:7px 10px;background:#f8fafc;font-weight:700;color:#b91c1c">หัก เงินมัดจำรับแล้ว</td>
      <td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right;color:#b91c1c">(${fmtNum(p.depositAmount)})</td>
    </tr>
    <tr>
      <td style="border:1px solid #cbd5e1;padding:7px 10px;background:#dbeafe;color:#1e3a8a;font-weight:700;font-size:13px">จำนวนเงินที่ต้องชำระ</td>
      <td style="border:1px solid #cbd5e1;padding:7px 10px;background:#dbeafe;color:#1e3a8a;font-weight:700;font-size:13px;text-align:right">${fmtNum(p.netPayable)}</td>
    </tr>` : '';

  const soRef = p.referenceNo
    ? `<div style="color:#64748b;font-weight:700;font-size:11px">อ้างอิง SO</div>
       <div style="color:#0f172a;font-size:11px">${esc(p.referenceNo)}</div>`
    : '';

  const depositNote = p.depositReceiptNumber
    ? `<div style="font-size:10px;color:#64748b;margin-bottom:8px">หมายเหตุ: อ้างอิงใบรับมัดจำเลขที่ ${esc(p.depositReceiptNumber)}</div>`
    : '';

  return `
  <div style="width:210mm;padding:12mm 14mm 16mm;box-sizing:border-box;page-break-after:always;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#0f172a;line-height:1.5;background:#ffffff;position:relative">

    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:14px;border-bottom:2px solid #1d4ed8;margin-bottom:14px">
      <!-- Brand -->
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div style="width:56px;height:56px;min-width:56px;border-radius:16px;background:linear-gradient(135deg,#1d4ed8,#0f172a);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;letter-spacing:0.08em">DK</div>
        <div>
          <div style="font-size:24px;font-weight:700;letter-spacing:0.06em;color:#0f172a">${esc(p.companyName || 'บริษัท')}</div>
          <div style="margin-top:3px;color:#475569;font-size:11px">ผู้ประกอบการจดทะเบียนภาษีมูลค่าเพิ่ม</div>
          <div style="margin-top:8px;color:#334155;font-size:11px;line-height:1.6">${esc(companyMeta)}</div>
        </div>
      </div>
      <!-- Document Box -->
      <div style="min-width:260px;border:1px solid #bfdbfe;border-radius:16px;overflow:hidden">
        <div style="background:#eff6ff;color:#1d4ed8;padding:8px 12px;font-size:11px;font-weight:700;letter-spacing:0.1em;display:flex;justify-content:space-between;align-items:center">
          <span>${esc(docType)}</span>
          <span style="background:${badgeColor};color:#fff;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700;margin-left:8px;flex-shrink:0">${esc(copy)}</span>
        </div>
        <div style="padding:10px 12px">
          <div style="font-size:18px;font-weight:700;color:#0f172a">${esc(p.invoiceNo || '-')}</div>
          <div style="margin-top:8px;display:grid;grid-template-columns:80px 1fr;row-gap:4px;column-gap:8px;font-size:11px">
            <div style="color:#64748b;font-weight:700">วันที่</div><div>${esc(p.invoiceDate || '-')}</div>
            <div style="color:#64748b;font-weight:700">ครบกำหนด</div><div style="color:#dc2626;font-weight:600">${esc(p.dueDate || '-')}</div>
            ${soRef}
          </div>
        </div>
      </div>
    </div>

    <!-- Customer Info -->
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:12px">
      <div style="background:#eff6ff;color:#1e3a8a;padding:7px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">ข้อมูลลูกค้า / Customer Information</div>
      <div style="padding:10px 12px">
        <div style="display:grid;grid-template-columns:110px 1fr;row-gap:6px;column-gap:10px;font-size:11px">
          <div style="color:#64748b;font-weight:700">ลูกค้า</div><div>${esc(p.customerName || '-')}</div>
          <div style="color:#64748b;font-weight:700">ที่อยู่</div><div style="white-space:pre-wrap">${esc(p.customerAddress || '-')}</div>
          <div style="color:#64748b;font-weight:700">เลขผู้เสียภาษี</div><div>${esc(p.customerTaxId || '-')}</div>
          <div style="color:#64748b;font-weight:700">สาขา</div><div>${esc(p.customerBranch || 'สำนักงานใหญ่')}</div>
          <div style="color:#64748b;font-weight:700">เงื่อนไขชำระ</div><div>${esc(p.paymentTerm || '-')}</div>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px">
      <thead>
        <tr>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;background:#1e3a8a;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;width:28px;text-align:center">ที่</th>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;background:#1e3a8a;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;width:80px;text-align:center">รหัส</th>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;background:#1e3a8a;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;text-align:left">รายการ</th>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;background:#1e3a8a;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;width:52px;text-align:right">จำนวน</th>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;background:#1e3a8a;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;width:44px;text-align:center">หน่วย</th>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;background:#1e3a8a;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;width:80px;text-align:right">ราคา/หน่วย</th>
          <th style="border:1px solid #cbd5e1;padding:7px 8px;background:#1e3a8a;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;width:88px;text-align:right">จำนวนเงิน</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- Summary -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <table style="font-size:11px;min-width:220px;border-collapse:collapse">
        <tr>
          <td style="border:1px solid #cbd5e1;padding:7px 10px;background:#f8fafc;font-weight:700;color:#334155">รวมเป็นเงิน (ก่อน VAT)</td>
          <td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right">${fmtNum(p.subtotal)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #cbd5e1;padding:7px 10px;background:#f8fafc;font-weight:700;color:#334155">ภาษีมูลค่าเพิ่ม ${p.vatRate}%</td>
          <td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right">${fmtNum(p.vatAmount)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #cbd5e1;padding:7px 10px;background:#dbeafe;color:#1e3a8a;font-weight:700;font-size:13px">จำนวนเงินรวมทั้งสิ้น</td>
          <td style="border:1px solid #cbd5e1;padding:7px 10px;background:#dbeafe;color:#1e3a8a;font-weight:700;font-size:13px;text-align:right">${fmtNum(p.grandTotal)}</td>
        </tr>
        ${depositRows}
        <tr>
          <td colspan="2" style="border:1px solid #cbd5e1;padding:7px 10px;font-style:italic;font-size:10px;color:#475569">(${esc(p.netPayableText)})</td>
        </tr>
      </table>
    </div>

    ${depositNote}

    <!-- Signature -->
    <div style="padding-top:24px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
      <div style="border-top:1px solid #94a3b8;padding-top:8px;min-height:52px">
        <div style="font-size:11px;font-weight:700;color:#334155">ผู้รับสินค้า / Received by</div>
        <div style="margin-top:4px;font-size:10px;color:#64748b">ลายเซ็น / วันที่รับสินค้า</div>
      </div>
      <div style="border-top:1px solid #94a3b8;padding-top:8px;min-height:52px">
        <div style="font-size:11px;font-weight:700;color:#334155">ผู้จัดทำ / Prepared by</div>
        <div style="margin-top:4px;font-size:10px;color:#64748b">ลายเซ็น / ตำแหน่ง</div>
      </div>
      <div style="border-top:1px solid #94a3b8;padding-top:8px;min-height:52px">
        <div style="font-size:11px;font-weight:700;color:#334155">ผู้มีอำนาจอนุมัติ / Authorized by</div>
        <div style="margin-top:4px;font-size:10px;color:#64748b">ลายเซ็น / ตำแหน่ง</div>
      </div>
    </div>
  </div>`;
};

export const buildInvoicePrintHtml = (props: InvoicePrintProps): string =>
  PAGES.map(p => buildPage(props, p.docType, p.copy)).join('');

// ─── React component (kept for potential preview use) ─────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    width: '210mm', minHeight: '297mm', padding: '12mm 14mm 16mm',
    boxSizing: 'border-box', fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '12px', color: '#0f172a', lineHeight: '1.5',
    display: 'flex', flexDirection: 'column', background: '#ffffff',
  },
};

const InvoicePrintLayout: React.FC<InvoicePrintProps> = (props) => (
  <div style={s.page}>
    <div dangerouslySetInnerHTML={{ __html: buildInvoicePrintHtml(props) }} />
  </div>
);

export default InvoicePrintLayout;
export type { InvoicePrintProps };
