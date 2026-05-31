<script setup lang="ts">
import { computed } from 'vue'
import { Trash2, Phone } from '@lucide/vue'
import { useWebPhoneStore } from '@/stores/webphone'
import type { PhoneNote } from '@/types'

const emit = defineEmits<{
  call: [remoteUri: string]
}>()

const store = useWebPhoneStore()

type Group = { remoteUri: string; remoteName: string; notes: PhoneNote[] }

const grouped = computed<Group[]>(() => {
  const map = new Map<string, Group>()
  for (const note of store.notes) {
    if (!map.has(note.remoteUri)) {
      map.set(note.remoteUri, { remoteUri: note.remoteUri, remoteName: note.remoteName, notes: [] })
    }
    map.get(note.remoteUri)!.notes.push(note)
  }
  return [...map.values()]
})

const fmt = (date: Date): string => {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}
</script>

<template>
  <div class="flex flex-col px-1 pt-1 pb-2">
    <p v-if="!grouped.length" class="text-xs text-muted-foreground text-center py-5">
      Sin notas guardadas
    </p>
    <div v-else class="overflow-y-auto max-h-64">
      <div v-for="group in grouped" :key="group.remoteUri" class="px-3 py-2">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-medium truncate">{{ group.remoteName || group.remoteUri }}</span>
          <button
            class="text-muted-foreground hover:text-green-500 transition-colors shrink-0 ml-2"
            title="Llamar"
            @click="emit('call', group.remoteUri)"
          >
            <Phone class="size-3.5" />
          </button>
        </div>
        <div class="flex flex-col gap-1">
          <div
            v-for="note in group.notes"
            :key="note.id"
            class="group flex gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5"
          >
            <p class="flex-1 min-w-0 text-xs leading-relaxed wrap-break-word">{{ note.text }}</p>
            <div class="flex flex-col items-end gap-1 shrink-0">
              <span class="text-[10px] text-muted-foreground/60 tabular-nums">{{ fmt(note.createdAt) }}</span>
              <button
                class="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                @click="store.removeNote(note.id)"
              >
                <Trash2 class="size-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
