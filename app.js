const manifestUrl = "kleurplaten/manifest.json";

const paletteColors = [
  { name: "Rood", value: "#ef4444" },
  { name: "Oranje", value: "#f97316" },
  { name: "Geel", value: "#facc15" },
  { name: "Groen", value: "#22c55e" },
  { name: "Blauw", value: "#38bdf8" },
  { name: "Paars", value: "#a855f7" },
  { name: "Roze", value: "#f472b6" },
  { name: "Bruin", value: "#92400e" },
];

const state = {
  sheets: [],
  activeSheet: null,
  selectedColor: paletteColors[0].value,
  brushSize: 36,
  erasing: false,
  drawing: false,
  image: null,
  lastPoint: null,
  imageBox: { x: 0, y: 0, width: 0, height: 0 },
};

const pickerView = document.querySelector("#pickerView");
const colorView = document.querySelector("#colorView");
const sheetGrid = document.querySelector("#sheetGrid");
const activeTitle = document.querySelector("#activeTitle");
const canvas = document.querySelector("#drawingCanvas");
const ctx = canvas.getContext("2d");
const drawingLayer = document.createElement("canvas");
const drawingCtx = drawingLayer.getContext("2d");
const lineLayer = document.createElement("canvas");
const lineCtx = lineLayer.getContext("2d");
const palette = document.querySelector("#palette");
const brushSizeInput = document.querySelector("#brushSize");
const eraserButton = document.querySelector("#eraserButton");

function cssPixels(value) {
  return Math.max(1, Math.floor(value * window.devicePixelRatio));
}

async function loadSheets() {
  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Manifest niet gevonden: ${response.status}`);
    const manifest = await response.json();
    state.sheets = Array.isArray(manifest.sheets) ? manifest.sheets : [];
  } catch (error) {
    sheetGrid.innerHTML = `
      <div class="empty-state">
        Ik kan <strong>kleurplaten/manifest.json</strong> niet laden. Start de app via een lokale webserver
        en zet je kleurplaten in de map <strong>kleurplaten</strong>.
      </div>
    `;
    return;
  }

  renderSheetPicker();
}

function renderSheetPicker() {
  if (!state.sheets.length) {
    sheetGrid.innerHTML = `
      <div class="empty-state">
        Zet kleurplaten in <strong>kleurplaten/</strong> en voeg ze toe aan
        <strong>kleurplaten/manifest.json</strong>.
      </div>
    `;
    return;
  }

  sheetGrid.innerHTML = "";
  state.sheets.forEach((sheet) => {
    const button = document.createElement("button");
    button.className = "sheet-card";
    button.type = "button";
    button.setAttribute("aria-label", sheet.title || "Kleurplaat");
    button.addEventListener("click", () => openSheet(sheet));

    const image = document.createElement("img");
    image.src = sheet.file;
    image.alt = sheet.title || "Kleurplaat";
    image.loading = "lazy";

    button.append(image);
    sheetGrid.append(button);
  });
}

function renderPalette() {
  palette.innerHTML = "";
  paletteColors.forEach((color) => {
    const button = document.createElement("button");
    button.className = "color-swatch";
    button.type = "button";
    button.title = color.name;
    button.setAttribute("aria-label", color.name);
    button.style.backgroundColor = color.value;
    button.addEventListener("click", () => {
      state.selectedColor = color.value;
      state.erasing = false;
      updateToolState();
    });
    palette.append(button);
  });
  updateToolState();
}

async function openSheet(sheet) {
  state.activeSheet = sheet;
  activeTitle.textContent = sheet.title || "Kleurplaat";
  pickerView.classList.add("hidden");
  colorView.classList.remove("hidden");

  const image = new Image();
  image.onload = () => {
    state.image = image;
    resizeCanvas();
    clearDrawing();
  };
  image.src = sheet.file;
}

function resizeCanvas() {
  const frame = document.querySelector(".canvas-frame");
  const maxWidth = frame.clientWidth;
  const maxHeight = frame.clientHeight;
  const imageRatio = state.image ? state.image.naturalWidth / state.image.naturalHeight : 1;
  const frameRatio = maxWidth / maxHeight;

  let displayWidth = maxWidth;
  let displayHeight = maxHeight;
  if (frameRatio > imageRatio) {
    displayWidth = displayHeight * imageRatio;
  } else {
    displayHeight = displayWidth / imageRatio;
  }

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  canvas.width = cssPixels(displayWidth);
  canvas.height = cssPixels(displayHeight);
  drawingLayer.width = canvas.width;
  drawingLayer.height = canvas.height;
  lineLayer.width = canvas.width;
  lineLayer.height = canvas.height;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  drawingCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  state.imageBox = { x: 0, y: 0, width: displayWidth, height: displayHeight };
  buildLineLayer();
  renderCanvas();
}

function buildLineLayer() {
  lineCtx.setTransform(1, 0, 0, 1, 0, 0);
  lineCtx.clearRect(0, 0, lineLayer.width, lineLayer.height);
  if (!state.image) return;

  lineCtx.drawImage(state.image, 0, 0, lineLayer.width, lineLayer.height);
  const imageData = lineCtx.getImageData(0, 0, lineLayer.width, lineLayer.height);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const alpha = pixels[index + 3];
    const darkness = 255 - (red + green + blue) / 3;

    if (alpha > 0 && darkness > 65) {
      pixels[index] = 17;
      pixels[index + 1] = 17;
      pixels[index + 2] = 17;
      pixels[index + 3] = Math.min(255, darkness * 2.5);
    } else {
      pixels[index + 3] = 0;
    }
  }

  lineCtx.putImageData(imageData, 0, 0);
}

function renderCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.image) return;
  ctx.drawImage(state.image, 0, 0, state.imageBox.width, state.imageBox.height);
  ctx.drawImage(drawingLayer, 0, 0, state.imageBox.width, state.imageBox.height);
  ctx.drawImage(lineLayer, 0, 0, state.imageBox.width, state.imageBox.height);
}

function clearDrawing() {
  drawingCtx.clearRect(0, 0, drawingLayer.width, drawingLayer.height);
  renderCanvas();
}

function pointerPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function startDrawing(event) {
  if (!state.image) return;
  canvas.setPointerCapture(event.pointerId);
  state.drawing = true;
  state.lastPoint = pointerPoint(event);
  drawTo(state.lastPoint);
}

function continueDrawing(event) {
  if (!state.drawing) return;
  drawTo(pointerPoint(event));
}

function stopDrawing(event) {
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  state.drawing = false;
  state.lastPoint = null;
}

function drawTo(point) {
  drawingCtx.save();
  drawingCtx.lineCap = "round";
  drawingCtx.lineJoin = "round";
  drawingCtx.lineWidth = state.brushSize;
  drawingCtx.strokeStyle = state.selectedColor;
  drawingCtx.globalCompositeOperation = state.erasing ? "destination-out" : "source-over";

  drawingCtx.beginPath();
  if (state.lastPoint) {
    drawingCtx.moveTo(state.lastPoint.x, state.lastPoint.y);
  } else {
    drawingCtx.moveTo(point.x, point.y);
  }
  drawingCtx.lineTo(point.x, point.y);
  drawingCtx.stroke();
  drawingCtx.restore();

  state.lastPoint = point;
  renderCanvas();
}

function updateToolState() {
  document.querySelectorAll(".color-swatch").forEach((button) => {
    button.classList.toggle("active", button.style.backgroundColor === hexToRgb(state.selectedColor) && !state.erasing);
  });
  eraserButton.classList.toggle("active", state.erasing);
}

function hexToRgb(hex) {
  const number = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255})`;
}

function saveDrawing() {
  const link = document.createElement("a");
  const baseName = (state.activeSheet?.title || "kleurplaat")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  link.download = `${baseName || "kleurplaat"}-ingekleurd.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

document.querySelector("#backButton").addEventListener("click", () => {
  colorView.classList.add("hidden");
  pickerView.classList.remove("hidden");
});

document.querySelector("#clearButton").addEventListener("click", clearDrawing);
document.querySelector("#saveButton").addEventListener("click", saveDrawing);

eraserButton.addEventListener("click", () => {
  state.erasing = !state.erasing;
  updateToolState();
});

brushSizeInput.addEventListener("input", (event) => {
  state.brushSize = Number(event.target.value);
});

canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", continueDrawing);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);
window.addEventListener("resize", () => {
  if (state.image) resizeCanvas();
});

renderPalette();
loadSheets();
