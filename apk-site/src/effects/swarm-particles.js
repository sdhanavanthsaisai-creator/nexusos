import { MAX_PARTICLES, sampleGrid } from './swarm-grid';

/** Buckets particles into a coarse grid so neighbour repulsion stays cheap. */
export const pushCrowd = (ctx, n, h) => {
  const { view, px, py, crowd } = ctx;
  const gc = Math.max(1, Math.ceil(view.width / h) + 2);
  const gr = Math.max(1, Math.ceil(view.height / h) + 2);
  if (ctx.crowdHeads.length < gc * gr) ctx.crowdHeads = new Int32Array(gc * gr);
  const heads = ctx.crowdHeads;
  heads.fill(-1, 0, gc * gr);
  ctx.crowdRows = gr;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(px[i]) || !Number.isFinite(py[i])) {
      crowd[i] = -1;
      continue;
    }
    const cx = Math.min(gc - 1, Math.max(0, Math.floor(px[i] / h) + 1));
    const cy = Math.min(gr - 1, Math.max(0, Math.floor(py[i] / h) + 1));
    const key = cy * gc + cx;
    crowd[i] = heads[key];
    heads[key] = i;
  }
  return gc;
};

/** Advects every particle along the field, with neighbour repulsion and the hovered-target ring. */
export const moveParticles = (ctx, s, dt, ease) => {
  const { px, py, pz, vx, vy, vz, home, heft, bob, bobRate, crowd, view, anchor, ring, flowX, flowY, field, time, introClock } = ctx;
  const n = s.count;
  const radius = s.spread;
  const loose = 1 - 0.6 * s.tail;
  const gather = 12 * loose * (0.2 + 0.8 * ease);
  const pull = 30 * loose * (0.2 + 0.8 * ease);
  const band = Math.max(4, radius * 0.16);
  const w = view.width;
  const h = view.height;
  const gap = radius * Math.sqrt(Math.PI / Math.max(n, 1)) * 1.6;
  const repel = 4000;
  const gc = pushCrowd(ctx, n, gap);
  // Read the buckets only after the push, which may have reallocated them.
  const crowdHeads = ctx.crowdHeads;
  const crowdRows = ctx.crowdRows;
  for (let i = 0; i < n; i++) {
    const x = px[i];
    const y = py[i];
    const k = 10 * (1 - 0.6 * s.tail * heft[i]);
    let ax = (sampleGrid(flowX, x, y, ctx.cols, ctx.rows, ctx.cell) - vx[i]) * k;
    let ay = (sampleGrid(flowY, x, y, ctx.cols, ctx.rows, ctx.cell) - vy[i]) * k;
    const cx = Math.min(gc - 1, Math.max(0, Math.floor(x / gap) + 1));
    const cy = Math.min(crowdRows - 1, Math.max(0, Math.floor(y / gap) + 1));
    for (let oy = -1; oy <= 1; oy++) {
      const row = cy + oy;
      if (row < 0 || row >= crowdRows) continue;
      for (let ox = -1; ox <= 1; ox++) {
        const col = cx + ox;
        if (col < 0 || col >= gc) continue;
        for (let j = crowdHeads[row * gc + col]; j !== -1 && j >= 0; j = crowd[j]) {
          if (j === i) continue;
          const dx = x - px[j];
          const dy = y - py[j];
          const d2 = dx * dx + dy * dy;
          if (d2 >= gap * gap || d2 < 1e-6) continue;
          const d = Math.sqrt(d2);
          const q = 1 - d / gap;
          ax += (dx / d) * q * q * repel;
          ay += (dy / d) * q * q * repel;
        }
      }
    }
    if (ring.active) {
      ctx.sdf(x - ring.x, y - ring.y, ring.hx, ring.hy, ring.corner, field);
      const e = field[0] - (5 + band * home[i] * home[i]);
      const hold = e > 0 ? 70 : 140;
      ax -= field[1] * e * hold;
      ay -= field[2] * e * hold;
    } else {
      const dx = anchor.x - x;
      const dy = anchor.y - y;
      const d = Math.hypot(dx, dy) + 0.001;
      const over = Math.max(0, d - radius);
      ax += (dx / d) * (d * gather + over * pull);
      ay += (dy / d) * (d * gather + over * pull);
    }
    if (introClock >= 1) {
      if (x < 8) ax += (8 - x) * 30;
      else if (x > w - 8) ax -= (x - w + 8) * 30;
      if (y < 8) ay += (8 - y) * 30;
      else if (y > h - 8) ay -= (y - h + 8) * 30;
    }
    const lift = Math.sin(time * bobRate[i] + bob[i]) * radius * (ring.active ? 0.15 : 0.55);
    const az = (lift - pz[i]) * 36 - vz[i] * 9;
    vx[i] += ax * dt;
    vy[i] += ay * dt;
    vz[i] += az * dt;
    px[i] += vx[i] * dt;
    py[i] += vy[i] * dt;
    pz[i] += vz[i] * dt;
  }
};
