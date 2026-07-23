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
    const cameraDistance = 3.35;
    const focalLength = canvasSize * 0.62;
    const depth = cameraDistance - z;
    const scale = focalLength / depth;
    return {
      x: canvasSize / 2 + x * scale,
      y: canvasSize / 2 + y * scale,
      z,
      scale,
      depth
    };
  };

  const drawStrut = (start, end, width) => {
    const projected = [projectPoint(start), projectPoint(end)];
    const averageZ = (projected[0].z + projected[1].z) / 2;
    const nominalScale = (canvasSize * 0.62) / 3.35;
    const scaleFactor = ((projected[0].scale + projected[1].scale) / 2) / nominalScale;
    const strokeWidth = width * Math.min(1.42, Math.max(0.72, scaleFactor));
    const shade = Math.min(1, Math.max(0, 0.5 + averageZ * 0.12));
    const dark = 66 + shade * 18;
    const mid = 164 + shade * 26;
    const light = 224 + shade * 18;
    const gradient = ctx.createLinearGradient(projected[0].x, projected[0].y, projected[1].x, projected[1].y);
    gradient.addColorStop(0, `rgb(${dark}, ${dark + 5}, ${dark + 9})`);
    gradient.addColorStop(0.42, `rgb(${light}, ${light + 2}, ${light + 3})`);
    gradient.addColorStop(1, `rgb(${mid}, ${mid + 5}, ${mid + 8})`);

    ctx.beginPath();
    projected.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = gradient;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
    ctx.shadowBlur = strokeWidth * 1.1;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgb(255, 255, 255)";
    ctx.lineWidth = Math.max(1, strokeWidth * 0.25);
    ctx.stroke();
  };

  const drawNode = (point, radius) => {
    const projected = projectPoint(point);
    const shade = Math.min(1, Math.max(0, 0.5 + projected.z * 0.12));
    const dark = 58 + shade * 20;
    const mid = 176 + shade * 24;
    const light = 238 + shade * 12;
    const r = Math.max(2.5, radius * projected.scale);
    const nodeGradient = ctx.createRadialGradient(
      projected.x - r * 0.36,
      projected.y - r * 0.42,
      r * 0.1,
      projected.x,
      projected.y,
      r
    );
    nodeGradient.addColorStop(0, `rgb(${light}, ${light}, ${light})`);
    nodeGradient.addColorStop(0.48, `rgb(${mid}, ${mid + 3}, ${mid + 6})`);
    nodeGradient.addColorStop(1, `rgb(${dark}, ${dark + 5}, ${dark + 9})`);

    ctx.beginPath();
    ctx.fillStyle = nodeGradient;
    ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
    ctx.shadowBlur = r * 0.8;
    ctx.arc(projected.x, projected.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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
    glow.addColorStop(0, "rgba(255, 255, 255, 0.14)");
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const nodeMap = new Map();
    const strutMap = new Map();
    const nodes = [];
    const struts = [];
    const corners = [
      [-1, -1, -1],
      [1, -1, -1],
      [-1, 1, -1],
      [1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [-1, 1, 1],
      [1, 1, 1]
    ];
    const faceCenters = [
      [0, 0, -1],
      [0, 0, 1],
      [0, -1, 0],
      [0, 1, 0],
      [-1, 0, 0],
      [1, 0, 0]
    ];

    const keyForPoint = (point) => point.map((value) => value.toFixed(3)).join(",");
    const addNode = (point) => {
      const key = keyForPoint(point);
      if (!nodeMap.has(key)) {
        nodeMap.set(key, point);
        nodes.push(point);
      }
      return nodeMap.get(key);
    };
    const addStrut = (start, end, type = "lattice") => {
      const a = addNode(start);
      const b = addNode(end);
      const key = [keyForPoint(a), keyForPoint(b)].sort().join("|");
      if (!strutMap.has(key)) {
        const z = (projectPoint(a).z + projectPoint(b).z) / 2;
        const length = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        const item = { start: a, end: b, type, z, length };
        strutMap.set(key, item);
        struts.push(item);
      }
    };

    corners.forEach(addNode);
    faceCenters.forEach(addNode);

    const edgePairs = [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [4, 5],
      [4, 6],
      [5, 7],
      [6, 7],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7]
    ];
    edgePairs.forEach(([a, b]) => addStrut(corners[a], corners[b], "frame"));

    faceCenters.forEach((center) => {
      corners
        .filter((corner) =>
          corner.some((value, index) => center[index] !== 0 && value === center[index])
        )
        .forEach((corner) => addStrut(center, corner, "diagonal"));
    });

    addStrut(faceCenters[0], faceCenters[1], "spine");
    addStrut(faceCenters[2], faceCenters[3], "spine");
    addStrut(faceCenters[4], faceCenters[5], "spine");

    const drawItems = [
      ...struts.map((strut) => ({
        kind: "strut",
        z: (projectPoint(strut.start).z + projectPoint(strut.end).z) / 2,
        strut
      })),
      ...nodes.map((point) => ({
        kind: "node",
        z: projectPoint(point).z,
        point
      }))
    ].sort((a, b) => a.z - b.z);

    drawItems.forEach((item) => {
      if (item.kind === "node") {
        drawNode(item.point, 0.044);
        return;
      }

      const width = item.strut.type === "spine" ? canvasSize * 0.017 : canvasSize * 0.015;
      drawStrut(item.strut.start, item.strut.end, width);
    });
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
    targetRotation.y = x * Math.PI * 0.78;
    targetRotation.x = -0.22 - y * Math.PI * 0.34;
  };

  const animateMetamaterial = () => {
    if (!pointer.active && !reduceMotion) targetRotation.y -= 0.0035;
    rotation.x += (targetRotation.x - rotation.x) * 0.045;
    rotation.y += (targetRotation.y - rotation.y) * 0.045;
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
