<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useDraggable, useDark, useToggle } from '@vueuse/core'
import { Mic, AlertTriangle } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useWebPhone } from '@/composables/useWebPhone'
import { useAudioDevices } from '@/composables/useAudioDevices'
import { useSipConfig } from '@/composables/useSipConfig'
import { playDTMF, startRing, startRingback, playHangup } from '@/composables/useSounds'
import { setOutputMuted } from '@/core/sip'
import type { WebPhoneConfig, Contact } from '@/types'
import PhoneHeader from './webphone/PhoneHeader.vue'
import ChannelTabs from './webphone/ChannelTabs.vue'
import CallDisplay from './webphone/CallDisplay.vue'
import PanelToggle from './webphone/PanelToggle.vue'
import DialSection from './webphone/DialSection.vue'
import CallControls from './webphone/CallControls.vue'

const props = defineProps<{
  config?: WebPhoneConfig
  float?: boolean
  contacts?: Contact[]
}>()

const emit = defineEmits<{
  'open-history': []
  'open-notes': [remoteUri?: string]
  'open-contacts': []
  'open-calendar': []
}>()

const rootEl = useTemplateRef<HTMLElement>('root')
const handleEl = useTemplateRef<HTMLElement>('handle')
const { x, y, isDragging } = useDraggable(rootEl, {
  handle: handleEl,
  initialValue: { x: 20, y: 20 },
})
const floatStyle = computed(() =>
  props.float ? { position: 'fixed' as const, left: `${x.value}px`, top: `${y.value}px` } : {},
)

const shadowHost = ref<HTMLElement | null>(null)
const isDark = useDark({ storageKey: 'webphone-color-scheme' })
const toggleDark = useToggle(isDark)
watch(
  isDark,
  (dark) => { shadowHost.value?.classList.toggle('dark', dark) },
  { immediate: true },
)

const {
  channels,
  isRegistered,
  isConnecting,
  notes,
  lastDialed,
  connect,
  call,
  answer,
  hangup,
  hold,
  resume,
  mute,
  unmute,
  sendDTMF,
} = useWebPhone()

const { permission, checkPermission, requestPermission } = useAudioDevices()

onMounted(async () => {
  const rootNode = rootEl.value?.getRootNode()
  if (rootNode instanceof ShadowRoot) shadowHost.value = rootNode.host as HTMLElement
  await checkPermission()
  if (props.config) {
    connect(props.config)
  } else {
    const { sipConfig, isConfigured } = useSipConfig()
    if (isConfigured.value) connect({ ...sipConfig.value })
  }
})

const selectedId = ref<string | null>(null)

const selected = computed(
  () => channels.value.find((ch) => ch.id === selectedId.value) ?? channels.value[0],
)

watch(
  channels,
  (updated) => {
    if (!updated.length) { selectedId.value = null; return }
    if (selectedId.value && updated.find((ch) => ch.id === selectedId.value)) return
    selectedId.value =
      (
        updated.find((ch) => ch.status === 'ringing') ??
        updated.find((ch) => ch.status === 'active') ??
        updated[0]
      )?.id ?? null
  },
  { deep: true },
)

const selectChannel = (id: string | null) => {
  if (!id || id === selectedId.value) return
  const next = channels.value.find((ch) => ch.id === id)
  if (next && (next.status === 'active' || next.status === 'held' || next.status === 'remote_held')) {
    const current = channels.value.find((ch) => ch.id === selectedId.value)
    if (current?.status === 'active') hold(current.id)
    if (next.status === 'held' || next.status === 'remote_held') resume(id)
  }
  selectedId.value = id
}

const dialValue = ref('')
const showPad = ref(true)

const callBtnMode = computed<'call' | 'disabled'>(() =>
  !selected.value && isRegistered.value && !!(dialValue.value || lastDialed.value)
    ? 'call'
    : 'disabled',
)

const selectedHasNotes = computed(() =>
  selected.value ? notes.value.some((n) => n.remoteUri === selected.value!.remoteUri) : false,
)

const isSpeakerMuted = ref(false)
const toggleSpeaker = () => {
  isSpeakerMuted.value = !isSpeakerMuted.value
  setOutputMuted(isSpeakerMuted.value)
}

let stopRing: (() => void) | null = null
let stopRingback: (() => void) | null = null

watch(
  () => channels.value.some((ch) => ch.status === 'ringing'),
  (ringing) => {
    if (ringing && !stopRing) stopRing = startRing()
    else if (!ringing && stopRing) { stopRing(); stopRing = null }
  },
)

watch(
  () => channels.value.some((ch) => ch.status === 'connecting'),
  (connecting) => {
    if (connecting && !stopRingback) stopRingback = startRingback()
    else if (!connecting && stopRingback) { stopRingback(); stopRingback = null }
  },
)

watch(
  () => channels.value.length,
  (count, prevCount) => {
    if (count < prevCount) {
      playHangup()
      if (count === 0) isSpeakerMuted.value = false
    }
  },
)

onUnmounted(() => { stopRing?.(); stopRingback?.() })

defineExpose({ el: rootEl })

const onDigit = (key: string) => {
  playDTMF(key)
  if (selected.value) sendDTMF(selected.value.id, key)
}

const onBack = () => { dialValue.value = dialValue.value.slice(0, -1) }

const onCallBtn = () => {
  if (callBtnMode.value !== 'call') return
  const target = dialValue.value.trim() || lastDialed.value
  if (target) { call(target); dialValue.value = '' }
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement) return
  if (/^[0-9*#]$/.test(e.key)) {
    playDTMF(e.key)
    dialValue.value += e.key
    if (selected.value) sendDTMF(selected.value.id, e.key)
    return
  }
  if (e.key === 'Backspace') { onBack(); return }
  if (e.key === 'Enter') onCallBtn()
}
</script>

<template>
  <div
    ref="root"
    :style="floatStyle"
    class="w-full max-w-[18rem] rounded-3xl bg-background shadow-md overflow-hidden select-none flex flex-col border"
    :class="{ 'z-50': props.float }"
    @keydown="onKeydown"
    tabindex="-1"
  >
    <div ref="handle">
      <PhoneHeader
        :is-registered="isRegistered"
        :is-connecting="isConnecting"
        :is-dark="isDark"
        :root-el="rootEl"
        :float="props.float"
        :is-dragging="isDragging"
        @toggle-dark="() => toggleDark()"
        @open-history="emit('open-history')"
        @open-notes="emit('open-notes', selected?.remoteUri)"
        @open-contacts="emit('open-contacts')"
        @open-calendar="emit('open-calendar')"
      />
    </div>

    <div v-if="permission === 'denied'" class="px-4 pt-3">
      <Alert variant="destructive">
        <AlertTriangle class="size-4" />
        <AlertDescription class="text-xs">Permiso de micrófono denegado.</AlertDescription>
      </Alert>
    </div>
    <Button
      v-else-if="permission === 'prompt' || permission === 'unknown'"
      variant="outline"
      class="mx-4 mt-3 gap-2 text-sm"
      @click="requestPermission"
    >
      <Mic class="size-4" /> Permitir micrófono
    </Button>

    <ChannelTabs
      v-if="channels.length"
      :channels="channels"
      :selected-id="selectedId"
      @select="selectChannel"
    />

    <CallDisplay v-if="selected" :channel="selected" />

    <PanelToggle
      v-if="channels.length && selected?.status !== 'ringing'"
      :show-pad="showPad"
      :has-notes="selectedHasNotes"
      @toggle-pad="showPad = !showPad"
      @open-notes="emit('open-notes', selected?.remoteUri)"
    />

    <DialSection
      v-if="selected?.status !== 'ringing' && (!channels.length || showPad)"
      v-model="dialValue"
      :external-contacts="props.contacts"
      :has-active-call="!!selected"
      @digit="onDigit"
      @back="onBack"
      @call="onCallBtn"
    />

    <CallControls
      :selected="selected"
      :call-btn-mode="callBtnMode"
      :is-speaker-muted="isSpeakerMuted"
      :last-dialed="lastDialed"
      @call="onCallBtn"
      @answer="answer"
      @hangup="hangup"
      @mute="mute"
      @unmute="unmute"
      @hold="hold"
      @resume="resume"
      @toggle-speaker="toggleSpeaker"
    />
  </div>
</template>
