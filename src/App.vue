<script setup lang="ts">
import WebPhone from '@/components/WebPhone.vue'
import PlaygroundControls from './PlaygroundControls.vue'
import type { Contact } from '@/types'

const contacts: Contact[] = [
  { id: '1',  name: 'Juan García',        phone: '1001',            type: 'internal'  },
  { id: '2',  name: 'María López',        phone: '1002',            type: 'internal'  },
  { id: '3',  name: 'Carlos Rodríguez',   phone: '1003',            type: 'internal'  },
  { id: '4',  name: 'Ana Martínez',       phone: '1004',            type: 'internal'  },
  { id: '5',  name: 'Luis Fernández',     phone: '1005',            type: 'internal'  },
  { id: '6',  name: 'Soporte Técnico',    phone: '2000',            type: 'service'   },
  { id: '7',  name: 'Recursos Humanos',   phone: '2001',            type: 'service'   },
  { id: '8',  name: 'Ventas',             phone: '2002',            type: 'service'   },
  { id: '9',  name: 'Recepción',          phone: '0',               type: 'service'   },
  { id: '10', name: 'Pedro Sánchez',      phone: '+34 612 345 678', type: 'external'  },
  { id: '11', name: 'Laura Gómez',        phone: '+34 698 765 432', type: 'external'  },
  { id: '12', name: 'Emergencias',        phone: '112',             type: 'emergency' },
  { id: '13', name: 'Policía',            phone: '091',             type: 'emergency' },
  { id: '14', name: 'Bomberos',           phone: '080',             type: 'emergency' },
]
</script>

<template>
  <div class="min-h-screen bg-muted/30">
    <WebPhone :float="true" :contacts="contacts" />
    <PlaygroundControls />
  </div>
</template>
