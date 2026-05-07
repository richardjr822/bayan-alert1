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
  success: "border-[rgba(0,0,0,0.08)] bg-white text-text",
  error: "border-[rgba(0,0,0,0.08)] bg-severity-critical text-white",
  info: "border-[rgba(0,0,0,0.08)] bg-navy text-white",
};

export default function ToastStack({ toasts }: ToastStackProps) {
  return (
    <>
      <div
        className="pointer-events-none fixed bottom-6 right-6 z-50 grid w-[min(360px,calc(100vw-2rem))] gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-[slideUp_200ms_ease-out] rounded-[12px] border px-4 py-3 text-[13px] font-medium shadow-sm ${kindStyles[toast.kind]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion) {
          .animate-\\[slideUp_200ms_ease-out\\] { animation: none; }
        }
      `}} />
    </>
  );
}
