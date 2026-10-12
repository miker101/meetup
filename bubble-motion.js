
document.addEventListener("DOMContentLoaded", () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const sections = document.querySelectorAll(
        ".join-main, .create-main"
    );

    sections.forEach((section) => {
        const bubbles = [
            {
                x: 15,
                y: 15,
                size: 270,
                vx: 90,
                vy: 65,
                xProperty: "--bubble-x",
                yProperty: "--bubble-y"
            },
            {
                x: 200,
                y: 250,
                size: 220,
                vx: -75,
                vy: 95,
                xProperty: "--bubble-x-after",
                yProperty: "--bubble-y-after"
            }
        ];

        let previousTime = 0;

        function animate(time) {
            if (!section.isConnected) return;

            if (!previousTime) previousTime = time;

            const delta = Math.min(
                (time - previousTime) / 1000,
                0.04
            );

            previousTime = time;

            const maxX = section.clientWidth;
            const maxY = section.clientHeight;

            bubbles.forEach((bubble) => {
                const limitX = Math.max(0, maxX - bubble.size);
                const limitY = Math.max(0, maxY - bubble.size);

                bubble.x += bubble.vx * delta;
                bubble.y += bubble.vy * delta;

                if (bubble.x <= 0 || bubble.x >= limitX) {
                    bubble.x = Math.max(0, Math.min(bubble.x, limitX));
                    bubble.vx *= -1;
                }

                if (bubble.y <= 0 || bubble.y >= limitY) {
                    bubble.y = Math.max(0, Math.min(bubble.y, limitY));
                    bubble.vy *= -1;
                }

                section.style.setProperty(
                    bubble.xProperty,
                    `${bubble.x}px`
                );

                section.style.setProperty(
                    bubble.yProperty,
                    `${bubble.y}px`
                );
            });

            requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
    });
});
