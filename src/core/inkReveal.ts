// inkReveal.ts — WebGL 墨暈揭示（spec §6.1，loader → hero 進站揭示）
//
// 原理：全屏 quad，fragment shader 以 3-octave value noise 做 threshold 揭示，
// uProgress 0→1 由 GSAP tween 驅動；canvas 疊在最上層蓋住頁面，完成即移除。
// WebGL 建 context 失敗（或呼叫端指定）→ fallback：clip-path circle tween（spec §6.1 末段）。
// prefersReducedMotion() → 不動畫，立即 resolve（spec §5.1：無動畫直接進站）。

import gsap from 'gsap';
import { prefersReducedMotion } from './utils';

// fragment shader（spec §6.1 全文照抄）
const FRAG = `
precision mediump float;
uniform float uProgress;      // 0=全遮(墨黑) 1=全開
uniform vec2  uCenter;        // 點擊座標(0..1)
uniform vec2  uRes;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float d = distance(uv * asp, uCenter * asp);
  float n = noise(uv * 6.0) * 0.5 + noise(uv * 18.0) * 0.35 + noise(uv * 48.0) * 0.15;
  float edge = d - uProgress * 1.6 + n * 0.35;      // 噪聲擾動的圓形前沿=墨暈
  float a = smoothstep(0.02, 0.12, edge);            // a=1 全墨 a=0 全開
  float rim = smoothstep(0.02, 0.0, abs(edge - 0.06)) * 0.6; // 前沿深墨圈
  gl_FragColor = vec4(vec3(0.08, 0.07, 0.06) * (1.0 - rim), a);
}
`;

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export interface InkRevealOptions {
  /** 強制走 CSS clip-path fallback（loader「直接進入」用，spec §5.1）。 */
  forceFallback?: boolean;
}

/**
 * 墨暈揭示。center 為正規化點擊座標（0..1，原點=視窗左上）。
 * 揭示完成（overlay 已自 DOM 移除）時 resolve。
 */
export function inkReveal(center: { x: number; y: number }, opts: InkRevealOptions = {}): Promise<void> {
  // reduced-motion：無動畫直接進站（spec §5.1）。
  if (prefersReducedMotion()) return Promise.resolve();

  if (opts.forceFallback) return fallbackReveal(center);

  const webgl = tryWebglReveal(center);
  return webgl ?? fallbackReveal(center);
}

/** WebGL 路徑；建 context／編譯失敗回傳 null（呼叫端轉 fallback）。 */
function tryWebglReveal(center: { x: number; y: number }): Promise<void> | null {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
  if (!gl) return null;

  const compile = (type: number, src: string): WebGLShader | null => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('[inkReveal] shader 編譯失敗：', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[inkReveal] program link 失敗：', gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  // 單 quad（triangle strip 四頂點＝兩三角形）
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uProgress = gl.getUniformLocation(prog, 'uProgress');
  const uCenter = gl.getUniformLocation(prog, 'uCenter');
  const uRes = gl.getUniformLocation(prog, 'uRes');

  // fixed 全屏、最上層、不吃事件
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9999;pointer-events:none;';
  canvas.setAttribute('aria-hidden', 'true');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener('resize', resize);

  // gl_FragCoord 的 y 軸向上，點擊座標（原點左上）要翻轉
  gl.uniform2f(uCenter, center.x, 1 - center.y);

  document.body.appendChild(canvas);

  const state = { uProgress: 0 };
  const render = () => {
    gl.uniform1f(uProgress, state.uProgress);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  render();

  return new Promise<void>((resolve) => {
    gsap.to(state, {
      uProgress: 1,
      duration: 1.6,
      ease: 'power2.inOut',
      onUpdate: render,
      onComplete: () => {
        window.removeEventListener('resize', resize);
        canvas.remove();
        resolve();
      },
    });
  });
}

/** CSS fallback：對 <main> 做 clip-path circle 擴張（spec §6.1 末段），body 墨黑底充當遮罩。 */
function fallbackReveal(center: { x: number; y: number }): Promise<void> {
  const main = document.querySelector('main');
  if (!main) return Promise.resolve();
  const cx = (center.x * 100).toFixed(2);
  const cy = (center.y * 100).toFixed(2);
  return new Promise<void>((resolve) => {
    gsap.fromTo(
      main,
      { clipPath: `circle(0% at ${cx}% ${cy}%)` },
      {
        clipPath: `circle(150% at ${cx}% ${cy}%)`,
        duration: 1.2,
        ease: 'power2.inOut',
        onComplete: () => {
          (main as HTMLElement).style.clipPath = '';
          resolve();
        },
      }
    );
  });
}
