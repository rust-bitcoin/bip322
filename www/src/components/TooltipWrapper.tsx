import React, { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipWrapperProps {
  children: React.ReactNode;
  value?: string | number | readonly string[];
  showTooltip?: boolean;
  tooltipLabel?: string;
  clickToCopy?: boolean;
}

export const TooltipWrapper = ({
  children,
  value,
  showTooltip = false,
  tooltipLabel,
  clickToCopy,
}: TooltipWrapperProps) => {
  const [showCopied, setShowCopied] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  if (!showTooltip) {
    return <>{children}</>;
  }

  const handleCopy = async () => {
    if (!clickToCopy || !value) return;

    try {
      await navigator.clipboard.writeText(value.toString());
      setShowCopied(true);
      setIsTooltipOpen(true);

      setTimeout(() => {
        setShowCopied(false);
        setIsTooltipOpen(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const getTooltipText = () => {
    if (showCopied) return tooltipLabel ? `${tooltipLabel} copied!` : "copied!";
    if (clickToCopy) {
      return tooltipLabel ? `copy ${tooltipLabel}` : "click to copy";
    }
    return tooltipLabel;
  };

  return (
    <TooltipProvider>
      <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
        <TooltipTrigger
          asChild
          onClick={(e) => {
            e.preventDefault();
            if (clickToCopy) handleCopy();
          }}
        >
          <div
            className={`tooltip-wrapper ${clickToCopy ? "cursor-pointer" : ""}`}
          >
            <div
              className={`tooltip-wrapper-inner ${
                clickToCopy ? "copy-enabled" : ""
              }`}
            >
              {children}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent sideOffset={5}>
          <p className="text-xs">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
