<script setup lang="ts">
import { ref } from 'vue'
import { Sun, Moon, Settings, MoreHorizontal, Clock, NotebookText, Users, CalendarDays } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import AudioSettings from './AudioSettings.vue'
import { useSipConfig } from '@/composables/useSipConfig'
import { useWebPhone } from '@/composables/useWebPhone'

defineProps<{
  isRegistered: boolean
  isConnecting: boolean
  isDark: boolean
  rootEl: HTMLElement | null
  float?: boolean
  isDragging?: boolean
}>()

const emit = defineEmits<{
  'toggle-dark': []
  'open-history': []
  'open-notes': []
  'open-contacts': []
  'open-calendar': []
}>()

const menuOpen = ref(false)
const activeTab = ref<'account' | 'audio'>('account')

const openHistory = () => { menuOpen.value = false; emit('open-history') }
const openNotes = () => { menuOpen.value = false; emit('open-notes') }
const openContacts = () => { menuOpen.value = false; emit('open-contacts') }
const openCalendar = () => { menuOpen.value = false; emit('open-calendar') }

const { sipConfig, isConfigured } = useSipConfig()
const { connect, disconnect } = useWebPhone()
</script>

<template>
  <div
    class="flex items-center justify-between px-5 py-3 bg-muted/70"
    :class="float ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''"
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
        @click="emit('toggle-dark')"
      >
        <Sun v-if="isDark" class="size-3.5" />
        <Moon v-else class="size-3.5" />
      </button>

      <Popover v-model:open="menuOpen">
        <PopoverTrigger as-child>
          <button class="text-muted-foreground hover:text-foreground transition-colors">
            <MoreHorizontal class="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent class="w-44 p-1" side="bottom" align="end">
          <div class="flex flex-col">
            <button
              class="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
              @click="openHistory"
            >
              <Clock class="size-3.5 text-muted-foreground" /> Historial
            </button>
            <button
              class="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
              @click="openNotes"
            >
              <NotebookText class="size-3.5 text-muted-foreground" /> Notas
            </button>
            <button
              class="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
              @click="openContacts"
            >
              <Users class="size-3.5 text-muted-foreground" /> Contactos
            </button>
            <button
              class="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
              @click="openCalendar"
            >
              <CalendarDays class="size-3.5 text-muted-foreground" /> Agenda
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog @update:open="(open) => { if (open) activeTab = 'account' }">
        <DialogTrigger as-child>
          <button class="text-muted-foreground hover:text-foreground transition-colors">
            <Settings class="size-3.5" />
          </button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-xs" :to="rootEl ?? undefined">
          <DialogHeader>
            <DialogTitle>Ajustes</DialogTitle>
            <DialogDescription class="sr-only">Configuración de cuenta SIP y audio.</DialogDescription>
          </DialogHeader>

          <div class="flex gap-1 bg-muted rounded-lg p-1">
            <button
              class="flex-1 py-1.5 text-sm font-medium rounded-md transition-colors"
              :class="
                activeTab === 'account'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="activeTab = 'account'"
            >
              Cuenta SIP
            </button>
            <button
              class="flex-1 py-1.5 text-sm font-medium rounded-md transition-colors"
              :class="
                activeTab === 'audio'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="activeTab = 'audio'"
            >
              Audio
            </button>
          </div>

          <div v-if="activeTab === 'account'" class="space-y-3">
            <div class="space-y-1.5">
              <label class="text-xs text-muted-foreground">Servidor WebSocket</label>
              <Input
                v-model="sipConfig.server"
                placeholder="wss://sip.ejemplo.com"
                :disabled="isRegistered || isConnecting"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs text-muted-foreground">URI SIP</label>
              <Input
                v-model="sipConfig.uri"
                placeholder="sip:usuario@dominio.com"
                :disabled="isRegistered || isConnecting"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs text-muted-foreground">Contraseña</label>
              <Input
                v-model="sipConfig.password"
                type="password"
                :disabled="isRegistered || isConnecting"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs text-muted-foreground">Nombre visible (opcional)</label>
              <Input
                v-model="sipConfig.displayName"
                placeholder="Ej. Juan García"
                :disabled="isRegistered || isConnecting"
              />
            </div>
            <div class="pt-1">
              <Button
                v-if="!isRegistered && !isConnecting"
                class="w-full"
                :disabled="!isConfigured"
                @click="connect({ ...sipConfig })"
              >
                Conectar
              </Button>
              <Button v-else class="w-full" variant="outline" @click="disconnect()">
                {{ isConnecting ? 'Cancelar' : 'Desconectar' }}
              </Button>
            </div>
          </div>

          <div v-else>
            <AudioSettings />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  </div>
</template>
