"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Decal, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import { useViewerStore } from "./useViewerStore";
import { registerGarmentCapturer } from "./snapshotRegistry";

// Preload only the light default model. The oversized (~18MB) and hoodie (~43MB) GLBs are
// fetched on demand — preloading everything at once made the selected garment crawl in.
useGLTF.preload("/models/tshirt.glb");

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
  texture.colorSpace = THREE.SRGBColorSpace;
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
  const { size: canvasSize, gl, scene: rootScene, camera } = useThree();
  const garmentGroupRef = useRef<THREE.Group>(null);

  // Scale up on narrow screens, but clamp so the garment never clips the canvas edges
  const responsiveScale = useMemo(() => {
    const aspect = canvasSize.width / Math.max(1, canvasSize.height);
    const visibleH = 2 * 3.7 * Math.tan((45 / 2) * (Math.PI / 180)); // camera fov 45, ~3.7 from target
    const fitW = (visibleH * aspect * 0.9) / 0.66; // widest garment ≈ 0.66 units
    const fitH = (visibleH * 0.85) / 0.72; // tallest garment ≈ 0.72 units
    const mult = aspect < 1 ? Math.min(2.25, 1.2 / aspect) : 1;
    return Math.min(scale * mult, fitW, fitH);
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
        if (child.userData?.isDecal) return; // never recolor our own print decals
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

  useEffect(() => {
    if (useSceneRenderer && scene) {
      // Center the model inside its parent group. The bounding box is measured in world space,
      // so convert its center into the parent's local space — otherwise the parent's scale/offset
      // gets applied twice and the garment can be pushed out of view (depending on render timing).
      scene.position.set(0, 0, 0);
      scene.parent?.updateWorldMatrix(true, false);
      scene.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      if (scene.parent) scene.parent.worldToLocal(center);

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
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = 8;
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
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = 8;
      loaded.needsUpdate = true;
      setCustomTexture(loaded);
    });
    return () => {
      tex.dispose();
    };
  }, [design, customTextureUrl]);

  // ── Print decal for multi-mesh garments (hoodie / oversized) ──
  // These GLBs are split across several meshes with nested transforms, so we project the
  // decal in world space onto every fabric mesh it touches and parent the result to that mesh.
  const activeTexture = customTexture || logoTexture || canvasTexture;

  useEffect(() => {
    if (!useSceneRenderer || !scene || !activeTexture) return;

    scene.updateWorldMatrix(true, true);

    const isChainVisible = (obj: THREE.Object3D | null): boolean => {
      for (let o = obj; o; o = o.parent) if (!o.visible) return false;
      return true;
    };

    const fabric: THREE.Mesh[] = [];
    scene.traverse((child: any) => {
      if (child.isMesh && !child.userData?.isDecal && isChainVisible(child)) fabric.push(child);
    });
    if (fabric.length === 0) return;

    const box = new THREE.Box3();
    fabric.forEach((m) => box.expandByObject(m));
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Placement params are tuned on the classic tee (≈0.55 wide, 0.61 tall); map them proportionally
    const REF_W = 0.55;
    const REF_H = 0.61;
    const isBackSide = decalTarget === "back";
    const chestAnchor = isHoodie ? 0.1 : 0.13; // chest height above garment center (fraction of height)
    const widthFactor = isHoodie ? 0.9 : 1.0;

    const x = center.x + (decalPosX / REF_W) * size.x * (isBackSide ? -1 : 1);
    const y = center.y + chestAnchor * size.y + ((decalPosY - 0.05) / REF_H) * size.y;
    const printSize = (decalScale / REF_W) * size.x * widthFactor;

    // Find the actual fabric surface at (x, y) on the chosen side
    const dirZ = isBackSide ? 1 : -1;
    const origin = new THREE.Vector3(x, y, isBackSide ? box.min.z - 1 : box.max.z + 1);
    const raycaster = new THREE.Raycaster(origin, new THREE.Vector3(0, 0, dirZ));
    const hit = raycaster.intersectObjects(fabric, false)[0];
    const projectorPos = hit ? hit.point.clone() : new THREE.Vector3(x, y, isBackSide ? box.min.z : box.max.z);

    const orientation = new THREE.Euler(0, isBackSide ? Math.PI : 0, 0);
    const depth = size.z * 0.5; // deep enough to wrap the surface, shallow enough to miss the other side
    const projectorSize = new THREE.Vector3(printSize, printSize, depth);
    const projectorBox = new THREE.Box3().setFromCenterAndSize(projectorPos, projectorSize);

    // Unlit + no tone mapping: the print keeps its true colors instead of being washed out
    const material = new THREE.MeshBasicMaterial({
      map: activeTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      toneMapped: false,
    });

    const created: THREE.Mesh[] = [];
    const meshBox = new THREE.Box3();
    fabric.forEach((m) => {
      meshBox.setFromObject(m);
      if (!meshBox.intersectsBox(projectorBox)) return;
      const geom = new DecalGeometry(m, projectorPos, orientation, projectorSize);
      if (!geom.attributes.position || geom.attributes.position.count === 0) {
        geom.dispose();
        return;
      }
      // DecalGeometry outputs world-space vertices; convert to the mesh's local space so it follows the mesh
      geom.applyMatrix4(m.matrixWorld.clone().invert());
      const decalMesh = new THREE.Mesh(geom, material);
      decalMesh.userData.isDecal = true;
      decalMesh.renderOrder = 1;
      m.add(decalMesh);
      created.push(decalMesh);
    });

    return () => {
      created.forEach((d) => {
        d.parent?.remove(d);
        d.geometry.dispose();
      });
      material.dispose();
    };
  }, [useSceneRenderer, scene, activeTexture, decalPosX, decalPosY, decalScale, decalTarget, isHoodie, responsiveScale]);

  // ── Product shots for the cart: render the real garment straight-on from the front and back ──
  useEffect(() => {
    return registerGarmentCapturer((size = 512) => {
      const group = garmentGroupRef.current;
      const canvas = gl.domElement;
      if (!group || !canvas.width || !canvas.height) return null;

      group.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(group);
      if (box.isEmpty()) return null;
      const center = box.getCenter(new THREE.Vector3());
      const dims = box.getSize(new THREE.Vector3());

      const w = canvas.width;
      const h = canvas.height;
      const side = Math.min(w, h); // square crop from the middle of the canvas
      const shotCam = (camera as THREE.PerspectiveCamera).clone();
      shotCam.aspect = w / h;
      shotCam.updateProjectionMatrix();

      // Distance so the garment (+12% margin) fills the square crop
      const halfFov = THREE.MathUtils.degToRad(shotCam.fov) / 2;
      const need = Math.max(dims.x, dims.y) * 1.12;
      const distance = need / (2 * Math.tan(halfFov) * (side / h)) + dims.z / 2;

      const shoot = (sign: 1 | -1) => {
        shotCam.position.set(center.x, center.y, center.z + sign * distance);
        shotCam.lookAt(center);
        gl.render(rootScene, shotCam);

        const out = document.createElement("canvas");
        out.width = size;
        out.height = size;
        const ctx = out.getContext("2d");
        if (!ctx) return "";
        ctx.fillStyle = "#F5F6F8";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(canvas, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
        return out.toDataURL("image/jpeg", 0.88);
      };

      const front = shoot(1);
      const back = shoot(-1);
      gl.render(rootScene, camera); // restore the user's view in the same frame (no flicker)
      return front && back ? { front, back } : null;
    });
  }, [gl, rootScene, camera]);

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

  // Projection depth for the classic tee (~0.27 units thick): shallow enough that a front
  // print never bleeds through onto the back collar/sides, deep enough to wrap the chest curve.
  const TEE_DECAL_DEPTH = 0.1;
  const isBack = decalTarget === "back";
  const decalZ = isBack ? -0.125 : 0.125;
  const decalRotY = isBack ? Math.PI : 0;
  const adjustedPosX = isBack ? -decalPosX : decalPosX;

  return (
    <>
      {useSceneRenderer ? (
        <>
          <group ref={garmentGroupRef} position={[0, -0.55, 0]} scale={[responsiveScale, responsiveScale, responsiveScale]}>
            <primitive object={scene} />
          </group>
        </>
      ) : (
        <group ref={garmentGroupRef} position={[0, -0.55, 0]} scale={[responsiveScale, responsiveScale, responsiveScale]}>
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
                scale={[decalScale, decalScale, TEE_DECAL_DEPTH]}
                map={canvasTexture}
                polygonOffsetFactor={-1}
                material-toneMapped={false}
              />
            )}
            {logoTexture && (
              <Decal
                mesh={meshRef as any}
                position={[adjustedPosX, decalPosY, decalZ]}
                rotation={[0, decalRotY, 0]}
                scale={[decalScale, decalScale, TEE_DECAL_DEPTH]}
                map={logoTexture}
                polygonOffsetFactor={-1}
                material-toneMapped={false}
              />
            )}
            {customTexture && (
              <Decal
                mesh={meshRef as any}
                position={[adjustedPosX, decalPosY, decalZ]}
                rotation={[0, decalRotY, 0]}
                scale={[decalScale, decalScale, TEE_DECAL_DEPTH]}
                map={customTexture}
                polygonOffsetFactor={-1}
                material-toneMapped={false}
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
