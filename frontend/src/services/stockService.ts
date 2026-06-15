import axios from 'axios';

const BASE = '/api/stock';

export type StockMoveType = 'IN' | 'OUT' | 'INIT';

export interface StockSummaryItem {
  id: string;
  productCode: string;
  productName: string;
  category: string;
  brand: string;
  stockQty: number;
  minQty: number;
  maxQty: number;
}

export interface StockTransaction {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  companyId: string;
  docNumber: string;
  docType: string;
  docId: string | null;
  type: StockMoveType;
  qtyChange: number;
  createdBy: string | null;
  createdAt: string;
}

const stockService = {
  getSummary: () => axios.get<{ success: boolean; data: StockSummaryItem[] }>(`${BASE}/summary`),
  getTransactions: (params?: { productCode?: string; docType?: string; limit?: number }) =>
    axios.get<{ success: boolean; data: StockTransaction[] }>(`${BASE}/transactions`, { params }),
};

export default stockService;
