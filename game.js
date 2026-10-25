// ===============================================================
// TURBO NIGHT - Milestone 1: the playable core (Three.js)
// Sections: 1 Scene | 2 Cars | 3 Road | 4 Input | 5 State | 6 Update | 7 Loop
// Big idea: the road never moves. Your car stays at z = 0 and the
// WORLD scrolls toward the camera. That is how most endless racers work.
// ===============================================================

if (typeof THREE === 'undefined') {
  document.querySelector('#menu p').textContent =
    'Could not load Three.js. Check your internet connection and reload.';
  document.getElementById('startBtn').classList.add('hidden');
} else {
  main();
}

function main() {
  const ROAD_W = 12;                 // road spans x = -6 .. +6
  const LANES = [-4, 0, 4];          // where traffic drives
  const PLAYER_LIMIT = ROAD_W / 2 - 1.1; // keeps the car on the asphalt
  const FIRST_AHEAD = 20;            // scenery wraps once it passes behind us

  // ---------- 1. SCENE ----------
  // Scene = the 3D world. Camera = our eyes. Renderer = draws it to the page.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a0f3d);
  scene.fog = new THREE.Fog(0x1a0f3d, 40, 180); // distant things fade out

  const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 300);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('stage').appendChild(renderer.domElement);

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  scene.add(new THREE.AmbientLight(0x8a7bd6, 0.9));
  const moon = new THREE.DirectionalLight(0xffe2b8, 0.8);
  moon.position.set(-10, 20, 10);
  scene.add(moon);

  // ---------- 2. CARS ----------
  // A "Group" lets us build one car from several simple shapes and
  // move them all together.
  function makeCar(color) {
    const car = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.7, 4),
      new THREE.MeshLambertMaterial({ color })
    );
    body.position.y = 0.65;
    car.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.6, 2),
      new THREE.MeshLambertMaterial({ color: 0x1b1b2b })
    );
    cabin.position.set(0, 1.25, 0.2);
    car.add(cabin);

    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
    for (const x of [-0.95, 0.95]) {
      for (const z of [-1.3, 1.3]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.38, z);
        car.add(wheel);
      }
    }

    // Glowing tail lights on the back (+z), which is what the camera sees.
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xff2a3d });
    for (const x of [-0.65, 0.65]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
      lamp.position.set(x, 0.75, 2.02);
      car.add(lamp);
    }
    return car;
  }

  const player = makeCar(0xffb347);
  scene.add(player);

  // ---------- 3. ROAD & SCENERY ----------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 700),
    new THREE.MeshLambertMaterial({ color: 0x0b1d2a })
  );
  ground.rotation.x = -Math.PI / 2; // planes start upright, so lay it flat
  ground.position.set(0, -0.02, -250);
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_W, 700),
    new THREE.MeshLambertMaterial({ color: 0x26263a })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, -250);
  scene.add(road);

  // Glowing edge lines (these never move).
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  for (const x of [-ROAD_W / 2 + 0.2, ROAD_W / 2 - 0.2]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 700), edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(x, 0.01, -250);
    scene.add(edge);
  }

  // Scrolling lane dashes. When one passes behind us we send it to the far
  // end, so a small pool of objects looks like an endless road.
  const DASH_GAP = 9, DASH_COUNT = 26;
  const dashes = [];
  const dashGeo = new THREE.PlaneGeometry(0.25, 3);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf2ecff });
  for (const x of [-2, 2]) {
    for (let i = 0; i < DASH_COUNT; i++) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.02, FIRST_AHEAD - i * DASH_GAP);
      scene.add(dash);
      dashes.push(dash);
    }
  }

  // Roadside lamp posts.
  const POLE_GAP = 24, POLE_COUNT = 12;
  const poles = [];
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 5, 8);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3558 });
  const lampGeo = new THREE.SphereGeometry(0.4, 10, 10);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd08a });
  for (const side of [-1, 1]) {
    for (let i = 0; i < POLE_COUNT; i++) {
      const pole = new THREE.Group();
      const post = new THREE.Mesh(poleGeo, poleMat);
      post.position.y = 2.5;
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.y = 5.1;
      pole.add(post, lamp);
      pole.position.set(side * (ROAD_W / 2 + 2), 0, FIRST_AHEAD - i * POLE_GAP);
      scene.add(pole);
      poles.push(pole);
    }
  }

  // Move scenery toward the camera; wrap it to the back of the line.
  function scrollScenery(distance) {
    for (const d of dashes) {
      d.position.z += distance;
      if (d.position.z > FIRST_AHEAD) d.position.z -= DASH_GAP * DASH_COUNT;
    }
    for (const p of poles) {
      p.position.z += distance;
      if (p.position.z > FIRST_AHEAD) p.position.z -= POLE_GAP * POLE_COUNT;
    }
  }

  // ---------- 4. INPUT ----------
  const keys = {};
  let touchSteer = 0; // -1 left, 0 none, +1 right

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if ((e.code === 'Enter' || e.code === 'Space') && state !== 'playing' && !e.repeat) {
      startGame();
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; touchSteer = 0; });

  // Hold the left or right half of the screen to steer.
  const stage = document.getElementById('stage');
  function steerFromPointer(e) { touchSteer = e.clientX < window.innerWidth / 2 ? -1 : 1; }
  stage.addEventListener('pointerdown', steerFromPointer);
  stage.addEventListener('pointermove', (e) => { if (touchSteer !== 0) steerFromPointer(e); });
  window.addEventListener('pointerup', () => { touchSteer = 0; });
  window.addEventListener('pointercancel', () => { touchSteer = 0; });

  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('restartBtn').addEventListener('click', startGame);

  // ---------- 5. GAME STATE ----------
  const menuEl = document.getElementById('menu');
  const gameoverEl = document.getElementById('gameover');
  const hudEl = document.getElementById('hud');
  const speedEl = document.getElementById('speed');
  const distanceEl = document.getElementById('distance');
  const finalScoreEl = document.getElementById('finalScore');

  let state = 'menu';            // 'menu' | 'playing' | 'gameover'
  let traffic = [];              // each: { mesh, speed }
  let speed = 30;                // our speed in world units per second
  let distance = 0;              // metres driven = the score
  let elapsed = 0;
  let spawnTimer = 0;
  let steer = 0;                 // smoothed steering, -1 .. +1

  function startGame() {
    for (const t of traffic) scene.remove(t.mesh);
    traffic = [];
    speed = 30;
    distance = 0;
    elapsed = 0;
    spawnTimer = 1;
    steer = 0;
    player.position.x = 0;
    player.rotation.y = 0;

    menuEl.classList.add('hidden');
    gameoverEl.classList.add('hidden');
    hudEl.classList.remove('hidden');
    state = 'playing';
  }

  function crash() {
    state = 'gameover';
    finalScoreEl.textContent = Math.floor(distance) + ' m';
    hudEl.classList.add('hidden');
    gameoverEl.classList.remove('hidden');
  }

  // ---------- 6. UPDATE ----------
  const TRAFFIC_COLORS = [0x4cc9f0, 0xf72585, 0x7bf1a8, 0xb5179e, 0xf8f9fa];

  function spawnTraffic() {
    const mesh = makeCar(TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)]);
    mesh.position.set(LANES[Math.floor(Math.random() * LANES.length)], 0, -170);
    scene.add(mesh);
    traffic.push({ mesh, speed: 12 + Math.random() * 8 });
  }

  function update(dt) {
    if (state === 'menu') { scrollScenery(18 * dt); return; } // gentle idle motion
    if (state === 'gameover') return;                          // freeze the crash scene

    elapsed += dt;

    // Difficulty: we get faster and traffic gets denser over time.
    speed = Math.min(30 + elapsed * 0.9, 80);
    const spawnEvery = Math.max(0.45, 1.3 - elapsed * 0.012);

    // Steering (keyboard + touch), then smooth it so the car feels weighty.
    let target = 0;
    if (keys.ArrowLeft || keys.KeyA) target -= 1;
    if (keys.ArrowRight || keys.KeyD) target += 1;
    if (target === 0) target = touchSteer;
    steer += (target - steer) * Math.min(1, dt * 10);

    player.position.x += steer * 10 * dt;
    player.position.x = Math.max(-PLAYER_LIMIT, Math.min(PLAYER_LIMIT, player.position.x));
    player.rotation.y = -steer * 0.22; // nose points where we steer (right = negative)

    scrollScenery(speed * dt);
    distance += speed * dt;

    // Traffic drives slower than us, so relative to us it comes toward the camera.
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnTraffic(); spawnTimer = spawnEvery; }

    for (const t of traffic) t.mesh.position.z += (speed - t.speed) * dt;

    // Box collision: the cars overlap if they overlap on BOTH x and z.
    for (const t of traffic) {
      const dx = Math.abs(t.mesh.position.x - player.position.x);
      const dz = Math.abs(t.mesh.position.z - player.position.z);
      if (dx < 1.7 && dz < 3.9) { crash(); return; }
    }

    // Remove traffic that is now behind the camera (also frees memory).
    traffic = traffic.filter((t) => {
      if (t.mesh.position.z > 15) { scene.remove(t.mesh); return false; }
      return true;
    });

    speedEl.textContent = Math.round(speed * 2.2);
    distanceEl.textContent = Math.floor(distance);
  }

  function updateCamera() {
    // Follow the car a little, and widen the view as speed rises.
    camera.position.set(player.position.x * 0.6, 4.2, 9);
    camera.lookAt(player.position.x * 0.3, 1.2, -12);
    const targetFov = state === 'playing' ? 65 + (speed - 30) * 0.15 : 65;
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
  }

  // ---------- 7. LOOP ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); // cap so tab-switching can't cause a jump
    last = now;
    update(dt);
    updateCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}