import * as React from "react";

import { cn } from "@/lib/utils";

export type SwitchProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <label
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center",
        props.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        className="peer sr-only"
        ref={ref}
        type="checkbox"
        {...props}
      />
      <span className="absolute inset-0 rounded-full bg-zinc-700 transition-colors peer-checked:bg-blue-500 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#131519]" />
      <span className="pointer-events-none relative ml-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
    </label>
  ),
);
Switch.displayName = "Switch";

export { Switch };
