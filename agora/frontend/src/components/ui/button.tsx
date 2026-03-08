import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const baseStyle = "px-4 py-2 text-sm rounded-md transition-colors";
    const variantStyle =
      variant === "secondary"
        ? "bg-gray-200 text-black hover:bg-gray-300"
        : "bg-blue-600 text-white hover:bg-blue-700";

    return (
      <button
        ref={ref}
        className={cn(baseStyle, variantStyle, className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
