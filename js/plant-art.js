// Plant Pals illustrations: flat, chunky, two-tone "Duolingo-style" plant characters.
// Every plant sits in a pot with a face. Mood follows watering status:
//   happy (fine) · due (expectant "o" face) · thirsty (overdue: droopy, faded, sweating)
//
// Usage: PlantArt.svg(speciesKey, mood) -> SVG markup string (viewBox 0 0 100 100).
// Each species recipe returns { back, front } layers: back is drawn behind the pot,
// front (e.g. trailing vines) in front of it. Pot rim top sits at y = 62.
(function () {
  const r = (n) => Math.round(n * 100) / 100;

  // ---------------- colour palette ----------------
  const G = {
    leaf: '#58B368', leafS: '#3F9A50',
    dark: '#2F8A4B', darkS: '#22703A',
    deep: '#2E6B3F', deepS: '#21542F',
    lime: '#8BD17C', limeS: '#6DBA5E',
    sage: '#9AB58A', sageS: '#7E9B70',
    blue: '#8CC3B0', blueS: '#6FA898',
    stem: '#3E8E41', trunk: '#9A6B47', trunkS: '#7A5236',
    cream: '#FFF6D8', yellow: '#F6D04D', red: '#E2384F', redS: '#C02A40',
    pink: '#F58FB1', pinkS: '#E06A93', white: '#FFFFFF', whiteS: '#E9E4D6', purple: '#8B5FA8',
  };
  const POTS = {
    terracotta: ['#E2733B', '#C2582A', '#EE8A50'],
    mustard: ['#F2B33D', '#D3942A', '#F8C65A'],
    cream: ['#F4E3C1', '#DCC69C', '#FBEED6'],
    pink: ['#F29BA8', '#D97B8A', '#F7B4BE'],
    blue: ['#7FB8E6', '#5E9ACB', '#9BCBF0'],
    teal: ['#4FB3A9', '#3A968D', '#6CC6BD'],
    lilac: ['#B79AD9', '#9A7CC0', '#CBB3E6'],
  };

  // ---------------- primitives ----------------
  const g = (x, y, rot, inner) => `<g transform="translate(${r(x)} ${r(y)}) rotate(${r(rot)})">${inner}</g>`;
  const path = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
  const line = (d, color, w, extra = '') =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const dot = (x, y, rad, fill) => `<circle cx="${r(x)}" cy="${r(y)}" r="${r(rad)}" fill="${fill}"/>`;
  const ell = (x, y, rx, ry, fill, rot = 0) =>
    `<ellipse cx="${r(x)}" cy="${r(y)}" rx="${r(rx)}" ry="${r(ry)}" fill="${fill}" transform="rotate(${r(rot)} ${r(x)} ${r(y)})"/>`;

  /** Pointed leaf: base at (x,y), tip `len` away in direction `rot` (0 = straight up). Right half shaded. */
  function leaf(x, y, rot, len, w, fill, shade, extra = '') {
    const L = len;
    const full = `M0 0 C${r(w)} ${r(-L * 0.25)} ${r(w * 0.9)} ${r(-L * 0.75)} 0 ${r(-L)} C${r(-w * 0.9)} ${r(-L * 0.75)} ${r(-w)} ${r(-L * 0.25)} 0 0Z`;
    const half = `M0 0 C${r(w)} ${r(-L * 0.25)} ${r(w * 0.9)} ${r(-L * 0.75)} 0 ${r(-L)}Z`;
    return g(x, y, rot, path(full, fill) + path(half, shade) + (typeof extra === 'function' ? extra(L, w) : extra));
  }
  /** Rounded leaf / pad: ellipse centred at (x,y). Right half shaded. */
  function blob(x, y, rx, ry, rot, fill, shade, extra = '') {
    return g(x, y, rot, `<ellipse rx="${r(rx)}" ry="${r(ry)}" fill="${fill}"/>`
      + path(`M0 ${r(-ry)} A${r(rx)} ${r(ry)} 0 0 1 0 ${r(ry)}Z`, shade) + extra);
  }
  /** Heart leaf: notch at (x,y), tip `s` away in direction `rot`. */
  function heart(x, y, rot, s, fill, shade, extra = '') {
    const k = (n) => r(n * s);
    const full = `M0 0 C${k(-0.3)} ${k(0.18)} ${k(-0.75)} ${k(-0.05)} ${k(-0.55)} ${k(-0.5)} C${k(-0.4)} ${k(-0.8)} ${k(-0.1)} ${k(-0.9)} 0 ${k(-1)} C${k(0.1)} ${k(-0.9)} ${k(0.4)} ${k(-0.8)} ${k(0.55)} ${k(-0.5)} C${k(0.75)} ${k(-0.05)} ${k(0.3)} ${k(0.18)} 0 0Z`;
    const half = `M0 0 L0 ${k(-1)} C${k(0.1)} ${k(-0.9)} ${k(0.4)} ${k(-0.8)} ${k(0.55)} ${k(-0.5)} C${k(0.75)} ${k(-0.05)} ${k(0.3)} ${k(0.18)} 0 0Z`;
    return g(x, y, rot, path(full, fill) + path(half, shade) + (typeof extra === 'function' ? extra(s) : extra));
  }
  /** Arching strap leaf from (x,y) via control (cx,cy) to (ex,ey). */
  const strap = (x, y, cx, cy, ex, ey, w, color, stripe) =>
    line(`M${r(x)} ${r(y)} Q${r(cx)} ${r(cy)} ${r(ex)} ${r(ey)}`, color, w)
    + (stripe ? line(`M${r(x)} ${r(y)} Q${r(cx)} ${r(cy)} ${r(ex)} ${r(ey)}`, stripe, w * 0.32) : '');

  /** A frond: leaflets placed along a drooping curve. Used for ferns and palms. */
  function frond(x, y, angle, len, droop, leafLen, leafW, fill, shade, { sweep = 55, midrib = fill, count = 8 } = {}) {
    const a = (angle * Math.PI) / 180;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const pt = (t) => [x + dx * len * t, y + dy * len * t + droop * t * t];
    const [ex, ey] = pt(1), [mx, my] = pt(0.5);
    let out = line(`M${r(x)} ${r(y)} Q${r(2 * mx - (x + ex) / 2)} ${r(2 * my - (y + ey) / 2)} ${r(ex)} ${r(ey)}`, midrib, 1.4);
    for (let i = 1; i <= count; i++) {
      const t = 0.12 + (i / count) * 0.88;
      const [px, py] = pt(t);
      const [qx, qy] = pt(Math.min(1, t + 0.02));
      const tangent = (Math.atan2(qy - py, qx - px) * 180) / Math.PI + 90;
      const size = leafLen * (1 - t * 0.55);
      out += leaf(px, py, tangent - sweep, size, leafW, fill, shade) + leaf(px, py, tangent + sweep, size, leafW, fill, shade);
    }
    return out;
  }
  /** Small 5-petal flower. */
  function flower(x, y, s, petal, centre, rot = 0) {
    let out = '';
    for (let i = 0; i < 5; i++) out += g(x, y, rot + i * 72, `<ellipse cy="${r(-s * 0.55)}" rx="${r(s * 0.42)}" ry="${r(s * 0.62)}" fill="${petal}"/>`);
    return out + dot(x, y, s * 0.32, centre);
  }

  // ---------------- species recipes ----------------
  const R = {};

  R.generic = () => ({ back:
    [-60, -30, 0, 30, 60].map((a, i) => leaf(50, 63, a, i === 2 ? 34 : 28, 8, G.leaf, G.leafS)).join('') });

  R.monstera = () => {
    const slits = (s) => {
      const k = (n) => r(n * s);
      return line(`M${k(-0.5)} ${k(-0.3)} L${k(-0.26)} ${k(-0.36)} M${k(-0.4)} ${k(-0.64)} L${k(-0.2)} ${k(-0.6)} M${k(0.5)} ${k(-0.3)} L${k(0.26)} ${k(-0.36)} M${k(0.4)} ${k(-0.64)} L${k(0.2)} ${k(-0.6)}`, '#1F5E35', 2)
        + line(`M0 0 L0 ${k(-0.92)}`, '#7BC98A', 1);
    };
    return { back:
      line('M50 63 Q50 50 50 38', G.stem, 2.4) + heart(50, 38, 0, 22, '#3FA055', '#2E8743', slits)
      + line('M48 63 Q41 55 34 46', G.stem, 2.4) + heart(34, 46, -50, 23, '#3FA055', '#2E8743', slits)
      + line('M52 63 Q59 54 66 44', G.stem, 2.4) + heart(66, 44, 48, 23, '#3FA055', '#2E8743', slits) };
  };

  function trailing(leafFn, vineColor) {
    let front = '';
    [[31, 1], [69, -1]].forEach(([sx, side]) => {
      const ex = sx - side * 13, ey = 92;
      front += line(`M${sx} 63 Q${sx - side * 14} 68 ${ex} ${ey}`, vineColor, 1.4);
      [0.3, 0.55, 0.8, 1].forEach((t) => {
        const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * (sx - side * 14) + t * t * ex;
        const py = (1 - t) * (1 - t) * 63 + 2 * (1 - t) * t * 68 + t * t * ey;
        front += leafFn(px, py, side > 0 ? 200 - t * 30 : 160 + t * 30, t);
      });
    });
    return front;
  }

  R.pothos = () => {
    const variegate = (s) => line(`M0 ${r(-0.15 * s)} Q${r(-0.2 * s)} ${r(-0.5 * s)} 0 ${r(-0.85 * s)}`, '#F4E27A', 1.6);
    const h = (x, y, rot, t = 0.5) => heart(x, y, rot, 10 - t * 2, '#5DB65A', '#46A047', variegate);
    return {
      back: h(42, 58, -40) + h(58, 58, 40) + h(50, 56, 0) + h(36, 62, -75) + h(64, 62, 75),
      front: trailing(h, G.stem),
    };
  };
  R.philodendron = () => {
    const h = (x, y, rot, s) => heart(x, y, rot, s, G.dark, G.darkS, line(`M0 0 L0 ${-s * 0.9}`, '#5FBF78', 0.9));
    return { back: line('M50 63 Q46 50 40 42 M50 63 Q55 50 61 40 M50 63 L50 34', G.stem, 1.8)
      + h(40, 42, -35, 16) + h(61, 40, 35, 16) + h(50, 34, 0, 15) + h(42, 60, -70, 14) + h(58, 60, 70, 14) };
  };
  R.hoya = () => {
    const l = (x, y, rot) => leaf(x, y, rot, 9, 3.6, '#3F8F55', '#2F7744', dot(0, -5, 0.7, '#CFE8C9'));
    const star = (x, y) => flower(x, y, 3.2, '#F7C6D6', '#C2185B');
    return { back: l(44, 60, -45) + l(56, 60, 45) + l(50, 58, 0) + star(50, 46),
      front: trailing((x, y, rot) => l(x, y, rot), G.stem) };
  };
  R['string-of-hearts'] = () => {
    let front = '';
    [[33, 14, 98], [38, 24, 96], [62, 76, 96], [67, 86, 98]].forEach(([sx, ex, ey]) => {
      front += line(`M${sx} 63 Q${(sx + ex) / 2} 66 ${ex} ${ey}`, '#8E6B7E', 0.9);
      for (let t = 0.25; t <= 1; t += 0.25) {
        const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * ((sx + ex) / 2) + t * t * ex;
        const py = (1 - t) * (1 - t) * 63 + 2 * (1 - t) * t * 66 + t * t * ey;
        front += heart(px, py, 180, 5.5, '#8DAA7A', '#B07C98', line('M0 -1 L0 -4', '#D8E4CF', 0.7));
      }
    });
    return { back: heart(46, 61, -40, 6, '#8DAA7A', '#B07C98') + heart(54, 61, 40, 6, '#8DAA7A', '#B07C98'), front };
  };
  R['string-of-pearls'] = () => {
    let front = '';
    [[33, 15, 97], [39, 26, 94], [61, 74, 94], [67, 85, 97]].forEach(([sx, ex, ey]) => {
      front += line(`M${sx} 63 Q${(sx + ex) / 2} 66 ${ex} ${ey}`, '#6C9A5B', 0.8);
      for (let t = 0.15; t <= 1; t += 0.14) {
        const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * ((sx + ex) / 2) + t * t * ex;
        const py = (1 - t) * (1 - t) * 63 + 2 * (1 - t) * t * 66 + t * t * ey;
        front += dot(px, py, 2.4, '#7DC06A') + dot(px - 0.7, py - 0.8, 0.8, '#C8EBB8');
      }
    });
    return { back: [40, 46, 52, 58].map((x) => dot(x, 60, 3, '#7DC06A')).join(''), front };
  };

  R['boston-fern'] = () => ({ back:
    [-80, -55, -30, -10, 10, 30, 55, 80].map((a) => frond(50, 63, a, 34, Math.abs(a) * 0.22, 6, 2.2, '#6BBF59', '#4E9E40', { count: 7 })).join('') });

  R['parlour-palm'] = () => ({ back:
    line('M50 63 L46 40 M50 63 L55 36 M50 63 L50 44', G.stem, 1.6)
    + [-70, -40, -12, 15, 42, 72].map((a, i) => frond(i % 2 ? 54 : 47, 44, a, 26, Math.abs(a) * 0.25, 10, 1.7, '#5FAE4E', '#468F38', { sweep: 40, count: 6 })).join('') });
  R['areca-palm'] = () => ({ back:
    [-60, -30, 0, 30, 60].map((a) => frond(50, 63, a, 40, Math.abs(a) * 0.3, 11, 1.6, '#86C25A', '#6AA544', { sweep: 38, count: 7, midrib: '#C9B54A' })).join('') });

  R['spider-plant'] = () => {
    let back = '';
    [[-14, 40], [14, 40], [-26, 26], [26, 26], [-34, 10], [34, 10], [-6, 34], [6, 34], [-40, -4], [40, -4]].forEach(([dx, h]) => {
      back += strap(50, 63, 50 + dx * 0.4, 63 - h * 1.2, 50 + dx, 63 - h + (Math.abs(dx) > 30 ? 10 : 0), 3.6, '#6CBF5C', '#F4F1D0');
    });
    return { back, front: line('M60 63 Q78 62 84 80', '#C9D88E', 1) + strap(84, 80, 80, 74, 78, 72, 2.4, '#6CBF5C') + strap(84, 80, 88, 74, 91, 73, 2.4, '#6CBF5C') + strap(84, 80, 84, 74, 84, 71, 2.4, '#6CBF5C') };
  };

  R['snake-plant'] = () => {
    const blade = (x, rot, len, w) =>
      leaf(x, 64, rot, len + 1.5, w + 1.4, '#E3D266', '#D2BF4E')
      + leaf(x, 64, rot, len, w, '#3D7A4A', '#2D6239',
        (L) => [0.3, 0.5, 0.7].map((t) => line(`M${-w * 0.6} ${-L * t} q${w * 0.6} -2 ${w * 1.2} 0`, '#7DB07A', 0.8)).join(''));
    return { back: blade(40, -14, 40, 6) + blade(60, 14, 38, 6) + blade(46, -4, 52, 6.5) + blade(55, 6, 46, 6.5) };
  };

  R['zz-plant'] = () => {
    let back = '';
    [[-22, 36], [0, 46], [20, 40]].forEach(([dx, h]) => {
      const ex = 50 + dx, ey = 63 - h;
      back += line(`M50 63 Q${50 + dx * 0.4} ${63 - h * 0.6} ${ex} ${ey}`, '#3B7F3E', 2);
      for (let t = 0.3; t <= 1.01; t += 0.14) {
        const px = 50 + dx * t * (0.4 + 0.6 * t), py = 63 - h * t;
        const side = Math.round(t * 10) % 2 ? 1 : -1;
        back += blob(px + side * 3.5, py, 2.6, 4.6, side * 55, '#2F8F4E', '#23733D', ell(-0.8, -1.5, 0.8, 1.6, 'rgba(255,255,255,.55)'));
      }
      back += blob(ex, ey - 2, 2.6, 4.4, 0, '#2F8F4E', '#23733D');
    });
    return { back };
  };

  function broadLeaves(angles, len, w, fill, shade, extra, base = [50, 63]) {
    return angles.map((a) => leaf(base[0], base[1], a, len, w, fill, shade, extra)).join('');
  }
  R['prayer-plant'] = () => ({ back: broadLeaves([-58, -32, -10, 12, 34, 58], 28, 8.5, '#6DAA5C', '#55914A', (L, w) =>
    line(`M0 0 L0 ${-L * 0.95}`, '#D94B5A', 1.1)
    + [0.35, 0.6].map((t) => ell(-w * 0.45, -L * t, 1.8, 2.6, '#3E6B35') + ell(w * 0.45, -L * t, 1.8, 2.6, '#3E6B35')).join('')) });
  R.calathea = () => ({ back: broadLeaves([-50, -28, -8, 12, 32, 52], 34, 6, '#2F7A45', '#7B3F6E', (L) =>
    line(`M0 0 L0 ${-L * 0.95}`, '#9ACB8C', 0.9)) });
  R.begonia = () => ({ back: broadLeaves([-50, -24, 0, 24, 50], 30, 7.5, '#3B6E4E', '#9E2F45', (L, w) =>
    [[-0.4, 0.3], [0.3, 0.45], [-0.3, 0.6], [0.35, 0.72], [-0.2, 0.85], [0, 0.18]].map(([fx, ft]) => dot(fx * w, -L * ft, 1.1, '#F5F2EA')).join('')) });
  R.aglaonema = () => ({ back: broadLeaves([-50, -25, -3, 20, 44], 30, 7.5, '#7CC47A', '#E87F99', (L) =>
    line(`M0 0 L0 ${-L * 0.95}`, '#F2A9BC', 1.6)) });
  R.croton = () => ({ back: broadLeaves([-48, -24, 0, 24, 48], 28, 6.5, '#F2C230', '#E5582B', (L) =>
    line(`M0 0 L0 ${-L * 0.95}`, '#2E7D3A', 1.2) + line(`M0 ${-L * 0.4} l-3 -3 M0 ${-L * 0.6} l3 -3`, '#2E7D3A', 0.8)) });
  R['peace-lily'] = () => ({ back:
    broadLeaves([-70, -42, -15, 15, 42, 70], 28, 7.5, G.dark, G.darkS, (L) => line(`M0 0 L0 ${-L * 0.9}`, '#58B06F', 0.8))
    + line('M47 63 Q44 40 40 28 M53 63 Q57 44 60 33', G.stem, 1.4)
    + leaf(40, 30, -8, 15, 6, G.white, G.whiteS) + ell(40.5, 25, 1.6, 4, '#F3D35B')
    + leaf(60, 35, 10, 13, 5.5, G.white, G.whiteS) + ell(60.5, 30.5, 1.5, 3.6, '#F3D35B') });
  R.anthurium = () => {
    const h = (x, y, rot, s) => heart(x, y, rot, s, G.dark, G.darkS);
    return { back: line('M50 63 Q42 48 37 42 M50 63 Q60 50 64 44 M50 63 Q51 46 52 34', G.stem, 1.5)
      + h(37, 42, -40, 16) + h(64, 44, 40, 15)
      + heart(52, 34, 15, 15, G.red, G.redS) + line('M52 30 q3 -6 4 -10', '#F6D04D', 2.4) };
  };
  R['cast-iron-plant'] = () => ({ back:
    line('M46 63 L40 46 M54 63 L60 44 M50 63 L50 42', G.deep, 1.6)
    + leaf(40, 46, -22, 32, 8, G.deep, G.deepS) + leaf(60, 44, 20, 32, 8, G.deep, G.deepS) + leaf(50, 42, 0, 36, 8.5, '#357A48', G.deepS) });
  R['bird-of-paradise'] = () => ({ back:
    line('M47 63 L36 38 M53 63 L64 36 M50 63 L50 30', '#4C8F4F', 2)
    + [[36, 38, -25], [64, 36, 22], [50, 30, 0]].map(([x, y, a]) => leaf(x, y, a, 28, 9.5, '#3E8F55', '#2F7744', (L) =>
      line(`M0 0 L0 ${-L}`, '#86C98F', 1) + line(`M${-6} ${-L * 0.5} l4 2`, '#2F7744', 1.2))).join('') });

  R.echeveria = () => {
    const edge = (L, w) => line(`M0 ${-L} q${w * 0.5} ${L * 0.2} ${w * 0.8} ${L * 0.4}`, '#E8A0B4', 1);
    return { back:
      [-75, -50, -25, 0, 25, 50, 75].map((a) => leaf(50, 62, a, 17, 6, '#8CC3B0', '#6FA898', edge)).join('')
      + [-45, -15, 15, 45].map((a) => leaf(50, 62, a, 12, 5, '#A3D3C1', '#86BBA8', edge)).join('')
      + leaf(50, 62, 0, 9, 4.5, '#B7E0D0', '#99C9B7') };
  };
  R.haworthia = () => ({ back:
    [-70, -46, -24, -6, 10, 28, 48, 70].map((a, i) => leaf(50, 63, a, 20 - (i % 2) * 3, 3.6, '#3D7F55', '#2F6844', (L) =>
      [0.25, 0.45, 0.65].map((t) => line(`M-2.4 ${-L * t} L2.4 ${-L * t - 1}`, '#E9F2E5', 0.9)).join(''))).join('') });
  R['aloe-vera'] = () => ({ back:
    [-55, -30, -8, 12, 34, 58].map((a, i) => leaf(50, 63, a, 30 - (i % 2) * 4, 4.8, '#7DB874', '#5E9C57', (L, w) =>
      [0.3, 0.5, 0.7].map((t) => dot(-w * 0.35, -L * t, 0.8, '#E4F1DC')).join('')
      + [0.35, 0.55, 0.75].map((t) => line(`M${w * 0.82} ${-L * t} l1.4 -0.6`, '#5E9C57', 0.8)).join(''))).join('') });
  R['jade-plant'] = () => ({ back:
    line('M50 63 L50 46 M50 54 Q42 48 38 40 M50 50 Q58 44 62 37', G.trunk, 3.2)
    + [[38, 38, -30], [44, 36, 20], [62, 35, 30], [56, 33, -20], [50, 40, 0], [33, 44, -60], [67, 42, 60]]
      .map(([x, y, a]) => blob(x, y, 4, 5.6, a, '#5FA85A', '#4B8F48', `<ellipse rx="4" ry="5.6" fill="none" stroke="#D2564F" stroke-width=".8"/>`)).join('') });
  R['mexican-hat-plant'] = () => ({ back:
    line('M50 63 L50 36', '#6E8F5E', 2.2)
    + [[50, 52, -55], [50, 52, 55], [50, 42, -40], [50, 42, 40], [50, 36, 0]].map(([x, y, a]) => leaf(x, y, a, 20, 6.5, '#6E9E63', '#8A6A7A', (L, w) =>
      [0.3, 0.5, 0.7, 0.88].map((t) => dot(-w * (0.95 - t * 0.5), -L * t, 1.2, '#A7D08F')).join(''))).join('') });
  R.chalksticks = () => ({ back:
    [-50, -30, -12, 6, 22, 40, 56].map((a, i) => g(50, 63, a, line(`M0 0 L0 ${-(24 + (i % 3) * 5)}`, '#A9D4D9', 6) + line(`M1.2 -2 L1.2 ${-(22 + (i % 3) * 5)}`, '#8CBCC4', 2.2))).join('') });
  R.peperomia = () => ({ back:
    line('M50 63 Q44 52 40 44 M50 63 Q56 52 61 42 M50 63 L50 38', '#4C7F45', 1.8)
    + [[40, 40, -25], [61, 38, 25], [50, 33, 0], [43, 54, -60], [57, 53, 60]]
      .map(([x, y, a]) => blob(x, y, 6, 7, a, '#2E7D45', '#246A3A', ell(-2, -2.5, 1.5, 2.6, 'rgba(255,255,255,.45)', -20))).join('') });
  R.pilea = () => ({ back:
    [[-24, 16], [24, 16], [-15, 26], [15, 26], [-6, 34], [7, 33], [0, 22]].map(([dx, h]) =>
      line(`M50 63 Q${50 + dx * 0.4} ${63 - h * 0.5} ${50 + dx} ${63 - h}`, '#7FA85A', 1.1)
      + blob(50 + dx, 63 - h - 4, 8, 7, dx * 0.8, '#6CBF5C', '#55A649', dot(0, 0, 1.1, '#B9DFA8'))).join('') });

  function cactusBall(x, y, rad, fill, shade, spine) {
    let ribs = '';
    for (let i = -2; i <= 2; i++) ribs += line(`M${r(x + i * rad * 0.38)} ${r(y - rad * 0.92)} Q${r(x + i * rad * 0.55)} ${r(y)} ${r(x + i * rad * 0.38)} ${r(y + rad * 0.92)}`, shade, 1);
    let spines = '';
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      if (Math.hypot(i * 0.4, j * 0.4) < 0.95) spines += dot(x + i * rad * 0.42, y + j * rad * 0.36, 0.9, spine);
    }
    return blob(x, y, rad, rad * 0.92, 0, fill, shade) + ribs + spines;
  }
  R['golden-barrel'] = () => ({ back: cactusBall(50, 50, 17, '#5DA94F', '#468F3B', '#F6D04D') });
  R['pincushion-cactus'] = () => ({ back: cactusBall(50, 51, 15, '#6BAE5D', '#549449', '#FFFFFF')
    + [-10, -5, 0, 5, 10].map((dx) => leaf(50 + dx, 38 + Math.abs(dx) * 0.3, dx * 2, 6, 2.4, G.pink, G.pinkS)).join('') });
  R.mammillaria = () => ({ back: cactusBall(38, 55, 10, '#6BAE5D', '#549449', '#FFFFFF') + cactusBall(62, 55, 10, '#6BAE5D', '#549449', '#FFFFFF')
    + cactusBall(50, 46, 12, '#78B86A', '#5C9C50', '#FFFFFF')
    + [-6, 0, 6].map((dx) => dot(50 + dx, 35, 1.8, G.pink)).join('') });
  R['blue-torch'] = () => ({ back:
    line('M42 50 Q30 50 30 38 L30 32', '#7FB5B5', 9) + line('M30 32 L30 38', '#6A9E9E', 3)
    + `<rect x="41" y="12" width="18" height="54" rx="9" fill="#7FB5B5"/><rect x="51" y="12" width="8" height="54" rx="4" fill="#6A9E9E"/>`
    + [46, 50, 54].map((x) => line(`M${x} 16 L${x} 62`, '#5F9292', 0.9)).join('')
    + [20, 30, 40, 50].map((y) => dot(46, y, 0.9, '#F3F1D9') + dot(54, y + 5, 0.9, '#F3F1D9')).join('') });
  R['christmas-cactus'] = () => {
    let back = '';
    [[-1, -40], [-1, -15], [1, 15], [1, 42]].forEach(([, ang]) => {
      let x = 50, y = 62, a = ang;
      for (let i = 0; i < 4; i++) {
        const rad = (a * Math.PI) / 180;
        const nx = x + Math.sin(rad) * 8, ny = y - Math.cos(rad) * 8;
        back += blob((x + nx) / 2, (y + ny) / 2, 3.2, 5, a, '#4E9A4A', '#3B7F39');
        x = nx; y = ny; a += ang > 0 ? 14 : -14;
      }
      back += leaf(x, y, a, 8, 3, G.pink, G.pinkS) + leaf(x, y, a - 25, 7, 2.4, '#F7B4CC', G.pink) + leaf(x, y, a + 25, 7, 2.4, '#F7B4CC', G.pink);
    });
    return { back };
  };

  R['fiddle-leaf-fig'] = () => ({ back:
    line('M50 64 L50 22', G.trunk, 3)
    + [[44, 50, -50], [56, 44, 50], [44, 36, -45], [56, 30, 40], [50, 22, 0]].map(([x, y, a]) =>
      blob(x + Math.sin(a * Math.PI / 180) * 7, y - Math.cos(a * Math.PI / 180) * 7, 7.5, 9.5, a, '#3E8E4A', '#2F7A3D',
        line('M0 8 L0 -8 M0 -2 l-4 -3 M0 2 l4 -3', '#79BF7F', 0.8))).join('') });
  R['rubber-plant'] = () => ({ back:
    line('M50 64 L50 20', '#6B4C3A', 2.6)
    + [[50, 52, -60], [50, 48, 60], [50, 38, -50], [50, 34, 50], [50, 24, -30], [50, 22, 30]].map(([x, y, a]) =>
      leaf(x, y, a, 18, 6.5, '#2F5A3A', '#22452C', line('M0 0 L0 -16', '#B8475B', 0.8))).join('')
    + leaf(50, 21, 0, 9, 2, '#D2564F', '#B8475B') });
  R['olive-tree'] = () => {
    const cluster = (cx, cy) => [-60, -30, 0, 30, 60, 90, -90].map((a) => leaf(cx, cy, a, 8, 1.9, '#9AB58A', '#7E9B70')).join('');
    return { back:
      line('M50 64 Q46 52 50 42 Q54 34 50 28 M50 44 Q58 40 62 32 M49 38 Q42 34 38 30', G.trunk, 2.4)
      + cluster(38, 28) + cluster(62, 30) + cluster(50, 22) + cluster(44, 36) + cluster(57, 38)
      + dot(44, 31, 1.8, '#3B3344') + dot(59, 34, 1.8, '#3B3344') + dot(52, 26, 1.6, '#5E4A63') };
  };
  R['dragon-tree'] = () => {
    const tuft = (x, y) => [-80, -55, -30, -10, 10, 30, 55, 80].map((a) => leaf(x, y, a, 13, 1.8, '#4FA05A', '#3E8749',
      line('M1.3 -2 L0.4 -12', '#C0394B', 0.6))).join('');
    return { back: line('M46 64 Q40 44 36 30 M54 64 Q58 40 62 24 M50 64 L50 40', '#8D7B6E', 2.4)
      + tuft(36, 30) + tuft(62, 24) + tuft(50, 40) };
  };
  R['corn-plant'] = () => {
    let back = `<rect x="45" y="40" width="10" height="24" rx="2" fill="${G.trunk}"/><rect x="50" y="40" width="5" height="24" fill="${G.trunkS}"/>`
      + [46, 52, 58].map((y) => line(`M45 ${y} L55 ${y}`, '#6B4A33', 0.9)).join('');
    [[-30, 6], [30, 6], [-20, 22], [20, 22], [-8, 30], [8, 30], [-34, -8], [34, -8]].forEach(([dx, h]) => {
      back += strap(50, 40, 50 + dx * 0.5, 40 - h * 1.1, 50 + dx, 40 - h + 6, 4.2, '#4E9E45', '#C8DE6A');
    });
    return { back };
  };

  R.bromeliad = () => {
    let back = '';
    [[-36, 0], [36, 0], [-28, 16], [28, 16], [-16, 24], [16, 24]].forEach(([dx, h]) => {
      back += strap(50, 63, 50 + dx * 0.4, 63 - h * 1.3, 50 + dx, 63 - h + 2, 4.2, '#5EA94E');
    });
    return { back: back + [-16, 0, 16, -8, 8].map((a, i) => leaf(50, 60, a, i < 3 ? 30 : 24, 5.2, G.red, G.redS)).join('') };
  };
  R.orchid = () => ({ back:
    line('M52 62 Q54 34 44 20', '#6B8E4E', 1.4)
    + flower(44, 22, 7, '#E27BC5', '#F6D04D') + flower(52, 31, 6.4, '#E27BC5', '#F6D04D', 20) + flower(55, 42, 5.6, '#F0A6DA', '#F6D04D', 40)
    + leaf(50, 62, -72, 22, 7, '#3E8E4A', '#2F7A3D') + leaf(50, 62, 72, 22, 7, '#3E8E4A', '#2F7A3D') + leaf(50, 62, -30, 16, 6, '#4A9A55', '#3A8446') });
  R['african-violet'] = () => ({ back:
    [-75, -45, -15, 15, 45, 75].map((a) => {
      const rad = (a * Math.PI) / 180;
      return blob(50 + Math.sin(rad) * 12, 62 - Math.cos(rad) * 9, 6.5, 5.5, a, '#3F7F4A', '#326B3C');
    }).join('')
    + flower(42, 47, 6, '#9C6ADE', '#F6D04D') + flower(56, 45, 6, '#9C6ADE', '#F6D04D', 30) + flower(49, 38, 5.6, '#B48CEB', '#F6D04D', 15) });
  R.amaryllis = () => {
    const trumpet = (x, y, rot) => [-60, -30, 0, 30, 60, 180].map((a) => leaf(x, y, rot + a, 11, 4.4, G.red, G.redS)).join('') + dot(x, y, 2.4, '#FBE9A0');
    return { back:
      strap(50, 63, 40, 50, 30, 46, 4, '#5EA94E') + strap(50, 63, 60, 52, 70, 50, 4, '#5EA94E')
      + line('M50 63 L50 24', '#5EA94E', 2.4)
      + trumpet(41, 25, -40) + trumpet(59, 25, 40) };
  };
  R.fittonia = () => {
    const veins = line('M0 -5 L0 5 M0 -1 L-4 -3 M0 -1 L4 -3 M0 2.5 L-3.5 0.5 M0 2.5 L3.5 0.5', '#F58FB1', 0.9);
    return { back: [[34, 58, -60], [66, 58, 60], [40, 50, -35], [60, 50, 35], [50, 46, 0], [44, 58, -10], [57, 58, 15]]
      .map(([x, y, a]) => blob(x, y, 7, 5.5, a + 90, '#5FAE5A', '#4E9A4A', veins)).join('') };
  };
  R.tradescantia = () => {
    const l = (x, y, rot) => leaf(x, y, rot, 10, 3.6, '#B9C7D8', '#8B5FA8', line('M-1.6 -2 L-1.6 -8', '#7C4D9E', 1));
    return { back: l(44, 60, -40) + l(56, 60, 40) + l(50, 58, 0) + l(38, 62, -75) + l(62, 62, 75), front: trailing(l, '#8B5FA8') };
  };
  R.mint = () => ({ back:
    [[38, 52, -40], [62, 52, 40], [45, 44, -20], [55, 44, 20], [50, 36, 0], [32, 60, -70], [68, 60, 70], [50, 52, 0], [42, 58, -30], [58, 58, 30]]
      .map(([x, y, a]) => blob(x, y, 6, 7.2, a, '#7CC66B', '#61AD55', line('M0 6 L0 -6', '#A8DC98', 0.8))).join('') });
  R.basil = () => ({ back:
    line('M50 63 L50 34', '#5DA549', 1.6)
    + [[50, 56, -60], [50, 56, 60], [50, 46, -55], [50, 46, 55], [50, 38, -40], [50, 38, 40], [50, 34, 0]]
      .map(([x, y, a]) => leaf(x, y, a, 13, 5.6, '#8BD17C', '#6DBA5E', line('M0 0 L0 -12', '#B5E5A6', 0.7))).join('') });
  R['propagation-tray'] = () => {
    const sprout = (x, h, s = 1) => line(`M${x} 63 L${x} ${63 - h}`, '#6DAA4F', 1.3)
      + leaf(x, 63 - h, -55, 7 * s, 3 * s, G.lime, G.limeS) + leaf(x, 63 - h, 55, 7 * s, 3 * s, G.lime, G.limeS);
    return { back: sprout(33, 8, 0.9) + sprout(40, 14, 1.1) + sprout(47, 20, 1.3) + sprout(54, 12, 1)
      + sprout(60, 17, 1.2) + sprout(67, 9, 0.9) };
  };

  // ================= expanded catalogue =================
  // Extra building blocks
  const bez = (t, a, c, b) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;
  /** Hanging strands over the pot edge. defs: [startX, endX, endY]; item(x, y, t, i) draws along each. */
  function strands(defs, color, width, step, item) {
    let out = '';
    defs.forEach(([sx, ex, ey]) => {
      const cx = (sx + ex) / 2;
      out += line(`M${sx} 63 Q${cx} 66 ${ex} ${ey}`, color, width);
      let i = 0;
      for (let t = step; t <= 1.001; t += step) out += item(bez(t, sx, cx, ex), bez(t, 63, 66, ey), t, i++);
    });
    return out;
  }
  const SIDES = [[33, 16, 96], [38, 26, 94], [62, 74, 94], [67, 84, 96]];
  /** Ivy-style 3–5 lobed leaf. */
  const ivyLeaf = (x, y, rot, s, fill, shade, vein = '') =>
    g(x, y, rot, leaf(0, 0, -58, s * 0.7, s * 0.3, fill, shade) + leaf(0, 0, 58, s * 0.7, s * 0.3, fill, shade)
      + leaf(0, 0, 0, s, s * 0.38, fill, shade) + (vein ? line(`M0 0 L0 ${-s * 0.8}`, vein, 0.7) : ''));
  /** Radiating whorl of leaves around a point (umbrella tree, fan palm, rosette from above). */
  const whorl = (x, y, angles, len, w, fill, shade, extra) => angles.map((a) => leaf(x, y, a, len, w, fill, shade, extra)).join('');
  const range = (from, to, n) => Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));
  const roundRect = (x, y, w, h, rx, fill) => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${r(rx)}" fill="${fill}"/>`;
  /** Upright column cactus with ribs. */
  function column(x, top, w, fill, shade, ribs = 2, spine = '#F3F1D9') {
    let out = roundRect(x - w / 2, top, w, 66 - top, w / 2, fill) + roundRect(x, top, w / 2, 66 - top, w / 4, shade);
    for (let i = 1; i <= ribs; i++) out += line(`M${r(x - w / 2 + (w * i) / (ribs + 1))} ${top + w * 0.35} L${r(x - w / 2 + (w * i) / (ribs + 1))} 62`, shade, 0.8);
    for (let y = top + 5; y < 60; y += 7) out += dot(x - w * 0.22, y, 0.75, spine) + dot(x + w * 0.22, y + 3, 0.75, spine);
    return out;
  }

  // ----- leafy & tropical -----
  R.alocasia = () => {
    const veins = (L, w) => line(`M0 0 L0 ${-L * 0.95}`, '#DDEBD8', 1.1)
      + [0.3, 0.55, 0.78].map((t) => line(`M0 ${-L * t} L${-w * 0.7} ${-L * t + 4} M0 ${-L * t} L${w * 0.7} ${-L * t + 4}`, '#DDEBD8', 0.7)).join('');
    return { back: line('M48 63 Q42 50 36 42 M52 63 Q58 50 64 40 M50 63 L50 34', '#6E8F4E', 1.8)
      + leaf(36, 46, -38, 26, 9, '#24543A', '#1B4430', veins) + leaf(64, 44, 38, 26, 9, '#24543A', '#1B4430', veins)
      + leaf(50, 38, 0, 28, 9.5, '#2A5E41', '#1B4430', veins) };
  };
  R.dieffenbachia = () => ({ back: broadLeaves([-55, -28, 0, 28, 55], 28, 8.5, '#4E9A4A', '#3F8540', (L, w) =>
    ell(0, -L * 0.48, w * 0.5, L * 0.3, '#E6EFB0') + line(`M0 0 L0 ${-L * 0.92}`, '#F4F7D8', 1)) });
  R.syngonium = () => {
    const h = (x, y, rot, s) => heart(x, y, rot, s, '#B9D99A', '#E7A8B8', line(`M0 0 L0 ${-s * 0.9}`, '#E58AA2', 1));
    return { back: line('M50 63 Q44 50 38 42 M50 63 Q57 50 62 40 M50 63 L50 34', '#8FB46F', 1.6)
      + h(38, 42, -30, 16) + h(62, 40, 30, 16) + h(50, 34, 0, 16) + h(42, 60, -70, 13) + h(58, 60, 70, 13) };
  };

  // ----- colourful & patterned -----
  R['rattlesnake-plant'] = () => ({ back: broadLeaves([-46, -26, -8, 10, 28, 48], 34, 4.8, '#A4CC7A', '#8DB868', (L, w) =>
    range(0.2, 0.85, 5).map((t, i) => ell(i % 2 ? w * 0.42 : -w * 0.42, -L * t, 1.5, 2.6, '#2F6B3A')).join('')
    + line(`M0 0 L0 ${-L * 0.95}`, '#2F6B3A', 0.8)) });
  R.stromanthe = () => ({ back: broadLeaves([-52, -28, -6, 16, 38, 58], 28, 6.2, '#E9E3C9', '#D45A8A', (L) =>
    line(`M0 0 L0 ${-L * 0.9}`, '#4E9A4A', 1.8) + line(`M-3 ${-L * 0.3} L-1.5 ${-L * 0.7}`, '#7FBF6E', 1.2)) });
  R['polka-dot-plant'] = () => ({ back: [[36, 56, -60], [64, 56, 60], [42, 46, -30], [58, 46, 30], [50, 40, 0], [46, 56, -10], [55, 55, 15]]
    .map(([x, y, a]) => blob(x, y, 5.5, 7.5, a, '#F49AC1', '#E07BA6',
      [[-2, -3], [1.5, -1], [-1, 2], [2, 3.5], [0, -5]].map(([dx, dy]) => dot(dx, dy, 0.9, '#5E9C57')).join(''))).join('') });
  R['rex-begonia'] = () => {
    const swirl = `<ellipse rx="6.5" ry="5.2" fill="none" stroke="#8E5A78" stroke-width="1.2"/>` + dot(0, 0, 2.2, '#6E2E4A');
    return { back: line('M50 63 L40 50 M50 63 L60 48 M50 63 L50 42', '#8E3B55', 1.6)
      + blob(38, 46, 11, 9, -30, '#B8B6C9', '#9A8FB0', swirl) + blob(62, 44, 11, 9, 30, '#B8B6C9', '#9A8FB0', swirl)
      + blob(50, 36, 10, 8.5, 0, '#C7C3D6', '#9A8FB0', swirl) };
  };
  R.coleus = () => ({ back: [[-60, 16], [60, 16], [-30, 18], [30, 18], [0, 20], [-12, 14], [12, 14]].map(([a, L]) =>
    leaf(50, 63, a, L + 1.5, 7.2, '#A6D24A', '#8DBE38') + leaf(50, 63, a, L, 6, '#9C2F5B', '#7D2349')).join('') });
  R.caladium = () => {
    const h = (x, y, rot, s) => heart(x, y, rot, s, '#5FAE5A', '#4E9A4A')
      + heart(x, y, rot, s * 0.82, '#FBEFF2', '#F3DDE3', line(`M0 0 L0 ${-s * 0.75}`, '#E8577E', 1.2));
    return { back: line('M50 63 Q42 52 36 44 M50 63 Q58 52 64 42 M50 63 L50 36', '#B7586E', 1.4)
      + h(36, 44, -30, 18) + h(64, 42, 30, 18) + h(50, 36, 0, 18) };
  };
  R['watermelon-peperomia'] = () => {
    const stripes = range(-60, 60, 5).map((a) => g(0, 4, a, line('M0 0 L0 -9', '#CFE3C7', 1.1))).join('');
    return { back: line('M50 63 Q44 52 40 44 M50 63 Q56 52 61 42 M50 63 L50 36', '#B0414E', 1.6)
      + [[40, 40, -25], [61, 38, 25], [50, 31, 0], [42, 55, -60], [58, 54, 60]].map(([x, y, a]) => blob(x, y, 6.5, 7.5, a, '#4E8F5A', '#3F7A4B', stripes)).join('') };
  };
  R.oxalis = () => {
    const trefoil = (x, y, s) => [0, 120, 240].map((a) => g(x, y, a, heart(0, -s, 180, s, '#6E3E8E', '#56306F'))).join('');
    return { back: line('M50 63 Q42 50 38 40 M50 63 Q58 50 62 38 M50 63 L50 32 M50 63 Q46 52 42 54 M50 63 Q55 54 59 56', '#8D6AA0', 1)
      + trefoil(38, 40, 6.5) + trefoil(62, 38, 6.5) + trefoil(50, 32, 6.5) + trefoil(42, 54, 5.5) + trefoil(59, 56, 5.5)
      + flower(44, 30, 3.4, '#F7D2E4', '#F6D04D') };
  };

  // ----- trailing & climbing -----
  R['satin-pothos'] = () => {
    const spots = (s) => [[-0.3, -0.4], [0.25, -0.55], [-0.15, -0.7], [0.3, -0.3]].map(([fx, fy]) => dot(fx * s, fy * s, 0.8, '#C9DED6')).join('');
    const h = (x, y, rot, t = 0.5) => heart(x, y, rot, 10 - t * 2, '#3E7D5A', '#2F6648', spots);
    return { back: h(42, 58, -40) + h(58, 58, 40) + h(50, 56, 0) + h(36, 62, -75) + h(64, 62, 75), front: trailing(h, '#5C8F6A') };
  };
  R['monstera-adansonii'] = () => {
    const holes = (L, w) => ell(-w * 0.45, -L * 0.45, 0.9, 1.8, '#1F5E35') + ell(w * 0.45, -L * 0.6, 0.9, 1.8, '#1F5E35') + ell(-w * 0.4, -L * 0.72, 0.8, 1.4, '#1F5E35');
    const l = (x, y, rot) => leaf(x, y, rot, 11, 4.6, '#4CAF5C', '#3B954A', holes);
    return { back: l(44, 60, -40) + l(56, 60, 40) + l(50, 58, 0) + l(38, 62, -75) + l(62, 62, 75), front: trailing(l, G.stem) };
  };
  R['english-ivy'] = () => {
    const l = (x, y, rot) => ivyLeaf(x, y, rot, 8, '#3F7F45', '#326A38', '#C9E3C4');
    return { back: l(44, 59, -35) + l(56, 59, 35) + l(50, 56, 0), front: trailing(l, '#6B5A3A') };
  };
  R['creeping-fig'] = () => {
    const l = (x, y) => blob(x - 2, y, 2.2, 2.7, -30, '#5DAA4E', '#4A9440') + blob(x + 2, y + 1, 2.2, 2.7, 30, '#5DAA4E', '#4A9440');
    return { back: [36, 42, 48, 54, 60, 64].map((x, i) => l(x, 59 - (i % 2) * 3)).join(''),
      front: strands(SIDES, '#6E8F4E', 0.8, 0.14, (x, y) => l(x, y)) };
  };
  R['string-of-dolphins'] = () => ({ back: [42, 50, 58].map((x) => leaf(x, 61, (x - 50) * 3, 8, 2.6, '#8CC3B0', '#6FA898')).join(''),
    front: strands(SIDES, '#7A9C83', 0.8, 0.2, (x, y, t, i) => leaf(x, y, i % 2 ? 140 : 220, 6, 2.2, '#8CC3B0', '#6FA898')
      + leaf(x, y, i % 2 ? 190 : 170, 3.5, 1.4, '#8CC3B0', '#6FA898')) });
  R['string-of-bananas'] = () => ({ back: [42, 50, 58].map((x) => ell(x, 59, 1.6, 4, '#9FD07A', (x - 50) * 3)).join(''),
    front: strands(SIDES, '#7BA05A', 0.8, 0.14, (x, y, t, i) => ell(x + (i % 2 ? 1.6 : -1.6), y, 1.4, 3.4, '#9FD07A', i % 2 ? -35 : 35)) });
  R['lipstick-plant'] = () => {
    const l = (x, y, rot, t) => leaf(x, y, rot, 8, 3.2, '#2F6E3E', '#245A31') + (t > 0.9 ? leaf(x, y, rot, 7, 1.8, G.red, G.redS) + dot(x, y, 1.3, '#4A2A1A') : '');
    return { back: l(44, 60, -40, 1) + l(56, 60, 40, 1) + l(50, 58, 0, 1), front: trailing(l, '#5B4A3A') };
  };

  // ----- palms & ferns -----
  R['maidenhair-fern'] = () => ({ back:
    [-70, -45, -20, 0, 20, 45, 70].map((a) => frond(50, 63, a, 32, Math.abs(a) * 0.25, 3.2, 2.4, '#9ED36B', '#86BE55', { sweep: 70, count: 7, midrib: '#2B2B2B' })).join('') });
  R['birds-nest-fern'] = () => ({ back: broadLeaves([-48, -26, -8, 10, 28, 50], 32, 6.5, '#7CC34E', '#66AD3E', (L) =>
    line(`M0 0 L0 ${-L * 0.95}`, '#3E5E2A', 1.3)) });
  R['staghorn-fern'] = () => {
    const antler = (rot, len) => g(50, 60, rot, line(`M0 0 L0 ${-len} M0 ${-len * 0.6} L${len * 0.3} ${-len * 0.95} M0 ${-len} L${-len * 0.22} ${-len * 1.25} M0 ${-len} L${len * 0.2} ${-len * 1.2}`, '#86B86A', 5)
      + line(`M0 0 L0 ${-len}`, '#9FCC85', 1.6));
    return { back: antler(-55, 18) + antler(55, 18) + antler(-20, 22) + antler(20, 20) + blob(50, 58, 12, 8, 0, '#B8C98A', '#A3B576') };
  };
  R['asparagus-fern'] = () => ({ back:
    [-75, -50, -25, 0, 25, 50, 75].map((a) => frond(50, 63, a, 30, Math.abs(a) * 0.3, 4, 0.9, '#8CCB5E', '#76B44A', { sweep: 50, count: 12 })).join('') });
  R['rabbits-foot-fern'] = () => ({
    back: [-70, -40, -15, 15, 40, 70].map((a) => frond(50, 63, a, 28, Math.abs(a) * 0.25, 5, 1.6, '#7CC75A', '#62AD45', { sweep: 60, count: 8 })).join(''),
    front: [[30, 68, -30], [70, 68, 30], [34, 74, -10]].map(([x, y, a]) => g(x, y, a, line('M0 0 q-2 6 1 10', '#B98B5E', 3.6) + dot(-0.6, 3, 0.6, '#E2C7A5') + dot(0.4, 7, 0.6, '#E2C7A5'))).join(''),
  });
  R['blue-star-fern'] = () => ({ back:
    [-55, -25, 5, 32, 58].map((a) => frond(50, 63, a, 30, Math.abs(a) * 0.2, 10, 2.8, '#8AB8A8', '#76A496', { sweep: 68, count: 4, midrib: '#6F9A8C' })).join('') });
  R['kentia-palm'] = () => ({ back:
    [-72, -40, -10, 18, 48, 76].map((a) => frond(50, 63, a, 38, Math.abs(a) * 0.32, 11, 1.6, '#3E8F4A', '#2F7A3A', { sweep: 42, count: 8 })).join('') });
  R['lady-palm'] = () => {
    const fan = (x, y, rot) => g(x, y, rot, whorl(0, 0, range(-70, 70, 7), 12, 2.2, '#4E9A4A', '#3F8540'));
    return { back: line('M46 63 L38 40 M54 63 L62 36 M50 63 L50 30', '#7A6A4E', 1.8) + fan(38, 40, -20) + fan(62, 36, 20) + fan(50, 30, 0) };
  };
  R['sago-palm'] = () => ({ back:
    [-70, -45, -20, 0, 20, 45, 70].map((a) => frond(50, 58, a, 30, Math.abs(a) * 0.16, 9, 1.2, '#2F6E3A', '#24592E', { sweep: 50, count: 10 })).join('')
    + ell(50, 60, 7, 5, '#8A6A47') + line('M45 58 L55 62 M45 62 L55 58', '#6E5236', 0.8) });
  R['ponytail-palm'] = () => {
    let back = path('M41 63 Q40 52 50 50 Q60 52 59 63 Z', '#9A7552') + path('M50 50 Q60 52 59 63 L52 63 Z', '#7A5A3E') + line('M50 51 L50 36', '#8A6A47', 3);
    [[-30, 0], [30, 0], [-22, -6], [22, -6], [-12, -10], [12, -10], [-36, 14], [36, 14]].forEach(([dx, h]) => {
      back += strap(50, 36, 50 + dx * 0.4, 18 + h, 50 + dx, 46 + h * 0.6, 1.8, '#6DAA4F');
    });
    return { back };
  };

  // ----- trees & tall plants -----
  R['weeping-fig'] = () => {
    const cluster = (cx, cy) => range(-90, 90, 6).map((a) => leaf(cx, cy, a + 180, 8, 3, '#3F9A4A', '#2F7F3A')).join('');
    return { back: line('M50 64 Q47 50 50 40 Q53 32 50 26 M50 44 Q58 40 62 34 M49 40 Q42 36 38 32', G.trunk, 2.4)
      + cluster(38, 26) + cluster(62, 28) + cluster(50, 18) + cluster(44, 34) + cluster(57, 36) + cluster(50, 30) };
  };
  R.yucca = () => {
    const tuft = (x, y) => whorl(x, y, range(-85, 85, 9), 16, 2.4, '#5E9A4E', '#4A8040');
    return { back: roundRect(40, 38, 7, 26, 3, '#B08A62') + roundRect(53, 30, 7, 34, 3, '#B08A62')
      + line('M41 46 L46 46 M41 54 L46 54 M54 40 L59 40 M54 50 L59 50', '#8A6A47', 0.9)
      + tuft(43.5, 38) + tuft(56.5, 30) };
  };
  R['umbrella-tree'] = () => {
    const umb = (x, y, rot) => g(x, y, rot, whorl(0, 0, range(-110, 110, 7), 10, 3.2, '#3E8F48', '#2F7A3A'));
    return { back: line('M50 64 L50 26 M50 50 Q42 44 36 40 M50 42 Q58 36 63 32', '#6B5A3A', 2) + umb(36, 40, -15) + umb(63, 32, 15) + umb(50, 26, 0) + umb(50, 48, 0) };
  };
  R['money-tree'] = () => {
    const palm = (x, y, rot) => g(x, y, rot, whorl(0, 0, [-60, -30, 0, 30, 60], 11, 3.6, '#4FA052', '#3E8A42'));
    return { back: line('M47 64 Q53 56 47 48 Q41 40 47 32', '#A57A50', 2.4) + line('M53 64 Q47 56 53 48 Q59 40 53 32', '#8A6440', 2.4)
      + line('M48 33 L38 26 M52 33 L62 26 M50 32 L50 22', '#6E8F4E', 1.2) + palm(38, 26, -30) + palm(62, 26, 30) + palm(50, 22, 0) };
  };
  R['norfolk-pine'] = () => {
    let back = line('M50 64 L50 12', '#7A5A3E', 2.2);
    [[54, 24], [44, 20], [34, 16], [24, 12]].forEach(([y, w]) => {
      back += frond(50, y, -82, w, 3, 4, 0.9, '#3C8A4F', '#2F7341', { sweep: 45, count: 6 }) + frond(50, y, 82, w, 3, 4, 0.9, '#3C8A4F', '#2F7341', { sweep: 45, count: 6 });
    });
    return { back: back + leaf(50, 18, 0, 8, 2, '#3C8A4F', '#2F7341') };
  };
  R['banana-plant'] = () => ({ back:
    line('M47 63 L36 38 M53 63 L64 36 M50 63 L50 28', '#8FBF5E', 2.4)
    + [[36, 38, -28], [64, 36, 25], [50, 28, 0]].map(([x, y, a]) => leaf(x, y, a, 30, 10, '#7CC15A', '#68AC48', (L, w) =>
      line(`M0 0 L0 ${-L}`, '#C5E3A4', 1.2) + line(`M${-w * 0.95} ${-L * 0.45} L${-w * 0.3} ${-L * 0.42} M${w * 0.9} ${-L * 0.65} L${w * 0.3} ${-L * 0.6}`, '#FFE7A8', 1))).join('') });

  // ----- flowering -----
  R.kalanchoe = () => ({ back:
    [[38, 56, -55], [62, 56, 55], [44, 52, -20], [56, 52, 20], [50, 56, 0]].map(([x, y, a]) => blob(x, y, 5, 7, a, '#3E8A4A', '#2F7340')).join('')
    + [[40, 42], [47, 38], [54, 38], [60, 43], [44, 46], [56, 47], [50, 44]].map(([x, y]) => flower(x, y, 3.6, '#F2603A', '#FFD36A')).join('') });
  R.cyclamen = () => {
    const bloom = (x, y) => [-30, -10, 10, 30].map((a) => leaf(x, y, a, 9, 2.8, '#E0457B', '#C93469')).join('') + dot(x, y, 1.2, '#7A2A4A');
    return { back: line('M46 60 Q42 44 40 34 M54 60 Q58 44 60 32 M50 60 L50 38', '#8E3B55', 1.1)
      + bloom(40, 34) + bloom(60, 32) + bloom(50, 38)
      + [[38, 58, -60], [62, 58, 60], [50, 56, 0]].map(([x, y, a]) => heart(x, y, a + 180, 10, '#2E6B45', '#245A39', line('M-3 4 Q0 2 3 4', '#BFD8C4', 1.4))).join('') };
  };
  R.poinsettia = () => ({ back:
    whorl(50, 52, [-110, -70, 70, 110, -150, 150], 15, 6, '#2F7A45', '#246338')
    + whorl(50, 44, range(0, 360 - 360 / 7, 7), 13, 5, G.red, G.redS)
    + [[-1.5, -1.5], [1.5, -1], [0, 1.5]].map(([dx, dy]) => dot(50 + dx, 44 + dy, 1, '#F6D04D')).join('') });
  R.hibiscus = () => ({ back:
    line('M50 63 L50 40 M50 54 L40 46 M50 50 L60 44', '#5E7F3E', 1.6)
    + [[40, 46, -40], [60, 44, 40], [44, 56, -70], [57, 56, 70], [50, 58, 0]].map(([x, y, a]) => leaf(x, y, a, 12, 5, '#2F8A4B', '#22703A')).join('')
    + flower(50, 32, 13, '#E8344A', '#9E1630') + line('M50 32 L55 24', '#FBE36A', 1.4) + dot(55.3, 23.6, 1.4, '#FBE36A') });
  R.jasmine = () => {
    let back = `<circle cx="50" cy="36" r="19" fill="none" stroke="#C9A27A" stroke-width="1.8"/>` + line('M44 63 L40 52 M56 63 L60 52', '#C9A27A', 1.8);
    range(0, 330, 12).forEach((a) => {
      const rad = (a * Math.PI) / 180, x = 50 + Math.sin(rad) * 19, y = 36 - Math.cos(rad) * 19;
      back += leaf(x, y, a + 60, 6, 2.2, '#3E8F48', '#2F7A3A');
      if (a % 60 === 0) back += flower(x, y, 3.8, '#FFFFFF', '#F7C6D6', a);
    });
    return { back };
  };
  R.gardenia = () => {
    const rose = (x, y, s) => dot(x, y, s, '#FFFDF5') + dot(x + 0.6, y + 0.6, s * 0.7, '#F1EBDD') + dot(x, y, s * 0.4, '#FFFDF5');
    return { back: broadLeaves([-62, -34, -8, 18, 44, 68], 18, 6, '#2B7A47', '#1F633A') + rose(42, 40, 6) + rose(58, 36, 6.5) + rose(50, 48, 5) };
  };
  R.streptocarpus = () => ({ back:
    [[-78, 18], [78, 18], [-50, 20], [50, 20], [-20, 16], [20, 16]].map(([a, L]) => leaf(50, 63, a, L, 5.5, '#5E9A4E', '#4A8040')).join('')
    + line('M48 60 Q40 44 38 34 M52 60 Q60 44 62 32 M50 60 L50 36', '#6E8F4E', 1)
    + [[38, 34], [62, 32], [50, 36]].map(([x, y]) => flower(x, y, 5, '#8E5BD6', '#F3EFFF')).join('') });
  R.clivia = () => {
    let back = '';
    [[-34, 4], [34, 4], [-24, 18], [24, 18], [-10, 26], [10, 26]].forEach(([dx, h]) => { back += strap(50, 63, 50 + dx * 0.4, 63 - h * 1.2, 50 + dx, 63 - h + 4, 4.6, '#2F7A45'); });
    back += line('M50 63 L50 30', '#5E9A4E', 2.2) + whorl(50, 30, range(-150, 150, 9), 9, 3, '#F3772D', '#DB5E1C') + dot(50, 30, 2.4, '#FBD15B');
    return { back };
  };
  R.geranium = () => ({ back:
    [[38, 54, -40], [62, 54, 40], [46, 50, -10], [56, 50, 15], [50, 58, 0]].map(([x, y, a]) =>
      blob(x, y, 7, 6, a, '#5FA35A', '#4C8C48', `<ellipse rx="4" ry="3.3" fill="none" stroke="#8A6A3A" stroke-width="1" opacity=".55"/>`)).join('')
    + line('M50 56 L48 30 M52 56 L60 36', '#6E8F4E', 1.2)
    + [[48, 28], [60, 34]].map(([x, y]) => [[-3, 0], [3, 0], [0, -3], [0, 3], [0, 0], [-2, -2.4], [2.4, 2], [2.2, -2.2]].map(([dx, dy]) => dot(x + dx, y + dy, 2.2, '#E5384F')).join('')).join('') });

  // ----- succulents -----
  R['panda-plant'] = () => ({ back:
    line('M50 63 L46 44 M50 63 L56 42', '#9AA88E', 2)
    + [[46, 44, -50], [46, 44, 0], [46, 44, 45], [56, 42, -30], [56, 42, 30], [50, 58, -70], [50, 58, 70]].map(([x, y, a]) =>
      leaf(x, y, a, 13, 4.4, '#B9C9B0', '#A1B398', (L) => dot(0, -L * 0.94, 1.2, '#7A4A2E') + dot(-2.6, -L * 0.6, 0.7, '#7A4A2E') + dot(2.6, -L * 0.6, 0.7, '#7A4A2E'))).join('') });
  R['paddle-plant'] = () => ({ back:
    line('M50 63 L50 30', '#8FAE78', 2)
    + [[56, -62], [56, 62], [46, -48], [46, 48], [37, -32], [37, 32]].map(([y, a]) => {
      const rad = (a * Math.PI) / 180;
      return blob(50 + Math.sin(rad) * 8, y - Math.cos(rad) * 6, 7.5, 6.5, a, '#A8CFA0', '#92BB8A', `<ellipse rx="7.5" ry="6.5" fill="none" stroke="#D2564F" stroke-width="1.1"/>`);
    }).join('') + blob(50, 28, 5, 5, 0, '#B7DBAE', '#A1C699') });
  R['burros-tail'] = () => ({ back: [42, 50, 58].map((x) => ell(x, 59, 2.4, 3.2, '#8FC2A8')).join(''),
    front: [[30, 16, 94], [34, 22, 97], [66, 78, 97], [70, 84, 94]].map(([sx, ex, ey]) => {
      let s = '';
      for (let t = 0.05; t <= 1.001; t += 0.1) {
        const x = bez(t, sx, (sx + ex) / 2, ex), y = bez(t, 63, 66, ey);
        s += ell(x - 1, y, 1.7, 2.4, '#8FC2A8', -25) + ell(x + 1, y + 1, 1.7, 2.4, '#7DB096', 25);
      }
      return s;
    }).join('') });
  R.agave = () => ({ back:
    [-62, -38, -16, 4, 24, 44, 66].map((a, i) => leaf(50, 63, a, 26 - (i % 2) * 4, 6.2, '#8FB3A8', '#7A9E93', (L, w) =>
      dot(0, -L, 1, '#4A3A2E') + [0.3, 0.5, 0.7].map((t) => line(`M${w * 0.85} ${-L * t} l1.6 -0.6 M${-w * 0.85} ${-L * t} l-1.6 -0.6`, '#6B5A48', 0.7)).join(''))).join('') });
  R['hens-and-chicks'] = () => {
    const rosette = (x, y, s) => whorl(x, y, range(-80, 80, 7), 9 * s, 3.6 * s, '#7FB58A', '#679E73', (L) => dot(0, -L * 0.92, 0.8 * s, '#B5475B'))
      + whorl(x, y, [-40, -10, 20, 45], 6 * s, 3 * s, '#9CCBA4', '#86B58E');
    return { back: rosette(50, 62, 1.5) + rosette(32, 63, 0.9) + rosette(68, 63, 0.9) };
  };
  R.gasteria = () => ({ back:
    [-48, -22, 4, 28, 50].map((a, i) => leaf(50, 63, a, 24 - (i % 2) * 3, 5.6, '#2F6B45', '#245839', (L, w) =>
      range(0.2, 0.8, 4).map((t, j) => dot((j % 2 ? 1 : -1) * w * 0.35, -L * t, 0.9, '#E3EEDC')).join(''))).join('') });
  R.aeonium = () => {
    const ros = (x, y, s) => whorl(x, y, range(0, 320, 9), 8 * s, 3 * s, '#4A2638', '#38192A') + dot(x, y, 2.4 * s, '#8CB65A');
    return { back: line('M50 63 L50 32 M50 52 Q40 48 36 40 M50 48 Q60 44 64 38', '#8A7A5E', 2) + ros(50, 30, 1.2) + ros(36, 39, 1) + ros(64, 37, 1) };
  };
  R.lithops = () => {
    const stone = (x, y, s, c, cs) => blob(x - 3.2 * s, y, 3.4 * s, 4.6 * s, -8, c, cs, dot(0.6, -2 * s, 0.6, '#8A7660') + dot(-1, -0.6 * s, 0.5, '#8A7660'))
      + blob(x + 3.2 * s, y, 3.4 * s, 4.6 * s, 8, c, cs, dot(-0.4, -2 * s, 0.6, '#8A7660'));
    return { back: stone(40, 58, 1, '#C9B59A', '#B39C80') + stone(58, 57, 1.15, '#D4B8A8', '#BC9E8E') + stone(50, 59, 0.85, '#B8B08A', '#A29A74') };
  };

  // ----- cacti -----
  R['bunny-ears'] = () => {
    const pad = (x, y, rx, ry, rot) => blob(x, y, rx, ry, rot, '#7DB05C', '#6A9C4C',
      [[-0.4, -0.4], [0.3, -0.2], [-0.2, 0.2], [0.35, 0.45], [-0.45, 0.5], [0, -0.75], [0.1, 0.05]].map(([fx, fy]) => dot(fx * rx, fy * ry, 0.85, '#F7EFC4')).join(''));
    return { back: pad(50, 50, 10, 13, 0) + pad(40, 32, 6, 8, -30) + pad(60, 32, 6, 8, 30) };
  };
  R['moon-cactus'] = () => ({ back: column(50, 46, 9, '#5DA94F', '#468F3B', 1) + cactusBall(50, 36, 11, '#F2552C', '#D53F1A', '#FFE3B0') });
  R['fairy-castle'] = () => ({ back: column(36, 38, 8, '#6BAA5C', '#559048', 1) + column(64, 32, 8, '#6BAA5C', '#559048', 1)
    + column(50, 16, 10, '#78B86A', '#5C9C50', 2) + column(43, 44, 7, '#6BAA5C', '#559048', 1) + column(57, 40, 7, '#6BAA5C', '#559048', 1) });
  R['old-man-cactus'] = () => {
    let hair = '';
    for (let y = 20; y < 62; y += 4) for (let x = 43; x <= 57; x += 4.5) hair += line(`M${r(x)} ${y} q2 2 0 4`, '#FFFFFF', 1.1, 'opacity=".9"');
    return { back: column(50, 16, 18, '#8FAE8A', '#7A9A76', 2) + hair };
  };
  R['star-cactus'] = () => {
    let segs = '';
    for (let i = -3; i <= 3; i++) segs += line(`M${50 + i * 4} 46 Q${50 + i * 5.2} 54 ${50 + i * 4.6} 63`, '#4E6E4A', 0.9);
    return { back: path('M30 63 Q30 44 50 44 Q70 44 70 63 Z', '#6E8E68') + path('M50 44 Q70 44 70 63 L50 63 Z', '#5E7E58') + segs
      + [-12, -4, 4, 12].map((dx) => dot(50 + dx, 50, 1.2, '#F2F1E4') + dot(50 + dx * 1.2, 56, 1.1, '#F2F1E4')).join('')
      + flower(50, 42, 5, '#F7D23E', '#E89A1C') };
  };
  R['fishbone-cactus'] = () => {
    const zig = (sx, ex, ey) => {
      let d = `M${sx} 62`;
      for (let i = 1; i <= 8; i++) {
        const t = i / 8, x = bez(t, sx, (sx + ex) / 2, ex), y = bez(t, 62, 50, ey);
        d += ` L${r(x + (i % 2 ? 2.4 : -2.4))} ${r(y)}`;
      }
      return line(d, '#5FA548', 4.4) + line(d, '#7FC168', 1.4);
    };
    return { back: zig(46, 24, 70) + zig(54, 78, 72) + zig(50, 46, 20) + zig(50, 60, 24) };
  };
  R.rhipsalis = () => ({ back: range(-60, 60, 7).map((a) => g(50, 63, a, line('M0 0 q-2 -10 0 -18', '#7DB86A', 1.2))).join(''),
    front: [[32, 14, 96], [36, 20, 98], [40, 28, 97], [60, 72, 97], [64, 80, 98], [68, 86, 96]].map(([sx, ex, ey]) =>
      line(`M${sx} 63 Q${(sx + ex) / 2} 66 ${ex} ${ey}`, '#7DB86A', 1.3) + dot(ex, ey, 1, '#F4F1E1')).join('') });

  // ----- herbs & edibles -----
  R.rosemary = () => ({ back:
    [-30, -14, 0, 14, 30].map((a) => frond(50, 63, a, 36, 0, 5, 0.9, '#5F8F6A', '#4C7A57', { sweep: 30, count: 10, midrib: '#7A6A4E' })).join('')
    + [[40, 34], [58, 30], [50, 26]].map(([x, y]) => dot(x, y, 1.4, '#8FA8E0')).join('') });
  R.thyme = () => {
    let back = range(-60, 60, 7).map((a) => g(50, 63, a, line('M0 0 L0 -20', '#8A7A5E', 0.8))).join('');
    for (let a = -60; a <= 60; a += 12) for (let k = 0.35; k <= 1; k += 0.2) {
      const rad = (a * Math.PI) / 180;
      back += ell(50 + Math.sin(rad) * 20 * k, 63 - Math.cos(rad) * 20 * k, 1.1, 1.7, '#7FA56A', a + 40) + ell(50 + Math.sin(rad) * 20 * k + 1, 63 - Math.cos(rad) * 20 * k, 1.1, 1.7, '#6A9058', a - 40);
    }
    return { back };
  };
  R.parsley = () => {
    const tuft = (x, y) => [[0, 0], [-3, 1.5], [3, 1.5], [-1.6, -2.6], [1.6, -2.6], [0, 3]].map(([dx, dy], i) => dot(x + dx, y + dy, 2.2, i % 2 ? '#3E9440' : '#4CA64A')).join('');
    return { back: [[-20, 14], [-10, 22], [0, 26], [10, 22], [20, 14], [-26, 6], [26, 6], [-5, 14], [6, 15]].map(([dx, h]) =>
      line(`M50 63 Q${50 + dx * 0.4} ${63 - h * 0.5} ${50 + dx} ${63 - h}`, '#6DAA4F', 1) + tuft(50 + dx, 63 - h - 2)).join('') };
  };
  R.chives = () => ({ back:
    range(-30, 30, 9).map((a, i) => g(50, 63, a, line(`M0 0 L0 ${-(28 + (i % 3) * 5)}`, '#4C9E46', 1.8))).join('')
    + [[-12, 32], [10, 36]].map(([a, h]) => { const rad = (a * Math.PI) / 180; const x = 50 + Math.sin(rad) * h, y = 63 - Math.cos(rad) * h;
      return dot(x, y, 4, '#B47CD8') + dot(x - 1.4, y - 1.2, 1, '#D7B4EE') + dot(x + 1.4, y + 1, 1, '#9660BE'); }).join('') });
  R.coriander = () => ({ back:
    [[-20, 12], [-10, 20], [2, 24], [13, 19], [22, 11], [-4, 12], [7, 13]].map(([dx, h]) => line(`M50 63 Q${50 + dx * 0.4} ${63 - h * 0.5} ${50 + dx} ${63 - h}`, '#6DBA4F', 1)
      + ivyLeaf(50 + dx, 63 - h, dx * 1.6, 11, '#6CBF4A', '#58A83A')).join('') });
  R['chilli-plant'] = () => ({ back:
    line('M50 63 L50 36 M50 52 L40 44 M50 46 L60 40', '#5E8F3E', 1.6)
    + [[40, 44, -50], [60, 40, 50], [50, 36, 0], [44, 56, -70], [57, 54, 70], [50, 48, 20]].map(([x, y, a]) => leaf(x, y, a, 12, 4, '#3E8F48', '#2F7A3A')).join('')
    + [[42, 48, 170], [56, 44, 190], [48, 40, 200]].map(([x, y, a]) => leaf(x, y, a, 10, 2.2, G.red, G.redS) + dot(x, y, 1, '#3E8F48')).join('') });
  R['lemon-tree'] = () => {
    const cluster = (cx, cy) => range(-80, 80, 5).map((a) => leaf(cx, cy, a, 9, 3.6, '#2F7A45', '#246338')).join('');
    const lemon = (x, y) => ell(x, y, 3.6, 2.8, '#F7D63A') + ell(x + 1.2, y + 0.4, 2.2, 2, '#E8C024') + dot(x - 1.4, y - 1, 0.8, '#FFF3B0');
    return { back: line('M50 64 L50 40 M50 44 L42 34 M50 42 L58 32', G.trunk, 2.4)
      + cluster(42, 32) + cluster(58, 30) + cluster(50, 24) + cluster(50, 38) + lemon(40, 38) + lemon(60, 36) + lemon(52, 28) };
  };
  R.strawberry = () => {
    const tri = (x, y, a) => g(x, y, a, [-40, 0, 40].map((b) => blob(Math.sin((b * Math.PI) / 180) * 5, -Math.cos((b * Math.PI) / 180) * 5, 3.2, 4, b, '#4CA64A', '#3E9440')).join(''));
    const berry = (x, y) => path(`M${x - 3.4} ${y} Q${x} ${y + 8} ${x + 3.4} ${y} Q${x} ${y - 2} ${x - 3.4} ${y} Z`, '#E2384F')
      + dot(x - 1, y + 1.6, 0.4, '#FBE9A0') + dot(x + 1, y + 2.6, 0.4, '#FBE9A0') + dot(x, y + 0.6, 0.4, '#FBE9A0') + leaf(x, y, 0, 2.4, 2, '#4CA64A', '#3E9440');
    return { back: line('M50 63 L40 46 M50 63 L60 44 M50 63 L50 38', '#6DAA4F', 1.2) + tri(40, 46, -30) + tri(60, 44, 30) + tri(50, 38, 0),
      front: line('M34 63 Q28 66 26 72 M66 63 Q72 66 74 74', '#6DAA4F', 1) + berry(26, 72) + berry(74, 74) };
  };

  // ----- quirky & carnivorous -----
  R['venus-flytrap'] = () => {
    const trap = (x, y, rot) => g(x, y, rot,
      path('M0 0 Q-7 -2 -7 -8 Q-2 -6 0 -1 Z', '#D9434E') + path('M0 0 Q7 -2 7 -8 Q2 -6 0 -1 Z', '#C2303C')
      + line('M-7 -8 l-1.6 -1.8 M-6 -5 l-2 -0.8 M7 -8 l1.6 -1.8 M6 -5 l2 -0.8', '#8CC152', 0.7));
    return { back: [[-60, 16], [-25, 22], [10, 24], [45, 20], [75, 14]].map(([a, L]) => {
      const rad = (a * Math.PI) / 180, x = 50 + Math.sin(rad) * L, y = 63 - Math.cos(rad) * L;
      return line(`M50 63 L${r(x)} ${r(y)}`, '#7FB84E', 2.4) + trap(x, y, a);
    }).join('') };
  };
  R['pitcher-plant'] = () => {
    const tube = (x, h, rot) => g(x, 63, rot, path(`M-1.5 0 L-5 ${-h} Q0 ${-h - 3} 5 ${-h} L1.5 0 Z`, '#8DBF55')
      + path(`M0 0 L0 ${-h - 1.5} Q2.5 ${-h - 2.2} 5 ${-h} L1.5 0 Z`, '#76A845')
      + line(`M-2 ${-h * 0.4} L-3 ${-h * 0.8} M1.5 ${-h * 0.5} L2.8 ${-h * 0.85}`, '#B7333F', 0.8)
      + leaf(0, -h - 1.5, -20, 7, 4, '#B7333F', '#9E2834'));
    return { back: tube(40, 30, -10) + tube(60, 32, 10) + tube(50, 40, 0) + tube(46, 22, -4) + tube(55, 24, 6) };
  };
  R.sundew = () => {
    const spoon = (a, L) => {
      const rad = (a * Math.PI) / 180, x = 50 + Math.sin(rad) * L, y = 63 - Math.cos(rad) * L;
      let s = line(`M50 63 L${r(x)} ${r(y)}`, '#8CB85A', 1.1) + dot(x, y, 3.4, '#C7D96B');
      for (let k = 0; k < 8; k++) { const b = (k * Math.PI) / 4; s += dot(x + Math.cos(b) * 4.2, y + Math.sin(b) * 4.2, 0.9, '#E2384F'); }
      return s;
    };
    return { back: spoon(-60, 18) + spoon(-25, 24) + spoon(5, 26) + spoon(35, 22) + spoon(65, 16) };
  };
  R['air-plant'] = () => ({ back:
    [-80, -55, -32, -12, 10, 32, 55, 80].map((a, i) => leaf(50, 60, a + (i % 2 ? 6 : -6), 22 - (i % 3) * 3, 2.6, '#B7C8B9', '#9DB1A0')).join('')
    + leaf(50, 58, 0, 14, 3, '#E5487A', '#C93469') });
  R['lucky-bamboo'] = () => {
    const stalk = (x, top, k) => roundRect(x - 2.6, top, 5.2, 64 - top, 2, '#6CBF4A') + roundRect(x, top, 2.6, 64 - top, 1.3, '#58A83A')
      + range(top + 8, 58, 3).map((y) => line(`M${x - 2.6} ${r(y)} L${x + 2.6} ${r(y)}`, '#3E8A33', 0.9)).join('')
      + leaf(x, top + 2, -50 * k, 10, 2.6, '#5FB35A', '#4A9A46') + leaf(x, top + 4, 40 * k, 9, 2.4, '#5FB35A', '#4A9A46');
    return { back: stalk(42, 30, 1) + stalk(50, 18, -1) + stalk(58, 36, 1) };
  };
  R['sensitive-plant'] = () => ({ back:
    [-60, -30, 0, 30, 60].map((a) => frond(50, 63, a, 28, Math.abs(a) * 0.15, 4, 1.4, '#7CC66B', '#61AD55', { sweep: 80, count: 9 })).join('')
    + [[40, 34], [58, 30]].map(([x, y]) => range(0, 330, 12).map((a) => g(x, y, a, line('M0 0 L0 -4', '#F49AC1', 0.8) + dot(0, -4, 0.6, '#FFD5E8'))).join('')).join('') });

  // Pot colour per species (default terracotta) — a little variety across the collection.
  const POT_FOR = {
    monstera: 'cream', pothos: 'mustard', philodendron: 'teal', 'boston-fern': 'terracotta', 'spider-plant': 'blue',
    'snake-plant': 'cream', 'zz-plant': 'mustard', 'peace-lily': 'blue', 'parlour-palm': 'terracotta', 'areca-palm': 'cream',
    'prayer-plant': 'pink', calathea: 'lilac', fittonia: 'pink', tradescantia: 'lilac', 'string-of-hearts': 'pink',
    'string-of-pearls': 'teal', hoya: 'cream', echeveria: 'pink', haworthia: 'cream', 'aloe-vera': 'terracotta',
    'jade-plant': 'blue', 'mexican-hat-plant': 'mustard', chalksticks: 'terracotta', 'golden-barrel': 'terracotta',
    'pincushion-cactus': 'cream', mammillaria: 'mustard', 'blue-torch': 'terracotta', 'christmas-cactus': 'blue',
    'fiddle-leaf-fig': 'cream', 'rubber-plant': 'mustard', 'olive-tree': 'terracotta', 'dragon-tree': 'teal',
    'corn-plant': 'mustard', 'cast-iron-plant': 'teal', 'bird-of-paradise': 'cream', peperomia: 'pink', pilea: 'mustard',
    bromeliad: 'blue', orchid: 'lilac', anthurium: 'cream', 'african-violet': 'mustard', amaryllis: 'cream',
    begonia: 'pink', aglaonema: 'blue', croton: 'teal', mint: 'terracotta', basil: 'blue', 'propagation-tray': 'terracotta',
  };

  const SCALE = {
    echeveria: 1.5, haworthia: 1.45, fittonia: 1.35, 'prayer-plant': 1.2, calathea: 1.1, begonia: 1.15,
    aglaonema: 1.2, croton: 1.25, 'aloe-vera': 1.25, pothos: 1.45, tradescantia: 1.5, hoya: 1.4, mint: 1.2,
    basil: 1.25, 'african-violet': 1.25, peperomia: 1.15, mammillaria: 1.1, 'string-of-hearts': 1.5,
    'string-of-pearls': 1.4, 'jade-plant': 1.15, chalksticks: 1.15, 'peace-lily': 1.15, 'propagation-tray': 1.35,
    generic: 1.1, 'mexican-hat-plant': 1.15, 'spider-plant': 1.1, bromeliad: 1.1, pilea: 1.1,
    lithops: 1.7, 'hens-and-chicks': 1.4, coleus: 1.5, thyme: 1.45, gasteria: 1.3, agave: 1.2, cyclamen: 1.2,
    streptocarpus: 1.2, dieffenbachia: 1.25, stromanthe: 1.15, 'polka-dot-plant': 1.2, 'air-plant': 1.3,
    'panda-plant': 1.2, kalanchoe: 1.15, gardenia: 1.15, 'birds-nest-fern': 1.1, 'staghorn-fern': 1.2,
  };

  const POT_NAMES = Object.keys(POTS);
  function potByHash(key) { let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return POT_NAMES[h % POT_NAMES.length]; }

  // ---------------- pot + face ----------------
  function pot(name) {
    const [base, shade, rim] = POTS[name] || POTS.terracotta;
    return path('M31 68 L69 68 L64.6 89 Q64 92 60.5 92 L39.5 92 Q36 92 35.4 89 Z', base)
      + path('M59 68 L69 68 L64.6 89 Q64 92 60.5 92 L56.5 92 Z', shade)
      + `<rect x="27" y="61" width="46" height="9" rx="3.5" fill="${rim}"/>`
      + `<rect x="62" y="61" width="11" height="9" rx="3.5" fill="${base}"/>`
      + `<rect x="31" y="63" width="14" height="2.2" rx="1.1" fill="#FFFFFF" opacity=".35"/>`;
  }

  const INK = '#3B2414';
  function face(mood) {
    const eye = (x, y) => dot(x, y, 2.7, INK) + dot(x + 0.9, y - 1, 0.95, '#FFFFFF');
    const blush = ell(38.6, 82.2, 2.7, 1.6, '#FF7A7A', 0) .replace('/>', ' opacity=".45"/>')
      + ell(61.4, 82.2, 2.7, 1.6, '#FF7A7A', 0).replace('/>', ' opacity=".45"/>');
    if (mood === 'thirsty') {
      // worried brows, open frown with tongue out, sweat drop
      return eye(44, 78.4) + eye(56, 78.4) + line('M40.6 74 L46.6 72.2 M53.4 72.2 L59.4 74', INK, 1.3)
        + path('M46.2 86.4 Q50 81 53.8 86.4 Z', INK) + ell(51.4, 87, 1.7, 1.9, '#FF8A8A')
        + path('M70.5 52 C72.5 55.5 74 57.5 74 59.3 A3.5 3.5 0 0 1 67 59.3 C67 57.5 68.5 55.5 70.5 52 Z', '#5DB7EE')
        + dot(69.3, 58.8, 0.9, '#FFFFFF');
    }
    if (mood === 'due') {
      return eye(44, 77.4) + eye(56, 77.4) + blush + ell(50, 84, 1.7, 2.1, INK);
    }
    return eye(44, 78) + eye(56, 78) + blush
      + path('M46 81.6 Q50 87.6 54 81.6 Z', INK) + path('M47.6 84.6 Q50 86.4 52.4 84.6 Q50 83.4 47.6 84.6 Z', '#FF8A8A');
  }

  // ---------------- thirsty effects ----------------
  // Blend foliage colours towards dry straw, and squash the plant down a little.
  function wilt(hex) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (c, t) => Math.round(c * 0.6 + t * 0.4);
    const rr = mix(n >> 16, 0xC9), gg = mix((n >> 8) & 255, 0xA4), bb = mix(n & 255, 0x4A);
    return '#' + ((1 << 24) | (rr << 16) | (gg << 8) | bb).toString(16).slice(1).toUpperCase();
  }
  const droop = (s) => `<g transform="translate(0 7.56) scale(1 .88)">${s.replace(/#[0-9A-Fa-f]{6}\b/g, wilt)}</g>`;

  const cache = new Map();
  function svg(species, mood = 'happy') {
    const key = (R[species] ? species : 'generic') + '|' + mood;
    if (cache.has(key)) return cache.get(key);
    const sp = key.split('|')[0];
    const art = R[sp]();
    let back = art.back || '', front = art.front || '';
    const k = SCALE[sp];
    if (k) back = `<g transform="translate(50 63) scale(${k}) translate(-50 -63)">${back}</g>`;
    if (mood === 'thirsty') { back = droop(back); front = droop(front); }
    const potName = POT_FOR[sp] || potByHash(sp);
    const out = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${back}${pot(potName)}${front}${face(mood)}</svg>`;
    cache.set(key, out);
    return out;
  }

  window.PlantArt = { svg, species: Object.keys(R) };
})();
