<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useWebPhoneStore } from '@/stores/webphone'
import type { NoteColor } from '@/types'

const props = defineProps<{
  targetUri?: string
}>()

const emit = defineEmits<{
  call: [remoteUri: string]
}>()

const store = useWebPhoneStore()

const NOTE_COLORS: Array<{ value: NoteColor; bg: string; editBg: string }> = [
  { value: 'yellow', bg: 'bg-yellow-200 dark:bg-yellow-900/70', editBg: 'bg-yellow-100 dark:bg-yellow-950/80' },
  { value: 'green',  bg: 'bg-green-200 dark:bg-green-900/70',   editBg: 'bg-green-100 dark:bg-green-950/80'   },
  { value: 'blue',   bg: 'bg-blue-200 dark:bg-blue-900/70',     editBg: 'bg-blue-100 dark:bg-blue-950/80'     },
  { value: 'pink',   bg: 'bg-pink-200 dark:bg-pink-900/70',     editBg: 'bg-pink-100 dark:bg-pink-950/80'     },
  { value: 'orange', bg: 'bg-orange-200 dark:bg-orange-900/70', editBg: 'bg-orange-100 dark:bg-orange-950/80' },
  { value: 'purple', bg: 'bg-purple-200 dark:bg-purple-900/70', editBg: 'bg-purple-100 dark:bg-purple-950/80' },
]

const DEFAULT_BG = 'bg-muted/50'
const colorMeta = (color?: NoteColor) => NOTE_COLORS.find(c => c.value === color)
const tileBg = (color?: NoteColor) => colorMeta(color)?.bg ?? DEFAULT_BG

type Group = { remoteUri: string; remoteName: string; notes: typeof store.notes }

const grouped = computed<Group[]>(() => {
  const map = new Map<string, Group>()
  for (const note of store.notes) {
    if (!map.has(note.remoteUri))
      map.set(note.remoteUri, { remoteUri: note.remoteUri, remoteName: note.remoteName, notes: [] })
    map.get(note.remoteUri)!.notes.push(note)
  }
  return [...map.values()]
})

const groupLabel = (g: Group) =>
  g.remoteName && g.remoteName !== g.remoteUri ? `${g.remoteName} · ${g.remoteUri}` : g.remoteUri

const fmt = (date: Date) =>
  date.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

// New note form
const newText = ref('')
const newColor = ref<NoteColor | undefined>(undefined)
const MAX_CHARS = 500

const save = () => {
  const text = newText.value.trim()
  if (!text || !props.targetUri) return
  const name = store.notes.find(n => n.remoteUri === props.targetUri)?.remoteName ?? props.targetUri
  store.addNote(props.targetUri, name, text, newColor.value)
  newText.value = ''
  newColor.value = undefined
}

watch(() => props.targetUri, () => { newText.value = ''; newColor.value = undefined })
</script>

<template>
  <div class="flex flex-col gap-3 h-full">
    <!-- Notes grid -->
    <div class="flex-1 overflow-y-auto min-h-0 space-y-4">
      <p v-if="!grouped.length" class="text-sm text-muted-foreground text-center py-8">
        Sin notas guardadas
      </p>

      <div v-for="group in grouped" :key="group.remoteUri">
        <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 truncate">
          {{ groupLabel(group) }}
        </p>

        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="note in group.notes"
            :key="note.id"
            class="group relative rounded-2xl min-h-24 flex flex-col p-2.5"
            :class="tileBg(note.color)"
          >
            <p class="flex-1 text-xs leading-relaxed wrap-break-word whitespace-pre-wrap line-clamp-6">
              {{ note.text }}
            </p>
            <p class="text-[10px] opacity-50 mt-2 shrink-0">{{ fmt(note.createdAt) }}</p>
            <button
              class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-current/40 hover:text-red-500"
              @click.stop="store.removeNote(note.id)"
            >
              <Trash2 class="size-3" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add note — only during an active call -->
    <div v-if="targetUri" class="border-t pt-3 space-y-2 shrink-0">
      <!-- Color picker -->
      <div class="flex items-center gap-2">
        <button
          class="size-5 rounded-full border-2 transition-all bg-muted/60"
          :class="!newColor ? 'border-foreground scale-110' : 'border-transparent'"
          @click="newColor = undefined"
        />
        <button
          v-for="c in NOTE_COLORS"
          :key="c.value"
          class="size-5 rounded-full border-2 transition-all"
          :class="[c.bg, newColor === c.value ? 'border-foreground scale-110' : 'border-transparent opacity-60 hover:opacity-90']"
          @click="newColor = c.value"
        />
      </div>

      <!-- Textarea tinted with selected color -->
      <textarea
        v-model="newText"
        :maxlength="MAX_CHARS"
        rows="3"
        class="w-full rounded-2xl px-3 py-2.5 text-sm resize-none outline-none border border-border transition-colors placeholder:text-muted-foreground"
        :class="newColor ? colorMeta(newColor)?.bg : 'bg-muted/30'"
        placeholder="Nueva nota…"
        @keydown.ctrl.enter.prevent="save"
        @keydown.meta.enter.prevent="save"
      />

      <div class="flex items-center justify-between">
        <span class="text-[10px] tabular-nums text-muted-foreground/40">{{ newText.length }}/{{ MAX_CHARS }}</span>
        <Button size="sm" class="h-7 gap-1 text-xs" :disabled="!newText.trim()" @click="save">
          <Plus class="size-3" /> Guardar
        </Button>
      </div>
    </div>
  </div>
</template>
