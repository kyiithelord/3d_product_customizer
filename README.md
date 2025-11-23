# 3D Product Customizer

A minimal, production-ready baseline for an e‑commerce style 3D customizer.

- Rotate the product (OrbitControls)
- Change colors and material presets (metal/plastic/matte)
- Switch textures (example checker)
- Animate parts (door open/close)
- Toggle emissive light ("lights on")

Files:
- `index.html` – UI + script entry
- `styles.css` – minimal UI styling
- `src/app.js` – Three.js scene

## Quick start

1) Serve statically (any http server):

```bash
python3 -m http.server 8000 --directory /home/akyii/Desktop/threed
```

2) Open http://localhost:8000 in a browser.

No build step required (Three.js via CDN ESM).

## Replace mock with a real GLB (Blender → GLB/GLTF)

Export from Blender:
- Use metal/roughness workflow.
- Apply transforms; set +Y up / -Z forward (default glTF).
- Pack/bake textures to avoid path issues.

Drop assets:
- Put your model in `assets/model.glb` (create the folder).
- Put textures in `assets/textures/` if any external images.

Load in code (`src/app.js`):

```js
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('./assets/model.glb', (gltf) => {
  const root = gltf.scene;
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      if (o.material && o.material.isMeshStandardMaterial) {
        o.material.envMapIntensity = 1.0;
      }
    }
  });

  // Example: assign references by name from Blender
  // const body = root.getObjectByName('Body');
  // const doorPivot = root.getObjectByName('DoorPivot');

  product.add(root);
});
```

Then map UI to your real mesh parts:
- Replace the current `body`/`door` references with meshes from `root.getObjectByName()`.
- Keep `applyBaseColor`, `applyPreset`, and `applyTexture` to modify materials.
- Keep `setDoor()` to rotate your door hinge object.

## Textures (PBR)

- Albedo/baseColor → `material.map`
- Roughness → `material.roughnessMap`
- Metalness → `material.metalnessMap`
- Normal → `material.normalMap`
- AO → `material.aoMap` (requires 2nd UV channel)

Example to apply a loaded texture:

```js
import { TextureLoader } from 'https://unpkg.com/three@0.160.0/build/three.module.js';
const texLoader = new TextureLoader();
const baseColor = texLoader.load('./assets/textures/basecolor.jpg', (t) => {
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
});
body.material.map = baseColor; body.material.needsUpdate = true;
```

## React + Three Fiber (optional)

This plain Three.js scaffold is intentionally minimal. For React projects:
- Use `@react-three/fiber` for rendering and hooks
- Use `@react-three/drei` for controls, environment, loaders
- Port logic for color/preset/texture toggles into React state

## Notes for production

- Bake/optimize: reduce polygon count, bake normals/AO; use KTX2 textures (BasisU) when bundling.
- Use PMREM and ACES tone mapping (already configured) for better PBR look.
- Consider shadows (enabled on meshes/lights) when you switch to a GLB.
- Preload assets and show a progress bar for better UX.
