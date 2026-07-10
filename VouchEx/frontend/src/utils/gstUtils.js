/** CBIC-aligned tax bifurcation helpers (FCM / RCM / ECO) */

export const SUPPLY_MECHANISMS = ['FCM', 'RCM', 'ECO'];
export const OUT_OF_INDIA_POS = 'Out of India';

/** GST export treatment when place of supply is Out of India (Section 16 IGST Act). */
export const EXPORT_TREATMENT_OPTIONS = [
  {
    value: 'export_lut_bond',
    label: 'Export under LUT / Bond (without payment of IGST — zero rated)',
    zeroRated: true,
  },
  {
    value: 'export_merchant_bond',
    label: 'Merchant exporter under bond (IGST deferred — zero rated on invoice)',
    zeroRated: true,
  },
  {
    value: 'export_igst_paid',
    label: 'Export with payment of IGST (refund claim eligible)',
    zeroRated: false,
  },
  {
    value: 'export_sez_lut',
    label: 'Supply to SEZ under LUT (without payment of IGST)',
    zeroRated: true,
  },
  {
    value: 'export_sez_igst',
    label: 'Supply to SEZ with payment of IGST',
    zeroRated: false,
  },
];

export function exportTreatmentLabel(value) {
  return EXPORT_TREATMENT_OPTIONS.find((o) => o.value === value)?.label || value || '';
}

export function isExportZeroRated(exportTreatment) {
  if (!exportTreatment) return false;
  const opt = EXPORT_TREATMENT_OPTIONS.find((o) => o.value === exportTreatment);
  return opt?.zeroRated ?? false;
}

export const INDIAN_STATES = [
  OUT_OF_INDIA_POS,
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh',
  'Puducherry',
];

/** GST state name → 2-digit code (GSTN master). */
export const GST_STATE_CODES = {
  'Jammu and Kashmir': '01',
  'Himachal Pradesh': '02',
  Punjab: '03',
  Chandigarh: '04',
  Uttarakhand: '05',
  Haryana: '06',
  Delhi: '07',
  Rajasthan: '08',
  'Uttar Pradesh': '09',
  Bihar: '10',
  Sikkim: '11',
  'Arunachal Pradesh': '12',
  Nagaland: '13',
  Manipur: '14',
  Mizoram: '15',
  Tripura: '16',
  Meghalaya: '17',
  Assam: '18',
  'West Bengal': '19',
  Jharkhand: '20',
  Odisha: '21',
  Chhattisgarh: '22',
  'Madhya Pradesh': '23',
  Gujarat: '24',
  Maharashtra: '27',
  Karnataka: '29',
  Goa: '30',
  Kerala: '32',
  'Tamil Nadu': '33',
  Puducherry: '34',
  Telangana: '36',
  'Andhra Pradesh': '37',
  Ladakh: '38',
  Overseas: '96',
};

const GST_CODE_TO_STATE = Object.fromEntries(
  Object.entries(GST_STATE_CODES).map(([name, code]) => [code, name])
);

const STATE_ALIASES = {
  'jammu & kashmir': 'Jammu and Kashmir',
  'jammu and kashmir': 'Jammu and Kashmir',
  pondicherry: 'Puducherry',
  orissa: 'Odisha',
  uttaranchal: 'Uttarakhand',
  'dadra and nagar haveli and daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
};

function canonicalStateName(name) {
  if (!name) return '';
  const lower = String(name).trim().toLowerCase();
  if (!lower) return '';
  if (lower === 'overseas') return 'Overseas';
  if (STATE_ALIASES[lower]) return STATE_ALIASES[lower];
  for (const s of INDIAN_STATES) {
    if (s.toLowerCase() === lower) return s;
  }
  return String(name).trim();
}

/** Normalize place-of-supply / registered-state strings for comparison. */
export function normalizeIndianState(value) {
  if (value == null || value === '') return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';

  const prefixed = trimmed.match(/^(\d{2})\s*[-–]\s*(.+)$/);
  if (prefixed) {
    const fromCode = GST_CODE_TO_STATE[prefixed[1]];
    if (fromCode) return fromCode;
    return canonicalStateName(prefixed[2]) || prefixed[2].trim();
  }

  if (/^\d{2}$/.test(trimmed)) {
    return GST_CODE_TO_STATE[trimmed] || trimmed;
  }

  return canonicalStateName(trimmed);
}

/** Company registered state from settings, falling back to GSTIN prefix. */
export function resolveRegisteredState(company) {
  if (!company) return '';
  const fromField = normalizeIndianState(company.state);
  if (fromField) return fromField;

  const gstin = String(company.gstin || '').trim().toUpperCase();
  if (gstin.length >= 2 && /^\d{2}/.test(gstin)) {
    const code = gstin.slice(0, 2);
    return GST_CODE_TO_STATE[code] || '';
  }
  return '';
}

export function isGstRegisteredType(gstType) {
  if (!gstType) return false;
  const t = gstType.toLowerCase();
  return t.includes('registered') && !t.includes('unregistered');
}

export function isExportPlaceOfSupply(placeOfSupply) {
  const pos = normalizeIndianState(placeOfSupply);
  return pos === 'Overseas' || pos === OUT_OF_INDIA_POS;
}

export function isIntraState(placeOfSupply, companyState) {
  if (isExportPlaceOfSupply(placeOfSupply)) return false;
  const pos = normalizeIndianState(placeOfSupply);
  const reg = normalizeIndianState(companyState);
  if (!pos || !reg) return false;
  return pos.toLowerCase() === reg.toLowerCase();
}

export function inventoryProduct(inventory, productId) {
  if (productId == null || productId === '') return null;
  return (inventory || []).find((p) => Number(p.id) === Number(productId)) ?? null;
}

/** Line tied to a Service item in inventory (or marked item_type). */
export function isServiceLine(line, inventory) {
  if (line?.item_type === 'Service') return true;
  const p = inventoryProduct(inventory, line?.product_id);
  return p?.type === 'Service';
}

/** Whether quantity should appear on invoice PDF / counts as entered. */
export function lineHasDisplayQuantity(line, inventory) {
  const q = parseFloat(line?.quantity);
  const hasQty = Number.isFinite(q) && q > 0;
  if (isServiceLine(line, inventory)) return hasQty;
  return hasQty;
}

export function invoicePdfShowsQtyColumn(pdfLineItems, inventory) {
  return (pdfLineItems || []).some((item) =>
    lineHasDisplayQuantity({ product_id: item.product_id, quantity: item.quantity, item_type: item.item_type }, inventory)
  );
}

export function calcLineTaxBase(line, inventory) {
  const rate = parseFloat(line.rate) || 0;
  const isService = isServiceLine(line, inventory);
  const qtyRaw = line.quantity;
  const hasQty = qtyRaw !== '' && qtyRaw != null && parseFloat(qtyRaw) > 0;
  if (isService && !hasQty) return rate;
  const qty = hasQty ? parseFloat(qtyRaw) : 1;
  return qty * rate;
}

export function calcLineTax(line, placeOfSupply, companyState, inventory, exportTreatment) {
  const taxable = calcLineTaxBase(line, inventory);
  const pct = parseFloat(line.tax_rate_override ?? line.tax_rate ?? 0) || 0;

  if (isExportPlaceOfSupply(placeOfSupply) && isExportZeroRated(exportTreatment)) {
    return {
      taxable,
      tax_rate: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total_tax: 0,
      supply_mechanism: line.supply_mechanism || 'FCM',
    };
  }

  const totalTax = (taxable * pct) / 100;
  const intra = isIntraState(placeOfSupply, companyState);
  const cgst = intra ? totalTax / 2 : 0;
  const sgst = intra ? totalTax / 2 : 0;
  const igst = intra ? 0 : totalTax;
  return {
    taxable,
    tax_rate: pct,
    cgst,
    sgst,
    igst,
    total_tax: totalTax,
    supply_mechanism: line.supply_mechanism || 'FCM',
  };
}

export function aggregateLinesTax(lines, discount, placeOfSupply, companyState, inventory, exportTreatment) {
  const subtotal = lines.reduce((s, l) => s + calcLineTaxBase(l, inventory), 0);
  const postDiscount = Math.max(0, subtotal - parseFloat(discount || 0));
  const ratio = subtotal > 0 ? postDiscount / subtotal : 1;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let auditTax = 0;
  let payableTax = 0;

  lines.forEach((line) => {
    const t = calcLineTax(line, placeOfSupply, companyState, inventory, exportTreatment);
    const scaledCgst = t.cgst * ratio;
    const scaledSgst = t.sgst * ratio;
    const scaledIgst = t.igst * ratio;
    const scaledTotal = t.total_tax * ratio;
    cgst += scaledCgst;
    sgst += scaledSgst;
    igst += scaledIgst;
    auditTax += scaledTotal;
    if ((line.supply_mechanism || 'FCM') !== 'RCM') {
      payableTax += scaledTotal;
    }
  });

  const totalAmount = postDiscount + payableTax;

  return {
    subtotal,
    postDiscount,
    cgst,
    sgst,
    igst,
    tax_amount: auditTax,
    payable_tax: payableTax,
    total_amount: totalAmount,
  };
}

export function formatItemDisplay(name, detail) {
  const n = name || '';
  const d = (detail || '').trim();
  if (!d || d === n) return n;
  return `${n} (${d})`;
}

export function emptyLineItem() {
  return {
    product_id: '',
    description: '',
    item_detail: '',
    quantity: 1,
    rate: 0,
    line_total: 0,
    hsn_sac: '',
    tax_rate_override: '',
    supply_mechanism: 'FCM',
    cgst: 0,
    sgst: 0,
    igst: 0,
  };
}

export function enrichLineFromProduct(line, product, companyState, placeOfSupply, inventory, exportTreatment) {
  if (!product) return line;
  const isService = product.type === 'Service';
  const next = {
    ...line,
    item_type: product.type || 'Product',
    description: product.name,
    rate: product.sales_price ?? product.rate ?? line.rate,
    hsn_sac: product.code || line.hsn_sac,
    tax_rate_override: product.tax_rate ?? line.tax_rate_override,
    supply_mechanism: product.supply_mechanism || line.supply_mechanism || 'FCM',
    quantity: isService ? '' : (line.quantity || 1),
  };
  const t = calcLineTax(next, placeOfSupply, companyState, inventory, exportTreatment);
  return { ...next, ...t, line_total: t.taxable };
}

/** Split header tax_amount into CGST/SGST or IGST from place of supply vs registered state. */
export function bifurcateStoredTax(record, placeOfSupply, companyState) {
  const tax = parseFloat(record?.tax_amount || 0);
  const pos = normalizeIndianState(placeOfSupply || record?.place_of_supply);
  const reg = normalizeIndianState(companyState);
  if (isIntraState(pos, reg)) {
    return { cgst: tax / 2, sgst: tax / 2, igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: tax };
}

/** Prefer stored CGST/SGST/IGST on saved documents; fall back to bifurcation. */
export function invoiceStoredTax(record, placeOfSupply, companyState) {
  const cgst = parseFloat(record?.cgst ?? 0) || 0;
  const sgst = parseFloat(record?.sgst ?? 0) || 0;
  const igst = parseFloat(record?.igst ?? 0) || 0;
  if (cgst || sgst || igst) return { cgst, sgst, igst };
  return bifurcateStoredTax(record, placeOfSupply, companyState);
}
