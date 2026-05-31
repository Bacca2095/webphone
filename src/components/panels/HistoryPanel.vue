<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
import { Phone, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, Search, NotebookText } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { useWebPhoneStore } from '@/stores/webphone'
import type { CallRecord } from '@/types'

const emit = defineEmits<{
  call: [remoteUri: string]
  'open-notes': [remoteUri: string]
}>()

const store = useWebPhoneStore()
const search = ref('')

const historyIconFor = (record: CallRecord): { icon: Component; color: string } => {
  if (record.outcome === 'missed') return { icon: PhoneMissed, color: 'text-red-500' }
  if (record.outcome === 'failed') return { icon: PhoneOff, color: 'text-amber-500' }
  return record.direction === 'incoming'
    ? { icon: PhoneIncoming, color: 'text-green-500' }
    : { icon: PhoneOutgoing, color: 'text-blue-500' }
}

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

const fmtDate = (date: Date): string =>
  date.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return store.history
  return store.history.filter(r =>
    r.remoteUri.toLowerCase().includes(q) || r.remoteName.toLowerCase().includes(q),
  )
})
</script>

<template>
  <div class="flex flex-col gap-4 h-full">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
      <Input v-model="search" placeholder="Buscar por número o nombre…" class="pl-8" />
    </div>

    <div class="flex-1 overflow-y-auto min-h-0">
      <p v-if="!filtered.length" class="text-sm text-muted-foreground text-center py-8">
        {{ search ? 'Sin resultados' : 'Sin llamadas recientes' }}
      </p>

      <div v-else class="divide-y divide-border/50">
        <div
          v-for="record in filtered"
          :key="record.id"
          class="flex items-center gap-3 py-3 px-1 hover:bg-muted/40 rounded-lg group transition-colors cursor-default"
        >
          <component
            :is="historyIconFor(record).icon"
            class="size-4 shrink-0"
            :class="historyIconFor(record).color"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ record.remoteName || record.remoteUri }}</p>
            <p v-if="record.remoteName" class="text-xs text-muted-foreground truncate">{{ record.remoteUri }}</p>
          </div>
          <div class="text-right shrink-0 space-y-0.5">
            <p class="text-xs text-muted-foreground">{{ fmtDate(record.endedAt) }}</p>
            <p v-if="record.outcome === 'answered'" class="text-xs text-muted-foreground tabular-nums">
              {{ fmt(record.duration) }}
            </p>
          </div>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              class="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
              title="Ver notas"
              @click="emit('open-notes', record.remoteUri)"
            >
              <NotebookText class="size-3.5" />
            </button>
            <button
              class="text-muted-foreground hover:text-green-500 p-0.5 transition-colors"
              title="Llamar"
              @click="emit('call', record.remoteUri)"
            >
              <Phone class="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
