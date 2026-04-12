'use client'

import { useEffect, useRef, useState } from 'react'
import { Mesh, Program, Renderer, Triangle } from 'ogl'
import { cn } from '@/lib/utils'

const vertexShader = `#version 300 es
in vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentShader = `#version 300 es
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

out vec4 fragColor;

#define S(a, b, t) smoothstep(a, b, t)

mat2 Rot(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(2127.1, 81.17)), dot(p, vec2(1269.5, 283.37)));
  return fract(sin(p) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float n = mix(
    mix(dot(-1.0 + 2.0 * hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(-1.0 + 2.0 * hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(-1.0 + 2.0 * hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(-1.0 + 2.0 * hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );

  return 0.5 + 0.5 * n;
}

void mainImage(out vec4 outputColor, vec2 coord) {
  float t = iTime * uTimeSpeed;
  vec2 uv = coord / iResolution.xy;
  float ratio = iResolution.x / iResolution.y;
  vec2 transformedUv = uv - 0.5 + uCenterOffset;
  transformedUv /= max(uZoom, 0.001);

  float degree = noise(vec2(t * 0.1, transformedUv.x * transformedUv.y) * uNoiseScale);
  transformedUv.y *= 1.0 / ratio;
  transformedUv *= Rot(radians((degree - 0.5) * uRotationAmount + 180.0));
  transformedUv.y *= ratio;

  float amplitude = uWarpAmplitude / max(uWarpStrength, 0.001);
  float warpTime = t * uWarpSpeed;
  transformedUv.x += sin(transformedUv.y * uWarpFrequency + warpTime) / amplitude;
  transformedUv.y += sin(transformedUv.x * (uWarpFrequency * 1.5) + warpTime) / (amplitude * 0.5);

  float balance = uColorBalance;
  float softness = max(uBlendSoftness, 0.0);
  mat2 blendRotation = Rot(radians(uBlendAngle));
  float blendX = (transformedUv * blendRotation).x;
  float edge0 = -0.3 - balance - softness;
  float edge1 = 0.2 - balance + softness;
  float vertical0 = 0.5 - balance + softness;
  float vertical1 = -0.3 - balance - softness;

  vec3 layer1 = mix(uColor3, uColor2, S(edge0, edge1, blendX));
  vec3 layer2 = mix(uColor2, uColor1, S(edge0, edge1, blendX));
  vec3 color = mix(layer1, layer2, S(vertical0, vertical1, transformedUv.y));

  vec2 grainUv = uv * max(uGrainScale, 0.001);
  if (uGrainAnimated > 0.5) {
    grainUv += vec2(iTime * 0.05);
  }
  float grain = fract(sin(dot(grainUv, vec2(12.9898, 78.233))) * 43758.5453);
  color += (grain - 0.5) * uGrainAmount;

  color = (color - 0.5) * uContrast + 0.5;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, uSaturation);
  color = pow(max(color, 0.0), vec3(1.0 / max(uGamma, 0.001)));
  color = clamp(color, 0.0, 1.0);

  outputColor = vec4(color, 1.0);
}

void main() {
  vec4 outputColor = vec4(0.0);
  mainImage(outputColor, gl_FragCoord.xy);
  fragColor = outputColor;
}
`

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [1, 1, 1]

  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ]
}

function GrainientCanvas({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: Renderer | null = null

    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      })
    } catch {
      return
    }

    const gl = renderer.gl
    const canvas = gl.canvas as HTMLCanvasElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    container.appendChild(canvas)

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uTimeSpeed: { value: 0.2 },
        uColorBalance: { value: -0.02 },
        uWarpStrength: { value: 1.1 },
        uWarpFrequency: { value: 4.6 },
        uWarpSpeed: { value: 1.1 },
        uWarpAmplitude: { value: 58 },
        uBlendAngle: { value: -18 },
        uBlendSoftness: { value: 0.08 },
        uRotationAmount: { value: 440 },
        uNoiseScale: { value: 2.2 },
        uGrainAmount: { value: 0.08 },
        uGrainScale: { value: 2.0 },
        uGrainAnimated: { value: 0.0 },
        uContrast: { value: 1.3 },
        uGamma: { value: 1.0 },
        uSaturation: { value: 1.0 },
        uCenterOffset: { value: new Float32Array([0.0, -0.14]) },
        uZoom: { value: 0.92 },
        uColor1: { value: new Float32Array(hexToRgb('#6FA163')) },
        uColor2: { value: new Float32Array(hexToRgb('#C4903A')) },
        uColor3: { value: new Float32Array(hexToRgb('#08120F')) },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })

    const setSize = () => {
      const rect = container.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))

      renderer?.setSize(width, height)
      const resolution = program.uniforms.iResolution.value as Float32Array
      resolution[0] = gl.drawingBufferWidth
      resolution[1] = gl.drawingBufferHeight
    }

    const resizeObserver = new ResizeObserver(setSize)
    resizeObserver.observe(container)
    setSize()

    let frame = 0
    const start = performance.now()

    const animate = (now: number) => {
      program.uniforms.iTime.value = (now - start) * 0.001
      renderer?.render({ scene: mesh })
      frame = window.requestAnimationFrame(animate)
    }

    frame = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()

      try {
        container.removeChild(canvas)
      } catch {
        // Ignore removal failures during hot reload.
      }

      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return <div ref={containerRef} className={cn('relative h-full w-full overflow-hidden', className)} />
}

export function MarketingBackground({ className }: { className?: string }) {
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const hasWebgl2 = Boolean(document.createElement('canvas').getContext('webgl2'))
    const lowPower = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4

    const update = () => {
      setShouldAnimate(hasWebgl2 && !lowPower && !motionQuery.matches)
    }

    update()
    motionQuery.addEventListener('change', update)

    return () => {
      motionQuery.removeEventListener('change', update)
    }
  }, [])

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(196,144,58,0.34),transparent_24%),radial-gradient(circle_at_78%_18%,rgba(76,175,80,0.24),transparent_24%),linear-gradient(180deg,#07110f_0%,#0d1714_44%,#11231d_100%)]" />
      {shouldAnimate ? <GrainientCanvas className="absolute inset-0 opacity-70" /> : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,rgba(6,12,11,0.1)_0%,rgba(6,12,11,0.58)_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.12] mix-blend-soft-light"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 0.6px, transparent 0.7px)',
          backgroundSize: '4px 4px',
        }}
      />
    </div>
  )
}
