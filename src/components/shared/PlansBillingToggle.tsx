import classNames from "classnames";
import Button from "@/components/shared/Button";
import { BillingCycle } from "@/types/PlanData";

type PlansBillingToggleProps = {
  cycle: BillingCycle;
  onSelected: (cycle: BillingCycle) => void;
  badgeText: string;
};

export default function PlansBillingToggle({
  cycle,
  onSelected,
  badgeText,
}: PlansBillingToggleProps) {
  const moButtonClass = classNames(
    "plans-billing-toggle--btn",
    cycle !== "Monthly" && "plans-billing-toggle--btn-active",
  );

  const yrButtonClass = classNames(
    "plans-billing-toggle--btn",
    cycle !== "Yearly" && "plans-billing-toggle--btn-active",
  );

  return (
    <div className="plans-billing">
      <div className="plans-billing-toggle">
        <Button
          variant={cycle === "Monthly" ? "contained" : "text"}
          size="xs"
          onClick={() => onSelected("Monthly")}
          className={moButtonClass}
          aria-pressed={cycle === "Monthly"}
        >
          Monthly
        </Button>

        <Button
          variant={cycle === "Yearly" ? "contained" : "text"}
          size="xs"
          onClick={() => onSelected("Yearly")}
          className={yrButtonClass}
          aria-pressed={cycle === "Yearly"}
        >
          Yearly
        </Button>
      </div>

      <p className="plans-billing-save">{badgeText}</p>
    </div>
  );
}
