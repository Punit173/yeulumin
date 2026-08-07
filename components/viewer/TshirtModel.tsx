"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Decal, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useViewerStore } from "./useViewerStore";

// Preload the GLB models
useGLTF.preload("/models/tshirt.glb");
useGLTF.preload("/models/premium_eco_hoodie.glb");
useGLTF.preload("/models/1.glb");
useGLTF.preload("/models/oversized_t-shirt.glb");

// Helper function to generate design textures on a 512x512 canvas
function generateDesignTexture(designId: string): THREE.CanvasTexture | null {
  if (designId === "none" || designId === "logo") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Clear canvas
  ctx.clearRect(0, 0, 512, 512);

  if (designId === "stripe") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(0, i * 52, 512, 52);
      }
    }
  } else if (designId === "abstract") {
    // 8 radial gradients
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 50 + Math.random() * 100;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(123, 47, 255, 0.6)");
      grad.addColorStop(1, "rgba(123, 47, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 6 bezier curves
    ctx.strokeStyle = "rgba(0, 255, 178, 0.3)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.bezierCurveTo(
        Math.random() * 512, Math.random() * 512,
        Math.random() * 512, Math.random() * 512,
        Math.random() * 512, Math.random() * 512
      );
      ctx.stroke();
    }
  } else if (designId === "circuit") {
    // Generate 12 random grid-snapped points (on a 60px grid)
    const points: { x: number; y: number }[] = [];
    const gridSize = 60;
    const cols = Math.floor(512 / gridSize);
    for (let i = 0; i < 12; i++) {
      const col = Math.floor(Math.random() * (cols - 2)) + 1;
      const row = Math.floor(Math.random() * (cols - 2)) + 1;
      points.push({ x: col * gridSize + gridSize / 2, y: row * gridSize + gridSize / 2 });
    }

    // Connect them with L-shaped paths (horizontal then vertical)
    ctx.strokeStyle = "rgba(0, 255, 178, 0.35)";
    ctx.lineWidth = 3;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p1.y); // Horizontal
      ctx.lineTo(p2.x, p2.y); // Vertical
      ctx.stroke();
    }

    // Draw 4px filled circles at each point
    ctx.fillStyle = "#00FFB2";
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (designId === "ai") {
    // Central radial gradient
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 200);
    grad.addColorStop(0, "rgba(123, 47, 255, 0.3)");
    grad.addColorStop(1, "rgba(123, 47, 255, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(256, 256, 200, 0, Math.PI * 2);
    ctx.fill();

    // 20 random semi-transparent circles with purple/mint strokes
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = Math.random() > 0.5 ? "rgba(123, 47, 255, 0.4)" : "rgba(0, 255, 178, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, 10 + Math.random() * 40, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hexagon glyph "⬡" in white at center
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 120px sans-serif";
    ctx.fillText("⬡", 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface TshirtModelProps {
  scale?: number;
  autoRotateSpeed?: number;
}

export default function TshirtModel({
  scale = 1.1,
  autoRotateSpeed = 1.0,
}: TshirtModelProps) {
  const {
    color,
    design,
    view,
    customTextureUrl,
    decalScale,
    decalPosY,
    decalPosX,
    decalTarget,
    garmentType
  } = useViewerStore();
  const meshRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<any>(null);

  const isHoodie = garmentType === "hoodie";
  const isOversized = garmentType === "oversized";
  const useSceneRenderer = isHoodie || isOversized; // multi-mesh models use <primitive object={scene}>

  // Access three.js canvas size
  const { size: canvasSize } = useThree();

  // Dynamically adjust scale on narrow screen aspect ratios to maximize size without clipping
  const responsiveScale = useMemo(() => {
    const aspect = canvasSize.width / canvasSize.height;
    if (aspect < 1) {
      const scaleMultiplier = Math.min(2.25, 1.2 / aspect);
      return scale * scaleMultiplier;
    }
    return scale;
  }, [scale, canvasSize.width, canvasSize.height]);

  const glbPath = isHoodie
    ? "/models/premium_eco_hoodie.glb"
    : isOversized
      ? "/models/oversized_t-shirt.glb"
      : "/models/tshirt.glb";
  const { nodes, materials, scene } = useGLTF(glbPath) as any;

  const meshKey = useMemo(() => {
    return Object.keys(nodes).find((key) => nodes[key].type === "Mesh") || "T_Shirt_male";
  }, [nodes]);
  const shirtMeshNode = nodes[meshKey];

  // Apply fabric color dynamically, strip pre-baked GLB textures (flames design & normal maps), and hide flame stitches
  useEffect(() => {
    if (useSceneRenderer && scene) {
      scene.traverse((child: any) => {
        const name = (child.name || "").toLowerCase();
        const parentName = (child.parent?.name || "").toLowerCase();

        // Hide flame stitching mesh nodes (hoodie_stitches_0) and flame graphic overlay nodes
        if (
          name.includes("stitches") ||
          name.includes("striki") ||
          name.includes("flame") ||
          name.includes("graphic") ||
          name.includes("print") ||
          parentName.includes("stitches") ||
          parentName.includes("striki") ||
          parentName.includes("flame") ||
          parentName.includes("graphic") ||
          parentName.includes("print")
        ) {
          child.visible = false;
        }

        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat: any) => {
            if (mat) {
              // Strip pre-baked diffuse texture, normal map (flame contours), & ambient occlusion maps
              mat.map = null;
              mat.normalMap = null;
              mat.roughnessMap = null;
              mat.metalnessMap = null;
              mat.aoMap = null;
              mat.emissiveMap = null;

              const matName = (mat.name || "").toLowerCase();
              const isMetalHardware =
                matName.includes("material.009") ||
                matName.includes("material.003") ||
                matName.includes("metal") ||
                matName.includes("aglet") ||
                matName.includes("eyelet");

              if (!isMetalHardware) {
                mat.color.set(color);
                mat.roughness = 0.65;
              }
              mat.needsUpdate = true;
            }
          });
        }
      });
    } else {
      if (shirtMeshNode && shirtMeshNode.material) {
        shirtMeshNode.material.map = null;
        shirtMeshNode.material.normalMap = null;
        shirtMeshNode.material.roughnessMap = null;
        shirtMeshNode.material.aoMap = null;
        shirtMeshNode.material.color.set(color);
        shirtMeshNode.material.roughness = 0.6;
        shirtMeshNode.material.needsUpdate = true;
      }
    }
  }, [color, shirtMeshNode, materials, useSceneRenderer, isHoodie, scene]);

  const hoodieMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (isHoodie) {
      if (nodes.hoodie_Sweat_Rib_1X1_319gsm_hoodie_0) {
        hoodieMeshRef.current = nodes.hoodie_Sweat_Rib_1X1_319gsm_hoodie_0;
      } else if (nodes.Object_4) {
        hoodieMeshRef.current = nodes.Object_4;
      } else {
        let foundMesh: THREE.Mesh | null = null;
        if (scene) {
          scene.traverse((child: any) => {
            if (!foundMesh && child.isMesh && child.visible) {
              foundMesh = child;
            }
          });
        }
        hoodieMeshRef.current = foundMesh;
      }
    } else {
      hoodieMeshRef.current = null;
    }
  }, [isHoodie, nodes, scene]);

  useEffect(() => {
    if (useSceneRenderer && scene) {
      scene.position.set(0, 0, 0);
      scene.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(scene);
      const center = new THREE.Vector3();
      box.getCenter(center);

      scene.position.set(-center.x, -center.y, -center.z);
      scene.updateMatrixWorld(true);
    }
  }, [useSceneRenderer, scene]);

  const [canvasTexture, setCanvasTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    if (design === "ai" && customTextureUrl) {
      setCanvasTexture(null);
      return;
    }
    const newTex = generateDesignTexture(design);
    setCanvasTexture(newTex);

    return () => {
      if (newTex) {
        newTex.dispose();
      }
    };
  }, [design, customTextureUrl]);

  const [logoTexture, setLogoTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (design !== "logo") {
      setLogoTexture(null);
      return;
    }
    const loader = new THREE.TextureLoader();
    const tex = loader.load("/logos/trimmed_yeulumin ai-05.png", (loaded) => {
      loaded.needsUpdate = true;
      setLogoTexture(loaded);
    });
    return () => {
      tex.dispose();
    };
  }, [design]);

  const [customTexture, setCustomTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (design !== "ai" || !customTextureUrl) {
      setCustomTexture(null);
      return;
    }
    const loader = new THREE.TextureLoader();
    const tex = loader.load(customTextureUrl, (loaded) => {
      loaded.needsUpdate = true;
      setCustomTexture(loaded);
    });
    return () => {
      tex.dispose();
    };
  }, [design, customTextureUrl]);

  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleStart = () => {
    setAutoRotate(false);
    isAnimatingRef.current = false;
    if (autoRotateTimeoutRef.current) {
      clearTimeout(autoRotateTimeoutRef.current);
    }
  };

  const handleEnd = () => {
    if (autoRotateTimeoutRef.current) {
      clearTimeout(autoRotateTimeoutRef.current);
    }
    autoRotateTimeoutRef.current = setTimeout(() => {
      setAutoRotate(true);
    }, 3000);
  };

  const prevViewRef = useRef<string>(view);
  const isAnimatingRef = useRef<boolean>(false);
  const targetAzimuth = useRef(0);
  const targetPolar = useRef(1.4);

  useEffect(() => {
    if (view !== prevViewRef.current) {
      prevViewRef.current = view;
      isAnimatingRef.current = true;

      if (view === "front") {
        targetAzimuth.current = 0;
        targetPolar.current = 1.4;
      } else if (view === "back") {
        targetAzimuth.current = Math.PI;
        targetPolar.current = 1.4;
      } else if (view === "side") {
        targetAzimuth.current = Math.PI / 2.5;
        targetPolar.current = 1.4;
      }
    }
  }, [view]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.6) * 0.02;
    }

    if (isAnimatingRef.current && controlsRef.current) {
      const camera = state.camera;
      const target = controlsRef.current.target || new THREE.Vector3(0, -0.55, 0);

      const relPos = new THREE.Vector3().copy(camera.position).sub(target);
      const spherical = new THREE.Spherical().setFromVector3(relPos);

      const targetAz = targetAzimuth.current;
      const targetPol = targetPolar.current;

      let diffTheta = targetAz - spherical.theta;
      diffTheta = Math.atan2(Math.sin(diffTheta), Math.cos(diffTheta));

      spherical.theta += diffTheta * 0.08;
      spherical.phi = THREE.MathUtils.lerp(spherical.phi, targetPol, 0.08);

      const newRelPos = new THREE.Vector3().setFromSpherical(spherical);
      camera.position.copy(target).add(newRelPos);

      controlsRef.current.update();

      const azClose = Math.abs(diffTheta) < 0.01;
      const polClose = Math.abs(spherical.phi - targetPol) < 0.01;
      if (azClose && polClose) {
        isAnimatingRef.current = false;
      }
    }
  });

  const isBack = decalTarget === "back";
  const decalZ = isBack ? -0.125 : 0.125;
  const decalRotY = isBack ? Math.PI : 0;
  const adjustedPosX = isBack ? -decalPosX : decalPosX;

  const isEcoHoodie = isHoodie && nodes.hoodie_Sweat_Rib_1X1_319gsm_hoodie_0;
  const hoodieDecalPos: [number, number, number] = isEcoHoodie
    ? [adjustedPosX, decalPosY + 0.05, isBack ? -0.14 : 0.14]
    : [isBack ? -decalPosX * 1000 : decalPosX * 1000, (decalPosY * 1000) + 60, isBack ? -1050 : -925];
  const hoodieDecalScale: [number, number, number] = isEcoHoodie
    ? [decalScale, decalScale, decalScale]
    : [decalScale * 1000, decalScale * 1000, decalScale * 1000];

  return (
    <>
      {useSceneRenderer ? (
        <>
          <group position={[0, -0.55, 0]} scale={[responsiveScale, responsiveScale, responsiveScale]}>
            <primitive object={scene} />
          </group>
          {isHoodie && hoodieMeshRef.current && canvasTexture && (
            <Decal
              mesh={hoodieMeshRef as any}
              position={hoodieDecalPos}
              rotation={[0, decalRotY, 0]}
              scale={hoodieDecalScale}
              map={canvasTexture}
              polygonOffsetFactor={-1}
            />
          )}
          {isHoodie && hoodieMeshRef.current && logoTexture && (
            <Decal
              mesh={hoodieMeshRef as any}
              position={hoodieDecalPos}
              rotation={[0, decalRotY, 0]}
              scale={hoodieDecalScale}
              map={logoTexture}
              polygonOffsetFactor={-1}
            />
          )}
          {isHoodie && hoodieMeshRef.current && customTexture && (
            <Decal
              mesh={hoodieMeshRef as any}
              position={hoodieDecalPos}
              rotation={[0, decalRotY, 0]}
              scale={hoodieDecalScale}
              map={customTexture}
              polygonOffsetFactor={-1}
            />
          )}
        </>
      ) : (
        <group position={[0, -0.55, 0]} scale={[responsiveScale, responsiveScale, responsiveScale]}>
          <mesh
            ref={meshRef}
            geometry={shirtMeshNode.geometry}
            material={shirtMeshNode.material}
          >
            {canvasTexture && (
              <Decal
                mesh={meshRef as any}
                position={[adjustedPosX, decalPosY, decalZ]}
                rotation={[0, decalRotY, 0]}
                scale={[decalScale, decalScale, decalScale]}
                map={canvasTexture}
                polygonOffsetFactor={-1}
              />
            )}
            {logoTexture && (
              <Decal
                mesh={meshRef as any}
                position={[adjustedPosX, decalPosY, decalZ]}
                rotation={[0, decalRotY, 0]}
                scale={[decalScale, decalScale, decalScale]}
                map={logoTexture}
                polygonOffsetFactor={-1}
              />
            )}
            {customTexture && (
              <Decal
                mesh={meshRef as any}
                position={[adjustedPosX, decalPosY, decalZ]}
                rotation={[0, decalRotY, 0]}
                scale={[decalScale, decalScale, decalScale]}
                map={customTexture}
                polygonOffsetFactor={-1}
              />
            )}
          </mesh>
        </group>
      )}

      <OrbitControls
        ref={controlsRef}
        target={[0, -0.55, 0]}
        enablePan={false}
        minDistance={1.5}
        maxDistance={5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.6}
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        onStart={handleStart}
        onEnd={handleEnd}
      />
    </>
  );
}
