"use client";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  kind: ToastKind;
};

type ToastStackProps = {
  toasts: Toast[];
};

const kindStyles: Record<ToastKind, string> = {
  success: "border-[var(--green)] text-[var(--text)]",
  error: "border-red-400 text-[var(--text)]",
  info: "border-[var(--line)] text-[var(--text)]",
};

export default function ToastStack({ toasts }: ToastStackProps) {
  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-50 grid w-[min(360px,calc(100vw-2rem))] gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-md border bg-white px-4 py-3 text-[12px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] ${kindStyles[toast.kind]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
