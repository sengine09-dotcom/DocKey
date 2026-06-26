import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import documentService from '../services/documentService';
import dashboardService from '../services/dashboardService';
import codeService from '../services/codeService';
import useThemePreference from '../hooks/useThemePreference';
import { getQuotationStatusStyle } from './documents/documentShared';

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
    receipts: 0,
    purchaseOrders: 0
  };
  
  const documentsData = dashboardData?.documents || {
    quotations: [],
    invoices: [],
    receipts: [],
    purchaseOrders: []
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

  const purchaseOrderByQuotationNumber = new Map(
    documentsData.purchaseOrders
      .filter((purchaseOrder: any) => String(purchaseOrder.referenceNo || '').trim())
      .map((purchaseOrder: any) => [String(purchaseOrder.referenceNo || '').trim(), purchaseOrder])
  ) as Map<string, any>;

  const getPurchaseOrderCostForQuotation = (quotation: any) => {
    const quotationNumber = String(quotation?.documentNumber || '').trim();
    if (!quotationNumber) return 0;
    const purchaseOrder = purchaseOrderByQuotationNumber.get(quotationNumber);
    return Number(purchaseOrder?.totalCost || 0);
  };

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
    totalCost: documentsData.purchaseOrders.reduce((sum: number, purchaseOrder: any) => sum + Number(purchaseOrder.totalCost || 0), 0),
    netProfit: paidQuotations.reduce(
      (sum: number, quotation: any) => sum + (Number(quotation.totalSellingPrice || 0) - getPurchaseOrderCostForQuotation(quotation)),
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
                    title="ต้นทุน" 
                    value={`฿${derivedBusinessMetrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    icon="💸"
                    bgClass={darkMode ? 'bg-red-900/40' : 'bg-red-100'}
                    textClass={darkMode ? 'text-red-300' : 'text-red-700'} />
                  <StatCard 
                    title="ยอดขาย" 
                    value={`฿${derivedBusinessMetrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    icon="💵"
                    bgClass={darkMode ? 'bg-green-900/40' : 'bg-green-100'}
                    textClass={darkMode ? 'text-green-300' : 'text-green-700'} />                  
                  <StatCard 
                    title="กำไร / ขาดทุน" 
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

            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
