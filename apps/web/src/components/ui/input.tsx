"use client";

import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-xl border border-input bg-white text-sm text-foreground shadow-[0_1px_2px_rgba(40,16,70,0.04)] outline-none transition-all duration-200 placeholder:text-muted-foreground/70 hover:border-brand-200 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/10";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    // Every password field gets a show/hide toggle, even when callers use
    // <Input type="password"> directly.
    if (type === "password") {
      return <PasswordInput ref={ref} className={className} {...props} />;
    }
    return (
      <input ref={ref} type={type} className={cn(fieldBase, "flex h-11 px-3.5", className)} {...props} />
    );
  },
);
Input.displayName = "Input";

/** Password / secret field with an eye button to reveal the value. */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { wrapperClassName?: string }
>(({ className, wrapperClassName, disabled, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn(fieldBase, "flex h-11 pl-3.5 pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
        tabIndex={0}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, "flex min-h-24 p-3.5", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      fieldBase,
      "select-chevron flex h-11 cursor-pointer appearance-none pl-3.5 pr-10",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";

/** Label + control + inline error, wired up with a generated id. */
export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: { id: string }) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-foreground/90">
        {label}
        {required && <span className="ml-0.5 text-brand-pink">*</span>}
      </label>
      {children({ id })}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
