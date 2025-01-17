import { useRef, useEffect, useState } from "react";

interface AnimatedContainerProps {
  children: React.ReactNode;
  isExpanded: boolean;
}

const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  isExpanded,
}) => {
  const contentRef = useRef() as React.MutableRefObject<HTMLDivElement>;
  const [height, setHeight] = useState("calc(var(--font-large) + 3rem)");

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      if (contentRef.current) {
        const newHeight = contentRef.current?.scrollHeight;
        setHeight(
          isExpanded ? `${newHeight}px` : "calc(var(--font-large) + 3rem)"
        );
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [isExpanded, children]);

  return (
    <div
      className="w-full transition-all duration-300 ease-in-out bg-primary/5 border-border/40 backdrop-blur rounded-xl"
      style={{ height }}
    >
      <div ref={contentRef} className="relative w-full flex items-center">
        {children}
      </div>
    </div>
  );
};

export default AnimatedContainer;
