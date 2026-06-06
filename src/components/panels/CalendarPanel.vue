<script setup lang="ts">
import { ref, computed } from 'vue'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import type { DateValue } from 'reka-ui'
import { Plus, Trash2 } from '@lucide/vue'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useWebPhoneStore } from '@/stores/webphone'

const emit = defineEmits<{
  call: [remoteUri: string]
}>()

const store = useWebPhoneStore()

const selectedDate = ref<DateValue>(today(getLocalTimeZone()))

// CalendarDate months are 1-based; JS Date months are 0-based
const selectedJs = computed(() => new Date(
  selectedDate.value.year,
  selectedDate.value.month - 1,
  selectedDate.value.day,
))

const onDateChange = (val: DateValue | undefined) => {
  if (val) selectedDate.value = new CalendarDate(val.year, val.month, val.day)
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const eventDates = computed(() => {
  const set = new Set<string>()
  for (const c of store.scheduledCalls) {
    const d = c.scheduledAt
    set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return set
})

const callsForDay = computed(() =>
  store.scheduledCalls
    .filter(c => isSameDay(c.scheduledAt, selectedJs.value))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()),
)

const selectedLabel = computed(() =>
  selectedJs.value.toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'long' }),
)

const fmtTime = (d: Date) => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

// Form
const now = new Date()
const formUri = ref('')
const formTime = ref(`${String(now.getHours() + 1 > 23 ? 0 : now.getHours() + 1).padStart(2, '0')}:00`)

const submit = () => {
  const uri = formUri.value.trim()
  if (!uri || !formTime.value) return
  const [h, min] = formTime.value.split(':').map(Number)
  const scheduledAt = new Date(
    selectedDate.value.year,
    selectedDate.value.month - 1,
    selectedDate.value.day,
    h, min,
  )
  store.addScheduledCall({ remoteUri: uri, scheduledAt })
  formUri.value = ''
}
</script>

<template>
  <div class="flex flex-col h-full gap-0">
    <!-- shadcn Calendar -->
    <Calendar
      :model-value="(selectedDate as any)"
      :event-dates="eventDates"
      locale="es"
      :week-starts-on="1"
      class="p-0 w-full shrink-0"
      @update:model-value="onDateChange"
    />

    <div class="border-t mt-1 mb-1.5 shrink-0" />

    <!-- Calls for selected day -->
    <div class="flex-1 overflow-y-auto min-h-0 space-y-1.5">
      <p class="text-[10px] font-semibold text-muted-foreground capitalize tracking-wider mb-2">
        {{ selectedLabel }}
      </p>

      <p v-if="!callsForDay.length" class="text-xs text-muted-foreground/50 py-1">
        Sin llamadas agendadas
      </p>

      <div
        v-for="sc in callsForDay"
        :key="sc.id"
        class="group flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2"
      >
        <span class="text-[10px] font-semibold tabular-nums text-muted-foreground w-10 shrink-0">
          {{ fmtTime(sc.scheduledAt) }}
        </span>
        <span class="flex-1 text-xs truncate">{{ sc.remoteUri }}</span>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            class="text-muted-foreground hover:text-green-500 transition-colors p-0.5"
            title="Llamar ahora"
            @click="emit('call', sc.remoteUri)"
          >
            <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
            </svg>
          </button>
          <button
            class="text-muted-foreground hover:text-destructive transition-colors p-0.5"
            @click="store.removeScheduledCall(sc.id)"
          >
            <Trash2 class="size-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Add form -->
    <div class="border-t pt-3 space-y-2 shrink-0">
      <div class="flex gap-2">
        <Input
          v-model="formUri"
          placeholder="Número o URI"
          class="h-8 text-sm flex-1 min-w-0"
          @keydown.enter="submit"
        />
        <Input
          v-model="formTime"
          type="time"
          class="h-8 w-24 shrink-0 text-xs bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
      <Button
        size="sm"
        class="w-full h-8 gap-1.5 text-xs"
        :disabled="!formUri.trim()"
        @click="submit"
      >
        <Plus class="size-3" /> Agendar llamada
      </Button>
    </div>
  </div>
</template>
