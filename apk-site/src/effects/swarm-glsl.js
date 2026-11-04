export const SHAPES = { dot: 0, square: 1, streak: 2 };

export const VERTEX = `#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aAgent;
layout(location = 2) in vec4 aLook;
layout(location = 3) in vec2 aExtra;
uniform vec2 uView;
out vec2 vLocal;
out vec2 vHalf;
out float vAlpha;
out float vTint;
out float vSoft;
out float vShape;

void main() {
  vec2 dir = aAgent.zw;
  vec2 side = vec2(-dir.y, dir.x);
  vec2 extent = aLook.xy * 0.5;
  vec2 pad = extent + 1.0 + aExtra.x * 1.5;
  vec2 local = aCorner * pad;
  vec2 center = aAgent.xy - dir * (extent.x - extent.y);
  vec2 pos = center + dir * local.x + side * local.y;
  vLocal = local;
  vHalf = extent;
  vAlpha = aLook.z;
  vTint = aLook.w;
  vSoft = aExtra.x;
  vShape = aExtra.y;
  vec2 clip = pos / uView * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

export const FRAGMENT = `#version 300 es
precision highp float;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uRatio;
in vec2 vLocal;
in vec2 vHalf;
in float vAlpha;
in float vTint;
in float vSoft;
in float vShape;
out vec4 outColor;

void main() {
  float d;
  if (vShape > 0.5 && vShape < 1.5) {
    float corner = vHalf.y * 0.3;
    vec2 q = abs(vLocal) - vHalf + corner;
    d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - corner;
  } else {
    vec2 q = vLocal;
    q.x = max(abs(q.x) - (vHalf.x - vHalf.y), 0.0);
    d = length(q) - vHalf.y;
  }
  float edge = 0.6 / uRatio + vSoft;
  float cover = 1.0 - smoothstep(-edge, edge, d);
  float stretch = clamp(1.0 - vHalf.y / max(vHalf.x, 0.001), 0.0, 1.0);
  float head = clamp((vLocal.x + vHalf.x) / max(2.0 * vHalf.x, 0.001), 0.0, 1.0);
  cover *= mix(1.0, 0.12 + 0.88 * head * head, stretch);
  float alpha = cover * vAlpha;
  outColor = vec4(mix(uColor, uAccent, vTint) * alpha, alpha);
}`;
