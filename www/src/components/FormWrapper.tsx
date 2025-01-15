import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FormWrapperProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

const FormWrapper = ({ children, title, className = "" }: FormWrapperProps) => {
  return (
    <Card
      className={`bg-muted border-border/40 backdrop-blur supports-[backdrop-filter]:bg-muted/60 ${className}`}
    >
      {title && (
        <CardHeader className="pb-6">
          <CardTitle className="text-center font-mono font-normal text-[length:var(--font-small)] opacity-80 tracking-wider">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-6 pb-8">{children}</CardContent>
    </Card>
  );
};

export default FormWrapper;
