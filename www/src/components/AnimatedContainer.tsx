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
    <div className="w-full flex justify-center">
      <div className="w-full relative">
        <div
          className={`
            w-full 
            transition-all duration-300 ease-in-out 
            ${isExpanded ? "h-auto opacity-100" : "h-0 opacity-0"}
            overflow-hidden
          `}
        >
          <div className="w-full bg-primary/5 border-border/40 backdrop-blur rounded-xl">
            {formContent}
          </div>
        </div>
        {isExpanded ? null : button}
      </div>
    </div>
  );
};

export default AnimatedContainer;
