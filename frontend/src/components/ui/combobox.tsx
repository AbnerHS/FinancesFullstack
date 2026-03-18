import { Combobox as BaseCombobox } from "@base-ui/react/combobox"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils.ts"

export type ComboboxOption = {
  label: string
  value: string
}

type ComboboxProps = {
  className?: string
  disabled?: boolean
  emptyMessage?: string
  onValueChange: (value: string, matchedOption: ComboboxOption | null) => void
  options: ComboboxOption[]
  placeholder?: string
  value: string
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase()
}

export function Combobox({
  className,
  disabled,
  emptyMessage = "Nenhum resultado encontrado.",
  onValueChange,
  options,
  placeholder,
  value,
}: ComboboxProps) {
  const selectedOption =
    options.find((option) => normalize(option.label) === normalize(value)) ?? null

  return (
    <BaseCombobox.Root<ComboboxOption>
      autoHighlight
      disabled={disabled}
      inputValue={value}
      isItemEqualToValue={(item, selected) => item.value === selected.value}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.value}
      items={options}
      onInputValueChange={(nextValue) => {
        const matchedOption =
          options.find((option) => normalize(option.label) === normalize(nextValue)) ?? null

        onValueChange(nextValue, matchedOption)
      }}
      onValueChange={(nextOption) => {
        const matchedOption = nextOption ?? null
        onValueChange(matchedOption?.label ?? "", matchedOption)
      }}
      openOnInputClick
      value={selectedOption}
    >
      <div className={cn("relative", className)}>
        <BaseCombobox.Input
          className="app-input pr-11"
          placeholder={placeholder}
        />
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground">
          <ChevronDown size={16} />
        </span>
      </div>

      <BaseCombobox.Portal>
        <BaseCombobox.Positioner className="z-50 outline-none" sideOffset={8}>
          <BaseCombobox.Popup className="app-field-popup min-w-[var(--anchor-width)]">
            <BaseCombobox.List className="max-h-72 overflow-y-auto">
              {options.map((option, index) => (
                <BaseCombobox.Item
                  key={option.value}
                  className="app-field-item"
                  index={index}
                  value={option}
                >
                  <span className="truncate">{option.label}</span>
                  <BaseCombobox.ItemIndicator className="text-primary">
                    <Check size={15} />
                  </BaseCombobox.ItemIndicator>
                </BaseCombobox.Item>
              ))}
              <BaseCombobox.Empty className="px-3 py-2 text-sm text-muted-foreground">
                {emptyMessage}
              </BaseCombobox.Empty>
            </BaseCombobox.List>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  )
}
