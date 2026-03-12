import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { userService } from "../../services/userService";
import { planService } from "../../services/planService";

export const PlanPartnerManager = ({ activePlan }) => {
  const queryClient = useQueryClient();
  const [partnerDraftByPlanId, setPartnerDraftByPlanId] = useState({});

  const { data: users = [] } = useQuery({
    queryKey: ["users-all"],
    queryFn: userService.getAll,
    staleTime: 1000 * 60 * 5,
  });

  const activePlanId = activePlan?.id || "";
  const selectedPartnerId = activePlanId
    ? partnerDraftByPlanId[activePlanId] ?? activePlan?.partnerId ?? ""
    : "";
  const persistedPartnerId = activePlan?.partnerId ?? "";

  const selectableUsers = useMemo(() => {
    const ownerId = activePlan?.ownerId;
    return users.filter((user) => user.id !== ownerId);
  }, [activePlan?.ownerId, users]);

  const savePartner = useMutation({
    mutationFn: async () => {
      if (!activePlan?.id) {
        throw new Error("Plano invalido.");
      }
      return planService.update(activePlan.id, {
        name: activePlan.name,
        ownerId: activePlan.ownerId,
        partnerId: selectedPartnerId || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["plans-me"] });
      setPartnerDraftByPlanId((current) => {
        if (!activePlanId) return current;
        const next = { ...current };
        delete next[activePlanId];
        return next;
      });
    },
  });

  if (!activePlan) {
    return null;
  }

  const hasChanges = selectedPartnerId !== persistedPartnerId;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="mb-3 font-bold text-gray-800 uppercase text-xs tracking-wider flex items-center gap-2">
        <Users size={16} /> Parceiro do Plano
      </h3>

      <select
        value={selectedPartnerId}
        onChange={(e) =>
          setPartnerDraftByPlanId((current) => ({
            ...current,
            [activePlanId]: e.target.value,
          }))
        }
        className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
      >
        <option value="">Sem parceiro</option>
        {selectableUsers.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.email})
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => savePartner.mutate()}
        disabled={savePartner.isPending || !hasChanges}
        className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {savePartner.isPending ? "Salvando..." : "Salvar parceiro"}
      </button>

      {savePartner.isError && (
        <p className="mt-2 text-xs text-rose-600">
          {savePartner.error?.message || "Erro ao salvar parceiro."}
        </p>
      )}
    </div>
  );
};
