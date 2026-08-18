import { useEffect, useRef } from "react";

/**
 * DeepSeek Logo 的 SVG path（与 BrandLogo.tsx 保持一致）。
 * 离屏渲染到 Canvas 后采样为二值化位图，用于生成像素点阵。
 */
const LOGO_PATH =
  "M26.5174 3.39471C26.235 3.2567 26.1137 3.52006 25.9487 3.65346C25.8923 3.69659 25.8446 3.75294 25.7969 3.80469C25.3846 4.24516 24.9027 4.53439 24.2737 4.49989C23.3536 4.44814 22.5682 4.73737 21.8735 5.44119C21.7258 4.57349 21.2353 4.0554 20.4889 3.72304C20.0985 3.55054 19.7034 3.37746 19.4297 3.00197C19.2388 2.73459 19.1865 2.43673 19.091 2.14289C19.0301 1.96579 18.9697 1.78466 18.7656 1.75418C18.5442 1.71968 18.4574 1.90541 18.3705 2.06067C18.0232 2.69549 17.8887 3.39471 17.9019 4.10313C17.9324 5.6965 18.6051 6.96556 19.9421 7.86834C20.0939 7.97184 20.133 8.07535 20.0852 8.22658C19.9938 8.53766 19.8857 8.83955 19.7903 9.15063C19.7293 9.34901 19.6384 9.39271 19.4257 9.30588C18.692 8.9994 18.0583 8.54571 17.4982 7.99772C16.5477 7.07827 15.6881 6.06336 14.6162 5.26869C14.3644 5.08296 14.1125 4.91045 13.8521 4.746C12.7584 3.68394 13.9952 2.81164 14.2816 2.70814C14.5812 2.60003 14.3857 2.22857 13.4179 2.23317C12.4502 2.2372 11.5646 2.56151 10.4359 2.99335C10.2708 3.05832 10.0972 3.10547 9.91951 3.14457C8.8954 2.95022 7.83162 2.90709 6.72069 3.03245C4.62877 3.26533 2.95777 4.25436 1.72954 5.94261C0.254043 7.97184 -0.0932678 10.2777 0.33167 12.6824C0.778458 15.2171 2.07225 17.3153 4.06008 18.9558C6.12152 20.6567 8.49577 21.4905 11.2047 21.3306C12.8498 21.2358 14.6812 21.0155 16.7473 19.2669C17.2682 19.5262 17.8151 19.6297 18.7219 19.7074C19.4205 19.7723 20.0933 19.6729 20.6143 19.5648C21.4302 19.3923 21.3739 18.6367 21.0789 18.4981C18.6874 17.3843 19.2124 17.8374 18.7351 17.4706C19.9501 16.033 21.8063 13.4776 22.379 9.99821C22.4353 9.61409 22.5072 9.073 22.4986 8.76192C22.494 8.57216 22.5377 8.49856 22.7545 8.47671C23.3536 8.40771 23.935 8.24383 24.4692 7.94999C26.0188 7.10357 26.6439 5.71318 26.7911 4.04678C26.8129 3.79204 26.7865 3.52869 26.5174 3.39471ZM13.0143 18.3946C10.6964 16.5724 9.5722 15.9726 9.10816 15.9985C8.67402 16.0244 8.75222 16.5212 8.84768 16.8449C8.94773 17.1646 9.07768 17.3849 9.25996 17.6655C9.38589 17.8512 9.47272 18.1272 9.13404 18.3348C8.38766 18.7965 7.08985 18.1796 7.0289 18.1491C5.51833 17.2595 4.25559 16.0853 3.36546 14.4793C2.50581 12.9337 2.0067 11.2753 1.92447 9.50542C1.90262 9.07818 2.02855 8.92695 2.45406 8.84932C3.01413 8.74582 3.59144 8.72397 4.15093 8.80619C6.51656 9.15178 8.53027 10.2092 10.2185 11.8848C11.1822 12.8388 11.9114 13.979 12.6623 15.0929C13.461 16.2757 14.3201 17.4027 15.4144 18.3268C15.8008 18.6505 16.109 18.8966 16.404 19.0783C15.5144 19.1778 14.0297 19.1991 13.0143 18.3958V18.3946ZM14.1252 11.2489C14.1252 11.0591 14.277 10.9079 14.4679 10.9079C14.511 10.9079 14.5501 10.9165 14.5852 10.9292C14.6329 10.9464 14.6766 10.9723 14.7111 11.0114C14.7721 11.0718 14.8066 11.158 14.8066 11.2489C14.8066 11.4386 14.6548 11.5899 14.4639 11.5899C14.273 11.5899 14.1252 11.4386 14.1252 11.2489ZM17.5759 13.0188C17.3545 13.1096 17.1331 13.1873 16.9203 13.1959C16.5903 13.2131 16.2303 13.0791 16.0348 12.9153C15.7312 12.6605 15.5139 12.5179 15.423 12.0734C15.3839 11.8837 15.4057 11.5899 15.4402 11.4214C15.5185 11.0585 15.4316 10.8257 15.1757 10.614C14.9676 10.4415 14.7025 10.3938 14.4115 10.3938C14.3029 10.3938 14.2034 10.3461 14.1292 10.3076C14.0079 10.2472 13.9078 10.096 14.0033 9.91023C14.0338 9.84985 14.1815 9.70322 14.216 9.67734C14.6111 9.45251 15.0665 9.52612 15.488 9.6946C15.8784 9.85445 16.174 10.1477 16.5989 10.5623C17.033 11.0631 17.1112 11.2011 17.3585 11.5772C17.554 11.871 17.7317 12.1729 17.8536 12.5185C17.9272 12.7341 17.8317 12.9107 17.5759 13.0188Z";

/** Logo 原始 viewBox 尺寸（与 BrandLogo.tsx 一致） */
const LOGO_VIEWBOX_W = 27;
const LOGO_VIEWBOX_H = 22;

/** 设计规范配色（resources/style-guide.json） */
const COLOR_BACKGROUND = "#0b1221";
const COLOR_PARTICLE_BASE = { r: 51, g: 65, b: 85 }; // surface-highest #334155
const COLOR_PARTICLE_ACTIVE = { r: 59, g: 130, b: 246 }; // primary #3b82f6

/** 交互与渲染参数 */
const INFLUENCE_RADIUS = 140; // 鼠标感应半径（CSS px）
const LERP_POINTER = 0.18; // 指针平滑跟随系数
const LERP_RECOVER = 0.055; // 粒子恢复默认态系数（缓慢）
const GRID_GAP_MIN = 18; // 粒子最小间距（CSS px）
const GRID_GAP_MAX = 26; // 粒子最大间距（CSS px）
const PARTICLE_RADIUS_RATIO = 0.22; // 粒子半径 = gap * ratio
const LOGO_WIDTH_RATIO = 0.42; // Logo 点阵占视口宽度比例
const LOGO_WIDTH_MIN = 260;
const LOGO_WIDTH_MAX = 560;
const BITMAP_SAMPLE = 96; // 二值化位图采样分辨率（宽）
const ALPHA_THRESHOLD = 128; // 二值化阈值
// Logo 垂直中心在视口高度中的比例，与 HeroSection 的 h1 标题区域对齐
const LOGO_CENTER_Y_RATIO = 0.2;
// Logo 顶部距视口顶部的最小安全间距，避免移动端矮视口下被截断
const LOGO_TOP_SAFE_MARGIN = 96;
// Logo 点阵使用独立的细粒子间距（CSS px），保证鲸鱼轮廓清晰可辨
const LOGO_GAP = 9;

interface Particle {
  /** 网格坐标（CSS px） */
  x: number;
  y: number;
  /** 是否属于 Logo 点阵 */
  inLogo: boolean;
  /** 当前激活强度 0..1 */
  energy: number;
  /** 半径（CSS px） */
  r: number;
}

export interface PixelLogoBackgroundProps {
  readonly className?: string;
}

/**
 * 像素点阵 Logo 背景。
 *
 * 全屏 Canvas，中央渲染由像素点构成的 DeepSeek Logo，
 * 指针靠近时粒子平滑点亮（shimmer），离开后缓慢恢复深色。
 * 使用 requestAnimationFrame + 平方距离计算，目标 60fps。
 */
export function PixelLogoBackground({ className }: PixelLogoBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let rafId = 0;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;

    // 指针状态（CSS px 坐标系）；target 为真实位置，current 为平滑后位置
    const pointer = {
      targetX: -9999,
      targetY: -9999,
      x: -9999,
      y: -9999,
      active: false,
    };

    /** 将 Logo SVG 离屏渲染并采样为二值化位图 */
    const buildLogoBitmap = (): { data: Uint8Array; cols: number; rows: number } => {
      const cols = BITMAP_SAMPLE;
      const rows = Math.round((BITMAP_SAMPLE * LOGO_VIEWBOX_H) / LOGO_VIEWBOX_W);
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const offCtx = off.getContext("2d", { willReadFrequently: true });
      const data = new Uint8Array(cols * rows);
      if (!offCtx) return { data, cols, rows };

      offCtx.fillStyle = "#000";
      offCtx.fillRect(0, 0, cols, rows);
      offCtx.fillStyle = "#fff";
      const path = new Path2D(LOGO_PATH);
      const scale = cols / LOGO_VIEWBOX_W;
      offCtx.setTransform(scale, 0, 0, scale, 0, 0);
      offCtx.fill(path);
      offCtx.setTransform(1, 0, 0, 1, 0, 0);

      const img = offCtx.getImageData(0, 0, cols, rows).data;
      for (let i = 0; i < cols * rows; i += 1) {
        data[i] = img[i * 4] >= ALPHA_THRESHOLD ? 1 : 0;
      }
      return { data, cols, rows };
    };

    /** 依据视口尺寸重建粒子网格 */
    const rebuild = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 依据视口尺寸自适应粒子间距，控制粒子总量以保证性能
      const gap = Math.round(
        Math.min(GRID_GAP_MAX, Math.max(GRID_GAP_MIN, Math.sqrt((width * height) / 9000))),
      );
      const cols = Math.ceil(width / gap) + 1;
      const rows = Math.ceil(height / gap) + 1;
      const radius = gap * PARTICLE_RADIUS_RATIO;

      // Logo 点阵区域（水平居中，垂直对齐 h1 标题区）
      const logoW = Math.round(
        Math.min(LOGO_WIDTH_MAX, Math.max(LOGO_WIDTH_MIN, width * LOGO_WIDTH_RATIO)),
      );
      const logoH = Math.round((logoW * LOGO_VIEWBOX_H) / LOGO_VIEWBOX_W);
      const logoX = Math.round((width - logoW) / 2);
      // 垂直方向：中心对齐到 h1 标题区域（视口上部），并钳制避免超出视口
      const idealCenterY = height * LOGO_CENTER_Y_RATIO;
      const minCenterY = LOGO_TOP_SAFE_MARGIN + logoH / 2;
      const maxCenterY = height - logoH / 2;
      const centerY = Math.min(maxCenterY, Math.max(minCenterY, idealCenterY));
      const logoY = Math.round(centerY - logoH / 2);

      const bitmap = buildLogoBitmap();

      const next: Particle[] = [];

      // 1) 背景大网格：稀疏、默认极暗，仅作氛围与 shimmer 载体
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          next.push({ x: col * gap, y: row * gap, inLogo: false, energy: 0, r: radius });
        }
      }

      // 2) Logo 细网格：按位图逐点采样，仅在 Logo 笔划处生成致密亮点
      const logoCols = Math.floor(logoW / LOGO_GAP);
      const logoRows = Math.floor(logoH / LOGO_GAP);
      const logoRadius = LOGO_GAP * 0.34;
      for (let row = 0; row < logoRows; row += 1) {
        for (let col = 0; col < logoCols; col += 1) {
          const bx = Math.min(
            bitmap.cols - 1,
            Math.floor((col / logoCols) * bitmap.cols),
          );
          const by = Math.min(
            bitmap.rows - 1,
            Math.floor((row / logoRows) * bitmap.rows),
          );
          if (bitmap.data[by * bitmap.cols + bx] !== 1) continue;
          next.push({
            x: logoX + col * LOGO_GAP + LOGO_GAP / 2,
            y: logoY + row * LOGO_GAP + LOGO_GAP / 2,
            inLogo: true,
            energy: 0,
            r: logoRadius,
          });
        }
      }

      particles = next;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.targetX = event.clientX - rect.left;
      pointer.targetY = event.clientY - rect.top;
      pointer.active = true;
    };

    const onPointerLeave = () => {
      pointer.active = false;
      pointer.targetX = -9999;
      pointer.targetY = -9999;
    };

    const render = () => {
      // 指针平滑跟随
      if (pointer.active) {
        pointer.x += (pointer.targetX - pointer.x) * LERP_POINTER;
        pointer.y += (pointer.targetY - pointer.y) * LERP_POINTER;
      } else {
        pointer.x += (-9999 - pointer.x) * LERP_RECOVER;
        pointer.y += (-9999 - pointer.y) * LERP_RECOVER;
      }

      ctx.fillStyle = COLOR_BACKGROUND;
      ctx.fillRect(0, 0, width, height);

      const radiusSq = INFLUENCE_RADIUS * INFLUENCE_RADIUS;
      const px = pointer.x;
      const py = pointer.y;

      const base = COLOR_PARTICLE_BASE;
      const active = COLOR_PARTICLE_ACTIVE;

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];

        // 平方距离，避免开方
        const dx = p.x - px;
        const dy = p.y - py;
        const distSq = dx * dx + dy * dy;

        let target = 0;
        if (distSq < radiusSq) {
          // 平滑衰减曲线（cosine ease），中心最亮
          const t = 1 - Math.sqrt(distSq) / INFLUENCE_RADIUS;
          target = 0.5 - 0.5 * Math.cos(t * Math.PI);
        }

        // 激活快速响应，恢复缓慢（呼吸/闪烁感）
        if (target > p.energy) {
          p.energy += (target - p.energy) * 0.35;
        } else {
          p.energy += (target - p.energy) * LERP_RECOVER;
        }
        if (p.energy < 0.003) p.energy = 0;

        const e = p.energy;
        // Logo 粒子默认高亮清晰呈现轮廓，背景粒子极暗近乎隐形，突出主体、保持极简
        const baseAlpha = p.inLogo ? 0.6 : 0.07;
        const alpha = baseAlpha + e * (1 - baseAlpha);

        const r = Math.round(base.r + (active.r - base.r) * e);
        const g = Math.round(base.g + (active.g - base.g) * e);
        const b = Math.round(base.b + (active.b - base.b) * e);

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + e * p.r * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(render);
    };

    rebuild();
    rafId = window.requestAnimationFrame(render);

    const resizeObserver = new ResizeObserver(rebuild);
    resizeObserver.observe(canvas);

    // 同时监听 window 的 pointer 事件，保证触摸滑动（touch）也被追踪
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "pixel-logo-background"}
      aria-hidden="true"
    />
  );
}
