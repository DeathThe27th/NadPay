"use client";

import { useEffect, useRef } from "react";

export interface VoxelTopographyGridProps {
  tileSize?: number;
  maxHeight?: number;
  primaryColor?: string;
  wireColor?: string;
  speed?: number;
  className?: string;
}

export function VoxelTopographyGrid({
  tileSize = 48,
  maxHeight = 62,
  primaryColor = "#7357e5",
  wireColor = "rgba(184, 170, 255, 0.28)",
  speed = 0.01,
  className = "",
}: VoxelTopographyGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let time = 0;
    let visible = document.visibilityState === "visible";
    let inViewport = true;
    let scrolling = false;
    let scrollTimer = 0;
    let lastFrame = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    const cleanHex = primaryColor.replace("#", "");
    const value = Number.parseInt(cleanHex.length === 3 ? cleanHex.split("").map((c) => c + c).join("") : cleanHex, 16);
    const rgb = { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
    const leftFace = `rgba(${Math.floor(rgb.r * .32)},${Math.floor(rgb.g * .32)},${Math.floor(rgb.b * .32)},.9)`;
    const rightFace = `rgba(${Math.floor(rgb.r * .5)},${Math.floor(rgb.g * .5)},${Math.floor(rgb.b * .5)},.9)`;
    const topColors = Array.from({ length: 101 }, (_, index) => {
      const ratio = index / 100;
      return `rgb(${Math.floor(rgb.r * (.42 + ratio * .58))},${Math.floor(rgb.g * (.42 + ratio * .58))},${Math.floor(rgb.b * (.42 + ratio * .58))})`;
    });

    const resize = () => {
      const dpr = 1;
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const move = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointerRef.current.targetX = event.clientX - rect.left;
      pointerRef.current.targetY = event.clientY - rect.top;
    };
    const leave = () => { pointerRef.current.targetX = -1000; pointerRef.current.targetY = -1000; };
    const visibility = () => { visible = document.visibilityState === "visible"; };
    const handleScroll = () => {
      scrolling = true;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => { scrolling = false; }, 120);
    };
    container.addEventListener("pointermove", move, { passive: true });
    container.addEventListener("pointerleave", leave, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("scroll", handleScroll, { passive: true });
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
    }, { rootMargin: "80px" });
    intersectionObserver.observe(container);

    const tileW = tileSize * .866025;
    const tileH = tileSize * .5;
    const radiusSq = 210 * 210;
    const draw = (timestamp = 0) => {
      if (visible && inViewport && !scrolling && (reduceMotion || lowPower || timestamp - lastFrame >= 33)) {
        lastFrame = timestamp;
        if (!reduceMotion && !lowPower) time += speed;
        pointerRef.current.x += (pointerRef.current.targetX - pointerRef.current.x) * .24;
        pointerRef.current.y += (pointerRef.current.targetY - pointerRef.current.y) * .24;
        ctx.fillStyle = "#080918";
        ctx.fillRect(0, 0, width, height);
        const cols = Math.ceil(width / tileW) + 4;
        const rows = Math.ceil(height / tileH) + 8;
        const originX = width * .5;
        const originY = height * .34;
        for (let row = -Math.floor(rows / 2); row < Math.ceil(rows / 2); row++) {
          for (let col = -Math.floor(cols / 2); col < Math.ceil(cols / 2); col++) {
            const isoX = originX + (col - row) * tileW;
            const isoY = originY + (col + row) * tileH;
            const dx = isoX - pointerRef.current.x;
            const dy = isoY - pointerRef.current.y;
            const distanceSq = dx * dx + dy * dy;
            let elevation = (Math.sin(time * 2 + col * .25 + row * .25) + Math.cos(time * 1.5 + col * .15 - row * .3) + 2) * .25 * maxHeight;
            if (distanceSq < radiusSq) {
              const influence = 1 - Math.sqrt(distanceSq) / 210;
              elevation += influence * influence * 48;
            }
            const y = isoY - elevation;
            if (isoX + tileW < 0 || isoX - tileW > width || y > height || y + elevation + 16 < 0) continue;
            const bottom = elevation + 15;
            ctx.beginPath(); ctx.moveTo(isoX - tileW, y); ctx.lineTo(isoX, y + tileH); ctx.lineTo(isoX, y + tileH + bottom); ctx.lineTo(isoX - tileW, y + bottom); ctx.closePath(); ctx.fillStyle = leftFace; ctx.fill();
            ctx.beginPath(); ctx.moveTo(isoX, y + tileH); ctx.lineTo(isoX + tileW, y); ctx.lineTo(isoX + tileW, y + bottom); ctx.lineTo(isoX, y + tileH + bottom); ctx.closePath(); ctx.fillStyle = rightFace; ctx.fill();
            ctx.beginPath(); ctx.moveTo(isoX, y - tileH); ctx.lineTo(isoX + tileW, y); ctx.lineTo(isoX, y + tileH); ctx.lineTo(isoX - tileW, y); ctx.closePath();
            ctx.fillStyle = topColors[Math.min(100, Math.max(10, Math.floor(elevation / (maxHeight + 48) * 100)))]; ctx.fill(); ctx.strokeStyle = wireColor; ctx.lineWidth = .6; ctx.stroke();
          }
        }
      }
      if (!reduceMotion && !lowPower) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", move);
      container.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("scroll", handleScroll);
      window.clearTimeout(scrollTimer);
      intersectionObserver.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [tileSize, maxHeight, primaryColor, wireColor, speed]);

  return <div ref={containerRef} className={`voxel-field ${className}`} aria-hidden="true"><canvas ref={canvasRef} /></div>;
}

export default VoxelTopographyGrid;
