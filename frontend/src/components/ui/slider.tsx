import * as React from "react";

import { cn } from "@/lib/utils";

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value"> {
  value: number;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, max = 100, min = 0, value, ...props }, ref) => {
    const minimum = Number(min);
    const maximum = Number(max);
    const progress = ((value - minimum) / (maximum - minimum)) * 100;

    return (
      <input
        className={cn(
          "h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-sm",
          className,
        )}
        max={max}
        min={min}
        ref={ref}
        style={{
          background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${progress}%, rgb(63 63 70) ${progress}%, rgb(63 63 70) 100%)`,
        }}
        type="range"
        value={value}
        {...props}
      />
    );
  },
);
Slider.displayName = "Slider";

export { Slider };
