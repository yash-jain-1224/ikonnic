"use client";

import { Suspense, useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Text } from "@react-three/drei";
import * as THREE from "three";
import { X, RotateCcw, Maximize2 } from "lucide-react";

/* ---------- Acrylic Slab Mesh ---------- */

function getPreviewDimensions(previewType = "acrylic-slab", orientation = "portrait", shape = "rectangle") {
  const squareShapes = ["circle", "heart", "diamond", "triangle", "hexagon", "octagon", "penta"];
  if (previewType === "clock" || orientation === "square" || squareShapes.includes(shape)) return { width: 2.9, height: 2.9 };
  if (previewType === "album" || orientation === "landscape") return { width: 3.4, height: 2.35 };
  if (shape === "oval" || shape === "door" || shape === "house") return { width: 2.25, height: 3.1 };
  if (previewType === "keychain" || previewType === "tag") return { width: 2.15, height: 2.85 };
  if (previewType === "nameplate" || previewType === "monogram") return { width: 3.6, height: 1.5 };
  return { width: 2.4, height: 3.2 };
}

function buildPreviewShape(shape: string, width: number, height: number) {
  const w = width / 2;
  const h = height / 2;
  const previewShape = new THREE.Shape();

  if (shape === "heart") {
    previewShape.moveTo(0, -h * 0.55);
    previewShape.bezierCurveTo(-w, -h * 0.05, -w * 0.86, h * 0.88, 0, h * 0.42);
    previewShape.bezierCurveTo(w * 0.86, h * 0.88, w, -h * 0.05, 0, -h * 0.55);
    return previewShape;
  }

  if (shape === "leaf") {
    previewShape.moveTo(0, -h);
    previewShape.bezierCurveTo(-w * 0.95, -h * 0.42, -w * 0.72, h * 0.64, 0, h);
    previewShape.bezierCurveTo(w * 0.72, h * 0.64, w * 0.95, -h * 0.42, 0, -h);
    return previewShape;
  }

  if (shape === "diamond") {
    previewShape.moveTo(0, h);
    previewShape.lineTo(w, 0);
    previewShape.lineTo(0, -h);
    previewShape.lineTo(-w, 0);
    previewShape.closePath();
    return previewShape;
  }

  if (shape === "triangle") {
    previewShape.moveTo(0, h);
    previewShape.lineTo(w, -h * 0.88);
    previewShape.lineTo(-w, -h * 0.88);
    previewShape.closePath();
    return previewShape;
  }

  if (["hexagon", "octagon", "penta"].includes(shape)) {
    const sides = shape === "hexagon" ? 6 : shape === "octagon" ? 8 : 5;
    const rotation = shape === "penta" ? Math.PI / 2 : Math.PI / sides;
    for (let index = 0; index < sides; index += 1) {
      const angle = (Math.PI * 2 * index) / sides + rotation;
      const x = Math.cos(angle) * w;
      const y = Math.sin(angle) * h;
      if (index === 0) previewShape.moveTo(x, y);
      else previewShape.lineTo(x, y);
    }
    previewShape.closePath();
    return previewShape;
  }

  if (shape === "oval") {
    previewShape.absellipse(0, 0, w * 0.9, h, 0, Math.PI * 2, false, 0);
    return previewShape;
  }

  if (shape === "door") {
    previewShape.moveTo(-w * 0.72, -h);
    previewShape.lineTo(-w * 0.72, h * 0.24);
    previewShape.bezierCurveTo(-w * 0.52, h * 0.86, w * 0.52, h * 0.86, w * 0.72, h * 0.24);
    previewShape.lineTo(w * 0.72, -h);
    previewShape.closePath();
    return previewShape;
  }

  if (shape === "house") {
    previewShape.moveTo(-w * 0.78, -h);
    previewShape.lineTo(-w * 0.78, h * 0.16);
    previewShape.lineTo(0, h);
    previewShape.lineTo(w * 0.78, h * 0.16);
    previewShape.lineTo(w * 0.78, -h);
    previewShape.closePath();
    return previewShape;
  }

  if (shape === "rounded-rectangle") {
    const radius = Math.min(w, h) * 0.38;
    previewShape.moveTo(-w + radius, -h);
    previewShape.lineTo(w - radius, -h);
    previewShape.quadraticCurveTo(w, -h, w, -h + radius);
    previewShape.lineTo(w, h - radius);
    previewShape.quadraticCurveTo(w, h, w - radius, h);
    previewShape.lineTo(-w + radius, h);
    previewShape.quadraticCurveTo(-w, h, -w, h - radius);
    previewShape.lineTo(-w, -h + radius);
    previewShape.quadraticCurveTo(-w, -h, -w + radius, -h);
    return previewShape;
  }

  previewShape.moveTo(-w * 0.66, -h * 0.86);
  previewShape.bezierCurveTo(-w * 1.03, -h * 0.46, -w * 0.98, h * 0.34, -w * 0.28, h * 0.82);
  previewShape.bezierCurveTo(w * 0.44, h * 1.18, w * 0.96, h * 0.56, w * 0.78, -h * 0.08);
  previewShape.bezierCurveTo(w * 0.62, -h * 0.66, w * 0.1, -h * 0.9, -w * 0.66, -h * 0.86);
  return previewShape;
}

function SelectPhotoMarker({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      <mesh rotation={[0, 0, 0.06]}>
        <boxGeometry args={[0.58, 0.5, 0.035]} />
        <meshStandardMaterial color="#d90000" roughness={0.34} />
      </mesh>
      <Text position={[0, 0.01, 0.03]} rotation={[0, 0, 0.06]} fontSize={0.11} lineHeight={0.86} anchorX="center" anchorY="middle" color="#ffffff">
        SELECT{"\n"}PHOTO
      </Text>
    </group>
  );
}

function findVisibleImageBounds(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4;
      if (pixels[index + 3] > 18) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  const padding = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
  const x = Math.max(0, minX - padding);
  const y = Math.max(0, minY - padding);
  return {
    x,
    y,
    width: Math.min(canvas.width - x, maxX - minX + 1 + padding * 2),
    height: Math.min(canvas.height - y, maxY - minY + 1 + padding * 2),
  };
}

function createFittedPhotoTexture(photoUrl: string, width: number, height: number) {
  return new Promise<THREE.Texture>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const productAspect = Math.max(width / Math.max(height, 0.01), 0.1);
      const longSide = 1200;
      const canvas = document.createElement("canvas");
      canvas.width = productAspect >= 1 ? longSide : Math.round(longSide * productAspect);
      canvas.height = productAspect >= 1 ? Math.round(longSide / productAspect) : longSide;

      const context = canvas.getContext("2d");
      if (!context || !image.naturalWidth || !image.naturalHeight) {
        reject(new Error("Could not prepare preview texture"));
        return;
      }

      context.fillStyle = "#eeeeef";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const sourceBounds = findVisibleImageBounds(image) ?? {
        x: 0,
        y: 0,
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      const imageAspect = sourceBounds.width / sourceBounds.height;
      const canvasAspect = canvas.width / canvas.height;
      const drawWidth = imageAspect > canvasAspect ? canvas.height * imageAspect : canvas.width;
      const drawHeight = imageAspect > canvasAspect ? canvas.height : canvas.width / imageAspect;
      const drawX = (canvas.width - drawWidth) / 2;
      const drawY = (canvas.height - drawHeight) / 2;
      context.drawImage(
        image,
        sourceBounds.x,
        sourceBounds.y,
        sourceBounds.width,
        sourceBounds.height,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
      );

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;
      resolve(texture);
    };
    image.onerror = () => reject(new Error("Could not load preview photo"));
    image.src = photoUrl;
  });
}

function AcrylicSlab({
  photoUrl,
  thicknessMm,
  borderColor,
  textOverlay,
  previewType = "acrylic-slab",
  orientation = "portrait",
  shape = "rectangle",
}: {
  photoUrl: string;
  thicknessMm: number;
  borderColor: string;
  textOverlay?: string;
  previewType?: string;
  orientation?: string;
  shape?: string;
}) {
  const meshRef = useRef<THREE.Mesh | THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  const dimensions = useMemo(() => getPreviewDimensions(previewType, orientation, shape), [orientation, previewType, shape]);
  const { width, height } = dimensions;
  // Scale thickness: 3mm → 0.06, 5mm → 0.10, 8mm → 0.16
  const depth = (thicknessMm / 50);

  // Load a fitted photo texture so uploaded subjects fill the acrylic face.
  useEffect(() => {
    if (!photoUrl) {
      setTexture(null);
      return;
    }
    let cancelled = false;
    let createdTexture: THREE.Texture | null = null;
    createFittedPhotoTexture(photoUrl, width, height)
      .then((nextTexture) => {
        if (cancelled) {
          nextTexture.dispose();
          return;
        }
        createdTexture = nextTexture;
        setTexture(nextTexture);
      })
      .catch(() => {
        if (!cancelled) setTexture(null);
      });

    return () => {
      cancelled = true;
      createdTexture?.dispose();
    };
  }, [height, photoUrl, width]);

  // Gentle idle float
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.05;
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.8) * 0.02;
    }
  });

  // Front face material (photo)
  const frontMaterial = useMemo(() => {
    if (texture) {
      return new THREE.MeshPhysicalMaterial({
        map: texture,
        roughness: 0.08,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        reflectivity: 0.9,
        envMapIntensity: 0.6,
      });
    }
    return new THREE.MeshPhysicalMaterial({
      color: "#e8e8ea",
      roughness: 0.1,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.7,
    });
  }, [texture]);

  // Acrylic edge/back material
  const acrylicMaterial = useMemo(() => {
    const edgeColor = borderColor === "black" ? "#111111" : "#f0f2f5";
    return new THREE.MeshPhysicalMaterial({
      color: edgeColor,
      roughness: 0.12,
      metalness: 0.02,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.92,
      transmission: 0.15,
      thickness: 0.5,
      ior: 1.49, // Acrylic IOR
    });
  }, [borderColor]);

  // Build materials array: [right, left, top, bottom, front, back]
  const materials = useMemo(
    () => [acrylicMaterial, acrylicMaterial, acrylicMaterial, acrylicMaterial, frontMaterial, acrylicMaterial],
    [acrylicMaterial, frontMaterial]
  );
  const faceMaterials = useMemo(() => [frontMaterial, acrylicMaterial], [acrylicMaterial, frontMaterial]);
  const previewShape = useMemo(() => buildPreviewShape(shape, width, height), [height, shape, width]);
  const isCustomShape = ["custom", "heart", "leaf", "rounded-rectangle", "diamond", "triangle", "hexagon", "octagon", "penta", "oval", "door", "house", "bean", "balloon", "cloud"].includes(shape);

  if (previewType === "clock" || shape === "circle") {
    return (
      <group ref={meshRef}>
        <mesh castShadow receiveShadow material={materials} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[width / 2, width / 2, depth, 96]} />
        </mesh>
        {!texture ? <SelectPhotoMarker z={depth / 2 + 0.04} /> : null}
        {previewType === "clock" ? (
          <group position={[0, 0, depth / 2 + 0.02]}>
            <mesh rotation={[0, 0, -0.45]}>
              <boxGeometry args={[0.035, height * 0.36, 0.012]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
            <mesh rotation={[0, 0, 1.15]}>
              <boxGeometry args={[0.026, height * 0.27, 0.012]} />
              <meshStandardMaterial color="#d90000" />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.055, 24, 24]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
          </group>
        ) : null}
      </group>
    );
  }

  if (isCustomShape) {
    return (
      <group ref={meshRef}>
        <mesh castShadow receiveShadow material={faceMaterials}>
          <extrudeGeometry args={[previewShape, { depth, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 12 }]} />
        </mesh>
        {!texture ? <SelectPhotoMarker z={depth + 0.08} /> : null}
      </group>
    );
  }

  return (
    <group ref={meshRef}>
      <mesh castShadow receiveShadow material={materials}>
        <boxGeometry args={[width, height, depth]} />
      </mesh>
      {!texture ? <SelectPhotoMarker z={depth / 2 + 0.05} /> : null}
    </group>
  );
}

/* ---------- Scene Lighting ---------- */

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} color="#cce0ff" />
      <pointLight position={[0, 3, 5]} intensity={0.5} color="#fff5ee" />
    </>
  );
}

/* ---------- Camera Auto-fit ---------- */

function CameraSetup({
  previewType,
  orientation,
  shape,
}: {
  previewType?: string;
  orientation?: string;
  shape?: string;
}) {
  const { camera, size } = useThree();
  useEffect(() => {
    const { width, height } = getPreviewDimensions(previewType, orientation, shape);
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const verticalFov = THREE.MathUtils.degToRad(perspectiveCamera.fov);
    const aspect = Math.max(size.width / Math.max(size.height, 1), 0.8);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const customShapePadding = ["custom", "heart", "leaf", "rounded-rectangle", "diamond", "triangle", "hexagon", "octagon", "penta", "oval", "door", "house", "bean", "balloon", "cloud"].includes(shape ?? "") ? 1.2 : 1;
    const heightDistance = (height * customShapePadding) / (2 * Math.tan(verticalFov / 2) * 0.72);
    const widthDistance = (width * customShapePadding) / (2 * Math.tan(horizontalFov / 2) * 0.78);
    const distance = Math.max(heightDistance, widthDistance, size.width < 480 ? 5.25 : size.width < 768 ? 5.55 : 5.8);
    camera.position.set(0, 0.05, distance);
    camera.lookAt(0, 0.05, 0);
  }, [camera, orientation, previewType, shape, size.height, size.width]);
  return null;
}

/* ---------- Loading Placeholder ---------- */

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[2.4, 3.2, 0.06]} />
      <meshStandardMaterial color="#ddd" transparent opacity={0.5} />
    </mesh>
  );
}

/* ---------- Main 3D Preview Component ---------- */

export function ThreeDPreview({
  photoUrl,
  thicknessMm = 3,
  borderColor = "light-blue",
  textOverlay,
  previewType = "acrylic-slab",
  orientation = "portrait",
  shape = "rectangle",
  mode = "modal",
  onClose,
}: {
  photoUrl: string;
  thicknessMm?: number;
  borderColor?: string;
  textOverlay?: string;
  previewType?: string;
  orientation?: string;
  shape?: string;
  mode?: "modal" | "inline";
  onClose?: () => void;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const content = (
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden bg-gradient-to-b from-[#1a1d27] to-[#0f1117] shadow-2xl ${
          mode === "inline" ? "min-h-[316px] rounded-[14px] sm:min-h-[380px] lg:min-h-[430px]" : "max-h-[calc(100vh-48px)] max-w-[920px] rounded-[8px]"
        } ${
          isFullscreen ? "h-screen max-w-none rounded-none" : ""
        }`}
      >
        {/* Header */}
        <div className={`flex flex-wrap items-center justify-between gap-3 ${
          mode === "inline" ? "px-3 pt-3 sm:px-5 sm:pt-4" : "border-b border-rosegold-200/60 bg-white px-4 py-3"
        }`}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-[#d90000] shadow-[0_0_8px_rgba(217,0,0,0.5)]" />
            <h2 className={`text-lg font-black ${mode === "inline" ? "text-white" : "text-[#07142f]"}`}>3D Preview</h2>
            <span className={`hidden rounded-full px-2.5 py-0.5 text-[11px] font-bold sm:inline-flex ${
              mode === "inline" ? "bg-white/10 text-white/70" : "bg-rosegold-100 text-slate-600"
            }`}>
              {previewType} / {thicknessMm}mm / {borderColor === "black" ? "Black" : "Light Blue"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`grid size-8 place-items-center rounded-lg transition ${
                mode === "inline" ? "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white" : "bg-rosegold-100 text-slate-600 hover:bg-slate-200 hover:text-[#07142f]"
              }`}
              aria-label="Fullscreen"
            >
              <Maximize2 size={14} />
            </button>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className={`grid size-8 place-items-center rounded-lg transition ${
                  mode === "inline" ? "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white" : "bg-rosegold-100 text-slate-600 hover:bg-slate-200 hover:text-[#07142f]"
                }`}
                aria-label="Close 3D Preview"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Canvas */}
        <div className={`${isFullscreen ? "h-[calc(100vh-110px)]" : mode === "inline" ? "h-[250px] px-2 pb-2 pt-2 sm:h-[320px] sm:px-3 md:h-[360px] lg:h-[390px]" : "h-[min(504px,calc(100vh-112px))]"} [&_canvas]:!h-full [&_canvas]:!w-full w-full`}>
          <Canvas
            shadows
            dpr={[1, 2]}
            className="h-full w-full"
            style={{ width: "100%", height: "100%" }}
            onCreated={({ gl, scene }) => {
              gl.setClearColor("#10131b", 1);
              scene.background = new THREE.Color("#10131b");
            }}
            gl={{
              antialias: true,
              preserveDrawingBuffer: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.1,
            }}
            camera={{ fov: 35, near: 0.1, far: 100 }}
          >
            <CameraSetup previewType={previewType} orientation={orientation} shape={shape} />
            <SceneLighting />
            <Suspense fallback={<LoadingFallback />}>
              <AcrylicSlab
                photoUrl={photoUrl}
                thicknessMm={thicknessMm}
                borderColor={borderColor}
                textOverlay={textOverlay}
                previewType={previewType}
                orientation={orientation}
                shape={shape}
              />
              <Environment preset="city" />
              <ContactShadows
                position={[0, -1.7, 0]}
                opacity={0.4}
                scale={8}
                blur={2.5}
                far={4}
              />
            </Suspense>
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI - Math.PI / 6}
              minDistance={3}
              maxDistance={8}
              autoRotate={false}
              dampingFactor={0.08}
              enableDamping
            />
          </Canvas>
        </div>

        {/* Footer hint */}
        {mode === "inline" ? (
        <div className="hidden items-center justify-center gap-3 pb-4 sm:flex">
          <RotateCcw size={14} className="text-white/40" />
          <p className="text-center text-[12px] font-semibold text-white/40">
            Click & drag to rotate
          </p>
        </div>
        ) : null}
      </div>
  );

  if (mode === "inline") return content;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="3D Product Preview"
    >
      {content}
    </div>
  );
}
