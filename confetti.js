(function () {
  function runConfetti(durationMs = 3000) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.position = 'fixed';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '9999';
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d');

      const colors = ['#ff5252', '#ffb74d', '#ffd54f', '#81c784', '#64b5f6', '#ba68c8'];
      const particleCount = Math.min(240, Math.floor((window.innerWidth * window.innerHeight) / 14000));

      // Helper for random in range
      const rnd = (min, max) => min + Math.random() * (max - min);

      const particles = Array.from({ length: particleCount }, () => {
        const angle = Math.random() * Math.PI * 2;
        const size = rnd(6, 12);
        return {
          // position & start time
          x: Math.random() * canvas.width,
          y: -40 - Math.random() * 200,
          bornDelay: Math.random() * durationMs * 0.6, // часть частиц стартует позже
          // visuals
          size,
          color: colors[(Math.random() * colors.length) | 0],
          alphaBase: rnd(0.75, 1),
          shape: Math.random() < 0.4 ? 'rect' : (Math.random() < 0.5 ? 'circle' : 'rect'),
          // motion
          vx: Math.cos(angle) * rnd(0.2, 2.2),
          vy: rnd(2.4, 4),
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.35,
          swayAmp: rnd(0.8, 6),
          swayPeriod: rnd(280, 950),
          phase: Math.random() * 1000,
          windScale: rnd(0.3, 1.3),
        };
      });

      let startTs = null;
      const overflowMargin = 40; // сколько ниже низа экрана должен упасть конфетти

      function drawParticle(p, t) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alphaBase * (0.9 + 0.1 * Math.sin((t + p.phase) / 200)); // лёгкое мерцание
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      function allParticlesExited(t) {
        // считаем только начавшие частицы
        return particles.every(p => t >= p.bornDelay && p.y > canvas.height + overflowMargin);
      }

      function step(ts) {
        if (startTs === null) startTs = ts;
        const elapsed = ts - startTs;

        // Временной ветер: комбинация нескольких синусоид => псевдослучайное изменение
        const wind = Math.sin(elapsed / 700) * 0.6 + Math.sin(elapsed / 1230) * 0.4 + Math.sin(elapsed / 310) * 0.2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
          if (elapsed < p.bornDelay) continue; // ещё не началась

          // горизонтальное колебание (sway) + ветер
          const sway = Math.sin((elapsed + p.phase) / p.swayPeriod) * p.swayAmp;
          p.x += p.vx + wind * p.windScale + sway * 0.08;

          // вертикальное движение с гравитацией и лёгким сопротивлением
          p.y += p.vy;
          p.vy += 0.035; // gravity
          p.vx *= 0.995; // drag
          p.vy *= 1.002;

          p.rot += p.vrot;

          // горизонтальная обёртка, чтобы частицы могли возвращаться
          if (p.x < -20) p.x = canvas.width + 20;
          if (p.x > canvas.width + 20) p.x = -20;

          drawParticle(p, elapsed);
        }

        if (elapsed < durationMs) {
          requestAnimationFrame(step);
        } else {
          // после основной длительности ждём, пока все активные частицы уйдут за нижнюю грань (или по таймауту)
          if (!allParticlesExited(elapsed) && elapsed < durationMs + 5000) {
            requestAnimationFrame(step);
          } else {
            cleanup();
            resolve();
          }
        }
      }

      function onResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      function cleanup() {
        window.removeEventListener('resize', onResize);
        if (canvas.parentNode) {
          document.body.removeChild(canvas);
        }
      }

      window.addEventListener('resize', onResize);
      requestAnimationFrame(step);
    });
  }

  window.runConfetti = runConfetti;
})();
