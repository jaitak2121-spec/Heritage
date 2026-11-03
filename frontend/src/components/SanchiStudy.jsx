import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export default function SanchiStudy() {
  const host = useRef(null);
  const controlsRef = useRef(null);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const container = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { return; }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f4ebdb');
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(8, 5, 10);
    container.appendChild(renderer.domElement);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.6, 0);
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 19;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.update();
    controls.saveState();
    controlsRef.current = controls;
    const stone = new THREE.MeshStandardMaterial({ color: '#bb8563', roughness: 0.95 });
    const carved = new THREE.MeshStandardMaterial({ color: '#945f44' });
    function part(geometry, x, y, z, material = stone, parent = scene) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
    part(new THREE.CylinderGeometry(3.6, 3.7, 0.22, 64), 0, 0, 0);
    part(new THREE.CylinderGeometry(2.35, 2.5, 0.55, 64), 0, 0.37, 0);
    part(new THREE.SphereGeometry(2.25, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.64, 0);
    part(new THREE.BoxGeometry(0.75, 0.32, 0.75), 0, 2.95, 0, carved);
    part(new THREE.CylinderGeometry(0.045, 0.055, 1.05), 0, 3.52, 0);
    [0.47, 0.36, 0.24].forEach((r, i) => part(new THREE.ConeGeometry(r, 0.13, 32), 0, 3.33 + i * 0.29, 0));
    for (let i = 0; i < 4; i++) {
      const gate = new THREE.Group();
      gate.rotation.y = i * Math.PI / 2;
      scene.add(gate);
      for (const x of [-0.45, 0.45]) part(new THREE.BoxGeometry(0.16, 1.5, 0.2), x, 0.85, 3, carved, gate);
      for (const y of [1.35, 1.62, 1.89]) part(new THREE.BoxGeometry(1.5, 0.13, 0.19), 0, y, 3, stone, gate);
    }
    scene.add(new THREE.HemisphereLight(0xfff3d9, 0x73513d, 2));
    const sun = new THREE.DirectionalLight(0xffe0ba, 2.2);
    sun.position.set(4, 8, 3);
    scene.add(sun);
    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
      setAvailable(true);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    controls.addEventListener('change', render);
    return () => {
      observer.disconnect();
      controls.dispose();
      controlsRef.current = null;
      scene.traverse(object => object.geometry?.dispose());
      stone.dispose();
      carved.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return <div>
    <div ref={host} className="h-72 rounded-xl overflow-hidden bg-parchment" aria-label="Interactive 3D study of the Great Stupa">
      {!available && <p className="absolute p-4">This model requires WebGL. The site photographs are also available above.</p>}
    </div>
    {available && <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
      <span>Drag to orbit. Pinch or scroll to zoom.</span>
      <button className="underline" onClick={() => { const c = controlsRef.current; if (c) { c.object.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6); c.update(); } }}>Rotate view</button>
      <button className="underline" onClick={() => controlsRef.current?.reset()}>Reset view</button>
    </div>}
  </div>;
}
