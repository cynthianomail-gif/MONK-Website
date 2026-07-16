// suminagashi.ts — 墨流し互動流體（spec §6.5，Hero 背景層，M2.5）
//
// stable-fluids（Jos Stam 半拉格朗日 advection＋curl/vorticity confinement＋
// Jacobi 壓力解＋ping-pong FBO；Pavel Dobryakov 路數），原生 WebGL 手寫、零新依賴，
// compile/link/quad 樣板沿用 inkReveal 的路數。
//
// - WebGL2（EXT_color_buffer_float）優先，退 WebGL1＋OES_texture_half_float；
//   皆不可用、prefers-reduced-motion、或 ?fluid=off → return null
//   （呼叫端不建 canvas，hero 露出原 poster 靜態背景＝降級路徑）。
// - velocity/pressure/curl/divergence 半解析度（長邊 ≤512，行動版 ≤256）；
//   dye 全解析度（dpr 上限 1.5）。
// - 合成＝吸收模型：dye 存「吸光度」，顯示 col = paper * exp(-dye * density)——
//   濃處近黑、淡處暈開帶色，即「墨在水面」的觀感（不是加色螢光流體）。
// - ?fluid=debug → 左下角 fps 小字＋window.__fluidStats（splats/fps/inkPixels），
//   正式路徑無任何 UI 與全域變數。

import { prefersReducedMotion } from './utils';

export interface SuminagashiHandle {
  /** 模組自建插入 container 的 canvas（hero.ts 需把 scroll scale scrub 一併套上）。 */
  canvas: HTMLCanvasElement;
  /** 円相 2D 覆蓋層（同上，scrub 目標要一併帶上）。 */
  ensoCanvas: HTMLCanvasElement;
  /** 落筆円相（延遲 delayMs 後開始）。初始化後不會自動畫，由呼叫端在 loader 收掉時觸發。 */
  enso(delayMs?: number): void;
  destroy(): void;
}

// ---- 參數（往「水面墨」調：絲狀大理石紋、緩慢優雅） ----

const SIM_MAX_DESKTOP = 512; // velocity/pressure 網格長邊上限
const SIM_MAX_MOBILE = 256; // <768px（spec §6.5）
const DPR_MAX = 1.5; // dye 全解析度的 dpr 上限
const VEL_DISSIPATION = 0.2; // /s，速度緩慢衰減 → 墨紋漂移悠長
const DYE_DISSIPATION = 0.05; // /s，墨痕殘留 ~20s
const PRESSURE_ITER = 22; // Jacobi 迭代（spec 20–25）
const PRESSURE_DECAY = 0.8; // 每幀壓力場先乘此值再解
const VORTICITY = 25; // curl confinement 強度
const SPLAT_FORCE = 2400; // pointer 位移 → 注入速度的倍率
const RADIUS_MOVE = 0.0009; // 拖曳絲線半徑（exp(-d²/r) 的 r）
const RADIUS_DROP = 0.0045; // pointerdown 大滴半徑
const DYE_DENSITY = 1.5; // 顯示端吸光度倍率
const IDLE_MS = 8000; // idle 判定
const AUTO_MIN_MS = 4000; // 自動漩渦間隔 4–6s
const AUTO_MAX_MS = 6000;
const FPS_FLOOR = 30; // 連續 2s 低於此值 → sim 解析度砍半（一次為限）
const FPS_FLOOR_MS = 2000;

// 開場円相（禪僧一筆墨圓，2026-07-16 使用者指定的進場符號）
const ENSO_DELAY_MS = 350; // 進場靜置一拍再落筆
const ENSO_DRAW_MS = 1400; // 一筆行筆時間
const ENSO_HOLD_MS = 3600; // 畫畢停留
const ENSO_FADE_MS = 2000; // 覆蓋層淡出（同時把軟墨印進染料場）
const ENSO_SWEEP = Math.PI * 1.86; // 收筆不封口，留約 25° 缺口（円相不閉圓）
const ENSO_START = Math.PI * 0.62; // 起筆於左上，順時針行筆
const ENSO_RADIUS = 0.0012; // 融墨印半徑（exp(-d²/r) 的 r，軟暈）
const ENSO_STEP = 0.008; // 相鄰墨點的進度間隔

const PAPER: [number, number, number] = [0.949, 0.918, 0.847]; // --paper #f2ead8

// 墨色三色輪替（spec §6.5）：墨黑／朱紅／藍灰（#43d9d9 同色相 s−40% l−25% ≈ #396565）
const PALETTE = ['#14120f', '#c73e3a', '#396565'];

/** 墨色 → 正規化吸光度向量（濃度交給 splat amount 控制）。 */
function hexToAbsorb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const c = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  const a = c.map((v) => -Math.log(Math.max(v, 0.02)));
  const m = Math.max(a[0], a[1], a[2]);
  return [a[0] / m, a[1] / m, a[2] / m];
}

const ABSORBS = PALETTE.map(hexToAbsorb);

// ---- shaders（GLSL ES 1.00，WebGL1/2 通用） ----

const VERT = `
precision highp float;
attribute vec2 aPos;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG_ADVECTION = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
void main () {
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
  vec4 result = texture2D(uSource, coord);
  gl_FragColor = result / (1.0 + dissipation * dt);
}
`;

const FRAG_SPLAT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}
`;

const FRAG_CURL = `
precision mediump float;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`;

const FRAG_VORTICITY = `
precision highp float;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * dt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

const FRAG_DIVERGENCE = `
precision mediump float;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}
`;

const FRAG_CLEAR = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float value;
void main () {
  gl_FragColor = value * texture2D(uTexture, vUv);
}
`;

const FRAG_PRESSURE = `
precision mediump float;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;

const FRAG_GRADIENT = `
precision mediump float;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

// 顯示：吸收模型合成（墨在水面：paper * exp(-吸光度)）
const FRAG_DISPLAY = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uDye;
uniform vec3 uPaper;
uniform float uDensity;
void main () {
  vec3 a = max(texture2D(uDye, vUv).rgb, 0.0);
  vec3 col = uPaper * exp(-a * uDensity);
  gl_FragColor = vec4(col, 1.0);
}
`;

// ---- GL 型別 ----

type GL = WebGLRenderingContext | WebGL2RenderingContext;

interface GLCtx {
  gl: GL;
  isGL2: boolean;
  internalFormat: number;
  format: number;
  texType: number;
  canLinear: boolean;
}

interface FBO {
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
  w: number;
  h: number;
  attach(id: number): number;
  dispose(): void;
}

interface DoubleFBO {
  read: FBO;
  write: FBO;
  w: number;
  h: number;
  swap(): void;
  dispose(): void;
}

interface Prog {
  prog: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null>;
  bind(): void;
}

interface Splat {
  x: number;
  y: number;
  dx: number;
  dy: number;
  amount: number;
  radius: number;
  absorb: [number, number, number];
}

/** 建 GL context：WebGL2（float 可 render）優先，退 WebGL1＋half float。 */
function createGL(canvas: HTMLCanvasElement): GLCtx | null {
  const attrs: WebGLContextAttributes = {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
  };
  const gl2 = canvas.getContext('webgl2', attrs) as WebGL2RenderingContext | null;
  if (gl2) {
    const colorFloat =
      gl2.getExtension('EXT_color_buffer_float') || gl2.getExtension('EXT_color_buffer_half_float');
    if (!colorFloat) return null; // 罕見：有 WebGL2 卻不能 render 半浮點 → 降級
    return {
      gl: gl2,
      isGL2: true,
      internalFormat: gl2.RGBA16F,
      format: gl2.RGBA,
      texType: gl2.HALF_FLOAT,
      canLinear: true, // WebGL2 half-float linear filtering 是 core
    };
  }
  const gl1 = canvas.getContext('webgl', attrs) as WebGLRenderingContext | null;
  if (!gl1) return null;
  const half = gl1.getExtension('OES_texture_half_float');
  if (!half) return null;
  const linear = gl1.getExtension('OES_texture_half_float_linear');
  return {
    gl: gl1,
    isGL2: false,
    internalFormat: gl1.RGBA,
    format: gl1.RGBA,
    texType: (half as { HALF_FLOAT_OES: number }).HALF_FLOAT_OES,
    canLinear: !!linear,
  };
}

/**
 * suminagashi 互動流體。canvas 由本模組自建並 append 進 container；
 * 互動事件監聽 container（canvas 本身 pointer-events:none）。
 * 回傳 null＝降級（WebGL 不可用／reduced-motion／?fluid=off），呼叫端保留靜態背景。
 */
export function initSuminagashi(container: HTMLElement): SuminagashiHandle | null {
  const params = new URLSearchParams(location.search);
  if (params.get('fluid') === 'off') return null; // QC／除錯用降級開關（正式路徑無影響）
  if (prefersReducedMotion()) return null;
  const debug = params.get('fluid') === 'debug';

  const canvas = document.createElement('canvas');
  canvas.className = 'suminagashi-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  // 版位樣式走 inline（模組自足；z 落在 .hero-bg 之上、z-index:1 的前景之下）
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;will-change:transform;';

  const ctx = createGL(canvas);
  if (!ctx) return null;
  const { gl, isGL2, internalFormat, format, texType, canLinear } = ctx;

  // ---- program 編譯（沿用 inkReveal 樣板；任一失敗 → 降級） ----

  const compile = (type: number, src: string): WebGLShader | null => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('[suminagashi] shader 編譯失敗：', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  if (!vs) return null;

  const makeProgram = (fragSrc: string): Prog | null => {
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram();
    if (!fs || !prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos'); // 全部 program 統一 attrib 0
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[suminagashi] program link 失敗：', gl.getProgramInfoLog(prog));
      return null;
    }
    const u: Record<string, WebGLUniformLocation | null> = {};
    const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(prog, i);
      if (info) u[info.name] = gl.getUniformLocation(prog, info.name);
    }
    return { prog, u, bind: () => gl.useProgram(prog) };
  };

  const pAdvect = makeProgram(FRAG_ADVECTION);
  const pSplat = makeProgram(FRAG_SPLAT);
  const pCurl = makeProgram(FRAG_CURL);
  const pVorticity = makeProgram(FRAG_VORTICITY);
  const pDivergence = makeProgram(FRAG_DIVERGENCE);
  const pClear = makeProgram(FRAG_CLEAR);
  const pPressure = makeProgram(FRAG_PRESSURE);
  const pGradient = makeProgram(FRAG_GRADIENT);
  const pDisplay = makeProgram(FRAG_DISPLAY);
  if (
    !pAdvect || !pSplat || !pCurl || !pVorticity || !pDivergence ||
    !pClear || !pPressure || !pGradient || !pDisplay
  ) {
    return null;
  }

  // ---- 全屏 quad（triangle strip，attrib 0） ----

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.BLEND);

  // ---- FBO ----

  const createFBO = (w: number, h: number, linear: boolean): FBO | null => {
    const tex = gl.createTexture();
    const fbo = gl.createFramebuffer();
    if (!tex || !fbo) return null;
    const filter = linear && canLinear ? gl.LINEAR : gl.NEAREST;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, texType, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteTexture(tex);
      gl.deleteFramebuffer(fbo);
      return null;
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      tex,
      fbo,
      w,
      h,
      attach(id: number) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        return id;
      },
      dispose() {
        gl.deleteTexture(tex);
        gl.deleteFramebuffer(fbo);
      },
    };
  };

  const createDoubleFBO = (w: number, h: number, linear: boolean): DoubleFBO | null => {
    const a = createFBO(w, h, linear);
    const b = createFBO(w, h, linear);
    if (!a || !b) {
      a?.dispose();
      b?.dispose();
      return null;
    }
    const d: DoubleFBO = {
      read: a,
      write: b,
      w,
      h,
      swap() {
        const t = d.read;
        d.read = d.write;
        d.write = t;
      },
      dispose() {
        d.read.dispose();
        d.write.dispose();
      },
    };
    return d;
  };

  // ---- 尺寸與 FBO 配置 ----

  const stats = { splats: 0, fps: 0, frames: 0, simW: 0, simH: 0, halved: false, inkPixels: 0 };
  let halved = false; // fps 降級只砍一次

  const sizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    canvas.width = Math.max(2, Math.round((container.clientWidth || window.innerWidth) * dpr));
    canvas.height = Math.max(2, Math.round((container.clientHeight || window.innerHeight) * dpr));
  };

  const simSize = (): { w: number; h: number } => {
    let base = window.innerWidth < 768 ? SIM_MAX_MOBILE : SIM_MAX_DESKTOP;
    if (halved) base = Math.max(64, Math.floor(base / 2));
    const aspect = canvas.width / canvas.height;
    return aspect >= 1
      ? { w: base, h: Math.max(2, Math.round(base / aspect)) }
      : { w: Math.max(2, Math.round(base * aspect)), h: base };
  };

  sizeCanvas();

  let velocity: DoubleFBO | null = null;
  let dye: DoubleFBO | null = null;
  let pressure: DoubleFBO | null = null;
  let divergence: FBO | null = null;
  let curl: FBO | null = null;

  const initSimFBOs = (): boolean => {
    velocity?.dispose();
    pressure?.dispose();
    divergence?.dispose();
    curl?.dispose();
    const s = simSize();
    velocity = createDoubleFBO(s.w, s.h, true);
    pressure = createDoubleFBO(s.w, s.h, false);
    divergence = createFBO(s.w, s.h, false);
    curl = createFBO(s.w, s.h, false);
    stats.simW = s.w;
    stats.simH = s.h;
    return !!(velocity && pressure && divergence && curl);
  };

  const initDyeFBO = (): boolean => {
    dye?.dispose();
    dye = createDoubleFBO(canvas.width, canvas.height, true);
    return !!dye;
  };

  if (!initSimFBOs() || !initDyeFBO()) {
    // half float FBO 建不起來（renderable 自測失敗）→ 降級
    return null;
  }

  const blit = (target: FBO | null) => {
    if (target) {
      gl.viewport(0, 0, target.w, target.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    } else {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  // ---- 互動：注入佇列 ----

  const splatQueue: Splat[] = [];
  const pointers = new Map<number, { x: number; y: number }>();
  let colorIdx = 0;
  let lastInteract = performance.now();
  let nextAutoAt = 0;

  const currentAbsorb = (): [number, number, number] => {
    const base = ABSORBS[colorIdx % ABSORBS.length];
    // 輕微色相抖動：各通道 ±12%
    return [
      base[0] * (0.88 + Math.random() * 0.24),
      base[1] * (0.88 + Math.random() * 0.24),
      base[2] * (0.88 + Math.random() * 0.24),
    ];
  };

  const enqueueSplat = (
    x: number, y: number, dx: number, dy: number,
    amount: number, radius: number, absorb: [number, number, number]
  ) => {
    if (splatQueue.length > 40) return; // 佇列上限，防事件風暴
    splatQueue.push({ x, y, dx, dy, amount, radius, absorb });
    stats.splats++;
  };

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const toUv = (e: PointerEvent): { x: number; y: number } | null => {
    const r = canvas.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height };
  };

  const onPointerMove = (e: PointerEvent) => {
    const p = toUv(e);
    if (!p) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, p);
    if (!prev) return;
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    const speed = Math.hypot(dx, dy);
    if (speed <= 0) return;
    lastInteract = performance.now();
    // 力道∝位移速度：慢拖=淡絲線，快掃=濃痕
    enqueueSplat(
      p.x, p.y, dx * SPLAT_FORCE, dy * SPLAT_FORCE,
      clamp(speed * 30, 0.06, 0.5), RADIUS_MOVE, currentAbsorb()
    );
  };

  const onPointerDown = (e: PointerEvent) => {
    const p = toUv(e);
    if (!p) return;
    pointers.set(e.pointerId, p);
    lastInteract = performance.now();
    colorIdx++; // 按拖曳段輪替三色
    enqueueSplat(
      p.x, p.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80,
      1.2, RADIUS_DROP, currentAbsorb()
    );
  };

  const onPointerEnd = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
  };

  // 監聽 container（不是 canvas；spec §6.5），touch 走 pointer events、passive
  container.addEventListener('pointermove', onPointerMove, { passive: true });
  container.addEventListener('pointerdown', onPointerDown, { passive: true });
  container.addEventListener('pointerup', onPointerEnd, { passive: true });
  container.addEventListener('pointercancel', onPointerEnd, { passive: true });
  container.addEventListener('pointerleave', onPointerEnd, { passive: true });

  // ---- 開場円相 ----
  // 教訓（2026-07-16）：符號直接畫進流體會被湍流在一兩秒內攪成霧——
  // 實筆円相畫在 2D 覆蓋層（勾筆→停留→淡出），淡出同時沿軌跡把軟墨印進染料場，
  // 視覺上筆跡「融入水面」。待命狀態：不自動畫，等 handle.enso()（loader 收掉）觸發。

  const ensoCanvas = document.createElement('canvas');
  ensoCanvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;will-change:transform,opacity;';
  ensoCanvas.setAttribute('aria-hidden', 'true');
  const ensoCtx = ensoCanvas.getContext('2d');

  const sizeEnsoCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    ensoCanvas.width = Math.max(1, Math.round(container.clientWidth * dpr));
    ensoCanvas.height = Math.max(1, Math.round(container.clientHeight * dpr));
  };
  sizeEnsoCanvas();

  let ensoT0 = Infinity; // 覆蓋層起筆時刻
  let ensoDrawn = 0; // 覆蓋層已畫進度 [0..1]
  let ensoArmed = false;
  let ensoDone = true; // 覆蓋層已淡出完畢
  let ensoDyeT0 = Infinity; // 融墨印起始時刻
  let ensoDyeNext = 1.01; // 融墨印進度；>1＝未啟動/已完成

  const beginEnso = (delayMs: number) => {
    ensoArmed = true;
    ensoDone = false;
    ensoT0 = performance.now() + delayMs;
    ensoDrawn = 0;
    ensoDyeT0 = Infinity;
    ensoDyeNext = 1.01;
    ensoCanvas.style.opacity = '1';
    ensoCtx?.clearRect(0, 0, ensoCanvas.width, ensoCanvas.height);
    // 保護期：符號在場期間不放 idle 漩渦
    lastInteract = ensoT0 + ENSO_DRAW_MS + ENSO_HOLD_MS + ENSO_FADE_MS;
    nextAutoAt = lastInteract + IDLE_MS;
  };

  /** 筆壓：起筆重、行筆漸提、收筆出鋒。 */
  const ensoThick = (t: number) => {
    const taper = t > 0.88 ? (1 - t) / 0.12 : 1;
    return (1.2 - 0.45 * t) * taper;
  };

  const drawEnsoOverlay = (now: number) => {
    if (!ensoArmed || ensoDone || !ensoCtx) return;
    const t = now - ensoT0;
    if (t < 0) return;
    const w = ensoCanvas.width;
    const h = ensoCanvas.height;
    const rPx = Math.min(h * 0.3, w * 0.36);
    const brush = h * 0.014;
    const dp = Math.min(1, t / ENSO_DRAW_MS);
    while (ensoDrawn <= dp) {
      const p = ensoDrawn;
      ensoDrawn += ENSO_STEP;
      const thick = ensoThick(p) * (0.85 + Math.random() * 0.3);
      if (thick <= 0.05) continue;
      const th = ENSO_START - ENSO_SWEEP * p;
      const x = w / 2 + rPx * Math.cos(th);
      const y = h / 2 - rPx * Math.sin(th);
      const rr = brush * thick;
      // 半透明暈邊＋實心主筆兩層，湊毛筆的滲墨感
      ensoCtx.fillStyle = 'rgba(20,18,15,0.28)';
      ensoCtx.beginPath();
      ensoCtx.arc(
        x + (Math.random() - 0.5) * rr * 0.6,
        y + (Math.random() - 0.5) * rr * 0.6,
        rr * 1.35, 0, Math.PI * 2
      );
      ensoCtx.fill();
      ensoCtx.fillStyle = 'rgba(20,18,15,0.92)';
      ensoCtx.beginPath();
      ensoCtx.arc(x, y, rr, 0, Math.PI * 2);
      ensoCtx.fill();
    }
    // 停留後淡出；淡出起點啟動融墨印
    const fadeT = t - ENSO_DRAW_MS - ENSO_HOLD_MS;
    if (fadeT >= 0) {
      if (ensoDyeT0 === Infinity) {
        ensoDyeT0 = now;
        ensoDyeNext = 0;
      }
      const a = 1 - fadeT / ENSO_FADE_MS;
      ensoCanvas.style.opacity = String(Math.max(0, Math.min(1, a)));
      if (a <= 0) {
        ensoDone = true;
        ensoCtx.clearRect(0, 0, w, h);
      }
    }
  };

  /** 融墨印：覆蓋層淡出時，沿同一軌跡把軟暈淡墨印進染料場（墨落靜水，零速度）。 */
  const stampEnsoDye = (now: number) => {
    if (ensoDyeNext > 1 || now < ensoDyeT0) return;
    const t1 = Math.min(1, (now - ensoDyeT0) / ENSO_FADE_MS);
    const aspect = canvas.width / Math.max(1, canvas.height);
    const r = Math.min(0.3, 0.36 * aspect); // 與覆蓋層 rPx 同一比例（y 佔比）
    let n = 0;
    while (ensoDyeNext <= t1 && n < 8) {
      const t = ensoDyeNext;
      ensoDyeNext += ENSO_STEP * 2;
      n++;
      const thick = ensoThick(t);
      if (thick <= 0.05) continue;
      const th = ENSO_START - ENSO_SWEEP * t;
      enqueueSplat(
        0.5 + (r * Math.cos(th)) / aspect,
        0.5 + r * Math.sin(th),
        0, 0,
        0.28 * thick,
        ENSO_RADIUS * thick,
        ABSORBS[0] // 恆用墨黑
      );
    }
    if (t1 >= 1) ensoDyeNext = 1.01;
  };

  // ---- 模擬步 ----

  const correctRadius = (r: number) => {
    const aspect = canvas.width / canvas.height;
    return aspect > 1 ? r * aspect : r;
  };

  const applySplat = (s: Splat) => {
    if (!velocity || !dye) return;
    pSplat.bind();
    gl.uniform1f(pSplat.u.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(pSplat.u.point, s.x, s.y);
    gl.uniform1f(pSplat.u.radius, correctRadius(s.radius));
    // 速度場
    gl.uniform1i(pSplat.u.uTarget, velocity.read.attach(0));
    gl.uniform3f(pSplat.u.color, s.dx, s.dy, 0);
    blit(velocity.write);
    velocity.swap();
    // 染料場（吸光度）
    gl.uniform1i(pSplat.u.uTarget, dye.read.attach(0));
    gl.uniform3f(pSplat.u.color, s.absorb[0] * s.amount, s.absorb[1] * s.amount, s.absorb[2] * s.amount);
    blit(dye.write);
    dye.swap();
  };

  const step = (dt: number) => {
    if (!velocity || !dye || !pressure || !divergence || !curl) return;
    const texelX = 1 / velocity.w;
    const texelY = 1 / velocity.h;

    while (splatQueue.length > 0) applySplat(splatQueue.shift()!);

    // 1. advect velocity
    pAdvect.bind();
    gl.uniform2f(pAdvect.u.texelSize, texelX, texelY);
    gl.uniform1f(pAdvect.u.dt, dt);
    gl.uniform1f(pAdvect.u.dissipation, VEL_DISSIPATION);
    gl.uniform1i(pAdvect.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(pAdvect.u.uSource, velocity.read.attach(0));
    blit(velocity.write);
    velocity.swap();

    // 2. curl
    pCurl.bind();
    gl.uniform2f(pCurl.u.texelSize, texelX, texelY);
    gl.uniform1i(pCurl.u.uVelocity, velocity.read.attach(0));
    blit(curl);

    // 3. vorticity confinement
    pVorticity.bind();
    gl.uniform2f(pVorticity.u.texelSize, texelX, texelY);
    gl.uniform1i(pVorticity.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(pVorticity.u.uCurl, curl.attach(1));
    gl.uniform1f(pVorticity.u.curl, VORTICITY);
    gl.uniform1f(pVorticity.u.dt, dt);
    blit(velocity.write);
    velocity.swap();

    // 4. divergence
    pDivergence.bind();
    gl.uniform2f(pDivergence.u.texelSize, texelX, texelY);
    gl.uniform1i(pDivergence.u.uVelocity, velocity.read.attach(0));
    blit(divergence);

    // 5. pressure：先衰減再 Jacobi 迭代
    pClear.bind();
    gl.uniform1i(pClear.u.uTexture, pressure.read.attach(0));
    gl.uniform1f(pClear.u.value, PRESSURE_DECAY);
    blit(pressure.write);
    pressure.swap();

    pPressure.bind();
    gl.uniform2f(pPressure.u.texelSize, texelX, texelY);
    gl.uniform1i(pPressure.u.uDivergence, divergence.attach(0));
    for (let i = 0; i < PRESSURE_ITER; i++) {
      gl.uniform1i(pPressure.u.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    // 6. gradient subtract
    pGradient.bind();
    gl.uniform2f(pGradient.u.texelSize, texelX, texelY);
    gl.uniform1i(pGradient.u.uPressure, pressure.read.attach(0));
    gl.uniform1i(pGradient.u.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    // 7. advect dye（全解析度；位移用 sim texel，取樣為正規化座標故通用）
    pAdvect.bind();
    gl.uniform2f(pAdvect.u.texelSize, texelX, texelY);
    gl.uniform1f(pAdvect.u.dt, dt);
    gl.uniform1f(pAdvect.u.dissipation, DYE_DISSIPATION);
    gl.uniform1i(pAdvect.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(pAdvect.u.uSource, dye.read.attach(1));
    blit(dye.write);
    dye.swap();
  };

  const render = () => {
    if (!dye) return;
    pDisplay.bind();
    gl.uniform1i(pDisplay.u.uDye, dye.read.attach(0));
    gl.uniform3f(pDisplay.u.uPaper, PAPER[0], PAPER[1], PAPER[2]);
    gl.uniform1f(pDisplay.u.uDensity, DYE_DENSITY);
    blit(null);
  };

  // ---- debug 模式（?fluid=debug）：fps 小字＋window.__fluidStats ----

  let fpsEl: HTMLDivElement | null = null;
  if (debug) {
    fpsEl = document.createElement('div');
    fpsEl.style.cssText =
      'position:absolute;left:8px;bottom:8px;z-index:5;font:12px/1.4 monospace;' +
      'color:#14120f;background:rgba(242,234,216,.7);padding:2px 6px;pointer-events:none;';
    fpsEl.setAttribute('aria-hidden', 'true');
    container.appendChild(fpsEl);
    (window as unknown as Record<string, unknown>).__fluidStats = stats;
  }

  /** debug 專用：讀 canvas 中央與四分位共 5 點 8×8 區塊，數「非紙色」像素。 */
  const sampleInk = () => {
    const pts = [
      [0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75],
    ];
    const buf = new Uint8Array(8 * 8 * 4);
    const paper255 = PAPER.map((v) => Math.round(v * 255));
    let count = 0;
    for (const [px, py] of pts) {
      const x = clamp(Math.round(px * canvas.width) - 4, 0, canvas.width - 8);
      const y = clamp(Math.round(py * canvas.height) - 4, 0, canvas.height - 8);
      gl.readPixels(x, y, 8, 8, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      for (let i = 0; i < buf.length; i += 4) {
        if (
          Math.abs(buf[i] - paper255[0]) > 8 ||
          Math.abs(buf[i + 1] - paper255[1]) > 8 ||
          Math.abs(buf[i + 2] - paper255[2]) > 8
        ) {
          count++;
        }
      }
    }
    stats.inkPixels = count;
  };

  // ---- 主迴圈＋fps 監測 ----

  let raf = 0;
  let lastT = performance.now();
  let fpsEma = 60;
  let lowSince = 0;
  let destroyed = false;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const rawDt = (now - lastT) / 1000;
    lastT = now;
    if (rawDt <= 0) return;
    const dt = Math.min(rawDt, 1 / 30);

    // fps 監測（EMA）；連續 2s <30 → sim 解析度砍半一次
    fpsEma = fpsEma * 0.95 + (1 / rawDt) * 0.05;
    if (fpsEma < FPS_FLOOR && !halved) {
      if (lowSince === 0) {
        lowSince = now;
      } else if (now - lowSince > FPS_FLOOR_MS) {
        halved = true;
        stats.halved = true;
        lowSince = 0;
        initSimFBOs();
        console.info(
          `[suminagashi] fps<${FPS_FLOOR} 持續 ${FPS_FLOOR_MS}ms，sim 解析度砍半 → ${velocity?.w}x${velocity?.h}`
        );
      }
    } else if (fpsEma >= FPS_FLOOR) {
      lowSince = 0;
    }

    // idle 8s 後每 4–6s 自動小漩渦（保持畫面活著）
    if (now - lastInteract > IDLE_MS && now > nextAutoAt) {
      nextAutoAt = now + AUTO_MIN_MS + Math.random() * (AUTO_MAX_MS - AUTO_MIN_MS);
      colorIdx++;
      const ang = Math.random() * Math.PI * 2;
      enqueueSplat(
        0.15 + Math.random() * 0.7, 0.2 + Math.random() * 0.6,
        Math.cos(ang) * 500, Math.sin(ang) * 500,
        0.5, RADIUS_MOVE * 2.5, currentAbsorb()
      );
    }

    drawEnsoOverlay(now);
    stampEnsoDye(now);
    step(dt);
    render();

    stats.frames++;
    stats.fps = Math.round(fpsEma);
    stats.simW = velocity?.w ?? 0;
    stats.simH = velocity?.h ?? 0;
    if (debug && stats.frames % 30 === 0) {
      sampleInk();
      if (fpsEl) {
        fpsEl.textContent = `fps ${stats.fps} | sim ${stats.simW}x${stats.simH} | splats ${stats.splats} | ink ${stats.inkPixels}`;
      }
    }
  };

  const start = () => {
    if (raf || destroyed) return;
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  // 離屏暫停 rAF（spec §6.5）
  const io = new IntersectionObserver(
    (entries) => {
      const vis = entries[0]?.isIntersecting ?? true;
      if (vis) start();
      else stop();
    },
    { threshold: 0 }
  );
  io.observe(container);

  // resize：重建 FBO（dye 內容捨棄，idle 漩渦會自然補畫面）
  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (destroyed) return;
      sizeCanvas();
      initSimFBOs();
      initDyeFBO();
      sizeEnsoCanvas(); // 重設尺寸會清空 2D 內容
      // 覆蓋層還在場（未淡完）就重新勾一次；已淡出則不再打擾
      if (ensoArmed && !ensoDone) beginEnso(ENSO_DELAY_MS);
    }, 200);
  };
  window.addEventListener('resize', onResize);

  container.appendChild(canvas);
  container.appendChild(ensoCanvas); // 覆蓋層疊在流體 canvas 之上

  // 開場改由円相開筆（drawEnsoOverlay）：進站畫面即符號，不再滴三色墨

  // 先渲染一幀（紙色），避免 canvas 插入後首幀黑閃
  step(1 / 60);
  render();
  start();

  console.info(
    `[suminagashi] ${isGL2 ? 'WebGL2' : 'WebGL1'} sim ${stats.simW}x${stats.simH} dye ${canvas.width}x${canvas.height}`
  );

  return {
    canvas,
    ensoCanvas,
    enso(delayMs = ENSO_DELAY_MS) {
      beginEnso(delayMs);
    },
    destroy() {
      destroyed = true;
      stop();
      io.disconnect();
      window.removeEventListener('resize', onResize);
      window.clearTimeout(resizeTimer);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointerup', onPointerEnd);
      container.removeEventListener('pointercancel', onPointerEnd);
      container.removeEventListener('pointerleave', onPointerEnd);
      velocity?.dispose();
      dye?.dispose();
      pressure?.dispose();
      divergence?.dispose();
      curl?.dispose();
      canvas.remove();
      ensoCanvas.remove();
      fpsEl?.remove();
      if (debug) delete (window as unknown as Record<string, unknown>).__fluidStats;
      (gl.getExtension('WEBGL_lose_context') as { loseContext(): void } | null)?.loseContext();
    },
  };
}
