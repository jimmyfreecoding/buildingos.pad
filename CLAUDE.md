# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 5174
npm run build        # Type-check then production build (vue-tsc + vite)
npm run build:zip    # Patch version, build, then zip dist/ into pad.zip
npm run preview      # Preview production build
npm run check        # Type-check only (vue-tsc)
npm run lint         # ESLint on .ts and .vue files
npm run lint:fix     # ESLint auto-fix
```

## Architecture

This is a **Vue 3 + TypeScript + Vite** smart building cockpit app for touchscreen pads (Zeekr buildings). It runs at path `/pad/` and uses a runtime config file (`public/config.js`) to set the API base URL at deploy time.

### Init & Routing Flow

1. On first visit, if `localStorage` has no `initData`, the router redirects to `/init` (InitPage).
2. InitPage lets the user choose a **pad type** (wallPad, tolitePad, roomControl, meetingControl, doorPad, twins) and **aspect ratio** (16:9 or 16:10). These are saved to `localStorage.initData`.
3. On subsequent visits, the root route `/` reads `initData.padType` and redirects to the matching route.
4. A navigation guard on every route forces redirect to `/init` if `initData` is missing.

### Scaling Strategy

The app uses `v-scale-screen` to auto-scale all content to fit any screen. `AppConfig` (in `src/config.ts`) reads the aspect ratio from localStorage and defines the design canvas (1920x1080 for 16:9, 1920x1200 for 16:10). `App.vue` adjusts the root font-size proportionally on mount.

### State Management (Pinia)

`useCockpitStore` (`src/stores/cockpit.ts`) holds the main UI state: background (video/image), lights, brightness, climate (temperature/mode), and environment sensors. This is shared across pages and components.

### API & Communication

- **Axios client** (`src/utils/request.ts`): Default HTTP client. Base URL read from `window.config.VITE_APP_BASE_URL` (runtime config), falling back to `import.meta.env.VITE_APP_BASE_URL`. Handles JSON and form-urlencoded requests. Response interceptor shows Element Plus error messages for HTTP errors.
- **Raw fetch client** (`src/utils/http.ts`): Separate fetch-based helper with hardcoded base URL (`http://10.205.66.7:1880`), used for Node-RED flows.
- **MQTT** (`src/utils/mqtt.ts`): Class-based MQTT client using the `mqtt` library. Hardcoded to connect to `wss://z650480e.ala.cn-hangzhou.emqxsl.cn:8084/mqtt` with fixed credentials. Supports subscribe/unsubscribe/publish with auto-reconnect.
- **useMqtt composable** (`src/utils/useMqtt.ts`): Vue composable wrapper around the MQTT class for component-level lifecycle management.
- **Space API** (`src/api/space.ts`): POST `/pad/getSpaceData` to fetch spatial hierarchy (buildings → floor areas → floors → rooms/meeting rooms/toilets/areas).

### Pad Types (Pages)

Each pad type is a full-page component rendered by its own route:

| Route | Page | Purpose |
|---|---|---|
| `/wall-pad` | HomePage | Wall-mounted main control panel with environment monitoring, quick access dock |
| `/meeting-control` | MeetingControl | Meeting room device control (screen, camera, audio, AC, lights, curtains) |
| `/room-control` | RoomControl | Individual room control |
| `/tolite-pad` | ToiletPad | Restroom control panel |
| `/door-pad` | DoorPad | Door display panel |
| `/twins` | Twins | Digital twin large screen (3840x2160) with building overview |

HomePage (wallPad) uses a bottom dock bar that opens various sub-pages as fullscreen `el-drawer` overlays: Climate, Lighting, Space, Energy, Air Quality, Smart Building info, Services, and SOS emergency call.

### Key Dependencies

- **Element Plus**: UI component library (drawers, dialogs, forms, switches, sliders)
- **lucide-vue-next**: Icon library
- **Tailwind CSS** with `clsx` + `tailwind-merge` for utility class composition (`cn()` in `src/lib/utils.ts`)
- **echarts**: Charting (bundled but used sparingly)
- **@vueuse/core**: Vue composables utilities

### Theme & Styling

Dark mode by default (`<html class="dark">`). `useTheme` composable toggles between `light` and `dark` classes on `<html>`. Two custom fonts: `LynkoType-Regular` (numbers only) and `DingTalk-JinBuTi` (Chinese characters). Tailwind `darkMode: "class"`.

### Path Aliases

`@` → `src/` (configured in both `vite.config.ts` and `tsconfig.json`).

### Build Output

Build outputs to `dist/`. `scripts/zip-dist.js` generates a `version.json` with build metadata and zips dist contents into `dist/pad.zip`, excluding the zip file itself from the archive.
