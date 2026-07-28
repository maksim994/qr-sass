import { forwardRef } from "react";

type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { className = "", children, ...rest },
  ref,
) {
  return (
    <div className="fk-select">
      <select ref={ref} className={`fk-select__control ${className}`.trim()} {...rest}>
        {children}
      </select>
      <span className="fk-select__chevron" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </div>
  );
});
