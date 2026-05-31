<script setup lang="ts">
import { ref, computed, useTemplateRef, watchEffect } from 'vue'
import { useElementBounding } from '@vueuse/core'
import WebPhone from '@/components/WebPhone.vue'
import FloatingPanel from '@/components/FloatingPanel.vue'
import PlaygroundControls from './PlaygroundControls.vue'
import NotesPanel from '@/components/panels/NotesPanel.vue'
import HistoryPanel from '@/components/panels/HistoryPanel.vue'
import ContactsPanel from '@/components/panels/ContactsPanel.vue'
import CalendarPanel from '@/components/panels/CalendarPanel.vue'
import { useWebPhone } from '@/composables/useWebPhone'
import type { Contact } from '@/types'

const { call, channels } = useWebPhone()

const phoneRef = useTemplateRef<{ el: HTMLElement | null }>('phone')
const phoneEl = computed(() => phoneRef.value?.el ?? null)
const { right: phoneRight, top: phoneTop, height: phoneHeight, width: phoneWidth } = useElementBounding(phoneEl)

const contacts: Contact[] = [
  { id: '1',  name: 'Juan García',      phone: '1001',            type: 'internal'  },
  { id: '2',  name: 'María López',      phone: '1002',            type: 'internal'  },
  { id: '3',  name: 'Carlos Rodríguez', phone: '1003',            type: 'internal'  },
  { id: '4',  name: 'Ana Martínez',     phone: '1004',            type: 'internal'  },
  { id: '5',  name: 'Luis Fernández',   phone: '1005',            type: 'internal'  },
  { id: '6',  name: 'Soporte Técnico',  phone: '2000',            type: 'service'   },
  { id: '7',  name: 'Recursos Humanos', phone: '2001',            type: 'service'   },
  { id: '8',  name: 'Ventas',           phone: '2002',            type: 'service'   },
  { id: '9',  name: 'Recepción',        phone: '0',               type: 'service'   },
  { id: '10', name: 'Pedro Sánchez',    phone: '+34 612 345 678', type: 'external'  },
  { id: '11', name: 'Laura Gómez',      phone: '+34 698 765 432', type: 'external'  },
  { id: '12', name: 'Emergencias',      phone: '112',             type: 'emergency' },
  { id: '13', name: 'Policía',          phone: '091',             type: 'emergency' },
  { id: '14', name: 'Bomberos',         phone: '080',             type: 'emergency' },
]

type Panel = 'history' | 'notes' | 'contacts' | 'calendar' | null

const activePanel = ref<Panel>(null)
const notesUri = ref<string | undefined>(undefined)

const openNotes = (uri?: string) => {
  notesUri.value = uri
  activePanel.value = 'notes'
}

const callAndClose = (uri: string) => {
  call(uri)
  activePanel.value = null
}

// Only allow adding notes when the call is still active
const activeNotesUri = computed(() => {
  if (!notesUri.value) return undefined
  return channels.value.some(ch => ch.remoteUri === notesUri.value)
    ? notesUri.value
    : undefined
})

// Close notes panel when there's no active call and panel was opened from a call
watchEffect(() => {
  if (activePanel.value === 'notes' && notesUri.value && !activeNotesUri.value) {
    notesUri.value = undefined
  }
})
</script>

<template>
  <div class="min-h-screen bg-muted/30">
    <WebPhone
      ref="phone"
      :float="true"
      :contacts="contacts"
      @open-history="activePanel = 'history'"
      @open-notes="openNotes"
      @open-contacts="activePanel = 'contacts'"
      @open-calendar="activePanel = 'calendar'"
    />
    <PlaygroundControls />

    <FloatingPanel
      :open="activePanel === 'history'"
      title="Historial de llamadas"
      :anchor-right="phoneRight"
      :anchor-top="phoneTop"
      :anchor-height="phoneHeight"
      :anchor-width="phoneWidth"
      @close="activePanel = null"
    >
      <HistoryPanel @call="callAndClose" @open-notes="openNotes" />
    </FloatingPanel>

    <FloatingPanel
      :open="activePanel === 'notes'"
      title="Notas"
      :anchor-right="phoneRight"
      :anchor-top="phoneTop"
      :anchor-height="phoneHeight"
      :anchor-width="phoneWidth"
      @close="activePanel = null"
    >
      <NotesPanel :target-uri="activeNotesUri" @call="callAndClose" />
    </FloatingPanel>

    <FloatingPanel
      :open="activePanel === 'contacts'"
      title="Contactos"
      :anchor-right="phoneRight"
      :anchor-top="phoneTop"
      :anchor-height="phoneHeight"
      :anchor-width="phoneWidth"
      @close="activePanel = null"
    >
      <ContactsPanel :external-contacts="contacts" @call="callAndClose" />
    </FloatingPanel>

    <FloatingPanel
      :open="activePanel === 'calendar'"
      title="Agenda"
      :anchor-right="phoneRight"
      :anchor-top="phoneTop"
      :anchor-height="phoneHeight"
      :anchor-width="phoneWidth"
      :override-height="560"
      @close="activePanel = null"
    >
      <CalendarPanel @call="callAndClose" />
    </FloatingPanel>
  </div>
</template>
