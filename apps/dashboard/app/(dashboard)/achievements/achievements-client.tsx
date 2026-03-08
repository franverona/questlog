'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateAchievementSchema, type CreateAchievement } from '@questlog/types'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { AchievementRow } from './page'
import { toast } from 'sonner'

type Props = { initialAchievements: AchievementRow[] }

export function AchievementsClient({ initialAchievements }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AchievementRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const form = useForm<CreateAchievement>({
    resolver: zodResolver(CreateAchievementSchema),
    defaultValues: { name: '', description: '', iconUrl: '', points: 0 },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', description: '', iconUrl: '', points: 0 })
    setError('')
    setOpen(true)
  }

  function openEdit(a: AchievementRow) {
    setEditing(a)
    form.reset({
      name: a.name,
      description: a.description ?? '',
      iconUrl: a.iconUrl ?? '',
      points: a.points,
    })
    setError('')
    setOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this achievement? This cannot be undone.')) return
    const res = await fetch(`/api/achievements/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
      toast.success('Achievement deleted')
    } else {
      toast.error('An error ocurred when deleting the achievement.')
    }
  }

  async function onSubmit(values: CreateAchievement) {
    setLoading(true)
    setError('')
    try {
      const url = editing ? `/api/achievements/${editing.id}` : '/api/achievements'
      const method = editing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.message ?? 'Request failed')
      }

      setOpen(false)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Achievements</h1>
          <p className="text-muted-foreground mt-1">{initialAchievements.length} total</p>
        </div>
        <Button onClick={openCreate}>New Achievement</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialAchievements.map((a) => (
          <div key={a.id} className="border rounded-lg p-4 bg-card flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {a.iconUrl && <Image src={a.iconUrl} alt="" width={32} height={32} />}
                <h3 className="font-semibold">{a.name}</h3>
              </div>
              <Badge variant="secondary">{a.points} pts</Badge>
            </div>
            {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
            <div className="flex gap-2 mt-auto pt-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(a)}>
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(a.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {initialAchievements.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          No achievements yet. Create your first one!
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Achievement' : 'New Achievement'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...form.register('description')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iconUrl">Icon URL</Label>
              <Input id="iconUrl" placeholder="https://..." {...form.register('iconUrl')} />
              {form.formState.errors.iconUrl && (
                <p className="text-xs text-destructive">{form.formState.errors.iconUrl.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                min={0}
                {...form.register('points', { valueAsNumber: true })}
              />
              {form.formState.errors.points && (
                <p className="text-xs text-destructive">{form.formState.errors.points.message}</p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
