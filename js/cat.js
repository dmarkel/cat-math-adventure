/* Whisker the cat: an SVG with moods, plus tiny sound + confetti helpers. */

function catSVG(mood = 'happy', size = 160) {
  // moods: happy, excited, thinking, sleepy
  const mouth = {
    happy:    '<path d="M72 96 q8 8 16 0" class="cat-line"/>',
    excited:  '<path d="M70 94 q10 14 20 0 z" fill="#a8503c"/>',
    thinking: '<path d="M74 98 h12" class="cat-line"/>',
    sleepy:   '<path d="M72 98 q8 5 16 0" class="cat-line"/>',
  }[mood];
  const eyes = mood === 'sleepy'
    ? '<path d="M58 76 q7 6 14 0 M88 76 q7 6 14 0" class="cat-line"/>'
    : `<g class="cat-eyes">
         <circle cx="65" cy="76" r="7" fill="#3d2b1f"/>
         <circle cx="95" cy="76" r="7" fill="#3d2b1f"/>
         <circle cx="67.5" cy="73.5" r="2.5" fill="#fff"/>
         <circle cx="97.5" cy="73.5" r="2.5" fill="#fff"/>
       </g>`;
  return `
  <svg viewBox="0 0 160 160" width="${size}" height="${size}" class="cat cat--${mood}" aria-label="Whisker the cat">
    <style>
      .cat-line{stroke:#3d2b1f;stroke-width:3;fill:none;stroke-linecap:round}
      .cat .tail{transform-origin:128px 128px;animation:tailwag 2.4s ease-in-out infinite}
      .cat--excited .tail{animation-duration:.7s}
      .cat-eyes{animation:blink 4.5s infinite}
      @keyframes tailwag{0%,100%{transform:rotate(0)}50%{transform:rotate(18deg)}}
      @keyframes blink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.08)}}
      .cat-eyes{transform-origin:80px 76px}
    </style>
    <!-- tail -->
    <path class="tail" d="M126 130 q26 -4 22 -30 q-2 -12 -14 -12" stroke="#e8924a" stroke-width="11" fill="none" stroke-linecap="round"/>
    <!-- body -->
    <ellipse cx="80" cy="122" rx="42" ry="30" fill="#f4a95c"/>
    <ellipse cx="80" cy="130" rx="24" ry="17" fill="#fde3c0"/>
    <!-- ears -->
    <path d="M48 56 L42 28 L68 44 Z" fill="#f4a95c"/>
    <path d="M112 56 L118 28 L92 44 Z" fill="#f4a95c"/>
    <path d="M51 51 L47 35 L63 45 Z" fill="#f6c6d0"/>
    <path d="M109 51 L113 35 L97 45 Z" fill="#f6c6d0"/>
    <!-- head -->
    <circle cx="80" cy="76" r="36" fill="#f4a95c"/>
    <!-- stripes -->
    <path d="M70 42 q10 6 20 0 M64 46 q4 4 8 1 M88 47 q4 3 8 -1" class="cat-line" stroke="#d97f33"/>
    <!-- muzzle -->
    <ellipse cx="80" cy="90" rx="16" ry="11" fill="#fde3c0"/>
    <path d="M76 86 L84 86 L80 91 Z" fill="#e2766b"/>
    ${eyes}
    ${mouth}
    <!-- whiskers -->
    <path d="M38 84 h18 M38 92 q9 -2 18 1 M122 84 h-18 M122 92 q-9 -2 -18 1" class="cat-line" stroke-width="2"/>
    <!-- paws -->
    <ellipse cx="62" cy="146" rx="11" ry="7" fill="#f4a95c"/>
    <ellipse cx="98" cy="146" rx="11" ry="7" fill="#f4a95c"/>
  </svg>`;
}

/* --- tiny synth sounds (no audio files needed) --- */
const Sound = (() => {
  let ctx = null;
  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function tone(freq, when, dur, type = 'sine', gain = 0.12) {
    const ac = ensure();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ac.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(ac.currentTime + when);
    osc.stop(ac.currentTime + when + dur + 0.05);
  }
  function play(name) {
    if (state.muted) return;
    try {
      if (name === 'correct') { tone(523, 0, .15); tone(659, .12, .15); tone(784, .24, .25); }
      else if (name === 'wrong') { tone(220, 0, .2, 'triangle'); }
      else if (name === 'tap') { tone(440, 0, .06, 'sine', .06); }
      else if (name === 'win') { [523,587,659,784,1047].forEach((f,i)=>tone(f, i*.12, .2)); }
      else if (name === 'catch') { tone(660, 0, .08); tone(880, .07, .12); }
    } catch { /* audio blocked — fine */ }
  }
  return { play };
})();

/* --- confetti burst --- */
function confetti(count = 80) {
  const colors = ['#f9a826', '#e2731c', '#5b9c4a', '#2aa5a0', '#6f5fb5', '#e2766b'];
  const holder = document.createElement('div');
  holder.className = 'confetti-holder';
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = Math.random() * 0.4 + 's';
    p.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
    p.style.width = p.style.height = 6 + Math.random() * 8 + 'px';
    if (i % 3 === 0) p.style.borderRadius = '50%';
    holder.appendChild(p);
  }
  document.body.appendChild(holder);
  setTimeout(() => holder.remove(), 3500);
}
