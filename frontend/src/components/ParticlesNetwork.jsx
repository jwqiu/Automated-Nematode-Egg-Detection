import React from "react";
// @ts-ignore
import Particles from "@tsparticles/react";

export default function ParticlesNetwork() {
  return (
    <Particles
      id="tsparticles"
      className="fixed inset-0 w-screen h-screen block pointer-events-none z-10"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        display: "block", // 让 div 不会塌陷为0
        zIndex: 50,        // 或更小，让它在底层
        pointerEvents: "none",
      }}
      options={{
        background: { color: { value: "#ffffff" } },
        particles: {
            number: { value: 120 },
            color: { value: "#ff0000" }, // 红色点
            opacity: { value: 1 },
            size: { value: 10, random: false }, // 粒子变大
            move: { enable: true, speed: 2 },
            links: {
                enable: true,
                distance: 300,
                color: "#00ff00", // 绿色线
                opacity: 1,
                width: 3,
            },
        },

        detectRetina: true,
      }}
    />
  );
}
