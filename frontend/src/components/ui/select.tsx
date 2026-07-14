import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ children, className, ...props }, ref) => (
    <div className="relative">
      <select
        className={cn(
          "flex h-10 w-full appearance-none rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 pr-9 text-sm text-zinc-200 shadow-sm outline-none transition-colors focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-white/[0.02] disabled:text-zinc-600 disabled:opacity-100",
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
    </div>
  ),
);
Select.displayName = "Select";

export { Select };
