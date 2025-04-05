import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0d0ff);

const loader = new GLTFLoader();

// Camera & Renderer
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(30, 40, 60);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(50, 50, -30);
scene.add(dirLight);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  new THREE.MeshStandardMaterial({ color: 0x66cc66 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Helper: Label Texture
function createTextTexture(text, maxWidth = 10) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1024;
  canvas.height = 256;

  const fontSize = 64;
  ctx.font = `${fontSize}px sans-serif`;
  const textWidth = ctx.measureText(text).width;

  // Scale down font if text is too wide
  let scaleFactor = Math.min(1, (maxWidth * 100) / textWidth);
  let finalFontSize = fontSize * scaleFactor;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = `${finalFontSize}px sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  return new THREE.CanvasTexture(canvas);
}

// Helper: Create Building with Label
function createLabeledBuilding(x, z, label, logoURL = null) {
  const width = 10;
  const height = 20;
  const depth = 10;

  const building = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  building.position.set(x, height / 2, z);
  scene.add(building);

  // Add Label
  const textTexture = createTextTexture(label, width);
  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 2),
    new THREE.MeshBasicMaterial({ map: textTexture, transparent: true })
  );
  labelMesh.position.set(x, height + 1, z + depth / 2 + 0.05); // front face
  scene.add(labelMesh);

  // Add Logo
  if (logoURL) {
    const loader = new THREE.TextureLoader();
    loader.load(logoURL, (texture) => {
      const logoMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 4),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true })
      );
      logoMesh.position.set(x, height / 2, z + depth / 2 + 0.1);
      scene.add(logoMesh);
    });
  }
}

// Add Buildings
createLabeledBuilding(-20, -10, 'Accenture', 'static/accenture-logo.png');
createLabeledBuilding(0, -10, 'Travelexic');
createLabeledBuilding(20, -10, 'Digital Product School');
createLabeledBuilding(0, 10, 'Workroom Automation');


loader.load('static/models/modern_office_building/scene.gltf', function ( gltf ) {

  gltf.scene.scale.set(30, 30, 30);
  gltf.scene.position.set(0, 0, 0);

  scene.add( gltf.scene );

}, undefined, function ( error ) {

  console.error( error );

} );

// Trees
for (let i = -40; i <= 40; i += 10) {
  createTree(i, -25);
  createTree(i, 25);
}
function createTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  trunk.position.set(x, 2, z);

  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(2),
    new THREE.MeshStandardMaterial({ color: 0x228b22 })
  );
  leaves.position.set(x, 6, z);

  scene.add(trunk, leaves);
}

// Roads
createStraightRoad(0, 0, 60);           // horizontal main road
createStraightRoad(0, -10, 30, false);  // to bottom buildings
createStraightRoad(0, 10, 30, false);   // to top buildings
createCurvedRoad(0, 20, 20, Math.PI, Math.PI * 1.5);

function createStraightRoad(x, z, length, isHorizontal = true) {
  const geo = new THREE.BoxGeometry(isHorizontal ? length : 4, 0.1, isHorizontal ? 4 : length);
  const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const road = new THREE.Mesh(geo, mat);
  road.position.set(x, 0.05, z);
  scene.add(road);
}
function createCurvedRoad(centerX, centerZ, radius, startAngle, endAngle) {
  const curve = new THREE.ArcCurve(centerX, centerZ, radius, startAngle, endAngle, false);
  const points = curve.getSpacedPoints(50);
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

  points.forEach((p, i) => {
    if (i % 2 === 0 && i + 1 < points.length) {
      const dx = points[i + 1].x - p.x;
      const dz = points[i + 1].y - p.y;
      const angle = Math.atan2(dz, dx);

      const roadPiece = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.1, 4),
        roadMaterial
      );

      roadPiece.position.set(p.x, 0.05, p.y);
      roadPiece.rotation.y = -angle;
      scene.add(roadPiece);
    }
  });
}

// Animate
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Handle resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
