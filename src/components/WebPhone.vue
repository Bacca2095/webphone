<script setup lang="ts">
import { ref, computed, watch, onMounted, useTemplateRef } from 'vue'
import { useElementBounding } from '@vueuse/core'
import { useDraggable } from '@vueuse/core'
import {
  Phone, PhoneOff, PhoneIncoming, PhoneMissed,
  Mic, MicOff, Pause, Play, Volume2,
  Delete, AlertTriangle, Settings, Keyboard,
  ChevronDown, ChevronUp,
  User, Globe, Headset, ShieldAlert,
  Sun, Moon,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Input } from '@/components/ui/input'
import { useWebPhone } from '@/composables/useWebPhone'
import { useAudioDevices } from '@/composables/useAudioDevices'
import type { CallInfo, WebPhoneConfig, Contact } from '@/types'

const props = defineProps<{
  config?: WebPhoneConfig
  float?: boolean
  contacts?: Contact[]
}>()

const rootEl = useTemplateRef<HTMLElement>('root')
const handleEl = useTemplateRef<HTMLElement>('handle')
const { x, y, isDragging } = useDraggable(rootEl, { handle: handleEl, initialValue: { x: 20, y: 20 } })
const floatStyle = computed(() =>
  props.float ? { position: 'fixed' as const, left: `${x.value}px`, top: `${y.value}px` } : {},
)

const shadowHost = ref<HTMLElement | null>(null)
const darkMode = ref(false)
const toggleDark = () => { darkMode.value = !darkMode.value }
watch(darkMode, (isDark) => { shadowHost.value?.classList.toggle('dark', isDark) })

const { channels, isRegistered, isConnecting, call, answer, hangup, hold, resume, mute, unmute, sendDTMF } = useWebPhone()

const { permission, inputDevices, outputDevices, selectedInputId, selectedOutputId, inputVolume, outputVolume, requestPermission, checkPermission } = useAudioDevices()

onMounted(async () => {
  const rootNode = rootEl.value?.getRootNode()
  if (rootNode instanceof ShadowRoot) shadowHost.value = rootNode.host as HTMLElement

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  darkMode.value = mq.matches
  mq.addEventListener('change', (e) => { darkMode.value = e.matches })

  await checkPermission()
  if (props.config) { const { connect } = useWebPhone(); connect(props.config) }
})

const selectedId = ref<string | null>(null)

const selected = computed<CallInfo | undefined>(() =>
  channels.value.find(c => c.id === selectedId.value) ?? channels.value[0],
)

watch(channels, (chs) => {
  if (!chs.length) { selectedId.value = null; return }
  if (selectedId.value && chs.find(c => c.id === selectedId.value)) return
  selectedId.value = (chs.find(c => c.status === 'ringing') ?? chs.find(c => c.status === 'active') ?? chs[0])?.id ?? null
}, { deep: true })

const selectChannel = (id: string | null) => {
  if (!id || id === selectedId.value) return
  const next = channels.value.find(c => c.id === id)
  if (next && (next.status === 'active' || isOnHold(next.status))) {
    const current = channels.value.find(c => c.id === selectedId.value)
    if (current?.status === 'active') hold(current.id)
    if (isOnHold(next.status)) resume(id)
  }
  selectedId.value = id
}

const dialValue = ref('')
const showPad = ref(true)
const DIAL_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

const callBtnMode = computed<'call' | 'disabled'>(() =>
  !selected.value && dialValue.value && isRegistered.value ? 'call' : 'disabled',
)

const contactResults = computed<Contact[]>(() => {
  if (!dialValue.value || !props.contacts?.length || selected.value) return []
  const q = dialValue.value.toLowerCase()
  return props.contacts
    .filter(c => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q))
    .slice(0, 5)
})

const pickContact = (c: Contact) => {
  dialValue.value = c.phone
}

const CONTACT_TYPE = {
  internal:  { icon: User,         bg: 'bg-blue-100 dark:bg-blue-950',    color: 'text-blue-600 dark:text-blue-400'   },
  external:  { icon: Globe,        bg: 'bg-gray-100 dark:bg-gray-800',    color: 'text-gray-600 dark:text-gray-400'   },
  service:   { icon: Headset,      bg: 'bg-violet-100 dark:bg-violet-950',color: 'text-violet-600 dark:text-violet-400'},
  emergency: { icon: ShieldAlert,  bg: 'bg-red-100 dark:bg-red-950',      color: 'text-red-600 dark:text-red-400'     },
} satisfies Record<string, { icon: unknown; bg: string; color: string }>

const contactTypeInfo = (c: Contact) => CONTACT_TYPE[c.type ?? 'internal']

const dialInputRef = useTemplateRef<HTMLInputElement>('dialInput')
const { bottom: inputBottom, left: inputLeft, width: inputWidth } = useElementBounding(dialInputRef)
const overlayStyle = computed(() => ({
  position: 'fixed' as const,
  top: `${inputBottom.value + 4}px`,
  left: `${inputLeft.value}px`,
  width: `${inputWidth.value}px`,
  zIndex: 50,
}))

const onKey = (d: string) => { dialValue.value += d; if (selected.value) sendDTMF(selected.value.id, d) }
const onBack = () => { dialValue.value = dialValue.value.slice(0, -1) }
const onCallBtn = () => {
  if (callBtnMode.value === 'call') { call(dialValue.value.trim()); dialValue.value = '' }
}
const onKeydown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement) return
  if (/^[0-9*#]$/.test(e.key)) { onKey(e.key); return }
  if (e.key === 'Backspace') { onBack(); return }
  if (e.key === 'Enter') onCallBtn()
}

const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
const label = (ch: CallInfo) => ch.remoteName || ch.remoteUri

const DOT: Record<CallInfo['status'], string> = {
  ringing: 'bg-blue-500', connecting: 'bg-amber-400', active: 'bg-green-500',
  held: 'bg-amber-500', remote_held: 'bg-amber-500', ended: 'bg-muted-foreground', failed: 'bg-destructive',
}
const AVATAR: Record<CallInfo['status'], string> = {
  ringing: 'bg-blue-500', connecting: 'bg-amber-400', active: 'bg-green-500',
  held: 'bg-amber-500', remote_held: 'bg-amber-500', ended: 'bg-muted-foreground', failed: 'bg-destructive',
}
const isOnHold = (s: CallInfo['status']) => s === 'held' || s === 'remote_held'
</script>

<template>
  <div
    ref="root" :style="floatStyle"
    class="w-full max-w-xs rounded-3xl bg-background shadow-lg overflow-hidden select-none flex flex-col border-0"
    :class="{ 'z-50': props.float, dark: darkMode && !shadowHost }"
    @keydown="onKeydown" tabindex="-1"
  >

    <div
      ref="handle"
      class="flex items-center justify-between px-5 py-3 bg-muted/40"
      :class="props.float ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''"
    >
      <span class="text-xs font-medium text-muted-foreground">Webphone</span>
      <div class="flex items-center gap-2">
        <span class="size-2 rounded-full" :class="isRegistered ? 'bg-green-500' : isConnecting ? 'bg-amber-400 animate-pulse' : 'bg-muted-foreground/30'" />
        <span class="text-xs text-muted-foreground">{{ isConnecting ? 'Conectando…' : isRegistered ? 'Registrado' : 'Sin conexión' }}</span>

        <button class="text-muted-foreground hover:text-foreground transition-colors" @click="toggleDark">
          <Sun v-if="darkMode" class="size-3.5" />
          <Moon v-else class="size-3.5" />
        </button>

        <Dialog>
          <DialogTrigger as-child>
            <button class="text-muted-foreground hover:text-foreground transition-colors"><Settings class="size-3.5" /></button>
          </DialogTrigger>
          <DialogContent class="sm:max-w-xs" :to="rootEl ?? undefined">
            <DialogHeader>
              <DialogTitle>Dispositivos de audio</DialogTitle>
              <DialogDescription>Micrófono y altavoz para las llamadas.</DialogDescription>
            </DialogHeader>
            <div v-if="permission === 'granted'" class="space-y-5 pt-2">
              <div class="space-y-2">
                <label class="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Mic class="size-3.5" /> Micrófono</label>
                <Select v-model="selectedInputId">
                  <SelectTrigger class="w-full"><SelectValue placeholder="Seleccionar micrófono" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="d in inputDevices" :key="d.deviceId" :value="d.deviceId">{{ d.label || `Micrófono ${d.deviceId.slice(0, 6)}` }}</SelectItem>
                  </SelectContent>
                </Select>
                <div class="flex items-center gap-3">
                  <Mic class="size-3 text-muted-foreground shrink-0" />
                  <Slider :model-value="[inputVolume]" :min="0" :max="100" :step="1" class="flex-1" @update:model-value="v => inputVolume = v?.[0] ?? inputVolume" />
                  <span class="text-xs tabular-nums text-muted-foreground w-7 text-right">{{ inputVolume }}%</span>
                </div>
              </div>
              <div class="space-y-2">
                <label class="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Volume2 class="size-3.5" /> Altavoz</label>
                <Select v-model="selectedOutputId">
                  <SelectTrigger class="w-full"><SelectValue placeholder="Seleccionar altavoz" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="d in outputDevices" :key="d.deviceId" :value="d.deviceId">{{ d.label || `Altavoz ${d.deviceId.slice(0, 6)}` }}</SelectItem>
                  </SelectContent>
                </Select>
                <div class="flex items-center gap-3">
                  <Volume2 class="size-3 text-muted-foreground shrink-0" />
                  <Slider :model-value="[outputVolume]" :min="0" :max="100" :step="1" class="flex-1" @update:model-value="v => outputVolume = v?.[0] ?? outputVolume" />
                  <span class="text-xs tabular-nums text-muted-foreground w-7 text-right">{{ outputVolume }}%</span>
                </div>
              </div>
            </div>
            <div v-else class="pt-2">
              <Button class="w-full gap-2" variant="outline" @click="requestPermission"><Mic class="size-4" /> Permitir micrófono</Button>
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
    <Button v-else-if="permission === 'prompt' || permission === 'unknown'" variant="outline" class="mx-4 mt-3 gap-2 text-sm" @click="requestPermission">
      <Mic class="size-4" /> Permitir micrófono
    </Button>

    <div v-if="channels.length" class="px-3 pt-2">
      <ToggleGroup
        type="single"
        :model-value="selectedId ?? ''"
        class="w-full gap-1"
        @update:model-value="v => selectChannel(v ? String(v) : null)"
      >
        <ToggleGroupItem
          v-for="ch in channels" :key="ch.id" :value="ch.id"
          class="flex-1 gap-1.5 text-xs h-8 rounded-full"
        >
          <span class="size-1.5 rounded-full shrink-0" :class="DOT[ch.status]" />
          <span class="truncate max-w-20">{{ label(ch) }}</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>

    <div v-if="selected" class="px-5 pt-4 pb-2 text-center">

      <template v-if="selected.status === 'ringing'">
        <PhoneIncoming class="size-5 text-blue-500 mx-auto mb-1 animate-bounce" />
        <p class="text-xs text-blue-500 font-medium mb-1">Llamada entrante</p>
        <p class="font-semibold text-base truncate">{{ label(selected) }}</p>
        <p v-if="selected.remoteName" class="text-xs text-muted-foreground truncate mt-0.5">{{ selected.remoteUri }}</p>
      </template>

      <template v-else>
        <div class="size-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg" :class="AVATAR[selected.status]">
          {{ label(selected).charAt(0).toUpperCase() }}
        </div>
        <p class="font-semibold text-sm truncate">{{ label(selected) }}</p>
        <p v-if="selected.remoteName" class="text-xs text-muted-foreground truncate">{{ selected.remoteUri }}</p>
        <p class="text-sm mt-1 tabular-nums font-medium" :class="selected.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-amber-500'">
          {{ selected.startTime ? fmt(selected.duration) : selected.status === 'connecting' ? 'Conectando…' : isOnHold(selected.status) ? 'En espera' : '' }}
        </p>
      </template>
    </div>

    <button
      v-if="channels.length && selected?.status !== 'ringing'"
      class="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1 pb-2 mx-auto"
      @click="showPad = !showPad"
    >
      <Keyboard class="size-3.5" />
      {{ showPad ? 'Ocultar teclado' : 'Teclado' }}
      <ChevronUp v-if="showPad" class="size-3" />
      <ChevronDown v-else class="size-3" />
    </button>

    <template v-if="selected?.status !== 'ringing' && (!channels.length || showPad)">
      <!-- Input -->
      <div class="flex items-center gap-2 px-3 pt-2 pb-1">
        <Input
          ref="dialInput"
          v-model="dialValue"
          placeholder="Buscar o marcar…"
          class="flex-1 text-center text-base tracking-widest border-0 shadow-none bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/30"
          @keydown.enter.prevent="onCallBtn"
        />
        <button v-if="dialValue" class="text-muted-foreground hover:text-foreground transition-colors shrink-0" @click="onBack">
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
            v-for="c in contactResults"
            :key="c.id"
            class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
            @mousedown.prevent
            @click="pickContact(c)"
          >
            <div
              class="size-7 rounded-full flex items-center justify-center shrink-0"
              :class="contactTypeInfo(c).bg"
            >
              <component :is="contactTypeInfo(c).icon" class="size-3.5" :class="contactTypeInfo(c).color" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate">{{ c.name }}</p>
              <p class="text-xs text-muted-foreground">{{ c.phone }}</p>
            </div>
          </button>
        </div>
      </Transition>

      <div class="px-6">
        <div class="grid grid-cols-3 place-items-center gap-y-1">
          <button
            v-for="key in DIAL_KEYS" :key="key"
            class="size-12 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all text-lg font-light"
            @click="onKey(key)"
          >{{ key }}</button>
        </div>
      </div>
    </template>

    <div class="flex items-center justify-center gap-3 px-6 py-4">

      <template v-if="!selected">
        <button
          class="size-11 rounded-full flex items-center justify-center transition-all active:scale-95"
          :class="callBtnMode === 'call' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-muted text-muted-foreground cursor-not-allowed'"
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
        <button class="size-11 rounded-full flex items-center justify-center bg-muted hover:bg-muted/70 transition-colors active:scale-95" title="Altavoz">
          <Volume2 class="size-4" />
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
