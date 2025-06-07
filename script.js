import * as THREE from "three";

// Global vars
let scene, camera, renderer;
let video, videoTexture;
let handModel = null;
let handSpheres = [];
let handposeModel = null;

const info = document.getElementById("info");
const startBtn = document.getElementById("startBtn");

startBtn.addEventListener("click", async () => {
  startBtn.style.display = "none";
  await initCamera();
  initThree();
  await loadHandpose();
  animate();
});

async function initCamera() {
  video = document.createElement("video");
  video.style.display = "none";
  document.body.appendChild(video);

  const stream = await navigator.mediaDevices
    .getUserMedia({
      video: { facingMode: { exact: "environment" }, width: 640, height: 480 },
      audio: false,
    })
    .catch(async () => {
      // fallback to front camera if back camera fails
      return await navigator.mediaDevices.getUserMedia({ video: true });
    });

  video.srcObject = stream;
  await video.play();

  videoTexture = new THREE.VideoTexture(video);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.format = THREE.RGBFormat;
}

function initThree() {
  scene = new THREE.Scene();

  const width = window.innerWidth;
  const height = window.innerHeight;

  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 1.6, 3); // typical VR height and distance

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  document.body.appendChild(renderer.domElement);

  // Add live video as background
  const bgPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 9),
    new THREE.MeshBasicMaterial({ map: videoTexture })
  );
  bgPlane.position.z = -10;
  bgPlane.scale.setScalar(1.2);
  scene.add(bgPlane);

  // Simple room - just a box wireframe
  const room = new THREE.BoxGeometry(5, 3, 5);
  const roomMat = new THREE.MeshBasicMaterial({
    color: 0x444444,
    wireframe: true,
  });
  const roomMesh = new THREE.Mesh(room, roomMat);
  scene.add(roomMesh);

  // Add some interactive cubes
  const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const material = new THREE.MeshPhongMaterial({ color: 0x2194ce });

  for (let i = 0; i < 5; i++) {
    const cube = new THREE.Mesh(geometry, material.clone());
    cube.position.set(
      Math.random() * 3 - 1.5,
      1 + Math.random(),
      Math.random() * -2
    );
    cube.name = "cube" + i;
    scene.add(cube);
  }

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(0, 4, 4);
  scene.add(dirLight);

  // Create spheres for hand landmarks
  const sphereGeom = new THREE.SphereGeometry(0.02, 8, 8);
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  for (let i = 0; i < 21; i++) {
    const sphere = new THREE.Mesh(sphereGeom, sphereMat.clone());
    sphere.visible = false;
    scene.add(sphere);
    handSpheres.push(sphere);
  }

  // Handle device orientation for camera rotation
  window.addEventListener("deviceorientation", onDeviceOrientation, true);
}

let alpha = 0,
  beta = 0,
  gamma = 0;
function onDeviceOrientation(event) {
  alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0;
  beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;
  gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0;

  // Basic rotation based on beta and gamma (tilt)
  camera.rotation.x = beta - Math.PI / 2;
  camera.rotation.z = -gamma;
  camera.rotation.y = alpha;
}

async function loadHandpose() {
  handposeModel = await handpose.load();
  info.textContent = "Handpose model loaded.";
}

async function animate() {
  requestAnimationFrame(animate);

  if (handposeModel && video.readyState === video.HAVE_ENOUGH_DATA) {
    const predictions = await handposeModel.estimateHands(video, true);

    if (predictions.length > 0) {
      const landmarks = predictions[0].landmarks;

      // Map landmarks to Three.js coords (simple mapping)
      for (let i = 0; i < landmarks.length; i++) {
        const [x, y, z] = landmarks[i];

        // Video coordinates to normalized device coordinates (-1 to 1)
        const nx = (x / video.videoWidth) * 2 - 1;
        const ny = -((y / video.videoHeight) * 2 - 1);

        // Map to 3D space in front of camera
        const distance = 1; // distance from camera
        const vector = new THREE.Vector3(nx, ny, -distance);
        vector.unproject(camera);

        handSpheres[i].position.copy(vector);
        handSpheres[i].visible = true;
      }
    } else {
      handSpheres.forEach((s) => (s.visible = false));
    }
  }

  renderer.render(scene, camera);
}
