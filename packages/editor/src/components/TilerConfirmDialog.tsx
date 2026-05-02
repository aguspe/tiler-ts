import { useEffect } from "react";
import FocusLock from "react-focus-lock";

export interface TilerConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as the danger variant. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Tokenized confirm modal — replaces native window.confirm() so destructive
 * flows (delete a panel, etc) match the editor's design system. Backdrop
 * click cancels; Escape cancels; Enter confirms while focus is on the
 * dialog. The dialog traps focus so keyboard users can't escape into the
 * grid behind it.
 */
export function TilerConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: TilerConfirmDialogProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <>
      <div className="tiler-modal-backdrop" onClick={onCancel} />
      <div
        className="tiler-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="tiler-confirm-title"
      >
        <FocusLock>
          <h2 id="tiler-confirm-title" className="tiler-modal-title">
            {title}
          </h2>
          {message && <p className="tiler-modal-message">{message}</p>}
          <div className="tiler-modal-actions">
            <button type="button" className="tiler-btn" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className={danger ? "tiler-btn tiler-btn-danger" : "tiler-btn tiler-btn-primary"}
              onClick={onConfirm}
              // biome-ignore lint/a11y/noAutofocus: confirm is the primary action
              autoFocus
            >
              {confirmLabel}
            </button>
          </div>
        </FocusLock>
      </div>
    </>
  );
}
