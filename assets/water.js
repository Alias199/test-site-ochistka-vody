// Animated light caustics for blocks marked with data-water. Falls back to the CSS gradient
// when WebGL is unavailable or the visitor prefers reduced motion.
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FRAG = [
    'precision mediump float;',
    'uniform vec2 r;uniform float t;uniform float k;',
    'float net(vec2 p,float s){',
    '  for(int i=1;i<5;i++){float f=float(i);',
    '    p+=.42/f*vec2(sin(f*p.y+s*.9+f*1.3),sin(f*p.x-s*.7+f*.7));}',
    '  float a=sin(p.x*2.6)*sin(p.y*2.6);',
    '  return 1.-smoothstep(0.,.16,abs(a));}',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/r.y;',
    '  float c=net(uv*3.2,t*.55)*.75+net(uv*5.1+7.,t*.8)*.35;',
    '  float fade=smoothstep(0.,.75,gl_FragCoord.y/r.y);',
    '  float a=c*k*(.35+.65*fade);',
    '  gl_FragColor=vec4(a,a,a,a);}'
  ].join('\n');

  function start(el) {
    var cv = document.createElement('canvas');
    cv.className = 'water-canvas';
    cv.setAttribute('aria-hidden', 'true');
    el.insertBefore(cv, el.firstChild);
    var gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false });
    if (!gl) { cv.remove(); return; }
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.remove(); return; }
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uR = gl.getUniformLocation(pr, 'r'), uT = gl.getUniformLocation(pr, 't'), uK = gl.getUniformLocation(pr, 'k');
    gl.uniform1f(uK, parseFloat(el.getAttribute('data-water')) || .5);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    var scale = 0.5, visible = true, raf = 0, t0 = performance.now();
    function size() {
      var w = Math.max(1, Math.round(el.clientWidth * scale)), h = Math.max(1, Math.round(el.clientHeight * scale));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(uR, w, h); }
    }
    function frame(now) {
      size();
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uT, reduce ? 12 : (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce && visible) raf = requestAnimationFrame(frame);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !reduce) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
      }).observe(el);
    }
    window.addEventListener('resize', function () { if (reduce) frame(performance.now()); });
    raf = requestAnimationFrame(frame);
    cv.classList.add('on');
  }
  document.querySelectorAll('[data-water]').forEach(start);

  // Reveal on scroll
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (n) {
      if (n.getBoundingClientRect().top < innerHeight) n.classList.add('in'); else io.observe(n);
    });
    document.documentElement.classList.add('js-reveal');
  } else {
    document.querySelectorAll('.reveal').forEach(function (n) { n.classList.add('in'); });
  }
})();

// Header phone numbers: on a desktop a tel: link would open Skype/FaceTime, so they lead to the contacts block;
// on touch devices they dial.
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) {
  document.querySelectorAll('a[data-tel]').forEach(function (a) { a.href = 'tel:' + a.getAttribute('data-tel'); });
}
