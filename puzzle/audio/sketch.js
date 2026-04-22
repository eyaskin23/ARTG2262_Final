let timelineClips = [];
let clipBeingDragged = null;
let puzzleSolved = false;
let coverImage;
let song;
let tileWidth = 72;
let activeClip = null;

const NUM_SEGMENTS = 8;
const SONG_FILE_URL = 'sounds/abba.mp3';

// Calculates the left x position of the timeline.
function getTimelineLeftX() {
  return (width - timelineClips.length * tileWidth) / 2;
}

// Calculates the center x position of a slot in the timeline.
function getSlotCenterX(slotIndex) {
  return getTimelineLeftX() + slotIndex * tileWidth + tileWidth / 2;
}

// Preloads the cover image and song.
function preload() {
  coverImage = loadImage('landscape.jpg');
  song = loadSound(SONG_FILE_URL);
}

// Builds the timeline clips from the song.
// This method is used to create the timeline clips for the puzzle.
// It creates an array of objects, each representing a segment of the song.
// Each object contains the correct slot index, the audio start and duration seconds,
// and the x and y position of the clip (on the timeline).
function buildTimelineClipsFromSong() {
  let trackDurationSeconds = song.duration();
  if (!trackDurationSeconds || trackDurationSeconds <= 0) trackDurationSeconds = 30;
  let segmentDurationSeconds = trackDurationSeconds / NUM_SEGMENTS;
  timelineClips = Array.from({ length: NUM_SEGMENTS }, (_, index) => ({
    correctSlotIndex: index,
    audioStartSeconds: index * segmentDurationSeconds,
    audioDurationSeconds: segmentDurationSeconds,
    x: 0,
    y: 0,
  }));
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  tileWidth = min(100, max(48, floor((width - 80) / NUM_SEGMENTS)));
  buildTimelineClipsFromSong();

  let homeButton = createButton('Home');
  homeButton.position(10, 10);
  homeButton.mousePressed(() => (window.location.href = '/index.html'));
  homeButton.style('font-size', '16px');
  homeButton.style('padding', '10px 20px');

  // Randomizes the order of the timeline clips.
  shuffle(timelineClips, true);
  // Lays out the timeline clips in the slots.
  layoutDraggableClipsInSlots();
}

// Lays out the timeline clips in the slots.
// Iterates through each slot and sets the x and y position of each clip.
function layoutDraggableClipsInSlots() {
  let draggableRowY = height / 2 + 80;
  for (let slotIndex = 0; slotIndex < timelineClips.length; slotIndex++) {
    timelineClips[slotIndex].x = getSlotCenterX(slotIndex);
    timelineClips[slotIndex].y = draggableRowY;
  }
}

// Determines if the play button is clicked on.
function hitPlayButton(clip, mouseX, mouseY) {
  let buttonWidth = min(tileWidth - 8, 64);
  let buttonHeight = 22;
  let buttonLeft = clip.x - buttonWidth / 2;
  let buttonTop = clip.y + 14;
  return (
    mouseX >= buttonLeft &&
    mouseX <= buttonLeft + buttonWidth &&
    mouseY >= buttonTop &&
    mouseY <= buttonTop + buttonHeight
  );
}

// Determines if the draggable clip is clicked on.
function hitDraggableClip(clip, mouseX, mouseY) {
  return abs(mouseX - clip.x) < tileWidth / 2 && abs(mouseY - clip.y) < 40;
}

function playAudioSegmentForClip(clip) {
  song.stop();
  song.play(0, 1, 1, clip.audioStartSeconds, clip.audioDurationSeconds);
}

function toggleClipAudio(clip) {
  getAudioContext().resume();
  if (activeClip !== clip) {
    activeClip = clip;
    playAudioSegmentForClip(clip);
    return;
  }
  if (song.isPlaying()) song.pause();
  else if (song.isPaused()) song.play();
  else playAudioSegmentForClip(clip);
}

function drawPlayPause(centerX, centerY, isPlaying, iconSize) {
  noStroke();
  fill(35);
  if (isPlaying) {
    let barWidth = iconSize * 0.22;
    let barGap = iconSize * 0.14;
    let barHeight = iconSize * 0.55;
    rect(centerX - barWidth - barGap / 2, centerY - barHeight / 2, barWidth, barHeight, 2);
    rect(centerX + barGap / 2, centerY - barHeight / 2, barWidth, barHeight, 2);
  } else {
    let playWidth = iconSize * 0.5;
    let playHeight = iconSize * 0.55;
    triangle(
      centerX - playWidth * 0.32,
      centerY - playHeight / 2,
      centerX - playWidth * 0.32,
      centerY + playHeight / 2,
      centerX + playWidth * 0.55,
      centerY
    );
  }
}

function draw() {
  background(240);
  let timelineLeftX = getTimelineLeftX();
  let referenceStripCenterY = height / 2 - 20;
  let timelineRailY = height / 2 + 80;
  let numSegments = timelineClips.length;
  let imageSliceWidth = coverImage.width / numSegments;

  fill(50);
  noStroke();
  textAlign(CENTER);
  textSize(20);
  text('Order the clips from start to end of the song', width / 2, 50);

  for (let slotIndex = 0; slotIndex < numSegments; slotIndex++) {
    let clip = timelineClips[slotIndex];
    let referenceX = getSlotCenterX(slotIndex);
    image(
      coverImage,
      referenceX - tileWidth / 2,
      referenceStripCenterY - 40,
      tileWidth,
      80,
      clip.correctSlotIndex * imageSliceWidth,
      0,
      imageSliceWidth,
      coverImage.height
    );
    noFill();
    stroke(clip.correctSlotIndex === slotIndex ? color(0, 170, 70) : 180);
    strokeWeight(clip.correctSlotIndex === slotIndex ? 2 : 1);
    rect(referenceX - tileWidth / 2, referenceStripCenterY - 40, tileWidth, 80, 0);
  }

  stroke(180);
  strokeWeight(2);
  line(timelineLeftX, timelineRailY, timelineLeftX + numSegments * tileWidth, timelineRailY);

  // If the clip is in the correct slot, it is green.
  // If the clip is not in the correct slot, it is red.
  for (let slotIndex = 0; slotIndex < numSegments; slotIndex++) {
    let clip = timelineClips[slotIndex];
    let isInCorrectSlot = clip.correctSlotIndex === slotIndex;
    fill(isInCorrectSlot ? color(190, 255, 200) : 255);
    stroke(isInCorrectSlot ? color(0, 170, 70) : 180);
    strokeWeight(isInCorrectSlot ? 2.5 : 1);
    rect(clip.x - tileWidth / 2, clip.y - 40, tileWidth, 80, 10);

    let playButtonWidth = min(tileWidth - 8, 64);
    let playButtonHeight = 22;
    let playButtonLeft = clip.x - playButtonWidth / 2;
    let playButtonTop = clip.y + 14;
    let isThisClipPlaying = activeClip === clip && song.isPlaying();
    fill(isThisClipPlaying ? color(255, 200, 200) : color(235, 245, 255));
    stroke(80);
    strokeWeight(1);
    rect(playButtonLeft, playButtonTop, playButtonWidth, playButtonHeight, 4);
    drawPlayPause(
      playButtonLeft + playButtonWidth / 2,
      playButtonTop + playButtonHeight / 2,
      isThisClipPlaying,
      min(playButtonWidth, playButtonHeight) * 1.15
    );
  }

  // Shows the 'Correct' Screen when the puzzle is solved.
  if (puzzleSolved) {
    fill(0, 160, 90, 200);
    noStroke();
    rect(0, 0, width, height);
    fill(255);
    textSize(48);
    textAlign(CENTER, CENTER);
    text('Correct!', width / 2, height / 2);
    textSize(18);
    text('Click to play again', width / 2, height / 2 + 50);
  }
}

function mousePressed() {
  if (puzzleSolved) {
    puzzleSolved = false;
    song.stop();
    activeClip = null;
    shuffle(timelineClips, true);
    layoutDraggableClipsInSlots();
    return;
  }
  for (let clip of timelineClips) {
    if (hitPlayButton(clip, mouseX, mouseY)) {
      toggleClipAudio(clip);
      return;
    }
  }
  clipBeingDragged = null;
  for (let clip of timelineClips) {
    if (hitDraggableClip(clip, mouseX, mouseY)) {
      clipBeingDragged = clip;
      break;
    }
  }
}

function mouseDragged() {
  if (clipBeingDragged) {
    clipBeingDragged.x = mouseX;
    clipBeingDragged.y = mouseY;
  }
}

// Determines if the draggable clip is released.
function mouseReleased() {
  if (!clipBeingDragged) return;
  let closestSlotIndex = 0;
  for (let slotIndex = 1; slotIndex < timelineClips.length; slotIndex++) {
    if (
      abs(mouseX - getSlotCenterX(slotIndex)) <
      abs(mouseX - getSlotCenterX(closestSlotIndex))
    ) {
      closestSlotIndex = slotIndex;
    }
  }
  // Removes the clip from the current position and inserts it into the closest slot.
  // Uses the indexOf method to find the clip in the timelineClips array and remove it.
  timelineClips.splice(timelineClips.indexOf(clipBeingDragged), 1);
  timelineClips.splice(closestSlotIndex, 0, clipBeingDragged);
  clipBeingDragged = null;
  layoutDraggableClipsInSlots();
  // Sets puzzleSolved to true if the clips are in the correct order.
  if (timelineClips.every((clip, slotIndex) => clip.correctSlotIndex === slotIndex)) {
    puzzleSolved = true;
  }
}
