import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper hover:bg-graphite",
        secondary: "border border-line bg-porcelain text-ink hover:bg-paper",
        ghost: "text-graphite hover:bg-porcelain"
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-5"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
