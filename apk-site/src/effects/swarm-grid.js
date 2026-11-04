export const MAX_PARTICLES = 2000;
export const CELL = 16;
export const MAX_COLS = 72;
export const MAX_ROWS = 48;
export const PRESSURE_STEPS = 12;

export const random = seed => {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
};

/** Signed distance to a rounded rect plus the pushing normal, written into `out`. */
export const rectField = (x, y, hx, hy, r, out) => {
  const sx = x < 0 ? -1 : 1;
  const sy = y < 0 ? -1 : 1;
  const qx = Math.abs(x) - (hx - r);
  const qy = Math.abs(y) - (hy - r);
  if (qx > 0 && qy > 0) {
    const l = Math.hypot(qx, qy) || 1;
    out[0] = l - r;
    out[1] = (qx / l) * sx;
    out[2] = (qy / l) * sy;
  } else if (qx > qy) {
    out[0] = qx - r;
    out[1] = sx;
    out[2] = 0;
  } else {
    out[0] = qy - r;
    out[1] = 0;
    out[2] = sy;
  }
  return out;
};

/** Sizes the velocity grid to the container, reallocating only when the cell count changes. */
export const allocateGrid = ctx => {
  const nextCols = Math.min(MAX_COLS, Math.max(8, Math.round(ctx.view.width / CELL)));
  const nextRows = Math.min(MAX_ROWS, Math.max(8, Math.round(ctx.view.height / CELL)));
  ctx.cell = Math.max(ctx.view.width / nextCols, ctx.view.height / nextRows);
  if (nextCols === ctx.cols && nextRows === ctx.rows) return;
  ctx.cols = nextCols;
  ctx.rows = nextRows;
  const total = ctx.cols * ctx.rows;
  ctx.flowX = new Float32Array(total);
  ctx.flowY = new Float32Array(total);
  ctx.lastX = new Float32Array(total);
  ctx.lastY = new Float32Array(total);
  ctx.pressure = new Float32Array(total);
  ctx.divergence = new Float32Array(total);
  ctx.curl = new Float32Array(total);
};

export const sampleGrid = (values, x, y, cols, rows, cell) => {
  let gx = x / cell - 0.5;
  let gy = y / cell - 0.5;
  if (gx < 0) gx = 0;
  else if (gx > cols - 1.001) gx = cols - 1.001;
  if (gy < 0) gy = 0;
  else if (gy > rows - 1.001) gy = rows - 1.001;
  const i = gx | 0;
  const j = gy | 0;
  const fx = gx - i;
  const fy = gy - j;
  const k = i + j * cols;
  return (
    (values[k] * (1 - fx) + values[k + 1] * fx) * (1 - fy) +
    (values[k + cols] * (1 - fx) + values[k + cols + 1] * fx) * fy
  );
};

/** Reflects the velocity field at the edges so the swarm never leaks out of the box. */
export const sealWalls = (values, axis, rows, cols) => {
  for (let j = 1; j < rows - 1; j++) {
    const left = j * cols;
    const right = left + cols - 1;
    values[left] = axis === 1 ? -values[left + 1] : values[left + 1];
    values[right] = axis === 1 ? -values[right - 1] : values[right - 1];
  }
  for (let i = 1; i < cols - 1; i++) {
    const bottom = i + (rows - 1) * cols;
    values[i] = axis === 2 ? -values[i + cols] : values[i + cols];
    values[bottom] = axis === 2 ? -values[bottom - cols] : values[bottom - cols];
  }
  values[0] = 0.5 * (values[1] + values[cols]);
  values[cols - 1] = 0.5 * (values[cols - 2] + values[2 * cols - 1]);
  values[(rows - 1) * cols] = 0.5 * (values[(rows - 2) * cols] + values[(rows - 1) * cols + 1]);
  values[rows * cols - 1] = 0.5 * (values[rows * cols - 2] + values[(rows - 1) * cols - 1]);
};
