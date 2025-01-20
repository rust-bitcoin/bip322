import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { TooltipWrapper } from "@/components/TooltipWrapper";

type TextareaVariant = "default" | "two-lines" | "three-lines";

interface BaseTextareaProps
  extends React.ComponentPropsWithoutRef<typeof Textarea> {
  variant?: TextareaVariant;
  tooltipLabel?: string;
}

const BaseTextarea = React.forwardRef<HTMLTextAreaElement, BaseTextareaProps>(
  (
    { className, variant = "default", tooltipLabel, disabled, ...props },
    ref
  ) => {
    return (
      <TooltipWrapper
        value={props.value}
        showTooltip={disabled}
        tooltipLabel={tooltipLabel}
        clickToCopy={disabled}
      >
        <Textarea
          className={cn(
            "common-component",
            "common-textarea",
            variant === "two-lines" && "two-lines",
            variant === "three-lines" && "three-lines",
            disabled && "pointer-events-none cursor-pointer",
            className
          )}
          ref={ref}
          disabled={disabled}
          {...props}
        />
      </TooltipWrapper>
    );
  }
);

export { BaseTextarea };
export type { BaseTextareaProps, TextareaVariant };
