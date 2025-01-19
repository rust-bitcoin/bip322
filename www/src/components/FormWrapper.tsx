import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { BaseButton } from "@/components/ui/base-button";

interface FormWrapperProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  onBack?: () => void;
  onReset?: () => void;
}

const FormWrapper = ({
  children,
  title,
  onBack,
  onReset,
}: FormWrapperProps) => {
  return (
    <Card className="bg-transparent border-0 shadow-none w-full">
      {title && (
        <CardHeader className="relative py-[calc(var(--size)*0.06)]">
          <div className="flex items-center justify-center relative">
            {onReset ? (
              <BaseButton variant="iconControl" onClick={onReset}>
                <RotateCcw className="opacity-90" />
              </BaseButton>
            ) : (
              onBack && (
                <BaseButton
                  variant="iconControl"
                  onClick={onBack}
                  className="absolute left-0 p-0 text-[length:var(--font-sm)]"
                >
                  <ChevronLeft className="opacity-90" />
                </BaseButton>
              )
            )}
            <CardTitle className="font-mono font-normal text-[length:var(--font-sm)] opacity-90 tracking-wider [text-shadow:var(--glow)]">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
      )}
      <CardContent className="pt-[calc(var(--size)*0.02)] pb-[calc(var(--size)*0.08)]">
        {children}
      </CardContent>
    </Card>
  );
};

export default FormWrapper;
