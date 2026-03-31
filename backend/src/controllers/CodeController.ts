import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const parseDate = (value: any) => {
  if (!value) return null;
  return new Date(value);
};

const parseNumber = (value: any) => {
  if (value === '' || value == null) return null;
  return Number(value);
};

const parseInteger = (value: any) => {
  if (value === '' || value == null) return null;
  return Number.parseInt(String(value), 10);
};

const parseString = (value: any) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
};

const mapCustomer = (row: any) => ({
  customerId: row.customerId,
  customerCode: row.customerId || '',
  agentId: '',
  customerName: row.customerName || '',
  shortName: row.branch || '',
  registerDate: row.createdAt,
  registrationNo: '',
  address: row.address || '',
  phone: row.phone || '',
  fax: '',
  email: row.email || '',
  contactPerson: row.contactName || '',
  creditLimit: '',
  idTerm: '',
  internalTerm: '',
  remark: '',
  used: row.used || 'Y',
  totalShare: '',
  gstId: row.taxId || '',
  isGuarantee: '',
  guaranteePrice: '',
  guaranteeDateStart: null,
  guaranteeDateEnd: null,
  year: '',
  runningNo: '',
  updatedAt: row.updatedAt,
});

const mapProduct = (row: any) => ({
  productId: row.productId,
  productName: row.productName || '',
  marking: row.brand || '',
  type: row.category || '',
  bagSize: row.model || '',
  pWeight: '',
  comValue: '',
  description: '',
  idSupplier: '',
  showInStock: 'Y',
  used: 'Y',
  category: row.category || '',
  brand: row.brand || '',
  model: row.model || '',
  price: row.price == null ? 0 : Number(row.price),
  cost: row.cost == null ? 0 : Number(row.cost),
  stockQty: row.stockQty == null ? 0 : Number(row.stockQty),
  minQty: row.minQty == null ? 0 : Number(row.minQty),
  maxQty: row.maxQty == null ? 0 : Number(row.maxQty),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const mapDestination = (row: any) => ({
  destId: row.destId,
  destination: row.destination || '',
  location: row.location || '',
  used: row.used || 'Y',
});

const mapPaymentTerm = (row: any) => ({
  termId: row.termId,
  termName: row.termName || '',
  shortName: row.shortName || '',
  days: row.days || '',
  used: row.used || 'Y',
});

const mapEndUser = (row: any) => ({
  eUserId: row.eUserId,
  eUserName: row.eUserName || '',
  shortName: row.shortName || '',
  used: row.used || 'Y',
});

const listEndUsers = async () => [] as any[];

const createEndUser = async (payload: any) => {
  throw new Error('End User master is not available in the current database schema');
};

const updateEndUser = async (eUserId: string, payload: any) => {
  void eUserId;
  void payload;
  throw new Error('End User master is not available in the current database schema');
};

const deleteEndUser = async (eUserId: string) => {
  void eUserId;
  throw new Error('End User master is not available in the current database schema');
};

const codeConfigs: Record<string, any> = {
  customer: {
    model: prisma.customer,
    idField: 'customerId',
    orderBy: { customerId: 'asc' },
    mapRecord: mapCustomer,
    toData: (payload: any) => ({
      customerId: parseString(payload.customerId || payload.companyId),
      customerName: parseString(payload.customerName || payload.name) || 'Unnamed Customer',
      contactName: parseString(payload.contactPerson || payload.contactName),
      phone: parseString(payload.phone),
      email: parseString(payload.email),
      address: parseString(payload.address),
      taxId: parseString(payload.gstId || payload.taxId),
      branch: parseString(payload.shortName || payload.branch),
      createdAt: parseDate(payload.registerDate),
      used: parseString(payload.used) || 'Y',
    }),
  },
  product: {
    model: prisma.product,
    idField: 'productId',
    orderBy: { productId: 'asc' },
    mapRecord: mapProduct,
    toData: (payload: any) => ({
      productId: parseString(payload.productId),
      productName: parseString(payload.productName),
      category: parseString(payload.category || payload.type) || 'General',
      brand: parseString(payload.brand || payload.marking) || 'General',
      model: parseString(payload.model || payload.bagSize),
      price: parseNumber(payload.price) ?? 0,
      cost: parseNumber(payload.cost),
      stockQty: parseInteger(payload.stockQty) ?? 0,
      minQty: parseInteger(payload.minQty) ?? 0,
      maxQty: parseInteger(payload.maxQty) ?? 0,
    }),
  },
  destination: {
    model: prisma.destination,
    idField: 'destId',
    orderBy: { destId: 'asc' },
    mapRecord: mapDestination,
    toData: (payload: any) => ({
      destId: parseString(payload.destId),
      destination: parseString(payload.destination),
      location: parseString(payload.location),
      used: parseString(payload.used) || 'Y',
    }),
  },
  'payment-term': {
    model: prisma.paymentTerm,
    idField: 'termId',
    orderBy: { termId: 'asc' },
    mapRecord: mapPaymentTerm,
    toData: (payload: any) => ({
      termId: parseString(payload.termId),
      termName: parseString(payload.termName),
      shortName: parseString(payload.shortName),
      days: parseString(payload.days),
      used: parseString(payload.used) || 'Y',
    }),
  },
};

const getConfig = (type: string) => codeConfigs[type];

class CodeController {
  static async getAll(req: Request, res: Response) {
    try {
      if (req.params.type === 'end-user') {
        const rows = await listEndUsers();
        return res.json({ success: true, data: rows.map(mapEndUser) });
      }

      const config = getConfig(req.params.type);
      if (!config) {
        return res.status(400).json({ success: false, message: 'Invalid code type' });
      }

      const rows = await config.model.findMany({ orderBy: config.orderBy });
      res.json({ success: true, data: rows.map(config.mapRecord) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      if (req.params.type === 'end-user') {
        const created = await createEndUser(req.body);
        return res.json({ success: true, data: created ? mapEndUser(created) : null });
      }

      const config = getConfig(req.params.type);
      if (!config) {
        return res.status(400).json({ success: false, message: 'Invalid code type' });
      }

      const data = config.toData(req.body);
      const idValue = data[config.idField];
      if (!idValue) {
        return res.status(400).json({ success: false, message: `${config.idField} is required` });
      }

      const created = await config.model.create({ data });
      res.json({ success: true, data: config.mapRecord(created) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      if (req.params.type === 'end-user') {
        const updated = await updateEndUser(req.params.id, req.body);
        return res.json({ success: true, data: updated ? mapEndUser(updated) : null });
      }

      const config = getConfig(req.params.type);
      if (!config) {
        return res.status(400).json({ success: false, message: 'Invalid code type' });
      }

      const data = config.toData({ ...req.body, [config.idField]: req.params.id });
      const updated = await config.model.update({
        where: { [config.idField]: req.params.id },
        data,
      });

      res.json({ success: true, data: config.mapRecord(updated) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      if (req.params.type === 'end-user') {
        await deleteEndUser(req.params.id);
        return res.json({ success: true, message: 'Code deleted' });
      }

      const config = getConfig(req.params.type);
      if (!config) {
        return res.status(400).json({ success: false, message: 'Invalid code type' });
      }

      await config.model.delete({ where: { [config.idField]: req.params.id } });
      res.json({ success: true, message: 'Code deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default CodeController;