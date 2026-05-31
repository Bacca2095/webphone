<script setup lang="ts">
import { ref } from 'vue'
import { Search } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Contact, ContactType } from '@/types'

const props = defineProps<{
  externalContacts?: Contact[]
}>()

const emit = defineEmits<{
  call: [phone: string]
}>()

const search = ref('')

const TYPES: Array<{ value: ContactType; label: string; badge: string }> = [
  { value: 'internal',  label: 'Interno',    badge: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400'           },
  { value: 'external',  label: 'Externo',    badge: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'            },
  { value: 'service',   label: 'Servicio',   badge: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400' },
  { value: 'emergency', label: 'Emergencia', badge: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400'                  },
]

const typeLabel = (t?: ContactType) => TYPES.find(x => x.value === t)?.label ?? 'Interno'
const typeBadge = (t?: ContactType) => TYPES.find(x => x.value === t)?.badge ?? TYPES[0].badge

const filtered = () => {
  const q = search.value.toLowerCase()
  if (!q) return props.externalContacts ?? []
  return (props.externalContacts ?? []).filter(c =>
    c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q),
  )
}
</script>

<template>
  <div class="flex flex-col gap-3 h-full">
    <div class="relative shrink-0">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
      <Input v-model="search" placeholder="Buscar…" class="pl-8" />
    </div>

    <div class="flex-1 overflow-y-auto min-h-0">
      <p v-if="!filtered().length" class="text-sm text-muted-foreground text-center py-8">
        {{ search ? 'Sin resultados' : 'Sin contactos' }}
      </p>

      <div v-else class="divide-y divide-border/50">
        <div
          v-for="contact in filtered()"
          :key="contact.id"
          class="flex items-center gap-3 py-2.5 px-1 group"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ contact.name }}</p>
            <p class="text-xs text-muted-foreground truncate">{{ contact.phone }}</p>
          </div>
          <Badge variant="outline" :class="typeBadge(contact.type)" class="text-[10px] h-4 px-1.5 shrink-0">
            {{ typeLabel(contact.type) }}
          </Badge>
          <button
            class="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-green-500 p-1 shrink-0"
            title="Llamar"
            @click="emit('call', contact.phone)"
          >
            <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
