export interface AlertParams {
  id?: number | string;
  title: string;
  text?: string;
  severity?: "info" | "error" | "success" | "warning";
  variant?: "filled" | "outlined";
}
