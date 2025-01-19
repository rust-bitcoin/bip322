import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

type BaseInputVariant = "default" | "verification";

interface BaseInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Input>, "className"> {
  className?: string;
  variant?: BaseInputVariant;
  verificationResult?: boolean;
}

const variantStyles = {
  default: "common-component common-input",
  verification: cn("common-component verification-input"),
};

const BaseInput = React.forwardRef<HTMLInputElement, BaseInputProps>(
  ({ className, variant = "default", verificationResult, ...props }, ref) => {
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
      <Input
        className={cn(
          variantStyles[variant],
          getVerificationStyles(),
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

BaseInput.displayName = "BaseInput";

export { BaseInput };
export type { BaseInputProps, BaseInputVariant };
