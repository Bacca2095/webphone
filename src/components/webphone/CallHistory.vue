<script setup lang="ts">
import { ref, type Component } from 'vue'
import { Phone, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, NotebookPen } from '@lucide/vue'
import type { CallRecord } from '@/types'

const props = defineProps<{
  history: CallRecord[]
}>()

const emit = defineEmits<{
  select: [record: CallRecord]
  call: [record: CallRecord]
}>()

const expandedNoteId = ref<string | null>(null)

const historyIconFor = (record: CallRecord): { icon: Component; color: string } => {
  if (record.outcome === 'missed') return { icon: PhoneMissed, color: 'text-red-500' }
  if (record.outcome === 'failed') return { icon: PhoneOff, color: 'text-amber-500' }
  return record.direction === 'incoming'
    ? { icon: PhoneIncoming, color: 'text-green-500' }
    : { icon: PhoneOutgoing, color: 'text-blue-500' }
}

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

const timeAgo = (date: Date): string => {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}

const toggleNote = (id: string) => {
  expandedNoteId.value = expandedNoteId.value === id ? null : id
}
</script>

<template>
  <div class="flex flex-col px-1 pt-1 pb-2">
    <p v-if="!history.length" class="text-xs text-muted-foreground text-center py-5">
      Sin llamadas recientes
    </p>
    <div v-else class="overflow-y-auto max-h-52">
      <div
        v-for="record in history"
        :key="record.id"
        class="px-3 py-1.5"
      >
        <div class="flex items-center gap-2">
          <component
            :is="historyIconFor(record).icon"
            class="size-3.5 shrink-0"
            :class="historyIconFor(record).color"
          />
          <span class="flex-1 min-w-0 text-sm truncate">
            {{ record.remoteName || record.remoteUri }}
          </span>
          <span class="text-xs text-muted-foreground tabular-nums shrink-0">
            {{ timeAgo(record.endedAt) }}
          </span>
          <span
            v-if="record.outcome === 'answered'"
            class="text-xs text-muted-foreground tabular-nums shrink-0"
          >
            {{ fmt(record.duration) }}
          </span>
          <button
            v-if="record.notes"
            class="shrink-0 transition-colors"
            :class="expandedNoteId === record.id ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400'"
            title="Ver nota"
            @click="toggleNote(record.id)"
          >
            <NotebookPen class="size-3.5" />
          </button>
          <button
            class="shrink-0 text-muted-foreground hover:text-green-500 transition-colors"
            title="Llamar"
            @click="emit('call', record)"
          >
            <Phone class="size-3.5" />
          </button>
        </div>
        <p
          v-if="expandedNoteId === record.id && record.notes"
          class="mt-1 ml-5 text-xs text-muted-foreground italic"
        >
          {{ record.notes }}
        </p>
      </div>
    </div>
  </div>
</template>
