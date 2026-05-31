<script lang="ts" setup>
import type { CalendarCellTriggerProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { CalendarCellTrigger, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<CalendarCellTriggerProps & { class?: HTMLAttributes["class"] }>(), {
  as: "button",
})

const delegatedProps = reactiveOmit(props, "class")
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CalendarCellTrigger
    data-slot="calendar-cell-trigger"
    :class="cn(
      'relative size-7 rounded-full p-0 text-xs font-normal cursor-default inline-flex items-center justify-center',
      '[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground',
      'data-selected:bg-primary data-selected:text-primary-foreground',
      'data-disabled:text-muted-foreground data-disabled:opacity-40',
      'data-unavailable:line-through',
      'data-outside-view:text-muted-foreground data-outside-view:opacity-40',
      'hover:bg-accent hover:text-accent-foreground transition-colors',
      props.class,
    )"
    v-bind="forwardedProps"
  >
    <slot />
  </CalendarCellTrigger>
</template>
