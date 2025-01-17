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
  onBack,
  onReset,
}: FormWrapperProps) => {
  return (
    <Card className="bg-transparent border-0 shadow-none w-full">
      {title && (
        <CardHeader className="pb-6 relative">
          <div className="flex items-center justify-center relative">
            {onReset ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onReset}
                className="absolute left-0 p-0 text-[length:var(--font-small)] hover:bg-transparent hover:opacity-90 cursor-pointer transition-[opacity,color,text-shadow] duration-300 ease-in-out [&_svg]:!w-6 [&_svg]:!h-6 mx-1 [&_svg]:filter [&_svg]:drop-shadow-[0_0_5px_rgba(255,255,255,0.7)] hover:[&_svg]:drop-shadow-[0_0_10px_rgba(255,255,255,0.7)] [text-shadow:var(--white-glow)] hover:[text-shadow:var(--white-glow-large)] text-white/80 hover:text-white"
              >
                <RotateCcw className="opacity-90" />
              </Button>
            ) : (
              onBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="absolute left-0 p-0 text-[length:var(--font-small)] hover:bg-transparent hover:opacity-90 cursor-pointer transition-[opacity,color,text-shadow] duration-300 ease-in-out [&_svg]:!w-6 [&_svg]:!h-6 mx-1 [&_svg]:filter [&_svg]:drop-shadow-[0_0_5px_rgba(255,255,255,0.7)] hover:[&_svg]:drop-shadow-[0_0_10px_rgba(255,255,255,0.7)] [text-shadow:var(--white-glow)] hover:[text-shadow:var(--white-glow-large)] text-white/80 hover:text-white"
                >
                  <ChevronLeft className="opacity-90" />
                </Button>
              )
            )}
            <CardTitle className="font-mono font-normal text-[length:var(--font-x-small)] opacity-90 tracking-wider [text-shadow:var(--white-glow)]">
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
