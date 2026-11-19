// A chase camera moves along a depth axis. Objects grow as we approach,
// pass the edges of the camera, then disappear behind us.
function createFlightChart(canvas) {
  const context = canvas.getContext("2d");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let width = innerWidth, height = innerHeight;
  let state = { world: 0, distance: 0, drift: 0 };
  let transition = null, frame = 0, lastTime = 0, odometer = 0, visibleRoute = 0;
  let overview = 0, viewTransition = null, rollingFrameMs = 16.7, frameCount = 0;
  let pixelRatio = Math.min(1.5, devicePixelRatio || 1);
  const pose = { surge: 0, turn: 0, yaw: 0, pitch: 0, x: 0, y: 0 };
  const pointer = { x: 0, y: 0 };
  const camera = { x: 0, y: 0, pathX: 0, pathY: 0 };
  const images = {};
  for (const name of ["probe-rear", "earth", "mars", "saturn", "neptune", "jupiter", "uranus", "pluto", "asteroid", "deep-space"]) {
    const image = new Image();
    image.src = "./assets/" + name + ".png";
    image.addEventListener("load", () => {
      // Decode and resize artwork once, instead of scaling huge source textures
      // and recoloring the Kuiper rocks on every frame.
      const max = name === "asteroid" ? 256 : name === "deep-space" ? 1600 : name === "probe-rear" ? 1280 : 1024;
      images[name] = cachedArtwork(image, max);
      if (name === "asteroid") images["ice-rock"] = cachedArtwork(image, 256, "hue-rotate(155deg) saturate(.5) brightness(1.2)");
      requestDraw();
    });
    images[name] = image;
  }
  function surface(w, h) {
    const result = document.createElement("canvas");
    result.width = w; result.height = h;
    return result;
  }
  function cachedArtwork(image, max, filter = "none") {
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    const result = surface(Math.round(image.naturalWidth * scale), Math.round(image.naturalHeight * scale));
    result.naturalWidth = result.width; result.naturalHeight = result.height;
    const brush = result.getContext("2d");
    brush.filter = filter;
    brush.drawImage(image, 0, 0, result.width, result.height);
    return result;
  }
  // A soft trail texture and glow textures replace hundreds of live gradients
  // and shadow-blur operations on each frame.
  const trailSprite = surface(128, 20);
  const trailBrush = trailSprite.getContext("2d");
  const trailGradient = trailBrush.createLinearGradient(0, 0, 124, 0);
  trailGradient.addColorStop(0, "#83bdde00");
  trailGradient.addColorStop(1, "#c1e4f5");
  trailBrush.strokeStyle = trailGradient;
  trailBrush.lineWidth = 2;
  trailBrush.shadowColor = "#a9dcff";
  trailBrush.shadowBlur = 3;
  trailBrush.beginPath(); trailBrush.moveTo(0, 10); trailBrush.lineTo(124, 10); trailBrush.stroke();
  const glows = new Map();
  let seed = 7043;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const stars = Array.from({ length: 430 }, () => ({
    x: (random() - .5) * 14, y: (random() - .5) * 10,
    z: random() * 10, radius: .25 + random() ** 3 * 1.1,
  }));
  // Each stone is a complete transparent sprite, placed independently in 3D.
  // There is no rectangular asteroid-field image to expose a cut bottom edge.
  const rocks = Array.from({ length: 105 }, () => ({
    angle: random() * Math.PI * 2, radius: .85 + random() * 4.7,
    depth: random() * 10, size: .09 + random() ** 2 * .55,
    rotation: (random() - .5) * 3.5, spin: (random() - .5) * .025,
    squash: .65 + random() * .5,
  }));
  const dust = Array.from({ length: 34 }, () => ({
    x: (random() - .5) * 10, y: (random() - .5) * 7, z: random() * 6,
  }));
  const lerp = (a, b, t) => a + (b - a) * t;
  const mod = (value, period) => ((value % period) + period) % period;
  const smooth = (t) => t * t * (3 - 2 * t);
  const ready = (image) => image && (image.complete === undefined ? image.width > 0 : image.complete && image.naturalWidth > 0);
  const focalLength = () => width < 690 ? width * .72 : Math.min(width * .54, height * .88);
  const horizon = () => ({
    x: width * (width < 690 ? .46 : .36) - camera.x,
    y: (width < 690 ? 122 : height * .39) - camera.y,
  });
  const routeFor = (flight) => flight.world + ((flight.earned ?? flight.distance) - flight.world) * .18 + flight.drift * .15 + (flight.driftTotal || 0) * .10;

  // A continuous world-space corridor, rather than screen-space left/right
  // offsets. Nearby bends blend, including jumps across several checkpoints.
  function flightPath(route) {
    let x = 0, y = 0, bank = 0;
    for (let i = Math.max(0, Math.floor(route) - 2); i <= Math.ceil(route) + 2; i++) {
      const bend = Math.exp(-Math.pow((route - i + .03) / .48, 2));
      const side = checkpoint(i).side;
      x += side * bend * 1.15;
      y += bend * .16;
      bank += side * bend;
    }
    return { x, y, bank: Math.max(-1, Math.min(1, bank)) };
  }

  function glow(x, y, radius, color, opacity) {
    const key = color + opacity;
    if (!glows.has(key)) {
      const texture = surface(256, 256), brush = texture.getContext("2d");
      const light = brush.createRadialGradient(128, 128, 0, 128, 128, 128);
      light.addColorStop(0, key); light.addColorStop(1, color + "00");
      brush.fillStyle = light; brush.fillRect(0, 0, 256, 256);
      glows.set(key, texture);
    }
    const r = Math.min(radius, Math.max(width, height) * 1.2);
    context.drawImage(glows.get(key), x - r, y - r, r * 2, r * 2);
  }

  function streak(x, y, endX, endY, opacity, lineWidth) {
    const length = Math.hypot(endX - x, endY - y);
    if (length < .1) return;
    context.save();
    context.translate(x, y);
    context.rotate(Math.atan2(endY - y, endX - x));
    context.globalAlpha *= opacity;
    const h = Math.max(3, lineWidth * 8);
    context.drawImage(trailSprite, 0, -h / 2, length, h);
    context.restore();
  }

  function paintSky(speed) {
    context.fillStyle = "#02080e";
    context.fillRect(0, 0, width, height);
    const sky = images["deep-space"];
    const focus = horizon();
    if (ready(sky)) {
      const scale = Math.max(width / sky.naturalWidth, height / sky.naturalHeight) * (1.06 + speed * .025);
      const w = sky.naturalWidth * scale, h = sky.naturalHeight * scale;
      context.globalAlpha = .64;
      context.drawImage(sky, (width - w) / 2 - camera.x * .3, (height - h) / 2 - camera.y * .3, w, h);
      context.globalAlpha = 1;
    }
    glow(focus.x, focus.y, width * .5, "#164253", "24");
    const focal = focalLength();
    for (const star of stars) {
      const z = .25 + mod(star.z - odometer, 10);
      const scale = focal / z;
      const x = focus.x + (star.x - camera.pathX) * scale, y = focus.y + (star.y - camera.pathY) * scale;
      if (x < -160 || x > width + 160 || y < -160 || y > height + 160) continue;
      const alpha = Math.min(.82, .16 + .7 / z);
      if (reducedMotion.matches) {
        context.fillStyle = "rgba(192,218,235," + alpha + ")";
        context.fillRect(x, y, star.radius, star.radius);
      } else {
        // The rear end of a trail is an earlier projection of the same star.
        // Near stars stretch farther, like a long exposure from a moving camera.
        const oldScale = focal / (z + .09 + speed * .48);
        streak(focus.x + (star.x - camera.pathX) * oldScale, focus.y + (star.y - camera.pathY) * oldScale,
          x, y, alpha, star.radius, speed > .3 ? 2 : .4);
      }
    }
  }

  function paintWorld(index, z) {
    const stop = checkpoint(index), image = images[stop.image];
    if ((stop.kind !== "star" && !ready(image)) || z < .5 || z > 32) return;
    const mobile = width < 690;
    const focus = horizon();
    const perspective = 7 / z;
    const baseSize = mobile ? width * .66 : Math.min(width * .40, height * .55);
    const x = focus.x + stop.side * width * (mobile ? .12 : .13) * perspective - camera.pathX * focalLength() / z;
    const y = focus.y - (mobile ? 15 : height * .11) * perspective - camera.pathY * focalLength() / z;
    const size = baseSize * perspective;
    if (stop.kind === "star") {
      glow(x, y, size * .65, stop.color, "8a");
      glow(x, y, size * .24, "#fff0de", "e8");
      return;
    }
    const artScale = stop.image === "saturn" ? 1.65 : ["jupiter", "uranus", "pluto"].includes(stop.image) ? 1.5 : 1;
    const w = size * artScale;
    const h = w / image.naturalWidth * image.naturalHeight;
    if (x + w / 2 < 0 || x - w / 2 > width || y + h / 2 < 0 || y - h / 2 > height) return;
    context.save();
    context.globalAlpha = Math.min(1, (9 / z) ** 1.7);
    glow(x - size * .16, y - size * .08, size * .62,
      stop.color, "26");
    context.drawImage(image, x - w / 2, y - h / 2, w, h);
    context.restore();
  }

  function beltStones(index, z, time) {
    const focus = horizon(), focal = focalLength();
    return rocks.flatMap((rock) => {
      const localDepth = mod(rock.depth - odometer * .15, 10);
      const depth = z - 6.3 + localDepth;
      if (depth < .4 || depth > 30) return [];
      const scale = focal / depth;
      const x = focus.x + (Math.cos(rock.angle) * rock.radius - camera.pathX) * scale;
      const y = focus.y + (Math.sin(rock.angle) * rock.radius * .45 - camera.pathY) * scale;
      const size = rock.size * scale * 2;
      if (x + size < 0 || x - size > width || y + size < 0 || y - size > height) return [];
      return [{ x, y, size, depth, rock, index,
        alpha: Math.min(1, 15 / depth) * Math.min(1, localDepth * 2, (10 - localDepth) * 2),
        rotation: rock.rotation + (reducedMotion.matches ? 0 : time * .0004 * rock.spin),
      }];
    });
  }

  function paintStone(stone, speed) {
    const image = images[checkpoint(stone.index).ice ? "ice-rock" : "asteroid"];
    if (!ready(image)) return;
    const { x, y, size, alpha, rotation, rock, index } = stone;
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.globalAlpha = alpha;
    context.drawImage(image, -size / 2, -size * rock.squash / 2, size, size * rock.squash);
    context.restore();
    if (speed > .3 && stone.depth < 4) {
      const focus = horizon();
      streak(x, y, x + (x - focus.x) * speed * .14,
        y + (y - focus.y) * speed * .14, .10, 2, 5);
    }
  }

  function paintProbe(time) {
    const image = images["probe-rear"];
    if (!ready(image)) return;
    const mobile = width < 690;
    const motion = reducedMotion.matches ? 0 : 1;
    const surge = pose.surge;
    const turn = pose.turn * motion;
    const scale = 1 - surge * .25;
    const w = (mobile ? width * .82 : Math.min(width * .46, 690)) * scale;
    const h = w / image.naturalWidth * image.naturalHeight;
    // The chase camera lags behind the craft's world-space position. This
    // relative projection, not the roll angle, determines screen position.
    const follow = focalLength() / 3.4;
    const x = width * (mobile ? .46 : .34) + (pose.x - camera.pathX) * follow - camera.x * .7;
    const y = (mobile ? 218 : height * .70) - height * (mobile ? .04 : .10) * surge
      + (pose.y - camera.pathY) * follow - camera.y * .7;
    const bank = motion * (turn * Math.PI * .30);
    const yaw = pose.yaw * motion, pitch = pose.pitch * motion;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(bank), sr = Math.sin(bank);
    // Rotate a textured surface in 3D, then project it. A near wing gets
    // larger and the far wing recedes; rotating a flat sprite cannot do this.
    function project(px, py, depth = 0) {
      const ax = px * cy + depth * sy, az = -px * sy + depth * cy;
      const ay = py * cp - az * sp, bz = py * sp + az * cp;
      const perspective = w * 2.2 / (w * 2.2 + bz);
      return { x: (ax * cr - ay * sr) * perspective,
        y: (ax * sr + ay * cr) * perspective };
    }
    context.save();
    context.translate(x, y);
    // Exhaust attaches to the projected nozzle and trails opposite heading.
    // Its far end lags through the turn instead of rotating as a rigid shape.
    const nozzle = project(0, h * .13, -w * .025);
    const wakeLength = h * (.45 + surge * 1.6);
    const tail = { x: nozzle.x - Math.sin(bank) * wakeLength * .45 - yaw * w * .6,
      y: nozzle.y + wakeLength };
    const trail = context.createLinearGradient(nozzle.x, nozzle.y, tail.x, tail.y);
    trail.addColorStop(0, "rgba(167,222,255," + (.14 + surge * .4) + ")");
    trail.addColorStop(.3, "rgba(92,182,236," + (.04 + surge * .12) + ")");
    trail.addColorStop(1, "rgba(59,134,190,0)");
    context.fillStyle = trail;
    context.beginPath();
    context.moveTo(nozzle.x - w * .018, nozzle.y);
    context.quadraticCurveTo(tail.x - w * .045, tail.y * .7, tail.x, tail.y);
    context.quadraticCurveTo(tail.x + w * .045, tail.y * .7, nozzle.x + w * .018, nozzle.y);
    context.fill();
    glow(nozzle.x, nozzle.y, w * .18, "#76bff0", surge > .1 ? "42" : "1b");
    const strips = 48;
    for (let i = 0; i < strips; i++) {
      const u = i / strips;
      const edge = Math.max(0, Math.abs(u + .5 / strips - .5) - .09) / .41;
      const side = u < .5 ? -1 : 1;
      const bend = motion * Math.sin(time * .0015 + edge * 1.2 + side * .2) * edge ** 1.6 * h * .035;
      const left = -w / 2 + u * w, stripWidth = w / strips;
      const top = project(left, -h / 2 + bend);
      const right = project(left + stripWidth, -h / 2 + bend);
      const bottom = project(left, h / 2 + bend);
      context.save();
      context.transform((right.x - top.x) / stripWidth, (right.y - top.y) / stripWidth,
        (bottom.x - top.x) / h, (bottom.y - top.y) / h, top.x, top.y);
      context.drawImage(image, u * image.naturalWidth, 0, image.naturalWidth / strips, image.naturalHeight,
        0, 0, stripWidth + .65, h);
      context.restore();
    }
    context.globalCompositeOperation = "screen";
    const rim = project(-w * .13, -h * .12);
    glow(rim.x, rim.y, w * .16, state.world === 1 ? "#b87654" : "#6facca", "12");
    context.restore();
  }

  function paintForeground(speed) {
    if (reducedMotion.matches) return;
    const focus = horizon(), focal = focalLength();
    for (const mote of dust) {
      const z = .3 + mod(mote.z - odometer * 1.4, 6);
      const scale = focal / z, oldScale = focal / (z + .12 + speed * .45);
      const x = focus.x + (mote.x - camera.pathX) * scale, y = focus.y + (mote.y - camera.pathY) * scale;
      if (x < 0 || x > width * .64 || y < 0 || y > height) continue;
      streak(focus.x + (mote.x - camera.pathX) * oldScale, focus.y + (mote.y - camera.pathY) * oldScale,
        x, y, .07 + speed * .08, 1.5, 3);
    }
  }

  function overviewPoints(entries) {
    const mobile = width < 690, columns = entries.length > 6 ? 3 : 2;
    const rows = Math.ceil(entries.length / columns);
    const left = width * (mobile ? .13 : .09), right = width * (mobile ? .86 : .49);
    const top = mobile ? 260 : Math.max(300, height * .34);
    const bottom = Math.max(mobile ? 510 : height * .76, top + (rows - 1) * 65);
    return entries.map((index, i) => {
      const row = Math.floor(i / columns), position = i % columns;
      const column = row % 2 ? columns - 1 - position : position;
      return { index, x: left + (right - left) * column / (columns - 1),
        y: bottom - (bottom - top) * row / Math.max(1, rows - 1) };
    });
  }
  function routePoint(points, position) {
    const last = points.length - 1;
    const value = Math.max(0, Math.min(last, position));
    const index = Math.min(last - 1, Math.floor(value)), t = value - index;
    const p0 = points[Math.max(0, index - 1)], p1 = points[index];
    const p2 = points[index + 1], p3 = points[Math.min(last, index + 2)];
    const coordinate = (key) => .5 * ((2 * p1[key]) + (-p0[key] + p2[key]) * t +
      (2 * p0[key] - 5 * p1[key] + 4 * p2[key] - p3[key]) * t * t +
      (-p0[key] + 3 * p1[key] - 3 * p2[key] + p3[key]) * t * t * t);
    return { x: coordinate("x"), y: coordinate("y") };
  }
  function paintOverview(amount) {
    const mobile = width < 690, entries = overviewIndices(state.world);
    const points = overviewPoints(entries), current = entries.indexOf(state.world);
    const end = Math.max(0, current + Math.max(-.49, Math.min(.49, (state.earned ?? state.world) - state.world)) + state.drift * .3);
    context.save(); context.globalAlpha = amount;
    const anchor = points[current];
    context.translate(anchor.x, anchor.y);
    const scale = .35 + .65 * amount;
    context.scale(scale, scale);
    context.translate(-anchor.x, -anchor.y);
    context.strokeStyle = "#9fc9df13"; context.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      context.beginPath();
      context.ellipse(points[0].x - width * .20, points[0].y + 35,
        width * (.18 + i * .11), (mobile ? 80 : height * .16) + i * 45, -.38, -2.7, .2);
      context.stroke();
    }
    function line(until, color, thickness, dashed = false) {
      context.strokeStyle = color; context.lineWidth = thickness;
      context.setLineDash(dashed ? [3, 7] : []); context.beginPath();
      for (let i = 0; i <= 180; i++) {
        const point = routePoint(points, until * i / 180);
        if (!i) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y);
      }
      context.stroke(); context.setLineDash([]);
    }
    line(points.length - 1, "#7895a76b", 1, true);
    const last = points.at(-1);
    const light = context.createLinearGradient(points[0].x, points[0].y, last.x + 1, last.y);
    light.addColorStop(0, "#80baff"); light.addColorStop(.6, "#b5dce3"); light.addColorStop(1, "#f4cf8b");
    line(end, "#a2d5f317", 8); line(end, light, 2);
    points.forEach((point) => {
      const index = point.index;
      if (index === null) {
        context.font = "13px 'DM Sans', sans-serif"; context.textAlign = "center"; context.fillStyle = "#9eb7c4";
        context.fillText("More checkpoints", point.x, point.y);
        return;
      }
      const stop = checkpoint(index), reached = index <= state.world;
      context.save(); context.globalAlpha *= reached ? 1 : .35;
      const base = mobile ? 29 : 40;
      const size = stop.image === "saturn" ? base * 1.7 : ["jupiter", "uranus", "pluto"].includes(stop.image) ? base * 1.5 : base;
      const image = images[stop.image];
      glow(point.x, point.y, base * 1.1, stop.color, "23");
      if (image && ready(image)) {
        const h = size / image.naturalWidth * image.naturalHeight;
        context.drawImage(image, point.x - size / 2, point.y - h / 2, size, h);
      } else if (stop.kind === "star") {
        glow(point.x, point.y, base * .5, stop.color, "af");
        glow(point.x, point.y, base * .2, "#fff0de", "ff");
      } else if (ready(images.asteroid)) {
        for (let j = 0; j < 13; j++) {
          const angle = j * 2.4, radius = 7 + (j % 3) * 4;
          context.drawImage(images[stop.ice ? "ice-rock" : "asteroid"] || images.asteroid,
            point.x + Math.cos(angle) * radius - 3, point.y + Math.sin(angle) * radius * .45 - 3, 6, 6);
        }
      }
      context.font = (mobile ? "12px" : "14px") + " 'DM Sans', sans-serif";
      context.textAlign = "center"; context.textBaseline = "top";
      context.fillStyle = reached ? "#dce8ee" : "#92a5b1";
      context.fillText(stop.name, point.x, point.y + base * .65);
      if (index === 0) {
        context.font = "11px 'DM Sans', sans-serif"; context.fillStyle = "#91bcd4";
        context.fillText("EARTH · START", point.x, point.y + base * .65 + 17);
      }
      context.restore();
    });
    const destination = routePoint(points, end);
    glow(destination.x, destination.y, mobile ? 27 : 40, "#f4cf8b", "44");
    context.fillStyle = "#f4cf8b"; context.textAlign = "center";
    context.font = (mobile ? "11px" : "12px") + " 'DM Sans', sans-serif";
    context.fillText("CURRENT POSITION", destination.x, destination.y - (mobile ? 32 : 40));
    const probe = images["probe-rear"];
    if (ready(probe)) {
      const w = mobile ? 42 : 60, h = w / probe.naturalWidth * probe.naturalHeight;
      context.drawImage(probe, destination.x - w / 2, destination.y - h / 2, w, h);
    }
    context.fillStyle = "#9eb7c4"; context.font = "13px 'DM Sans', sans-serif";
    context.font = "22px 'DM Sans', sans-serif";
    context.fillText("∞", last.x + 36, last.y - 10);
    context.restore();
  }

  function draw(time = performance.now()) {
    if (!reducedMotion.matches && lastTime && time - lastTime < 15) {
      frame = requestAnimationFrame(draw);
      return;
    }
    const renderStart = performance.now();
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    const frameMs = lastTime ? Math.max(0, time - lastTime) : 16.7;
    const dt = Math.min(.05, frameMs / 1000);
    if (frameMs < 120) rollingFrameMs = lerp(rollingFrameMs, frameMs, .04);
    lastTime = time;
    camera.x = reducedMotion.matches ? 0 : lerp(camera.x, pointer.x + pose.yaw * width * .10, 1 - Math.exp(-dt * 2.2));
    camera.y = reducedMotion.matches ? 0 : lerp(camera.y, pointer.y, 1 - Math.exp(-dt * 2.2));
    let amount = 1, thrust = 0, route = routeFor(state);
    if (transition) {
      amount = Math.max(0, Math.min(1, (time - transition.start) / transition.duration));
      thrust = Math.sin(amount * Math.PI) ** 1.3;
      route = lerp(transition.fromRoute, route, smooth(amount));
    }
    visibleRoute = route;
    if (viewTransition) {
      const t = Math.max(0, Math.min(1, (time - viewTransition.start) / 2600));
      overview = lerp(viewTransition.from, viewTransition.to, smooth(t));
      if (t >= 1) viewTransition = null;
    }
    const targetSurge = thrust * (transition?.missed ? .28 : 1);
    pose.surge = lerp(pose.surge, targetSurge, 1 - Math.exp(-dt * 10));
    const path = flightPath(route);
    const ahead = flightPath(route + .065), behind = flightPath(route - .065);
    const bankPower = reducedMotion.matches ? 0 : Math.min(1, targetSurge * 2.2);
    // Nose follows the route tangent; attitude anticipates the maneuver before
    // the camera catches up. An arrival coasts out instead of snapping upright.
    const yawTarget = Math.atan2(ahead.x - behind.x, .13 * 5) * bankPower;
    const pitchTarget = (-.14 * targetSurge + (ahead.y - behind.y) * .8) * bankPower;
    pose.turn = lerp(pose.turn, path.bank * bankPower, 1 - Math.exp(-dt * 5));
    pose.yaw = lerp(pose.yaw, yawTarget, 1 - Math.exp(-dt * 4));
    pose.pitch = lerp(pose.pitch, pitchTarget, 1 - Math.exp(-dt * 4));
    pose.x = path.x; pose.y = path.y;
    camera.pathX = lerp(camera.pathX, path.x, 1 - Math.exp(-dt * 1.8));
    camera.pathY = lerp(camera.pathY, path.y, 1 - Math.exp(-dt * 1.8));
    const speed = reducedMotion.matches ? 0 : .045 + thrust * (transition?.missed ? .15 : 1.3);
    if (!reducedMotion.matches) odometer += dt * (.22 + speed * 5);
    paintSky(speed * (1 - overview));
    if (overview < 1) {
      context.save();
      // Pull the chase scene away into an overhead plane as the route is revealed.
      const focus = horizon();
      context.translate(focus.x, focus.y);
      context.scale(1 - overview * .65, 1 - overview * .76);
      context.rotate(-overview * .18);
      context.translate(-focus.x, -focus.y);
      context.globalAlpha = 1 - overview;
      const scenery = [];
      // Sort every object together so distant rocks cannot cover a nearer planet.
      for (let index = Math.ceil(route) + 2; index >= Math.max(0, Math.floor(route) - 2); index--) {
        const z = 7 + (index - route) * 12;
        if (checkpoint(index).kind === "belt") {
          if (z > -4 && z < 30) scenery.push(...beltStones(index, z, time));
        } else if (z >= .5 && z <= 32) scenery.push({ world: index, depth: z });
      }
      scenery.sort((a, b) => b.depth - a.depth);
      const paintObject = (object) => object.world === undefined ?
        paintStone(object, speed) : paintWorld(object.world, object.depth);
      for (const object of scenery) if (object.depth >= 3) paintObject(object);
      paintProbe(time);
      // Nearby objects actually cross in front of the camera and craft.
      for (const object of scenery) if (object.depth < 3) paintObject(object);
      paintForeground(speed);
      context.restore();
    }
    if (overview > 0) paintOverview(overview);
    frameCount++;
    if (frameCount % 60 === 0) {
      canvas.dataset.frameCostMs = (performance.now() - renderStart).toFixed(1);
      canvas.dataset.frameIntervalMs = rollingFrameMs.toFixed(1);
      // Busy displays can trade a small amount of resolution for a steadier flight.
      if (rollingFrameMs > 26 && pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - .25); resize(); }
    }
    if (amount >= 1) transition = null;
    frame = 0;
    if (!document.hidden && (!reducedMotion.matches || transition || viewTransition)) frame = requestAnimationFrame(draw);
  }

  function requestDraw() {
    if (!frame) frame = requestAnimationFrame(draw);
  }
  function resize() {
    width = innerWidth;
    height = innerHeight;
    const ratio = pixelRatio;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    requestDraw();
  }
  function setFlight(next, animate = false) {
    if (next.key === state.key) return 0;
    const previous = state;
    state = next;
    if (!animate || reducedMotion.matches) {
      const path = flightPath(routeFor(next));
      pose.x = camera.pathX = path.x;
      pose.y = camera.pathY = path.y;
      pose.yaw = pose.pitch = pose.turn = 0;
    }
    if (!!next.complete !== !!previous.complete) {
      const to = next.complete ? 1 : 0;
      if (reducedMotion.matches || !animate) { overview = to; viewTransition = null; }
      else viewTransition = { from: overview, to, start: performance.now() };
    }
    transition = next.complete && animate ? transition : animate && !next.complete && !reducedMotion.matches ? {
      from: previous, fromRoute: visibleRoute, start: performance.now(), duration: next.missed ? 1500 : 4200 + Math.min(2400, Math.abs(routeFor(next) - visibleRoute) * 500), missed: next.missed,
    } : null;
    requestDraw();
    return transition?.duration || 0;
  }
  window.addEventListener("pointermove", (event) => {
    pointer.x = (event.clientX / width - .5) * 18;
    pointer.y = (event.clientY / height - .5) * 12;
  }, { passive: true });
  window.addEventListener("resize", resize);
  reducedMotion.addEventListener("change", requestDraw);
  document.addEventListener("visibilitychange", () => { lastTime = 0; requestDraw(); });
  resize();
  return { setFlight };
}
