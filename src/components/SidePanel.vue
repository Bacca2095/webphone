<script setup lang="ts">
import { X } from '@lucide/vue'

defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-from-class="translate-x-full"
      enter-active-class="transition-transform duration-300 ease-out"
      leave-to-class="translate-x-full"
      leave-active-class="transition-transform duration-200 ease-in"
    >
      <div
        v-if="open"
        class="fixed right-0 top-0 h-full w-80 sm:w-96 bg-background border-l shadow-2xl z-40 flex flex-col"
      >
        <div class="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h2 class="text-sm font-semibold">{{ title }}</h2>
          <button
            class="text-muted-foreground hover:text-foreground transition-colors"
            @click="emit('close')"
          >
            <X class="size-4" />
          </button>
        </div>
        <div class="flex-1 overflow-hidden p-4">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
