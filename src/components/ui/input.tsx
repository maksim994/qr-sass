import { forwardRef } from "react";

type InputSize = "sm" | "md" | "lg";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  inputSize?: InputSize;
  withIcon?: boolean;
  withSuffix?: boolean;
};

const sizeClass: Record<InputSize, string> = {
  sm: "fk-input--sm",
  md: "",
  lg: "fk-input--lg",
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { inputSize = "md", withIcon, withSuffix, className = "", ...rest },
  ref,
) {
  const classes = [
    "fk-input",
    sizeClass[inputSize],
    withIcon ? "fk-input--with-icon" : "",
    withSuffix ? "fk-input--with-suffix" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <input ref={ref} className={classes} {...rest} />;
});
