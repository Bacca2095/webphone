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
import { WebPhone } from '@bacca2095/webphone'
import '@bacca2095/webphone/style.css'

const app = createApp(App)
app.use(createPinia())
app.use(WebPhone)
app.mount('#app')
```

### 2. Use the component

```vue
<script setup lang="ts">
import { WebPhone } from '@bacca2095/webphone'
import type { WebPhoneConfig, Contact } from '@bacca2095/webphone'

const config: WebPhoneConfig = {
  uri: 'sip:user@domain.com',
  password: 'secret',
  server: 'wss://sip.domain.com',
}

const contacts: Contact[] = [
  { id: '1', name: 'Alice', phone: 'sip:alice@domain.com', type: 'internal' },
]
</script>

<template>
  <WebPhone :config="config" :contacts="contacts" />
</template>
```

## WebPhone Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `config` | `WebPhoneConfig` | No | SIP connection configuration. If omitted, the phone renders without connecting. |
| `floating` | `boolean` | No | Renders the phone as a fixed, draggable overlay. |
| `contacts` | `Contact[]` | No | External contact list surfaced in the contacts panel. |

## WebPhone Emits

| Event | Payload | Description |
|-------|---------|-------------|
| `open-history` | — | Fired when the user navigates to the history panel. |
| `open-notes` | `remoteUri?: string` | Fired when the user navigates to the notes panel. |
| `open-contacts` | — | Fired when the user navigates to the contacts panel. |
| `open-calendar` | — | Fired when the user navigates to the calendar panel. |

## Types

### `WebPhoneConfig`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `server` | `string` | Yes | WebSocket server URL — e.g. `wss://sip.domain.com` |
| `uri` | `string` | Yes | SIP URI — e.g. `sip:user@domain.com` |
| `password` | `string` | Yes | SIP account password |
| `displayName` | `string` | No | Caller ID display name |
| `iceServers` | `RTCIceServer[]` | No | STUN/TURN servers for ICE negotiation |

### `Contact`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `name` | `string` | Yes | Display name |
| `phone` | `string` | Yes | Extension, phone number, or SIP URI |
| `type` | `'internal' \| 'external' \| 'service' \| 'emergency'` | No | Contact category |

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

### Additional Types

`CallInfo`, `CallStatus`, `CallDirection`, `PhoneNote`, `NoteColor`, `ScheduledCall`, `MicPermission`

## CDN Usage (Web Component)

The library ships a self-contained web component build that works without Vue or any bundler.

**ES module (recommended):**

```html
<script type="module" src="https://unpkg.com/@bacca2095/webphone/dist/webphone.es.js"></script>

<web-phone></web-phone>
```

**IIFE (no module support required):**

```html
<script src="https://unpkg.com/@bacca2095/webphone/dist/webphone.iife.js"></script>

<web-phone></web-phone>
```

**Passing config via attribute:**

```html
<web-phone id="phone"></web-phone>

<script type="module">
  const phone = document.getElementById('phone')
  phone.config = {
    uri: 'sip:user@domain.com',
    password: 'secret',
    server: 'wss://sip.domain.com',
  }
</script>
```

> The web component bundles all dependencies including styles. No additional CSS import is needed.

## Demo

A live demo is available at [bacca2095.github.io/webphone](https://bacca2095.github.io/webphone).

## License

[MIT](LICENSE)
