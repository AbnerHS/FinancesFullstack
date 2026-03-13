import { useQuery } from "@tanstack/react-query";
import { transactionCategoryService } from "../services/transactionCategoryService";

export const useTransactionCategories = () =>
  useQuery({
    queryKey: ["transaction-categories"],
    queryFn: transactionCategoryService.getAll,
    staleTime: 1000 * 60 * 10,
  });
