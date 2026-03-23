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
  agentId: row.agentId || '',
  customerName: row.customerName || '',
  shortName: row.shortName || '',
  registerDate: row.registerDate,
  registrationNo: row.registrationNo || '',
  address: row.address || '',
  phone: row.phone || '',
  fax: row.fax || '',
  email: row.email || '',
  contactPerson: row.contactPerson || '',
  creditLimit: row.creditLimit == null ? '' : String(row.creditLimit),
  idTerm: row.idTerm || '',
  internalTerm: row.internalTerm == null ? '' : String(row.internalTerm),
  remark: row.remark || '',
  used: row.used || 'Y',
  totalShare: row.totalShare == null ? '' : String(row.totalShare),
  gstId: row.gstId || '',
  isGuarantee: row.isGuaratee == null ? '' : String(row.isGuaratee),
  guaranteePrice: row.guarateePrice == null ? '' : String(row.guarateePrice),
  guaranteeDateStart: row.guarateeDateStart,
  guaranteeDateEnd: row.guarateeDateEnd,
});

const mapProduct = (row: any) => ({
  productId: row.productId,
  productName: row.productName || '',
  marking: row.marking || '',
  type: row.type || '',
  bagSize: row.bagSize || '',
  pWeight: row.pWeight == null ? '' : String(row.pWeight),
  comValue: row.comValue || '',
  description: row.description || '',
  idSupplier: row.idSupplier || '',
  showInStock: row.showInStock || 'Y',
  used: row.used || 'Y',
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

const codeConfigs: Record<string, any> = {
  customer: {
    model: prisma.customer,
    idField: 'customerId',
    orderBy: { customerId: 'asc' },
    mapRecord: mapCustomer,
    toData: (payload: any) => ({
      customerId: parseString(payload.customerId),
      agentId: parseString(payload.agentId),
      customerName: parseString(payload.customerName),
      shortName: parseString(payload.shortName),
      registerDate: parseDate(payload.registerDate),
      registrationNo: parseString(payload.registrationNo),
      address: parseString(payload.address),
      phone: parseString(payload.phone),
      fax: parseString(payload.fax),
      email: parseString(payload.email),
      contactPerson: parseString(payload.contactPerson),
      creditLimit: parseNumber(payload.creditLimit),
      idTerm: parseString(payload.idTerm),
      internalTerm: parseInteger(payload.internalTerm),
      remark: parseString(payload.remark),
      used: parseString(payload.used) || 'Y',
      totalShare: parseNumber(payload.totalShare),
      gstId: parseString(payload.gstId),
      isGuaratee: parseInteger(payload.isGuarantee),
      guarateePrice: parseNumber(payload.guaranteePrice),
      guarateeDateStart: parseDate(payload.guaranteeDateStart),
      guarateeDateEnd: parseDate(payload.guaranteeDateEnd),
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
      marking: parseString(payload.marking),
      type: parseString(payload.type),
      bagSize: parseString(payload.bagSize),
      pWeight: parseNumber(payload.pWeight),
      comValue: parseString(payload.comValue),
      description: parseString(payload.description),
      idSupplier: parseString(payload.idSupplier),
      showInStock: parseString(payload.showInStock) || 'Y',
      used: parseString(payload.used) || 'Y',
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