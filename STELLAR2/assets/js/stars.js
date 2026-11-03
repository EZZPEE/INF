function initStars() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const bgCanvas = document.createElement('canvas');
    const bgCtx = bgCanvas.getContext('2d');

    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '1';
    canvas.style.pointerEvents = 'none';
    canvas.style.transform = 'translateZ(0)';
    document.body.prepend(canvas);

    let width, height;
    let dynamicStars = [];
    let shootingStars = [];
    const starColors = ['#ebc5c5', '#fffbe0', '#e0f2ff', '#ffd2a1', '#a1d5ff', '#ffb6b6', '#d4fbff'];

    function createStar(isDynamic = false) {
        let size;
        if (isDynamic) {
            size = Math.pow(Math.random(), 0.7) * 0.75 + 0.0005;
        } else {
            size = Math.pow(Math.random(), 3) * 0.45 + 0.005;
        }

        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: size,
            color: starColors[Math.floor(Math.random() * starColors.length)],
            baseOpacity: isDynamic ? Math.random() * 0.5 + 0.3 : Math.random() * 0.4 + 0.2,
            speedX: (Math.random() - 0.5) * (size * 0.005),
            speedY: (size * 0.008) + 0.002,
            twinkleSpeed: (Math.random() * 0.05 + 0.01) * (1 / size),
            twinklePhase: Math.random() * Math.PI * 2
        };
    }

    function resize() {
        width = canvas.width = bgCanvas.width = window.innerWidth;
        height = canvas.height = bgCanvas.height = window.innerHeight;

        const bgCount = Math.floor((width * height) / 20);

        bgCtx.fillStyle = '#000000';
        bgCtx.fillRect(0, 0, width, height);

        for (let i = 0; i < bgCount; i++) {
            const star = createStar(false);
            bgCtx.globalAlpha = star.baseOpacity;
            bgCtx.fillStyle = star.color;
            bgCtx.beginPath();
            bgCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            bgCtx.fill();
        }
        bgCtx.globalAlpha = 1;

        const dynamicCount = Math.floor(bgCount * 0.05);
        dynamicStars = Array.from({ length: dynamicCount }, () => createStar(true));
    }

    function createShootingStar() {
        shootingStars.push({
            x: Math.random() * width * 5,
            y: -50,
            speed: Math.random() * 8 + 5,
            len: Math.random() * 50 + 20,
            thickness: Math.random() * 0.8 + 0.2,
            opacity: 1
        });
    }

    function animate() {
        ctx.drawImage(bgCanvas, 0, 0);

        dynamicStars.forEach(star => {
            star.x += star.speedX;
            star.y -= star.speedY;

            if (star.y < 0) star.y = height;
            if (star.y > height) star.y = 0;
            if (star.x < 0) star.x = width;
            if (star.x > width) star.x = 0;

            const atmosTwinkle = (Math.random() - 0.5) * 0.35;
            let currentOpacity = star.baseOpacity + Math.sin(star.twinklePhase) * 0.2 + atmosTwinkle;
            currentOpacity = Math.max(0, Math.min(1, currentOpacity));
            star.twinklePhase += star.twinkleSpeed;

            ctx.globalAlpha = currentOpacity;
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.globalAlpha = 1;
        if (Math.random() < 0.015) createShootingStar();

        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const s = shootingStars[i];
            s.x -= s.speed * 0.8;
            s.y += s.speed;
            s.opacity -= 0.015;

            if (s.opacity <= 0 || s.x < 0 || s.y > height) {
                shootingStars.splice(i, 1);
                continue;
            }

            const grad = ctx.createLinearGradient(s.x, s.y, s.x + (s.len * 0.6), s.y - (s.len * 0.8));
            grad.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.beginPath();
            ctx.strokeStyle = grad;
            ctx.lineWidth = s.thickness;
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x + (s.len * 0.6), s.y - (s.len * 0.8));
            ctx.stroke();
        }

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    animate();
}

initStars();
