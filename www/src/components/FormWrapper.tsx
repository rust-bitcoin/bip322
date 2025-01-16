import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, RotateCcw } from "lucide-react";

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
  className = "",
  onBack,
  onReset,
}: FormWrapperProps) => {
  return (
    <Card className={`bg-transparent border-0 shadow-none ${className}`}>
      {title && (
        <CardHeader className="pb-6 relative">
          <div className="flex items-center justify-center relative">
            {onReset ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onReset}
                className="absolute left-0 p-0 text-[length:var(--font-small)] hover:bg-transparent hover:opacity-90 cursor-pointer transition-opacity [&_svg]:!w-6 [&_svg]:!h-6 mx-1"
              >
                <RotateCcw className="opacity-80" />
              </Button>
            ) : (
              onBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="absolute left-0 p-0 text-[length:var(--font-small)] hover:bg-transparent hover:opacity-70 cursor-pointer transition-opacity [&_svg]:!w-7 [&_svg]:!h-7"
                >
                  <ChevronLeft className="opacity-80" />
                </Button>
              )
            )}
            <CardTitle className="font-mono font-normal text-[length:var(--font-small)] opacity-90 tracking-wider">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-6 pb-8">{children}</CardContent>
    </Card>
  );
};

export default FormWrapper;
