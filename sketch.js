let pieceCount; // number of pieces in each row and column for the side panels
let pieces = []; // array to store the pieces
let sourceImage; // the source image or video
let sourceIsVideo = false; // whether the source is a video
let pieceSize; // pixel size of one piece on the board
let puzzleLeft; // x position of board left 
let puzzleTop; // y position of board top 
let sidePanelWidth; // width of each side panel 
let trayTileSize; // drawn size of pieces in the panels
let imageScale; // scale for source image per piece
let draggedPiece = null; // the piece that is being dragged
let dragOffsetX = 0; // the offset of the dragged piece from the mouse x position
let dragOffsetY = 0; // the offset of the dragged piece from the mouse y position
let showPreview = false; // whether to show the preview image
let difficultySelect; // the dropdown menu for the difficulty selection
let gap = 20; // the gap between the pieces in the tray

// Determines if the image parameter is a video.
function imgParamIsVideo(param) {
  let path = (param || '').split('?')[0].toLowerCase();
  return path.endsWith('.mp4');
}

// Preloads the image (videos are created in setup once sourceIsVideo is set).
function preload() {
  let params = new URLSearchParams(window.location.search);
  let imageParam = params.get('img') || 'default';
  if (imgParamIsVideo(imageParam)) {
    sourceIsVideo = true;
    return;
  }
  let url = imageParam.startsWith('http') ? imageParam : `https://picsum.photos/seed/${imageParam}/600/600`;
  sourceImage = loadImage(url);
}

// helper function to create a button
function buttonHelper(label, x, y, onClick) {
  let button = createButton(label);
  button.position(x, y);
  button.mousePressed(onClick);
  button.style('font-size', '16px');
  button.style('padding', '10px 20px');
  return button;
}

// creates a dropdown button for difficulty selection
function createDifficultyDropdown(x, y) {
  difficultySelect = createSelect();
  difficultySelect.position(x, y);
  difficultySelect.style('font-size', '16px');
  difficultySelect.style('padding', '10px 20px');
  for (let size = 7; size <= 20; size++) {
    difficultySelect.option(`${size}x${size}`, size);
  }
  // sets the selected difficulty to the current difficulty if it's defined. (7x7 is the default)
  if (pieceCount !== undefined) {
    difficultySelect.selected(String(pieceCount));
  }
  // builds the puzzle after the difficulty is changed.
  difficultySelect.changed(() => {
    pieceCount = Number(difficultySelect.value());
    buildPuzzle();
  });
}

function createPiece(row, col, grid) {
  // Tab sign (+1 / -1) must match the opposite sign on the shared neighbor so edges interlock.
  // The edges are determined by the row and column of the piece and the edges of the neighboring pieces.
  // 0 is a straight edge 
  // +1, -1 represents the tab direction (right, left)
  let topEdge = row === 0 ? 0 : -grid[row - 1][col].edges[2];
  let rightEdge = col === pieceCount - 1 ? 0 : random([-1, 1]);
  let bottomEdge = row === pieceCount - 1 ? 0 : random([-1, 1]);
  let leftEdge = col === 0 ? 0 : -grid[row][col - 1].edges[1];
  return {
    row, col,
    // Board uses piece centers: column col starts at puzzleLeft + col * pieceSize; center is + half a cell.
    // The correct location is the center of the piece on the board.
    correctX: puzzleLeft + col * pieceSize + pieceSize / 2,
    correctY: puzzleTop + row * pieceSize + pieceSize / 2,
    x: 0, y: 0,
    // The piece is initially placed in the panel.
    panelX: 0, panelY: 0,
    edges: [topEdge, rightEdge, bottomEdge, leftEdge],
    inPanel: true,
    locked: false,
  };
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  buttonHelper('Home', 10, 10, () => window.location.href = '../index.html');
  buttonHelper('Toggle Preview', 120, 10, () => showPreview = !showPreview);
  buttonHelper('Reset', 320, 10, resetPuzzle);
  buttonHelper('Solve', 430, 10, solvePuzzle);
  createDifficultyDropdown(540, 10);
  // sets the piece count to the chosen difficulty.
  pieceCount = Number(difficultySelect.value());
  // if the source is a video, create a video object and build the puzzle.
  if (sourceIsVideo) {
    let videoPath = new URLSearchParams(window.location.search).get('img');
    sourceImage = createVideo(videoPath, () => {
      sourceImage.hide();
      sourceImage.loop();
      sourceImage.volume(0);
      buildPuzzle();
    });
  } else {
    buildPuzzle();
  }
}

function buildPuzzle() {
  // If the source is a video, use the video width and height, using the elt property.
  // If the source is an image, use the image width and height, using the built in width and height properties.
  let sourceWidth = sourceIsVideo ? sourceImage.elt.videoWidth : sourceImage.width;
  let sourceHeight = sourceIsVideo ? sourceImage.elt.videoHeight : sourceImage.height;
  // The puzzle only uses a square region of the source image for each piece.
  // The square size is the smaller of the source width and height.
  let squareSize = min(sourceWidth, sourceHeight);
  let topOffset = 80;
  let panelPieceCount = pieceCount * pieceCount;
  // Half the pieces go in the left tray, half in the right (ceil = left gets the extra one).
  let leftCount = ceil(panelPieceCount / 2);
  let boardSize = min(width * 0.55, height * 0.72, 700);
  let minBoardSize = 180;
  // Shrink boardSize until the left tray can fit vertically below the header.
  while (boardSize > minBoardSize) {
    let candidatePieceSize = boardSize / pieceCount;
    // Same rule as trayTileSize after the loop: cap tray thumb by panel width and by board cell.
    let trayThumb = min(((width - boardSize) / 2) * 0.42, candidatePieceSize * 0.9);
    let cols = max(1, floor(((width - boardSize) / 2 - gap) / (trayThumb + gap)));
    // takes the number of pieces in the left tray and divides it by the number of columns in the tray.
    // rounds up to the nearest integer to get the number of rows needed.
    let rowsNeeded = ceil(leftCount / cols);
    let contentHeight = rowsNeeded * (trayThumb + gap) - gap;
    let visibleHeight = height - (topOffset + gap);
    if (contentHeight <= visibleHeight) break;
    boardSize -= 8;
  }

  sidePanelWidth = max((width - boardSize) / 2, 120);
  puzzleLeft = sidePanelWidth;
  puzzleTop = max((height - boardSize) / 2 + topOffset, topOffset + 10);
  pieceSize = boardSize / pieceCount;
  trayTileSize = min(sidePanelWidth * 0.42, pieceSize * 0.9);
  // The image scale is the ratio of the piece size to the source image cell size.
  // It's used to scale the source image to the piece size.
  imageScale = pieceSize / (squareSize / pieceCount);

  // Creates the grid of pieces.
  // iterates through each row and column of the grid and creates a piece for each cell.
  pieces = [];
  let grid = [];
  for (let row = 0; row < pieceCount; row++) {
    grid[row] = [];
    for (let col = 0; col < pieceCount; col++) {
      let piece = createPiece(row, col, grid);
      grid[row][col] = piece;
      pieces.push(piece);
    }
  }
  for (let i = pieces.length - 1; i > 0; i--) {
    let j = floor(random(i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  arrangeSideTrays();
}

// Arranges the pieces in the side trays.
function arrangeSideTrays() {
  let panelPieceCount = 0;
  for (let piece of pieces) if (piece.inPanel) panelPieceCount++;
  let cols = max(1, floor((sidePanelWidth - gap) / (trayTileSize + gap)));
  let leftCount = ceil(panelPieceCount / 2);
  let half = trayTileSize / 2;
  let step = trayTileSize + gap;
  let baseY = 80 + gap + half;
  let leftX = gap + half;
  let rightX = puzzleLeft + pieceSize * pieceCount + gap + half;
  let leftIndex = 0;
  let rightIndex = 0;
  let panelCounter = 0;

  // iterates through each piece and places it in the correct slot in the tray.
  for (let piece of pieces) {
    if (!piece.inPanel) continue;
    // determines if the piece is on the left or right side of the tray.
    let onLeft = panelCounter < leftCount;
    // determines the slot index for the piece.
    let slot = onLeft ? leftIndex++ : rightIndex++;
    // determines the x base for the piece.
    let xBase = onLeft ? leftX : rightX;
    // sets the x and y position of the piece in the tray.
    piece.panelX = piece.x = xBase + (slot % cols) * step;
    piece.panelY = piece.y = baseY + floor(slot / cols) * step;
    panelCounter++;
  }
}

// Resets the puzzle to its initial state.
function resetPuzzle() {
  draggedPiece = null;
  for (let piece of pieces) {
    piece.inPanel = true;
    piece.locked = false;
  }
  for (let i = pieces.length - 1; i > 0; i--) {
    let j = floor(random(i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  arrangeSideTrays();
}

// Solves the puzzle by locking all the pieces in the correct locations.
// This method is mostly used for demo and debugging purposes. 
function solvePuzzle() {
  draggedPiece = null;
  for (let piece of pieces) {
    piece.x = piece.correctX;
    piece.y = piece.correctY;
    piece.inPanel = false;
    piece.locked = true;
  }
  arrangeSideTrays();
}

// Helper function to calculate the squared distance between two points
function distanceSq(dx, dy) {
  return dx * dx + dy * dy;
}

// if the coordinates of the piece are the same as the correct coordinates, the piece is locked.
function lockPieceIfSolved(piece) {
  if (piece.x === piece.correctX && piece.y === piece.correctY) {
    piece.locked = true;
    return;
  }
}

function trySnapLocation(piece) {
  // The snap distance is the threshold for how close the piece can be to the correct location to be considered solved.
  // It's calculated dynamically based on the piece size. (35% of the piece size)
  let snapDistance = pieceSize * 0.35;
  let snapDistanceSq = snapDistance * snapDistance;
  // If the squared distance is less than the snap distance squared, the piece is snapped to the correct location
  // Note: Used Claude AI to help me understand how to figure out the calculations behind
  // figuring out if a piece is close enough to the correct location to be considered solved.
  // It suggested using the Euclidean distance formula to figure out the distance between the piece and the correct location.
  // The Euclidean distance formula is: sqrt((x1 - x2)^2 + (y1 - y2)^2)
  if (distanceSq(piece.x - piece.correctX, piece.y - piece.correctY) < snapDistanceSq) {
    piece.x = piece.correctX;
    piece.y = piece.correctY;
    piece.locked = true;
  }
}

function draw() {
  background(200);
  noFill();
  stroke(0);
  strokeWeight(4);
  // Draws the board frame.
  rect(puzzleLeft, puzzleTop, pieceSize * pieceCount, pieceSize * pieceCount);
  for (let piece of pieces) if (!piece.inPanel && piece !== draggedPiece) drawPiece(piece);
  for (let piece of pieces) if (piece.inPanel && piece !== draggedPiece) drawPiece(piece);
  if (draggedPiece) drawPiece(draggedPiece);
  if (showPreview) {
    // Draw the preview centered over the board with transparency
    let boardSize = pieceSize * pieceCount;
    tint(255, 180); // 70% opacity
    image(sourceImage, puzzleLeft, puzzleTop, boardSize, boardSize);
    noTint();
    noFill();
    stroke(255, 255, 255, 120);
    strokeWeight(2);
    rect(puzzleLeft, puzzleTop, boardSize, boardSize);
  }
}

function drawPiece(piece) {
  // The scale is the ratio of the tray tile size to the piece size.
  // Its scaled down to the size of the tray tile to fit the tray.
  // If the piece is in the panel, the scale is the ratio of the tray tile size to the piece size.
  // If the piece is not in the panel, the scale is 1, so the piece is drawn at the correct size.
  let scale = piece.inPanel ? trayTileSize / pieceSize : 1;
  let drawnSize = pieceSize * scale;
  let outline = getPieceOutline(piece, drawnSize);
  push();
  // Move origin to this piece's current center (tray, board, or wherever it was dragged).
  // translated is used here to move the origin to the center of the piece.
  // so that everything is drawn relative to the center of the piece.
  translate(piece.x, piece.y);
  push();
  clip(() => {
    noStroke();
    fill(255);
    beginShape();
    for (let i = 0; i < outline.length; i++) vertex(outline[i].x, outline[i].y);
    endShape(CLOSE);
  });

  // Draws the source image scaled to the piece size.
  // pastes the image into the piece at the correct position
  let sourceWidth = sourceIsVideo ? sourceImage.elt.videoWidth : sourceImage.width;
  let sourceHeight = sourceIsVideo ? sourceImage.elt.videoHeight : sourceImage.height;
  let squareSize = min(sourceWidth, sourceHeight);
  let sourceTileSize = squareSize / pieceCount;
  let drawScale = imageScale * scale;
  let cropOffsetX = (sourceWidth - squareSize) / 2;
  let cropOffsetY = (sourceHeight - squareSize) / 2;

  // sets arguments to the top-left corner of the image
  imageMode(CORNER);
  // pastes the image into the piece at the correct position
  image(
    sourceImage,
    // calculates the x position of the image in the piece based on
    // the column of the piece and the source tile size
    -((piece.col + 0.5) * sourceTileSize + cropOffsetX) * drawScale,
    // calculates the y position of the image in the piece based on
    // the row of the piece and the source tile size
    -((piece.row + 0.5) * sourceTileSize + cropOffsetY) * drawScale,
    sourceWidth * drawScale,
    sourceHeight * drawScale
  );
  pop();

  stroke(0);
  strokeWeight(max(1, 2 * scale));
  noFill();
  for (let side = 0; side < 4; side++) {
    if (piece.edges[side] === 0) continue;
    let half = drawnSize / 2;
    let tabOut = drawnSize * 0.35;
    let tabIn = piece.edges[side] * drawnSize * 0.2;
    push();
    // Reuse one "top edge" shape, rotate so it becomes top/right/bottom/left.
    rotate(side * HALF_PI);
    beginShape();
    curveVertex(-half, -half); // Start at the left end of this edge.
    curveVertex(-half, -half); // Duplicate, this cleans out the curve's sharp corners.
    curveVertex(-half + tabOut, -half); // Move along the flat edge to tab start.
    curveVertex(-half + tabOut, -half + tabIn); // First tab shoulder (inward or outward).
    curveVertex(half - tabOut, -half + tabIn); // Second tab shoulder across the tab.
    curveVertex(half - tabOut, -half); // Return to the flat edge after the tab.
    curveVertex(half, -half); // Reach the right end of this edge.
    curveVertex(half, -half); // Duplicate end point for clean curve.
    endShape();
    pop();
  }
  pop();
}

function getPieceOutline(piece, drawnSize) {
  let vertices = [];
  for (let side = 0; side < 4; side++) {
    let edgePoints = getEdgePoints(drawnSize, piece.edges[side]);
    let startIndex = side === 0 ? 0 : 1;
    for (let i = startIndex; i < edgePoints.length; i++) {
      let point = edgePoints[i];
      let angle = side * HALF_PI;
      let rotatedX = point.x * cos(angle) - point.y * sin(angle);
      let rotatedY = point.x * sin(angle) + point.y * cos(angle);
      vertices.push({ x: rotatedX, y: rotatedY });
    }
  }
  return vertices;
}

// Calculates the points for the edges of the piece.
// This method works by creating points for one edge, 
// but is then reused for the other edges.
function getEdgePoints(size, edgeType) {
  let half = size / 2;
  if (edgeType === 0) return [createVector(-half, -half), createVector(half, -half)];
  let tabReach = size * 0.35; // The reach of the tab is 35% of the size of the piece.
  let tabDepth = edgeType * size * 0.2; // The depth of the tab is 20% of the size of the piece.
  let controlPoints = [
    createVector(-half, -half), // The first control point is the leftmost point of the piece.
    createVector(-half + tabReach, -half), // The second control point is the leftmost point of the tab.
    createVector(-half + tabReach, -half + tabDepth), // The third control point is the bottom left point of the tab.
    createVector(half - tabReach, -half + tabDepth), // The fourth control point is the bottom right point of the tab.
    createVector(half - tabReach, -half), // The fifth control point is the rightmost point of the tab.
    createVector(half, -half), // The sixth control point is the rightmost point of the piece.
  ];
  let points = [];
  let stepsPerSegment = 10;
  for (let i = 0; i < controlPoints.length - 1; i++) {
    for (let step = 0; step < stepsPerSegment; step++) {
      let t = step / stepsPerSegment;
      let x = controlPoints[i].x * (1 - t) + controlPoints[i + 1].x * t;
      let y = controlPoints[i].y * (1 - t) + controlPoints[i + 1].y * t;
      points.push(createVector(x, y));
    }
  }
  points.push(controlPoints[controlPoints.length - 1].copy());
  return points;
}

// Drags the piece if it's clicked on.
// Note: I used Claude AI to help me understand how to figure out the calculations behind
// figuring out if a piece is pressed on to be dragged.
// It suggested using the abs function to calculate the distance between the mouse and the piece
// and the if statement to check if the mouse is within the click radius.
function mousePressed() {
  let mouseInPanel = mouseX < sidePanelWidth || mouseX > puzzleLeft + pieceSize * pieceCount;
  for (let i = pieces.length - 1; i >= 0; i--) {
    let piece = pieces[i];
    if (piece.locked || piece.inPanel !== mouseInPanel) continue;
    // The click radius is the radius of the piece in the tray.
    let clickRadius = piece.inPanel ? trayTileSize / 2 : pieceSize / 2;
    // if the mouse is not within the click radius, the piece is not dragged.
    if (abs(mouseX - piece.x) >= clickRadius || abs(mouseY - piece.y) >= clickRadius) continue;
    // the piece is dragged and the drag offset is calculated.
    draggedPiece = piece;
    dragOffsetX = mouseX - piece.x;
    dragOffsetY = mouseY - piece.y;
    piece.inPanel = false;
    return;
  }
}

// Moves the dragged piece to the mouse position if it's being dragged.
function mouseDragged() {
  if (!draggedPiece) return;
  draggedPiece.x = mouseX - dragOffsetX;
  draggedPiece.y = mouseY - dragOffsetY;
}

// Releases the dragged piece and snaps it to the correct location if it's not in the panel.
function mouseReleased() {
  if (!draggedPiece) return;
  let releasedInPanel = mouseX < sidePanelWidth || mouseX > puzzleLeft + pieceSize * pieceCount;
  if (releasedInPanel) draggedPiece.inPanel = true;
  else trySnapLocation(draggedPiece);
  arrangeSideTrays();
  draggedPiece = null;
}
