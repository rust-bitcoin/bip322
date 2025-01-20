import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import type { ButtonProps } from "./button";

type BaseVariant = "large" | "default" | "icon" | "nav" | "iconControl";

interface BaseButtonProps extends Omit<ButtonProps, "variant"> {
  variant?: BaseVariant;
}

const baseStyles = {
  large: "button-large",
  default: "common-component button-default",
  icon: "common-component button-icon",
  nav: "button-nav",
  iconControl: "button-control",
} as const;

const variantMapping = {
  large: "ghost",
  default: "ghost",
  icon: "ghost",
  nav: "link",
  iconControl: "ghost",
} as const;

const BaseButton = React.forwardRef<HTMLButtonElement, BaseButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <Button
        className={cn(baseStyles[variant], className)}
        variant={variantMapping[variant]}
        ref={ref}
        {...props}
      />
    );
  }
);

export { BaseButton };
export type { BaseButtonProps, BaseVariant };
