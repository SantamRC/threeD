import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loadingManager = new THREE.LoadingManager();

let assetsLoaded = false;

// Loader DOM
const loaderScreen = document.getElementById('loader');

// Track loading
loadingManager.onLoad = function () {
  console.log('All assets loaded!');
  loaderScreen.style.display = 'none'; // Hide loader
  assetsLoaded = true;
  animate(); // Start animation only after everything is ready
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0d0ff);

const loader = new GLTFLoader(loadingManager);

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
// createLabeledBuilding(-20, -10, 'Accenture', './static/accenture-logo.png');
// createLabeledBuilding(0, -10, 'Travelexic');
// createLabeledBuilding(20, -10, 'Digital Product School');
// createLabeledBuilding(0, 10, 'Workroom Automation');



const walkPoints = [
  { position: new THREE.Vector3(40, 0, 0), company: "Travelexic" },
  { position: new THREE.Vector3(0, 0, 0), company: "DPS" },
  { position: new THREE.Vector3(-40, 0, 0), company: "Workroom" },
  { position: new THREE.Vector3(-80, 0, 0), company: "Accenture" }
];

let currentIndex = 0;
let isWalking = false;


const infoPopup = document.getElementById("infoPopup");
const popupText = document.getElementById("popupText");
const nextButton = document.getElementById("nextButton");



//Loading Office Building Model
loader.load('./static/models/modern_office_building/scene.gltf', function ( gltf ) {

  gltf.scene.scale.set(30, 30, 30);
  gltf.scene.position.set(0, 0, 0);

  scene.add( gltf.scene );

}, undefined, function ( error ) {

  console.error( error );

} );





let walkMixer, waveMixer;
let walkingModel, wavingModel, idleModel;
const walkStart = new THREE.Vector3(50, 0, -50);
const walkTarget = new THREE.Vector3(50, 0, 0);
let sayingHi = true;  // Flag to check if the model is waving


//Loading Idle Man Model
loader.load('./static/models/idle_man/scene.gltf', function (gltf) {

  idleModel = gltf.scene;

  idleModel.scale.set(5, 5, 5);
  idleModel.position.set(walkTarget);
  idleModel.visible = false; // Hide initially

  scene.add(idleModel);

}, undefined, function (error) {

  console.error(error);

});


// Camera: Starts in front, looks at character path
const initialCamPos = new THREE.Vector3(70, 0, 30); // camera closer to front
const finalCamPos = new THREE.Vector3(50, 10, 60);   // camera gently backs away
camera.position.copy(initialCamPos);
camera.lookAt(new THREE.Vector3(0, 0, 0));


// Load Walking Model
loader.load('./static/models/man_walking/scene.gltf', function (gltf) {
  walkingModel = gltf.scene;
  walkingModel.scale.set(5, 5, 5);
  walkingModel.position.copy(walkStart);
  scene.add(walkingModel);

  walkMixer = new THREE.AnimationMixer(walkingModel);
  gltf.animations.forEach(clip => walkMixer.clipAction(clip).play());
}, undefined, console.error);


// Load Waving Model
loader.load('./static/models/man_waving_hand/scene.gltf', function (gltf) {
  wavingModel = gltf.scene;
  wavingModel.scale.set(5, 5, 5);
  wavingModel.visible = false; // Hide initially
  scene.add(wavingModel);

  waveMixer = new THREE.AnimationMixer(wavingModel);
  gltf.animations.forEach(clip => waveMixer.clipAction(clip));
}, undefined, console.error);

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
createStraightRoad(0, 0, 200);           // horizontal main road
createStraightRoad(0, -10, 30, false);  // to bottom buildings
createStraightRoad(0, 10, 30, false);   // to top buildings
createStraightRoad(40, 0, 50, false);
createStraightRoad(-40, 0, 50, false);
createStraightRoad(-80, 0, 50, false);
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


const clock = new THREE.Clock();


const nameTag = document.getElementById('nameTag');
const actionButton = document.getElementById('actionButton');

let uiShown = false;



function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (walkMixer) walkMixer.update(delta);
  if (waveMixer) waveMixer.update(delta);

  if (walkingModel && walkingModel.visible) {
    const speed = 5;
    const distance = walkingModel.position.distanceTo(walkTarget);

    if (distance > 0.1) {
      const direction = walkTarget.clone().sub(walkingModel.position).normalize();
      walkingModel.position.add(direction.multiplyScalar(speed * delta));

      const t = 1 - (distance / walkStart.distanceTo(walkTarget));
      camera.position.lerpVectors(initialCamPos, finalCamPos, t);
      camera.lookAt(walkingModel.position.clone().add(new THREE.Vector3(0, 5, 0)));
    } else if(sayingHi && distance <= 0.1) {
      walkingModel.visible = false;
      walkMixer.stopAllAction();
      wavingModel.position.copy(walkTarget);
      wavingModel.visible = true;
      wavingModel.lookAt(camera.position);

      sayingHi = false;

      const waveAction = waveMixer.clipAction(waveMixer._actions[0]._clip);
      if (!waveAction.isRunning()) {
        waveAction.play();

        if (!uiShown) {
          uiShown = true;
          nameTag.style.opacity = 1;
          actionButton.style.opacity = 1;
        }
      }
    }else{
      walkingModel.visible = false;
      walkMixer.stopAllAction();

      idleModel.position.copy(walkTarget);
      idleModel.visible = true;

      idleModel.lookAt(camera.position);

      popupText.textContent = `I worked at ${walkPoints[currentIndex].company}`;
      infoPopup.style.opacity = 1;

      isWalking = false;
      currentIndex++;
    }
  }

  renderer.render(scene, camera);
}

//animate();


// Handle resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


// actionButton.addEventListener("click", () => {
//   // Hide UI
//   nameTag.style.opacity = 0;
//   actionButton.style.opacity = 0;
//   uiShown = false;

//   // Set new walk start and target
//   walkStart.copy(walkTarget); // current position
//   walkTarget.set(40, 0, 0);     // new target position

//   // Hide waving model
//   wavingModel.visible = false;

//   // Reset walking model to current position
//   walkingModel.position.copy(walkStart);
//   walkingModel.visible = true;

//   // Look toward the new target
//   walkingModel.lookAt(walkTarget);

//   // Play walking animation again
//   walkMixer.clipAction(walkMixer._actions[0]._clip).reset().play();
// });



actionButton.addEventListener("click", () => {
  moveToNextPoint();
})



function moveToNextPoint() {
  if (currentIndex >= walkPoints.length) return;

  nameTag.style.opacity = 0;
  actionButton.style.opacity = 0;
  uiShown = false;

  const nextPoint = walkPoints[currentIndex];
  walkStart.copy(walkingModel.position);
  walkTarget.copy(nextPoint.position);

  // Reset and show walking model
  walkingModel.position.copy(walkStart);
  walkingModel.lookAt(walkTarget);
  idleModel.visible = false;
  wavingModel.visible = false;
  walkingModel.visible = true;

  // Start walking animation
  walkMixer.clipAction(walkMixer._actions[0]._clip).reset().play();
  infoPopup.style.opacity = 0;
  isWalking = true;
}


nextButton.addEventListener("click", () => {
  moveToNextPoint();
});