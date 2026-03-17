type FormErrorProps = {
  message?: string | null
}

export function FormError({ message }: FormErrorProps) {
  if (!message) {
    return null
  }

  return <p className="text-sm text-rose-500 dark:text-rose-400">{message}</p>
}
