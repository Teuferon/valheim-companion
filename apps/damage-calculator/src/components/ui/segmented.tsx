
import type { ReactNode } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  title?: string;
}

/**
 * Single-select segmented control.
 *
 * The shadcn toggle group in this project is built on Base UI, whose value is
 * always an array (even in single-select mode). This wrapper keeps the call
 * sites simple and stops a second click from clearing the selection.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  itemClassName,
  size = "sm",
  variant = "outline",
  ariaLabel,
}: {
  value: T | null;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline";
  ariaLabel?: string;
}) {
  return (
    <ToggleGroup
      aria-label={ariaLabel}
      value={value === null ? [] : [value]}
      onValueChange={(values) => {
        const next = values[values.length - 1];
        if (typeof next === "string") onChange(next as T);
      }}
      variant={variant}
      size={size}
      className={className}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          title={option.title}
          className={cn(itemClassName)}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
