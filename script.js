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
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: 640, height: 480 },
    audio: false,
  });
  video.srcObject = stream;

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

startBtn.addEventListener("click", startApp);
