let video, canvas, ctx, model;

const startBtn = document.getElementById("startBtn");
const info = document.getElementById("info");

startBtn.addEventListener("click", async () => {
  startBtn.style.display = "none";
  info.innerText = "Loading camera...";

  try {
    await setupCamera();
    await tf.setBackend("webgl");
    await tf.ready();
    model = await handpose.load();
    info.innerText = "Model loaded! 🖐️ Show your hand.";
    startDetection();
  } catch (err) {
    console.error("Setup failed:", err);
    info.innerText = `Camera error: ${err.name || "Unknown"} - ${
      err.message || err
    }`;
  }
});

async function setupCamera() {
  video = document.createElement("video");
  video.setAttribute("playsinline", "true"); // Required for iOS
  video.style.display = "none";
  document.body.appendChild(video);

  // Try ideal back camera, fallback to default
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
  } catch {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
  }

  video.srcObject = stream;
  await video.play();

  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  // Match canvas to video size
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

function startDetection() {
  const obj = { x: canvas.width / 2, y: canvas.height / 2, radius: 30 };

  async function detect() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const predictions = await model.estimateHands(video);
    if (predictions.length > 0) {
      const tip = predictions[0].annotations.indexFinger[3]; // tip of index finger
      const [x, y] = tip;

      // Draw pointer
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = "lime";
      ctx.fill();

      // Check collision
      const dx = x - obj.x;
      const dy = y - obj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      ctx.beginPath();
      ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
      ctx.fillStyle = dist < obj.radius + 10 ? "cyan" : "red";
      ctx.fill();
    } else {
      // Draw static object if no hand
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
    }

    requestAnimationFrame(detect);
  }

  detect();
}
