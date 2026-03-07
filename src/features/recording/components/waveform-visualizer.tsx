"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface WaveformVisualizerProps {
  isActive: boolean;
  audioLevel: number;
}

const BAR_COUNT = 20;

export function WaveformVisualizer({
  isActive,
  audioLevel,
}: WaveformVisualizerProps) {
  const barSeeds = useMemo(
    () => Array.from({ length: BAR_COUNT }, () => Math.random()),
    []
  );

  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {barSeeds.map((seed, i) => {
        const distanceFromCenter = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
        const baseHeight = isActive
          ? Math.max(0.08, audioLevel * (1 - distanceFromCenter * 0.6) * (0.7 + seed * 0.6))
          : 0.08;

        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full"
            animate={{
              height: `${Math.max(3, baseHeight * 64)}px`,
              backgroundColor: isActive
                ? "rgb(34, 197, 94)"
                : "rgb(245, 158, 11)",
              opacity: isActive ? 0.7 + audioLevel * 0.3 : 0.4,
            }}
            transition={{
              height: { duration: 0.08, ease: "easeOut" },
              backgroundColor: { duration: 0.3 },
              opacity: { duration: 0.15 },
            }}
          />
        );
      })}
    </div>
  );
}
