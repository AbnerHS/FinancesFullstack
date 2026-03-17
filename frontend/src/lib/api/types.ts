export type LinkObject = {
  href: string
}

export type EmbeddedCollection<T, Key extends string> = {
  _embedded?: Record<Key, T[]>
}

export type EntityModel<T> = T & {
  _links?: Record<string, LinkObject>
}
