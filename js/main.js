const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ===============================
// 1. Particle class
// ===============================
class Particle {
  constructor(x, y, vx, vy, size, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
  }

  update(hand, particles) {
    // --- 1. Repulsion from hand ---
    const dx = this.x - hand.x;
    const dy = this.y - hand.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 100) {
      // only affect close particles
      const force = 100 / (dist * dist);
      this.vx += (dx / dist) * force;
      this.vy += (dy / dist) * force;
    }

    // --- 2. Cohesion / fluid smoothing ---
    const neighborDist = 50;
    particles.forEach((other) => {
      if (other === this) return;
      const ndx = other.x - this.x;
      const ndy = other.y - this.y;
      const ndist = Math.sqrt(ndx * ndx + ndy * ndy);

      if (ndist < neighborDist) {
        this.vx += (ndx / ndist) * 0.05;
        this.vy += (ndy / ndist) * 0.05;
      }
    });

    // --- 3. Damping ---
    this.vx *= 0.95;
    this.vy *= 0.95;

    // --- 4. Update position ---
    this.x += this.vx;
    this.y += this.vy;

    // --- 5. Bounce off edges ---
    if (this.x + this.size > canvas.width || this.x < 0) this.vx *= -1;
    if (this.y + this.size > canvas.height || this.y < 0) this.vy *= -1;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

// ===============================
// 2. Create particles
// ===============================
const particles = [];
const numParticles = 50;

for (let i = 0; i < numParticles; i++) {
  const size = Math.random() * 20 + 10;
  particles.push(
    new Particle(
      Math.random() * window.innerWidth,
      Math.random() * window.innerHeight,
      0, // start still
      0, // start still
      size,
      "red"
    )
  );
}

// ===============================
// 3. Hand tracking setup
// ===============================
const hand = { x: -1000, y: -1000 };

const video = document.createElement("video");
video.style.display = "none";
document.body.appendChild(video);

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  },
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.8,
  minTrackingConfidence: 0.8,
});

hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    hand.x = landmarks[8].x * canvas.width;
    hand.y = landmarks[8].y * canvas.height;
  } else {
    hand.x = -1000;
    hand.y = -1000;
  }
});

const cameraFeed = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 640,
  height: 480,
});
cameraFeed.start();

// ===============================
// 4. Draw & update
// ===============================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p) => p.draw(ctx));
}

function update() {
  particles.forEach((p) => p.update(hand, particles));
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// ===============================
// 5. Canvas resize
// ===============================
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
loop();
window.addEventListener("resize", resizeCanvas);
