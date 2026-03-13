export const getProblemDetailMessage = (error, fallbackMessage) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  fallbackMessage;

export const getProblemDetailErrors = (error) => {
  const fieldErrors = error?.response?.data?.errors;
  if (!fieldErrors || typeof fieldErrors !== "object") {
    return [];
  }

  return Object.entries(fieldErrors).flatMap(([, value]) => {
    const messages = Array.isArray(value) ? value : [value];
    return messages.filter(Boolean);
  });
};
