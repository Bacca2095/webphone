<script lang="ts" setup>
import type { CalendarCellProps } from "reka-ui"
import type { HTMLAttributes, ComputedRef } from "vue"
import { computed, inject } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { CalendarCell, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<CalendarCellProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
const forwardedProps = useForwardProps(delegatedProps)

const eventDates = inject<ComputedRef<Set<string>>>('calendarEventDates', computed(() => new Set<string>()))

const hasEvent = computed(() => {
  if (!props.date) return false
  const key = `${props.date.year}-${String(props.date.month).padStart(2, '0')}-${String(props.date.day).padStart(2, '0')}`
  return eventDates.value.has(key)
})
</script>

<template>
  <CalendarCell
    data-slot="calendar-cell"
    :class="cn('relative p-0 pb-2 text-center text-sm focus-within:relative focus-within:z-20 flex-1', props.class)"
    v-bind="forwardedProps"
  >
    <slot />
    <span
      v-if="hasEvent"
      class="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary pointer-events-none"
    />
  </CalendarCell>
</template>
