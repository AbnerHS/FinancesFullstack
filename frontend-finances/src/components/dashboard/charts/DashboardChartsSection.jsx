import BalanceTrendChart from "./BalanceTrendChart";
import CategorySpendingChart from "./CategorySpendingChart";
import IncomeExpenseComparisonChart from "./IncomeExpenseComparisonChart";

const DashboardChartsSection = ({ comparisonData, categoryData }) => (
  <>
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <BalanceTrendChart data={comparisonData} />
      <CategorySpendingChart data={categoryData} />
    </section>

    <section>
      <IncomeExpenseComparisonChart data={comparisonData} />
    </section>
  </>
);

export default DashboardChartsSection;
