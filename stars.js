const DEBUG = true;

// Starry background animation
const canvas = document.getElementById('stars');
const ctx = canvas ? canvas.getContext('2d') : null;
let stars = [];
let mouseX = 0, mouseY = 0;
let animationId;
const isLowEndDevice = window.innerWidth * window.innerHeight > 1000000;

if (!canvas || !ctx) {
  console.error('stars.js: Canvas or context not found');
}

function resizeCanvas() {
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
  }
}

function initStars() {
  stars = [];
  const density = Math.min(window.innerWidth, window.innerHeight) / (isLowEndDevice ? 10 : 5);
  const starCount = Math.floor(density);
  
  for (let i = 0; i < starCount; i++) {
    const size = Math.random() * 2;
    stars.push({
      x: Math.random() * (canvas ? canvas.width : window.innerWidth),
      y: Math.random() * (canvas ? canvas.height : window.innerHeight),
      r: size,
      originalR: size,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      twinkle: Math.random() * 0.1,
      twinkleSpeed: 0.01 + Math.random() * 0.03
    });
  }
}

function drawStars() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (!isLowEndDevice) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  for (let star of stars) {
    star.r = Math.max(0.01, star.originalR + Math.sin(Date.now() * star.twinkleSpeed) * star.twinkle);
    
    const dx = mouseX - star.x;
    const dy = mouseY - star.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 150;
    
    if (dist < maxDist) {
      const angle = Math.atan2(dy, dx);
      const force = (maxDist - dist) / maxDist * 0.2;
      star.dx -= Math.cos(angle) * force;
      star.dy -= Math.sin(angle) * force;
    }
    
    const maxSpeed = 2;
    const speed = Math.sqrt(star.dx * star.dx + star.dy * star.dy);
    if (speed > maxSpeed) {
      star.dx = (star.dx / speed) * maxSpeed;
      star.dy = (star.dy / speed) * maxSpeed;
    }
    
    star.dx *= 0.99;
    star.dy *= 0.99;
    star.x += star.dx;
    star.y += star.dy;
    
    const gradientRadius = star.r * 3;
    const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, gradientRadius);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(star.x, star.y, gradientRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
    
    if (star.x < -50) star.x = canvas.width + 50;
    if (star.x > canvas.width + 50) star.x = -50;
    if (star.y < -50) star.y = canvas.height + 50;
    if (star.y > canvas.height + 50) star.y = -50;
  }
  
  animationId = requestAnimationFrame(drawStars);
}

function initStarAnimation() {
  if (canvas && ctx) {
    resizeCanvas();
    drawStars();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else if (ctx) {
        drawStars();
      }
    });
    if (DEBUG) console.log('stars.js: Star animation initialized');
  }
}

// Export for main.js
window.StarAnimation = { init: initStarAnimation };
