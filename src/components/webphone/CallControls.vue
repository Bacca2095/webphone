<script setup lang="ts">
import { Phone, PhoneOff, PhoneMissed, Mic, MicOff, Pause, Play, Volume2, VolumeX } from '@lucide/vue'
import type { CallInfo } from '@/types'

defineProps<{
  selected?: CallInfo
  callBtnMode: 'call' | 'disabled'
  isSpeakerMuted: boolean
  lastDialed: string | null
}>()

const emit = defineEmits<{
  call: []
  answer: [id: string]
  hangup: [id: string]
  mute: [id: string]
  unmute: [id: string]
  hold: [id: string]
  resume: [id: string]
  'toggle-speaker': []
}>()

const isOnHold = (status: CallInfo['status']) => status === 'held' || status === 'remote_held'
</script>

<template>
  <div class="flex items-center justify-center gap-3 px-6 py-4">
    <template v-if="!selected">
      <button
        class="size-11 rounded-full flex items-center justify-center transition-all active:scale-95"
        :class="
          callBtnMode === 'call'
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        "
        :title="!lastDialed ? 'Llamar' : `Rellamar: ${lastDialed}`"
        :disabled="callBtnMode !== 'call'"
        @click="emit('call')"
      >
        <Phone class="size-4" />
      </button>
    </template>

    <template v-else-if="selected.status === 'ringing'">
      <button
        class="size-11 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors active:scale-95"
        title="Contestar"
        @click="emit('answer', selected.id)"
      >
        <Phone class="size-4" />
      </button>
      <button
        class="size-11 rounded-full bg-destructive hover:bg-destructive/90 text-white flex items-center justify-center transition-colors active:scale-95"
        title="Rechazar"
        @click="emit('hangup', selected.id)"
      >
        <PhoneMissed class="size-4" />
      </button>
    </template>

    <template v-else>
      <button
        class="size-11 rounded-full flex items-center justify-center transition-colors active:scale-95"
        :class="selected.isMuted ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/70'"
        title="Silenciar / Activar"
        @click="selected.isMuted ? emit('unmute', selected.id) : emit('mute', selected.id)"
      >
        <MicOff v-if="selected.isMuted" class="size-4" />
        <Mic v-else class="size-4" />
      </button>
      <button
        class="size-11 rounded-full flex items-center justify-center bg-muted hover:bg-muted/70 transition-colors active:scale-95"
        :title="isOnHold(selected.status) ? 'Reanudar' : 'Espera'"
        @click="isOnHold(selected.status) ? emit('resume', selected.id) : emit('hold', selected.id)"
      >
        <Play v-if="isOnHold(selected.status)" class="size-4" />
        <Pause v-else class="size-4" />
      </button>
      <button
        class="size-11 rounded-full flex items-center justify-center transition-colors active:scale-95"
        :class="isSpeakerMuted ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/70'"
        title="Silenciar altavoz"
        @click="emit('toggle-speaker')"
      >
        <VolumeX v-if="isSpeakerMuted" class="size-4" />
        <Volume2 v-else class="size-4" />
      </button>
      <button
        class="size-11 rounded-full flex items-center justify-center bg-destructive hover:bg-destructive/90 text-white transition-colors active:scale-95"
        title="Colgar"
        @click="emit('hangup', selected.id)"
      >
        <PhoneOff class="size-4" />
      </button>
    </template>
  </div>
</template>
