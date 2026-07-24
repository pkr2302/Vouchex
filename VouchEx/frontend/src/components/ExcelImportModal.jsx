import React, { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal } from './portalShared';
import { readSpreadsheetRows, runSequentialImport } from '../utils/excelImport/excelImportCore';
import {
  EXCEL_IMPORT_SPECS,
  downloadImportTemplate,
  buildSalesImportJobs,
  buildPurchaseImportJobs,
  buildReceiptImportJobs,
  buildPaymentImportJobs,
} from '../utils/excelImport/importBuilders';

/**
 * Reusable Excel import dialog for sales / purchase / receipts / payments.
 *
 * props.createFn(job) — async creator for one prepared job
 * props.context — masters + lists needed by builders
 */
export default function ExcelImportModal({
  open,
  onClose,
  type,
  context,
  createFn,
  onComplete,
}) {
  const spec = EXCEL_IMPORT_SPECS[type];
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!spec) return null;

  const resetState = () => {
    setFileName('');
    setBusy(false);
    setProgress(null);
    setPreviewCount(0);
    setJobs([]);
    setParseErrors([]);
    setResult(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    if (busy) return;
    resetState();
    onClose?.();
  };

  const buildJobsFromRows = (rows) => {
    if (type === 'sales') return buildSalesImportJobs(rows, context);
    if (type === 'purchase') return buildPurchaseImportJobs(rows, context);
    if (type === 'receipts') return buildReceiptImportJobs(rows, context);
    if (type === 'payments') return buildPaymentImportJobs(rows, context);
    return [];
  };

  const handleFile = async (file) => {
    setError('');
    setResult(null);
    setParseErrors([]);
    setJobs([]);
    setPreviewCount(0);
    if (!file) return;
    setFileName(file.name);
    try {
      const { rows } = await readSpreadsheetRows(file);
      if (!rows.length) throw new Error('No data rows found under the header.');
      const built = buildJobsFromRows(rows);
      const ready = built.filter((j) => !j.error && !j.skip);
      setJobs(ready);
      setParseErrors([
        ...built.filter((j) => j.skip).map((j) => ({ label: j.label, message: j.error, soft: true })),
        ...built.filter((j) => j.error && !j.skip).map((j) => ({ label: j.label, message: j.error })),
      ]);
      setPreviewCount(rows.length);
      if (!ready.length && !built.some((j) => j.error || j.skip)) {
        setError('No importable rows found. Download the template and check column headers.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to read spreadsheet.');
    }
  };

  const handleImport = async () => {
    if (!jobs.length || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const summary = await runSequentialImport(jobs, async (job) => {
        await createFn(job);
      }, {
        onProgress: setProgress,
      });
      // Fold pre-parse skips into summary
      const softSkips = parseErrors.filter((e) => e.soft).length;
      summary.skipped += softSkips;
      const hardErrors = parseErrors.filter((e) => !e.soft);
      summary.errors = [
        ...hardErrors.map((e) => ({ label: e.label, message: e.message })),
        ...summary.errors,
      ];
      summary.failed += hardErrors.length;
      setResult(summary);
      onComplete?.(summary);
    } catch (err) {
      setError(err?.message || 'Import failed.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={spec.title} width={560} variant="solid" className="excel-import-modal">
      <p className="form-hint" style={{ marginBottom: 12, fontSize: 12, lineHeight: 1.45 }}>
        {spec.description}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => downloadImportTemplate(type)}
          disabled={busy}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Download size={14} /> Download template
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Upload size={14} /> Choose Excel / CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {fileName && (
        <p style={{ fontSize: 12, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileSpreadsheet size={14} /> {fileName}
          {previewCount > 0 && <span style={{ color: 'var(--text-muted)' }}>· {previewCount} data row(s)</span>}
        </p>
      )}

      {error && (
        <div className="excel-import-banner excel-import-banner--error" role="alert">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {parseErrors.length > 0 && !result && (
        <div className="excel-import-errors">
          <strong style={{ fontSize: 12 }}>
            {parseErrors.filter((e) => !e.soft).length} issue(s), {parseErrors.filter((e) => e.soft).length} skip(s)
          </strong>
          <ul>
            {parseErrors.slice(0, 8).map((e, idx) => (
              <li key={idx}>
                <strong>{e.label}:</strong> {e.message}
              </li>
            ))}
            {parseErrors.length > 8 && <li>…and {parseErrors.length - 8} more</li>}
          </ul>
        </div>
      )}

      {jobs.length > 0 && !result && (
        <p style={{ fontSize: 12, margin: '8px 0 12px' }}>
          Ready to import <strong>{jobs.length}</strong> record(s).
        </p>
      )}

      {busy && progress && (
        <p style={{ fontSize: 12, marginBottom: 10 }}>
          Importing {progress.index} / {progress.total}: {progress.label}
        </p>
      )}

      {result && (
        <div className="excel-import-banner excel-import-banner--ok">
          <CheckCircle2 size={14} />
          Imported {result.ok} · skipped {result.skipped} · failed {result.failed}
        </div>
      )}

      {result?.errors?.length > 0 && (
        <div className="excel-import-errors" style={{ marginTop: 10 }}>
          <ul>
            {result.errors.slice(0, 10).map((e, idx) => (
              <li key={idx}>
                <strong>{e.label}:</strong> {e.message}
              </li>
            ))}
            {result.errors.length > 10 && <li>…and {result.errors.length - 10} more</li>}
          </ul>
        </div>
      )}

      <div className="btn-row" style={{ marginTop: 16 }}>
        <button type="button" className="btn-secondary" onClick={handleClose} disabled={busy}>
          {result ? 'Close' : 'Cancel'}
        </button>
        {!result && (
          <button
            type="button"
            className="btn-primary"
            onClick={handleImport}
            disabled={busy || jobs.length === 0}
          >
            {busy ? 'Importing…' : `Import ${jobs.length || ''}`.trim()}
          </button>
        )}
      </div>
    </Modal>
  );
}
