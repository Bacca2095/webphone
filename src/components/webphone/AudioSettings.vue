<script setup lang="ts">
import { Mic, Volume2 } from '@lucide/vue'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { useAudioDevices } from '@/composables/useAudioDevices'

const {
  permission,
  inputDevices,
  outputDevices,
  selectedInputId,
  selectedOutputId,
  inputVolume,
  outputVolume,
  requestPermission,
} = useAudioDevices()
</script>

<template>
  <div v-if="permission === 'granted'" class="w-full min-w-0 space-y-5 pt-2">
    <div class="space-y-2">
      <label class="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Mic class="size-3.5" /> Micrófono
      </label>
      <div class="w-full">
        <NativeSelect v-model="selectedInputId" class="w-full truncate">
          <NativeSelectOption
            v-for="device in inputDevices"
            :key="device.deviceId"
            :value="device.deviceId"
          >{{ device.label || `Micrófono ${device.deviceId.slice(0, 6)}` }}</NativeSelectOption>
        </NativeSelect>
      </div>
      <div class="flex items-center gap-2 px-1">
        <Mic class="size-3 text-muted-foreground shrink-0" />
        <Slider
          :model-value="[inputVolume]"
          :min="0"
          :max="100"
          :step="1"
          class="flex-1 min-w-0"
          @update:model-value="(v) => (inputVolume = v?.[0] ?? inputVolume)"
        />
        <span class="text-xs tabular-nums text-muted-foreground w-7 text-right shrink-0">{{ inputVolume }}%</span>
      </div>
    </div>
    <div class="space-y-2">
      <label class="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Volume2 class="size-3.5" /> Altavoz
      </label>
      <div class="w-full">
        <NativeSelect v-model="selectedOutputId" class="w-full truncate">
          <NativeSelectOption
            v-for="device in outputDevices"
            :key="device.deviceId"
            :value="device.deviceId"
          >{{ device.label || `Altavoz ${device.deviceId.slice(0, 6)}` }}</NativeSelectOption>
        </NativeSelect>
      </div>
      <div class="flex items-center gap-2 px-1">
        <Volume2 class="size-3 text-muted-foreground shrink-0" />
        <Slider
          :model-value="[outputVolume]"
          :min="0"
          :max="100"
          :step="1"
          class="flex-1 min-w-0"
          @update:model-value="(v) => (outputVolume = v?.[0] ?? outputVolume)"
        />
        <span class="text-xs tabular-nums text-muted-foreground w-7 text-right shrink-0">{{ outputVolume }}%</span>
      </div>
    </div>
  </div>
  <div v-else class="pt-2">
    <Button class="w-full gap-2" variant="outline" @click="requestPermission">
      <Mic class="size-4" /> Permitir micrófono
    </Button>
  </div>
</template>
