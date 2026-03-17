export interface AlertParams {
  id?: number;
  title: string;
  text?: string;
  severity?: "info" | "error" | "success" | "warning";
  variant?: "filled" | "outlined";
}
