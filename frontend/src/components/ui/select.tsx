import { Select as BaseSelect } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"
import { Children, isValidElement, type ReactNode, useMemo } from "react"
import type { ChangeEvent, SelectHTMLAttributes } from "react"

import { cn } from "@/lib/utils.ts"

type NativeSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "multiple" | "size"> & {
  placeholder?: ReactNode
}

type ParsedOption = {
  disabled?: boolean
  label: ReactNode
  value: string
}

function parseOptions(children: ReactNode): ParsedOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode; disabled?: boolean; value?: string | number }>(child)) {
      return []
    }

    return [
      {
        disabled: child.props.disabled,
        label: child.props.children,
        value: String(child.props.value ?? ""),
      },
    ]
  })
}

export function Select({
  children,
  className,
  defaultValue,
  disabled,
  id,
  name,
  onChange,
  placeholder,
  required,
  value,
}: NativeSelectProps) {
  const options = useMemo(() => parseOptions(children), [children])

  const handleValueChange = (nextValue: string | null) => {
    const resolvedValue = nextValue ?? ""

    onChange?.({
      target: { value: resolvedValue },
    } as ChangeEvent<HTMLSelectElement>)
  }

  const placeholderOption = options.find((option) => option.value === "")

  return (
    <BaseSelect.Root<string>
      defaultValue={defaultValue === undefined ? undefined : String(defaultValue)}
      disabled={disabled}
      id={id}
      items={options}
      name={name}
      onValueChange={handleValueChange}
      required={required}
      value={value === undefined ? undefined : String(value)}
    >
      <BaseSelect.Trigger className={cn("app-field-trigger", className)}>
        <BaseSelect.Value placeholder={placeholder || placeholderOption?.label || "Selecione"} />
        <BaseSelect.Icon className="text-muted-foreground transition data-[open]:rotate-180">
          <ChevronDown size={16} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>

      <BaseSelect.Portal>
        <BaseSelect.Positioner
          alignItemWithTrigger={false}
          className="z-50 outline-none"
          sideOffset={8}
        >
          <BaseSelect.Popup className="app-field-popup min-w-[var(--anchor-width)]">
            <BaseSelect.List className="max-h-72 overflow-y-auto">
              {options.map((option) => (
                <BaseSelect.Item
                  key={`${option.value}-${String(option.label)}`}
                  className="app-field-item"
                  disabled={option.disabled}
                  value={option.value}
                >
                  <BaseSelect.ItemText className="truncate">{option.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className="text-primary">
                    <Check size={15} />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  )
}
