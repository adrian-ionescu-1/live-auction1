'use client';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Color of the confirm button. Defaults to the destructive red. */
  tone?: 'danger' | 'primary';
  /** Label of the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Disables the confirm button (e.g. while an async action is running). */
  busy?: boolean;
}

const CONFIRM_TONE = {
  danger:
    'bg-gradient-to-r from-red-500/80 to-rose-500/80 hover:from-red-500 hover:to-rose-500 text-white focus-visible:ring-red-400/60',
  primary:
    'bg-gradient-to-r from-emerald-500/80 to-emerald-400/80 hover:from-emerald-500 hover:to-emerald-400 text-white focus-visible:ring-emerald-400/60',
} as const;

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  tone = 'danger',
  confirmLabel = 'Confirm',
  busy = false,
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md animate-scale-in rounded-3xl bg-black/40 p-6 ring-1 ring-white/10 shadow-2xl sm:p-8">
        <h3 className="text-xl font-extrabold text-zinc-100 mb-4 sm:text-2xl">
          {title}
        </h3>

        <p className="text-zinc-400 mb-6">
          {message}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-zinc-300 font-semibold py-3 px-6 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/40 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 rounded-xl font-semibold py-3 px-6 transition shadow-lg focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${CONFIRM_TONE[tone]}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
