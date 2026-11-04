import { PRESSURE_STEPS, sealWalls } from './swarm-grid';

/** Pushes, whirls and churns the velocity grid around the cursor (and around a hovered target). */
export const stir = (ctx, s, dt, ease) => {
  const { cols, rows, cell, flowX, flowY, anchor, ring, presence, time, field } = ctx;
  const radius = s.spread;
  const reach = radius * 2.2;
  const i0 = Math.max(1, Math.floor((anchor.x - reach) / cell));
  const i1 = Math.min(cols - 2, Math.ceil((anchor.x + reach) / cell));
  const j0 = Math.max(1, Math.floor((anchor.y - reach) / cell));
  const j1 = Math.min(rows - 2, Math.ceil((anchor.y + reach) / cell));
  const inv = 1 / (radius * radius * 0.55);
  const moving = Math.hypot(anchor.moveX, anchor.moveY);
  const grab = (1 - Math.exp(-dt * 20)) * Math.min(1, Math.max(0, moving / 240)) * presence;
  const whirl = ring.active ? 0 : radius * (0.5 + 4 * (1 - ease)) * (0.35 + 0.65 * s.speed);
  const churn = s.wander * radius * 14 * (0.4 + 0.6 * s.speed);
  const fk = 1.4 / radius;
  const ft = time * 0.75 * (0.4 + 0.6 * s.speed);
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const k = i + j * cols;
      const x = (i + 0.5) * cell;
      const y = (j + 0.5) * cell;
      const rx = x - anchor.x;
      const ry = y - anchor.y;
      const d2 = rx * rx + ry * ry;
      const w = Math.exp(-d2 * inv);
      if (w < 0.003) continue;
      const d = Math.sqrt(d2) + 0.001;
      flowX[k] += (anchor.moveX - flowX[k]) * w * grab;
      flowY[k] += (anchor.moveY - flowY[k]) * w * grab;
      const reachOut = Math.min(1, d / (radius * 0.45));
      flowX[k] += (-ry / d) * whirl * reachOut * w * dt;
      flowY[k] += (rx / d) * whirl * reachOut * w * dt;
      const a1 = x * fk + ft;
      const b1 = y * fk * 1.1 - ft * 0.8;
      const a2 = y * fk * 1.7 + ft * 1.2 + 1.3;
      const b2 = x * fk * 1.3 - 0.7;
      const curlX = -Math.sin(a1) * Math.sin(b1) * 1.1 + 1.02 * Math.cos(a2) * Math.cos(b2);
      const curlY = -(Math.cos(a1) * Math.cos(b1) - 0.78 * Math.sin(a2) * Math.sin(b2));
      flowX[k] += curlX * churn * w * dt;
      flowY[k] += curlY * churn * w * dt;
    }
  }
  if (!ring.active) return;
  const band = Math.max(4, radius * 0.16);
  const margin = band + 24;
  const circulate = 230 * (0.4 + 0.6 * s.speed) * ring.spin;
  const r0 = Math.max(1, Math.floor((ring.x - ring.hx - margin) / cell));
  const r1 = Math.min(cols - 2, Math.ceil((ring.x + ring.hx + margin) / cell));
  const c0 = Math.max(1, Math.floor((ring.y - ring.hy - margin) / cell));
  const c1 = Math.min(rows - 2, Math.ceil((ring.y + ring.hy + margin) / cell));
  const rate = 1 - Math.exp(-dt * 6);
  for (let j = c0; j <= c1; j++) {
    for (let i = r0; i <= r1; i++) {
      const k = i + j * cols;
      ctx.sdf((i + 0.5) * cell - ring.x, (j + 0.5) * cell - ring.y, ring.hx, ring.hy, ring.corner, field);
      const off = field[0] - (5 + band * 0.5);
      const w = Math.exp(-(off * off) / (margin * margin * 0.35));
      if (w < 0.01) continue;
      flowX[k] += (-field[2] * circulate - flowX[k]) * w * rate;
      flowY[k] += (field[1] * circulate - flowY[k]) * w * rate;
    }
  }
};

/**
 * Semi-Lagrangian advection, confinement and a Jacobi pressure solve, so the field reads as
 * a swirling fluid rather than noise.
 */
export const flowField = (ctx, s, dt) => {
  const { cols, rows, cell, flowX, flowY, lastX, lastY, pressure, divergence, curl } = ctx;
  const total = cols * rows;
  for (let j = 1; j < rows - 1; j++) {
    for (let i = 1; i < cols - 1; i++) {
      const k = i + j * cols;
      curl[k] = (flowY[k + 1] - flowY[k - 1] - flowX[k + cols] + flowX[k - cols]) * (0.5 / cell);
    }
  }
  const confine = s.swirl * cell * 9;
  for (let j = 2; j < rows - 2; j++) {
    for (let i = 2; i < cols - 2; i++) {
      const k = i + j * cols;
      const gx = Math.abs(curl[k + 1]) - Math.abs(curl[k - 1]);
      const gy = Math.abs(curl[k + cols]) - Math.abs(curl[k - cols]);
      const len = Math.hypot(gx, gy) + 1e-5;
      flowX[k] += (gy / len) * curl[k] * confine * dt;
      flowY[k] -= (gx / len) * curl[k] * confine * dt;
    }
  }
  lastX.set(flowX);
  lastY.set(flowY);
  const back = dt / cell;
  const fade = Math.exp(-dt / (0.35 + 1.5 * s.swirl));
  for (let j = 1; j < rows - 1; j++) {
    for (let i = 1; i < cols - 1; i++) {
      const k = i + j * cols;
      let x = i - back * lastX[k];
      let y = j - back * lastY[k];
      if (x < 0.5) x = 0.5;
      else if (x > cols - 1.5) x = cols - 1.5;
      if (y < 0.5) y = 0.5;
      else if (y > rows - 1.5) y = rows - 1.5;
      const i0 = x | 0;
      const j0 = y | 0;
      const fx = x - i0;
      const fy = y - j0;
      const a = i0 + j0 * cols;
      flowX[k] =
        ((lastX[a] * (1 - fx) + lastX[a + 1] * fx) * (1 - fy) +
          (lastX[a + cols] * (1 - fx) + lastX[a + cols + 1] * fx) * fy) *
        fade;
      flowY[k] =
        ((lastY[a] * (1 - fx) + lastY[a + 1] * fx) * (1 - fy) +
          (lastY[a + cols] * (1 - fx) + lastY[a + cols + 1] * fx) * fy) *
        fade;
    }
  }
  sealWalls(flowX, 1, rows, cols);
  sealWalls(flowY, 2, rows, cols);
  const h2 = cell * cell;
  for (let j = 1; j < rows - 1; j++) {
    for (let i = 1; i < cols - 1; i++) {
      const k = i + j * cols;
      divergence[k] = (flowX[k + 1] - flowX[k - 1] + flowY[k + cols] - flowY[k - cols]) * (0.5 / cell);
    }
  }
  pressure.fill(0, 0, total);
  sealWalls(divergence, 0, rows, cols);
  for (let step = 0; step < PRESSURE_STEPS; step++) {
    for (let j = 1; j < rows - 1; j++) {
      for (let i = 1; i < cols - 1; i++) {
        const k = i + j * cols;
        pressure[k] =
          (pressure[k - 1] + pressure[k + 1] + pressure[k - cols] + pressure[k + cols] - h2 * divergence[k]) * 0.25;
      }
    }
    sealWalls(pressure, 0, rows, cols);
  }
  for (let j = 1; j < rows - 1; j++) {
    for (let i = 1; i < cols - 1; i++) {
      const k = i + j * cols;
      flowX[k] -= (pressure[k + 1] - pressure[k - 1]) * (0.5 / cell);
      flowY[k] -= (pressure[k + cols] - pressure[k - cols]) * (0.5 / cell);
    }
  }
  sealWalls(flowX, 1, rows, cols);
  sealWalls(flowY, 2, rows, cols);
};
