<script setup lang="ts">
import { ref, computed } from 'vue'
import { Trash2, Plus } from '@lucide/vue'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useWebPhoneStore } from '@/stores/webphone'

const props = defineProps<{
  remoteUri: string
  remoteName: string
}>()

const store = useWebPhoneStore()

const notesForNumber = computed(() =>
  store.notes.filter(n => n.remoteUri === props.remoteUri),
)

const newText = ref('')
const MAX_CHARS = 500

const save = () => {
  const text = newText.value.trim()
  if (!text) return
  store.addNote(props.remoteUri, props.remoteName, text)
  newText.value = ''
}

const fmt = (date: Date): string => {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `hace ${mins}m`
  if (hours < 24) return `hace ${hours}h`
  return `hace ${days}d`
}
</script>

<template>
  <div class="px-3 pb-3 pt-1 flex flex-col gap-2">
    <div v-if="notesForNumber.length" class="overflow-y-auto max-h-36 flex flex-col gap-1.5">
      <div
        v-for="note in notesForNumber"
        :key="note.id"
        class="group flex gap-2 rounded-lg bg-muted/40 px-2.5 py-2"
      >
        <p class="flex-1 min-w-0 text-xs leading-relaxed whitespace-pre-wrap wrap-break-word">{{ note.text }}</p>
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
    <p v-else class="text-xs text-muted-foreground/60 text-center py-2">Sin notas para este número</p>

    <div class="space-y-1">
      <Textarea
        v-model="newText"
        :maxlength="MAX_CHARS"
        class="h-20 text-sm"
        placeholder="Nueva nota…"
        @keydown.ctrl.enter.prevent="save"
        @keydown.meta.enter.prevent="save"
      />
      <div class="flex items-center justify-between">
        <span class="text-[10px] tabular-nums text-muted-foreground/60">{{ newText.length }}/{{ MAX_CHARS }}</span>
        <Button size="sm" variant="outline" class="h-7 gap-1.5 text-xs" :disabled="!newText.trim()" @click="save">
          <Plus class="size-3" /> Guardar
        </Button>
      </div>
    </div>
  </div>
</template>
