import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { TooltipWrapper } from "@/components/TooltipWrapper";

type BaseInputVariant = "default" | "verification";

interface BaseInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Input>, "className"> {
  className?: string;
  variant?: BaseInputVariant;
  verificationResult?: boolean;
  tooltipLabel?: string;
}

const variantStyles = {
  default: "common-component common-input",
  verification: cn("common-component verification-input"),
};

const BaseInput = React.forwardRef<HTMLInputElement, BaseInputProps>(
  (
    {
      className,
      variant = "default",
      verificationResult,
      tooltipLabel,
      disabled,
      ...props
    },
    ref
  ) => {
    const getVerificationStyles = () => {
      if (
        variant !== "verification" ||
        typeof verificationResult === "undefined"
      )
        return "";
      return verificationResult
        ? "verification-input-success"
        : "verification-input-error";
    };

    return (
      <TooltipWrapper
        value={props.value}
        showTooltip={disabled}
        tooltipLabel={tooltipLabel}
        clickToCopy={disabled}
      >
        <Input
          ref={ref}
          className={cn(
            variantStyles[variant],
            getVerificationStyles(),
            disabled && "pointer-events-none cursor-pointer",
            className
          )}
          disabled={disabled}
          {...props}
        />
      </TooltipWrapper>
    );
  }
);

export { BaseInput };
export type { BaseInputProps, BaseInputVariant };
