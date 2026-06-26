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

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PAGES = [
  'ต้นฉบับใบส่งสินค้า / ต้นฉบับใบแจ้งหนี้ / ต้นฉบับใบกำกับภาษี',
  'สำเนาใบส่งสินค้า',
  'สำเนาใบแจ้งหนี้ / สำเนาใบกำกับภาษี',
];

const InvoicePage: React.FC<InvoicePrintProps & { pageLabel: string }> = (props) => (
  <div style={{ width: '210mm', minHeight: '297mm', padding: '12mm', boxSizing: 'border-box', pageBreakAfter: 'always', fontFamily: 'Sarabun, sans-serif', fontSize: '11pt' }}>
    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', marginBottom: '4mm', border: '1px solid #333', padding: '2mm' }}>
      {props.pageLabel}
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6mm' }}>
      <div>
        <div style={{ fontWeight: 'bold', fontSize: '13pt' }}>{props.companyName}</div>
        <div style={{ whiteSpace: 'pre-line', fontSize: '9pt' }}>{props.companyAddress}</div>
        <div style={{ fontSize: '9pt' }}>เลขประจำตัวผู้เสียภาษี: {props.companyTaxId}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13pt' }}>เลขที่: {props.invoiceNo}</div>
        <div style={{ fontSize: '9pt' }}>วันที่: {props.invoiceDate}</div>
        <div style={{ fontSize: '9pt' }}>ครบกำหนด: {props.dueDate}</div>
        {props.referenceNo && <div style={{ fontSize: '9pt' }}>อ้างอิง SO: {props.referenceNo}</div>}
      </div>
    </div>

    <div style={{ border: '1px solid #ccc', padding: '3mm', marginBottom: '4mm', fontSize: '9pt' }}>
      <div><strong>ลูกค้า:</strong> {props.customerName}</div>
      <div><strong>ที่อยู่:</strong> {props.customerAddress}</div>
      <div style={{ display: 'flex', gap: '20mm' }}>
        <div><strong>เลขผู้เสียภาษี:</strong> {props.customerTaxId || '-'}</div>
        <div><strong>สาขา:</strong> {props.customerBranch || 'สำนักงานใหญ่'}</div>
        <div><strong>เครดิต:</strong> {props.paymentTerm}</div>
      </div>
    </div>

    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '4mm' }}>
      <thead>
        <tr style={{ background: '#f0f0f0' }}>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm', width: '6mm' }}>ที่</th>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm', width: '22mm' }}>รหัส</th>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm' }}>รายการ</th>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm', width: '14mm' }}>จำนวน</th>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm', width: '12mm' }}>หน่วย</th>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm', width: '22mm', textAlign: 'right' }}>ราคา/หน่วย</th>
          <th style={{ border: '1px solid #ccc', padding: '1mm 2mm', width: '24mm', textAlign: 'right' }}>จำนวนเงิน</th>
        </tr>
      </thead>
      <tbody>
        {props.items.map((item) => (
          <tr key={item.lineNo}>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm', textAlign: 'center' }}>{item.lineNo}</td>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm' }}>{item.productCode}</td>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm' }}>{item.productName}</td>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm', textAlign: 'right' }}>{item.quantity.toLocaleString('th-TH')}</td>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm', textAlign: 'center' }}>{item.unit}</td>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm', textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
            <td style={{ border: '1px solid #ccc', padding: '1mm 2mm', textAlign: 'right' }}>{fmt(item.totalAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4mm' }}>
      <table style={{ fontSize: '9pt', minWidth: '80mm' }}>
        <tbody>
          <tr>
            <td style={{ padding: '0.5mm 2mm' }}>รวมเป็นเงิน (Subtotal)</td>
            <td style={{ padding: '0.5mm 2mm', textAlign: 'right' }}>{fmt(props.subtotal)}</td>
          </tr>
          <tr>
            <td style={{ padding: '0.5mm 2mm' }}>ภาษีมูลค่าเพิ่ม {props.vatRate}%</td>
            <td style={{ padding: '0.5mm 2mm', textAlign: 'right' }}>{fmt(props.vatAmount)}</td>
          </tr>
          <tr style={{ borderTop: '1px solid #333' }}>
            <td style={{ padding: '0.5mm 2mm', fontWeight: 'bold' }}>จำนวนเงินรวมทั้งสิ้น</td>
            <td style={{ padding: '0.5mm 2mm', textAlign: 'right', fontWeight: 'bold' }}>{fmt(props.grandTotal)}</td>
          </tr>
          {props.depositAmount > 0 && (
            <tr>
              <td style={{ padding: '0.5mm 2mm' }}>หัก เงินมัดจำ</td>
              <td style={{ padding: '0.5mm 2mm', textAlign: 'right', color: '#b00' }}>({fmt(props.depositAmount)})</td>
            </tr>
          )}
          <tr style={{ borderTop: '1px solid #333' }}>
            <td style={{ padding: '0.5mm 2mm', fontWeight: 'bold' }}>จำนวนเงินที่ต้องชำระทั้งสิ้น</td>
            <td style={{ padding: '0.5mm 2mm', textAlign: 'right', fontWeight: 'bold' }}>{fmt(props.netPayable)}</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ padding: '1mm 2mm', fontStyle: 'italic', fontSize: '8pt' }}>
              ({props.netPayableText})
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    {props.depositReceiptNumber && (
      <div style={{ fontSize: '8pt', color: '#555' }}>
        หมายเหตุ: อ้างอิงใบรับมัดจำ {props.depositReceiptNumber}
      </div>
    )}

    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20mm', fontSize: '9pt' }}>
      <div style={{ textAlign: 'center', minWidth: '50mm' }}>
        <div style={{ borderTop: '1px solid #333', paddingTop: '2mm' }}>ผู้รับสินค้า / Received by</div>
        <div style={{ marginTop: '12mm', borderTop: '1px solid #333', paddingTop: '2mm' }}>วันที่รับสินค้า</div>
      </div>
      <div style={{ textAlign: 'center', minWidth: '50mm' }}>
        <div style={{ borderTop: '1px solid #333', paddingTop: '2mm' }}>ผู้จัดทำ / Prepared by</div>
      </div>
      <div style={{ textAlign: 'center', minWidth: '50mm' }}>
        <div style={{ borderTop: '1px solid #333', paddingTop: '2mm' }}>ผู้มีอำนาจอนุมัติ / Authorized by</div>
      </div>
    </div>
  </div>
);

const InvoicePrintLayout: React.FC<InvoicePrintProps> = (props) => (
  <div>
    {PAGES.map((label, i) => (
      <InvoicePage key={i} {...props} pageLabel={label} />
    ))}
    <style>{`
      @media print {
        body > *:not(.invoice-print-root) { display: none !important; }
        .invoice-print-root { display: block !important; }
        @page { size: A4; margin: 0; }
      }
    `}</style>
  </div>
);

export default InvoicePrintLayout;
export type { InvoicePrintProps };
