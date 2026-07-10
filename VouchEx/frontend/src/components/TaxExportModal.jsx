import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Modal } from './portalShared';
import { exportGstr1OfflineWorkbook } from '../utils/taxExport/gstr1OfflineExport';
import { exportGstr1OfflineJson } from '../utils/taxExport/gstr1JsonExport';
import { exportTallySalesWorkbook } from '../utils/taxExport/tallySalesExport';
import { exportTallyXml } from '../utils/taxExport/tallyXmlExport';

export function TaxExportModal({
  open,
  onClose,
  reportType,
  onLegacyExcel,
  exportData,
  initialForTally = false,
  initialTallyFormat = 'xlsx',
  forceGstr1Workbook = false,
  initialGstrFormat = 'xlsx',
}) {
  const [forTally, setForTally] = useState(initialForTally);
  const [tallyFormat, setTallyFormat] = useState(initialTallyFormat);
  const [gstrFormat, setGstrFormat] = useState(initialGstrFormat);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForTally(initialForTally);
      setTallyFormat(initialTallyFormat);
      setGstrFormat(initialGstrFormat);
      setError('');
    }
  }, [open, initialForTally, initialTallyFormat, initialGstrFormat]);

  const isGstr1Export = !forTally && (reportType === 'gstr1' || forceGstr1Workbook);

  const runExport = async () => {
    setError('');
    setBusy(true);
    try {
      if (forTally) {
        if (tallyFormat === 'xml') {
          exportTallyXml(exportData);
        } else {
          await exportTallySalesWorkbook(exportData);
        }
      } else if (isGstr1Export) {
        if (gstrFormat === 'json') {
          await exportGstr1OfflineJson(exportData);
        } else {
          await exportGstr1OfflineWorkbook(exportData);
        }
      } else {
        onLegacyExcel?.();
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const downloadLabel = forTally
    ? tallyFormat === 'xml'
      ? 'Download XML'
      : 'Download Excel'
    : gstrFormat === 'json'
      ? 'Download GSTR-1 JSON'
      : 'Download GSTR-1 Workbook';

  return (
    <Modal
      open={open}
      title="Export return data"
      onClose={onClose}
      width={520}
      variant="solid"
      className="tax-export-modal"
    >
      <p className="tax-export-lead">
        {forTally
          ? 'Choose the file format required by your accounting software for voucher import.'
          : gstrFormat === 'json'
            ? 'Generates a GST portal–compatible GSTR-1 JSON file for offline upload (Services → Returns → Prepare Offline). One return period per file.'
            : 'Generates a multi-sheet GSTR-1 workbook (B2B, B2CS, B2CL, CDNR, CDNUR, HSN, documents, exports, e-commerce) aligned with GST offline utility layout.'}
      </p>

      <label className="tax-export-option">
        <input type="checkbox" checked={forTally} onChange={(e) => setForTally(e.target.checked)} />
        <span>Export for Tally / external accounting software</span>
      </label>

      {forTally ? (
        <div className="tax-export-format-group">
          <span className="tax-export-format-label">File format</span>
          <label className="tax-export-radio">
            <input
              type="radio"
              name="tallyFormat"
              value="xlsx"
              checked={tallyFormat === 'xlsx'}
              onChange={() => setTallyFormat('xlsx')}
            />
            <span>Excel workbook (.xlsx) — itemized sales vouchers</span>
          </label>
          <label className="tax-export-radio">
            <input
              type="radio"
              name="tallyFormat"
              value="xml"
              checked={tallyFormat === 'xml'}
              onChange={() => setTallyFormat('xml')}
            />
            <span>XML (.xml) — legacy Tally import</span>
          </label>
        </div>
      ) : isGstr1Export ? (
        <div className="tax-export-format-group">
          <span className="tax-export-format-label">GSTR-1 file format</span>
          <label className="tax-export-radio">
            <input
              type="radio"
              name="gstrFormat"
              value="xlsx"
              checked={gstrFormat === 'xlsx'}
              onChange={() => setGstrFormat('xlsx')}
            />
            <span>Excel workbook (.xlsx) — GST offline utility template</span>
          </label>
          <label className="tax-export-radio">
            <input
              type="radio"
              name="gstrFormat"
              value="json"
              checked={gstrFormat === 'json'}
              onChange={() => setGstrFormat('json')}
            />
            <span>JSON (.json) — direct upload to GST portal / Returns Offline Tool</span>
          </label>
          {gstrFormat === 'xlsx' ? (
            <ul className="tax-export-sheet-list">
              <li>master — return summary &amp; GSTIN</li>
              <li>b2b · b2cs · b2cl · cdnr · cdnur</li>
              <li>hsn (b2b) · hsn (b2c) · docs · exp · exemp</li>
              <li>Ecom B2B · Ecom B2C · Supeco</li>
            </ul>
          ) : (
            <ul className="tax-export-sheet-list">
              <li>gstin · fp (MMYYYY) · b2b · b2cs · b2cl</li>
              <li>cdnr · cdnur · exp · hsn · doc_issue</li>
              <li>DD-MM-YYYY dates · 2-digit POS codes</li>
            </ul>
          )}
        </div>
      ) : (
        <ul className="tax-export-sheet-list">
          <li>Standard Excel export for the active taxation tab</li>
        </ul>
      )}

      {error && (
        <div className="error-banner tax-export-error">
          <span>{error}</span>
        </div>
      )}

      <div className="tax-export-actions">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn-primary ${busy ? 'btn-submitting' : ''}`}
          onClick={runExport}
          disabled={busy}
        >
          <Download size={14} />
          {downloadLabel}
        </button>
      </div>
    </Modal>
  );
}
