import { buildDungeonScene } from "@mapgen/dungeon-renderer";
import type { DungeonLayout } from "@mapgen/layout-schema";
import { useEffect, useRef } from "react";
import {
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

interface DungeonViewportProps {
  readonly layout: DungeonLayout;
  readonly showColliders: boolean;
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

export function DungeonViewport({ layout, showColliders }: DungeonViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof WebGLRenderingContext === "undefined") return;

    const scene = new Scene();
    scene.background = new Color("#11140f");
    const camera = new PerspectiveCamera(42, 1, 0.1, 1_000);
    const span = Math.max(layout.grid.width, layout.grid.height) * 0.32;
    camera.position.set(span, span * 0.72, span);

    const renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    host.append(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 10;
    controls.maxDistance = 180;

    scene.add(new AmbientLight("#c5bca1", 1.55));
    const sun = new DirectionalLight("#ffe2ae", 3.5);
    sun.position.set(-20, 40, 18);
    sun.castShadow = true;
    scene.add(sun);
    const sceneResult = buildDungeonScene(layout);
    scene.add(sceneResult.root);
    const grid = new GridHelper(Math.max(layout.grid.width, layout.grid.height), 32, "#745c3d", "#29302a");
    grid.position.y = -0.21;
    scene.add(grid);
    const overlay = buildColliderOverlay(layout);
    overlay.visible = showColliders;
    scene.add(overlay);

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      renderer.domElement.remove();
    };
  }, [layout, showColliders]);

  return <div className="viewport" ref={hostRef} aria-label="三维地下城预览" />;
}
