# Frontend Migration Guide — Automation Foundation

A summary of every breaking API and data-model change shipped to PiGrow-Server so the frontend can adopt the new automation features. The full REST reference is in [`API.md`](./API.md) — this doc is the **delta** against the previous API contract.

## 1. Devices belong to the Controller now (BREAKING)

Previously each grow cycle owned its own set of devices. **Devices are now persistent hardware owned by the `Controller`** and survive across sequential grow cycles. The same physical light stays wired to the same Pi between harvests.

### What changed
- `Device.growCycleId` (FK) was **removed** and replaced with `Device.controllerId` (FK to `Controller`).
- `Device.automationMode` (new enum) tells the engine how the device is driven: `MANUAL | SCHEDULED | THRESHOLD | ALWAYS_ON | ALWAYS_OFF`.
- `POST /api/grow-cycles` **no longer accepts a `devices` array**. Devices are seeded once per controller.

### Endpoint renames
| Before | After |
|---|---|
| `GET /api/devices/grow-cycle/:growCycleId` | `GET /api/devices/controller/:controllerId` |
| `POST /api/devices` with `{ growCycleId, ... }` | `POST /api/devices` with `{ controllerId, ... }` |
| `POST /api/grow-cycles` with `{ devices: [...] }` | `POST /api/grow-cycles` (no `devices` field) |
| `GET /api/grow-cycles/:id` included `devices[]` | `GET /api/grow-cycles/:id` no longer includes `devices[]` — call `GET /api/devices/controller/:controllerId` separately |
| `GET /api/controllers/:id` had per-grow devices on each grow cycle | `GET /api/controllers/:id` now exposes `devices[]` at the controller level (alongside `growCycles` and `sensors`) |

### Device response shape
```ts
interface Device {
  id: string;
  controllerId: string;     // ← was growCycleId
  name: string;
  type: DeviceType;          // unchanged
  pinNumber: number;
  mqttTopic: string;
  automationMode: AutomationMode; // ← NEW
  isActive: boolean;        // server-tracked current relay state
  createdAt: string;
  updatedAt: string;
}
```

## 2. New enums

```ts
type AutomationMode =
  | "MANUAL"      // no automation; only REST/UI commands
  | "SCHEDULED"   // driven by the day/night clock (use for LIGHT)
  | "THRESHOLD"   // evaluated against PhaseEnvironment (use for fans, heater, humidifier, CO2)
  | "ALWAYS_ON"   // pinned ON for the active grow
  | "ALWAYS_OFF"; // pinned OFF (override)

type DayNightPeriod = "DAY" | "NIGHT";

type RuleCondition =
  | "ABOVE_MAX"    // value > PhaseEnvironment.*Max for current period
  | "BELOW_MIN"    // value < PhaseEnvironment.*Min
  | "SCHEDULE_ON"  // at dayStartMinutes (start of DAY)
  | "SCHEDULE_OFF";// at dayStartMinutes + dayDurationMinutes (start of NIGHT)

type DeviceAction = "ON" | "OFF";
```

## 3. Per-phase day/night schedule (NEW)

Every `GrowPhase` now carries a day/night clock schedule that the engine reads on every tick.

```ts
interface GrowPhase {
  // ...existing fields...
  dayStartMinutes: number;       // 0..1440 (minutes from midnight when DAY begins; default 360 = 06:00)
  dayDurationMinutes: number;    // 0..1440 (DAY lasts this long; NIGHT = 1440 - this; default 1080 = 18h)
  // ...environments: PhaseEnvironment[]  ← also new
}
```

### Photoperiod examples
| Photoperiod | dayStartMinutes | dayDurationMinutes |
|---|---|---|
| 18/6 starting at 06:00 | `360` | `1080` (server default) |
| 12/12 starting at 06:00 | `360` | `720` |
| 24/0 (always day) | `0` | `1440` |
| 0/24 (always night) | `0` | `0` |
| 18/6 starting at 18:00 | `1080` | `720` (wraps past midnight) |

### Endpoints
The fields are accepted on `POST /api/grow-phases` and `PUT /api/grow-phases/:id` and returned on every phase response (including inside `GET /api/grow-cycles/:id.phases[]`).

## 4. Phase environments — per-phase, per-period thresholds (NEW)

Each phase has at most one threshold row per period (`DAY` / `NIGHT`). All fields are optional; `null` = "unconstrained for this period". Most rooms will set different temp targets for day vs night (e.g. cooler at night when the lights are off).

```ts
interface PhaseEnvironment {
  id: string;
  growPhaseId: string;
  period: "DAY" | "NIGHT";
  tempMin: number | null;
  tempMax: number | null;
  tempTarget: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
  humidityTarget: number | null;
  co2Min: number | null;
  co2Max: number | null;
  co2Target: number | null;
  createdAt: string;
  updatedAt: string;
}
```

### Endpoints
| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/grow-phases/:growPhaseId/environment` | Returns `{ growPhaseId, day, night }`. `day` / `night` are `null` if the row doesn't exist (so the FE can tell "DAY is configured" vs "neither is"). |
| `PUT` | `/api/grow-phases/:growPhaseId/environment/:period` | Upsert a period. Omitted fields are cleared to `null`. |
| `DELETE` | `/api/grow-phases/:growPhaseId/environment/:period` | Remove a period. |

**Important — `null` semantics:** `PUT` with an empty body `{}` is valid and means "no constraints for this period" (all fields null). Send `null` explicitly for fields you want to clear; omit a field to also clear it.

## 5. Automation rules (NEW)

Explicit per-device trigger rules. Scoped to exactly one of a `GrowPhase` (preferred) or a `GrowCycle` — never both, never neither. The engine never fires rules for a non-active cycle.

```ts
interface AutomationRule {
  id: string;
  growCycleId: string | null;     // exactly one of (growCycleId, growPhaseId) is non-null
  growPhaseId: string | null;
  deviceId: string;               // UUID of the Device to actuate
  watchedSensorType: SensorType;  // TEMPERATURE | HUMIDITY | CO2 | PH | EC
  period: "DAY" | "NIGHT" | null; // null = applies in BOTH
  condition: RuleCondition;       // ABOVE_MAX | BELOW_MIN | SCHEDULE_ON | SCHEDULE_OFF
  action: "ON" | "OFF";
  cooldownSeconds: number;        // default 180 — min gap between two auto commands
  enabled: boolean;               // default true
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Endpoints
| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/automation-rules/grow-cycle/:growCycleId` | Cycle-scoped rules only (does not include rules scoped to a phase within that cycle). |
| `GET` | `/api/automation-rules/grow-phase/:growPhaseId` | Phase-scoped rules. |
| `GET` | `/api/automation-rules/device/:deviceId` | All rules that actuate a specific device. |
| `POST` | `/api/automation-rules` | Create. Validates invariants (see below). |
| `PUT` | `/api/automation-rules/:id` | Update. Scope (`growCycleId` / `growPhaseId`) is **immutable** — delete + recreate to re-scope. |
| `PATCH` | `/api/automation-rules/:id/toggle` | Flip `enabled`. |
| `DELETE` | `/api/automation-rules/:id` | Remove. |

### Validation rules (server returns `400` on violation)
1. Exactly one of `growCycleId` / `growPhaseId` must be set.
2. `condition: "SCHEDULE_ON"` or `"SCHEDULE_OFF"` requires `period: "DAY" | "NIGHT"` (not `null`).
3. `deviceId` must reference an existing device.

## 6. Device state feedback (NEW MQTT topic)

The Pi now publishes `devices/<deviceId>/state` whenever a relay actually changes. The server reconciles `Device.isActive` and writes a `DeviceStateLog` row with `source: "AUTO" reason: "state confirmed"`. **That row is the source of truth for the evaluator's hysteresis check** — the engine will not re-issue a command that matches the device's already-confirmed state.

### Pi firmware contract
| Direction | Topic | Payload |
|---|---|---|
| Pi → Server | `devices/<deviceId>/state` | `{ action: "ON" \| "OFF"; timestamp: number }` |

The server tolerates missing state messages; commands are still issued and the latest `DeviceStateLog` from any source (MANUAL/UI/AUTO) is consulted for hysteresis. The state topic is the **preferred** source of truth for the next evaluation tick.

## 7. `DeviceStateLog` source values (new in active use)

`DeviceStateLog.source` was previously only `"MANUAL"` or `"UI"`. The server now also writes `"AUTO"` rows with the following writers:

| Source | Writer | Typical `reason` |
|---|---|---|
| `"MANUAL"` | `POST /api/devices/:id/command` (REST) | `null` |
| `"UI"` | Socket.IO `ui_command` (FE dashboard) | `null` |
| `"AUTO"` | Light scheduler (60s tick) | `"day cycle start (rule <id>)"` / `"night cycle start (rule <id>)"` |
| `"AUTO"` | Threshold evaluator (telemetry-reactive) | `"TEMPERATURE 31.2 > max 28 (DAY)"` |
| `"AUTO"` | Closed-loop device state handler | `"state confirmed"` |

The auditor view of any device's history now shows the full picture. No new endpoint was added — query the table directly if needed.

## 8. Suggested UI changes

### a) Controller page → persistent device inventory
Move the "Devices" section from per-grow to per-controller. The same light / fan / heater persists across grows.

### b) Phase editor → day/night sub-grid
Add two fields: `dayStartMinutes` (e.g. with a time picker, stored as `HH * 60 + MM`) and `dayDurationMinutes` (e.g. a duration slider). Default to 360 and 1080.

Add a per-period (DAY / NIGHT) sub-grid for `PhaseEnvironment`: temp/humidity/co2 min/max/target. Two cards side-by-side. Send `null` for unset fields.

### c) Phase editor → "Automation" tab
List rules for that phase. Quick-add buttons per `DeviceType`:
- `LIGHT` → create SCHEDULE_ON + SCHEDULE_OFF pair for the device.
- `EXHAUST_FAN` / `AIR_CONDITIONER` / `INTAKE_FAN` → ABOVE_MAX on TEMPERATURE → ON, period DAY and NIGHT.
- `HEATER` → BELOW_MIN on TEMPERATURE → ON.
- `HUMIDIFIER` → BELOW_MIN on HUMIDITY → ON.
- `DEHUMIDIFIER` → ABOVE_MAX on HUMIDITY → ON.
- `CO2_INJECTOR` → BELOW_MIN on CO2 → ON, period DAY only.

Show `enabled` toggle and `lastTriggeredAt` for each rule. Show the cooldown as a numeric input (default 180s).

### d) Telemetry chart → show DAY/NIGHT background bands
The server returns the current period implicitly via the active phase's clock. Either:
- expose `activePhase.dayStartMinutes` + `dayDurationMinutes` on `GET /api/grow-cycles/:id` (already returned), and let the FE shade chart backgrounds, **or**
- add a new helper endpoint that returns the current period for a given controller.

### e) Live device state
The server doesn't currently broadcast a Socket.IO event when a `DeviceStateLog` row is written. For now, the FE can poll `GET /api/devices/controller/:id` or watch `Device.isActive` to render live state. (A `frontend_device_state` event can be added later if you want push.)

## 9. Quick example: wire a "vegetative phase" end-to-end

```ts
// 1. Create the phase
const phase = await POST("/api/grow-phases", {
  growCycleId,
  name: "Vegetative",
  order: 1,
  durationDays: 28,
  dayStartMinutes: 360,    // 06:00
  dayDurationMinutes: 1080, // 18h day
});

// 2. Configure DAY/night thresholds
await PUT(`/api/grow-phases/${phase.id}/environment/DAY`, {
  tempMin: 22, tempMax: 28, tempTarget: 25,
  humidityMin: 55, humidityMax: 75,
  co2Min: 800, co2Max: 1500, co2Target: 1200,
});
await PUT(`/api/grow-phases/${phase.id}/environment/NIGHT`, {
  tempMin: 18, tempMax: 24, tempTarget: 21,   // cooler at night
  humidityMin: 55, humidityMax: 75,
  // no CO2 set at night
});

// 3. Attach a fan and heater device to the controller (one-time, at controller setup)
const fan = await POST("/api/devices", {
  controllerId,
  name: "Exhaust Fan",
  type: "EXHAUST_FAN",
  pinNumber: 17,
  mqttTopic: "tent1/fan",
  automationMode: "THRESHOLD",
});
const heater = await POST("/api/devices", { /* ... */ type: "HEATER", automationMode: "THRESHOLD" });
const light = await POST("/api/devices", { /* ... */ type: "LIGHT", automationMode: "SCHEDULED" });

// 4. Create the rules
await POST("/api/automation-rules", {
  growPhaseId: phase.id,
  deviceId: light.id,
  watchedSensorType: "TEMPERATURE", // not used by scheduler
  period: "DAY",
  condition: "SCHEDULE_ON",
  action: "ON",
});
await POST("/api/automation-rules", {
  growPhaseId: phase.id,
  deviceId: light.id,
  watchedSensorType: "TEMPERATURE",
  period: "NIGHT",
  condition: "SCHEDULE_OFF",
  action: "OFF",
});
await POST("/api/automation-rules", {
  growPhaseId: phase.id,
  deviceId: fan.id,
  watchedSensorType: "TEMPERATURE",
  period: null, // both day and night
  condition: "ABOVE_MAX",
  action: "ON",
});
await POST("/api/automation-rules", {
  growPhaseId: phase.id,
  deviceId: heater.id,
  watchedSensorType: "TEMPERATURE",
  period: null,
  condition: "BELOW_MIN",
  action: "ON",
});

// 5. From here on, the engine drives the devices:
//    - 06:00 daily -> light ON
//    - 24:00 daily -> light OFF
//    - temp > 28 -> fan ON (until temp < 22 due to hysteresis)
//    - temp < 22 (or NIGHT temp < 18) -> heater ON
```

## 10. TypeScript cheat sheet

```ts
type DeviceType =
  | "LIGHT" | "EXHAUST_FAN" | "INTAKE_FAN" | "CIRCULATION_FAN"
  | "WATER_PUMP" | "AIR_CONDITIONER" | "HEATER" | "HUMIDIFIER"
  | "DEHUMIDIFIER" | "CO2_INJECTOR";

type SensorType = "HUMIDITY" | "TEMPERATURE" | "TEMP_HUMIDITY" | "CO2" | "PH" | "EC";

interface Device {
  id: string;
  controllerId: string;          // ← was growCycleId
  name: string;
  type: DeviceType;
  pinNumber: number;
  mqttTopic: string;
  automationMode: AutomationMode;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GrowPhase {
  // ...existing...
  dayStartMinutes: number;
  dayDurationMinutes: number;
  environments: PhaseEnvironment[];
}

interface PhaseEnvironment {
  id: string;
  growPhaseId: string;
  period: "DAY" | "NIGHT";
  tempMin: number | null; tempMax: number | null; tempTarget: number | null;
  humidityMin: number | null; humidityMax: number | null; humidityTarget: number | null;
  co2Min: number | null; co2Max: number | null; co2Target: number | null;
  createdAt: string; updatedAt: string;
}

interface AutomationRule {
  id: string;
  growCycleId: string | null;   // exactly one of (growCycleId, growPhaseId) is non-null
  growPhaseId: string | null;
  deviceId: string;
  watchedSensorType: SensorType;
  period: "DAY" | "NIGHT" | null;
  condition: RuleCondition;
  action: "ON" | "OFF";
  cooldownSeconds: number;       // default 180
  enabled: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DeviceStateLog {
  id: string;
  deviceId: string;
  action: "ON" | "OFF";
  source: "MANUAL" | "AUTO" | "UI"; // "AUTO" is now actively written
  reason: string | null;
  createdAt: string;
}
```

## 11. Migration checklist

| Area | Action |
|---|---|
| Types | Replace `Device.growCycleId` with `Device.controllerId` + `Device.automationMode`. Add `AutomationMode`, `DayNightPeriod`, `RuleCondition`, `DeviceAction`, `PhaseEnvironment`, `AutomationRule`. Update `DeviceStateLog.source` to include `"AUTO"`. |
| Controllers listing | Show persistent device inventory per controller (not per grow). |
| Controller create | No device seeding. Devices are managed via `/api/devices/*`. |
| Grow cycle create | Remove the `devices[]` field. |
| Grow cycle detail | Drop the per-cycle `devices[]` rendering. Show `phases[].environments[]` instead. |
| Phase editor | Add `dayStartMinutes` + `dayDurationMinutes` inputs. Add a DAY/NIGHT sub-grid for `PhaseEnvironment` thresholds. Add an "Automation" tab to manage rules for the phase. |
| Rules editor | CRUD over `POST/GET/PUT/DELETE /api/automation-rules`. Show enabled toggle + lastTriggeredAt. Use `quick-add` templates by `DeviceType` (see §8c). |
| Telemetry chart | Optionally shade the background by current day/night period (computed client-side from the active phase's `dayStartMinutes` / `dayDurationMinutes`). |
| MQTT handlers | Listen for the new `devices/<id>/state` topic on the Pi (firmware). |
| Live state panel | Poll `GET /api/devices/controller/:id` for `isActive` changes (or wait for a future `frontend_device_state` event). |
