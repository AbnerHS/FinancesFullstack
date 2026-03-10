import { useQuery } from "@tanstack/react-query"
import { planService } from "../services/planService"

export const usePlans = () => {
    return useQuery({
        queryKey: ['plans-me'],
        queryFn: planService.getMyPlans,
        staleTime: 1000 * 60 * 5, // 5 minutos
    })
}