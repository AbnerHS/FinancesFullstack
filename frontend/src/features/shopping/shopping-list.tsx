import { useCallback, useMemo, useState, type FormEvent } from "react"
import {
  Check,
  ClipboardList,
  ClipboardPaste,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import { ConfirmationDialog, type ConfirmationDialogState } from "@/components/ui/confirmation-dialog.tsx"
import { FormDialog } from "@/components/ui/form-dialog.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { PillGroup } from "@/components/ui/pill-group.tsx"
import { pillClassName, PRIMARY_PILL, type PillTone } from "@/components/ui/pill-styles.ts"
import { Textarea } from "@/components/ui/textarea.tsx"
import type { PlanParticipant, ShoppingItem } from "@/features/finance/types.ts"
import { cn } from "@/lib/utils.ts"

import {
  useShoppingItems,
  useShoppingMutations,
  useShoppingSession,
  useWakeLock,
} from "./hooks.ts"
import { ChangeToasts } from "./change-toasts.tsx"
import { useChangeToasts } from "./use-change-toasts.ts"
import {
  canonicalCategory,
  categoryRank,
  categoryStyle,
  DEFAULT_CATEGORIES,
  guessCategory,
  OTHER_CATEGORY,
} from "./categories.ts"
import { parseItemList } from "./parse-list.ts"

const AMBER_PILL: PillTone = {
  selected: "border-amber-500/45 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  hover: "hover:border-amber-500/45 hover:text-amber-700 dark:hover:text-amber-300",
}
const GREEN_PILL: PillTone = {
  selected: "border-emerald-500/45 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  hover: "hover:border-emerald-500/45 hover:text-emerald-700 dark:hover:text-emerald-300",
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()

const byName = (a: ShoppingItem, b: ShoppingItem) =>
  a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })

const compareCategories = (a: string | null, b: string | null) =>
  categoryRank(a) - categoryRank(b) || (a ?? "").localeCompare(b ?? "", "pt-BR", { sensitivity: "base" })

/** Agrupa por categoria, na ordem do mercado ("Outros" no fim). */
function groupByCategory(items: ShoppingItem[]) {
  const groups = new Map<string | null, ShoppingItem[]>()
  for (const item of [...items].sort(byName)) {
    groups.set(item.category, [...(groups.get(item.category) ?? []), item])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => compareCategories(a, b))
    .map(([category, categoryItems]) => ({ category, items: categoryItems }))
}

/** Chave do filtro de categoria ("" = sem categoria). */
const ALL_CATEGORIES = "*"
const categoryKey = (category: string | null) => category ?? ""

type ListFilter = "all" | "missing"

export function ShoppingList({
  planId,
  userId,
  participants,
}: {
  planId: string | null
  userId: string | null
  participants: PlanParticipant[]
}) {
  const nameOf = useCallback(
    (id: string | null) =>
      participants.find((participant) => participant.userId === id)?.name.split(" ")[0] || "Alguém",
    [participants]
  )
  const changeToasts = useChangeToasts(nameOf)
  const { items, isLoading, isError } = useShoppingItems(planId, userId, changeToasts.notify)
  const mutations = useShoppingMutations(planId)
  const session = useShoppingSession(planId, items, !isLoading)
  useWakeLock(session.active)

  const [filter, setFilter] = useState<ListFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES)
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<ConfirmationDialogState | null>(null)

  const missing = items.filter((item) => !item.checked)
  // Categorias criadas pelo usuário (as padrão já aparecem sempre na escolha).
  const customCategories = useMemo(
    () =>
      [...new Set(items.map((item) => item.category).filter((category): category is string => Boolean(category)))]
        .filter((category) => categoryRank(category) === DEFAULT_CATEGORIES.length)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [items]
  )

  const search = normalize(query)
  const matches = search ? items.filter((item) => normalize(item.name).includes(search)) : []
  const exactMatch = search ? items.find((item) => normalize(item.name) === search) : undefined

  const setChecked = (item: ShoppingItem, checked: boolean) =>
    mutations.update.mutate({ id: item.id, payload: { checked } })

  // Adicionar pela busca: produto novo entra como "falta"; um que já existe e está marcado passa a
  // faltar. É o jeito rápido de montar a compra digitando.
  const addFromSearch = (event?: FormEvent) => {
    event?.preventDefault()
    const name = query.trim()
    if (!name) return
    if (exactMatch) {
      if (exactMatch.checked) setChecked(exactMatch, false)
    } else {
      mutations.create.mutate([{ name, checked: false, category: guessCategory(name) }])
    }
    setQuery("")
  }

  const startShopping = () => {
    session.start()
    setQuery("")
  }

  const finishShopping = () => {
    const left = items.filter((item) => session.ids.has(item.id) && !item.checked).length
    if (left === 0) {
      session.finish()
      return
    }
    setConfirmation({
      eyebrow: "Concluir compras",
      title: `${left} ${left === 1 ? "item ficou" : "itens ficaram"} de fora`,
      description: "Eles continuam desmarcados na lista, para a próxima compra.",
      confirmLabel: "Concluir",
      onConfirm: () => {
        session.finish()
        setConfirmation(null)
      },
    })
  }

  const confirmCheckAll = () =>
    setConfirmation({
      eyebrow: "Marcar tudo",
      title: "Marcar todos os produtos?",
      description: `Os ${missing.length} que estão faltando voltam a contar como "tem em casa".`,
      confirmLabel: "Marcar tudo",
      onConfirm: () => {
        mutations.setAll.mutate(true)
        setConfirmation(null)
      },
    })

  if (!planId) {
    return (
      <Card className="border-border bg-secondary/60 p-6 text-center text-sm text-muted-foreground">
        Crie ou selecione um plano para usar a lista de compras.
      </Card>
    )
  }

  const shoppingItems = items.filter((item) => session.ids.has(item.id))
  const toBuy = shoppingItems.filter((item) => !item.checked)
  const inCart = shoppingItems.filter((item) => item.checked).sort(byName)

  return (
    <div className="space-y-4 pb-4">
      <Card className="flex flex-col gap-3 border-border bg-secondary/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="app-eyebrow">{session.active ? "No mercado" : "Lista de compras"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.active
                ? `${inCart.length} de ${shoppingItems.length} no carrinho`
                : items.length === 0
                  ? "Cadastre os produtos que vocês costumam comprar."
                  : `${missing.length} para comprar · ${items.length} produtos`}
            </p>
          </div>
          {session.active ? (
            <Button type="button" className="h-10" onClick={finishShopping}>
              <Check size={16} />
              Concluir compras
            </Button>
          ) : (
            <Button
              type="button"
              className="h-10"
              onClick={startShopping}
              disabled={items.length === 0}
            >
              <ShoppingCart size={16} />
              Ir às compras
            </Button>
          )}
        </div>
        {session.active && shoppingItems.length > 0 ? (
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(inCart.length / shoppingItems.length) * 100}%` }}
            />
          </div>
        ) : null}
      </Card>

      <form onSubmit={addFromSearch} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={session.active ? "Esqueceu algo? Buscar ou adicionar" : "Buscar ou adicionar produto"}
            aria-label="Buscar ou adicionar produto"
            className="pr-10 pl-10"
            enterKeyHint="done"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
        {!session.active ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0"
            onClick={() => setImportOpen(true)}
            title="Colar uma lista"
          >
            <ClipboardPaste size={16} />
            <span className="max-sm:hidden">Colar lista</span>
          </Button>
        ) : null}
      </form>

      {mutations.errorMessage ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {mutations.errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <Card className="border-border bg-secondary/60 p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar a lista.
        </Card>
      ) : search ? (
        <SearchResults
          query={query.trim()}
          matches={matches}
          exactMatch={Boolean(exactMatch)}
          onAdd={() => addFromSearch()}
          onToggle={(item) => {
            setChecked(item, !item.checked)
            setQuery("")
          }}
          onEdit={setEditing}
        />
      ) : session.active ? (
        <ShoppingMode
          toBuy={toBuy}
          inCart={inCart}
          onToggle={(item) => setChecked(item, !item.checked)}
          onEdit={setEditing}
        />
      ) : items.length === 0 ? (
        <EmptyList onImport={() => setImportOpen(true)} />
      ) : (
        <>
          <PillGroup
            id="shopping-filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `Todos (${items.length})`, icon: ClipboardList },
              { value: "missing", label: `Faltando (${missing.length})`, icon: ShoppingCart, tone: AMBER_PILL },
            ]}
          />
          <CategoryFilter
            items={filter === "missing" ? missing : items}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
          {filter === "missing" && missing.length === 0 ? (
            <Card className="border-border bg-secondary/60 p-6 text-center text-sm text-muted-foreground">
              Nada faltando. Desmarque o que precisa comprar.
            </Card>
          ) : (
            <CategoryList
              groups={groupByCategory(
                (filter === "missing" ? missing : items).filter(
                  (item) => categoryFilter === ALL_CATEGORIES || categoryKey(item.category) === categoryFilter
                )
              )}
              onToggle={(item) => setChecked(item, !item.checked)}
              onEdit={setEditing}
            />
          )}
          {missing.length > 0 ? (
            <div className="flex justify-center">
              <Button type="button" variant="ghost" className="text-muted-foreground" onClick={confirmCheckAll}>
                <Check size={16} />
                Marcar tudo como "tem em casa"
              </Button>
            </div>
          ) : null}
        </>
      )}

      <EditItemDialog
        key={editing?.id ?? "none"}
        item={editing}
        customCategories={customCategories}
        onClose={() => setEditing(null)}
        onSave={(payload) => {
          if (!editing) return
          mutations.update.mutate({ id: editing.id, payload })
          setEditing(null)
        }}
        onDelete={() => {
          if (!editing) return
          mutations.remove.mutate(editing.id)
          setEditing(null)
        }}
      />
      <ImportDialog
        open={importOpen}
        pending={mutations.create.isPending}
        onClose={() => setImportOpen(false)}
        onImport={(parsed) =>
          mutations.create.mutateAsync(parsed).then((result) => {
            setImportOpen(false)
            return result
          })
        }
      />
      <ConfirmationDialog state={confirmation} onClose={() => setConfirmation(null)} />
      <ChangeToasts toasts={changeToasts.toasts} onDismiss={changeToasts.dismiss} />
    </div>
  )
}

function ItemRow({
  item,
  onToggle,
  onEdit,
  variant = "list",
}: {
  item: ShoppingItem
  onToggle: () => void
  onEdit: () => void
  /** list: marcado = tem em casa. cart: marcado = no carrinho (riscado). */
  variant?: "list" | "cart"
}) {
  const missing = !item.checked
  const struck = variant === "cart" && item.checked
  // Cor da categoria: a linha mostra de que parte do mercado é o produto.
  const style = categoryStyle(item.category)
  return (
    <li
      className={cn(
        "flex items-center gap-1 rounded-xl border transition",
        missing ? style.rowMissing : style.row,
        struck && "opacity-55"
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        onClick={onToggle}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left"
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition",
            item.checked ? style.box : style.boxEmpty
          )}
          aria-hidden="true"
        >
          {item.checked ? <Check size={15} strokeWidth={3} /> : null}
        </span>
        <span className="min-w-0">
          <span className={cn("block truncate text-[15px] font-medium text-foreground", struck && "line-through")}>
            {item.name}
          </span>
          {item.note ? (
            <span className={cn("block truncate text-xs", style.text)}>{item.note}</span>
          ) : null}
        </span>
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="mr-1 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Editar ${item.name}`}
      >
        <Pencil size={15} />
      </button>
    </li>
  )
}

function CategoryFilter({
  items,
  value,
  onChange,
}: {
  items: ShoppingItem[]
  value: string
  onChange: (value: string) => void
}) {
  const counts = new Map<string | null, number>()
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
  const categories = [...counts.keys()].sort(compareCategories)
  if (categories.length < 2) return null
  // Filtro numa categoria que sumiu (tudo comprado): volta para todas.
  const current = value === ALL_CATEGORIES || categories.some((c) => categoryKey(c) === value) ? value : ALL_CATEGORIES

  return (
    <div
      role="radiogroup"
      aria-label="Filtrar por categoria"
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
    >
      <button
        type="button"
        role="radio"
        aria-checked={current === ALL_CATEGORIES}
        onClick={() => onChange(ALL_CATEGORIES)}
        className={pillClassName(current === ALL_CATEGORIES, PRIMARY_PILL, "h-8 shrink-0 text-xs")}
      >
        Todas
      </button>
      {categories.map((category) => {
        const style = categoryStyle(category)
        const Icon = style.icon
        const key = categoryKey(category)
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={current === key}
            onClick={() => onChange(current === key ? ALL_CATEGORIES : key)}
            className={pillClassName(current === key, style.tone, "h-8 shrink-0 gap-1 px-2.5 text-xs")}
          >
            <Icon size={13} className={current === key ? undefined : style.text} aria-hidden="true" />
            {category ?? OTHER_CATEGORY}
            <span className="opacity-60">{counts.get(category)}</span>
          </button>
        )
      })}
    </div>
  )
}

function CategoryHeader({ category, count }: { category: string | null; count: number }) {
  const style = categoryStyle(category)
  const Icon = style.icon
  return (
    <h3 className="mb-1.5 flex items-center gap-2 px-1">
      <span className={cn("flex size-6 items-center justify-center rounded-lg", style.soft, style.text)}>
        <Icon size={14} aria-hidden="true" />
      </span>
      <span className={cn("text-xs font-semibold tracking-wide uppercase", style.text)}>
        {category ?? OTHER_CATEGORY}
      </span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </h3>
  )
}

function CategoryList({
  groups,
  onToggle,
  onEdit,
  variant,
}: {
  groups: Array<{ category: string | null; items: ShoppingItem[] }>
  onToggle: (item: ShoppingItem) => void
  onEdit: (item: ShoppingItem) => void
  variant?: "list" | "cart"
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={categoryKey(group.category)} aria-label={group.category ?? OTHER_CATEGORY}>
          <CategoryHeader category={group.category} count={group.items.length} />
          <ul className="space-y-1.5">
            {group.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                variant={variant}
                onToggle={() => onToggle(item)}
                onEdit={() => onEdit(item)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function ShoppingMode({
  toBuy,
  inCart,
  onToggle,
  onEdit,
}: {
  toBuy: ShoppingItem[]
  inCart: ShoppingItem[]
  onToggle: (item: ShoppingItem) => void
  onEdit: (item: ShoppingItem) => void
}) {
  return (
    <div className="space-y-5">
      {toBuy.length > 0 ? (
        <CategoryList groups={groupByCategory(toBuy)} onToggle={onToggle} onEdit={onEdit} variant="cart" />
      ) : (
        <Card className="flex flex-col items-center gap-2 border-emerald-500/30 bg-emerald-500/8 p-6 text-center">
          <ShoppingCart className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">
            {inCart.length > 0 ? "Tudo no carrinho!" : "Nada para comprar."}
          </p>
          <p className="text-xs text-muted-foreground">
            {inCart.length > 0
              ? "Toque em Concluir compras quando terminar."
              : "Desmarque na lista o que está faltando, ou busque acima."}
          </p>
        </Card>
      )}
      {inCart.length > 0 ? (
        <section aria-label="No carrinho">
          <h3 className="mb-1.5 px-1 text-xs font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
            No carrinho ({inCart.length})
          </h3>
          <ul className="space-y-1.5">
            {inCart.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                variant="cart"
                onToggle={() => onToggle(item)}
                onEdit={() => onEdit(item)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function SearchResults({
  query,
  matches,
  exactMatch,
  onAdd,
  onToggle,
  onEdit,
}: {
  query: string
  matches: ShoppingItem[]
  exactMatch: boolean
  onAdd: () => void
  onToggle: (item: ShoppingItem) => void
  onEdit: (item: ShoppingItem) => void
}) {
  return (
    <div className="space-y-2">
      {!exactMatch ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/6 px-3 text-left text-sm font-medium text-primary"
        >
          <Plus size={18} className="shrink-0" />
          <span className="min-w-0 truncate">Adicionar “{query}” ao que falta</span>
        </button>
      ) : null}
      {matches.length > 0 ? (
        <ul className="space-y-1.5">
          {[...matches].sort(byName).map((item) => (
            <ItemRow key={item.id} item={item} onToggle={() => onToggle(item)} onEdit={() => onEdit(item)} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function EmptyList({ onImport }: { onImport: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 border-border bg-secondary/60 p-6 text-center">
      <ClipboardList className="text-primary" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Monte a lista com os produtos de sempre</p>
        <p className="text-xs text-muted-foreground">
          Tudo começa marcado (tem em casa). Antes do mercado, desmarque o que falta; nas compras,
          marque o que for para o carrinho.
        </p>
      </div>
      <Button type="button" onClick={onImport}>
        <ClipboardPaste size={16} />
        Colar minha lista
      </Button>
      <p className="text-xs text-muted-foreground">ou digite um produto na busca acima</p>
    </Card>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-1.5" aria-label="Carregando lista">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-xl bg-muted/70" />
      ))}
    </div>
  )
}

/** Escolha da categoria: as padrão (com ícone), as criadas pelo usuário, "Outros" e uma nova. */
function CategoryPicker({
  value,
  onChange,
  customCategories,
}: {
  value: string | null
  onChange: (value: string | null) => void
  customCategories: string[]
}) {
  const known = [...DEFAULT_CATEGORIES.map((category) => category.name), ...customCategories]
  const isNew = value !== null && !known.includes(value)
  const [creating, setCreating] = useState(isNew)

  const pill = (name: string | null, label: string) => {
    const style = categoryStyle(name)
    const Icon = style.icon
    const selected = !creating && value === name
    return (
      <button
        key={label}
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => {
          setCreating(false)
          onChange(name)
        }}
        className={pillClassName(selected, style.tone, "h-8 gap-1 px-2.5 text-xs")}
      >
        <Icon size={13} className={selected ? undefined : style.text} aria-hidden="true" />
        {label}
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <Label id="shopping-category-label">Categoria</Label>
      <div role="radiogroup" aria-labelledby="shopping-category-label" className="flex flex-wrap gap-1.5">
        {known.map((name) => pill(name, name))}
        {pill(null, OTHER_CATEGORY)}
        <button
          type="button"
          role="radio"
          aria-checked={creating}
          onClick={() => {
            setCreating(true)
            onChange(isNew ? value : "")
          }}
          className={pillClassName(creating, PRIMARY_PILL, "h-8 gap-1 px-2.5 text-xs")}
        >
          <Plus size={13} aria-hidden="true" />
          Nova
        </button>
      </div>
      {creating ? (
        <Input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Nome da categoria"
          aria-label="Nome da nova categoria"
          maxLength={40}
          autoFocus
        />
      ) : null}
    </div>
  )
}

function EditItemDialog({
  item,
  customCategories,
  onClose,
  onSave,
  onDelete,
}: {
  item: ShoppingItem | null
  customCategories: string[]
  onClose: () => void
  onSave: (payload: { name: string; category: string | null; note: string | null; checked: boolean }) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(item?.name ?? "")
  const [category, setCategory] = useState<string | null>(item?.category ?? null)
  const [note, setNote] = useState(item?.note ?? "")
  const [status, setStatus] = useState<"have" | "missing">(item?.checked === false ? "missing" : "have")
  const [confirmDelete, setConfirmDelete] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      category: canonicalCategory(category?.trim() || null),
      note: status === "missing" ? note.trim() || null : null,
      checked: status === "have",
    })
  }

  return (
    <FormDialog open={Boolean(item)} title="Editar produto" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="shopping-item-name">Produto</Label>
          <Input
            id="shopping-item-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
          />
        </div>
        <CategoryPicker value={category} onChange={setCategory} customCategories={customCategories} />
        <PillGroup
          id="shopping-item-status"
          label="Situação"
          value={status}
          onChange={setStatus}
          options={[
            { value: "have", label: "Tem em casa", icon: Check, tone: GREEN_PILL },
            { value: "missing", label: "Falta", icon: ShoppingCart, tone: AMBER_PILL },
          ]}
        />
        {status === "missing" ? (
          <div className="space-y-2">
            <Label htmlFor="shopping-item-note">Observação (opcional)</Label>
            <Input
              id="shopping-item-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex.: 2 kg, a marca de sempre"
              maxLength={80}
            />
          </div>
        ) : null}
        <div className="flex items-center gap-2 pt-1">
          {confirmDelete ? (
            <>
              <Button type="button" variant="destructive" className="h-10" onClick={onDelete}>
                <Trash2 size={16} />
                Confirmar exclusão
              </Button>
              <Button type="button" variant="ghost" className="h-10" onClick={() => setConfirmDelete(false)}>
                Manter
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                className="h-10 text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} />
                Excluir
              </Button>
              <Button type="submit" className="ml-auto h-10 min-w-28" disabled={!name.trim()}>
                Salvar
              </Button>
            </>
          )}
        </div>
      </form>
    </FormDialog>
  )
}

function ImportDialog({
  open,
  pending,
  onClose,
  onImport,
}: {
  open: boolean
  pending: boolean
  onClose: () => void
  onImport: (
    items: Array<{ name: string; category: string | null }>
  ) => Promise<{ created: ShoppingItem[]; skipped: string[] }>
}) {
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const parsed = useMemo(() => parseItemList(text), [text])
  const guessed = parsed.filter((item) => item.category).length

  const close = () => {
    setText("")
    setError(null)
    onClose()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (parsed.length === 0) return
    try {
      await onImport(parsed)
      setText("")
      setError(null)
    } catch {
      setError("Não foi possível adicionar os produtos.")
    }
  }

  return (
    <FormDialog open={open} title="Colar lista" onClose={close}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="shopping-import-text">Um produto por linha</Label>
          <Textarea
            id="shopping-import-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={"Arroz\nFeijão\nLeite\n\nLimpeza:\nDetergente"}
            className="min-h-48"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            A categoria é sugerida pelo nome (ex.: detergente → Limpeza); uma linha terminada em “:”
            define a categoria das linhas abaixo. Marcadores (☐, ☑, -, •) são ignorados e repetidos
            ficam de fora. Todos entram marcados (tem em casa).
          </p>
        </div>
        {parsed.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {guessed} de {parsed.length} com categoria
            {guessed < parsed.length ? `; os demais vão para “${OTHER_CATEGORY}” (dá para mudar depois)` : ""}.
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" className="h-10 max-sm:hidden" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" className="h-10 max-sm:flex-1" disabled={parsed.length === 0 || pending}>
            {pending
              ? "Adicionando..."
              : parsed.length === 0
                ? "Adicionar"
                : `Adicionar ${parsed.length} ${parsed.length === 1 ? "produto" : "produtos"}`}
          </Button>
        </div>
      </form>
    </FormDialog>
  )
}
