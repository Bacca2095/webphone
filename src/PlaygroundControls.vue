<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useWebPhoneStore } from '@/stores/webphone'
import { useWebPhone } from '@/composables/useWebPhone'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'

const store = useWebPhoneStore()
const { connect, disconnect, isRegistered, isConnecting } = useWebPhone()

const uid = () => `sim-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
const canAdd = computed(() => store.channels.length < 3)

const CONTACTS = [
  { name: 'Juan García',       uri: 'sip:juan@empresa.com' },
  { name: 'María López',       uri: 'sip:maria@empresa.com' },
  { name: 'Carlos Rodríguez',  uri: 'sip:carlos@empresa.com' },
  { name: '',                  uri: 'sip:+5491112345678@carrier.net' },
]
const pick = () => CONTACTS[Math.floor(Math.random() * CONTACTS.length)] ?? CONTACTS[0]!

const sipConfig = useLocalStorage('webphone-sip-config', { server: '', uri: '', password: '', displayName: '' })
const canConnect = computed(() => !!sipConfig.value.server && !!sipConfig.value.uri && !!sipConfig.value.password)
const handleConnect = () => { if (canConnect.value) connect({ ...sipConfig.value }) }
const handleDisconnect = () => disconnect()

onMounted(() => { if (canConnect.value && !isRegistered.value && !isConnecting.value) handleConnect() })

const setConnecting = () => { store.isRegistered = false; store.isConnecting = true }
const setRegistered = () => { store.isRegistered = true; store.isConnecting = false }
const setDisconnected = () => { store.isRegistered = false; store.isConnecting = false }

const addRinging = () => {
  const c = pick()
  store.addChannel({ id: uid(), direction: 'incoming', status: 'ringing', remoteUri: c.uri, remoteName: c.name, startTime: null, duration: 0, isMuted: false, notes: '' })
}
const addActive = () => {
  const c = pick(); const id = uid()
  store.addChannel({ id, direction: 'outgoing', status: 'active', remoteUri: c.uri, remoteName: c.name, startTime: null, duration: 0, isMuted: false, notes: '' })
  store.startTimer(id)
}
const addHeld = () => {
  const c = pick()
  store.addChannel({ id: uid(), direction: 'incoming', status: 'held', remoteUri: c.uri, remoteName: c.name, startTime: new Date(Date.now() - 62_000), duration: 62, isMuted: false, notes: '' })
}
const addConnecting = () => {
  const c = pick()
  store.addChannel({ id: uid(), direction: 'outgoing', status: 'connecting', remoteUri: c.uri, remoteName: c.name, startTime: null, duration: 0, isMuted: false, notes: '' })
}
const toggleMute = () => {
  const active = store.channels.find(c => c.status === 'active')
  if (active) store.updateMute(active.id, !active.isMuted)
}
const toggleHold = () => {
  const active = store.channels.find(c => c.status === 'active')
  if (active) { store.updateStatus(active.id, 'held') }
  else { const held = store.channels.find(c => c.status === 'held'); if (held) store.updateStatus(held.id, 'active') }
}
const clearAll = () => store.channels.map(c => c.id).forEach(id => store.removeChannel(id))
</script>

<template>
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-background border rounded-2xl shadow-lg p-4 w-max">
    <p class="text-xs font-semibold text-muted-foreground mb-3 text-center tracking-wide uppercase">
      Playground · Simulador
    </p>

    <div class="space-y-1.5 mb-3">
      <p class="text-xs text-muted-foreground font-medium">Conexión simulada</p>
      <div class="flex gap-1.5">
        <Button size="sm" variant="outline" @click="setConnecting">Conectando…</Button>
        <Button size="sm" variant="default" @click="setRegistered">Registrado</Button>
        <Button size="sm" variant="ghost" @click="setDisconnected">Desconectado</Button>
      </div>
    </div>

    <Separator class="my-3" />

    <div class="space-y-1.5 mb-3">
      <p class="text-xs text-muted-foreground font-medium">Agregar canal</p>
      <div class="flex gap-1.5 flex-wrap">
        <Button size="sm" variant="outline" class="gap-1.5" :disabled="!canAdd" @click="addRinging">
          <span class="size-2 rounded-full bg-blue-500" /> Entrante
        </Button>
        <Button size="sm" variant="outline" class="gap-1.5" :disabled="!canAdd" @click="addConnecting">
          <span class="size-2 rounded-full bg-amber-400" /> Conectando
        </Button>
        <Button size="sm" variant="outline" class="gap-1.5" :disabled="!canAdd" @click="addActive">
          <span class="size-2 rounded-full bg-green-500" /> Activo
        </Button>
        <Button size="sm" variant="outline" class="gap-1.5" :disabled="!canAdd" @click="addHeld">
          <span class="size-2 rounded-full bg-amber-500" /> En espera
        </Button>
      </div>
    </div>

    <Separator class="my-3" />

    <div class="space-y-1.5 mb-3">
      <p class="text-xs text-muted-foreground font-medium">Canal activo</p>
      <div class="flex gap-1.5">
        <Button size="sm" variant="outline" :disabled="!store.channels.some(c => c.status === 'active')" @click="toggleMute">
          Toggle mute
        </Button>
        <Button size="sm" variant="outline" :disabled="!store.channels.some(c => c.status === 'active' || c.status === 'held')" @click="toggleHold">
          Toggle hold
        </Button>
      </div>
    </div>

    <Separator class="my-3" />

    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-1.5">
        <Badge variant="outline" class="tabular-nums">{{ store.channels.length }} canal{{ store.channels.length !== 1 ? 'es' : '' }}</Badge>
        <Badge :variant="store.isRegistered ? 'default' : 'secondary'">
          {{ store.isRegistered ? 'registrado' : store.isConnecting ? 'conectando' : 'desconectado' }}
        </Badge>
      </div>
      <div class="flex items-center gap-1.5">
        <Dialog>
          <DialogTrigger as-child>
            <Button size="sm" variant="outline">Configurar SIP</Button>
          </DialogTrigger>
          <DialogContent class="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Conexión SIP</DialogTitle>
              <DialogDescription>Credenciales para conectar con el servidor.</DialogDescription>
            </DialogHeader>
            <div class="space-y-3 pt-1">
              <div class="space-y-1.5">
                <label class="text-xs text-muted-foreground">Servidor WebSocket</label>
                <Input v-model="sipConfig.server" placeholder="wss://sip.ejemplo.com" :disabled="isRegistered || isConnecting" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs text-muted-foreground">URI SIP</label>
                <Input v-model="sipConfig.uri" placeholder="sip:usuario@dominio.com" :disabled="isRegistered || isConnecting" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs text-muted-foreground">Contraseña</label>
                <Input v-model="sipConfig.password" type="password" :disabled="isRegistered || isConnecting" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs text-muted-foreground">Nombre visible (opcional)</label>
                <Input v-model="sipConfig.displayName" placeholder="Ej. Juan García" :disabled="isRegistered || isConnecting" />
              </div>
              <div class="flex gap-2 pt-1">
                <Button
                  v-if="!isRegistered && !isConnecting"
                  class="flex-1" :disabled="!canConnect"
                  @click="handleConnect"
                >
                  Conectar
                </Button>
                <Button v-else class="flex-1" variant="outline" @click="handleDisconnect">
                  {{ isConnecting ? 'Cancelar' : 'Desconectar' }}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button size="sm" variant="destructive" :disabled="!store.channels.length" @click="clearAll">
          Limpiar
        </Button>
      </div>
    </div>
  </div>
</template>
