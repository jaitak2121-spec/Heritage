import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Stagger the stone courses and vary the blocks without loading an image atlas.
function masonry() {
  const tile = document.createElement('canvas');
  tile.width = 1024;
  tile.height = 512;
  const ctx = tile.getContext('2d');
  ctx.fillStyle = '#977c65';
  ctx.fillRect(0, 0, 1024, 512);
  let seed = 21;
  function noise() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let row = 0; row < 20; row++) {
    const offset = row % 2 * 32;
    for (let x = -offset; x < 1024; x += 64) {
      ctx.fillStyle = `hsl(29 27% ${53 + noise() * 14}%)`;
      ctx.fillRect(x, row * 25.6, 62.5, 24.5);
    }
  }
  const texture = new THREE.CanvasTexture(tile);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(4.2, 3.1, 10.6);
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
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }
    part(new THREE.CylinderGeometry(3.6, 3.7, 0.22, 64), 0, 0, 0);
    part(new THREE.CylinderGeometry(2.35, 2.5, 0.55, 64), 0, 0.37, 0);
    const texture = masonry();
    const facing = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
    part(new THREE.SphereGeometry(2.15, 80, 40, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.64, 0, facing);
    // Instance the two stone enclosures so the hundreds of rails share draw calls.
    function enclosure(radius, floor, height, count, openings) {
      const matrices = [];
      const block = new THREE.Object3D();
      function segment(angle, width, h, depth, y) {
        block.position.set(radius * Math.sin(angle), y, radius * Math.cos(angle));
        block.rotation.y = angle;
        block.scale.set(width, h, depth);
        block.updateMatrix();
        matrices.push(block.matrix.clone());
      }
      const step = 2 * Math.PI / count;
      for (let i = 0; i < count; i++) {
        const angle = i * step;
        if (openings && i % (count / 4) === 0) continue;
        segment(angle, height * .21, height, height * .23, floor + height / 2);
        if (openings && (i + 1) % (count / 4) === 0) continue;
        for (const level of [.23, .50, .77, 1]) {
          segment(angle + step / 2, 2 * radius * Math.sin(step / 2), height * .14, height * .17, floor + height * level);
        }
      }
      const fence = new THREE.InstancedMesh(new THREE.BoxGeometry(), stone, matrices.length);
      matrices.forEach((m, i) => fence.setMatrixAt(i, m));
      fence.castShadow = fence.receiveShadow = true;
      scene.add(fence);
    }
    enclosure(3.12, .11, .66, 48, true);
    enclosure(2.32, .64, .32, 64, true);
    for (let i = 0; i < 7; i++) {
      const h = (i + 1) * .077;
      part(new THREE.BoxGeometry(.57, h, .13), 0, .11 + h / 2, 2.98 - i * .115);
    }
    part(new THREE.BoxGeometry(.85, .12, .85), 0, 2.83, 0, carved);
    for (const x of [-.39, 0, .39]) for (const z of [-.39, 0, .39]) {
      if (x || z) part(new THREE.BoxGeometry(.08,.32,.08), x, 3, z);
    }
    for (const y of [2.98,3.12]) for (const side of [-.39,.39]) {
      part(new THREE.BoxGeometry(.85,.06,.06), 0,y,side);
      part(new THREE.BoxGeometry(.06,.06,.85), side,y,0);
    }
    part(new THREE.CylinderGeometry(0.045, 0.055, 1.05), 0, 3.52, 0);
    [0.47, 0.36, 0.24].forEach((r, i) => part(new THREE.ConeGeometry(r, 0.13, 32), 0, 3.33 + i * 0.29, 0));
    for (let i = 0; i < 4; i++) {
      const gate = new THREE.Group();
      gate.rotation.y = i * Math.PI / 2;
      scene.add(gate);
      for (const x of [-0.45, 0.45]) part(new THREE.BoxGeometry(0.16, 1.5, 0.2), x, 0.85, 3, carved, gate);
      for (const x of [-.45,.45]) {
        part(new THREE.BoxGeometry(.27,.16,.28), x,1.35,3,stone,gate);
        part(new THREE.BoxGeometry(.23,.09,.26), x,.17,3,stone,gate);
      }
      for (const y of [1.49, 1.72, 1.95]) {
        const beam = new THREE.Shape();
        beam.moveTo(-.84,.08);
        beam.quadraticCurveTo(0,-.075,.84,.08);
        beam.lineTo(.84,.22);
        beam.quadraticCurveTo(0,.065,-.84,.22);
        beam.closePath();
        part(new THREE.ExtrudeGeometry(beam,{depth:.14, bevelEnabled:false}),0,y,2.93,stone,gate);
        for (const x of [-.45,0,.45]) part(new THREE.BoxGeometry(.10,.12,.12),x,y-.05,3,carved,gate);
      }
    }
    scene.add(new THREE.HemisphereLight(0xfff3d9, 0x73513d, 2));
    const sun = new THREE.DirectionalLight(0xffe0ba, 2.2);
    sun.position.set(4, 8, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024,1024);
    sun.shadow.normalBias = .012;
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
      texture.dispose();
      facing.dispose();
      sun.shadow.dispose();
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
