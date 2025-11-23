import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'https://unpkg.com/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';

const canvas = document.getElementById('three');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();

// Environment
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.background = new THREE.Color(0x0b0f14);

// Camera
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(2.5, 1.6, 3.2);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.6, 0);

// Ground
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1b2533, metalness: 0.0, roughness: 0.9 });
const ground = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.05, 64), groundMat);
ground.position.y = -0.025;
ground.receiveShadow = true;
scene.add(ground);

// Product mock: body + door + light indicator
const product = new THREE.Group();
scene.add(product);

// Base material (editable)
const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.2, roughness: 0.5 });

// Body
const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.0), baseMaterial.clone());
body.position.y = 0.5;
body.castShadow = true;
product.add(body);

// Door (pivoted on the side)
const doorPivot = new THREE.Object3D();
doorPivot.position.set(-0.8, 0.6, 0.5);
product.add(doorPivot);

const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), baseMaterial.clone());
door.position.set(0, 0, 0);
door.rotation.y = Math.PI; // face outward
// shift door so hinge aligns with pivot
const doorHolder = new THREE.Object3D();
doorHolder.position.set(0.6, -0.1, 0); // center to pivot
const doorFrame = new THREE.Group();
doorFrame.add(door);
doorHolder.add(doorFrame);
doorPivot.add(doorHolder);

// Indicator light
const indicatorMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000, metalness: 0.0, roughness: 0.3 });
const indicator = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24), indicatorMat);
indicator.rotation.x = Math.PI / 2;
indicator.position.set(0.6, 1.0, 0.51);
product.add(indicator);

// Scene lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x202020, 0.6);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(4, 6, 5);
keyLight.castShadow = false;
scene.add(keyLight);

// Toggleable point light (for "lights on")
const pointLight = new THREE.PointLight(0xffe9a6, 0.0, 10, 2);
pointLight.position.set(0.6, 1.0, 0.7);
scene.add(pointLight);

// Texture: simple checker generated on the fly
function makeChecker(size = 256, squares = 8) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const s = size / squares;
  for (let y = 0; y < squares; y++) {
    for (let x = 0; x < squares; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#222' : '#777';
      ctx.fillRect(x * s, y * s, s, s);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

let checkerTexture = makeChecker();

// UI bindings
const $ = (id) => document.getElementById(id);
const baseColorInput = $('baseColor');
const materialPresetSelect = $('materialPreset');
const textureSelect = $('textureSelect');
const toggleDoorBtn = $('toggleDoor');
const toggleLightChk = $('toggleLight');

function applyBaseColor(hex) {
  const color = new THREE.Color(hex);
  [body.material, door.material].forEach((m) => m.color.copy(color));
}

function applyPreset(preset) {
  const props = {
    plastic: { metalness: 0.1, roughness: 0.6 },
    metal:   { metalness: 1.0, roughness: 0.2 },
    matte:   { metalness: 0.0, roughness: 0.95 },
  }[preset];
  [body.material, door.material].forEach((m) => {
    m.metalness = props.metalness;
    m.roughness = props.roughness;
    m.needsUpdate = true;
  });
}

function applyTexture(sel) {
  const map = sel === 'checker' ? checkerTexture : null;
  [body.material, door.material].forEach((m) => {
    m.map = map;
    m.needsUpdate = true;
  });
}

let doorOpen = false;
function setDoor(open) {
  doorOpen = open;
}

function setLight(on) {
  const strength = on ? 1.4 : 0.0;
  pointLight.intensity = strength;
  indicator.material.emissive.setHex(on ? 0xffcc66 : 0x000000);
  indicator.material.needsUpdate = true;
}

// Init with defaults
applyBaseColor(baseColorInput.value);
applyPreset(materialPresetSelect.value);
applyTexture(textureSelect.value);

// Events
baseColorInput.addEventListener('input', (e) => applyBaseColor(e.target.value));
materialPresetSelect.addEventListener('change', (e) => applyPreset(e.target.value));
textureSelect.addEventListener('change', (e) => applyTexture(e.target.value));
toggleDoorBtn.addEventListener('click', () => setDoor(!doorOpen));
toggleLightChk.addEventListener('change', (e) => setLight(e.target.checked));

// Resize handling
function resizeRendererToDisplaySize() {
  const { clientWidth, clientHeight } = canvas;
  const needResize = canvas.width !== clientWidth || canvas.height !== clientHeight;
  if (needResize) {
    renderer.setSize(clientWidth, clientHeight, false);
  }
  return needResize;
}

function updateCameraAspect() {
  const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', () => {
  resizeRendererToDisplaySize();
  updateCameraAspect();
});
resizeRendererToDisplaySize();
updateCameraAspect();

// Animation loop
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  // Smooth door animation
  // Door rotates around Y at hinge; open to ~110 degrees
  const target = doorOpen ? 1.92 : 0.0; // radians
  doorPivot.rotation.y += (target - doorPivot.rotation.y) * 0.12;

  // Subtle product idle motion
  t += 0.01;
  product.position.y = 0.02 * Math.sin(t) + 0.0;

  renderer.render(scene, camera);
}
animate();
