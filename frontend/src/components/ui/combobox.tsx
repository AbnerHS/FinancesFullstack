import { Check, ChevronDown } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils.ts"

export type ComboboxOption = {
  label: string
  value: string
}

type ComboboxProps = {
  allowCustomValue?: boolean
  className?: string
  disabled?: boolean
  emptyMessage?: string
  onValueChange: (value: string, matchedOption: ComboboxOption | null) => void
  options: ComboboxOption[]
  placeholder?: string
  preventSubmitOnEnter?: boolean
  selectFirstFilteredOptionOnEnter?: boolean
  value: string
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
}

function autoCapitalizeFirstLetter(value: string) {
  if (!value) {
    return value
  }

  return value.charAt(0).toLocaleUpperCase() + value.slice(1)
}

export function Combobox({
  allowCustomValue = true,
  className,
  disabled,
  emptyMessage = "Nenhum resultado encontrado.",
  onValueChange,
  options,
  placeholder,
  preventSubmitOnEnter = false,
  selectFirstFilteredOptionOnEnter = false,
  value,
}: ComboboxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const normalizedValue = useMemo(() => normalize(value), [value])
  const matchedOption = useMemo(
    () =>
      options.find((option) => normalize(option.label) === normalizedValue) ??
      null,
    [normalizedValue, options]
  )
  const filteredOptions = useMemo(() => {
    if (!normalizedValue) {
      return options
    }

    return options.filter((option) =>
      normalize(option.label).includes(normalizedValue)
    )
  }, [normalizedValue, options])

  useEffect(() => {
    setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1)
  }, [filteredOptions])

  const commitValue = (nextValue: string) => {
    const resolvedValue = autoCapitalizeFirstLetter(nextValue)
    const resolvedMatch =
      options.find(
        (option) => normalize(option.label) === normalize(resolvedValue)
      ) ?? null

    if (!allowCustomValue && !resolvedMatch) {
      onValueChange("", null)
      return
    }

    onValueChange(resolvedValue, resolvedMatch)
  }

  const selectOption = (option: ComboboxOption) => {
    onValueChange(option.label, option)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const highlightedOption =
    highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
      ? filteredOptions[highlightedIndex]
      : null

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        autoCapitalize="sentences"
        autoComplete="off"
        className="app-input pr-11"
        disabled={disabled}
        placeholder={placeholder}
        role="combobox"
        type="text"
        value={value}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onBlur={() => {
          setIsOpen(false)
          if (allowCustomValue && value) {
            commitValue(value)
          }
        }}
        onChange={(event) => {
          commitValue(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => {
          if (!disabled) {
            setIsOpen(true)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            if (!isOpen) {
              setIsOpen(true)
              return
            }

            setHighlightedIndex((current) =>
              filteredOptions.length === 0
                ? -1
                : Math.min(current + 1, filteredOptions.length - 1)
            )
            return
          }

          if (event.key === "ArrowUp") {
            event.preventDefault()
            setHighlightedIndex((current) =>
              filteredOptions.length === 0 ? -1 : Math.max(current - 1, 0)
            )
            return
          }

          if (event.key === "Enter") {
            if (preventSubmitOnEnter) {
              event.preventDefault()
              event.stopPropagation()
            }

            const optionToSelect =
              highlightedOption ??
              (selectFirstFilteredOptionOnEnter && filteredOptions.length > 0
                ? filteredOptions[0]
                : null)

            if (optionToSelect) {
              selectOption(optionToSelect)
            } else if (allowCustomValue) {
              commitValue(value)
              setIsOpen(false)
            }
            return
          }

          if (event.key === "Escape") {
            setIsOpen(false)
          }
        }}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (disabled) {
            return
          }

          setIsOpen((current) => !current)
          inputRef.current?.focus()
        }}
      >
        <ChevronDown size={16} />
      </button>

      {isOpen ? (
        <div className="app-field-popup absolute z-50 mt-2 min-w-full">
          <div className="max-h-72 overflow-y-auto" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = matchedOption?.value === option.value
                const isHighlighted = highlightedOption?.value === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "app-field-item flex w-full items-center justify-between text-left",
                      isHighlighted && "bg-accent text-foreground"
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectOption(option)}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? (
                      <span className="text-primary">
                        <Check size={15} />
                      </span>
                    ) : null}
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
