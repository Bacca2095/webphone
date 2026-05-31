<script setup lang="ts">
import { Keyboard, NotebookPen, ChevronDown, ChevronUp } from '@lucide/vue'

const props = defineProps<{
  showPad: boolean
  hasNotes: boolean
}>()

const emit = defineEmits<{
  'toggle-pad': []
  'open-notes': []
}>()
</script>

<template>
  <div class="flex items-center justify-center gap-4 pt-1 pb-2">
    <button
      class="flex items-center gap-1.5 text-xs transition-colors"
      :class="showPad ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'"
      @click="emit('toggle-pad')"
    >
      <Keyboard class="size-3.5" />
      Teclado
      <ChevronUp v-if="showPad" class="size-3" />
      <ChevronDown v-else class="size-3" />
    </button>
    <button
      class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      @click="emit('open-notes')"
    >
      <NotebookPen class="size-3.5" />
      Notas
      <span v-if="hasNotes" class="size-1.5 rounded-full bg-amber-400 inline-block" />
    </button>
  </div>
</template>
