import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSimulator } from '../context/SimulatorContext';
import { showApiError } from '../utils/apiErrors';
import {
  isBlankFieldValue,
  parseNetDaysFromPaymentTerms,
  PAYMENT_TERMS_PRESETS,
  toAmount,
} from '../utils/formatMoney';
import { tdsAmountFromPercent, tdsPercentFromAmount } from '../utils/accountingHelpers';
import { SUPPLY_MECHANISMS, INDIAN_STATES, isServiceLine, OUT_OF_INDIA_POS, isExportPlaceOfSupply } from '../utils/gstUtils';
import {
  CURRENCY_SELECT_LABELS,
  WORLD_COUNTRIES,
  currencyForCountry,
  formatCurrencyLabel,
  getCurrencySymbol,
  parseCurrencyCode,
} from '../utils/currencyData';

export const MANUAL_SELECT_VALUE = '__manual_entry__';

export function Req({ children }) {
  return (
    <label>
      {children} <span className="field-required" aria-hidden="true">*</span>
    </label>
  );
}

export function Opt({ children }) {
  return (
    <label>
      {children} <span className="field-optional">(Optional)</span>
    </label>
  );
}

/** PDF/print line — omitted when value is empty, NIL, or em dash. */
export function PdfOptionalLine({ label, value, style, valueStyle }) {
  if (isBlankFieldValue(value)) return null;
  return (
    <p style={style}>
      <strong>{label}</strong>{' '}
      <span style={valueStyle}>{value}</span>
    </p>
  );
}

export function Modal({ open, title, onClose, children, width = 520, variant = 'default', className = '', closeOnBackdrop = true, zIndex }) {
  if (!open) return null;
  const overlayClass = `portal-modal-overlay${variant === 'solid' ? ' portal-modal-overlay-solid' : ''}`;
  const cardClass = `portal-modal-card${variant === 'solid' ? ' portal-modal-card-solid' : ''}${className ? ` ${className}` : ''}`;
  return createPortal(
    <div
      className={overlayClass}
      style={zIndex != null ? { zIndex } : undefined}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={cardClass} style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="portal-modal-header">
          <h4>{title}</h4>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="portal-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Dropdown with first option "+ Type manually…" — same control becomes a text field in manual mode.
 */
export function DynamicSelect({
  optionKey,
  value,
  onChange,
  baseOptions = [],
  label,
  required = false,
  className = 'form-input',
  manualPlaceholder = 'Type value manually…',
}) {
  const { getOptionsFor, addCustomOption } = useSimulator();
  const all = getOptionsFor(optionKey, baseOptions);
  const optionsKey = all.join('\u0001');
  const inList = value && all.includes(value);
  const [manualMode, setManualMode] = useState(() => Boolean(value && !inList && value !== MANUAL_SELECT_VALUE));
  const [manualText, setManualText] = useState(() => (value && !inList ? value : ''));

  useEffect(() => {
    const listed = value && all.includes(value);
    if (listed) {
      setManualMode(false);
      setManualText('');
      return;
    }
    if (value && value !== MANUAL_SELECT_VALUE) {
      setManualMode(true);
      setManualText(value);
    }
  }, [value, optionsKey]);

  const commitManual = () => {
    const trimmed = manualText.trim();
    if (!trimmed) return;
    addCustomOption(optionKey, trimmed);
    onChange(trimmed);
    setManualMode(false);
    setManualText('');
  };

  const selectValue = manualMode ? MANUAL_SELECT_VALUE : inList ? value : '';

  return (
    <div className="form-group form-group-spaced">
      {required ? <Req>{label}</Req> : <Opt>{label}</Opt>}
      <div className={`combo-inline-field${manualMode ? ' combo-inline-field--manual' : ''}`}>
        <select
          className={`${className} combo-select-part`}
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === MANUAL_SELECT_VALUE) {
              setManualMode(true);
              setManualText(value && !all.includes(value) ? value : '');
              return;
            }
            setManualMode(false);
            setManualText('');
            onChange(v);
          }}
        >
          <option value="">-- Select --</option>
          <option value={MANUAL_SELECT_VALUE}>+ Type manually…</option>
          {all.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {manualMode && (
          <input
            type="text"
            className={`${className} combo-manual-part`}
            placeholder={manualPlaceholder}
            value={manualText}
            autoFocus
            onChange={(e) => {
              setManualText(e.target.value);
              onChange(e.target.value);
            }}
            onBlur={() => {
              if (manualText.trim()) commitManual();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitManual();
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Payment terms: presets plus manual Net + whole days (0, 7, 30 — no decimals).
 */
export function PaymentTermsSelect({
  value,
  onChange,
  label = 'Default Payment Terms',
  className = 'form-input',
}) {
  const preset = PAYMENT_TERMS_PRESETS.includes(value);
  const parsedDays = parseNetDaysFromPaymentTerms(value);
  const [manualMode, setManualMode] = useState(
    () => parsedDays !== null && !preset
  );
  const [manualDays, setManualDays] = useState(() =>
    parsedDays !== null && !preset ? String(parsedDays) : ''
  );

  useEffect(() => {
    if (PAYMENT_TERMS_PRESETS.includes(value)) {
      setManualMode(false);
      setManualDays('');
      return;
    }
    const days = parseNetDaysFromPaymentTerms(value);
    if (days !== null) {
      setManualMode(true);
      setManualDays(String(days));
    }
  }, [value]);

  const handleManualDaysChange = (raw) => {
    const digits = raw.replace(/\D/g, '');
    setManualDays(digits);
    if (digits === '') return;
    const n = parseInt(digits, 10);
    if (Number.isFinite(n) && n >= 0) onChange(`Net ${n}`);
  };

  const selectValue = manualMode ? MANUAL_SELECT_VALUE : preset ? value : '';

  return (
    <div className="form-group form-group-spaced">
      <label>{label}</label>
      <div className={`combo-inline-field${manualMode ? ' combo-inline-field--manual' : ''}`}>
        <select
          className={`${className} combo-select-part`}
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === MANUAL_SELECT_VALUE) {
              setManualMode(true);
              setManualDays('');
              return;
            }
            setManualMode(false);
            setManualDays('');
            onChange(v);
          }}
        >
          <option value="">-- Select --</option>
          <option value={MANUAL_SELECT_VALUE}>+ Set Net days manually…</option>
          {PAYMENT_TERMS_PRESETS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {manualMode && (
          <>
            <input
              type="text"
              className={`${className} combo-net-prefix`}
              value="Net"
              readOnly
              tabIndex={-1}
              aria-label="Net prefix"
            />
            <input
              type="number"
              min={0}
              step={1}
              className={`${className} combo-manual-part combo-net-days`}
              placeholder="Days (e.g. 0, 7, 30)"
              value={manualDays}
              autoFocus
              onChange={(e) => handleManualDaysChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E') e.preventDefault();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

export function StatePlaceOfSupplySelect({ value, onChange, label = 'Place of Supply State', required = true }) {
  return (
    <DynamicSelect
      optionKey="place_of_supply_states"
      label={label}
      required={required}
      value={value}
      onChange={onChange}
      baseOptions={INDIAN_STATES}
      manualPlaceholder="Enter state / territory manually…"
    />
  );
}

/** Place of supply with Out of India → country picker; optional currency auto-suggest. */
export function PlaceOfSupplyCountrySelect({
  placeOfSupply,
  exportCountry,
  onPlaceChange,
  onExportCountryChange,
  onSuggestCurrency,
  label = 'Place of Supply',
  required = true,
}) {
  const isOut = isExportPlaceOfSupply(placeOfSupply);

  const handlePlaceChange = (next) => {
    onPlaceChange(next);
    if (!isExportPlaceOfSupply(next)) {
      onExportCountryChange?.('');
    }
  };

  const handleCountryChange = (country) => {
    onExportCountryChange?.(country);
    if (country && onSuggestCurrency) {
      onSuggestCurrency(currencyForCountry(country));
    }
  };

  return (
    <>
      <StatePlaceOfSupplySelect value={placeOfSupply} onChange={handlePlaceChange} label={label} required={required} />
      {isOut && (
        <DynamicSelect
          optionKey="export_countries"
          label="Destination country"
          required={required}
          value={exportCountry || ''}
          onChange={handleCountryChange}
          baseOptions={WORLD_COUNTRIES}
          manualPlaceholder="Enter country manually…"
        />
      )}
    </>
  );
}

/** Currency dropdown — stores ISO code; shows "INR (₹)" style labels. */
export function CurrencySelect({
  value,
  onChange,
  label = 'Currency',
  required = false,
  optionKey = 'document_currencies',
}) {
  const code = parseCurrencyCode(value);
  const displayValue = formatCurrencyLabel(code);

  return (
    <DynamicSelect
      optionKey={optionKey}
      label={label}
      required={required}
      value={displayValue}
      onChange={(picked) => onChange(parseCurrencyCode(picked))}
      baseOptions={CURRENCY_SELECT_LABELS}
      manualPlaceholder="Type currency code e.g. INR, USD…"
    />
  );
}

export function InlineCustomerModal({ open, onClose, onCreated }) {
  const { createCustomer, isFinancialYearLocked } = useSimulator();
  const [name, setName] = useState('');
  const [gstType, setGstType] = useState('Registered - Regular');
  const [gstin, setGstin] = useState('');
  const [billingState, setBillingState] = useState('Gujarat');

  const save = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) return alert('Period locked.');
    if (!name.trim()) return alert('Name required.');
    try {
      const c = await createCustomer({
        name: name.trim(),
        gst_type: gstType,
        gstin: gstin || 'NIL',
        billing_address: '',
        billing_city: '',
        billing_state: billingState,
        billing_pincode: '',
        billing_country: 'India',
        shipping_same: true,
      });
      onCreated?.(c);
      onClose();
      setName('');
    } catch (err) {
      showApiError('Creating customer', err);
    }
  };

  return (
    <Modal open={open} title="Quick Add Customer" onClose={onClose}>
      <form onSubmit={save} className="master-form">
        <div className="form-group form-group-spaced">
          <Req>Customer name</Req>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-group form-group-spaced">
          <label>GST type</label>
          <select className="form-input" value={gstType} onChange={(e) => setGstType(e.target.value)}>
            <option>Registered - Regular</option>
            <option>Unregistered</option>
            <option>Consumer</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Save Customer
        </button>
      </form>
    </Modal>
  );
}

export function InlineVendorModal({ open, onClose, onCreated }) {
  const { createVendor, isFinancialYearLocked } = useSimulator();
  const [name, setName] = useState('');

  const save = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) return alert('Period locked.');
    if (!name.trim()) return alert('Name required.');
    try {
      const v = await createVendor({ name: name.trim(), billing_address: '' });
      onCreated?.(v);
      onClose();
      setName('');
    } catch (err) {
      showApiError('Creating vendor', err);
    }
  };

  return (
    <Modal open={open} title="Quick Add Vendor" onClose={onClose}>
      <form onSubmit={save} className="master-form">
        <div className="form-group form-group-spaced">
          <Req>Vendor name</Req>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">
          Save Vendor
        </button>
      </form>
    </Modal>
  );
}

export function InlineInventoryModal({ open, onClose, onCreated }) {
  const { createInventoryItem, isFinancialYearLocked } = useSimulator();
  const [type, setType] = useState('Product');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [code, setCode] = useState('');
  const [unit, setUnit] = useState('Unit Pack');
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [salesPrice, setSalesPrice] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [openingStock, setOpeningStock] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(50);

  const resetForm = () => {
    setType('Product');
    setName('');
    setSku('');
    setCode('');
    setUnit('Unit Pack');
    setPurchasePrice(0);
    setSalesPrice(0);
    setTaxRate(18);
    setOpeningStock(0);
    setLowStockThreshold(50);
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const save = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) return alert('Period locked.');
    if (!name.trim()) return alert('Enter item name.');
    if (!code.trim()) return alert('Enter HSN/SAC classifier code.');
    if (!sku.trim()) return alert('Enter SKU / item code.');
    if (salesPrice < 0 || purchasePrice < 0) return alert('Pricing must be non-negative.');
    try {
      const payload = {
        type,
        name: name.trim(),
        code: code.trim(),
        sku: sku.trim(),
        unit,
        rate: salesPrice,
        purchase_price: purchasePrice,
        sales_price: salesPrice,
        tax_rate: taxRate,
        quantity: type === 'Product' ? openingStock : 0,
        opening_stock: type === 'Product' ? openingStock : 0,
        low_stock_threshold: type === 'Product' ? lowStockThreshold : 0,
      };
      const item = await createInventoryItem(payload);
      onCreated?.(item);
      handleClose();
    } catch (err) {
      showApiError('Creating inventory item', err);
    }
  };

  return (
    <Modal open={open} title="Add Product / Service" onClose={handleClose} width={520} variant="solid" className="portal-modal-compact">
      <form onSubmit={save} className="master-form portal-modal-inline-form">
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
          Saves to Inventory master and appears in line-item dropdowns immediately.
        </p>
        <div className="form-grid-2">
          <div className="form-group form-group-spaced">
            <Req>Classification</Req>
            <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="Product">Product</option>
              <option value="Service">Service</option>
            </select>
          </div>
          <div className="form-group form-group-spaced">
            <Req>Unit of measure</Req>
            <select className="form-input" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option>Unit Pack</option>
              <option>Litre</option>
              <option>kg</option>
              <option>Box</option>
              <option>Hours</option>
              <option>Project Flat</option>
            </select>
          </div>
        </div>
        <div className="form-group form-group-spaced">
          <Req>Item name</Req>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premium Engine Lubricant Oil" />
        </div>
        <div className="form-grid-2">
          <div className="form-group form-group-spaced">
            <Req>SKU code</Req>
            <input className="form-input" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU-LUB-09" />
          </div>
          <div className="form-group form-group-spaced">
            <Req>HSN / SAC</Req>
            <input className="form-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 2710" />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group form-group-spaced">
            <Req>Purchase price (₹)</Req>
            <input type="number" min="0" step="0.01" className="form-input" value={purchasePrice} onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="form-group form-group-spaced">
            <Req>Sales price (₹)</Req>
            <input type="number" min="0" step="0.01" className="form-input" value={salesPrice} onChange={(e) => setSalesPrice(parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group form-group-spaced">
            <Req>GST slab</Req>
            <select className="form-input" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value))}>
              <option value={0}>0%</option>
              <option value={5}>5%</option>
              <option value={18}>18%</option>
              <option value={40}>40%</option>
            </select>
          </div>
          {type === 'Product' ? (
            <div className="form-group form-group-spaced">
              <Req>Opening stock</Req>
              <input type="number" min="0" className="form-input" value={openingStock} onChange={(e) => setOpeningStock(parseInt(e.target.value, 10) || 0)} />
            </div>
          ) : (
            <div className="form-group form-group-spaced">
              <Opt>Low stock threshold</Opt>
              <input type="number" className="form-input" value={0} disabled />
            </div>
          )}
        </div>
        {type === 'Product' && (
          <div className="form-group form-group-spaced">
            <Req>Low stock threshold</Req>
            <input type="number" min="0" className="form-input" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 0)} />
          </div>
        )}
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button type="button" className="btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save to Inventory
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function LineItemTaxRow({ line, index, onChange, onRemove, canRemove, placeOfSupply, companyState, inventory, documentCurrency = 'INR', dense = false }) {
  const handle = (field, value) => onChange(index, field, value);
  const isManual = !line.product_id || line.product_id === '';
  const serviceLine = isServiceLine(line, inventory);

  return (
    <tr className={`line-item-row${dense ? ' line-item-row--dense' : ''}`}>
      <td className="line-item-cell" data-label="Product">
        <div className={`combo-inline-field combo-inline-field--table${isManual ? ' combo-inline-field--manual' : ''}${dense ? ' combo-inline-field--dense' : ''}`}>
          <select
            className="form-input combo-select-part"
            value={isManual ? MANUAL_SELECT_VALUE : String(line.product_id || '')}
            onChange={(e) => {
              const v = e.target.value;
              if (v === MANUAL_SELECT_VALUE) {
                handle('product_id', '');
                if (!line.description) handle('description', '');
                return;
              }
              if (v === '') {
                handle('product_id', '');
                return;
              }
              handle('product_id', v);
            }}
          >
            <option value="">-- Item --</option>
            <option value={MANUAL_SELECT_VALUE}>+ Type manually…</option>
            {inventory.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {isManual && !dense && (
            <input
              className="form-input combo-manual-part"
              placeholder="Type item name…"
              value={line.description || ''}
              onChange={(e) => handle('description', e.target.value)}
            />
          )}
        </div>
      </td>
      <td className="line-item-cell" data-label="Description">
        {dense ? (
          <div className="line-item-desc-dense">
            <input
              className="form-input"
              placeholder="Description *"
              value={line.description}
              onChange={(e) => handle('description', e.target.value)}
            />
            <input
              className="form-input line-item-subfield"
              placeholder="Detail"
              value={line.item_detail || ''}
              onChange={(e) => handle('item_detail', e.target.value)}
              title="Optional detail"
            />
          </div>
        ) : (
          <>
            <input
              className="form-input"
              placeholder="Description *"
              value={line.description}
              onChange={(e) => handle('description', e.target.value)}
            />
            <input
              className="form-input line-item-subfield"
              placeholder="Detail (optional)"
              value={line.item_detail || ''}
              onChange={(e) => handle('item_detail', e.target.value)}
            />
          </>
        )}
      </td>
      <td className="line-item-cell" data-label="HSN/SAC">
        <input className="form-input" placeholder="HSN/SAC" value={line.hsn_sac} onChange={(e) => handle('hsn_sac', e.target.value)} />
      </td>
      <td className="line-item-cell" data-label="Quantity">
        <input
          type="number"
          className="form-input"
          placeholder={serviceLine ? 'Qty (optional)' : 'Qty *'}
          min={serviceLine ? 0 : 0.001}
          step="any"
          value={line.quantity === '' || line.quantity == null ? '' : line.quantity}
          onChange={(e) => handle('quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
        />
      </td>
      <td className="line-item-cell" data-label={`Rate (${documentCurrency})`}>
        <input
          type="number"
          className="form-input"
          placeholder="Rate *"
          value={line.rate}
          onChange={(e) => handle('rate', parseFloat(e.target.value) || 0)}
        />
      </td>
      <td className="line-item-cell" data-label="GST %">
        <input
          type="number"
          className="form-input"
          placeholder="GST %"
          value={line.tax_rate_override}
          onChange={(e) => handle('tax_rate_override', e.target.value)}
        />
      </td>
      <td className="line-item-cell" data-label="Supply">
        <select
          className="form-input"
          value={line.supply_mechanism || 'FCM'}
          onChange={(e) => handle('supply_mechanism', e.target.value)}
        >
          {SUPPLY_MECHANISMS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </td>
      <td className="line-item-cell line-item-tax-preview" data-label="Tax preview">
        <span>C ₹{(line.cgst || 0).toFixed(0)}</span>
        <span>S ₹{(line.sgst || 0).toFixed(0)}</span>
        <span>I ₹{(line.igst || 0).toFixed(0)}</span>
      </td>
      <td className="line-item-cell" data-label="">
        {canRemove && (
          <button type="button" className="btn-secondary-sm" onClick={() => onRemove(index)}>
            ✕
          </button>
        )}
      </td>
    </tr>
  );
}

export function downloadExcelFromCsv(csvContent, sheetName, fileName) {
  const lines = csvContent.split('\n');
  let htmlRows = '';
  lines.forEach((line) => {
    if (!line.trim()) return;
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);
    htmlRows += '<tr>';
    cols.forEach((c) => {
      htmlRows += `<td>${c.replace(/"/g, '')}</td>`;
    });
    htmlRows += '</tr>';
  });

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="UTF-8"></head>
    <body>
    <table border="1">${htmlRows}</table>
    </body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeSheetName(name) {
  return String(name || 'Sheet')
    .replace(/[\\/*?:[\]]/g, ' ')
    .trim()
    .slice(0, 31) || 'Sheet';
}

/** Multi-sheet .xls export via SpreadsheetML (one worksheet per notes section, etc.). */
export function downloadExcelMultiSheet(sheets, fileName) {
  const worksheetXml = sheets.map((sheet) => {
    const rows = sheet.rows || [];
    const rowXml = rows.map((cells) => {
      const cellXml = (cells || []).map((cell) => {
        const raw = String(cell ?? '');
        const type = /^-?\d+(\.\d+)?$/.test(raw.replace(/,/g, '')) ? 'Number' : 'String';
        return `<Cell><Data ss:Type="${type}">${escapeXml(raw)}</Data></Cell>`;
      }).join('');
      return `<Row>${cellXml}</Row>`;
    }).join('');
    return `<Worksheet ss:Name="${escapeXml(sanitizeSheetName(sheet.name))}"><Table>${rowXml}</Table></Worksheet>`;
  }).join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheetXml}
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Numeric input that shows blank instead of 0 to avoid "01000" typing bug. */
export function AmountInput({
  value,
  onChange,
  className = 'form-input',
  step = '0.01',
  min,
  integer = false,
  disabled = false,
  readOnly = false,
  placeholder,
  style,
  noSpinner = false,
}) {
  const displayValue = value === 0 || value === '0' || value === null || value === undefined ? '' : value;

  if (noSpinner) {
    return (
      <input
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
        className={`${className} input-no-spinner`.trim()}
        style={style}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        value={displayValue}
        onChange={(e) => {
          if (readOnly) return;
          const raw = e.target.value;
          if (raw === '') {
            onChange('');
            return;
          }
          if (!integer && !/^\d*\.?\d{0,2}$/.test(raw)) return;
          if (integer && !/^\d*$/.test(raw)) return;
          const parsed = integer ? parseInt(raw, 10) : parseFloat(raw);
          onChange(Number.isNaN(parsed) ? '' : parsed);
        }}
        onFocus={(e) => {
          if (e.target.value === '0' || e.target.value === '0.00') e.target.select();
        }}
      />
    );
  }

  return (
    <input
      type="number"
      className={className}
      step={step}
      min={min}
      style={style}
      placeholder={placeholder}
      disabled={disabled}
      value={displayValue}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') {
          onChange('');
          return;
        }
        const parsed = integer ? parseInt(raw, 10) : parseFloat(raw);
        onChange(Number.isNaN(parsed) ? '' : parsed);
      }}
      onFocus={(e) => {
        if (e.target.value === '0' || e.target.value === '0.00') e.target.select();
      }}
    />
  );
}

/** TDS % and amount — user edits one; the other auto-calculates from taxable base (excl. GST). */
export function TdsPercentAmountFields({
  baseAmount,
  tdsAmount,
  onTdsAmountChange,
  currency = 'INR',
  percentLabel = 'TDS rate',
  amountLabel = 'TDS amount',
  amountPlaceholder,
  showHelper = true,
  disabled = false,
}) {
  const base = toAmount(baseAmount);
  const amt = toAmount(tdsAmount);
  const sym = getCurrencySymbol(currency);
  const [percentFocused, setPercentFocused] = useState(false);
  const [percentText, setPercentText] = useState('');

  const derivedPercent = () => {
    if (base <= 0 || amt <= 0) return '';
    const p = parseFloat(tdsPercentFromAmount(base, amt));
    if (!Number.isFinite(p)) return '';
    return (Math.round(p * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
  };

  const shownPercent = percentFocused ? percentText : derivedPercent();

  const applyPercent = (raw) => {
    if (raw === '' || raw === '.') {
      onTdsAmountChange('');
      return;
    }
    const p = parseFloat(raw);
    if (!Number.isFinite(p) || base <= 0) return;
    const amount = tdsAmountFromPercent(base, p);
    onTdsAmountChange(amount === 0 ? '' : amount);
  };

  return (
    <div className="tds-fields-block">
      <div className="tds-fields-row">
        <div className="form-group tds-percent-group">
          <Opt>{percentLabel}</Opt>
          <div className="input-with-suffix">
            <input
              type="text"
              inputMode="decimal"
              className="form-input input-no-spinner tds-percent-input"
              disabled={disabled || base <= 0}
              placeholder={base > 0 ? 'e.g. 10' : '—'}
              value={shownPercent}
              onFocus={() => {
                setPercentFocused(true);
                setPercentText(derivedPercent());
              }}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw !== '' && !/^\d*\.?\d{0,2}$/.test(raw)) return;
                setPercentText(raw);
              }}
              onBlur={() => {
                applyPercent(percentText);
                setPercentFocused(false);
                setPercentText('');
              }}
            />
            <span className="input-suffix" aria-hidden="true">%</span>
          </div>
        </div>
        <div className="form-group tds-amount-group">
          <Opt>{amountLabel}</Opt>
          <div className="input-with-suffix">
            <AmountInput
              noSpinner
              className="form-input input-no-spinner"
              value={tdsAmount}
              onChange={onTdsAmountChange}
              disabled={disabled}
              placeholder={amountPlaceholder || '0.00'}
            />
            <span className="input-suffix" aria-hidden="true">{sym}</span>
          </div>
        </div>
      </div>
      {showHelper && (
        <p className="form-hint tds-fields-hint">
          TDS is calculated on the taxable amount excluding GST ({sym}
          {base > 0
            ? base.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '—'}{' '}
          base for this line). Enter either % or amount — the other updates when you leave the % field.
        </p>
      )}
    </div>
  );
}

/** Full vs partial settlement against an outstanding bill. */
export function SettlementModeToggle({
  value = 'full',
  onChange,
  fullLabel = 'Full settlement',
  partialLabel = 'Partial',
  ariaLabel = 'Settlement type',
}) {
  return (
    <div className="settlement-mode" role="radiogroup" aria-label={ariaLabel}>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'full'}
        className={`settlement-mode__btn${value === 'full' ? ' is-active' : ''}`}
        onClick={() => onChange?.('full')}
      >
        {fullLabel}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'partial'}
        className={`settlement-mode__btn${value === 'partial' ? ' is-active' : ''}`}
        onClick={() => onChange?.('partial')}
      >
        {partialLabel}
      </button>
    </div>
  );
}

/** Cash + TDS + discount = amount settled against bill (receipt or payment). */
export function SettlementBreakdown({
  currency = 'INR',
  settlementLabel = 'Amount receivable',
  settlement,
  tds,
  discount = 0,
  netCash,
  netLabel = 'Net amount received',
}) {
  const sym = getCurrencySymbol(currency);
  const fmt = (v) =>
    `${sym}${toAmount(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const disc = toAmount(discount);
  return (
    <p className="form-hint tds-fields-hint" style={{ marginTop: 8 }}>
      <strong>{netLabel}:</strong> {fmt(netCash)}
      {disc > 0.009 && <> + TDS {fmt(tds)} + discount {fmt(disc)}</>}
      {disc <= 0.009 && <> + TDS {fmt(tds)}</>}
      {' = '}
      <strong>{settlementLabel}:</strong> {fmt(settlement)}
    </p>
  );
}
