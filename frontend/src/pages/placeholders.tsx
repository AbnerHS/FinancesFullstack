type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border bg-card/70 p-8 text-muted-foreground backdrop-blur-xl">
      <h2 className="font-serif text-3xl font-semibold text-foreground">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7">{description}</p>
    </div>
  )
}
