import { useState } from 'react';
import { Eye, MoreVertical, X } from 'lucide-react';
import { shareByEmail, shareByWhatsApp } from '../../utils/documentShare';
import { showApiError } from '../../utils/apiErrors';

/**
 * Mobile card actions: View + ⋮ bottom sheet (progressive disclosure).
 */
export default function MobileRegistryCardActions({
  onEdit,
  onView,
  viewLabel = 'View',
  viewTitle = 'View',
  share,
  deleteLabel,
  onDelete,
  deleteDisabled = false,
  moreItems = [],
  extraItems = [],
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const visibleMore = (moreItems || []).filter((item) => item && !item.hidden);
  const extras = (extraItems || []).filter(Boolean);

  const close = () => setSheetOpen(false);

  const run = (fn) => {
    close();
    fn?.();
  };

  const handleDelete = async () => {
    if (deleteDisabled || deleteBusy || !onDelete) return;
    close();
    if (!window.confirm(`Delete ${deleteLabel}? This cannot be undone.`)) return;
    setDeleteBusy(true);
    try {
      await onDelete();
    } catch (err) {
      showApiError(`Deleting ${deleteLabel}`, err);
    } finally {
      setDeleteBusy(false);
    }
  };

  const menuItems = [
    onEdit && { label: 'Edit', onClick: () => run(onEdit) },
    share && { label: 'Share via Email', onClick: () => run(() => shareByEmail(share)) },
    share && { label: 'Share via WhatsApp', onClick: () => run(() => shareByWhatsApp(share)) },
    ...visibleMore.map((item) => ({ label: item.label, onClick: () => run(item.onClick) })),
    ...extras.map((item) => ({ label: item.label, onClick: () => run(item.onClick), danger: item.danger })),
    onDelete && { label: 'Delete', onClick: handleDelete, danger: true, disabled: deleteDisabled || deleteBusy },
  ].filter(Boolean);

  const hasMenu = menuItems.length > 0;

  return (
    <>
      <div className="mobile-card-actions">
        {onView && (
          <button type="button" className="mobile-card-actions__primary" onClick={onView} title={viewTitle}>
            <Eye size={16} />
            {viewLabel}
          </button>
        )}
        {hasMenu && (
          <button
            type="button"
            className="mobile-card-actions__more"
            aria-label="More actions"
            onClick={() => setSheetOpen(true)}
          >
            <MoreVertical size={20} />
          </button>
        )}
      </div>

      {sheetOpen && (
        <>
          <div className="mobile-action-sheet-backdrop mobile-only" onClick={close} aria-hidden="true" />
          <div className="mobile-action-sheet mobile-only" role="dialog" aria-label="Actions">
            <div className="mobile-action-sheet__head">
              <strong>Actions</strong>
              <button type="button" className="mobile-action-sheet__close" onClick={close} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <ul className="mobile-action-sheet__list">
              {menuItems.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    className={`mobile-action-sheet__item${item.danger ? ' mobile-action-sheet__item--danger' : ''}`}
                    disabled={item.disabled}
                    onClick={item.onClick}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
