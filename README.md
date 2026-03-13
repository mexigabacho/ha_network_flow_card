# Network Flow Card

A Home Assistant Lovelace custom card that visualizes your network topology with animated bidirectional upload/download flow — inspired by the power-flow-card-plus.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=mexigabacho&repository=ha_network_flow_card&category=plugin)
[![GitHub release](https://img.shields.io/github/release/mexigabacho/ha_network_flow_card.svg)](https://github.com/mexigabacho/ha_network_flow_card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/mexigabacho/ha_network_flow_card/blob/main/LICENSE)

## Features

- **Animated flow particles** — blue dots travel upstream (upload), orange travel downstream (download). Particle density scales with actual bandwidth.
- **Bidirectional speeds** — upload ↑ and download ↓ shown on each link.
- **Failover-aware** — backup ISP renders with a dashed amber line and "standby" label when inactive.
- **Offline state** — failed nodes and links fade out.
- **HA icon picker** — any `mdi:*` icon supported per node.
- **IP address display** — public IP for WAN nodes, subnet for interfaces.
- **Client counts** — from a sensor entity.
- **Full color theming** — global `theme:` block + per-node `color:` overrides.
- **Dark mode** — auto-detects from HA theme.
- **Visual editor** — configure everything via the HA card editor UI (no raw YAML required).
- **HACS compatible**.

---

## Installation

### Via HACS (recommended)

1. Open HACS → Frontend → **+ Explore & Download Repositories**
2. Search for **Network Flow Card**
3. Download and restart HA

### Manual

1. Copy `dist/network-flow-card.js` to `/config/www/network-flow-card.js`
2. Add the resource in **Settings → Dashboards → Resources**:
   ```
   URL:  /local/network-flow-card.js
   Type: JavaScript module
   ```
3. Reload the browser.

---

## Configuration

### Minimal example

```yaml
type: custom:network-flow-card
title: Network
nodes:
  - id: isp
    label: ISP
    icon: mdi:web
    type: isp
    entities:
      status: binary_sensor.wan_up
      upload: sensor.wan_upload_mbps
      download: sensor.wan_download_mbps
  - id: router
    label: Router
    icon: mdi:router-network
    type: router
    entities:
      status: binary_sensor.router_online
links:
  - { from: isp, to: router }
```

### Full reference

See [example-config.yaml](example-config.yaml) for all options.

---

## Node types

| Type        | Position    | Description                    |
|-------------|-------------|--------------------------------|
| `isp`       | Top row     | Internet service provider      |
| `router`    | Middle      | Router, firewall (one per card)|
| `switch`    | Bottom row  | Managed switch                 |
| `interface` | Bottom row  | Network interface / SSID       |
| `device`    | Bottom row  | End device (NAS, server, etc.) |

---

## Entity bindings

Each node's `entities:` block maps semantic keys to HA entity IDs:

| Key        | Domain                     | Description                        |
|------------|----------------------------|------------------------------------|
| `status`   | `binary_sensor` or `sensor`| "on"/"off" or "online"/"offline"   |
| `ip`       | `sensor`                   | IP or subnet string                |
| `upload`   | `sensor`                   | Upload speed (Mbps)                |
| `download` | `sensor`                   | Download speed (Mbps)              |
| `ping`     | `sensor`                   | Latency (ms)                       |
| `clients`  | `sensor`                   | Connected client count             |

---

## Theme customization

```yaml
theme:
  online:        "#22c55e"   # node border / status bar when online
  standby:       "#f59e0b"   # node border / status bar when standby
  offline:       "#ef4444"   # node border when offline
  upload:        "#378add"   # upload particle + speed label color
  download:      "#d85a30"   # download particle + speed label color
  link_active:   "#888780"   # active link line color
  link_standby:  "#f59e0b"   # standby link line color
  link_offline:  "#d3d1c7"   # offline link line color
```

### Per-node color overrides

```yaml
nodes:
  - id: vpn
    label: VPN
    color:
      border:     "#a855f7"   # border color
      status_bar: "#a855f7"   # top accent strip
      background: "#1a1a2e"   # card background
      icon:       "#a855f7"   # icon color
      ip_text:    "#7c3aed"   # IP address text color
```

---

## Development

```bash
npm install
npm run build       # production build → dist/network-flow-card.js
npm run watch       # watch mode for development
```

### File structure

```
src/
  network-flow-card.js   # LitElement custom card, HA integration
  renderer.js            # Canvas drawing engine (no HA deps)
  editor.js              # Visual editor (ha-selector, ha-form)
  editor-schema.js       # ha-form schema reference
  theme.js               # Color defaults + merge utility
  ha-utils.js            # Entity state resolution helpers
  mdi-paths.js           # MDI SVG path data
dist/
  network-flow-card.js   # Built output — this is what HA loads
```

### Adding MDI icons

Add the SVG path to `src/mdi-paths.js`:

```js
"mdi:my-icon": "M12 2 ...",
```

Find paths at [pictogrammers.com/library/mdi](https://pictogrammers.com/library/mdi/).

---

## Roadmap

- [ ] Click-to-open more-info dialog for each node
- [ ] Tooltip on hover (full entity values)
- [ ] `parent:` field for explicit hierarchy overrides
- [ ] Mini sparkline on each link (last 30s throughput history)
- [ ] Node grouping (e.g. "Home LAN" group containing switch + devices)

---

## License

MIT
