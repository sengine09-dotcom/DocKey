import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../lib/prisma';
import { resolveCompanyContext } from '../lib/companyContext';


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
  customerCode: row.customerCode || '',
  customerName: row.customerName || '',
  shortName: row.branch || '',
  address: row.address || '',
  phone: row.phone || '',
  fax: row.fax || '',
  email: row.email || '',
  contactPerson: row.contactName || '',
  idTerm: row.idTerm || '',
  gstId: row.taxId || '',
  used: row.used || 'Y',
  updatedAt: row.updatedAt,
});

const mapProduct = (row: any) => ({
  productCode: row.productCode || '',
  productName: row.productName || '',
  marking: row.brand || '',
  type: row.category || '',
  bagSize: row.model || '',
  pWeight: '',
  comValue: '',
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
  destId: row.destinationCode,
  destination: row.destination || '',
  location: row.location || '',
  used: row.used || 'Y',
});

const mapPaymentTerm = (row: any) => ({
  termId: row.termCode,
  termName: row.termName || '',
  shortName: row.shortName || '',
  days: row.days || '',
  used: row.used || 'Y',
});

const mapVendor = (row: any) => ({
  vendorCode: row.vendorCode || '',
  name: row.name || '',
  contactName: row.contactName || '',
  phone: row.phone || '',
  email: row.email || '',
  address: row.address || '',
  taxId: row.taxId || '',
  paymentType: row.paymentType || 'CASH',
  paymentTerm: row.paymentTerm == null ? 0 : Number(row.paymentTerm),
  bankName: row.bankName || '',
  bankAccount: row.bankAccount || '',
  accountName: row.accountName || '',
  isActive: row.isActive !== false,
  note: row.note || '',
});

const mapCompany = (row: any) => ({
  id: row.id || '',
  companyCode: row.companyCode || '',
  name: row.name || '',
  nameEn: row.nameEn || '',
  taxId: row.taxId || '',
  branch: row.branch || '',
  address: row.address || '',
  phone: row.phone || '',
  email: row.email || '',
  website: row.website || '',
  logoUrl: row.logoUrl || '',
  signatureUrl: row.signatureUrl || '',
  bankName: row.bankName || '',
  bankAccount: row.bankAccount || '',
  accountName: row.accountName || '',
  isActive: row.isActive !== false,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const mapEndUser = (row: any) => ({
  eUserId: row.eUserId,
  eUserName: row.eUserName || '',
  shortName: row.shortName || '',
  used: row.used || 'Y',
});

const listEndUsers = async () => [] as any[];

const createEndUser = async (_payload: any) => {
  throw new Error('End User master is not available in the current database schema');
};

const updateEndUser = async (_eUserId: string, _payload: any) => {
  throw new Error('End User master is not available in the current database schema');
};

const deleteEndUser = async (_eUserId: string) => {
  throw new Error('End User master is not available in the current database schema');
};

// Types that are scoped per company
const COMPANY_SCOPED_TYPES = new Set(['customer', 'product', 'vendor', 'destination', 'payment-term']);

const codeConfigs: Record<string, any> = {
  customer: {
    model: prisma.customer,
    idField: 'customerCode',
    orderBy: { customerCode: 'asc' },
    mapRecord: mapCustomer,
    toData: (payload: any) => ({
      customerCode: parseString(payload.customerCode),
      customerName: parseString(payload.customerName) || 'Unnamed Customer',
      contactName: parseString(payload.contactPerson || payload.contactName),
      phone: parseString(payload.phone),
      email: parseString(payload.email),
      address: parseString(payload.address),
      taxId: parseString(payload.gstId || payload.taxId),
      branch: parseString(payload.shortName || payload.branch),
      fax: parseString(payload.fax),
      idTerm: parseString(payload.idTerm),
      used: parseString(payload.used) || 'Y',
    }),
  },
  product: {
    model: prisma.product,
    idField: 'productCode',
    orderBy: { productCode: 'asc' },
    mapRecord: mapProduct,
    toData: (payload: any) => ({
      productCode: parseString(payload.productCode),
      productName: parseString(payload.productName),
      category: parseString(payload.category) || 'General',
      brand: parseString(payload.brand) || 'General',
      model: parseString(payload.model),
      price: parseNumber(payload.price) ?? 0,
      cost: parseNumber(payload.cost),
      stockQty: parseInteger(payload.stockQty) ?? 0,
      minQty: parseInteger(payload.minQty) ?? 0,
      maxQty: parseInteger(payload.maxQty) ?? 0,
    }),
  },
  destination: {
    model: prisma.destination,
    idField: 'destinationCode',
    orderBy: { destinationCode: 'asc' },
    mapRecord: mapDestination,
    toData: (payload: any) => ({
      destinationCode: parseString(payload.destinationCode || payload.destId),
      destination: parseString(payload.destination),
      location: parseString(payload.location),
      used: parseString(payload.used) || 'Y',
    }),
  },
  'payment-term': {
    model: prisma.paymentTerm,
    idField: 'termCode',
    orderBy: { termCode: 'asc' },
    mapRecord: mapPaymentTerm,
    toData: (payload: any) => ({
      termCode: parseString(payload.termCode || payload.termId),
      termName: parseString(payload.termName),
      shortName: parseString(payload.shortName),
      days: parseString(payload.days),
      used: parseString(payload.used) || 'Y',
    }),
  },
  vendor: {
    model: prisma.vendor,
    idField: 'vendorCode',
    orderBy: { vendorCode: 'asc' },
    mapRecord: mapVendor,
    toData: (payload: any) => ({
      id: parseString(payload.id) || ulid(),
      vendorCode: parseString(payload.vendorCode),
      name: parseString(payload.name) || 'Unnamed Vendor',
      contactName: parseString(payload.contactName),
      phone: parseString(payload.phone),
      email: parseString(payload.email),
      address: parseString(payload.address),
      taxId: parseString(payload.taxId),
      paymentType: parseString(payload.paymentType) || 'CASH',
      paymentTerm: parseInteger(payload.paymentTerm) ?? 0,
      bankName: parseString(payload.bankName),
      bankAccount: parseString(payload.bankAccount),
      accountName: parseString(payload.accountName),
      isActive: payload.isActive == null ? true : String(payload.isActive).trim().toLowerCase() !== 'false',
      note: parseString(payload.note),
    }),
  },
  company: {
    model: prisma.company,
    idField: 'companyCode',
    orderBy: { companyCode: 'asc' },
    mapRecord: mapCompany,
    toData: (payload: any) => ({
      companyCode: parseString(payload.companyCode) || ulid(),
      name: parseString(payload.name) || 'Unnamed Company',
      nameEn: parseString(payload.nameEn),
      taxId: parseString(payload.taxId),
      branch: parseString(payload.branch),
      address: parseString(payload.address),
      phone: parseString(payload.phone),
      email: parseString(payload.email),
      website: parseString(payload.website),
      logoUrl: parseString(payload.logoUrl),
      signatureUrl: parseString(payload.signatureUrl),
      bankName: parseString(payload.bankName),
      bankAccount: parseString(payload.bankAccount),
      accountName: parseString(payload.accountName),
      isActive: payload.isActive == null ? true : String(payload.isActive).trim().toLowerCase() !== 'false',
    }),
  },
};

const getConfig = (type: string) => codeConfigs[type];

const isMissingCompanyTableError = (error: any) => {
  const message = String(error?.message || '');
  return message.includes('The table `Company` does not exist in the current database');
};

// Returns a user-friendly message for known Prisma errors, or null for unknown ones
const prismaErrorMessage = (error: any): string | null => {
  const code = error?.code;
  if (code === 'P2002') {
    // Unique constraint violation
    return 'A record with this code already exists. Please use a different code.';
  }
  if (code === 'P2025') {
    // Record not found (update/delete on non-existent row)
    return 'Record not found.';
  }
  return null;
};

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

      let where: any = {};
      if (COMPANY_SCOPED_TYPES.has(req.params.type)) {
        const ctx = await resolveCompanyContext(req);
        if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });
        where = { companyId: ctx.companyId };
      }

      const rows = await config.model.findMany({ where, orderBy: config.orderBy });
      res.json({ success: true, data: rows.map(config.mapRecord) });
    } catch (error: any) {
      if (req.params.type === 'company' && isMissingCompanyTableError(error)) {
        return res.json({ success: true, data: [] });
      }
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

      let extraData: any = {};
      if (COMPANY_SCOPED_TYPES.has(req.params.type)) {
        const ctx = await resolveCompanyContext(req);
        if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });
        extraData = { company: { connect: { id: ctx.companyId } } };
      }

      const data = { id: ulid(), ...config.toData(req.body), ...extraData };
      const idValue = data[config.idField];
      if (!idValue && req.params.type !== 'company') {
        return res.status(400).json({ success: false, message: `${config.idField} is required` });
      }

      const created = await config.model.create({ data });
      res.json({ success: true, data: config.mapRecord(created) });
    } catch (error: any) {
      if (req.params.type === 'company' && isMissingCompanyTableError(error)) {
        return res.status(503).json({
          success: false,
          message: 'Company table is not initialized yet. Please run Prisma migration before saving Company Info.',
        });
      }
      const knownMessage = prismaErrorMessage(error);
      if (knownMessage) {
        return res.status(400).json({ success: false, message: knownMessage });
      }
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

      if (COMPANY_SCOPED_TYPES.has(req.params.type)) {
        const ctx = await resolveCompanyContext(req);
        if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

        // Find the record by companyId + business code to get its actual id (PK)
        const existing = await config.model.findFirst({
          where: { companyId: ctx.companyId, [config.idField]: req.params.id },
          select: { id: true },
        });
        if (!existing) {
          return res.status(404).json({ success: false, message: 'Record not found' });
        }

        const data = config.toData({ ...req.body, [config.idField]: req.params.id });
        const updated = await config.model.update({ where: { id: existing.id }, data });
        return res.json({ success: true, data: config.mapRecord(updated) });
      }

      // Non-scoped types (company): update by idField directly
      const data = config.toData({ ...req.body, [config.idField]: req.params.id });
      const updated = await config.model.update({
        where: { [config.idField]: req.params.id },
        data,
      });
      res.json({ success: true, data: config.mapRecord(updated) });
    } catch (error: any) {
      if (req.params.type === 'company' && isMissingCompanyTableError(error)) {
        return res.status(503).json({
          success: false,
          message: 'Company table is not initialized yet. Please run Prisma migration before updating Company Info.',
        });
      }
      const knownMessage = prismaErrorMessage(error);
      if (knownMessage) {
        return res.status(400).json({ success: false, message: knownMessage });
      }
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

      if (COMPANY_SCOPED_TYPES.has(req.params.type)) {
        const ctx = await resolveCompanyContext(req);
        if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });

        // Find the record by companyId + business code to get its actual id (PK)
        const existing = await config.model.findFirst({
          where: { companyId: ctx.companyId, [config.idField]: req.params.id },
          select: { id: true },
        });
        if (!existing) {
          return res.status(404).json({ success: false, message: 'Record not found' });
        }

        await config.model.delete({ where: { id: existing.id } });
        return res.json({ success: true, message: 'Code deleted' });
      }

      // Non-scoped types (company): delete by idField directly
      await config.model.delete({ where: { [config.idField]: req.params.id } });
      res.json({ success: true, message: 'Code deleted' });
    } catch (error: any) {
      if (req.params.type === 'company' && isMissingCompanyTableError(error)) {
        return res.status(503).json({
          success: false,
          message: 'Company table is not initialized yet. Please run Prisma migration before deleting Company Info.',
        });
      }
      const knownMessage = prismaErrorMessage(error);
      if (knownMessage) {
        return res.status(400).json({ success: false, message: knownMessage });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default CodeController;
