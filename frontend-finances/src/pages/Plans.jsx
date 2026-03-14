import { PlanManager } from "../components/dashboard/PlanManager";
import { useDashboard } from "../hooks/useDashboard";

const Plans = () => {
  const { plans, activePlan, selectedPlanId, setSelectedPlanId, userId } = useDashboard();

  return (
    <PlanManager
      plans={plans}
      activePlan={activePlan}
      selectedPlanId={selectedPlanId}
      onSelectPlanId={setSelectedPlanId}
      userId={userId}
    />
  );
};

export default Plans;
