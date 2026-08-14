import { buildDungeonScene, type DungeonTextureSet } from "@mapgen/dungeon-renderer";
import type { DungeonAppearance, DungeonLayout } from "@mapgen/layout-schema";
import { useEffect, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { PREVIEW_CONTACT_AO } from "./contact-ao-settings";
import { loadAppearanceTextures } from "./load-appearance-textures";
import { dungeonShadowSettings } from "./shadow-settings";

interface DungeonViewportProps {
  readonly layout: DungeonLayout;
  readonly showColliders: boolean;
  readonly appearance: DungeonAppearance;
}

function buildColliderOverlay(layout: DungeonLayout): Group {
  const group = new Group();
  group.name = "ColliderOverlay";
  const materials = {
    floor: new MeshBasicMaterial({ color: "#3ba489", wireframe: true, transparent: true, opacity: 0.25 }),
    wall: new MeshBasicMaterial({ color: "#f2b74e", wireframe: true, transparent: true, opacity: 0.5 }),
    door: new MeshBasicMaterial({ color: "#d75142", wireframe: true, transparent: true, opacity: 0.8 }),
  };
  for (const collider of layout.colliders) {
    const mesh = new Mesh(new BoxGeometry(...collider.size), materials[collider.kind]);
    mesh.position.fromArray(collider.center);
    mesh.rotation.y = collider.rotationY ?? 0;
    group.add(mesh);
  }
  return group;
}

export function DungeonViewport({ layout, showColliders, appearance }: DungeonViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [textures, setTextures] = useState<DungeonTextureSet>({});

  useEffect(() => {
    if (typeof WebGLRenderingContext === "undefined") return;
    let current = true;
    setTextures({});
    void loadAppearanceTextures(appearance).then((loaded) => {
      if (current) setTextures(loaded);
    }).catch((error) => {
      console.error("Surface texture preview failed; using Kenney colors.", error);
    });
    return () => { current = false; };
  }, [appearance]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof WebGLRenderingContext === "undefined") return;

    const scene = new Scene();
    scene.background = new Color("#11140f");
    const camera = new PerspectiveCamera(42, 1, 0.1, 1_000);
    const span = Math.max(layout.grid.width, layout.grid.height) * 0.55;
    camera.position.set(span, span * 0.9, span);

    const renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    host.append(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 10;
    controls.maxDistance = 300;

    scene.add(new AmbientLight("#b8bdd8", 0.85));
    const sun = new DirectionalLight("#ffe2c2", 1.9);
    sun.position.set(-20, 40, 18);
    sun.castShadow = true;
    const shadow = dungeonShadowSettings(layout.grid.width, layout.grid.height);
    sun.shadow.camera.left = -shadow.extent;
    sun.shadow.camera.right = shadow.extent;
    sun.shadow.camera.top = shadow.extent;
    sun.shadow.camera.bottom = -shadow.extent;
    sun.shadow.camera.near = shadow.near;
    sun.shadow.camera.far = shadow.far;
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.mapSize.set(shadow.mapSize, shadow.mapSize);
    sun.shadow.bias = shadow.bias;
    sun.shadow.normalBias = shadow.normalBias;
    sun.shadow.radius = shadow.radius;
    scene.add(sun);
    const sceneResult = buildDungeonScene(layout, { appearance, textures });
    scene.add(sceneResult.root);
    const grid = new GridHelper(Math.max(layout.grid.width, layout.grid.height), 32, "#745c3d", "#29302a");
    grid.position.y = -0.21;
    scene.add(grid);
    const overlay = buildColliderOverlay(layout);
    overlay.visible = showColliders;
    scene.add(overlay);

    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    composer.addPass(new RenderPass(scene, camera));
    const gtaoPass = new GTAOPass(scene, camera, 1, 1);
    gtaoPass.blendIntensity = PREVIEW_CONTACT_AO.blendIntensity;
    gtaoPass.updateGtaoMaterial({
      radius: PREVIEW_CONTACT_AO.radius,
      distanceExponent: PREVIEW_CONTACT_AO.distanceExponent,
      thickness: PREVIEW_CONTACT_AO.thickness,
      distanceFallOff: PREVIEW_CONTACT_AO.distanceFallOff,
      scale: PREVIEW_CONTACT_AO.scale,
      samples: PREVIEW_CONTACT_AO.samples,
    });
    gtaoPass.updatePdMaterial({
      radius: PREVIEW_CONTACT_AO.denoiseRadius,
      rings: PREVIEW_CONTACT_AO.denoiseRings,
      samples: PREVIEW_CONTACT_AO.denoiseSamples,
    });
    composer.addPass(gtaoPass);
    composer.addPass(new OutputPass());

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame = 0;
    const animate = () => {
      controls.update();
      composer.render();
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      gtaoPass.dispose();
      composer.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      });
      renderer.domElement.remove();
    };
  }, [appearance, layout, showColliders, textures]);

  return <div className="viewport" ref={hostRef} aria-label="三维地下城预览" />;
}
