import { useQuery } from "@tanstack/react-query";
import { creditCardService } from "../services/creditCardService";

export const useCreditCards = () => {
    return useQuery({
        queryKey: ['credit-cards-me'],
        queryFn: creditCardService.getMyCreditCards,
        staleTime: 1000 * 60 * 10,
    });
};
