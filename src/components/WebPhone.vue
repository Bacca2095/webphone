<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, useTemplateRef, type Component } from 'vue'
import { useElementBounding, useDraggable, useDark, useToggle } from '@vueuse/core'
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Mic,
  MicOff,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Delete,
  AlertTriangle,
  Settings,
  Keyboard,
  Clock,
  NotebookPen,
  ChevronDown,
  ChevronUp,
  User,
  Globe,
  Headset,
  ShieldAlert,
  Sun,
  Moon,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Input } from '@/components/ui/input'
import { useWebPhone } from '@/composables/useWebPhone'
import { useAudioDevices } from '@/composables/useAudioDevices'
import { playDTMF, startRing, startRingback, playHangup } from '@/composables/useSounds'
import { setOutputMuted } from '@/core/sip'
import type { CallInfo, CallRecord, WebPhoneConfig, Contact } from '@/types'

const props = defineProps<{
  config?: WebPhoneConfig
  float?: boolean
  contacts?: Contact[]
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
  (dark) => {
    shadowHost.value?.classList.toggle('dark', dark)
  },
  { immediate: true },
)

const {
  channels,
  isRegistered,
  isConnecting,
  history,
  lastDialed,
  connect,
  call,
  answer,
  hangup,
  hold,
  resume,
  mute,
  unmute,
  updateNotes,
  sendDTMF,
} = useWebPhone()

const {
  permission,
  inputDevices,
  outputDevices,
  selectedInputId,
  selectedOutputId,
  inputVolume,
  outputVolume,
  requestPermission,
  checkPermission,
} = useAudioDevices()

onMounted(async () => {
  const rootNode = rootEl.value?.getRootNode()
  if (rootNode instanceof ShadowRoot) shadowHost.value = rootNode.host as HTMLElement

  await checkPermission()
  if (props.config) connect(props.config)
})

const selectedId = ref<string | null>(null)

const selected = computed<CallInfo | undefined>(
  () => channels.value.find((channel) => channel.id === selectedId.value) ?? channels.value[0],
)

watch(
  channels,
  (updatedChannels) => {
    if (!updatedChannels.length) {
      selectedId.value = null
      return
    }
    if (selectedId.value && updatedChannels.find((channel) => channel.id === selectedId.value))
      return
    selectedId.value =
      (
        updatedChannels.find((channel) => channel.status === 'ringing') ??
        updatedChannels.find((channel) => channel.status === 'active') ??
        updatedChannels[0]
      )?.id ?? null
  },
  { deep: true },
)

const selectChannel = (id: string | null) => {
  if (!id || id === selectedId.value) return
  const next = channels.value.find((channel) => channel.id === id)
  if (next && (next.status === 'active' || isOnHold(next.status))) {
    const current = channels.value.find((channel) => channel.id === selectedId.value)
    if (current?.status === 'active') hold(current.id)
    if (isOnHold(next.status)) resume(id)
  }
  selectedId.value = id
}

const dialValue = ref('')
const showPad = ref(true)
const DIAL_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

const callBtnMode = computed<'call' | 'disabled'>(() =>
  !selected.value && isRegistered.value && !!(dialValue.value || lastDialed.value)
    ? 'call'
    : 'disabled',
)

const inputFocused = ref(false)

const contactResults = computed<Contact[]>(() => {
  if (!inputFocused.value || !dialValue.value || !props.contacts?.length || selected.value)
    return []
  const query = dialValue.value.toLowerCase()
  return props.contacts
    .filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) || contact.phone.toLowerCase().includes(query),
    )
    .slice(0, 5)
})

const pickContact = (contact: Contact) => {
  dialValue.value = contact.phone
  inputFocused.value = false
}

const CONTACT_TYPE = {
  internal: {
    icon: User,
    bg: 'bg-blue-100 dark:bg-blue-950',
    color: 'text-blue-600 dark:text-blue-400',
  },
  external: {
    icon: Globe,
    bg: 'bg-gray-100 dark:bg-gray-800',
    color: 'text-gray-600 dark:text-gray-400',
  },
  service: {
    icon: Headset,
    bg: 'bg-violet-100 dark:bg-violet-950',
    color: 'text-violet-600 dark:text-violet-400',
  },
  emergency: {
    icon: ShieldAlert,
    bg: 'bg-red-100 dark:bg-red-950',
    color: 'text-red-600 dark:text-red-400',
  },
} satisfies Record<string, { icon: Component; bg: string; color: string }>

const contactTypeInfo = (contact: Contact) => CONTACT_TYPE[contact.type ?? 'internal']

const dialInputRef = useTemplateRef<HTMLInputElement>('dialInput')
const { bottom: inputBottom, left: inputLeft, width: inputWidth } = useElementBounding(dialInputRef)
const overlayStyle = computed(() => ({
  position: 'fixed' as const,
  top: `${inputBottom.value + 4}px`,
  left: `${inputLeft.value}px`,
  width: `${inputWidth.value}px`,
  zIndex: 50,
}))

const showHistory = ref(false)
const showNotes = ref(false)
const togglePad = () => {
  showPad.value = !showPad.value
  if (showPad.value) showNotes.value = false
}
const toggleNotes = () => {
  showNotes.value = !showNotes.value
  if (showNotes.value) showPad.value = false
}

const currentNotes = computed({
  get: () => selected.value?.notes ?? '',
  set: (v: string) => {
    if (selected.value) updateNotes(selected.value.id, v)
  },
})

const historyIconFor = (record: CallRecord): { icon: Component; color: string } => {
  if (record.outcome === 'missed') return { icon: PhoneMissed, color: 'text-red-500' }
  if (record.outcome === 'failed') return { icon: PhoneOff, color: 'text-amber-500' }
  return record.direction === 'incoming'
    ? { icon: PhoneIncoming, color: 'text-green-500' }
    : { icon: PhoneOutgoing, color: 'text-blue-500' }
}

const timeAgo = (date: Date): string => {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}

const historyItems = computed(() =>
  history.value.map((record) => ({ record, iconInfo: historyIconFor(record) })),
)

const selectHistory = (record: CallRecord) => {
  dialValue.value = record.remoteUri
  showHistory.value = false
}

const callFromHistory = (record: CallRecord) => {
  call(record.remoteUri)
  showHistory.value = false
}

const isSpeakerMuted = ref(false)
const toggleSpeaker = () => {
  isSpeakerMuted.value = !isSpeakerMuted.value
  setOutputMuted(isSpeakerMuted.value)
}

let stopRing: (() => void) | null = null
let stopRingback: (() => void) | null = null

watch(
  () => channels.value.some((channel) => channel.status === 'ringing'),
  (ringing) => {
    if (ringing && !stopRing) {
      stopRing = startRing()
    } else if (!ringing && stopRing) {
      stopRing()
      stopRing = null
    }
  },
)

watch(
  () => channels.value.some((channel) => channel.status === 'connecting'),
  (connecting) => {
    if (connecting && !stopRingback) {
      stopRingback = startRingback()
    } else if (!connecting && stopRingback) {
      stopRingback()
      stopRingback = null
    }
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

onUnmounted(() => {
  stopRing?.()
  stopRingback?.()
})

const onKey = (key: string) => {
  playDTMF(key)
  dialValue.value += key
  if (selected.value) sendDTMF(selected.value.id, key)
}
const onBack = () => {
  dialValue.value = dialValue.value.slice(0, -1)
}
const onCallBtn = () => {
  if (callBtnMode.value !== 'call') return
  const target = dialValue.value.trim() || lastDialed.value
  if (target) {
    call(target)
    dialValue.value = ''
  }
}
const onKeydown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement) return
  if (/^[0-9*#]$/.test(e.key)) {
    onKey(e.key)
    return
  }
  if (e.key === 'Backspace') {
    onBack()
    return
  }
  if (e.key === 'Enter') onCallBtn()
}

const fmt = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
const label = (channel: CallInfo) => channel.remoteName || channel.remoteUri

const STATUS_COLOR: Record<CallInfo['status'], string> = {
  ringing: 'bg-blue-500',
  connecting: 'bg-amber-400',
  active: 'bg-green-500',
  held: 'bg-amber-500',
  remote_held: 'bg-amber-500',
  ended: 'bg-muted-foreground',
  failed: 'bg-destructive',
}
const isOnHold = (status: CallInfo['status']) => status === 'held' || status === 'remote_held'
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
    <div
      ref="handle"
      class="flex items-center justify-between px-5 py-3 bg-muted/70"
      :class="props.float ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''"
    >
      <span class="text-xs font-medium text-muted-foreground">Webphone</span>
      <div class="flex items-center gap-2">
        <span
          class="size-2 rounded-full"
          :class="
            isRegistered
              ? 'bg-green-500'
              : isConnecting
                ? 'bg-amber-400 animate-pulse'
                : 'bg-muted-foreground/30'
          "
        />
        <span class="text-xs text-muted-foreground">{{
          isConnecting ? 'Conectando…' : isRegistered ? 'Registrado' : 'Sin conexión'
        }}</span>

        <button
          class="text-muted-foreground hover:text-foreground transition-colors"
          @click="() => toggleDark()"
        >
          <Sun v-if="isDark" class="size-3.5" />
          <Moon v-else class="size-3.5" />
        </button>

        <button
          class="transition-colors"
          :class="showHistory ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'"
          title="Recientes"
          @click="showHistory = !showHistory"
        >
          <Clock class="size-3.5" />
        </button>

        <Dialog>
          <DialogTrigger as-child>
            <button class="text-muted-foreground hover:text-foreground transition-colors">
              <Settings class="size-3.5" />
            </button>
          </DialogTrigger>
          <DialogContent class="sm:max-w-xs" :to="rootEl ?? undefined">
            <DialogHeader>
              <DialogTitle>Dispositivos de audio</DialogTitle>
              <DialogDescription>Micrófono y altavoz para las llamadas.</DialogDescription>
            </DialogHeader>
            <div v-if="permission === 'granted'" class="space-y-5 pt-2">
              <div class="space-y-2">
                <label class="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
                  ><Mic class="size-3.5" /> Micrófono</label
                >
                <Select v-model="selectedInputId">
                  <SelectTrigger class="w-full"
                    ><SelectValue placeholder="Seleccionar micrófono"
                  /></SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="device in inputDevices"
                      :key="device.deviceId"
                      :value="device.deviceId"
                      >{{ device.label || `Micrófono ${device.deviceId.slice(0, 6)}` }}</SelectItem
                    >
                  </SelectContent>
                </Select>
                <div class="flex items-center gap-3">
                  <Mic class="size-3 text-muted-foreground shrink-0" />
                  <Slider
                    :model-value="[inputVolume]"
                    :min="0"
                    :max="100"
                    :step="1"
                    class="flex-1"
                    @update:model-value="(values) => (inputVolume = values?.[0] ?? inputVolume)"
                  />
                  <span class="text-xs tabular-nums text-muted-foreground w-7 text-right"
                    >{{ inputVolume }}%</span
                  >
                </div>
              </div>
              <div class="space-y-2">
                <label class="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
                  ><Volume2 class="size-3.5" /> Altavoz</label
                >
                <Select v-model="selectedOutputId">
                  <SelectTrigger class="w-full"
                    ><SelectValue placeholder="Seleccionar altavoz"
                  /></SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="device in outputDevices"
                      :key="device.deviceId"
                      :value="device.deviceId"
                      >{{ device.label || `Altavoz ${device.deviceId.slice(0, 6)}` }}</SelectItem
                    >
                  </SelectContent>
                </Select>
                <div class="flex items-center gap-3">
                  <Volume2 class="size-3 text-muted-foreground shrink-0" />
                  <Slider
                    :model-value="[outputVolume]"
                    :min="0"
                    :max="100"
                    :step="1"
                    class="flex-1"
                    @update:model-value="(values) => (outputVolume = values?.[0] ?? outputVolume)"
                  />
                  <span class="text-xs tabular-nums text-muted-foreground w-7 text-right"
                    >{{ outputVolume }}%</span
                  >
                </div>
              </div>
            </div>
            <div v-else class="pt-2">
              <Button class="w-full gap-2" variant="outline" @click="requestPermission"
                ><Mic class="size-4" /> Permitir micrófono</Button
              >
            </div>
          </DialogContent>
        </Dialog>
      </div>
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

    <div v-if="channels.length" class="px-3 pt-2">
      <ToggleGroup
        type="single"
        :model-value="selectedId ?? ''"
        class="w-full gap-1"
        @update:model-value="(value) => selectChannel(value ? String(value) : null)"
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

    <div v-if="selected" class="px-5 pt-4 pb-2 text-center">
      <template v-if="selected.status === 'ringing'">
        <PhoneIncoming class="size-5 text-blue-500 mx-auto mb-1 animate-bounce" />
        <p class="text-xs text-blue-500 font-medium mb-1">Llamada entrante</p>
        <p class="font-semibold text-base truncate">{{ label(selected) }}</p>
        <p v-if="selected.remoteName" class="text-xs text-muted-foreground truncate mt-0.5">
          {{ selected.remoteUri }}
        </p>
      </template>

      <template v-else>
        <div
          class="size-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
          :class="STATUS_COLOR[selected.status]"
        >
          {{ label(selected).charAt(0).toUpperCase() }}
        </div>
        <p class="font-semibold text-sm truncate">{{ label(selected) }}</p>
        <p v-if="selected.remoteName" class="text-xs text-muted-foreground truncate">
          {{ selected.remoteUri }}
        </p>
        <p
          class="text-sm mt-1 tabular-nums font-medium"
          :class="
            selected.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-amber-500'
          "
        >
          {{
            selected.startTime
              ? fmt(selected.duration)
              : selected.status === 'connecting'
                ? 'Conectando…'
                : isOnHold(selected.status)
                  ? 'En espera'
                  : ''
          }}
        </p>
      </template>
    </div>

    <div
      v-if="channels.length && selected?.status !== 'ringing'"
      class="flex items-center justify-center gap-4 pt-1 pb-2"
    >
      <button
        class="flex items-center gap-1.5 text-xs transition-colors"
        :class="showPad ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="togglePad"
      >
        <Keyboard class="size-3.5" />
        Teclado
        <ChevronUp v-if="showPad" class="size-3" />
        <ChevronDown v-else class="size-3" />
      </button>
      <button
        class="flex items-center gap-1.5 text-xs transition-colors"
        :class="showNotes ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="toggleNotes"
      >
        <NotebookPen class="size-3.5" />
        Notas
        <span v-if="selected?.notes" class="size-1.5 rounded-full bg-amber-400 inline-block" />
        <ChevronUp v-if="showNotes" class="size-3" />
        <ChevronDown v-else class="size-3" />
      </button>
    </div>

    <!-- History panel -->
    <div v-if="showHistory" class="flex flex-col px-1 pt-1 pb-2">
      <p v-if="!history.length" class="text-xs text-muted-foreground text-center py-5">
        Sin llamadas recientes
      </p>
      <div v-else class="overflow-y-auto max-h-52">
        <div
          v-for="{ record, iconInfo } in historyItems"
          :key="record.id"
          class="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted/60 group cursor-pointer"
          @click="selectHistory(record)"
        >
          <component :is="iconInfo.icon" class="size-4 shrink-0" :class="iconInfo.color" />
          <div class="flex-1 min-w-0">
            <p class="text-sm truncate">{{ record.remoteName || record.remoteUri }}</p>
            <p v-if="record.remoteName" class="text-xs text-muted-foreground truncate">
              {{ record.remoteUri }}
            </p>
            <p v-if="record.notes" class="text-xs text-muted-foreground/70 truncate italic">
              {{ record.notes }}
            </p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-xs text-muted-foreground">{{ timeAgo(record.endedAt) }}</p>
            <p
              v-if="record.outcome === 'answered'"
              class="text-xs text-muted-foreground tabular-nums"
            >
              {{ fmt(record.duration) }}
            </p>
          </div>
          <button
            class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-green-500 ml-1"
            title="Llamar"
            @click.stop="callFromHistory(record)"
          >
            <Phone class="size-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Notes panel -->
    <div v-else-if="showNotes && selected && selected.status !== 'ringing'" class="px-3 pb-2 pt-1">
      <textarea
        v-model="currentNotes"
        class="w-full h-28 resize-none text-sm rounded-xl border border-border bg-muted/30 p-2.5 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
        placeholder="Notas de la llamada…"
      />
    </div>

    <template v-else-if="selected?.status !== 'ringing' && (!channels.length || showPad)">
      <!-- Input -->
      <div class="flex items-center gap-2 px-3 pt-2 pb-1">
        <Input
          ref="dialInput"
          v-model="dialValue"
          placeholder="Buscar o marcar…"
          class="flex-1 text-center"
          @focus="inputFocused = true"
          @blur="inputFocused = false"
          @keydown.enter.prevent="onCallBtn"
        />
        <button
          v-if="dialValue"
          class="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          @click="onBack"
        >
          <Delete class="size-4" />
        </button>
      </div>

      <Transition
        enter-from-class="opacity-0 -translate-y-1"
        enter-active-class="transition-all duration-150"
        leave-to-class="opacity-0 -translate-y-1"
        leave-active-class="transition-all duration-100"
      >
        <div
          v-if="contactResults.length"
          :style="overlayStyle"
          class="bg-background border border-border/60 rounded-2xl shadow-lg overflow-hidden"
        >
          <button
            v-for="contact in contactResults"
            :key="contact.id"
            class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
            @mousedown.prevent
            @click="pickContact(contact)"
          >
            <div
              class="size-7 rounded-full flex items-center justify-center shrink-0"
              :class="contactTypeInfo(contact).bg"
            >
              <component
                :is="contactTypeInfo(contact).icon"
                class="size-3.5"
                :class="contactTypeInfo(contact).color"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate">{{ contact.name }}</p>
              <p class="text-xs text-muted-foreground">{{ contact.phone }}</p>
            </div>
          </button>
        </div>
      </Transition>

      <div class="px-6">
        <div class="grid grid-cols-3 place-items-center gap-y-1">
          <button
            v-for="key in DIAL_KEYS"
            :key="key"
            class="size-12 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all text-lg font-light"
            @click="onKey(key)"
          >
            {{ key }}
          </button>
        </div>
      </div>
    </template>

    <div class="flex items-center justify-center gap-3 px-6 py-4">
      <template v-if="!selected">
        <button
          class="size-11 rounded-full flex items-center justify-center transition-all active:scale-95"
          :class="
            callBtnMode === 'call'
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          "
          :title="!dialValue && lastDialed ? `Rellamar: ${lastDialed}` : 'Llamar'"
          :disabled="callBtnMode !== 'call'"
          @click="onCallBtn"
        >
          <Phone class="size-4" />
        </button>
      </template>

      <template v-else-if="selected.status === 'ringing'">
        <button
          class="size-11 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors active:scale-95"
          title="Contestar"
          @click="answer(selected.id)"
        >
          <Phone class="size-4" />
        </button>
        <button
          class="size-11 rounded-full bg-destructive hover:bg-destructive/90 text-white flex items-center justify-center transition-colors active:scale-95"
          title="Rechazar"
          @click="hangup(selected.id)"
        >
          <PhoneMissed class="size-4" />
        </button>
      </template>

      <template v-else>
        <button
          class="size-11 rounded-full flex items-center justify-center transition-colors active:scale-95"
          :class="selected.isMuted ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/70'"
          title="Silenciar / Activar"
          @click="selected.isMuted ? unmute(selected.id) : mute(selected.id)"
        >
          <MicOff v-if="selected.isMuted" class="size-4" />
          <Mic v-else class="size-4" />
        </button>
        <button
          class="size-11 rounded-full flex items-center justify-center bg-muted hover:bg-muted/70 transition-colors active:scale-95"
          :title="isOnHold(selected.status) ? 'Reanudar' : 'Espera'"
          @click="isOnHold(selected.status) ? resume(selected.id) : hold(selected.id)"
        >
          <Play v-if="isOnHold(selected.status)" class="size-4" />
          <Pause v-else class="size-4" />
        </button>
        <button
          class="size-11 rounded-full flex items-center justify-center transition-colors active:scale-95"
          :class="isSpeakerMuted ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/70'"
          title="Silenciar altavoz"
          @click="toggleSpeaker"
        >
          <VolumeX v-if="isSpeakerMuted" class="size-4" />
          <Volume2 v-else class="size-4" />
        </button>
        <button
          class="size-11 rounded-full flex items-center justify-center bg-destructive hover:bg-destructive/90 text-white transition-colors active:scale-95"
          title="Colgar"
          @click="hangup(selected.id)"
        >
          <PhoneOff class="size-4" />
        </button>
      </template>
    </div>
  </div>
</template>
