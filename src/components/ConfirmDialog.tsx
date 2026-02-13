// src/components/ConfirmDialog.tsx

'use client';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-black/40 ring-1 ring-white/10 shadow-2xl p-8">
        
        <h3 className="text-2xl font-extrabold text-zinc-100 mb-4">
          {title}
        </h3>

        <p className="text-zinc-400 mb-6">
          {message}
        </p>

        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-zinc-300 font-semibold py-3 px-6 transition"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-gradient-to-r from-red-500/80 to-rose-500/80 hover:from-red-500 hover:to-rose-500 text-white font-semibold py-3 px-6 transition shadow-lg"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
