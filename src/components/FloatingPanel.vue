<script setup lang="ts">
import { computed } from 'vue'
import { X } from '@lucide/vue'

const props = defineProps<{
  open: boolean
  title: string
  anchorRight: number
  anchorTop: number
  anchorHeight: number
  anchorWidth: number
  overrideHeight?: number
}>()

const emit = defineEmits<{ close: [] }>()

const style = computed(() => ({
  left: `${props.anchorRight + 12}px`,
  top: `${props.anchorTop}px`,
  height: `${props.overrideHeight ?? props.anchorHeight}px`,
  width: `${props.anchorWidth}px`,
}))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-from-class="-translate-x-2 opacity-0"
      enter-active-class="transition duration-200 ease-out"
      leave-to-class="-translate-x-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
    >
      <div
        v-if="open"
        :style="style"
        class="fixed bg-background border rounded-3xl shadow-2xl z-40 flex flex-col overflow-hidden"
      >
        <div class="flex items-center justify-between px-5 py-3 bg-muted/70 shrink-0">
          <h2 class="text-xs font-medium text-muted-foreground">{{ title }}</h2>
          <button
            class="text-muted-foreground hover:text-foreground transition-colors"
            @click="emit('close')"
          >
            <X class="size-3.5" />
          </button>
        </div>
        <div class="flex-1 overflow-hidden p-3">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
