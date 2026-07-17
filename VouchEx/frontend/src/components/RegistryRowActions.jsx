import React, { useEffect, useRef, useState } from 'react';
import { Eye, Mail, MessageCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { shareByEmail, shareByWhatsApp } from '../utils/documentShare';
import { showApiError } from '../utils/apiErrors';

/**
 * Compact horizontal action bar for registry table rows (icon-only, single line).
 * @param {boolean} [shareInMenu] — put Email/WhatsApp inside the ⋯ menu so Delete never clips
 */
export function RegistryRowActions({
  onEdit,
  onView,
  viewTitle = 'View PDF',
  share,
  shareInMenu = false,
  deleteLabel,
  onDelete,
  deleteDisabled = false,
  moreItems = [],
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const menuRef = useRef(null);

  const visibleMore = (moreItems || []).filter((item) => item && !item.hidden);

  const shareMenuItems = shareInMenu && share
    ? [
        {
          label: share.emailTo ? `Email ${share.emailTo}` : 'Email',
          onClick: () => shareByEmail(share),
        },
        {
          label: share.phone ? `WhatsApp ${share.phone}` : 'WhatsApp',
          onClick: () => shareByWhatsApp(share),
        },
      ]
    : [];

  const menuItems = [...visibleMore, ...shareMenuItems];
  const showInlineShare = !!share && !shareInMenu;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const handleDelete = async () => {
    if (deleteDisabled || deleteBusy || !onDelete) return;
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

  return (
    <div className="registry-actions" ref={menuRef}>
      {onView && (
        <button type="button" className="btn-icon-sm" title={viewTitle} onClick={onView}>
          <Eye size={14} />
        </button>
      )}
      {onEdit && (
        <button type="button" className="btn-icon-sm" title="Edit" onClick={onEdit}>
          <Pencil size={13} />
        </button>
      )}
      {showInlineShare && (
        <>
          <button
            type="button"
            className="btn-icon-sm"
            title={share.emailTo ? `Email ${share.emailTo}` : 'Email'}
            onClick={() => shareByEmail(share)}
          >
            <Mail size={13} />
          </button>
          <button
            type="button"
            className="btn-icon-sm btn-icon-sm--whatsapp"
            title={share.phone ? `WhatsApp ${share.phone}` : 'WhatsApp'}
            onClick={() => shareByWhatsApp(share)}
          >
            <MessageCircle size={13} />
          </button>
        </>
      )}
      {onDelete && (
        <button
          type="button"
          className="btn-icon-sm btn-icon-sm--danger"
          title={`Delete ${deleteLabel}`}
          disabled={deleteDisabled || deleteBusy}
          onClick={handleDelete}
        >
          <Trash2 size={13} />
        </button>
      )}
      {menuItems.length > 0 && (
        <div className="registry-actions-more">
          <button
            type="button"
            className="btn-icon-sm"
            title="More actions"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="registry-actions-menu" role="menu">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="registry-actions-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    item.onClick?.();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
