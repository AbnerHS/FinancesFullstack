import { PeriodsManager } from "../components/dashboard/PeriodsManager";
import { useDashboard } from "../hooks/useDashboard";

const Periods = () => {
  const { activePlan, periods, selectedPeriodIds, togglePeriodId } = useDashboard();

  return (
    <PeriodsManager
      activePlan={activePlan}
      periods={periods}
      selectedPeriodIds={selectedPeriodIds}
      onTogglePeriodId={togglePeriodId}
    />
  );
};

export default Periods;
