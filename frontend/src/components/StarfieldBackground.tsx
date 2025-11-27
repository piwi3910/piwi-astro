'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface ConstellationStar {
  x: number;
  y: number;
  size: number;
  name?: string;
}

interface Constellation {
  name: string;
  stars: ConstellationStar[];
  lines: [number, number][]; // pairs of star indices to connect
}

interface StarfieldBackgroundProps {
  starCount?: number;
  opacity?: number;
  animated?: boolean;
  showConstellations?: boolean;
}

// Define major constellations with relative positions (0-1 range)
// These will be scaled to the canvas size
const CONSTELLATIONS: Constellation[] = [
  {
    name: 'Orion',
    stars: [
      { x: 0.12, y: 0.25, size: 3.5, name: 'Betelgeuse' },
      { x: 0.18, y: 0.25, size: 2.5, name: 'Bellatrix' },
      { x: 0.13, y: 0.32, size: 2 },
      { x: 0.17, y: 0.32, size: 2 },
      { x: 0.15, y: 0.35, size: 2.5, name: 'Alnilam' },
      { x: 0.14, y: 0.35, size: 2 },
      { x: 0.16, y: 0.35, size: 2 },
      { x: 0.12, y: 0.45, size: 3, name: 'Saiph' },
      { x: 0.18, y: 0.45, size: 3.5, name: 'Rigel' },
    ],
    lines: [
      [0, 2], [1, 3], [2, 4], [3, 4], [4, 7], [4, 8],
      [5, 6], // Belt
      [0, 1], // Shoulders
      [7, 8], // Feet connection through belt
    ],
  },
  {
    name: 'Ursa Major',
    stars: [
      { x: 0.35, y: 0.12, size: 2.5, name: 'Alkaid' },
      { x: 0.38, y: 0.10, size: 2.5, name: 'Mizar' },
      { x: 0.41, y: 0.09, size: 2.5, name: 'Alioth' },
      { x: 0.45, y: 0.10, size: 2.5, name: 'Megrez' },
      { x: 0.44, y: 0.14, size: 2.5, name: 'Phecda' },
      { x: 0.48, y: 0.08, size: 2.5, name: 'Dubhe' },
      { x: 0.48, y: 0.13, size: 2.5, name: 'Merak' },
    ],
    lines: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 6], [3, 5], [5, 6],
    ],
  },
  {
    name: 'Cassiopeia',
    stars: [
      { x: 0.72, y: 0.08, size: 2.5 },
      { x: 0.75, y: 0.05, size: 2.5 },
      { x: 0.78, y: 0.07, size: 3, name: 'Gamma Cas' },
      { x: 0.81, y: 0.04, size: 2.5 },
      { x: 0.84, y: 0.06, size: 2.5 },
    ],
    lines: [
      [0, 1], [1, 2], [2, 3], [3, 4],
    ],
  },
  {
    name: 'Cygnus',
    stars: [
      { x: 0.60, y: 0.22, size: 3, name: 'Deneb' },
      { x: 0.62, y: 0.28, size: 2 },
      { x: 0.64, y: 0.34, size: 2.5, name: 'Sadr' },
      { x: 0.58, y: 0.34, size: 2 },
      { x: 0.70, y: 0.34, size: 2 },
      { x: 0.66, y: 0.42, size: 2.5, name: 'Albireo' },
    ],
    lines: [
      [0, 1], [1, 2], [2, 5], [2, 3], [2, 4],
    ],
  },
  {
    name: 'Scorpius',
    stars: [
      { x: 0.82, y: 0.55, size: 3.5, name: 'Antares' },
      { x: 0.80, y: 0.52, size: 2 },
      { x: 0.78, y: 0.50, size: 2 },
      { x: 0.84, y: 0.58, size: 2 },
      { x: 0.86, y: 0.62, size: 2 },
      { x: 0.88, y: 0.66, size: 2 },
      { x: 0.90, y: 0.68, size: 2.5 },
      { x: 0.91, y: 0.70, size: 2 },
      { x: 0.89, y: 0.72, size: 2.5, name: 'Shaula' },
    ],
    lines: [
      [0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8],
    ],
  },
  {
    name: 'Leo',
    stars: [
      { x: 0.25, y: 0.58, size: 3, name: 'Regulus' },
      { x: 0.27, y: 0.55, size: 2 },
      { x: 0.30, y: 0.52, size: 2 },
      { x: 0.33, y: 0.54, size: 2.5, name: 'Algieba' },
      { x: 0.35, y: 0.58, size: 2 },
      { x: 0.38, y: 0.56, size: 2.5, name: 'Denebola' },
      { x: 0.32, y: 0.60, size: 2 },
    ],
    lines: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [3, 6], [6, 0],
    ],
  },
  {
    name: 'Lyra',
    stars: [
      { x: 0.55, y: 0.30, size: 3.5, name: 'Vega' },
      { x: 0.54, y: 0.33, size: 1.5 },
      { x: 0.56, y: 0.33, size: 1.5 },
      { x: 0.53, y: 0.36, size: 1.5 },
      { x: 0.57, y: 0.36, size: 1.5 },
    ],
    lines: [
      [0, 1], [0, 2], [1, 3], [2, 4], [3, 4],
    ],
  },
  {
    name: 'Aquila',
    stars: [
      { x: 0.68, y: 0.48, size: 3, name: 'Altair' },
      { x: 0.66, y: 0.46, size: 2 },
      { x: 0.70, y: 0.46, size: 2 },
      { x: 0.64, y: 0.42, size: 1.5 },
      { x: 0.72, y: 0.42, size: 1.5 },
    ],
    lines: [
      [0, 1], [0, 2], [1, 3], [2, 4],
    ],
  },
  {
    name: 'Gemini',
    stars: [
      { x: 0.08, y: 0.68, size: 3, name: 'Castor' },
      { x: 0.10, y: 0.70, size: 3, name: 'Pollux' },
      { x: 0.07, y: 0.74, size: 2 },
      { x: 0.11, y: 0.76, size: 2 },
      { x: 0.06, y: 0.80, size: 1.5 },
      { x: 0.12, y: 0.82, size: 1.5 },
    ],
    lines: [
      [0, 1], [0, 2], [1, 3], [2, 4], [3, 5],
    ],
  },
  {
    name: 'Taurus',
    stars: [
      { x: 0.22, y: 0.72, size: 3.5, name: 'Aldebaran' },
      { x: 0.20, y: 0.70, size: 2 },
      { x: 0.24, y: 0.68, size: 2 },
      { x: 0.26, y: 0.66, size: 1.5 },
      { x: 0.18, y: 0.74, size: 1.5 },
      { x: 0.28, y: 0.70, size: 2, name: 'Elnath' },
    ],
    lines: [
      [0, 1], [0, 2], [2, 3], [1, 4], [2, 5],
    ],
  },
  {
    name: 'Pegasus',
    stars: [
      { x: 0.88, y: 0.25, size: 2.5, name: 'Markab' },
      { x: 0.92, y: 0.20, size: 2.5, name: 'Scheat' },
      { x: 0.95, y: 0.28, size: 2.5, name: 'Algenib' },
      { x: 0.92, y: 0.32, size: 2.5, name: 'Alpheratz' },
    ],
    lines: [
      [0, 1], [1, 2], [2, 3], [3, 0],
    ],
  },
  {
    name: 'Canis Major',
    stars: [
      { x: 0.18, y: 0.88, size: 4, name: 'Sirius' },
      { x: 0.16, y: 0.84, size: 2 },
      { x: 0.20, y: 0.82, size: 2 },
      { x: 0.22, y: 0.86, size: 2 },
      { x: 0.24, y: 0.92, size: 2 },
      { x: 0.15, y: 0.92, size: 2 },
    ],
    lines: [
      [0, 1], [0, 2], [2, 3], [3, 4], [0, 5],
    ],
  },
];

export function StarfieldBackground({
  starCount = 200,
  opacity = 0.6,
  animated = true,
  showConstellations = true,
}: StarfieldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      // Use window.innerWidth (full viewport including scrollbar area)
      // Combined with scrollbar-gutter: stable on html, this prevents jumps
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      generateStars();
    };

    // Generate background stars (not part of constellations)
    const generateStars = () => {
      const stars: Star[] = [];
      const width = canvas.width;
      const height = canvas.height;

      for (let i = 0; i < starCount; i++) {
        const sizeRandom = Math.random();
        const size = sizeRandom < 0.7 ? 0.3 + Math.random() * 0.5 :
                     sizeRandom < 0.9 ? 0.8 + Math.random() * 0.5 :
                     1.3 + Math.random() * 0.7;

        const brightness = Math.min(1, (size / 2) * (0.5 + Math.random() * 0.5));

        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size,
          brightness,
          twinkleSpeed: 0.5 + Math.random() * 2,
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }

      starsRef.current = stars;
    };

    // Draw a star with subtle glow
    const drawStar = (
      x: number,
      y: number,
      size: number,
      brightness: number,
      twinkleFactor: number,
      color: string = '#ffffff'
    ) => {
      const adjustedBrightness = brightness * twinkleFactor;

      // Glow for larger stars
      if (size > 1.5) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
        gradient.addColorStop(0, `rgba(200, 220, 255, ${adjustedBrightness * 0.3})`);
        gradient.addColorStop(1, 'rgba(200, 220, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Star core
      ctx.fillStyle = color;
      ctx.globalAlpha = adjustedBrightness;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    // Draw constellation lines
    const drawConstellationLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      alpha: number
    ) => {
      ctx.strokeStyle = `rgba(100, 149, 237, ${alpha * 0.4})`; // Cornflower blue
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    // Draw all constellations
    const drawConstellations = (time: number) => {
      const width = canvas.width;
      const height = canvas.height;

      CONSTELLATIONS.forEach((constellation) => {
        // Calculate scaled star positions
        const scaledStars = constellation.stars.map((star) => ({
          x: star.x * width,
          y: star.y * height,
          size: star.size,
        }));

        // Draw constellation lines first (behind stars)
        constellation.lines.forEach(([i1, i2]) => {
          const s1 = scaledStars[i1];
          const s2 = scaledStars[i2];
          if (s1 && s2) {
            const lineTwinkle = animated
              ? 0.6 + 0.4 * Math.sin(time * 0.3)
              : 0.8;
            drawConstellationLine(s1.x, s1.y, s2.x, s2.y, lineTwinkle);
          }
        });

        // Draw constellation stars
        scaledStars.forEach((star, index) => {
          const originalStar = constellation.stars[index];
          const twinkleFactor = animated
            ? 0.7 + 0.3 * Math.sin(time * 0.8 + index)
            : 1;

          // Constellation stars are slightly blue-white
          const color = originalStar.size > 3 ? '#e8f0ff' : '#d0e0ff';
          drawStar(star.x, star.y, star.size, 0.9, twinkleFactor, color);
        });
      });
    };

    // Animation loop
    let time = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background stars
      starsRef.current.forEach((star) => {
        const twinkleFactor = animated
          ? 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset)
          : 1;
        drawStar(star.x, star.y, star.size, star.brightness, twinkleFactor);
      });

      // Draw constellations on top
      if (showConstellations) {
        drawConstellations(time);
      }

      if (animated) {
        time += 0.02;
        animationRef.current = requestAnimationFrame(render);
      }
    };

    resizeCanvas();
    render();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [starCount, animated, showConstellations]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: -1,
        opacity,
      }}
    />
  );
}
