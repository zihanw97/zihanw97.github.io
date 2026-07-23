const header = document.querySelector("[data-header]");
const year = document.querySelector("[data-year]");
const revealItems = document.querySelectorAll(".section, .page-hero");

if (year) {
  year.textContent = new Date().getFullYear();
}

document.documentElement.classList.add("motion-ready");

const setHeaderState = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 16);
};

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const metamaterialCanvas = document.querySelector("[data-metamaterial-canvas]");

if (metamaterialCanvas) {
  const ctx = metamaterialCanvas.getContext("2d");
  if (!ctx) {
    metamaterialCanvas.remove();
  } else {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointer = { active: false, x: 0, y: 0 };
  const rotation = { x: -0.22, y: 0.42 };
  const targetRotation = { x: -0.22, y: 0.42 };
  let canvasSize = 0;

  const rotatePoint = ([x, y, z], rx, ry) => {
    const cosX = Math.cos(rx);
    const sinX = Math.sin(rx);
    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    const x2 = x * cosY + z1 * sinY;
    const z2 = -x * sinY + z1 * cosY;
    return [x2, y1, z2];
  };

  const projectPoint = (point) => {
    const [x, y, z] = rotatePoint(point, rotation.x, rotation.y);
    const depth = 3.15 + z;
    const scale = canvasSize * 0.58 / depth;
    return {
      x: canvasSize / 2 + x * scale,
      y: canvasSize / 2 + y * scale,
      z,
      scale
    };
  };

  const drawPath = (points, width, alpha = 1) => {
    const projected = points.map(projectPoint);
    ctx.beginPath();
    projected.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = `rgba(214, 218, 220, ${alpha})`;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
    ctx.shadowBlur = width * 1.2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(82, 88, 92, ${alpha * 0.7})`;
    ctx.lineWidth = Math.max(1, width * 0.28);
    ctx.stroke();
  };

  const ringPoints = (face, a, b, radius) => {
    const points = [];
    for (let i = 0; i <= 44; i += 1) {
      const angle = (i / 44) * Math.PI * 2;
      const u = a + Math.cos(angle) * radius;
      const v = b + Math.sin(angle) * radius;
      if (face === "front") points.push([u, v, 1]);
      if (face === "right") points.push([1, v, u]);
      if (face === "top") points.push([u, -1, v]);
    }
    return points;
  };

  const drawMetamaterial = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    const glow = ctx.createRadialGradient(
      canvasSize * 0.5,
      canvasSize * 0.52,
      canvasSize * 0.08,
      canvasSize * 0.5,
      canvasSize * 0.52,
      canvasSize * 0.48
    );
    glow.addColorStop(0, "rgba(255, 255, 255, 0.22)");
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const edges = [
      [[-1, -1, -1], [1, -1, -1]],
      [[-1, 1, -1], [1, 1, -1]],
      [[-1, -1, 1], [1, -1, 1]],
      [[-1, 1, 1], [1, 1, 1]],
      [[-1, -1, -1], [-1, 1, -1]],
      [[1, -1, -1], [1, 1, -1]],
      [[-1, -1, 1], [-1, 1, 1]],
      [[1, -1, 1], [1, 1, 1]],
      [[-1, -1, -1], [-1, -1, 1]],
      [[1, -1, -1], [1, -1, 1]],
      [[-1, 1, -1], [-1, 1, 1]],
      [[1, 1, -1], [1, 1, 1]]
    ];

    const rings = [];
    ["front", "right", "top"].forEach((face) => {
      [-0.5, 0.5].forEach((a) => {
        [-0.5, 0.5].forEach((b) => {
          rings.push({ face, points: ringPoints(face, a, b, 0.32) });
        });
      });
      rings.push({ face, points: ringPoints(face, 0, 0, 0.38) });
    });

    const drawItems = [
      ...edges.map((points) => ({ points, width: canvasSize * 0.028, z: points.reduce((sum, point) => sum + projectPoint(point).z, 0) / 2 })),
      ...rings.map((ring) => ({ points: ring.points, width: canvasSize * 0.022, z: ring.points.reduce((sum, point) => sum + projectPoint(point).z, 0) / ring.points.length }))
    ].sort((a, b) => a.z - b.z);

    drawItems.forEach((item) => drawPath(item.points, item.width, 0.86));
  };

  const resizeMetamaterial = () => {
    const rect = metamaterialCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasSize = Math.max(220, Math.min(rect.width, rect.height));
    metamaterialCanvas.width = Math.round(rect.width * dpr);
    metamaterialCanvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMetamaterial();
  };

  const updateTargetFromPointer = (event) => {
    const rect = metamaterialCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    targetRotation.y = x * Math.PI * 1.45;
    targetRotation.x = -0.22 + y * Math.PI * 0.55;
  };

  const animateMetamaterial = () => {
    if (!pointer.active && !reduceMotion) targetRotation.y += 0.006;
    rotation.x += (targetRotation.x - rotation.x) * 0.08;
    rotation.y += (targetRotation.y - rotation.y) * 0.08;
    drawMetamaterial();
    if (!reduceMotion) window.requestAnimationFrame(animateMetamaterial);
  };

  metamaterialCanvas.addEventListener("pointerdown", (event) => {
    pointer.active = true;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    metamaterialCanvas.setPointerCapture(event.pointerId);
    updateTargetFromPointer(event);
  });

  metamaterialCanvas.addEventListener("pointermove", (event) => {
    if (!pointer.active && event.pointerType === "touch") return;
    updateTargetFromPointer(event);
  });

  metamaterialCanvas.addEventListener("pointerup", (event) => {
    pointer.active = false;
    metamaterialCanvas.releasePointerCapture(event.pointerId);
  });

  metamaterialCanvas.addEventListener("pointerleave", () => {
    pointer.active = false;
  });

  window.addEventListener("resize", resizeMetamaterial, { passive: true });
  resizeMetamaterial();
  animateMetamaterial();
  }
}
