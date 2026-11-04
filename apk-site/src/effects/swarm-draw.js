/** Builds the instanced attribute buffers and issues the single draw call. */
export const drawSwarm = (ctx, s) => {
  const {
    gl,
    canvas,
    shader,
    vao,
    agentBuffer,
    lookBuffer,
    extraBuffer,
    agentData,
    lookData,
    extraData,
    px,
    py,
    pz,
    vx,
    vy,
    order,
    burst,
    ping,
    pointer,
    introClock,
    presence,
    time,
    parse
  } = ctx;
  const n = s.count;
  const fade = introClock * introClock * (3 - 2 * introClock) * presence;
  const zr = Math.max(s.spread * 0.55, 10);
  if (ctx.sorted !== n) {
    for (let a = 0; a < n; a++) order[a] = a;
    ctx.sorted = n;
  }
  for (let a = 1; a < n; a++) {
    const value = order[a];
    const key = pz[value];
    let b = a - 1;
    while (b >= 0 && pz[order[b]] > key) {
      order[b + 1] = order[b];
      b--;
    }
    order[b + 1] = value;
  }
  const flash = burst.age < 1.2 ? Math.exp(-burst.age / 0.3) : 0;
  const front = ping.age * 520;
  let written = 0;
  for (let a = 0; a < n; a++) {
    const i = order[a];
    const near = Math.min(1, Math.max(-1, pz[i] / zr));
    const scale = 1 + s.depth * 0.6 * near;
    const body = s.size * ctx.grain[i] * scale;
    const soft = s.depth * s.size * (s.lightMode ? 0.35 : 1.4) * Math.pow(Math.abs(near), 1.6);
    const flat = Math.hypot(vx[i], vy[i]);
    const dx = flat > 0.001 ? vx[i] / flat : 1;
    const dy = flat > 0.001 ? vy[i] / flat : 0;
    let wave = 0;
    if (ping.age < 1.6) {
      const offset = (Math.hypot(px[i] - ping.x, py[i] - ping.y) - front) / 40;
      wave = Math.exp(-offset * offset) * (1 - ping.age / 1.6);
    }
    const tint = Math.max(Math.min(1, Math.max(0, (flat - 380) / 900)), flash, wave);
    const width = body * (1 + wave * 0.8);
    let length = width + Math.min((flat * s.trail * 0.02), body * 14);
    if (s.shape === 2) length = width * 2.6 + Math.min((flat * s.trail * 0.03), body * 18);
    const twinkle = 0.86 + 0.14 * Math.sin(time * 3.1 + ctx.glint[i]);
    const dim = 1 - s.depth * 0.45 * Math.max(0, -near);
    const o = written * 4;
    agentData[o] = px[i];
    agentData[o + 1] = py[i];
    agentData[o + 2] = dx;
    agentData[o + 3] = dy;
    lookData[o] = length;
    lookData[o + 1] = width;
    lookData[o + 2] = Math.min(1, Math.max(0, 0.95 * dim * (body / (body + soft)) * twinkle * (1 + wave * 0.4))) * fade;
    lookData[o + 3] = tint;
    extraData[written * 2] = soft;
    extraData[written * 2 + 1] = s.shape;
    written++;
  }
  if (s.hideCursor && pointer.inside) {
    const o = written * 4;
    agentData[o] = pointer.x;
    agentData[o + 1] = pointer.y;
    agentData[o + 2] = 1;
    agentData[o + 3] = 0;
    lookData[o] = 6;
    lookData[o + 1] = 6;
    lookData[o + 2] = 1;
    lookData[o + 3] = 0;
    extraData[written * 2] = 0;
    extraData[written * 2 + 1] = 0;
    written++;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (!s.enabled || !written) return;
  gl.useProgram(shader.program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, agentBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, agentData, 0, written * 4);
  gl.bindBuffer(gl.ARRAY_BUFFER, lookBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, lookData, 0, written * 4);
  gl.bindBuffer(gl.ARRAY_BUFFER, extraBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, extraData, 0, written * 2);
  gl.uniform2f(shader.uniforms.uView, ctx.view.width, ctx.view.height);
  gl.uniform3fv(shader.uniforms.uColor, parse(s.color));
  gl.uniform3fv(shader.uniforms.uAccent, parse(s.accentColor));
  gl.uniform1f(shader.uniforms.uRatio, ctx.view.ratio);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, written);
  gl.bindVertexArray(null);
};
