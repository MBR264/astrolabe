let video;
let lightLevel = 0; // 0 = dark, 100 = bright
let blackColor, whiteColor;

let section = 1; // 1 = light, 2 = rotation, 3 = tilt
let rotationFrozen = false;
let tiltFrozen = false;
let angle = 0;
let tilt = 0;

let verticalTime = null; // time when vertical tilt is reached

function setup() {
  // Lock scrolling
  document.body.style.overflow = 'hidden';

  let c = createCanvas(360, 360);
  c.parent("canvas-container");
  noFill();
  background(0);

  blackColor = color(0);
  whiteColor = color(255);

  // Access rear camera
  video = createCapture({
    audio: false,
    video: { facingMode: { exact: "environment" } }
  });
  video.size(64, 48);
  video.hide();

  // Device orientation
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
        } else {
          alert('Permission denied. Rotation controls will not work.');
        }
      })
      .catch(console.error);
  } else {
    window.addEventListener('deviceorientation', handleOrientation);
  }

  // Show initial instruction
  updateInstructions();
}

function handleOrientation(event) {
  // Section 2 (north detection)
  if (section === 2 && !rotationFrozen) {
    let heading = null;
    if (event.webkitCompassHeading !== undefined) heading = event.webkitCompassHeading;
    else if (event.absolute && event.alpha !== null) heading = event.alpha;

    if (heading !== null) {
      if (heading <= 10 || heading >= 350) {
        rotationFrozen = true;
        angle = 0;
        section = 3;
        updateInstructions();
      } else {
        angle = -radians(heading);
      }
    }
  }

  // Section 3 (tilt)
  if (section === 3 && !tiltFrozen && event.beta !== null) {
    tilt = constrain(event.beta, 0, 90);
    if (tilt >= 90) {
      tiltFrozen = true;
      verticalTime = new Date();
      updateInstructions();
    }
  }
}

function draw() {
  clear();
  background(0);
  translate(width / 2, height / 2);

  stroke(whiteColor);
  noFill();
  ellipse(0, 0, 360, 360);

  // Section 1 (light)
  if (section === 1) {
    video.loadPixels();
    let sum = 0;
    let count = 0;
    for (let y = 0; y < video.height; y++) {
      for (let x = 0; x < video.width; x++) {
        let index = (x + y * video.width) * 4;
        let r = video.pixels[index];
        let g = video.pixels[index + 1];
        let b = video.pixels[index + 2];
        let bright = (r + g + b) / 3;
        sum += bright;
        count++;
      }
    }
    let avg = sum / count;
    lightLevel = map(avg, 0, 255, 0, 100);
    lightLevel = constrain(lightLevel, 0, 100);

    let t = constrain(map(lightLevel, 30, 50, 0, 1), 0, 1);
    let strokeCol = lerpColor(blackColor, whiteColor, t);
    stroke(strokeCol);

    if (lightLevel >= 50) {
      section = 2;
      strokeCol = whiteColor;
      updateInstructions(); // move to direction instruction
    }

    drawEllipses();
  }

  // Section 2 (rotation)
  if (section === 2) {
    stroke(whiteColor);
    push();
    rotate(angle);
    drawEllipses();
    pop();
  }

  // Section 3 (tilt)
  if (section === 3) {
    stroke(whiteColor);

    let t = map(tilt, 0, 90, 0, 1);
    push();
    rotate(angle);

    for (let w = 345; w >= 15; w -= 30) {
      let newW = lerp(w, 345, t);
      ellipse(0, 0, newW, 345);
    }

    for (let h = 345; h >= 15; h -= 30) {
      let newH = lerp(h, 345, t);
      ellipse(0, 0, 345, newH);
    }

    pop();

    if (verticalTime) {
      fill(255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(24);
      let timeString = verticalTime.getHours().toString().padStart(2, '0') + ':' +
                       verticalTime.getMinutes().toString().padStart(2, '0') + ':' +
                       verticalTime.getSeconds().toString().padStart(2, '0');
      text(timeString, 0, 0);
      noFill();
    }
  }
}

function drawEllipses() {
  noFill();
  for (let w = 345; w >= 15; w -= 30) {
    ellipse(0, 0, w, 345);
  }
  for (let h = 345; h >= 15; h -= 30) {
    ellipse(0, 0, 345, h);
  }
}

// --- Instruction and link management ---
function updateInstructions() {
  document.getElementById('light').style.display = (section === 1) ? 'block' : 'none';
  document.getElementById('direction').style.display = (section === 2) ? 'block' : 'none';
  document.getElementById('angle').style.display = (section === 3 && !verticalTime) ? 'block' : 'none';
  document.getElementById('result').style.display = (verticalTime !== null) ? 'block' : 'none';
  
  // Show "Back to Home" link when time is displayed
  document.getElementById('back-link').style.display = (verticalTime !== null) ? 'block' : 'none';
}

