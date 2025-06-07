const startBtn = document.getElementById("startBtn");
const video = document.getElementById("video");
const logDiv = document.getElementById("log");

let model = null;
let detecting = false;

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  startBtn.innerText = "Starting camera...";

  try {
    await setupCamera();
    video.style.display = "block";

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
  // Try rear camera first, fallback to front camera if error
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

    if (predictions.length > 0) {
      log("Hands detected: " + predictions.length);
      // Log first hand landmarks count for example
      log("Landmarks: " + predictions[0].landmarks.length);
    } else {
      log("No hands detected");
    }

    await new Promise((r) => setTimeout(r, 200)); // wait 200ms before next detect
  }
}

function log(msg) {
  const now = new Date().toLocaleTimeString();
  logDiv.textContent = `[${now}] ${msg}\n` + logDiv.textContent;
}
