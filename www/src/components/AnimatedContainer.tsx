import React from "react";

interface AnimatedContainerProps {
  children: React.ReactNode;
  isExpanded: boolean;
}

const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  isExpanded,
}) => {
  const [formContent, button] = React.Children.toArray(children);

  return (
    <div className="w-full">
      <div
        className={`
        w-full relative
        transition-all duration-300 ease-in-out 
        bg-primary/5 border-border/40 backdrop-blur rounded-xl
        ${isExpanded ? "h-auto" : "h-0"}
        overflow-hidden mb-0
      `}
      >
        {formContent}
      </div>
      {isExpanded ? null : button}
    </div>
  );
};

export default AnimatedContainer;
