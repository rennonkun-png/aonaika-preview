// あお内科 デザイン案 共通の動き
// 1. 写真が中央から散らばり、決まった位置で止まる（その後は動かない）
// 2. スクロールで動画の場面に入ると再生し、以降は背景として流れ続ける
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sp = matchMedia('(max-width: 767px)');

  // data-pc / data-sp = "x,y,幅,傾き"（x・y は親に対する%、幅は親の幅に対する%）。data-sp="-" はスマホで出さない
  function place(items) {
    items.forEach(function (el) {
      var spec = (sp.matches && el.dataset.sp) ? el.dataset.sp : el.dataset.pc;
      el.hidden = spec === '-';
      if (el.hidden) return;
      var p = spec.split(',').map(Number);
      el.style.setProperty('--x', p[0] + '%');
      el.style.setProperty('--y', p[1] + '%');
      el.style.setProperty('--w', p[2] + '%');
      el.style.setProperty('--r', (p[3] || 0) + 'deg');
      // 中央からの距離（px）。散らばる前は、ここから中央へ寄せておく
      var box = el.parentNode.getBoundingClientRect();
      el.style.setProperty('--dx', ((50 - p[0]) / 100 * box.width).toFixed(0) + 'px');
      el.style.setProperty('--dy', ((50 - p[1]) / 100 * box.height).toFixed(0) + 'px');
    });
  }

  document.querySelectorAll('[data-scatter]').forEach(function (root) {
    var items = root.querySelectorAll('.sc');
    items.forEach(function (el, i) { el.style.transitionDelay = (reduce ? 0 : 200 + i * 50) + 'ms'; });
    place(items);
    sp.addEventListener('change', function () {
      items.forEach(function (el) { el.style.transitionDelay = '0ms'; });
      place(items);
    });

    // 写真と文字（フォント）がそろってから始める。代わりの文字が一瞬見えるのを防ぐ
    var imgs = Array.prototype.map.call(root.querySelectorAll('img'), function (img) {
      return img.complete ? null : new Promise(function (ok) { img.onload = img.onerror = ok; });
    });
    var ready = Promise.all(imgs.concat(document.fonts ? document.fonts.ready : null));
    var timeout = new Promise(function (ok) { setTimeout(ok, 3000); });
    Promise.race([ready, timeout]).then(function () {
      requestAnimationFrame(function () { root.classList.add('is-in'); });
      setTimeout(function () { root.classList.add('is-in'); }, 100);
    });
  });

  // 破れた紙のふち：.torn の四辺を少しずつぎざぎざに切る（写真ごとに形が変わる）
  // 手で破いたように、1〜2辺だけを大きくうねらせて破る。ほかの辺はハサミで切ったようにほぼまっすぐ。
  // 写真の層は紙よりさらに内側で破れ、破れた辺だけ白い紙の繊維がのぞく
  function edge(torn) {
    var a = torn ? 3 + Math.random() * 4 : 0.4, base = torn ? 2 : 0;
    var slope = torn ? Math.random() * 6 - 3 : 0;   // 少し斜めに裂ける
    var k = [1 + Math.random() * 2, 3 + Math.random() * 4, 9 + Math.random() * 8];
    var p = [Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3];
    return function (t) {
      var w = Math.sin(t * k[0] * 6.28 + p[0]) * .5 + Math.sin(t * k[1] * 6.28 + p[1]) * .3 + Math.sin(t * k[2] * 6.28 + p[2]) * .2;
      var v = base + a * (w + 1) / 2 + Math.max(0, slope > 0 ? slope * t : -slope * (1 - t)) + (torn ? Math.random() * 0.9 : 0);
      return v.toFixed(1) + 'px';
    };
  }
  function polygon(f, step) {
    var pts = [], t, inv = function (v) { return 'calc(100% - ' + v + ')'; };
    for (t = 0; t <= 1.0001; t += step) pts.push((t * 100).toFixed(2) + '% ' + f[0](t));
    for (t = 0; t <= 1.0001; t += step) pts.push(inv(f[1](t)) + ' ' + (t * 100).toFixed(2) + '%');
    for (t = 1; t >= -0.0001; t -= step) pts.push((t * 100).toFixed(2) + '% ' + inv(f[2](t)));
    for (t = 1; t >= -0.0001; t -= step) pts.push(f[3](t) + ' ' + (t * 100).toFixed(2) + '%');
    return 'polygon(' + pts.join(',') + ')';
  }
  document.querySelectorAll('.torn').forEach(function (el) {
    var sides = [false, false, false, false];
    sides[Math.floor(Math.random() * 4)] = true;
    var paper = sides.map(edge);
    el.style.clipPath = polygon(paper, .008);
    // 写真の層：破れた辺は紙より 3〜9px 内側で、別のうねりで破れる
    var img = el.querySelector('img');
    if (img) {
      var inner = sides.map(function (torn, i) {
        if (!torn) return function () { return '0px'; };
        var e = edge(true), f = paper[i];
        return function (t) { return (parseFloat(f(t)) + parseFloat(e(t)) * .5).toFixed(1) + 'px'; };
      });
      img.style.clipPath = polygon(inner, .008);
    }
    // 3枚に1枚ほど、マスキングテープを貼る
    if (Math.random() < .3) {
      var tape = document.createElement('span');
      tape.className = 'tape';
      tape.style.setProperty('--tr', (Math.random() * 16 - 8).toFixed(1) + 'deg');
      tape.style.left = (25 + Math.random() * 30).toFixed(0) + '%';
      el.parentNode.appendChild(tape);
    }
  });


  // 開閉式メニュー：外側のクリック・Esc・リンクを押したら閉じる
  var mb = document.querySelector('.mbtn'), mp = document.querySelector('.mpanel');
  if (mb && mp) {
    function setMenu(open) { mp.classList.toggle('is-open', open); mb.setAttribute('aria-expanded', open); mb.querySelector('span').textContent = open ? '閉じる' : 'メニュー'; }
    mb.addEventListener('click', function () { setMenu(!mp.classList.contains('is-open')); });
    document.addEventListener('click', function (e) { if (!mp.contains(e.target) && !mb.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    mp.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  }

  // 動画：場面に入ったら再生、出たら一時停止（データ量と電池の節約）
  document.querySelectorAll('[data-stage]').forEach(function (stage) {
    var v = stage.querySelector('video');
    if (!v) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { if (!reduce) v.play().catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.01 }).observe(stage);
  });
})();
