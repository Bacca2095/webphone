<script setup lang="ts">
import { PhoneIncoming } from '@lucide/vue'
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

defineProps<{
  channel: CallInfo
}>()

const label = (ch: CallInfo) => ch.remoteName || ch.remoteUri
const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
const isOnHold = (status: CallInfo['status']) => status === 'held' || status === 'remote_held'
</script>

<template>
  <div class="px-5 pt-4 pb-2 text-center">
    <template v-if="channel.status === 'ringing'">
      <PhoneIncoming class="size-5 text-blue-500 mx-auto mb-1 animate-bounce" />
      <p class="text-xs text-blue-500 font-medium mb-1">Llamada entrante</p>
      <p class="font-semibold text-base truncate">{{ label(channel) }}</p>
      <p v-if="channel.remoteName" class="text-xs text-muted-foreground truncate mt-0.5">
        {{ channel.remoteUri }}
      </p>
    </template>

    <template v-else>
      <div
        class="size-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
        :class="STATUS_COLOR[channel.status]"
      >
        {{ label(channel).charAt(0).toUpperCase() }}
      </div>
      <p class="font-semibold text-sm truncate">{{ label(channel) }}</p>
      <p v-if="channel.remoteName" class="text-xs text-muted-foreground truncate">
        {{ channel.remoteUri }}
      </p>
      <p
        class="text-sm mt-1 tabular-nums font-medium"
        :class="
          channel.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-amber-500'
        "
      >
        {{
          channel.startTime
            ? fmt(channel.duration)
            : channel.status === 'connecting'
              ? 'Conectando…'
              : isOnHold(channel.status)
                ? 'En espera'
                : ''
        }}
      </p>
    </template>
  </div>
</template>
