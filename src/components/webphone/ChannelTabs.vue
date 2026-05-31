<script setup lang="ts">
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { CallInfo } from '@/types'

const STATUS_COLOR: Record<CallInfo['status'], string> = {
  ringing: 'bg-blue-500',
  connecting: 'bg-amber-400',
  active: 'bg-green-500',
  held: 'bg-amber-500',
  remote_held: 'bg-amber-500',
  ended: 'bg-muted-foreground',
  failed: 'bg-destructive',
}

const props = defineProps<{
  channels: CallInfo[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [id: string | null]
}>()

const label = (ch: CallInfo) => ch.remoteName || ch.remoteUri
</script>

<template>
  <div class="px-3 pt-2">
    <ToggleGroup
      type="single"
      :model-value="selectedId ?? ''"
      class="w-full gap-1"
      @update:model-value="(v) => emit('select', v ? String(v) : null)"
    >
      <ToggleGroupItem
        v-for="channel in channels"
        :key="channel.id"
        :value="channel.id"
        class="flex-1 gap-1.5 text-xs h-8 rounded-full"
      >
        <span class="size-1.5 rounded-full shrink-0" :class="STATUS_COLOR[channel.status]" />
        <span class="truncate max-w-20">{{ label(channel) }}</span>
      </ToggleGroupItem>
    </ToggleGroup>
  </div>
</template>
