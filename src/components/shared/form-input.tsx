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

const INPUT_CLASS_MAP: Record<FormInputType, string> = {
  text: "form-text-input",
  email: "form-text-input",
  number: "form-text-input",
  password: "form-text-input",
  url: "form-text-input",
  tel: "form-text-input",
  search: "form-text-input",
  date: "form-text-input",
  checkbox: "form-checkbox-input",
  radio: "form-radio-input",
  range: "form-range-input",
  file: "form-file-input",
  hidden: "",
};

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

  const inputElement = (
    <input
      id={fieldId}
      name={name}
      type={type}
      onChange={onChange}
      className={classNames(
        INPUT_CLASS_MAP[type],
        type === "search" && "form-search-input",
        className,
      )}
      {...inputProps}
    />
  );

  return (
    <div
      className={classNames(
        "FormInput",
        isToggleControl ? "form-field-inline" : "form-field",
        containerClassName,
      )}
    >
      {isToggleControl ? (
        <>
          <label htmlFor={fieldId} className="form-field-inline">
            {inputElement}
            {label ? <span>{label}</span> : null}
          </label>
        </>
      ) : (
        <>
          {label ? (
            <label htmlFor={fieldId} className="form-label">
              {label}
            </label>
          ) : null}
          {inputElement}
          {helperText ? (
            <span className="form-helper-text">{helperText}</span>
          ) : null}
        </>
      )}
    </div>
  );
}
