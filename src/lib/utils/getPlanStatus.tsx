import { Plan, PlanData, PlanStatus } from "@/types/PlanData.d";

interface PlanStatusParams {
  plan: Plan;
  yearly: boolean;
  planFee: number;
  userPlan?: PlanData;
}

export function getPlanStatus({
  plan,
  yearly,
  planFee,
  userPlan,
}: PlanStatusParams): PlanStatus {
  const planId = Number(plan.id);
  const { id: userPlanId, billing, amount } = userPlan || {};
  const prevPlans = Number(planFee) <= Number(amount);

  const billingCycle = billing === (yearly ? "Yearly" : "Monthly");
  const isIncluded = prevPlans && planId <= Number(userPlanId) ? true : false;

  let isCurrent = false,
    isPopular = false;

  if (planId === 0) {
    isCurrent = planId === Number(userPlanId) ? true : false;
  }

  if (planId === 1) {
    isCurrent = billingCycle && planId === Number(userPlanId) ? true : false;
    isPopular =
      (!isIncluded && Number(userPlanId) === 0) || !userPlanId ? true : false;
  }

  if (planId === 2) {
    isCurrent = billingCycle && planId === Number(userPlanId) ? true : false;
    isPopular =
      !isIncluded && [1, 2].includes(Number(userPlanId)) ? true : false;
  }

  return { isIncluded, isCurrent, isPopular };
}
