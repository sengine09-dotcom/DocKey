import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import documentService from '../services/documentService';
import dashboardService from '../services/dashboardService';
import codeService from '../services/codeService';
import useThemePreference from '../hooks/useThemePreference';

export default function Dashboard({ onNavigate = () => {} }: any) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [customerCodes, setCustomerCodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useThemePreference();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        console.log('[DEBUG] Dashboard: Starting data fetch');
        
        const [documentsResult, dashboardResult, customerCodesResult] = await Promise.allSettled([
          documentService.getAll('work_order'),
          dashboardService.getMetrics(),
          codeService.getAll('customer'),
        ]);
        
        console.log('[DEBUG] Dashboard: API results:', {
          documentsResult: documentsResult.status,
          dashboardResult: dashboardResult.status,
          customerCodesResult: customerCodesResult.status,
          dashboardData: dashboardResult.status === 'fulfilled' ? dashboardResult.value?.data : null
        });
        
        setDocuments(documentsResult.status === 'fulfilled' ? (documentsResult.value?.data?.data || []) : []);
        setCustomerCodes(customerCodesResult.status === 'fulfilled' ? (customerCodesResult.value?.data?.data || []) : []);
        
        if (dashboardResult.status === 'fulfilled') {
          console.log('[DEBUG] Dashboard: Setting dashboard data:', dashboardResult.value?.data?.data);
          setDashboardData(dashboardResult.value?.data?.data || {});
        } else if (dashboardResult.status === 'rejected') {
          console.error('[DEBUG] Dashboard: Dashboard API failed:', dashboardResult.reason);
        }
      } catch (error) {
        console.error('[DEBUG] Dashboard fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeWorkOrders = documents.filter((document: any) => (document.status || '').toLowerCase() !== 'completed');
  
  // Get data from backend
  const businessMetrics = {
    totalRevenue: 0,
    totalCost: 0,
    netProfit: 0,
    completedSales: 0,
    unpaidInvoiceCount: 0,
    unpaidRevenue: 0,
    potentialRevenue: 0,
    potentialProfit: 0,
    ...(dashboardData?.businessMetrics || {})
  };
  
  const documentCounts = dashboardData?.documentCounts || {
    total: 0,
    quotations: 0,
    invoices: 0,
    receipts: 0
  };
  
  const documentsData = dashboardData?.documents || {
    quotations: [],
    invoices: [],
    receipts: []
  };

  const linkedInvoiceNumbersFromQuotations = new Set(
    documentsData.quotations
      .map((quotation: any) => quotation.quotationDocument?.linkedInvoiceNumber || quotation.linkedInvoiceNumber)
      .filter(Boolean)
  );

  const linkedInvoiceNumbersFromReceipts = new Set(
    documentsData.receipts
      .map((receipt: any) => receipt.receiptDocument?.linkedInvoiceNumber || receipt.linkedInvoiceNumber || receipt.referenceNo)
      .filter(Boolean)
  );

  const quotationByLinkedInvoiceNumber = new Map(
    documentsData.quotations
      .filter((quotation: any) => quotation.quotationDocument?.linkedInvoiceNumber || quotation.linkedInvoiceNumber)
      .map((quotation: any) => [quotation.quotationDocument?.linkedInvoiceNumber || quotation.linkedInvoiceNumber, quotation])
  ) as Map<string, any>;

  const paidQuotations = documentsData.quotations.filter((quotation: any) => {
    const linkedInvoiceNumber = quotation.quotationDocument?.linkedInvoiceNumber || quotation.linkedInvoiceNumber;
    if (!linkedInvoiceNumber) return false;
    const linkedInvoice = documentsData.invoices.find((invoice: any) => invoice.documentNumber === linkedInvoiceNumber);
    const hasReceipt = Boolean(
      linkedInvoiceNumbersFromReceipts.has(linkedInvoiceNumber) ||
      linkedInvoice?.invoiceDocument?.linkedReceiptNumber ||
      linkedInvoice?.linkedReceiptNumber
    );
    return hasReceipt;
  });

  const unpaidQuotations = documentsData.quotations.filter((quotation: any) => {
    const linkedInvoiceNumber = quotation.quotationDocument?.linkedInvoiceNumber || quotation.linkedInvoiceNumber;
    if (!linkedInvoiceNumber) return false;
    const linkedInvoice = documentsData.invoices.find((invoice: any) => invoice.documentNumber === linkedInvoiceNumber);
    const hasReceipt = Boolean(
      linkedInvoiceNumbersFromReceipts.has(linkedInvoiceNumber) ||
      linkedInvoice?.invoiceDocument?.linkedReceiptNumber ||
      linkedInvoice?.linkedReceiptNumber
    );
    return !hasReceipt;
  });

  const derivedBusinessMetrics = {
    totalRevenue: documentsData.invoices.reduce((sum: number, invoice: any) => sum + Number(invoice.totalSellingPrice || 0), 0),
    totalCost: documentsData.invoices.reduce((sum: number, invoice: any) => sum + Number(invoice.totalCost || 0), 0),
    netProfit: paidQuotations.reduce(
      (sum: number, quotation: any) => sum + (Number(quotation.totalSellingPrice || 0) - Number(quotation.totalCost || 0)),
      0
    ),
    completedSales: paidQuotations.length,
    unpaidInvoiceCount: unpaidQuotations.length,
    unpaidRevenue: unpaidQuotations.reduce((sum: number, quotation: any) => sum + Number(quotation.totalSellingPrice || 0), 0),
  };

  const unpaidInvoices = documentsData.invoices.filter((inv: any) => {
    const isLinkedFromQuotation = linkedInvoiceNumbersFromQuotations.has(inv.documentNumber);
    const hasReceipt = Boolean(
      inv.invoiceDocument?.linkedReceiptNumber ||
      inv.linkedReceiptNumber ||
      linkedInvoiceNumbersFromReceipts.has(inv.documentNumber)
    );
    return isLinkedFromQuotation && !hasReceipt;
  });

  const unpaidInvoiceCount = derivedBusinessMetrics.unpaidInvoiceCount;
  const unpaidRevenue = derivedBusinessMetrics.unpaidRevenue;

  const customerNameMap = customerCodes.reduce((result: Record<string, string>, customer: any) => {
    const customerCode = String(customer?.customerCode || '').trim();
    if (!customerCode) return result;
    result[customerCode] = customer?.customerName || customer?.shortName || customerCode;
    return result;
  }, {});

  const getCustomerDisplayName = (document: any) => {
    const customerCode = String(document?.customer || document?.customerId || '').trim();
    return document?.customerName || customerNameMap[customerCode] || '-';
  };

  const StatCard = ({ title, value, icon, bgClass, textClass }: any) => (
    <div className={`rounded-xl border p-6 flex items-center gap-5 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
      <div className={`text-3xl w-14 h-14 flex items-center justify-center rounded-xl ${bgClass}`}>{icon}</div>
      <div>
        <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
        <p className={`text-3xl font-bold mt-0.5 ${textClass}`}>{value}</p>
      </div>
    </div>
  );

  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate} currentPage="dashboard">
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {/* Page Header */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Dashboard</h1>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Overview of all documents in the system</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {isLoading ? (
            <div className={`text-center py-16 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="text-4xl mb-3">⏳</div>
              <p>Loading dashboard...</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title="Total Documents" value={documentCounts.total} icon="📁"
                  bgClass={darkMode ? 'bg-blue-900/40' : 'bg-blue-100'}
                  textClass={darkMode ? 'text-blue-300' : 'text-blue-700'} />
                <StatCard title="Work Orders" value={documents.length} icon="🛠️"
                  bgClass={darkMode ? 'bg-indigo-900/40' : 'bg-indigo-100'}
                  textClass={darkMode ? 'text-indigo-300' : 'text-indigo-700'} />
                <StatCard title="Invoice Documents" value={documentCounts.invoices} icon="🧾"
                  bgClass={darkMode ? 'bg-purple-900/40' : 'bg-purple-100'}
                  textClass={darkMode ? 'text-purple-300' : 'text-purple-700'} />
                <StatCard title="Active Work Orders" value={activeWorkOrders.length} icon="📌"
                  bgClass={darkMode ? 'bg-yellow-900/40' : 'bg-yellow-100'}
                  textClass={darkMode ? 'text-yellow-300' : 'text-yellow-700'} />
              </div>

              {/* Profit/Loss Summary Cards */}
              <div>
                <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>💰 Business Metrics Summary</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <StatCard 
                    title="ราคาขายรวม (Invoice)" 
                    value={`฿${derivedBusinessMetrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    icon="💵"
                    bgClass={darkMode ? 'bg-green-900/40' : 'bg-green-100'}
                    textClass={darkMode ? 'text-green-300' : 'text-green-700'} />
                  <StatCard 
                    title="ทุนรวม (Invoice)" 
                    value={`฿${derivedBusinessMetrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    icon="💸"
                    bgClass={darkMode ? 'bg-red-900/40' : 'bg-red-100'}
                    textClass={darkMode ? 'text-red-300' : 'text-red-700'} />
                  <StatCard 
                    title="กำไร / ขาดทุน (Invoice ออก REC แล้ว)" 
                    value={`฿${derivedBusinessMetrics.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    icon={derivedBusinessMetrics.netProfit >= 0 ? "📈" : "📉"}
                    bgClass={derivedBusinessMetrics.netProfit >= 0 ? (darkMode ? 'bg-emerald-900/40' : 'bg-emerald-100') : (darkMode ? 'bg-red-900/40' : 'bg-red-100')}
                    textClass={derivedBusinessMetrics.netProfit >= 0 ? (darkMode ? 'text-emerald-300' : 'text-emerald-700') : (darkMode ? 'text-red-300' : 'text-red-700')} />
                  <StatCard 
                    title="Completed Sales" 
                    value={`${derivedBusinessMetrics.completedSales} deals`} 
                    icon="🤝"
                    bgClass={darkMode ? 'bg-blue-900/40' : 'bg-blue-100'}
                    textClass={darkMode ? 'text-blue-300' : 'text-blue-700'} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                  <StatCard 
                    title="Invoice ลูกค้าสั่งซื้อแล้วค้างจ่าย" 
                    value={`${unpaidInvoiceCount} ใบ`} 
                    icon="⏰"
                    bgClass={darkMode ? 'bg-orange-900/40' : 'bg-orange-100'}
                    textClass={darkMode ? 'text-orange-300' : 'text-orange-700'} />
                  <StatCard 
                    title="ยอดค้างรับ (ยังไม่ออก REC)" 
                    value={`฿${unpaidRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    icon="💳"
                    bgClass={darkMode ? 'bg-amber-900/40' : 'bg-amber-100'}
                    textClass={darkMode ? 'text-amber-300' : 'text-amber-700'} />
                </div>
              </div>

              {/* Work Order Documents Table */}
              <div className={`rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm overflow-hidden`}>
                <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🛠️ Work Order Documents</h2>
                  <button onClick={() => onNavigate('documents', { selectedType: 'work_order' })} className="text-sm text-blue-500 hover:text-blue-600 font-medium">View All →</button>
                </div>
                {documents.length === 0 ? (
                  <div className={`px-6 py-10 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No work order documents yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase`}>
                          <th className="px-6 py-3 text-left">Work Order No</th>
                          <th className="px-6 py-3 text-left">Assigned To</th>
                          <th className="px-6 py-3 text-left">Scheduled Date</th>
                          <th className="px-6 py-3 text-right">Total Amount</th>
                          <th className="px-6 py-3 text-center">Status</th>
                          <th className="px-6 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                        {documents.slice(0, 10).map((document: any) => (
                          <tr key={document.documentId || document.id || document.documentNumber} className={`${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                            <td className={`px-6 py-3 font-mono font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{document.documentNumber || '-'}</td>
                            <td className={`px-6 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{document.assignedTo || '-'}</td>
                            <td className={`px-6 py-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {document.scheduledDate ? new Date(document.scheduledDate).toLocaleDateString('en-GB') : '-'}
                            </td>
                            <td className={`px-6 py-3 text-right font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              ฿{Number(document.total || document.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                document.status === 'Completed' ? 'bg-green-500/20 text-green-600' : 'bg-yellow-500/20 text-yellow-600'
                              }`}>
                                {document.status || 'Open'}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-center">
                              <button
                                onClick={() => onNavigate('documents', { selectedType: 'work_order' })}
                                className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Receipt Documents Table (Paid) */}
              <div className={`rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm overflow-hidden`}>
                <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🧾 Receipt Documents (Paid)</h2>
                  <button onClick={() => onNavigate('documents', { selectedType: 'receipt' })} className="text-sm text-blue-500 hover:text-blue-600 font-medium">View All →</button>
                </div>
                {documentsData.receipts.length === 0 ? (
                  <div className={`px-6 py-10 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No receipt documents yet (no payments received)</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase`}>
                          <th className="px-6 py-3 text-left">Receipt No</th>
                          <th className="px-6 py-3 text-left">Customer</th>
                          <th className="px-6 py-3 text-left">Received Date</th>
                          <th className="px-6 py-3 text-right">Amount</th>
                          <th className="px-6 py-3 text-right">Profit / Loss</th>
                          <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                        {documentsData.receipts.slice(0, 10).map((rec: any, idx: number) => {
                          // Find linked invoice
                          const linkedInvoice = documentsData.invoices.find(inv => 
                            inv.documentNumber === rec.referenceNo || 
                            inv.documentNumber === rec.receiptDocument?.linkedInvoiceNumber ||
                            inv.documentNumber === rec.linkedInvoiceNumber
                          );
                          
                          if (!linkedInvoice) return null; // Skip receipts without linked invoices

                          const linkedQuotation = quotationByLinkedInvoiceNumber.get(linkedInvoice.documentNumber) as any;
                          const realizedRevenue = Number(linkedQuotation?.totalSellingPrice || 0);
                          const cost = Number(linkedQuotation?.totalCost || 0);

                          const profit = realizedRevenue - cost;
                          return (
                            <tr key={rec.documentId || rec.id || rec.documentNumber || idx} className={`${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                              <td className={`px-6 py-3 font-mono font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{rec.documentNumber || '-'}</td>
                              <td className={`px-6 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{getCustomerDisplayName(rec)}</td>
                              <td className={`px-6 py-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {rec.receiptDocument?.receivedDate ? new Date(rec.receiptDocument.receivedDate).toLocaleDateString('en-GB') : '-'}
                              </td>
                              <td className={`px-6 py-3 text-right font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                ฿{realizedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`px-6 py-3 text-right font-medium ${profit >= 0 ? (darkMode ? 'text-emerald-300' : 'text-emerald-700') : (darkMode ? 'text-red-300' : 'text-red-700')}`}>
                                ฿{profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-600`}>
                                  Paid
                                </span>
                              </td>
                            </tr>
                          );
                        }).filter(Boolean)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Quotation Documents Table (For Reference) */}
              <div className={`rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm overflow-hidden`}>
                <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📋 Quotation Documents</h2>
                  <button onClick={() => onNavigate('documents', { selectedType: 'quotation' })} className="text-sm text-blue-500 hover:text-blue-600 font-medium">View All →</button>
                </div>
                {documentsData.quotations.length === 0 ? (
                  <div className={`px-6 py-10 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No quotation documents yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase`}>
                          <th className="px-6 py-3 text-left">Quotation No</th>
                          <th className="px-6 py-3 text-left">Customer</th>
                          <th className="px-6 py-3 text-left">Valid Until</th>
                          <th className="px-6 py-3 text-right">Total Amount</th>
                          <th className="px-6 py-3 text-right">Profit</th>
                          <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                        {documentsData.quotations.slice(0, 10).map((quot: any, idx: number) => {
                          const profit = Number(quot.totalSellingPrice || quot.total || quot.totalAmount || 0) - Number(quot.totalCost || 0);
                          return (
                            <tr key={quot.documentId || quot.id || quot.documentNumber || idx} className={`${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                              <td className={`px-6 py-3 font-mono font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{quot.documentNumber || '-'}</td>
                              <td className={`px-6 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{getCustomerDisplayName(quot)}</td>
                              <td className={`px-6 py-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {quot.quotationDocument?.validUntil ? new Date(quot.quotationDocument.validUntil).toLocaleDateString('en-GB') : '-'}
                              </td>
                              <td className={`px-6 py-3 text-right font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                ฿{Number(quot.totalSellingPrice || quot.total || quot.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`px-6 py-3 text-right font-medium ${profit >= 0 ? (darkMode ? 'text-emerald-300' : 'text-emerald-700') : (darkMode ? 'text-red-300' : 'text-red-700')}`}>
                                ฿{profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                  quot.status === 'Won' || quot.status === 'Converted' ? 'bg-green-500/20 text-green-600' :
                                  quot.status === 'Lost' || quot.status === 'Rejected' ? 'bg-red-500/20 text-red-600' :
                                  quot.status === 'Sent' || quot.status === 'Negotiating' ? 'bg-blue-500/20 text-blue-600' :
                                  'bg-gray-500/20 text-gray-600'
                                }`}>
                                  {quot.status || 'Draft'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Invoice Documents Table (For Reference) */}
              <div className={`rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm overflow-hidden`}>
                <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🧾 Invoice Documents (For Reference)</h2>
                  <button onClick={() => onNavigate('invoice-home')} className="text-sm text-blue-500 hover:text-blue-600 font-medium">View All →</button>
                </div>
                {documentsData.invoices.length === 0 ? (
                  <div className={`px-6 py-10 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No invoice documents yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase`}>
                          <th className="px-6 py-3 text-left">Invoice No</th>
                          <th className="px-6 py-3 text-left">Customer</th>
                          <th className="px-6 py-3 text-left">Issued Date</th>
                          <th className="px-6 py-3 text-right">Selling Price</th>
                          <th className="px-6 py-3 text-right">Profit / Loss</th>
                          <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                        {documentsData.invoices.slice(0, 10).map((inv: any, idx: number) => {
                          const profit = Number(inv.totalSellingPrice || inv.total || inv.totalAmount || 0) - Number(inv.totalCost || 0);
                          return (
                            <tr key={inv.documentId || inv.id || inv.documentNumber || idx} className={`${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                              <td className={`px-6 py-3 font-mono font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{inv.documentNumber || inv.invoiceNo || inv.invoiceId || inv.id || '-'}</td>
                              <td className={`px-6 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{getCustomerDisplayName(inv)}</td>
                              <td className={`px-6 py-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {inv.documentDate || inv.invoiceDate || inv.issuedDate || inv.issDate ? new Date(inv.documentDate || inv.invoiceDate || inv.issuedDate || inv.issDate).toLocaleDateString('en-GB') : '-'}
                              </td>
                              <td className={`px-6 py-3 text-right font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                ฿{Number(inv.totalSellingPrice || inv.total || inv.totalAmount || inv.totalSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`px-6 py-3 text-right font-medium ${profit >= 0 ? (darkMode ? 'text-emerald-300' : 'text-emerald-700') : (darkMode ? 'text-red-300' : 'text-red-700')}`}>
                                ฿{profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                  inv.status === 'Completed' || inv.status === 'Paid'
                                    ? 'bg-green-500/20 text-green-600'
                                    : 'bg-blue-500/20 text-blue-600'
                                }`}>
                                  {inv.status || 'Active'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className={`rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm overflow-hidden`}>
                <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🕒 Invoice ที่ลูกค้าสั่งซื้อแล้ว แต่ยังไม่ออก REC</h2>
                  <button onClick={() => onNavigate('invoice-home')} className="text-sm text-blue-500 hover:text-blue-600 font-medium">View All →</button>
                </div>
                {unpaidInvoices.length === 0 ? (
                  <div className={`px-6 py-10 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>ไม่มี invoice ที่ link มาจาก quotation และยังไม่ออก REC</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase`}>
                          <th className="px-6 py-3 text-left">Invoice No</th>
                          <th className="px-6 py-3 text-left">Customer</th>
                          <th className="px-6 py-3 text-left">Issued Date</th>
                          <th className="px-6 py-3 text-right">Selling Price</th>
                          <th className="px-6 py-3 text-right">Cost</th>
                          <th className="px-6 py-3 text-right">Expected Profit</th>
                          <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                        {unpaidInvoices.slice(0, 10).map((inv: any, idx: number) => {
                          const linkedQuotation = quotationByLinkedInvoiceNumber.get(inv.documentNumber) as any;
                          const sellingPrice = Number(linkedQuotation?.totalSellingPrice || 0);
                          const cost = Number(linkedQuotation?.totalCost || 0);
                          const expectedProfit = sellingPrice - cost;
                          return (
                            <tr key={inv.documentId || inv.id || inv.documentNumber || idx} className={`${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                              <td className={`px-6 py-3 font-mono font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{inv.documentNumber || '-'}</td>
                              <td className={`px-6 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{getCustomerDisplayName(inv)}</td>
                              <td className={`px-6 py-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {inv.documentDate ? new Date(inv.documentDate).toLocaleDateString('en-GB') : '-'}
                              </td>
                              <td className={`px-6 py-3 text-right font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                ฿{sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`px-6 py-3 text-right font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                ฿{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`px-6 py-3 text-right font-medium ${expectedProfit >= 0 ? (darkMode ? 'text-emerald-300' : 'text-emerald-700') : (darkMode ? 'text-red-300' : 'text-red-700')}`}>
                                ฿{expectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${darkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
                                  Pending Payment
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
