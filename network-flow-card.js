/**
 * Network Flow Card for Home Assistant
 * Version: 1.0.0
 * Repository: https://github.com/mexigabacho/ha_network_flow_card
 * License: MIT
 *
 * A Lovelace card that visualizes network topology with animated
 * bidirectional upload/download flow, inspired by power-flow-card-plus.
 */

// ─── MDI Icon Paths ───────────────────────────────────────────────────────────

const MDI_PATHS = {
  "mdi:web": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  "mdi:web-check": "M16.53 11.06L15.47 10l-4.88 4.88-2.12-2.12-1.06 1.06L10.59 17l5.94-5.94M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
  "mdi:router-network": "M10.59 2.59L9.17 4 11 5.83V8.1c-2.33.48-4.09 2.54-4.09 5 0 1.7.83 3.21 2.09 4.17V20h2v-2h2v2h2v-2.73c1.26-.96 2.09-2.47 2.09-4.17 0-2.46-1.76-4.52-4.09-5V5.83L14.83 4 13.41 2.59 12 4 10.59 2.59zM12 10c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 2c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z",
  "mdi:router": "M13.95 13.5h-3.89C9.43 13.5 9 13.93 9 14.5s.43 1 1.06 1h3.89c.62 0 1.05-.43 1.05-1s-.43-1-1.05-1M10 11h1v1h-1zm3 0h1v1h-1zM12 2A10 10 0 002 12a10 10 0 0010 10 10 10 0 0010-10A10 10 0 0012 2m0 2a8 8 0 018 8 8 8 0 01-8 8A8 8 0 014 12 8 8 0 0112 4m-1.5 3v3h-3l4.5 5 4.5-5h-3V7h-3z",
  "mdi:firewall": "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z",
  "mdi:switch": "M20 14H4a2 2 0 00-2 2v1a2 2 0 002 2h16a2 2 0 002-2v-1a2 2 0 00-2-2m-2 2.5a.5.5 0 01-.5.5.5.5 0 01-.5-.5.5.5 0 01.5-.5.5.5 0 01.5.5m2 0a.5.5 0 01-.5.5.5.5 0 01-.5-.5.5.5 0 01.5-.5.5.5 0 01.5.5M4 6h16a2 2 0 012 2v1a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2m14 2.5a.5.5 0 00-.5-.5.5.5 0 00-.5.5.5.5 0 00.5.5.5.5 0 00.5-.5m2 0a.5.5 0 00-.5-.5.5.5 0 00-.5.5.5.5 0 00.5.5.5.5 0 00.5-.5",
  "mdi:ethernet": "M7 7v3H5V7H3V1h2v4h2V1h2v6H7zm7 0v3h-2V7h-2V1h2v4h2V1h2v6h-2zM3 13h18v2H3v-2zm2 4h14v2H5v-2zm2 4h10v2H7v-2z",
  "mdi:wifi": "M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z",
  "mdi:wifi-off": "M2.28 3L1 4.27l2.1 2.1C1.16 7.74.22 9.23 0 11h2c.28-1.22.94-2.3 1.84-3.16L5.3 9.3A5.98 5.98 0 003 14c0 3.31 2.69 6 6 6a5.98 5.98 0 004.7-2.3l4 4L19 20.46 2.28 3M9 14a3 3 0 003 3 2.97 2.97 0 001.71-.54L9.54 12.29A2.97 2.97 0 009 14M12 8c-1.07 0-2.07.28-2.96.74l1.47 1.47C11 10.08 11.5 10 12 10c3.31 0 6 2.69 6 6a5.96 5.96 0 01-.74 2.89l1.47 1.47C19.72 18.93 20 17.5 20 16c0-4.42-3.58-8-8-8m0-6C8.08 2 4.42 3.34 1.5 5.63l1.5 1.5C5.46 5.23 8.58 4 12 4c3.53 0 6.73 1.3 9.19 3.43l1.5-1.5C20.04 3.48 16.28 2 12 2z",
  "mdi:access-point": "M12 2A10 10 0 002 12a10 10 0 0010 10 10 10 0 0010-10A10 10 0 0012 2m0 2a8 8 0 018 8 8 8 0 01-8 8A8 8 0 014 12 8 8 0 0112 4m0 2a6 6 0 00-6 6 6 6 0 006 6 6 6 0 006-6 6 6 0 00-6-6m0 2a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4m0 2a2 2 0 00-2 2 2 2 0 002 2 2 2 0 002-2 2 2 0 00-2-2",
  "mdi:vpn": "M12 1C8.676 1 6 3.676 6 7v1H4v14h16V8h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9a2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2 2 2 0 012-2z",
  "mdi:shield-lock": "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4c1.4 0 2.5 1.1 2.5 2.5S13.4 10 12 10 9.5 8.9 9.5 7.5 10.6 5 12 5zm0 9c-2.22 0-4.19-1.14-5.35-2.87.03-1.77 3.58-2.75 5.35-2.75s5.32.98 5.35 2.75C16.19 12.86 14.22 14 12 14z",
  "mdi:nas": "M4 2h16a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2m0 2v3h4V4H4m6 0v3h4V4h-4m6 0v3h4V4h-4M4 9v3h4V9H4m6 0v3h4V9h-4m6 0v3h4V9h-4M4 14h16a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2m2 3a1 1 0 100 2 1 1 0 000-2",
  "mdi:server": "M4 1h16a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1m0 6h16a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1m0 6h16a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4a1 1 0 011-1m1 1v2h2v-2H5m0-6v2h2V8H5M5 2v2h2V2H5",
  "mdi:server-network": "M11 2a2 2 0 012 2v4a2 2 0 01-2 2H9l-2 2v-2H5a2 2 0 01-2-2V4a2 2 0 012-2h6m7 6a2 2 0 012 2v4a2 2 0 01-2 2h-2l-2 2v-2h-2a2 2 0 01-2-2v-4a2 2 0 012-2h6M4 20v-2h3v2H4m4 0v-2h4v2H8m5 0v-2h3v2h-3",
  "mdi:home-network": "M12 3L2 12h3v8h14v-8h3L12 3zm0 2.7L19 12v7H5v-7l7-6.3zM12 8c-2.2 0-4 1.8-4 4 0 1.5.8 2.8 2 3.4V17h4v-1.6c1.2-.6 2-1.9 2-3.4 0-2.2-1.8-4-4-4zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z",
  "mdi:network": "M15 20a1 1 0 00-1-1h-1v-2h4a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h4v2h-1a1 1 0 00-1 1H2v2h5a1 1 0 001 1h8a1 1 0 001-1h5v-2h-7m-8-5V5h10v10H7z",
  "mdi:lan": "M18 22H6a4 4 0 01-4-4V6a4 4 0 014-4h12a4 4 0 014 4v12a4 4 0 01-4 4m-7-2h2v-2h-2v2m-2 0h2v-2H9v2m-2 0h2v-2H7v2m4-4h2v-2h-2v2m-2 0h2v-2H9v2m-2 0h2v-2H7v2m4-4h2v-2h-2v2m-2 0h2v-2H9v2m-2 0h2v-2H7v2m8 8h2v-2h-2v2m0-4h2v-2h-2v2m0-4h2v-2h-2v2",
  "mdi:desktop-classic": "M8 13H4c-1.1 0-2 .9-2 2v4h2v-1h16v1h2v-4c0-1.1-.9-2-2-2h-4V8H4V4h16v9h2V4c0-1.1-.9-2-2-2H4C2.9 2 2 2.9 2 4v6h6v3zm-2 4v-2h12v2H6z",
  "mdi:cellphone": "M17 19H7V5h10m0-4H7c-1.11 0-2 .89-2 2v18a2 2 0 002 2h10a2 2 0 002-2V3a2 2 0 00-2-2z",
  "mdi:television": "M21 17H3V5h18m0-2H3c-1.1 0-2 .89-2 2v12a2 2 0 002 2h5v2h8v-2h5a2 2 0 002-2V5c0-1.11-.9-2-2-2z",
  "mdi:help-circle": "M15.07 11.25l-.9.92C13.45 12.89 13 13.5 13 15h-2v-.5c0-1.11.45-2.11 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41a2 2 0 00-2-2 2 2 0 00-2 2H8a4 4 0 014-4 4 4 0 014 4 3.2 3.2 0 01-.93 2.25M13 19h-2v-2h2M12 2A10 10 0 002 12a10 10 0 0010 10 10 10 0 0010-10c0-5.53-4.5-10-10-10z",
  "mdi:cloud": "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z",
  "mdi:tunnel": "M2 6C2 6 2 18 12 18S22 6 22 6H2M12 16C7 16 4.07 11.25 3.13 8H20.87C19.93 11.25 17 16 12 16Z",
};

// ─── Theme Defaults ───────────────────────────────────────────────────────────

const DEFAULT_THEME = {
  online:        "#22c55e",
  standby:       "#f59e0b",
  offline:       "#ef4444",
  upload:        "#378add",
  download:      "#d85a30",
  link_active:   "#888780",
  link_standby:  "#f59e0b",
  link_offline:  "#d3d1c7",
};

const THEME_FIELDS = [
  { key: "online",        label: "Online color",       group: "Status" },
  { key: "standby",       label: "Standby color",      group: "Status" },
  { key: "offline",       label: "Offline color",      group: "Status" },
  { key: "upload",        label: "Upload color",       group: "Flow particles" },
  { key: "download",      label: "Download color",     group: "Flow particles" },
  { key: "link_active",   label: "Active link",        group: "Link lines" },
  { key: "link_standby",  label: "Standby link",       group: "Link lines" },
  { key: "link_offline",  label: "Offline link",       group: "Link lines" },
];

const NODE_COLOR_FIELDS = [
  { key: "border",     label: "Border color"     },
  { key: "status_bar", label: "Status bar color" },
  { key: "background", label: "Background color" },
  { key: "icon",       label: "Icon color"       },
  { key: "ip_text",    label: "IP text color"    },
];

function mergeTheme(defaults, overrides = {}) {
  const merged = { ...defaults };
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== null && v !== undefined && v !== "") merged[k] = v;
  }
  return merged;
}

// ─── HA Utilities ─────────────────────────────────────────────────────────────

function resolveEntityValue(hass, entityId, key) {
  if (!hass || !entityId) return null;
  const obj = hass.states[entityId];
  if (!obj) return null;
  const state = obj.state;
  const attrs = obj.attributes || {};
  if (state === "unavailable" || state === "unknown") return null;
  switch (key) {
    case "status": return state;
    case "ip":     return attrs.ip_address || attrs.ip || state || null;
    case "upload": case "download": case "ping": case "clients": {
      const n = parseFloat(state);
      return isNaN(n) ? null : n;
    }
    default: return state;
  }
}

function resolveNodeState(hass, node) {
  if (!hass || !node?.entities) return {};
  const result = {};
  for (const [key, entityId] of Object.entries(node.entities)) {
    if (entityId) result[key] = resolveEntityValue(hass, entityId, key);
  }
  return result;
}

// ─── Canvas Renderer ──────────────────────────────────────────────────────────

const NODE_W = 88, NODE_H = 72, RX = 10;
const PR = window.devicePixelRatio || 1;

class NetworkFlowRenderer {
  constructor(canvas, config, theme) {
    this._canvas = canvas;
    this._ctx = canvas.getContext("2d");
    this._config = config;
    this._theme = theme || { ...DEFAULT_THEME };
    this._states = {};
    this._positions = {};
    this._particles = [];
    this._rafId = null;
    this._dark = false;
    this._ro = new ResizeObserver(() => this._layout());
    this._ro.observe(canvas);
    this._layout();
  }

  start()               { this._spawnParticles(); this._loop(); }
  stop()                { if (this._rafId) cancelAnimationFrame(this._rafId); this._ro.disconnect(); }
  setConfig(cfg, theme) { this._config = cfg; this._theme = theme; this._layout(); this._spawnParticles(); }
  updateStates(states)  { this._states = states || {}; this._spawnParticles(); }

  handleClick(mx, my) {
    for (const node of this._config.nodes) {
      const pos = this._positions[node.id];
      if (!pos) continue;
      if (mx >= pos.x - NODE_W/2 && mx <= pos.x + NODE_W/2 && my >= pos.y && my <= pos.y + NODE_H) {
        this._canvas.dispatchEvent(new CustomEvent("node-clicked", { detail: { nodeId: node.id, node }, bubbles: true, composed: true }));
        return node.id;
      }
    }
    return null;
  }

  _layout() {
    const W = this._canvas.offsetWidth || 600, H = 460;
    this._W = W; this._H = H;
    this._canvas.width = W * PR; this._canvas.height = H * PR;
    this._ctx.scale(PR, PR);
    this._computePositions(W);
    this._spawnParticles();
  }

  _computePositions(W) {
    const cx = W / 2;
    const nodes = this._config.nodes;
    const ispNodes      = nodes.filter(n => n.type === "isp");
    const routerNode    = nodes.find(n => n.type === "router");
    const downstream    = nodes.filter(n => n.type !== "isp" && n.type !== "router");

    if (ispNodes.length === 1) {
      this._positions[ispNodes[0].id] = { x: cx, y: 50 };
    } else {
      const spread = Math.min(160, (W * 0.6) / ispNodes.length);
      ispNodes.forEach((n, i) => {
        this._positions[n.id] = { x: cx + (i - (ispNodes.length - 1) / 2) * spread, y: 50 };
      });
    }
    if (routerNode) this._positions[routerNode.id] = { x: cx, y: 185 };
    downstream.forEach((n, i) => {
      this._positions[n.id] = { x: W * 0.08 + W * 0.84 * ((i + 0.5) / downstream.length), y: 345 };
    });
  }

  _spawnParticles() {
    this._particles = [];
    for (const lk of (this._config.links || [])) {
      const fn = this._nodeById(lk.from), tn = this._nodeById(lk.to);
      if (!fn || !tn) continue;
      const fs = this._nodeStatus(fn), ts = this._nodeStatus(tn);
      if (fs === "offline" || ts === "offline") continue;
      const standby = fs === "standby" || ts === "standby";
      const up = parseFloat(this._states[fn.id]?.upload ?? fn.data?.upload ?? 0) || 0;
      const dn = parseFloat(this._states[tn.id]?.download ?? tn.data?.download ?? 0) || 0;
      const uc = standby ? 0 : Math.max(1, Math.round(up / 200 * 5));
      const dc = standby ? 0 : Math.max(1, Math.round(dn / 200 * 5));
      for (let i = 0; i < uc; i++) this._particles.push({ from: lk.from, to: lk.to, dir: "up", t: Math.random(), speed: 0.003 + Math.random() * 0.003, standby });
      for (let i = 0; i < dc; i++) this._particles.push({ from: lk.from, to: lk.to, dir: "dn", t: Math.random(), speed: 0.003 + Math.random() * 0.003, standby });
    }
  }

  _loop() { this._rafId = requestAnimationFrame(() => { this._draw(); this._loop(); }); }

  _draw() {
    this._dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._W, this._H);
    this._drawLinks();
    this._advanceParticles();
    this._drawLinkLabels();
    this._config.nodes.forEach(n => this._drawNode(n));
    this._updateTs();
  }

  _drawLinks() {
    for (const lk of (this._config.links || [])) {
      const fn = this._nodeById(lk.from), tn = this._nodeById(lk.to);
      if (!fn || !tn) continue;
      const p0 = this._edgePoint(lk.from, lk.to), p1 = this._edgePoint(lk.to, lk.from);
      if (!p0 || !p1) continue;
      const fs = this._nodeStatus(fn), ts = this._nodeStatus(tn);
      const offline = fs === "offline" || ts === "offline";
      const standby = fs === "standby" || ts === "standby";
      const ctx = this._ctx;
      ctx.save();
      ctx.strokeStyle = offline ? this._theme.link_offline : standby ? this._theme.link_standby : this._theme.link_active;
      ctx.lineWidth = 1.5; ctx.globalAlpha = offline ? 0.18 : standby ? 0.5 : 0.38;
      if (standby) ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      ctx.restore();
    }
  }

  _drawLinkLabels() {
    for (const lk of (this._config.links || [])) {
      const fn = this._nodeById(lk.from), tn = this._nodeById(lk.to);
      if (!fn || !tn) continue;
      const fs = this._nodeStatus(fn), ts = this._nodeStatus(tn);
      if (fs === "offline" || ts === "offline") continue;
      const standby = fs === "standby" || ts === "standby";
      const p0 = this._nc(lk.from), p1 = this._nc(lk.to);
      if (!p0 || !p1) continue;
      const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
      const dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.sqrt(dx*dx + dy*dy) || 1;
      const ox = (-dy / len) * 16, oy = (dx / len) * 16;
      const ctx = this._ctx;
      ctx.save(); ctx.font = "500 10px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (standby) {
        ctx.globalAlpha = 0.6; ctx.fillStyle = this._dark ? "#c78a36" : "#92400e";
        ctx.fillText("standby", mx + ox, my + oy);
      } else {
        const iface = this._nodeById(lk.to) || this._nodeById(lk.from);
        const st = this._states[iface?.id] || {};
        const up = parseFloat(st.upload ?? iface?.data?.upload ?? 0) || 0;
        const dn = parseFloat(st.download ?? iface?.data?.download ?? 0) || 0;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = this._theme.upload; ctx.fillText("↑" + this._fmtSpd(up), mx + ox, my + oy - 7);
        ctx.fillStyle = this._theme.download; ctx.fillText("↓" + this._fmtSpd(dn), mx + ox, my + oy + 7);
      }
      ctx.restore();
    }
  }

  _advanceParticles() {
    for (const p of this._particles) {
      p.t += p.speed; if (p.t > 1) p.t = 0;
      const p0 = this._nc(p.from), p1 = this._nc(p.to); if (!p0 || !p1) continue;
      const t = p.dir === "up" ? p.t : 1 - p.t;
      const ctx = this._ctx;
      ctx.save(); ctx.globalAlpha = p.standby ? 0.2 : 0.85;
      ctx.fillStyle = p.dir === "up" ? this._theme.upload : this._theme.download;
      ctx.beginPath(); ctx.arc(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t, 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  _drawNode(node) {
    const pos = this._positions[node.id]; if (!pos) return;
    const x = pos.x - NODE_W / 2, y = pos.y;
    const status = this._nodeStatus(node);
    const offline = status === "offline", standby = status === "standby";
    const sc  = node.color?.border || node.color?.status_bar || this._statusColor(status);
    const bar = node.color?.status_bar || this._statusColor(status);
    const bg  = node.color?.background || (this._dark ? "#1e1e20" : "#ffffff");
    const tm  = this._dark ? "#e5e5e5" : "#1c1c1e";
    const ts2 = this._dark ? "#666"    : "#999";
    const ctx = this._ctx;
    ctx.save(); ctx.globalAlpha = offline ? 0.38 : 1;
    this._rrect(x, y, NODE_W, NODE_H, RX); ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = sc; ctx.lineWidth = 1.5;
    if (standby) ctx.setLineDash([5, 4]);
    ctx.stroke(); ctx.setLineDash([]);
    this._rrect(x, y, NODE_W, 5, RX); ctx.fillStyle = bar; ctx.fill();
    ctx.fillRect(x, y + 3, NODE_W, 2);
    const ip = MDI_PATHS[node.icon];
    const ic = node.color?.icon || (standby ? this._theme.standby : offline ? this._theme.offline : this._theme.upload);
    if (ip) this._drawMDI(ip, pos.x, y + 20, 18, ic);
    ctx.fillStyle = tm; ctx.font = "500 11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(this._trunc(node.label, 12), pos.x, y + 38);
    if (node.sublabel) { ctx.fillStyle = ts2; ctx.font = "400 9px system-ui"; ctx.fillText(this._trunc(node.sublabel, 14), pos.x, y + 51); }
    ctx.restore();
    this._drawMeta(node, pos, status);
  }

  _drawMeta(node, pos, status) {
    const ctx = this._ctx;
    const offline = status === "offline", standby = status === "standby";
    const st = this._states[node.id] || {};
    let ly = pos.y + NODE_H + 11;
    const ip = st.ip ?? node.data?.ip;
    if (ip && !offline) {
      ctx.save(); ctx.globalAlpha = standby ? 0.45 : 0.7;
      ctx.font = "400 9px monospace"; ctx.fillStyle = node.color?.ip_text || (this._dark ? "#666" : "#999");
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(ip, pos.x, ly); ctx.restore(); ly += 13;
    }
    const ping = st.ping ?? node.data?.ping;
    if (ping && !offline && !standby) {
      ctx.save(); ctx.globalAlpha = 0.5; ctx.font = "400 9px system-ui";
      ctx.fillStyle = this._dark ? "#444" : "#bbb"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(ping + "ms", pos.x, ly); ctx.restore(); ly += 13;
    }
    const clients = st.clients ?? node.data?.clients;
    if (clients && !offline) {
      ctx.save(); ctx.globalAlpha = 0.55; ctx.font = "400 9px system-ui";
      ctx.fillStyle = this._dark ? "#444" : "#bbb"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(clients + " clients", pos.x, ly); ctx.restore();
    }
  }

  _nodeById(id)      { return this._config.nodes.find(n => n.id === id) || null; }
  _nc(id)            { const p = this._positions[id]; return p ? { x: p.x, y: p.y + NODE_H/2 } : null; }
  _statusColor(s)    { return s === "online" ? this._theme.online : s === "standby" ? this._theme.standby : this._theme.offline; }
  _fmtSpd(v)         { if (!v) return "—"; if (v >= 1000) return (v/1000).toFixed(1)+"G"; return v.toFixed(1)+"M"; }
  _trunc(s, n)       { return s && s.length > n ? s.slice(0, n-1)+"…" : (s||""); }

  _nodeStatus(node) {
    const st = this._states[node.id] || {};
    if (st.status !== undefined && st.status !== null) {
      if (st.status === "on"  || st.status === true)  return "online";
      if (st.status === "off" || st.status === false) return "offline";
      if (["online","standby","offline"].includes(st.status)) return st.status;
    }
    return node.status || "online";
  }

  _edgePoint(id, toward) {
    const p = this._positions[id], tp = this._positions[toward]; if (!p || !tp) return null;
    const cx = p.x, cy = p.y + NODE_H/2, dx = tp.x - cx, dy = tp.y + NODE_H/2 - cy;
    const s = Math.min((NODE_W/2+2)/Math.abs(dx||.001), (NODE_H/2+2)/Math.abs(dy||.001));
    return { x: cx + dx*s, y: cy + dy*s };
  }

  _rrect(x, y, w, h, r) {
    const ctx = this._ctx;
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  }

  _drawMDI(d, cx, cy, sz, col) {
    const s = sz/24, ctx = this._ctx;
    ctx.save(); ctx.translate(cx-12*s, cy-12*s); ctx.scale(s,s);
    ctx.fillStyle = col; ctx.fill(new Path2D(d)); ctx.restore();
  }

  _updateTs() {
    const host = this._canvas.getRootNode()?.host;
    const el = host?.shadowRoot?.querySelector("#nfc-ts");
    if (el) el.textContent = new Date().toLocaleTimeString();
  }
}

// ─── Visual Editor ────────────────────────────────────────────────────────────

class NetworkFlowCardEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); }

  set hass(hass) { this._hass = hass; }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    this._render();
  }

  _fireChange() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _set(key, val) { this._config = { ...this._config, [key]: val }; this._fireChange(); this._render(); }
  _setTheme(key, val) { this._set("theme", { ...(this._config.theme||{}), [key]: val }); }

  _setNode(idx, key, val) {
    const nodes = [...(this._config.nodes||[])];
    nodes[idx] = { ...nodes[idx], [key]: val };
    this._set("nodes", nodes);
  }

  _setEntity(idx, ekey, val) {
    const nodes = [...(this._config.nodes||[])];
    nodes[idx] = { ...nodes[idx], entities: { ...(nodes[idx].entities||{}), [ekey]: val } };
    this._set("nodes", nodes);
  }

  _setColor(idx, ckey, val) {
    const nodes = [...(this._config.nodes||[])];
    nodes[idx] = { ...nodes[idx], color: { ...(nodes[idx].color||{}), [ckey]: val } };
    this._set("nodes", nodes);
  }

  _setLink(idx, key, val) {
    const links = [...(this._config.links||[])];
    links[idx] = { ...links[idx], [key]: val };
    this._set("links", links);
  }

  _render() {
    const cfg = this._config;
    const theme = mergeTheme(DEFAULT_THEME, cfg.theme || {});
    const nodes = cfg.nodes || [];
    const links = cfg.links || [];
    const activeIdx = this._activeNodeIdx ?? null;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: var(--paper-font-body1_-_font-family, system-ui); }
        .sec { font-size: 11px; font-weight: 500; color: var(--secondary-text-color); text-transform: uppercase;
               letter-spacing: .06em; margin: 18px 0 8px; padding-bottom: 4px;
               border-bottom: 1px solid var(--divider-color); }
        .sec:first-child { margin-top: 0; }
        ha-textfield { width: 100%; display: block; margin-bottom: 8px; }
        .two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .node-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px;
                    background: var(--secondary-background-color); border-radius: 8px;
                    cursor: pointer; border: 1.5px solid transparent; margin-bottom: 6px; }
        .node-row.active { border-color: var(--primary-color); }
        .node-lbl { flex: 1; font-size: 13px; color: var(--primary-text-color); }
        .node-type { font-size: 11px; color: var(--secondary-text-color); }
        .node-detail { padding: 12px; background: var(--card-background-color, #fff);
                       border-radius: 8px; border: 1px solid var(--divider-color); margin-bottom: 8px; }
        .color-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .color-lbl { flex: 1; font-size: 13px; color: var(--primary-text-color); }
        .add-btn { font-size: 12px; color: var(--primary-color); background: none; border: none;
                   cursor: pointer; font-family: inherit; padding: 0 0 0 8px; }
        .del-btn { font-size: 12px; color: var(--error-color); background: none; border: none;
                   cursor: pointer; font-family: inherit; float: right; }
        .link-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .link-row ha-select { flex: 1; }
        ha-select { display: block; margin-bottom: 8px; }
        ha-selector { display: block; margin-bottom: 8px; }
        .arrow { color: var(--secondary-text-color); }
      </style>

      <div class="sec">Card</div>
      <ha-textfield label="Title" id="title" value="${cfg.title || ""}"></ha-textfield>

      <div class="sec">Theme colors</div>
      ${THEME_FIELDS.map(f => `
        <div class="color-row">
          <span class="color-lbl">${f.label}</span>
          <input type="color" value="${theme[f.key] || "#888888"}" data-theme="${f.key}"
                 style="width:36px;height:28px;border:none;border-radius:6px;cursor:pointer;padding:2px">
        </div>
      `).join("")}

      <div class="sec">Nodes <button class="add-btn" id="add-node">+ Add</button></div>
      ${nodes.map((node, idx) => `
        <div class="node-row ${activeIdx === idx ? "active" : ""}" data-idx="${idx}">
          <ha-icon icon="${node.icon || "mdi:help-circle"}" style="color:var(--primary-color);width:20px;height:20px"></ha-icon>
          <span class="node-lbl">${node.label || node.id}</span>
          <span class="node-type">${node.type || "interface"}</span>
        </div>
        ${activeIdx === idx ? `
          <div class="node-detail">
            <button class="del-btn" data-del="${idx}">Remove</button>
            <div class="two">
              <ha-textfield label="ID" value="${node.id||""}" data-node="${idx}" data-key="id"></ha-textfield>
              <ha-textfield label="Label" value="${node.label||""}" data-node="${idx}" data-key="label"></ha-textfield>
            </div>
            <div class="two">
              <ha-textfield label="Sublabel" value="${node.sublabel||""}" data-node="${idx}" data-key="sublabel"></ha-textfield>
              <ha-textfield label="Icon (mdi:...)" value="${node.icon||""}" data-node="${idx}" data-key="icon"></ha-textfield>
            </div>
            <div class="two">
              <ha-select label="Type" data-node="${idx}" data-key="type" value="${node.type||"interface"}">
                <mwc-list-item value="isp">ISP</mwc-list-item>
                <mwc-list-item value="router">Router / Firewall</mwc-list-item>
                <mwc-list-item value="switch">Switch</mwc-list-item>
                <mwc-list-item value="interface">Interface</mwc-list-item>
                <mwc-list-item value="device">Device</mwc-list-item>
              </ha-select>
              <ha-select label="Default status" data-node="${idx}" data-key="status" value="${node.status||"online"}">
                <mwc-list-item value="online">Online</mwc-list-item>
                <mwc-list-item value="standby">Standby</mwc-list-item>
                <mwc-list-item value="offline">Offline</mwc-list-item>
              </ha-select>
            </div>

            <div class="sec" style="margin-top:10px">Entity bindings</div>
            ${["status","ip","upload","download","ping","clients"].map(ek => `
              <ha-selector .hass="${{}}" label="${ek.charAt(0).toUpperCase()+ek.slice(1)}"
                .selector="${JSON.stringify({ entity: { domain: ek === "status" ? ["binary_sensor","sensor"] : "sensor" } })}"
                value="${node.entities?.[ek]||""}" data-ent="${idx}" data-ekey="${ek}"></ha-selector>
            `).join("")}

            <div class="sec" style="margin-top:10px">Color overrides</div>
            ${NODE_COLOR_FIELDS.map(cf => `
              <div class="color-row">
                <span class="color-lbl">${cf.label}</span>
                <input type="color" value="${node.color?.[cf.key] || "#888888"}"
                       data-ncolor="${idx}" data-ckey="${cf.key}"
                       style="width:36px;height:28px;border:none;border-radius:6px;cursor:pointer;padding:2px">
              </div>
            `).join("")}
          </div>
        ` : ""}
      `).join("")}

      <div class="sec">Links <button class="add-btn" id="add-link">+ Add</button></div>
      ${links.map((lk, idx) => `
        <div class="link-row">
          <ha-select data-link="${idx}" data-lkey="from" value="${lk.from||""}">
            ${nodes.map(n => `<mwc-list-item value="${n.id}">${n.label||n.id}</mwc-list-item>`).join("")}
          </ha-select>
          <span class="arrow">→</span>
          <ha-select data-link="${idx}" data-lkey="to" value="${lk.to||""}">
            ${nodes.map(n => `<mwc-list-item value="${n.id}">${n.label||n.id}</mwc-list-item>`).join("")}
          </ha-select>
          <ha-icon-button data-del-link="${idx}" .path="${"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"}"></ha-icon-button>
        </div>
      `).join("")}
    `;

    // Wire events after render
    const sr = this.shadowRoot;

    sr.getElementById("title")?.addEventListener("input", e => this._set("title", e.target.value));
    sr.getElementById("add-node")?.addEventListener("click", () => {
      const nodes2 = [...(this._config.nodes||[])];
      this._activeNodeIdx = nodes2.length;
      nodes2.push({ id: `node${nodes2.length+1}`, label: `Node ${nodes2.length+1}`, icon: "mdi:help-circle", type: "interface", status: "online", entities: {}, color: {} });
      this._set("nodes", nodes2);
    });
    sr.getElementById("add-link")?.addEventListener("click", () => {
      const links2 = [...(this._config.links||[])];
      const n = this._config.nodes || [];
      links2.push({ from: n[0]?.id||"", to: n[1]?.id||"" });
      this._set("links", links2);
    });

    sr.querySelectorAll("[data-theme]").forEach(el => {
      el.addEventListener("input", e => this._setTheme(e.target.dataset.theme, e.target.value));
    });
    sr.querySelectorAll(".node-row").forEach(el => {
      el.addEventListener("click", () => {
        const idx2 = parseInt(el.dataset.idx);
        this._activeNodeIdx = this._activeNodeIdx === idx2 ? null : idx2;
        this._render();
      });
    });
    sr.querySelectorAll("[data-node]").forEach(el => {
      el.addEventListener("input", e => this._setNode(parseInt(e.target.dataset.node), e.target.dataset.key, e.target.value));
      el.addEventListener("selected", e => this._setNode(parseInt(e.target.dataset.node), e.target.dataset.key, e.target.value));
    });
    sr.querySelectorAll("[data-ent]").forEach(el => {
      el.addEventListener("value-changed", e => this._setEntity(parseInt(el.dataset.ent), el.dataset.ekey, e.detail.value));
    });
    sr.querySelectorAll("[data-ncolor]").forEach(el => {
      el.addEventListener("input", e => this._setColor(parseInt(e.target.dataset.ncolor), e.target.dataset.ckey, e.target.value));
    });
    sr.querySelectorAll("[data-link]").forEach(el => {
      el.addEventListener("selected", e => this._setLink(parseInt(e.target.dataset.link), e.target.dataset.lkey, e.target.value));
    });
    sr.querySelectorAll("[data-del]").forEach(el => {
      el.addEventListener("click", e => {
        e.stopPropagation();
        const idx2 = parseInt(el.dataset.del);
        const removedId = this._config.nodes[idx2]?.id;
        const nodes2 = [...this._config.nodes]; nodes2.splice(idx2, 1);
        const links2 = (this._config.links||[]).filter(l => l.from !== removedId && l.to !== removedId);
        this._activeNodeIdx = null;
        this._config = { ...this._config, nodes: nodes2, links: links2 };
        this._fireChange(); this._render();
      });
    });
    sr.querySelectorAll("[data-del-link]").forEach(el => {
      el.addEventListener("click", () => {
        const links2 = [...(this._config.links||[])]; links2.splice(parseInt(el.dataset.delLink), 1);
        this._set("links", links2);
      });
    });
  }
}
customElements.define("network-flow-card-editor", NetworkFlowCardEditor);

// ─── Main Card ────────────────────────────────────────────────────────────────

class NetworkFlowCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._states = {};
    this._renderer = null;
    this._theme = { ...DEFAULT_THEME };
    this._initialized = false;
  }

  static getConfigElement() { return document.createElement("network-flow-card-editor"); }
  static getStubConfig() {
    return {
      title: "Network flow",
      theme: {},
      nodes: [
        { id: "wan1", label: "Primary ISP", icon: "mdi:web", type: "isp", status: "online", entities: { status: "", ip: "", upload: "", download: "", ping: "" } },
        { id: "router", label: "Router", icon: "mdi:router-network", type: "router", status: "online", entities: { status: "", ip: "" } },
        { id: "lan", label: "LAN", icon: "mdi:switch", type: "interface", status: "online", entities: { status: "", ip: "", upload: "", download: "", clients: "" } },
      ],
      links: [{ from: "wan1", to: "router" }, { from: "router", to: "lan" }],
    };
  }

  setConfig(config) {
    if (!config.nodes || !config.links) throw new Error("network-flow-card: nodes and links are required");
    this._config = config;
    this._theme = mergeTheme(DEFAULT_THEME, config.theme || {});
    if (!this._initialized) { this._build(); this._initialized = true; }
    else if (this._renderer) this._renderer.setConfig(this._config, this._theme);
    this._syncStates();
  }

  set hass(hass) {
    this._hass = hass;
    this._syncStates();
  }

  _syncStates() {
    if (!this._hass || !this._config) return;
    const states = {};
    for (const node of this._config.nodes) {
      states[node.id] = resolveNodeState(this._hass, node);
    }
    this._states = states;
    if (this._renderer) this._renderer.updateStates(states);
  }

  _build() {
    const theme = this._theme;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { padding: 16px 16px 14px; overflow: hidden; }
        .hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .ttl { font-size: 14px; font-weight: 500; color: var(--primary-text-color); }
        .ts  { font-size: 10px; color: var(--secondary-text-color); }
        canvas { display: block; width: 100%; cursor: pointer; }
        .leg  { display: flex; gap: 10px; margin-top: 10px; padding-top: 8px;
                border-top: 1px solid var(--divider-color); flex-wrap: wrap; }
        .li   { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--secondary-text-color); }
        .ld   { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .hint { font-size: 10px; color: var(--disabled-text-color); margin-top: 5px; }
      </style>
      <ha-card>
        <div class="hdr">
          <span class="ttl">${this._config.title || "Network flow"}</span>
          <span class="ts" id="nfc-ts"></span>
        </div>
        <canvas id="nfc-canvas"></canvas>
        <div class="leg">
          <div class="li"><div class="ld" style="background:${theme.online}"></div>Online</div>
          <div class="li"><div class="ld" style="background:${theme.standby}"></div>Standby</div>
          <div class="li"><div class="ld" style="background:${theme.offline}"></div>Offline</div>
          <div class="li"><div class="ld" style="background:${theme.upload}"></div>↑ Upload</div>
          <div class="li"><div class="ld" style="background:${theme.download}"></div>↓ Download</div>
        </div>
        <div class="hint">Tap a node for details</div>
      </ha-card>
    `;
    const canvas = this.shadowRoot.getElementById("nfc-canvas");
    this._renderer = new NetworkFlowRenderer(canvas, this._config, this._theme);
    this._renderer.updateStates(this._states);
    this._renderer.start();
    canvas.addEventListener("click", e => {
      const rect = canvas.getBoundingClientRect();
      this._renderer.handleClick(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.addEventListener("node-clicked", e => {
      const node = e.detail.node;
      if (node.entities?.status && this._hass) {
        const event = new CustomEvent("hass-more-info", { detail: { entityId: node.entities.status }, bubbles: true, composed: true });
        this.dispatchEvent(event);
      }
    });
  }

  getCardSize() { return 5; }

  disconnectedCallback() {
    if (this._renderer) this._renderer.stop();
  }
}

customElements.define("network-flow-card", NetworkFlowCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:             "network-flow-card",
  name:             "Network Flow Card",
  description:      "Visualize network topology with animated upload/download flow",
  preview:          true,
  documentationURL: "https://github.com/mexigabacho/ha_network_flow_card",
});
