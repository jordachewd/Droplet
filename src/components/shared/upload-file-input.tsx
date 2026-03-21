import classNames from "classnames";
import { forwardRef, InputHTMLAttributes } from "react";

export const UploadFileInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function UploadFileInput(props, ref) {
  return (
    <input
      {...props}
      ref={ref}
      aria-hidden={props["aria-hidden"] ?? true}
      tabIndex={props.tabIndex ?? -1}
      className={classNames(
        "UploadFileInput absolute bottom-0 left-0 h-px w-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)] [clip:rect(0_0_0_0)]",
        props.className,
      )}
    />
  );
});
