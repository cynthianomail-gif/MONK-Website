// audio.ts — AudioManager（spec §4.2）
//
// 使用者追加指示（spec 未寫，以此為準）：音訊素材檔還不存在
// （public/media/audio/ 是空的），必須 fail-soft——fetch 失敗或 decode 失敗
// 就靜默跳過該音效（console.warn 一次即可），bgm.play() 失敗同樣吞掉；
// 日後補上 mp3 檔不改碼即生效。

const SFX_NAMES = ['sfx_woodfish', 'sfx_bell'] as const;
type SfxName = (typeof SFX_NAMES)[number];

class AudioManager {
  private ctx?: AudioContext;
  private buffers = new Map<string, AudioBuffer>();
  private bgm = new Audio('media/audio/bgm.mp3');
  private warned = new Set<string>();
  muted = localStorage.getItem('monk-muted') === '1';

  private warnOnce(key: string, ...args: unknown[]) {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    console.warn(...args);
  }

  /** loader 木魚點擊時呼叫（使用者手勢，瀏覽器自動播放政策所迫）。 */
  async unlock() {
    this.ctx ??= new AudioContext();
    await Promise.all(
      SFX_NAMES.map(async (n) => {
        try {
          const res = await fetch(`media/audio/${n}.mp3`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const ab = await res.arrayBuffer();
          const decoded = await this.ctx!.decodeAudioData(ab);
          this.buffers.set(n, decoded);
        } catch (err) {
          // fail-soft：素材缺檔或無法解碼時靜默跳過，不阻斷 unlock 流程。
          this.warnOnce(`sfx:${n}`, `[audio] ${n} 載入失敗，略過（素材可能尚未提供）`, err);
        }
      })
    );
    this.bgm.loop = true;
    this.bgm.volume = 0.35;
    if (!this.muted) {
      this.bgm.play().catch((err) => {
        this.warnOnce('bgm:play', '[audio] bgm 播放失敗，略過（素材可能尚未提供）', err);
      });
    }
  }

  sfx(name: SfxName | string, rate = 1) {
    if (this.muted || !this.ctx) return;
    const buffer = this.buffers.get(name);
    if (!buffer) return; // 素材未載入（fail-soft），靜默跳過
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    src.connect(this.ctx.destination);
    src.start();
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('monk-muted', this.muted ? '1' : '0');
    if (this.muted) {
      this.bgm.pause();
    } else if (this.ctx) {
      // 只有在已經 unlock（有手勢）過才嘗試播放，避免觸發瀏覽器自動播放限制的例外。
      this.bgm.play().catch((err) => {
        this.warnOnce('bgm:toggle-play', '[audio] bgm 播放失敗，略過', err);
      });
    }
  }

  /** document.visibilitychange 隱藏時暫停 BGM，回來且未靜音且已 unlock 過則恢復。 */
  onVisibilityChange() {
    if (document.hidden) {
      this.bgm.pause();
    } else if (!this.muted && this.ctx) {
      this.bgm.play().catch(() => {});
    }
  }
}

export const audio = new AudioManager();

document.addEventListener('visibilitychange', () => audio.onVisibilityChange());

// ---- 右上角固定「音」鈕：HTML+CSS+接線 ----

function initMuteButton() {
  let btn = document.getElementById('mute-toggle') as HTMLButtonElement | null;
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'mute-toggle';
    btn.type = 'button';
    document.body.appendChild(btn);
  }

  const render = () => {
    btn!.textContent = audio.muted ? '靜音' : '音';
    btn!.setAttribute('aria-pressed', String(audio.muted));
    btn!.setAttribute('aria-label', audio.muted ? '取消靜音' : '靜音');
  };
  render();

  btn.addEventListener('click', () => {
    audio.toggleMute();
    render();
  });
}

initMuteButton();
