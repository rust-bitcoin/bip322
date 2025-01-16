import React, { useRef, useEffect, useState } from "react";

const AnimatedContainer = ({ children, isExpanded }) => {
  const contentRef = useRef(null);
  const [height, setHeight] = useState("calc(var(--font-large) + 4em)"); // wysokość fonta + padding

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      if (contentRef.current) {
        const newHeight = contentRef.current.scrollHeight;
        setHeight(
          isExpanded ? `${newHeight}px` : "calc(var(--font-large) + 4em)"
        );
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [isExpanded, children]);

  return (
    <div
      className="w-full overflow-hidden transition-all duration-300 ease-in-out bg-muted border-border/40 backdrop-blur rounded-md"
      style={{ height }}
    >
      <div ref={contentRef} className="relative w-full flex items-center">
        {children}
      </div>
    </div>
  );
};

export default AnimatedContainer;
