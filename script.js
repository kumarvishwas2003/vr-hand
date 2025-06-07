const startBtn = document.getElementById("startBtn");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const logDiv = document.getElementById("log");

let model = null;
let detecting = false;

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  startBtn.innerText = "Starting camera...";

  try {
    await setupCamera();
    video.style.display = "block";

    // Set canvas size same as video
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

    if (predictions.length > 0) {
      log("Hands detected: " + predictions.length);

      // Draw landmarks for each detected hand
      predictions.forEach((hand) => {
        drawHand(hand.landmarks);
      });
    } else {
      log("No hands detected");
    }

    await new Promise((r) => setTimeout(r, 100)); // 10fps approx
  }
}

function drawHand(landmarks) {
  ctx.fillStyle = "red";
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;

  // Draw circles for each landmark
  landmarks.forEach(([x, y, z]) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Connect landmarks with lines for fingers
  // Handpose landmarks indexing (simplified connections)
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

function log(msg) {
  const now = new Date().toLocaleTimeString();
  logDiv.textContent = `[${now}] ${msg}\n` + logDiv.textContent;
}
