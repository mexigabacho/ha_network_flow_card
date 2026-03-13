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

// ─── Icon path cache ─────────────────────────────────────────────────────────
// Fetches SVG path data from HA's bundled MDI icon set on demand.

// Icons are resolved on demand via ha-icon shadow DOM extraction and cached.
// Once cached, the next animation frame picks it up — no flicker, no rebuild.

const _iconCache = new Map();
const _iconFetching = new Set();

// All icons are resolved dynamically via ha-icon shadow DOM extraction.
// Results are cached so each icon is only fetched once per session.

// Resolve an MDI icon path by rendering a hidden ha-icon element and reading
// the SVG path from its shadow DOM. This works with any icon HA supports,
// including all mdi:* icons, without relying on any internal HA endpoints.
//
// The ha-icon element handles all version differences internally — always
// matching exactly what HA renders in its own UI. We wait for it to render,
// grab the <path d="..."> from its shadow root, cache it, and remove the
// temporary element. Subsequent lookups hit the cache instantly.

// Off-screen container for temporary ha-icon elements
let _iconStage = null;
function _getIconStage() {
  if (!_iconStage) {
    _iconStage = document.createElement("div");
    _iconStage.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:24px;height:24px;visibility:hidden;pointer-events:none";
    document.body.appendChild(_iconStage);
  }
  return _iconStage;
}

async function fetchMdiPath(mdiKey) {
  if (_iconCache.has(mdiKey)) return _iconCache.get(mdiKey);
  if (_iconFetching.has(mdiKey)) return null;
  if (!mdiKey) return null;

  _iconFetching.add(mdiKey);

  return new Promise(resolve => {
    const el = document.createElement("ha-icon");
    el.setAttribute("icon", mdiKey);

    // Poll the shadow DOM for the rendered SVG path.
    // ha-icon renders asynchronously — the path appears after 1-3 rAF cycles.
    let attempts = 0;
    const maxAttempts = 40; // ~667ms at 60fps before giving up

    function tryExtract() {
      attempts++;

      // Try multiple shadow DOM structures across HA versions:
      // Modern: ha-icon → ha-svg-icon (shadow) → svg → path
      // Older:  ha-icon (shadow) → ha-svg-icon → svg → path
      const roots = [
        el.shadowRoot,
        el.shadowRoot?.querySelector("ha-svg-icon")?.shadowRoot,
      ];

      for (const root of roots) {
        if (!root) continue;
        const pathEl = root.querySelector("svg path[d]") ||
                       root.querySelector("path[d]");
        if (pathEl) {
          const d = pathEl.getAttribute("d");
          if (d && d.length > 5) {
            _iconCache.set(mdiKey, d);
            _iconFetching.delete(mdiKey);
            el.remove();
            resolve(d);
            return;
          }
        }
      }

      if (attempts >= maxAttempts) {
        // Give up — mark null so we don't retry every frame
        _iconCache.set(mdiKey, null);
        _iconFetching.delete(mdiKey);
        el.remove();
        resolve(null);
        return;
      }

      requestAnimationFrame(tryExtract);
    }

    _getIconStage().appendChild(el);
    requestAnimationFrame(tryExtract);
  });
}

// Pre-fetch all icons used in a config so they're ready before first paint
function prefetchConfigIcons(config) {
  for (const node of (config.nodes || [])) {
    if (node.icon) fetchMdiPath(node.icon);
  }
}


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
    case "status":     return state;
    case "status2":    return state; // secondary status entity — raw state string
    case "active_wan": return state;
    case "ip":         return attrs.ip_address || attrs.ip || state || null;
    case "upload": case "download": case "ping": case "clients": {
      const n = parseFloat(state);
      return isNaN(n) ? null : n;
    }
    default: return state;
  }
}

// Resolve the card-level active_wan entity (returns string or null)
function resolveActiveWan(hass, config) {
  const entityId = config.active_wan;
  if (!hass || !entityId) return null;
  return resolveEntityValue(hass, entityId, "active_wan");
}

function resolveNodeState(hass, node) {
  if (!hass || !node?.entities) return {};
  const result = {};
  for (const [key, entityId] of Object.entries(node.entities)) {
    if (entityId) result[key] = resolveEntityValue(hass, entityId, key);
  }
  return result;
}

// ─── Speed resolution ────────────────────────────────────────────────────────
// For a link A→B, the "speed node" is whichever end actually has speed data.
// Priority:
//   1. The non-router end, if it has speed data
//   2. Either end that has speed data
//   3. No data — return {up:0, dn:0}
// This correctly handles:
//   wan1 → router  : speeds from wan1 (ISP node)
//   router → lan   : speeds from lan  (interface node)
//   router → wifi5 : speeds from wifi5

function resolveLinkSpeeds(fromNode, toNode, states) {
  const fst = states[fromNode.id] || {};
  const tst = states[toNode.id]   || {};

  // Does each end have any speed data (entity state or mock data)?
  const fUp = parseFloat(fst.upload   ?? fromNode.data?.upload   ?? NaN);
  const fDn = parseFloat(fst.download ?? fromNode.data?.download ?? NaN);
  const tUp = parseFloat(tst.upload   ?? toNode.data?.upload     ?? NaN);
  const tDn = parseFloat(tst.download ?? toNode.data?.download   ?? NaN);

  const fromHasData = !isNaN(fUp) || !isNaN(fDn);
  const toHasData   = !isNaN(tUp) || !isNaN(tDn);

  // Prefer the non-router end
  const fromIsRouter = fromNode.type === "router";
  const toIsRouter   = toNode.type   === "router";

  let speedNode, speedState, speedDef;
  if (!fromIsRouter && fromHasData) {
    speedNode = fromNode; speedState = fst;
  } else if (!toIsRouter && toHasData) {
    speedNode = toNode;   speedState = tst;
  } else if (fromHasData) {
    speedNode = fromNode; speedState = fst;
  } else if (toHasData) {
    speedNode = toNode;   speedState = tst;
  } else {
    return { up: 0, dn: 0 };
  }

  return {
    up: parseFloat(speedState.upload   ?? speedNode.data?.upload   ?? 0) || 0,
    dn: parseFloat(speedState.download ?? speedNode.data?.download ?? 0) || 0,
  };
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
    this._activeWan = null; // value of card-level active_wan entity
    this._positions = {};
    this._particles = [];
    this._rafId = null;
    this._dark = false;
    this._ro = new ResizeObserver(() => this._layout());
    this._ro.observe(canvas);
    prefetchConfigIcons(config);
    this._layout();
  }

  start()               { this._spawnParticles(); this._loop(); }
  stop()                { if (this._rafId) cancelAnimationFrame(this._rafId); this._ro.disconnect(); }
  setConfig(cfg, theme) {
    this._config = cfg;
    this._theme = theme;
    prefetchConfigIcons(cfg);
    this._layout();
    this._spawnParticles();
  }
  // activeWan is re-resolved from hass in _syncStates; this resets on config change
  resetActiveWan() { this._activeWan = null; }
  updateStates(states)  { this._states = states || {}; this._spawnParticles(); }
  updateActiveWan(val)  { this._activeWan = val || null; this._spawnParticles(); }

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
      const { up, dn } = resolveLinkSpeeds(fn, tn, this._states);
      const uc = standby ? 0 : Math.max(1, Math.round(up / 200 * 5));
      const dc = standby ? 0 : Math.max(1, Math.round(dn / 200 * 5));
      for (let i = 0; i < uc; i++) this._particles.push({ from: lk.from, to: lk.to, dir: "up", t: Math.random(), speed: 0.003 + Math.random() * 0.003, standby });
      for (let i = 0; i < dc; i++) this._particles.push({ from: lk.from, to: lk.to, dir: "dn", t: Math.random(), speed: 0.003 + Math.random() * 0.003, standby });
    }
  }

  _loop() { this._rafId = requestAnimationFrame(() => { this._draw(); this._loop(); }); }

  _draw() {
    this._resolveThemeColors();
    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._W, this._H);
    this._drawLinks();
    this._advanceParticles();
    this._drawLinkLabels();
    this._config.nodes.forEach(n => this._drawNode(n));
    this._updateTs();
  }

  // Read resolved CSS variable values from the HA host element.
  // Called once per frame — getComputedStyle is cheap on a single element.
  // Falls back to sensible defaults so the card works even outside HA.
  _resolveThemeColors() {
    const host = this._canvas.getRootNode()?.host;
    const cs = host ? getComputedStyle(host) : null;
    const get = (v, fb) => cs ? (cs.getPropertyValue(v).trim() || fb) : fb;

    this._colors = {
      cardBg:    get("--card-background-color",    get("--ha-card-background", "#ffffff")),
      textPri:   get("--primary-text-color",        "#1c1c1e"),
      textSec:   get("--secondary-text-color",      "#6b6b6b"),
      textDis:   get("--disabled-text-color",       "#9a9a9a"),
      divider:   get("--divider-color",             "rgba(0,0,0,0.12)"),
      fontFamily:get("--mdc-typography-body1-font-family",
                   get("--paper-font-body1_-_font-family", "system-ui")),
      fontMono:  get("--code-font-family",          "monospace"),
    };
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
      const _ff = (this._colors?.fontFamily || "system-ui");
      ctx.save(); ctx.font = `500 10px ${_ff}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (standby) {
        ctx.globalAlpha = 0.6; ctx.fillStyle = this._theme.standby || "#f59e0b";
        ctx.fillText("standby", mx + ox, my + oy);
      } else {
        const { up, dn } = resolveLinkSpeeds(fn, tn, this._states);
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
    const c   = this._colors || {};
    const bg  = node.color?.background || c.cardBg  || "#ffffff";
    const tm  = c.textPri  || "#1c1c1e";
    const ts2 = c.textSec  || "#6b6b6b";
    const ctx = this._ctx;
    ctx.save(); ctx.globalAlpha = offline ? 0.38 : 1;
    this._rrect(x, y, NODE_W, NODE_H, RX); ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = sc; ctx.lineWidth = 1.5;
    if (standby) ctx.setLineDash([5, 4]);
    ctx.stroke(); ctx.setLineDash([]);
    this._rrect(x, y, NODE_W, 5, RX); ctx.fillStyle = bar; ctx.fill();
    ctx.fillRect(x, y + 3, NODE_W, 2);
    // Get path from cache (populated by fetchMdiPath via ha-icon extraction)
    const ip = _iconCache.get(node.icon);
    const ic = node.color?.icon || (standby ? this._theme.standby : offline ? this._theme.offline : this._theme.upload);
    if (ip) {
      this._drawMDI(ip, pos.x, y + 20, 18, ic);
    } else if (node.icon && !_iconCache.has(node.icon)) {
      // Not in cache yet — trigger fetch (result lands on next animation frame)
      fetchMdiPath(node.icon);
    }
    const ff = (this._colors?.fontFamily || "system-ui");
    ctx.fillStyle = tm; ctx.font = `500 11px ${ff}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(this._trunc(node.label, 12), pos.x, y + 38);
    if (node.sublabel) { ctx.fillStyle = ts2; ctx.font = `400 9px ${ff}`; ctx.fillText(this._trunc(node.sublabel, 14), pos.x, y + 51); }
    ctx.restore();
    this._drawMeta(node, pos, status);
  }

  // Build the list of metadata lines to render for a node.
  // Returns array of { text, font, color, alpha, dot, dotColor } objects.
  _buildMetaLines(node, status) {
    const st     = this._states[node.id] || {};
    const c      = this._colors || {};
    const ff     = c.fontFamily || "system-ui";
    const ffm    = c.fontMono   || "monospace";
    const muted  = c.textSec    || "#6b6b6b";
    const ipCol  = node.color?.ip_text || muted;
    const offline  = status === "offline";
    const standby  = status === "standby";
    const lines = [];

    const ip = st.ip ?? node.data?.ip;
    if (ip && !offline) {
      lines.push({ text: ip, font: `400 9px ${ffm}`, color: ipCol, alpha: standby ? 0.45 : 0.7 });
    }
    const ping = st.ping ?? node.data?.ping;
    if (ping && !offline && !standby) {
      lines.push({ text: ping + "ms", font: `400 9px ${ff}`, color: muted, alpha: 0.5 });
    }
    const clients = st.clients ?? node.data?.clients;
    if (clients && !offline) {
      lines.push({ text: clients + " clients", font: `400 9px ${ff}`, color: muted, alpha: 0.55 });
    }
    // Secondary status entity — icon path + state string
    const s2 = st.status2;
    if (s2 !== null && s2 !== undefined && !offline) {
      const iconKey = node.entities?.status2
        ? this._getEntityIcon(node.entities.status2) : null;
      lines.push({
        text: s2,
        font: `400 9px ${ff}`,
        color: muted,
        alpha: 0.75,
        iconKey,               // mdi:* key — rendered as tiny dot if path available
        dotColor: this._statusDotColor(s2),
      });
    }
    return lines;
  }

  // Map common state strings to a meaningful dot color.
  _statusDotColor(state) {
    const s = (state || "").toLowerCase();
    if (["on","online","connected","up","active","home","open","locked","enabled"].includes(s))
      return this._theme.online;
    if (["off","offline","disconnected","down","closed","unlocked","disabled"].includes(s))
      return this._theme.offline;
    if (["standby","idle","paused","away","unavailable"].includes(s))
      return this._theme.standby;
    return null; // no dot for unknown states
  }

  // Get the entity icon key from hass state attributes
  _getEntityIcon(entityId) {
    const host = this._canvas.getRootNode()?.host;
    const hass = host?._hass;
    if (!hass || !entityId) return null;
    const obj = hass.states[entityId];
    return obj?.attributes?.icon || null;
  }

  _drawMeta(node, pos, status) {
    // Resolve position: per-node → card-level default → "below"
    const position = node.meta_position ||
                     this._config.meta_position ||
                     "below";
    const lines = this._buildMetaLines(node, status);
    if (!lines.length) return;

    const ctx    = this._ctx;
    const LINE_H = 13;
    const DOT_R  = 3;
    const PAD    = 10; // gap between node box edge and metadata block

    // Total height of the metadata block
    const blockH = lines.length * LINE_H - 2;

    // Anchor point and text alignment depend on position
    let ax, ay, align, baseline;
    switch (position) {
      case "above":
        ax = pos.x;
        ay = pos.y - PAD - blockH;
        align = "center"; baseline = "top";
        break;
      case "left":
        ax = pos.x - NODE_W / 2 - PAD;
        ay = pos.y + NODE_H / 2 - blockH / 2;
        align = "right"; baseline = "top";
        break;
      case "right":
        ax = pos.x + NODE_W / 2 + PAD;
        ay = pos.y + NODE_H / 2 - blockH / 2;
        align = "left"; baseline = "top";
        break;
      case "below":
      default:
        ax = pos.x;
        ay = pos.y + NODE_H + PAD;
        align = "center"; baseline = "top";
        break;
    }

    lines.forEach((line, i) => {
      const ly = ay + i * LINE_H;
      ctx.save();
      ctx.globalAlpha = line.alpha;
      ctx.font = line.font;
      ctx.textAlign = align;
      ctx.textBaseline = baseline;

      // Draw colored dot for secondary status (or icon if cached)
      if (line.dotColor || line.iconKey) {
        const dotCol = line.dotColor;
        const iconPath = line.iconKey ? _iconCache.get(line.iconKey) : null;

        // Calculate dot x position relative to text anchor
        let dotX, textX;
        const DOT_SIZE = 7;
        const DOT_GAP  = 4;
        const totalDot = DOT_SIZE + DOT_GAP;

        if (align === "center") {
          ctx.measureText(line.text); // warm up
          const tw = ctx.measureText(line.text).width;
          dotX  = ax - tw / 2 - DOT_GAP - DOT_SIZE / 2;
          textX = ax + DOT_SIZE / 2 + DOT_GAP / 2;
        } else if (align === "right") {
          const tw = ctx.measureText(line.text).width;
          textX = ax;
          dotX  = ax - tw - DOT_GAP - DOT_SIZE / 2;
        } else {
          dotX  = ax + DOT_SIZE / 2;
          textX = ax + totalDot;
        }

        const dotCy = ly + LINE_H / 2 - 1;

        if (iconPath) {
          // Render tiny icon at DOT_SIZE
          const s = DOT_SIZE / 24;
          ctx.save();
          ctx.translate(dotX - DOT_SIZE / 2, dotCy - DOT_SIZE / 2);
          ctx.scale(s, s);
          ctx.fillStyle = dotCol || line.color;
          ctx.fill(new Path2D(iconPath));
          ctx.restore();
        } else {
          // Filled circle dot
          if (dotCol) {
            ctx.save();
            ctx.globalAlpha = line.alpha * 0.9;
            ctx.fillStyle = dotCol;
            ctx.beginPath();
            ctx.arc(dotX, dotCy, DOT_R, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            // Trigger icon fetch for next frame if we have a key
            if (line.iconKey && !_iconCache.has(line.iconKey)) {
              fetchMdiPath(line.iconKey);
            }
          }
        }
        // Draw text offset from dot
        ctx.fillStyle = line.color;
        ctx.textAlign = align === "center" ? "left" : align;
        ctx.fillText(this._trunc(line.text, 16), textX, ly);
      } else {
        ctx.fillStyle = line.color;
        ctx.fillText(this._trunc(line.text, 18), ax, ly);
      }
      ctx.restore();
    });
  }

  _nodeById(id)      { return this._config.nodes.find(n => n.id === id) || null; }
  _nc(id)            { const p = this._positions[id]; return p ? { x: p.x, y: p.y + NODE_H/2 } : null; }
  _statusColor(s)    { return s === "online" ? this._theme.online : s === "standby" ? this._theme.standby : this._theme.offline; }
  _fmtSpd(v)         { if (!v) return "—"; if (v >= 1000) return (v/1000).toFixed(1)+"G"; return v.toFixed(1)+"M"; }
  _trunc(s, n)       { return s && s.length > n ? s.slice(0, n-1)+"…" : (s||""); }

  _nodeStatus(node) {
    const st = this._states[node.id] || {};

    // Step 1 — resolve connected/disconnected from status entity
    let connected = null; // true=connected, false=disconnected, null=unknown
    if (st.status !== undefined && st.status !== null) {
      if (st.status === "on"  || st.status === true)  connected = true;
      else if (st.status === "off" || st.status === false) connected = false;
      else if (st.status === "offline") connected = false;
      else if (st.status === "online" || st.status === "standby") connected = true;
    }

    // Step 2 — offline always wins
    if (connected === false) return "offline";

    // Step 3 — if active_wan entity is available and this node has active_value,
    // use that to determine online vs standby
    if (this._activeWan !== null && node.active_value !== undefined && node.active_value !== "") {
      if (connected === false) return "offline";
      // Compare trimmed lowercase so "Primary" matches "primary" etc.
      const isActive = this._activeWan.trim().toLowerCase() ===
                       String(node.active_value).trim().toLowerCase();
      return isActive ? "online" : "standby";
    }

    // Step 4 — no active_wan logic, fall back to raw status string or config default
    if (st.status !== undefined && st.status !== null) {
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
    if (!el) return;
    const hass = host?._hass;
    const locale = hass?.locale;
    if (locale) {
      // Use HA locale: respects user's 12h/24h preference and language
      const opts = {
        hour: "numeric", minute: "2-digit",
        hour12: locale.time_format === "12" ||
                (locale.time_format === "language" &&
                 new Intl.DateTimeFormat(locale.language, { hour: "numeric" })
                   .resolvedOptions().hour12),
      };
      el.textContent = new Intl.DateTimeFormat(locale.language || "default", opts).format(new Date());
    } else {
      el.textContent = new Date().toLocaleTimeString();
    }
  }
}


// ─── Visual Editor ────────────────────────────────────────────────────────────
// Core rule: text fields NEVER trigger a DOM rebuild.
// - Text input → writes to _config, debounces _fireChange (400ms)
// - Selects / color pickers / entity pickers → write + fire immediately (single events)
// - Structural changes (add/remove node or link, expand/collapse) → targeted rebuild
//   of only the affected list, never the whole shadow DOM
// This keeps focus stable so users can type normally.

class NetworkFlowCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._activeNodeIdx = null;
    this._mounted = false;
    this._textTimer = null;
    this._interacting = false;  // true while a select/picker is open
    this._interactTimer = null;
  }

  set hass(h) {
    this._hass = h;
    if (this._mounted) {
      this.shadowRoot.querySelectorAll("ha-selector, ha-icon-picker").forEach(el => { el.hass = h; });
    }
  }

  // Sync active_wan picker when setConfig called externally
  _syncActiveWanPicker() {
    const el = this.shadowRoot?.getElementById("f-active-wan");
    if (el) el.value = this._config.active_wan || "";
  }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._mounted) {
      this._buildShell();
      this._mounted = true;
    } else if (!this._interacting) {
      // Only sync field values when no user interaction is in flight.
      // If a select is open, HA's setConfig callback would reset it mid-pick.
      this._syncValues();
    }
  }

  _fireChange() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  // Write helpers — update _config in place, fire event, NO DOM rebuild ───────

  _wTop(key, val)               { this._config = { ...this._config, [key]: val }; this._fireChange(); }
  _wTheme(key, val)             { this._wTop("theme", { ...(this._config.theme||{}), [key]: val }); }
  _wNodeField(i, key, val)      { const n=[...this._config.nodes]; n[i]={...n[i],[key]:val}; this._wTop("nodes",n); }
  _wNodeEntity(i, ek, val)      { const n=[...this._config.nodes]; n[i]={...n[i],entities:{...(n[i].entities||{}),[ek]:val}}; this._wTop("nodes",n); }
  _wNodeColor(i, ck, val)       { const n=[...this._config.nodes]; n[i]={...n[i],color:{...(n[i].color||{}),[ck]:val}}; this._wTop("nodes",n); }
  _wLink(i, key, val)           { const l=[...this._config.links]; l[i]={...l[i],[key]:val}; this._wTop("links",l); }

  // Debounced text input — writes config immediately, fires after 400ms pause
  _onText(writeFn) {
    writeFn();
    clearTimeout(this._textTimer);
    this._textTimer = setTimeout(() => this._fireChange(), 400);
  }

  // Build the shell HTML once ─────────────────────────────────────────────────

  _buildShell() {
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;font-family:var(--paper-font-body1_-_font-family,system-ui)}
      .sec{font-size:11px;font-weight:500;color:var(--secondary-text-color);text-transform:uppercase;
           letter-spacing:.06em;margin:18px 0 8px;padding-bottom:4px;
           border-bottom:1px solid var(--divider-color);display:flex;align-items:center}
      .sec:first-child{margin-top:0}
      .sec-btn{font-size:12px;color:var(--primary-color);background:none;border:none;
               cursor:pointer;font-family:inherit;margin-left:8px;padding:0}
      ha-textfield{width:100%;display:block;margin-bottom:8px}
      .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .node-row{display:flex;align-items:center;gap:8px;padding:8px 10px;
                background:var(--secondary-background-color);border-radius:8px;
                cursor:pointer;border:1.5px solid transparent;margin-bottom:6px}
      .node-row.active{border-color:var(--primary-color)}
      .node-lbl{flex:1;font-size:13px;color:var(--primary-text-color)}
      .node-type{font-size:11px;color:var(--secondary-text-color)}
      .node-detail{padding:12px;background:var(--card-background-color,#fff);
                   border-radius:8px;border:1px solid var(--divider-color);
                   margin-bottom:8px;display:none}
      .node-detail.open{display:block}
      .del-btn{font-size:12px;color:var(--error-color);background:none;border:none;
               cursor:pointer;font-family:inherit;float:right;margin-bottom:8px}
      .color-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
      .color-lbl{flex:1;font-size:13px;color:var(--primary-text-color)}
      .swatch{width:36px;height:28px;border:none;border-radius:6px;cursor:pointer;padding:2px;flex-shrink:0}
      .swatch.unset{opacity:0.35;outline:2px dashed var(--divider-color);outline-offset:2px}
      .clr-btn{font-size:11px;color:var(--secondary-text-color);background:none;border:none;
               cursor:pointer;padding:2px 4px;border-radius:4px;line-height:1;flex-shrink:0;
               opacity:0.6;font-family:inherit}
      .clr-btn:hover{color:var(--error-color);opacity:1}
      .clr-btn.hidden{visibility:hidden}
      ha-icon-picker{display:block;width:100%;margin-bottom:8px}
      .link-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
      .link-row .nfc-sel{flex:1}
      .nfc-sel-wrap{display:block;margin-bottom:8px;position:relative}
      .nfc-sel-wrap label{display:block;font-size:12px;color:var(--secondary-text-color);margin-bottom:4px}
      .nfc-sel{width:100%;padding:8px 32px 8px 12px;font-size:14px;font-family:inherit;
               color:var(--primary-text-color);background:var(--card-background-color,#fff);
               border:1px solid var(--divider-color);border-radius:4px;cursor:pointer;
               appearance:none;-webkit-appearance:none}
      .nfc-sel:focus{outline:2px solid var(--primary-color);outline-offset:-1px}
      .nfc-sel-wrap::after{content:"▾";position:absolute;right:10px;bottom:10px;
                           pointer-events:none;color:var(--secondary-text-color);font-size:12px}
      ha-selector{display:block;margin-bottom:8px}
      .arrow{color:var(--secondary-text-color);flex-shrink:0}
      .subsec{font-size:10px;font-weight:500;color:var(--secondary-text-color);
              text-transform:uppercase;letter-spacing:.05em;
              margin:12px 0 6px;padding-bottom:3px;border-bottom:1px solid var(--divider-color)}
      .hint-text{font-size:11px;color:var(--secondary-text-color);
                 margin:-4px 0 10px;line-height:1.5}
    </style>
    <div class="sec">Card</div>
    <ha-textfield id="f-title" label="Title"></ha-textfield>
    <ha-selector id="f-active-wan" label="Active WAN entity"></ha-selector>
    <div class="hint-text">Optional: sensor that returns which WAN is active (e.g. "primary" / "backup").
      Pair with <em>active value</em> on each ISP node.</div>

    <div class="sec">Label position</div>
    <div id="f-meta-pos-wrap"></div>
    <div class="hint-text">Where to show IP, ping, clients, and secondary status relative to each node box.
      Can be overridden per node.</div>

    <div class="sec">Theme colors</div>
    <div id="theme-colors"></div>
    <div class="sec">Nodes<button class="sec-btn" id="btn-add-node">+ Add node</button></div>
    <div id="node-list"></div>
    <div class="sec">Links<button class="sec-btn" id="btn-add-link">+ Add link</button></div>
    <div id="link-list"></div>`;

    const sr = this.shadowRoot;

    // Title — listen for both input (debounce) and change (immediate on blur)
    const titleEl = sr.getElementById("f-title");
    titleEl.value = this._config.title || "";
    titleEl.addEventListener("input", e => {
      this._config = { ...this._config, title: e.target.value };
      clearTimeout(this._textTimer);
      this._textTimer = setTimeout(() => this._fireChange(), 400);
    });
    titleEl.addEventListener("change", e => {
      this._config = { ...this._config, title: e.target.value };
      this._fireChange();
    });

    // Card-level meta_position selector
    const metaPosWrap = sr.getElementById("f-meta-pos-wrap");
    const META_POS_OPTS = [
      {v:"below", l:"Below (default)"}, {v:"above", l:"Above"},
      {v:"left",  l:"Left"},            {v:"right", l:"Right"},
    ];
    metaPosWrap.appendChild(this._sel(
      "Default label position", META_POS_OPTS,
      this._config.meta_position || "below",
      val => { this._config = { ...this._config, meta_position: val }; this._fireChange(); }
    ));

    // Active WAN entity picker
    const activeWanPicker = sr.getElementById("f-active-wan");
    activeWanPicker.hass = this._hass;
    activeWanPicker.selector = { entity: { domain: "sensor" } };
    activeWanPicker.value = this._config.active_wan || "";
    activeWanPicker.addEventListener("value-changed", e => {
      const val = e.detail.value || "";
      this._config = { ...this._config, active_wan: val || undefined };
      if (!val) delete this._config.active_wan;
      this._fireChange();
    });

    sr.getElementById("btn-add-node").addEventListener("click", () => {
      const nodes = [...(this._config.nodes||[])];
      this._activeNodeIdx = nodes.length;
      nodes.push({ id:`node${nodes.length+1}`, label:`Node ${nodes.length+1}`,
                   icon:"mdi:help-circle", type:"interface", status:"online",
                   entities:{}, color:{} });
      this._config = { ...this._config, nodes };
      this._fireChange();
      this._rebuildNodes();
      this._rebuildLinks();
    });

    sr.getElementById("btn-add-link").addEventListener("click", () => {
      const links = [...(this._config.links||[])];
      const n = this._config.nodes || [];
      links.push({ from: n[0]?.id||"", to: n[1]?.id||"" });
      this._config = { ...this._config, links };
      this._fireChange();
      this._rebuildLinks();
    });

    this._buildThemeColors();
    this._rebuildNodes();
    this._rebuildLinks();
  }

  // Sync field values when config changes externally ──────────────────────────

  _syncValues() {
    const sr = this.shadowRoot;
    // Never sync field values while any interactive element is focused or
    // while the _interacting flag is set (select/picker open)
    if (this._interacting) return;

    const titleEl = sr.getElementById("f-title");
    if (titleEl && sr.activeElement !== titleEl) {
      titleEl.value = this._config.title || "";
    }
    const theme = mergeTheme(DEFAULT_THEME, this._config.theme || {});
    THEME_FIELDS.forEach(f => {
      const el = sr.querySelector(`[data-theme="${f.key}"]`);
      if (el) el.value = theme[f.key] || "#888888";
    });
    // Sync the card-level active_wan picker
    this._syncActiveWanPicker();
    // Sync meta_position selector
    const mpWrap = sr.getElementById("f-meta-pos-wrap");
    if (mpWrap) {
      const mpSel = mpWrap.querySelector("select");
      if (mpSel) mpSel.value = this._config.meta_position || "below";
    }

    // Sync ha-selector values only when not interacting (picker not open)
    sr.querySelectorAll("ha-selector").forEach(sel => {
      if (sel._pendingInteraction) return;
      const nodeIdx = parseInt(sel.dataset.nodeIdx);
      const ek = sel.dataset.entityKey;
      if (!isNaN(nodeIdx) && ek) {
        const val = this._config.nodes[nodeIdx]?.entities?.[ek] || "";
        if (sel.value !== val) sel.value = val;
      }
    });
  }

  // Theme color swatches — built once ────────────────────────────────────────

  _buildThemeColors() {
    const container = this.shadowRoot.getElementById("theme-colors");
    const userTheme = this._config.theme || {};
    THEME_FIELDS.forEach(f => {
      const isOverridden = userTheme[f.key] !== undefined && userTheme[f.key] !== "";
      const row = document.createElement("div");
      row.className = "color-row";

      const lbl = document.createElement("span");
      lbl.className = "color-lbl";
      lbl.textContent = f.label;

      const sw = document.createElement("input");
      sw.type = "color"; sw.className = "swatch" + (isOverridden ? "" : " unset");
      sw.value = userTheme[f.key] || DEFAULT_THEME[f.key];
      sw.dataset.theme = f.key;
      sw.title = isOverridden ? "Custom color (click to change)" : "Using default — click to override";
      sw.addEventListener("input", e => {
        e.target.classList.remove("unset");
        e.target.title = "Custom color (click to change)";
        resetBtn.classList.remove("hidden");
        this._wTheme(e.target.dataset.theme, e.target.value);
      });

      // Reset button — removes the override, falls back to default
      const resetBtn = document.createElement("button");
      resetBtn.className = "clr-btn" + (isOverridden ? "" : " hidden");
      resetBtn.textContent = "↺ default";
      resetBtn.title = "Remove override, use default color";
      resetBtn.addEventListener("click", () => {
        const theme = { ...(this._config.theme || {}) };
        delete theme[f.key];
        this._config = { ...this._config, theme };
        this._fireChange();
        sw.value = DEFAULT_THEME[f.key];
        sw.classList.add("unset");
        sw.title = "Using default — click to override";
        resetBtn.classList.add("hidden");
      });

      row.appendChild(lbl); row.appendChild(sw); row.appendChild(resetBtn);
      container.appendChild(row);
    });
  }

  // Node list — rebuilt only on structural changes ───────────────────────────

  _rebuildNodes() {
    const container = this.shadowRoot.getElementById("node-list");
    container.innerHTML = "";
    const nodes = this._config.nodes || [];

    nodes.forEach((node, idx) => {
      // Header row
      const row = document.createElement("div");
      row.className = "node-row" + (this._activeNodeIdx === idx ? " active" : "");
      row.innerHTML = `
        <ha-icon icon="${node.icon||"mdi:help-circle"}"
                 style="color:var(--primary-color);width:20px;height:20px;flex-shrink:0"></ha-icon>
        <span class="node-lbl">${node.label||node.id||`Node ${idx+1}`}</span>
        <span class="node-type">${node.type||"interface"}</span>`;
      row.addEventListener("click", () => {
        this._activeNodeIdx = this._activeNodeIdx === idx ? null : idx;
        container.querySelectorAll(".node-row").forEach((r,i)   => r.classList.toggle("active", i===this._activeNodeIdx));
        container.querySelectorAll(".node-detail").forEach((d,i) => d.classList.toggle("open",  i===this._activeNodeIdx));
      });
      container.appendChild(row);

      // Detail panel
      const detail = document.createElement("div");
      detail.className = "node-detail" + (this._activeNodeIdx === idx ? " open" : "");

      // Remove button
      const delBtn = document.createElement("button");
      delBtn.className = "del-btn"; delBtn.textContent = "Remove node";
      delBtn.addEventListener("click", e => {
        e.stopPropagation();
        const removedId = this._config.nodes[idx]?.id;
        const nodes2 = [...this._config.nodes]; nodes2.splice(idx, 1);
        const links2 = (this._config.links||[]).filter(l => l.from!==removedId && l.to!==removedId);
        this._activeNodeIdx = null;
        this._config = { ...this._config, nodes: nodes2, links: links2 };
        this._fireChange();
        this._rebuildNodes();
        this._rebuildLinks();
      });
      detail.appendChild(delBtn);

      // Text fields — id, label, sublabel in a 2-col grid
      const grid = document.createElement("div"); grid.className = "two";
      [
        { key:"id",       label:"ID (unique)" },
        { key:"label",    label:"Label" },
        { key:"sublabel", label:"Sublabel" },
      ].forEach(f => {
        const tf = document.createElement("ha-textfield");
        tf.label = f.label; tf.value = node[f.key] || "";
        tf.addEventListener("input", e => {
          const nodes2 = [...this._config.nodes];
          nodes2[idx] = { ...nodes2[idx], [f.key]: e.target.value };
          this._config = { ...this._config, nodes: nodes2 };
          if (f.key === "label") {
            const el = container.querySelectorAll(".node-lbl")[idx];
            if (el) el.textContent = e.target.value || node.id || `Node ${idx+1}`;
          }
          clearTimeout(this._textTimer);
          this._textTimer = setTimeout(() => this._fireChange(), 400);
        });
        tf.addEventListener("change", e => {
          const nodes2 = [...this._config.nodes];
          nodes2[idx] = { ...nodes2[idx], [f.key]: e.target.value };
          this._config = { ...this._config, nodes: nodes2 };
          this._fireChange();
        });
        grid.appendChild(tf);
      });
      detail.appendChild(grid);

      // Icon picker — ha-icon-picker gives the full HA MDI search dialog
      const iconPicker = document.createElement("ha-icon-picker");
      iconPicker.label = "Icon";
      iconPicker.value = node.icon || "";
      iconPicker.placeholder = "mdi:help-circle";
      iconPicker.hass = this._hass;
      iconPicker.addEventListener("value-changed", e => {
        const newIcon = e.detail.value || "";
        const nodes2 = [...this._config.nodes];
        nodes2[idx] = { ...nodes2[idx], icon: newIcon };
        this._config = { ...this._config, nodes: nodes2 };
        // Update the icon preview in the collapsed node row immediately
        const el = container.querySelectorAll(".node-row ha-icon")[idx];
        if (el) el.setAttribute("icon", newIcon || "mdi:help-circle");
        this._fireChange();
      });
      detail.appendChild(iconPicker);

      // Type + Status selects
      const sg = document.createElement("div"); sg.className = "two";
      sg.appendChild(this._sel("Type", [
        {v:"isp",l:"ISP"},{v:"router",l:"Router / Firewall"},
        {v:"switch",l:"Switch"},{v:"interface",l:"Interface"},{v:"device",l:"Device"},
      ], node.type||"interface", val => {
        this._wNodeField(idx, "type", val);
        const el = container.querySelectorAll(".node-type")[idx];
        if (el) el.textContent = val;
      }));
      sg.appendChild(this._sel("Default status", [
        {v:"online",l:"Online"},{v:"standby",l:"Standby"},{v:"offline",l:"Offline"},
      ], node.status||"online", val => this._wNodeField(idx, "status", val)));
      detail.appendChild(sg);

      // Actions — use ha-selector with selector: { action: {} }
      // This renders HA's native action picker (same as Tile/Mushroom cards)
      // with built-in UI for entity picker, navigation path, service picker, etc.
      const actSec = document.createElement("div"); actSec.className = "subsec"; actSec.textContent = "Actions";
      detail.appendChild(actSec);

      const ACTION_DEFS = [
        { key: "tap_action",        label: "Tap action",        def: { action: "more-info" } },
        { key: "double_tap_action", label: "Double-tap action", def: { action: "none"      } },
        { key: "hold_action",       label: "Hold action",       def: { action: "none"      } },
      ];

      ACTION_DEFS.forEach(ad => {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "8px";

        // Label
        const lbl = document.createElement("div");
        lbl.style.cssText = "font-size:11px;color:var(--secondary-text-color);margin-bottom:4px;font-weight:500";
        lbl.textContent = ad.label;
        wrapper.appendChild(lbl);

        // Use ha-selector with action selector — native HA action editor
        const sel = document.createElement("ha-selector");
        sel.hass = this._hass;
        sel.selector = { action: {} };
        sel.value = node[ad.key] || ad.def;

        sel.addEventListener("value-changed", e => {
          const val = e.detail.value;
          this._wNodeField(idx, ad.key, val);
        });

        wrapper.appendChild(sel);
        detail.appendChild(wrapper);
      });

      // Per-node label position override
      const mpNodeWrap = document.createElement("div");
      mpNodeWrap.style.marginBottom = "8px";
      const META_POS_NODE = [
        {v:"",      l:"Card default"},
        {v:"below", l:"Below"},  {v:"above", l:"Above"},
        {v:"left",  l:"Left"},   {v:"right", l:"Right"},
      ];
      mpNodeWrap.appendChild(this._sel(
        "Label position (this node)", META_POS_NODE,
        node.meta_position || "",
        val => {
          const nodes2 = [...this._config.nodes];
          if (val) nodes2[idx] = { ...nodes2[idx], meta_position: val };
          else { nodes2[idx] = { ...nodes2[idx] }; delete nodes2[idx].meta_position; }
          this._config = { ...this._config, nodes: nodes2 };
          this._fireChange();
        }
      ));
      detail.appendChild(mpNodeWrap);

      // Active value — what the active_wan sensor returns for this node to be "active"
      // Only shown on ISP-type nodes (most relevant there, but available on all)
      const avWrap = document.createElement("div");
      avWrap.style.cssText = "margin-bottom:8px;padding:10px 12px;background:var(--secondary-background-color);border-radius:8px;";
      const avLabel = document.createElement("div");
      avLabel.style.cssText = "font-size:11px;color:var(--secondary-text-color);margin-bottom:6px;line-height:1.4";
      avLabel.textContent = "Active WAN value — what the active_wan sensor returns when this node is the active connection";
      const avField = document.createElement("ha-textfield");
      avField.label = "Active value (e.g. primary or backup)";
      avField.value = node.active_value || "";
      avField.style.width = "100%";
      avField.addEventListener("input", e => {
        const nodes2 = [...this._config.nodes];
        nodes2[idx] = { ...nodes2[idx], active_value: e.target.value };
        this._config = { ...this._config, nodes: nodes2 };
        clearTimeout(this._textTimer);
        this._textTimer = setTimeout(() => this._fireChange(), 400);
      });
      avField.addEventListener("change", e => {
        const nodes2 = [...this._config.nodes];
        nodes2[idx] = { ...nodes2[idx], active_value: e.target.value };
        this._config = { ...this._config, nodes: nodes2 };
        this._fireChange();
      });
      avWrap.appendChild(avLabel);
      avWrap.appendChild(avField);
      detail.appendChild(avWrap);

      // Entity bindings
      const esec = document.createElement("div"); esec.className = "subsec"; esec.textContent = "Entity bindings";
      detail.appendChild(esec);
      ["status","status2","ip","upload","download","ping","clients"].forEach(ek => {
        const sel = document.createElement("ha-selector");
        const ekLabels = { status: "Status", status2: "Secondary status", ip: "IP address",
                         upload: "Upload speed", download: "Download speed",
                         ping: "Ping / latency", clients: "Client count" };
        sel.label = ekLabels[ek] || (ek.charAt(0).toUpperCase() + ek.slice(1));
        sel.hass = this._hass;
        sel.selector = (ek==="status" || ek==="status2")
          ? {entity:{domain:["binary_sensor","sensor","input_select","select"]}}
          : {entity:{domain:"sensor"}};
        sel.value = node.entities?.[ek] || "";
        // Store identifiers so _syncValues can update this element by reference
        sel.dataset.nodeIdx = idx;
        sel.dataset.entityKey = ek;

        // ha-selector opens a full HA dialog — no "opened" event exists.
        // We detect interaction via focus on the inner input, and lock out
        // setConfig() syncs until the value-changed event resolves.
        sel.addEventListener("focus", () => {
          this._interacting = true;
          sel._pendingInteraction = true;
          clearTimeout(this._interactTimer);
        }, true); // capture phase so we catch focus on internal input

        sel.addEventListener("value-changed", e => {
          // Clear interaction lock after a short delay to let the HA
          // config-changed round-trip complete before allowing syncs
          clearTimeout(this._interactTimer);
          this._interactTimer = setTimeout(() => {
            this._interacting = false;
            sel._pendingInteraction = false;
          }, 350);
          this._wNodeEntity(idx, ek, e.detail.value);
        });

        // Also clear lock on blur in case the picker is dismissed without pick
        sel.addEventListener("blur", () => {
          clearTimeout(this._interactTimer);
          this._interactTimer = setTimeout(() => {
            this._interacting = false;
            sel._pendingInteraction = false;
          }, 350);
        }, true); // capture phase

        detail.appendChild(sel);
      });

      // Color overrides — each has a swatch + clear button
      // Clear removes the key entirely so the global theme takes over
      const csec = document.createElement("div"); csec.className = "subsec"; csec.textContent = "Color overrides";
      detail.appendChild(csec);
      NODE_COLOR_FIELDS.forEach(cf => {
        const isSet = node.color?.[cf.key] !== undefined && node.color[cf.key] !== "";
        const cr = document.createElement("div"); cr.className = "color-row";

        const cl = document.createElement("span"); cl.className = "color-lbl"; cl.textContent = cf.label;

        const sw = document.createElement("input"); sw.type = "color";
        sw.className = "swatch" + (isSet ? "" : " unset");
        sw.value = node.color?.[cf.key] || "#888888";
        sw.title = isSet ? "Custom override (click to change)" : "Not set — click to add override";

        const clrBtn = document.createElement("button");
        clrBtn.className = "clr-btn" + (isSet ? "" : " hidden");
        clrBtn.textContent = "✕ clear";
        clrBtn.title = "Remove this color override";

        sw.addEventListener("input", e => {
          sw.classList.remove("unset");
          sw.title = "Custom override (click to change)";
          clrBtn.classList.remove("hidden");
          this._wNodeColor(idx, cf.key, e.target.value);
        });

        clrBtn.addEventListener("click", () => {
          // Delete the key from node.color entirely
          const nodes2 = [...this._config.nodes];
          const newColor = { ...(nodes2[idx].color || {}) };
          delete newColor[cf.key];
          nodes2[idx] = { ...nodes2[idx], color: newColor };
          this._config = { ...this._config, nodes: nodes2 };
          this._fireChange();
          // Reset swatch UI to show "unset" state
          sw.value = "#888888";
          sw.classList.add("unset");
          sw.title = "Not set — click to add override";
          clrBtn.classList.add("hidden");
        });

        cr.appendChild(cl); cr.appendChild(sw); cr.appendChild(clrBtn);
        detail.appendChild(cr);
      });

      container.appendChild(detail);
    });
  }

  // Link list — rebuilt only on structural changes ───────────────────────────

  _rebuildLinks() {
    const container = this.shadowRoot.getElementById("link-list");
    container.innerHTML = "";
    const nodes = this._config.nodes || [];
    const nodeOpts = nodes.map(n => ({ v: n.id, l: n.label||n.id }));

    (this._config.links || []).forEach((lk, idx) => {
      const row = document.createElement("div"); row.className = "link-row";
      row.appendChild(this._sel("From", nodeOpts, lk.from, val => this._wLink(idx, "from", val)));
      const ar = document.createElement("span"); ar.className = "arrow"; ar.textContent = "→";
      row.appendChild(ar);
      row.appendChild(this._sel("To", nodeOpts, lk.to, val => this._wLink(idx, "to", val)));
      const db = document.createElement("ha-icon-button");
      db.path = "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z";
      db.addEventListener("click", () => {
        const links2 = [...this._config.links]; links2.splice(idx, 1);
        this._config = { ...this._config, links: links2 };
        this._fireChange(); this._rebuildLinks();
      });
      row.appendChild(db);
      container.appendChild(row);
    });
  }

  // Helper: native <select> wrapper ────────────────────────────────────────
  // Uses a plain HTML <select> instead of mwc/ha-select.
  // mwc-select has deep async timing bugs — its value property, selected event,
  // and shadow DOM structure make reliable value reading nearly impossible.
  // A native <select> fires a synchronous "change" event with e.target.value
  // already set correctly. No timing workarounds needed at all.
  // Styled via .nfc-sel / .nfc-sel-wrap CSS to match HA's card editor aesthetic.

  _sel(label, options, current, onChange) {
    const wrap = document.createElement("div");
    wrap.className = "nfc-sel-wrap";

    if (label) {
      const lbl = document.createElement("label");
      lbl.textContent = label;
      wrap.appendChild(lbl);
    }

    const sel = document.createElement("select");
    sel.className = "nfc-sel";

    options.forEach(o => {
      const opt = document.createElement("option");
      opt.value = o.v;
      opt.textContent = o.l;
      if (o.v === current) opt.selected = true;
      sel.appendChild(opt);
    });

    // Native change event — synchronous, value is always correct
    sel.addEventListener("change", e => {
      // Set _interacting briefly so HA's setConfig callback doesn't
      // clobber the select's displayed value mid-interaction
      this._interacting = true;
      clearTimeout(this._interactTimer);
      this._interactTimer = setTimeout(() => { this._interacting = false; }, 350);
      onChange(e.target.value);
    });

    wrap.appendChild(sel);
    // Expose .value and .dataset on wrap so call sites can treat it uniformly
    Object.defineProperty(wrap, "value", {
      get: () => sel.value,
      set: (v) => { sel.value = v; },
    });
    wrap.dataset.selEl = "true";
    return wrap;
  }

  // Update a select's displayed value from outside without firing onChange
  _setSelValue(selWrap, val) {
    selWrap.value = val;
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
    prefetchConfigIcons(config);
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
    const activeWan = resolveActiveWan(this._hass, this._config);
    if (this._renderer) {
      this._renderer.updateStates(states);
      this._renderer.updateActiveWan(activeWan);
    }
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
    // Pointer-based action detection supporting tap, double-tap, and hold.
    // Works on mouse and touch (mobile/tablet dashboards).
    let _tapTimer = null, _tapCount = 0, _holdTimer = null, _holdFired = false;
    const HOLD_MS = 500, DOUBLE_TAP_MS = 250;

    canvas.addEventListener("pointerdown", e => {
      _holdFired = false;
      _holdTimer = setTimeout(() => {
        _holdFired = true;
        const rect = canvas.getBoundingClientRect();
        this._renderer.handleClick(e.clientX - rect.left, e.clientY - rect.top, "hold");
      }, HOLD_MS);
    });

    canvas.addEventListener("pointerup", e => {
      clearTimeout(_holdTimer);
      if (_holdFired) return; // hold already handled
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      _tapCount++;
      if (_tapCount === 1) {
        _tapTimer = setTimeout(() => {
          _tapCount = 0;
          this._renderer.handleClick(mx, my, "tap");
        }, DOUBLE_TAP_MS);
      } else {
        clearTimeout(_tapTimer);
        _tapCount = 0;
        this._renderer.handleClick(mx, my, "double_tap");
      }
    });

    canvas.addEventListener("pointercancel", () => {
      clearTimeout(_holdTimer); clearTimeout(_tapTimer);
      _tapCount = 0; _holdFired = false;
    });

    // Suppress context menu so right-click doesn't show browser menu
    canvas.addEventListener("contextmenu", e => e.preventDefault());

    canvas.addEventListener("node-action", e => {
      this._handleNodeAction(e.detail.node, e.detail.actionType);
    });
  }

  // Fire a HA event the same way the official frontend helpers do.
  // Using window-level dispatch ensures dialogs (which are portaled to document)
  // receive the event regardless of shadow DOM boundaries.
  _fireHAEvent(type, detail) {
    window.dispatchEvent(new CustomEvent(type, {
      detail, bubbles: true, composed: true,
    }));
    // Also dispatch on document for older HA versions
    document.dispatchEvent(new CustomEvent(type, {
      detail, bubbles: true, composed: true,
    }));
    // And on this element for the HA event bus
    this.dispatchEvent(new CustomEvent(type, {
      detail, bubbles: true, composed: true,
    }));
  }

  // Resolve which action config to use for a given action type
  _getAction(node, actionType) {
    switch (actionType) {
      case "hold":       return node.hold_action       || { action: "none" };
      case "double_tap": return node.double_tap_action || { action: "none" };
      case "tap":
      default:           return node.tap_action        || { action: "more-info" };
    }
  }

  // Resolve the best entity ID for a more-info action on this node
  _getNodeEntityId(node, action) {
    return action.entity ||
      node.entities?.status  ||
      node.entities?.status2 ||
      node.entities?.upload  ||
      node.entities?.ip      ||
      null;
  }

  _handleNodeAction(node, actionType) {
    const action = this._getAction(node, actionType);

    switch (action.action) {
      case "more-info": {
        const entityId = this._getNodeEntityId(node, action);
        if (!entityId) break;
        // Fire via all paths to ensure HA's dialog system picks it up
        this._fireHAEvent("hass-more-info", { entityId });
        break;
      }

      case "navigate": {
        const path = action.navigation_path || "/";
        window.history.pushState(null, "", path);
        window.dispatchEvent(new CustomEvent("location-changed", {
          detail: { replace: false }, bubbles: true, composed: true,
        }));
        break;
      }

      case "url":
        if (action.url_path) window.open(action.url_path, action.url_target || "_blank");
        break;

      case "call-service":
      case "perform-action": {
        // Support both legacy "call-service" and new "perform-action" naming
        const svc = action.service || action.action_name;
        if (svc && this._hass) {
          const [domain, service] = svc.split(".");
          this._hass.callService(
            domain, service,
            action.service_data || action.data || {},
            action.target || {}
          );
        }
        break;
      }

      case "toggle": {
        // Toggle the status entity if it's a switch/light/input_boolean
        const entityId = this._getNodeEntityId(node, action);
        if (entityId && this._hass) {
          const domain = entityId.split(".")[0];
          const toggleable = ["switch","light","input_boolean","automation","fan","cover"];
          if (toggleable.includes(domain)) {
            this._hass.callService(domain, "toggle", { entity_id: entityId });
          }
        }
        break;
      }

      case "none":
      default:
        break;
    }
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
