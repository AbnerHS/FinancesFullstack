import { transactionCategoryService } from "../../../../services/transactionCategoryService";
import { transactionsQueryKeys } from "./queryKeys";

export const ensureTransactionCategory = async ({
  categoryId,
  categoryName,
  transactionCategories,
  queryClient,
}) => {
  const normalizedName = categoryName?.trim() || "";

  if (!categoryId && !normalizedName) {
    return null;
  }

  const existingById = transactionCategories.find((category) => category.id === categoryId);
  if (existingById) {
    return { id: existingById.id, name: existingById.name };
  }

  const existingByName = transactionCategories.find(
    (category) => category.name?.trim().toLowerCase() === normalizedName.toLowerCase()
  );
  if (existingByName) {
    return { id: existingByName.id, name: existingByName.name };
  }

  const createdCategory = await transactionCategoryService.create({ name: normalizedName });
  await queryClient.invalidateQueries({
    queryKey: transactionsQueryKeys.categoriesRoot(),
  });

  return {
    id: createdCategory.id,
    name: createdCategory.name,
  };
};
