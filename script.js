const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");

let model, videoWidth, videoHeight;
let targetCircle = {
  x: 200,
  y: 200,
  r: 30,
  color: "blue",
};
async function setupCamera() {
  try {
    // Try back camera first
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { exact: "environment" }, // Force rear camera
        width: 640,
        height: 480,
      },
      audio: false,
    });
    video.srcObject = stream;
    console.log("✅ Back camera activated.");
  } catch (err) {
    console.warn("⚠️ Back camera failed, switching to front...", err);

    // Fallback to front camera
    const fallbackStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user", // Front camera fallback
        width: 640,
        height: 480,
      },
      audio: false,
    });
    video.srcObject = fallbackStream;
    console.log("✅ Front camera fallback activated.");
  }

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}



async function detectHands() {
  const predictions = await model.estimateHands(video);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Draw target circle
  ctx.beginPath();
  ctx.arc(targetCircle.x, targetCircle.y, targetCircle.r, 0, 2 * Math.PI);
  ctx.fillStyle = targetCircle.color;
  ctx.fill();

  if (predictions.length > 0) {
    const indexFinger = predictions[0].landmarks[8];
    const [x, y] = indexFinger;

    // Draw fingertip
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();

    const dx = x - targetCircle.x;
    const dy = y - targetCircle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    targetCircle.color = distance < targetCircle.r ? "green" : "blue";
  }

  requestAnimationFrame(detectHands);
}

async function startApp() {
  startBtn.style.display = "none";
  await setupCamera();
  video.play();

  videoWidth = video.videoWidth;
  videoHeight = video.videoHeight;
  canvas.width = videoWidth;
  canvas.height = videoHeight;

  model = await handpose.load();

  video.style.display = "block";
  detectHands();
}

startBtn.addEventListener("click", () => {
  console.log("Start button clicked ✅");
  startBtn.innerText = "Loading camera...";
  startBtn.style.backgroundColor = "#555";
  startBtn.disabled = true;

  const msg = document.createElement("p");
  msg.innerText = "Camera permission should appear now...";
  msg.style.color = "lightgreen";
  document.body.appendChild(msg);

  startApp(); // Call the original function
});


