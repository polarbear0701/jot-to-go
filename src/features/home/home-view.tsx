import { BookOpen, Clock, FilePlus2, Infinity as InfinityIcon, Star } from 'lucide-react'

import { newCanvas, newNote } from '@/features/page/actions'
import { greeting } from '@/lib/time'
import { useWorkspace } from '@/store/workspace'
import { PageCard } from './page-card'

const QUICK = [
  {
    label: 'New note',
    description: 'Blocks, lists, to-dos & inline sketches',
    icon: FilePlus2,
    tint: 'from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400',
    action: () => newNote(),
  },
  {
    label: 'Notebook canvas',
    description: 'Handwrite on paper pages',
    icon: BookOpen,
    tint: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400',
    action: () => newCanvas('page'),
  },
  {
    label: 'Infinite canvas',
    description: 'A boundless whiteboard',
    icon: InfinityIcon,
    tint: 'from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400',
    action: () => newCanvas('infinite'),
  },
]

export function HomeView() {
  const pages = useWorkspace((s) => s.pages)
  const live = Object.values(pages).filter((p) => !p.trashedAt)
  const recent = [...live].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8)
  const favorites = live.filter((p) => p.favorite)

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
      <h1 className="text-center text-3xl font-semibold tracking-tight">{greeting()}</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Type it, sketch it, or both.</p>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {QUICK.map((q) => (
          <button
            key={q.label}
            onClick={q.action}
            className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${q.tint}`}>
              <q.icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{q.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{q.description}</span>
            </span>
          </button>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Clock className="size-3.5" /> Recently edited
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {recent.map((p) => (
            <PageCard key={p.id} page={p} />
          ))}
        </div>
      </section>

      {favorites.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Star className="size-3.5" /> Favorites
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {favorites.map((p) => (
              <PageCard key={p.id} page={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
