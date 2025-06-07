const startBtn = document.getElementById("startBtn");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const logDiv = document.getElementById("log");

let model = null;
let detecting = false;

// Define some objects with position and radius
const objects = [
  { x: 100, y: 100, radius: 30, color: "blue", active: false },
  { x: 220, y: 140, radius: 40, color: "orange", active: false },
  { x: 150, y: 200, radius: 25, color: "purple", active: false },
];

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  startBtn.innerText = "Starting camera...";

  try {
    await setupCamera();
    video.style.display = "block";

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    startBtn.innerText = "Loading model...";
    await initTfBackend();

    model = await handpose.load();
    startBtn.innerText = "Detecting hands...";

    detecting = true;
    detectHands();
  } catch (err) {
    log("Error: " + err.message);
    startBtn.disabled = false;
    startBtn.innerText = "Start Camera";
  }
});

async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { exact: "environment" },
        width: 640,
        height: 480,
      },
      audio: false,
    });
    video.srcObject = stream;
  } catch (e) {
    console.warn("Rear camera not found, using front camera.", e);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 640, height: 480 },
      audio: false,
    });
    video.srcObject = stream;
  }

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      video.play();
      resolve(video);
    };
  });
}

async function initTfBackend() {
  await tf.setBackend("webgl");
  await tf.ready();
  log("TensorFlow.js backend: " + tf.getBackend());
}

async function detectHands() {
  while (detecting) {
    const predictions = await model.estimateHands(video);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw interactive objects
    drawObjects();

    if (predictions.length > 0) {
      log("Hands detected: " + predictions.length);

      predictions.forEach((hand) => {
        drawHand(hand.landmarks);
        checkInteraction(hand.landmarks);
      });
    } else {
      log("No hands detected");
      // Reset objects if no hands
      objects.forEach((obj) => (obj.active = false));
    }

    await new Promise((r) => setTimeout(r, 100));
  }
}

function drawObjects() {
  objects.forEach((obj) => {
    ctx.beginPath();
    ctx.fillStyle = obj.active ? "lime" : obj.color;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  });
}

function drawHand(landmarks) {
  ctx.fillStyle = "red";
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;

  landmarks.forEach(([x, y, z]) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
  });

  const fingers = [
    [0, 1, 2, 3, 4], // Thumb
    [0, 5, 6, 7, 8], // Index
    [0, 9, 10, 11, 12], // Middle
    [0, 13, 14, 15, 16], // Ring
    [0, 17, 18, 19, 20], // Pinky
  ];

  fingers.forEach((finger) => {
    ctx.beginPath();
    ctx.moveTo(landmarks[finger[0]][0], landmarks[finger[0]][1]);
    for (let i = 1; i < finger.length; i++) {
      ctx.lineTo(landmarks[finger[i]][0], landmarks[finger[i]][1]);
    }
    ctx.stroke();
  });
}

// Check if index fingertip is touching any object
function checkInteraction(landmarks) {
  // Index fingertip is landmark 8
  const [x, y] = landmarks[8];

  objects.forEach((obj) => {
    const dist = Math.hypot(x - obj.x, y - obj.y);
    if (dist < obj.radius + 10) {
      // 10 px tolerance
      obj.active = true;
    } else {
      obj.active = false;
    }
  });
}

function log(msg) {
  const now = new Date().toLocaleTimeString();
  logDiv.textContent = `[${now}] ${msg}\n` + logDiv.textContent;
}
