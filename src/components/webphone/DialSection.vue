<script setup lang="ts">
import { ref, computed, useTemplateRef, type Component } from 'vue'
import { useElementBounding } from '@vueuse/core'
import { Delete, Globe, Headset, User, ShieldAlert } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { useContacts } from '@/composables/useContacts'
import type { Contact } from '@/types'

const DIAL_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

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

const props = defineProps<{
  modelValue: string
  externalContacts?: Contact[]
  hasActiveCall?: boolean
}>()

const { contacts: storedContacts } = useContacts()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  digit: [k: string]
  back: []
  call: []
}>()

const inputFocused = ref(false)
const dialInputRef = useTemplateRef<HTMLInputElement>('dialInput')
const { bottom, left, width } = useElementBounding(dialInputRef)

const overlayStyle = computed(() => ({
  position: 'fixed' as const,
  top: `${bottom.value + 4}px`,
  left: `${left.value}px`,
  width: `${width.value}px`,
  zIndex: 50,
}))

const allContacts = computed<Contact[]>(() => {
  const stored = storedContacts.value
  const external = props.externalContacts ?? []
  const seen = new Set(stored.map(c => c.phone))
  return [...stored, ...external.filter(c => !seen.has(c.phone))]
})

const contactResults = computed<Contact[]>(() => {
  if (!inputFocused.value || !props.modelValue || props.hasActiveCall)
    return []
  const query = props.modelValue.toLowerCase()
  return allContacts.value
    .filter(
      (c) => c.name.toLowerCase().includes(query) || c.phone.toLowerCase().includes(query),
    )
    .slice(0, 5)
})

const contactTypeInfo = (c: Contact) => CONTACT_TYPE[c.type ?? 'internal']

const pickContact = (c: Contact) => {
  emit('update:modelValue', c.phone)
  inputFocused.value = false
}

const onKey = (k: string) => {
  emit('digit', k)
  emit('update:modelValue', props.modelValue + k)
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 px-3 pt-2 pb-1">
      <Input
        ref="dialInput"
        :model-value="modelValue"
        placeholder="Buscar o marcar…"
        class="flex-1 text-center"
        @update:model-value="(v) => emit('update:modelValue', String(v))"
        @focus="inputFocused = true"
        @blur="inputFocused = false"
        @keydown.enter.prevent="emit('call')"
      />
      <button
        v-if="modelValue"
        class="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        @click="emit('back')"
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
  </div>
</template>
