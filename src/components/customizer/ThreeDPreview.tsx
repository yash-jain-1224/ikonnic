"use client";

import { Suspense, useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Text,
} from "@react-three/drei";
import * as THREE from "three";
import { X, RotateCcw, Maximize2 } from "lucide-react";

/* ---------- Acrylic Slab Mesh ---------- */

function getPreviewDimensions(
  previewType = "acrylic-slab",
  orientation = "portrait",
  shape = "rectangle",
) {
  const squareShapes = [
    "circle",
    "heart",
    "diamond",
    "triangle",
    "hexagon",
    "octagon",
    "penta",
  ];
  if (
    previewType === "clock" ||
    orientation === "square" ||
    squareShapes.includes(shape)
  )
    return { width: 2.9, height: 2.9 };
  if (previewType === "album" || orientation === "landscape")
    return { width: 3.4, height: 2.35 };
  if (shape === "oval" || shape === "door" || shape === "house")
    return { width: 2.25, height: 3.1 };
  if (previewType === "keychain" || previewType === "tag")
    return { width: 2.15, height: 2.85 };
  if (previewType === "nameplate" || previewType === "monogram")
    return { width: 3.6, height: 1.5 };
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
    previewShape.bezierCurveTo(
      -w * 0.52,
      h * 0.86,
      w * 0.52,
      h * 0.86,
      w * 0.72,
      h * 0.24,
    );
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
  previewShape.bezierCurveTo(
    -w * 1.03,
    -h * 0.46,
    -w * 0.98,
    h * 0.34,
    -w * 0.28,
    h * 0.82,
  );
  previewShape.bezierCurveTo(
    w * 0.44,
    h * 1.18,
    w * 0.96,
    h * 0.56,
    w * 0.78,
    -h * 0.08,
  );
  previewShape.bezierCurveTo(
    w * 0.62,
    -h * 0.66,
    w * 0.1,
    -h * 0.9,
    -w * 0.66,
    -h * 0.86,
  );
  return previewShape;
}

function SelectPhotoMarker({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      <mesh rotation={[0, 0, 0.06]}>
        <boxGeometry args={[0.58, 0.5, 0.035]} />
        <meshStandardMaterial color="#b76e79" roughness={0.34} />
      </mesh>
      <Text
        position={[0, 0.01, 0.03]}
        rotation={[0, 0, 0.06]}
        fontSize={0.11}
        lineHeight={0.86}
        anchorX="center"
        anchorY="middle"
        color="#ffffff"
      >
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

function createFittedPhotoTexture(
  photoUrl: string,
  width: number,
  height: number,
) {
  return new Promise<THREE.Texture>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const productAspect = Math.max(width / Math.max(height, 0.01), 0.1);
      const longSide = 1200;
      const canvas = document.createElement("canvas");
      canvas.width =
        productAspect >= 1 ? longSide : Math.round(longSide * productAspect);
      canvas.height =
        productAspect >= 1 ? Math.round(longSide / productAspect) : longSide;

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
      const drawWidth =
        imageAspect > canvasAspect ? canvas.height * imageAspect : canvas.width;
      const drawHeight =
        imageAspect > canvasAspect ? canvas.height : canvas.width / imageAspect;
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

function loadPreviewImage(photoUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load preview photo"));
    image.src = photoUrl;
  });
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  position = { x: 0, y: 0 },
  scale = 1,
) {
  const sourceBounds = {
    x: 0,
    y: 0,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
  const sourceAspect = sourceBounds.width / sourceBounds.height;
  const targetAspect = width / height;
  const drawWidth =
    (sourceAspect > targetAspect ? height * sourceAspect : width) * scale;
  const drawHeight =
    (sourceAspect > targetAspect ? height : width / sourceAspect) * scale;
  const overflowX = Math.max(0, drawWidth - width);
  const overflowY = Math.max(0, drawHeight - height);

  context.drawImage(
    image,
    sourceBounds.x,
    sourceBounds.y,
    sourceBounds.width,
    sourceBounds.height,
    x + (width - drawWidth) / 2 - (position.x / 50) * (overflowX / 2),
    y + (height - drawHeight) / 2 - (position.y / 50) * (overflowY / 2),
    drawWidth,
    drawHeight,
  );
}

function createCollagePhotoTexture(
  photoUrls: string[],
  photoTransforms:
    Array<{ position: { x: number; y: number }; scale: number }> | undefined,
  width: number,
  height: number,
  backgroundUrl?: string,
  collageLayout: "four-photo-clock" | "grid" = "grid",
) {
  const loadOptionalImage = (url?: string) =>
    url
      ? loadPreviewImage(url).catch(() => null)
      : Promise.resolve<HTMLImageElement | null>(null);
  const isFourPhotoClock = collageLayout === "four-photo-clock";

  return Promise.all([
    loadOptionalImage(isFourPhotoClock ? undefined : backgroundUrl),
    ...photoUrls.map((url) => loadOptionalImage(url)),
  ]).then(([backgroundImage, ...photos]) => {
    const productAspect = Math.max(width / Math.max(height, 0.01), 0.1);
    const longSide = 1200;
    const canvas = document.createElement("canvas");
    canvas.width =
      productAspect >= 1 ? longSide : Math.round(longSide * productAspect);
    canvas.height =
      productAspect >= 1 ? Math.round(longSide / productAspect) : longSide;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare collage preview texture");

    const count = Math.max(photoUrls.length, 1);
    context.fillStyle = "#eeeeef";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (isFourPhotoClock) {
      context.fillStyle = "#ffffff";
      context.fillRect(
        canvas.width / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
      );
      context.fillStyle = "#fffaf8";
      context.fillRect(
        0,
        canvas.height / 2,
        canvas.width / 2,
        canvas.height / 2,
      );
      context.fillStyle = "#f4f1f1";
      context.fillRect(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2,
        canvas.height / 2,
      );
    } else if (backgroundImage) {
      drawImageCover(
        context,
        backgroundImage,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }

    const columns = count <= 2 ? count : count <= 6 ? 3 : 4;
    const rows = Math.ceil(count / Math.max(columns, 1));
    const gap = canvas.width * 0.014;
    const marginX = canvas.width * 0.12;
    const marginY = canvas.height * 0.12;
    const genericWidth =
      (canvas.width - marginX * 2 - gap * Math.max(columns - 1, 0)) /
      Math.max(columns, 1);
    const genericHeight =
      (canvas.height - marginY * 2 - gap * Math.max(rows - 1, 0)) /
      Math.max(rows, 1);

    photos.forEach((photo, index) => {
      if (!photo && !isFourPhotoClock) return;
      const x = isFourPhotoClock
        ? canvas.width * (index % 2 === 0 ? 0.09 : 0.59)
        : marginX + (index % columns) * (genericWidth + gap);
      const y = isFourPhotoClock
        ? canvas.height * (index < 2 ? 0.12 : 0.6)
        : marginY + Math.floor(index / columns) * (genericHeight + gap);
      const slotWidth = isFourPhotoClock ? canvas.width * 0.32 : genericWidth;
      const slotHeight = isFourPhotoClock
        ? canvas.height * 0.32
        : genericHeight;
      const radius = Math.min(slotWidth, slotHeight) * 0.18;

      context.save();
      context.beginPath();
      context.roundRect(x, y, slotWidth, slotHeight, radius);
      context.clip();
      if (photo) {
        const transform = photoTransforms?.[index];
        drawImageCover(
          context,
          photo,
          x,
          y,
          slotWidth,
          slotHeight,
          transform?.position,
          transform?.scale,
        );
      } else {
        context.fillStyle = "#b76e79";
        context.fillRect(x, y, slotWidth, slotHeight);
      }
      context.restore();
      context.strokeStyle = "rgba(255, 255, 255, 0.95)";
      context.lineWidth = Math.max(3, canvas.width * 0.004);
      context.beginPath();
      context.roundRect(x, y, slotWidth, slotHeight, radius);
      context.stroke();

      if (!photo && isFourPhotoClock) {
        context.fillStyle = "#ffffff";
        context.font = `900 ${Math.round(canvas.width * 0.052)}px Arial, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("SELECT", x + slotWidth / 2, y + slotHeight * 0.43);
        context.fillText("PHOTO", x + slotWidth / 2, y + slotHeight * 0.61);
      }
    });

    if (isFourPhotoClock) {
      const numeralPositions = [
        ["12", 0.5, 0.05],
        ["1", 0.75, 0.05],
        ["2", 0.95, 0.25],
        ["3", 0.95, 0.5],
        ["4", 0.95, 0.75],
        ["5", 0.75, 0.95],
        ["6", 0.5, 0.95],
        ["7", 0.25, 0.95],
        ["8", 0.05, 0.75],
        ["9", 0.05, 0.5],
        ["10", 0.05, 0.25],
        ["11", 0.25, 0.05],
      ] as const;
      context.font = `900 ${Math.round(canvas.width * 0.045)}px Arial, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineJoin = "round";
      context.lineWidth = Math.max(2, canvas.width * 0.0025);
      context.strokeStyle = "#07142f";
      context.fillStyle = "#ffffff";
      numeralPositions.forEach(([numeral, left, top]) => {
        const x = canvas.width * left;
        const y = canvas.height * top;
        context.strokeText(numeral, x, y);
        context.fillText(numeral, x, y);
      });
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  });
}

function ClockHands({ height, z }: { height: number; z: number }) {
  return (
    <group position={[0, 0, z]}>
      <group rotation={[0, 0, -1.05]}>
        <mesh position={[0, height * 0.18, 0]}>
          <boxGeometry args={[0.035, height * 0.36, 0.012]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>
      <group rotation={[0, 0, -0.34]}>
        <mesh position={[0, height * 0.13, 0.006]}>
          <boxGeometry args={[0.042, height * 0.26, 0.014]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>
      <group rotation={[0, 0, 2.84]}>
        <mesh position={[0, height * 0.2, 0.012]}>
          <boxGeometry args={[0.018, height * 0.4, 0.01]} />
          <meshStandardMaterial color="#b76e79" />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.02]}>
        <sphereGeometry args={[0.055, 24, 24]} />
        <meshStandardMaterial color="#b76e79" />
      </mesh>
    </group>
  );
}

function AcrylicSlab({
  photoUrl,
  photoUrls,
  photoTransforms,
  collageLayout,
  thicknessMm,
  borderColor,
  textOverlay,
  previewType = "acrylic-slab",
  orientation = "portrait",
  shape = "rectangle",
}: {
  photoUrl: string;
  photoUrls?: string[];
  photoTransforms?: Array<{
    position: { x: number; y: number };
    scale: number;
  }>;
  collageLayout?: "four-photo-clock" | "grid";
  thicknessMm: number;
  borderColor: string;
  textOverlay?: string;
  previewType?: string;
  orientation?: string;
  shape?: string;
}) {
  const meshRef = useRef<THREE.Mesh | THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  const dimensions = useMemo(
    () => getPreviewDimensions(previewType, orientation, shape),
    [orientation, previewType, shape],
  );
  const { width, height } = dimensions;
  // Scale thickness: 3mm → 0.06, 5mm → 0.10, 8mm → 0.16
  const depth = thicknessMm / 50;

  // Load a fitted photo texture so uploaded subjects fill the acrylic face.
  useEffect(() => {
    const hasCollagePhotos = Boolean(photoUrls?.some(Boolean));
    if (!photoUrl && !hasCollagePhotos) {
      setTexture(null);
      return;
    }
    let cancelled = false;
    let createdTexture: THREE.Texture | null = null;
    const texturePromise =
      hasCollagePhotos && photoUrls
        ? createCollagePhotoTexture(
            photoUrls,
            photoTransforms,
            width,
            height,
            photoUrl,
            collageLayout,
          )
        : createFittedPhotoTexture(photoUrl, width, height);

    texturePromise
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
  }, [collageLayout, height, photoTransforms, photoUrl, photoUrls, width]);

  // Gentle idle float
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y =
        Math.sin(state.clock.getElapsedTime() * 0.3) * 0.05;
      meshRef.current.position.y =
        Math.sin(state.clock.getElapsedTime() * 0.8) * 0.02;
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
    () => [
      acrylicMaterial,
      acrylicMaterial,
      acrylicMaterial,
      acrylicMaterial,
      frontMaterial,
      acrylicMaterial,
    ],
    [acrylicMaterial, frontMaterial],
  );
  const faceMaterials = useMemo(
    () => [frontMaterial, acrylicMaterial],
    [acrylicMaterial, frontMaterial],
  );
  const previewShape = useMemo(
    () => buildPreviewShape(shape, width, height),
    [height, shape, width],
  );
  const normalizedUvGenerator = useMemo(
    () => ({
      generateTopUV: (
        _geometry: THREE.ExtrudeGeometry,
        vertices: number[],
        indexA: number,
        indexB: number,
        indexC: number,
      ) =>
        [indexA, indexB, indexC].map(
          (index) =>
            new THREE.Vector2(
              THREE.MathUtils.clamp(
                (vertices[index * 3] + width / 2) / width,
                0,
                1,
              ),
              THREE.MathUtils.clamp(
                (vertices[index * 3 + 1] + height / 2) / height,
                0,
                1,
              ),
            ),
        ),
      generateSideWallUV: (
        _geometry: THREE.ExtrudeGeometry,
        vertices: number[],
        indexA: number,
        indexB: number,
        indexC: number,
        indexD: number,
      ) =>
        [indexA, indexB, indexC, indexD].map(
          (index) =>
            new THREE.Vector2(
              THREE.MathUtils.clamp(
                (vertices[index * 3] + width / 2) / width,
                0,
                1,
              ),
              THREE.MathUtils.clamp(
                vertices[index * 3 + 2] / Math.max(depth, 0.001),
                0,
                1,
              ),
            ),
        ),
    }),
    [depth, height, width],
  );
  const isCustomShape = [
    "custom",
    "heart",
    "leaf",
    "rounded-rectangle",
    "diamond",
    "triangle",
    "hexagon",
    "octagon",
    "penta",
    "oval",
    "door",
    "house",
    "bean",
    "balloon",
    "cloud",
  ].includes(shape);
  const isClock = previewType === "clock";

  if (shape === "circle") {
    return (
      <group ref={meshRef}>
        <mesh
          castShadow
          receiveShadow
          material={materials}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[width / 2, width / 2, depth, 96]} />
        </mesh>
        {!texture ? <SelectPhotoMarker z={depth / 2 + 0.04} /> : null}
        {isClock ? <ClockHands height={height} z={depth / 2 + 0.04} /> : null}
      </group>
    );
  }

  if (isCustomShape) {
    return (
      <group ref={meshRef}>
        <mesh castShadow receiveShadow material={faceMaterials}>
          <extrudeGeometry
            args={[
              previewShape,
              {
                depth,
                bevelEnabled: true,
                bevelSize: 0.035,
                bevelThickness: 0.035,
                bevelSegments: 12,
                UVGenerator: normalizedUvGenerator,
              },
            ]}
          />
        </mesh>
        {!texture ? <SelectPhotoMarker z={depth + 0.08} /> : null}
        {isClock ? <ClockHands height={height} z={depth + 0.08} /> : null}
      </group>
    );
  }

  return (
    <group ref={meshRef}>
      <mesh castShadow receiveShadow material={materials}>
        <boxGeometry args={[width, height, depth]} />
      </mesh>
      {!texture ? <SelectPhotoMarker z={depth / 2 + 0.05} /> : null}
      {isClock ? <ClockHands height={height} z={depth / 2 + 0.05} /> : null}
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
      <directionalLight
        position={[-3, 4, -2]}
        intensity={0.3}
        color="#cce0ff"
      />
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
    const { width, height } = getPreviewDimensions(
      previewType,
      orientation,
      shape,
    );
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const verticalFov = THREE.MathUtils.degToRad(perspectiveCamera.fov);
    const aspect = Math.max(size.width / Math.max(size.height, 1), 0.8);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const customShapePadding = [
      "custom",
      "heart",
      "leaf",
      "rounded-rectangle",
      "diamond",
      "triangle",
      "hexagon",
      "octagon",
      "penta",
      "oval",
      "door",
      "house",
      "bean",
      "balloon",
      "cloud",
    ].includes(shape ?? "")
      ? 1.2
      : 1;
    const heightDistance =
      (height * customShapePadding) / (2 * Math.tan(verticalFov / 2) * 0.72);
    const widthDistance =
      (width * customShapePadding) / (2 * Math.tan(horizontalFov / 2) * 0.78);
    const distance = Math.max(
      heightDistance,
      widthDistance,
      size.width < 480 ? 5.25 : size.width < 768 ? 5.55 : 5.8,
    );
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
  photoUrls,
  photoTransforms,
  collageLayout,
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
  photoUrls?: string[];
  photoTransforms?: Array<{
    position: { x: number; y: number };
    scale: number;
  }>;
  collageLayout?: "four-photo-clock" | "grid";
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
        mode === "inline"
          ? "min-h-[316px] rounded-[14px] sm:min-h-[380px] lg:min-h-[430px]"
          : "max-h-[calc(100vh-48px)] max-w-[920px] rounded-[8px]"
      } ${isFullscreen ? "h-screen max-w-none rounded-none" : ""}`}
    >
      {/* Header */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 ${
          mode === "inline"
            ? "px-3 pt-3 sm:px-5 sm:pt-4"
            : "border-b border-rosegold-200/60 bg-white px-4 py-3"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-ikonnic-red shadow-[0_0_8px_rgba(183,110,121,0.5)]" />
          <h2
            className={`text-lg font-black ${mode === "inline" ? "text-white" : "text-[#07142f]"}`}
          >
            3D Preview
          </h2>
          <span
            className={`hidden rounded-full px-2.5 py-0.5 text-[11px] font-bold sm:inline-flex ${
              mode === "inline"
                ? "bg-white/10 text-white/70"
                : "bg-rosegold-100 text-slate-600"
            }`}
          >
            {previewType} / {thicknessMm}mm /{" "}
            {borderColor === "black" ? "Black" : "Light Blue"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`grid size-8 place-items-center rounded-lg transition ${
              mode === "inline"
                ? "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                : "bg-rosegold-100 text-slate-600 hover:bg-slate-200 hover:text-[#07142f]"
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
                mode === "inline"
                  ? "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  : "bg-rosegold-100 text-slate-600 hover:bg-slate-200 hover:text-[#07142f]"
              }`}
              aria-label="Close 3D Preview"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Canvas */}
      <div
        className={`${isFullscreen ? "h-[calc(100vh-110px)]" : mode === "inline" ? "h-[250px] px-2 pb-2 pt-2 sm:h-[320px] sm:px-3 md:h-[360px] lg:h-[390px]" : "h-[min(504px,calc(100vh-112px))]"} [&_canvas]:!h-full [&_canvas]:!w-full w-full`}
      >
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
          <CameraSetup
            previewType={previewType}
            orientation={orientation}
            shape={shape}
          />
          <SceneLighting />
          <Suspense fallback={<LoadingFallback />}>
            <AcrylicSlab
              photoUrl={photoUrl}
              photoUrls={photoUrls}
              photoTransforms={photoTransforms}
              collageLayout={collageLayout}
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
