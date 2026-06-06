# @bacca2095/webphone

A Vue 3 WebPhone component library built on top of JsSIP for SIP/WebRTC communication.

[![npm version](https://img.shields.io/npm/v/@bacca2095/webphone)](https://www.npmjs.com/package/@bacca2095/webphone)
[![license](https://img.shields.io/npm/l/@bacca2095/webphone)](LICENSE)

## Requirements

- Node.js >= 24
- Vue >= 3.5
- Pinia >= 3.0

## Installation

```sh
npm install @bacca2095/webphone
# or
pnpm add @bacca2095/webphone
```

## Setup

### 1. Register the plugin

The library requires Pinia. Register `WebPhonePlugin` after `createPinia()`.

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { WebPhonePlugin } from '@bacca2095/webphone'
import '@bacca2095/webphone/style.css'

const app = createApp(App)
app.use(createPinia())
app.use(WebPhonePlugin)
app.mount('#app')
```

### 2. Use the component

```vue
<script setup lang="ts">
import { WebPhone } from '@bacca2095/webphone'
import type { WebPhoneConfig } from '@bacca2095/webphone'

const config: WebPhoneConfig = {
  uri: 'sip:user@domain.com',
  password: 'secret',
  servers: ['wss://sip.domain.com'],
}
</script>

<template>
  <WebPhone :config="config" />
</template>
```

## API

### Components

| Component | Description |
|-----------|-------------|
| `WebPhone` | Main phone interface — dialer, active call controls, and panel navigation |
| `NotesPanel` | Per-number persistent notes |
| `HistoryPanel` | Call history with filtering |
| `ContactsPanel` | Contacts management |
| `CalendarPanel` | Scheduled calls |

### Composables

| Composable | Description |
|------------|-------------|
| `useWebPhone` | Core SIP/WebRTC logic — register, call, hold, transfer |
| `useAudioDevices` | Audio input/output device enumeration and selection |
| `useContacts` | Contacts CRUD and search |
| `useWebPhoneStore` | Pinia store — reactive phone state |

### Types

```ts
import type {
  WebPhoneConfig,
  CallInfo,
  CallStatus,
  CallDirection,
  Contact,
  ContactType,
  PhoneNote,
  NoteColor,
  ScheduledCall,
  MicPermission,
} from '@bacca2095/webphone'
```

## Web Component

A standalone web component build is available for use outside Vue applications.

```html
<script type="module" src="@bacca2095/webphone/webcomponent"></script>
```

## Demo

A live demo is available at [bacca2095.github.io/webphone-libs](https://bacca2095.github.io/webphone-libs).

## License

[MIT](LICENSE)
