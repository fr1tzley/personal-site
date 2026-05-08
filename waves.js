// =============================================================================
// WAVE BACKGROUND CONFIG
// All tunable parameters live here. Tweak freely.
// =============================================================================
const CONFIG = {
    // --- Appearance ---
    lineCount:        14,                       // how many wave lines to draw
    lineColor:        'rgba(100, 255, 218, 0.18)', // CSS color for the strokes
    lineWidth:        1,                        // stroke thickness in px

    // --- Wave shape ---
    baseAmplitude:    22,    // average vertical wave height (px)
    amplitudeJitter:  10,    // how much amplitude varies line-to-line (px)
    wavelength:       560,   // horizontal distance for one full wave (px)
    wavelengthJitter: 120,   // line-to-line wavelength variation (px)

    // --- Motion ---
    waveSpeed:        0.0006, // multiplied by elapsed time in ms (higher = faster)
    phaseOffsetPerLine: 0.5,  // radians of phase shift between adjacent lines

    // --- Layout ---
    verticalSpacing:  60,    // vertical gap between line baselines (px)
    verticalCenter:   0.5,   // 0 = top of screen, 0.5 = middle, 1 = bottom

    // --- Rendering quality ---
    segments:         120,   // points per line (higher = smoother but slower)

    // --- Mouse interaction ---
    // Influence is a smooth bump that parts the waves around the cursor:
    // lines above are pulled up, lines below pushed down, with no discontinuity
    // as the cursor crosses a line.
    mouseStrength:    40,    // peak displacement (px). Positive = part away, negative = pull toward
    mouseFalloffX:    320,   // horizontal Gaussian width (px) — how far along the wave the bump reaches
    mouseFalloffY:    180,   // vertical width (px) — peak displacement occurs at this distance / √2 above and below
    mouseEase:        0.12,  // 0..1 — smoothing on cursor (lower = more lag, smoother flow)
};
// =============================================================================

const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let width = 0;
let height = 0;
const dpr = Math.min(window.devicePixelRatio || 1, 2);

// Normalizes the dipole peak magnitude so it equals mouseStrength.
const DIPOLE_NORM = Math.sqrt(2 * Math.E);

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener('resize', resize);

const target = { x: -9999, y: -9999 };
const mouse = { x: -9999, y: -9999, active: false };

window.addEventListener('mousemove', (e) => {
    target.x = e.clientX;
    target.y = e.clientY;
    mouse.active = true;
});
window.addEventListener('mouseleave', () => {
    mouse.active = false;
});
window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        target.x = e.touches[0].clientX;
        target.y = e.touches[0].clientY;
        mouse.active = true;
    }
}, { passive: true });
window.addEventListener('touchend', () => { mouse.active = false; });

function draw(time) {
    ctx.clearRect(0, 0, width, height);

    // Smoothly ease the cursor toward the latest pointer position.
    if (mouse.active) {
        mouse.x += (target.x - mouse.x) * CONFIG.mouseEase;
        mouse.y += (target.y - mouse.y) * CONFIG.mouseEase;
    }

    ctx.strokeStyle = CONFIG.lineColor;
    ctx.lineWidth = CONFIG.lineWidth;

    const totalSpan = (CONFIG.lineCount - 1) * CONFIG.verticalSpacing;
    const startY = height * CONFIG.verticalCenter - totalSpan / 2;
    const invFalloffXsq = 1 / (CONFIG.mouseFalloffX * CONFIG.mouseFalloffX);
    const invFalloffY = 1 / CONFIG.mouseFalloffY;

    for (let i = 0; i < CONFIG.lineCount; i++) {
        const baseY = startY + i * CONFIG.verticalSpacing;
        const amp = CONFIG.baseAmplitude + Math.sin(i * 1.3) * CONFIG.amplitudeJitter;
        const wl = CONFIG.wavelength + Math.cos(i * 0.7) * CONFIG.wavelengthJitter;
        const phase = i * CONFIG.phaseOffsetPerLine + time * CONFIG.waveSpeed;

        // Per-line vertical shape: smooth dipole, n·exp(-n²). Crosses zero
        // exactly at the cursor's y, peaks at n = ±1/√2, decays beyond.
        // No sign-flip discontinuity, so lines glide rather than snap.
        let lineFactor = 0;
        if (mouse.active) {
            const n = (baseY - mouse.y) * invFalloffY;
            lineFactor = CONFIG.mouseStrength * DIPOLE_NORM * n * Math.exp(-n * n);
        }

        ctx.beginPath();
        for (let s = 0; s <= CONFIG.segments; s++) {
            const x = (s / CONFIG.segments) * width;
            let y = baseY + amp * Math.sin((x / wl) * Math.PI * 2 + phase);

            if (lineFactor !== 0) {
                const dx = x - mouse.x;
                const hFalloff = Math.exp(-(dx * dx) * invFalloffXsq);
                y += lineFactor * hFalloff;
            }

            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
