"use client";

import classNames from "classnames";
import {
  ChangeEventHandler,
  InputHTMLAttributes,
  useId,
  type ReactNode,
} from "react";

export type FormInputType =
  | "checkbox"
  | "date"
  | "email"
  | "number"
  | "password"
  | "radio"
  | "range"
  | "search"
  | "tel"
  | "text"
  | "url"
  | "file"
  | "hidden";

interface FormInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> {
  type: FormInputType;
  label?: ReactNode;
  className?: string;
  containerClassName?: string;
  helperText?: ReactNode;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

export const FORM_INPUT_CONTROL_CLASS = classNames(
  "w-full rounded-xl border border-slate-400 px-3 py-2 text-sm",
  "bg-lavenderHaze-100 text-midnightBlue-900",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavenderHaze-300/60",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "dark:border-slate-500 dark:bg-nightIndigo-1000 dark:text-white",
  "dark:focus-visible:ring-nightIndigo-500/40",
);

const FORM_INPUT_CHECKBOX_CLASS = classNames(
  "h-4 w-4 rounded border border-slate-500",
  "accent-twilightPurple-600",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavenderHaze-300/60",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "dark:border-slate-400 dark:focus-visible:ring-nightIndigo-500/40",
);

export default function FormInput({
  type,
  label,
  className,
  containerClassName,
  helperText,
  id,
  name,
  onChange,
  ...inputProps
}: FormInputProps) {
  const generatedId = useId();
  const fieldId = id ?? `${name ?? "form-input"}-${generatedId}`;
  const isToggleControl = type === "checkbox" || type === "radio";
  const isHidden = type === "hidden";

  if (isHidden) {
    return <input type="hidden" id={fieldId} name={name} {...inputProps} />;
  }

  if (isToggleControl) {
    return (
      <label
        htmlFor={fieldId}
        className={classNames(
          "FormInput inline-flex items-center gap-2 text-sm",
          containerClassName,
        )}
      >
        <input
          id={fieldId}
          name={name}
          type={type}
          onChange={onChange}
          className={classNames(FORM_INPUT_CHECKBOX_CLASS, className)}
          {...inputProps}
        />
        {label ? <span>{label}</span> : null}
      </label>
    );
  }

  return (
    <div
      className={classNames(
        "FormInput flex flex-col gap-2",
        containerClassName,
      )}
    >
      {label ? (
        <label htmlFor={fieldId} className="text-sm font-semibold">
          {label}
        </label>
      ) : null}
      <input
        id={fieldId}
        name={name}
        type={type}
        onChange={onChange}
        className={classNames(FORM_INPUT_CONTROL_CLASS, className)}
        {...inputProps}
      />
      {helperText ? (
        <span className="text-xs text-midnightBlue-600 dark:text-lavenderHaze-600">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
