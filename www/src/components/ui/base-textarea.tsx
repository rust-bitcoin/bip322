import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";

const BaseTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<typeof Textarea>
>(({ className, ...props }, ref) => {
  return (
    <Textarea
      className={cn("common-component", "common-textarea", className)}
      ref={ref}
      {...props}
    />
  );
});

BaseTextarea.displayName = "BaseTextarea";

export { BaseTextarea };
