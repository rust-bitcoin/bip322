import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { TooltipWrapper } from "@/components/TooltipWrapper";

interface BaseTextareaProps
  extends React.ComponentPropsWithoutRef<typeof Textarea> {
  tooltipLabel?: string;
}

const BaseTextarea = React.forwardRef<HTMLTextAreaElement, BaseTextareaProps>(
  ({ className, tooltipLabel, disabled, ...props }, ref) => {
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

BaseTextarea.displayName = "BaseTextarea";

export { BaseTextarea };
export type { BaseTextareaProps };
