'use strict';

let preferences = {
	speed: 1.8,
	timeSkip: 10
};


// VIDEO SELECTION
// ---------------

// DRAG AND DROP
const welcomeScreen = document.querySelector('#welcome-screen');
const dropOverlay = document.querySelector('#drop-overlay');
const droppableElements = document.querySelectorAll('.droppable');
const fileName = document.querySelector('#file-name');
const video = document.querySelector('video');
let localStorageKey;

droppableElements.forEach((droppable) => {
	droppable.addEventListener('dragenter', (e) => {
		let fileType = e.dataTransfer.items[0].type;
		if (fileType.startsWith('video/')) {
			droppable.dataset.fileHover = fileType;
			dropOverlay.hidden = false;
		}
	});
});

dropOverlay.addEventListener('dragover', (e) => e.preventDefault());

dropOverlay.addEventListener('drop', async (e) => {
	e.preventDefault();

	// Type check is done in dragenter and in the click handler
	const fileHandle = await e.dataTransfer.items[0].getAsFileSystemHandle();

	await manageFileHandle(fileHandle);
	handleDragEnd();
});

dropOverlay.addEventListener('dragleave', handleDragEnd);

function handleDragEnd() {
	dropOverlay.hidden = true;
	droppableElements.forEach((droppable) => {
		delete droppable.dataset.fileHover;
	});
}

// FILE INPUT
const filePicker = document.querySelector('#file-picker');
filePicker.addEventListener('click', async () => {
	try {
		const [fileHandle] = await window.showOpenFilePicker({
			excludeAcceptAllOption: true,
			types: [{
				description: 'Videos',
				accept: {
					'video/*': ['.avi', '.mp4', '.mpeg', '.ogv', '.ts', '.webm', '.3gp', '.3g2']
				}
			}],
			multiple: false
		});

		await manageFileHandle(fileHandle);
	} catch (abortError) { }
});

// FILE HANDLING
async function manageFileHandle(fileHandle) {
	const file = await fileHandle.getFile();

	// Remove the file extension
	video.src = URL.createObjectURL(file);
	fileName.textContent = file.name.replace(/\.[^.]+$/, '');

	video.addEventListener('loadedmetadata', () => {
		duration.textContent = secondsToTime(video.duration);

		navigator.mediaSession.metadata = new MediaMetadata({
			title: fileName.textContent
		});

		const actionHandlers = [
			['seekbackward', replay],
			['seekforward', forward]
		];

		// Bind the Global Media Controls to the video
		for (const [action, handler] of actionHandlers) {
			navigator.mediaSession.setActionHandler(action, handler);
		}

		// If the fonts are not loaded in 100ms, show the player anyway
		const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
		Promise.race([document.fonts.ready, wait(100)]).then(() => {
			document.startViewTransition?.(showPlayer) ?? showPlayer();
		});

		function showPlayer() {
			welcomeScreen.hidden = true;
			player.hidden = false;
		}
	}, { once: true });

	localStorageKey = await hashFile(file);
	if (localStorage.getItem(localStorageKey)) {
		let { timer, playbackRate } = JSON.parse(localStorage.getItem(localStorageKey));
		video.currentTime = timer,
		video.playbackRate = playbackRate;

		// Here is where the video is loading to the point where it was last played

		video.addEventListener('seeked', () => {
			// The video is now ready to be played
		}, { once: true });
	}
}


// CONTROL PLAYBACK
// ----------------

// NAVIGATION
const player = document.querySelector('#player');
const playBtn = document.querySelector('#play-btn');
const fullscreenBtn = document.querySelector('#fullscreen-btn');
const zoomBtn = document.querySelector('#zoom-btn');
const speedControls = document.querySelector('#speed-controls');

// Play/pause
playBtn.onclick = togglePlay;
video.onclick = togglePlay;
video.onpause = () => { playBtn.textContent = 'play_arrow'; };
video.onplay = () => { playBtn.textContent = 'pause'; };

// Fullscreen
fullscreenBtn.onclick = toggleFullScreen;
document.onfullscreenchange = () => {
	fullscreenBtn.textContent = (document.fullscreenElement) ?
		'fullscreen_exit' :
		'fullscreen';
};

video.addEventListener('dblclick', toggleFullScreen);

// Speed
video.onratechange = () => {
	speedControls.value = video.playbackRate.toFixed(2);
};

speedControls.onchange = () => {
	// Caused by keyboard shortcuts
	speedControls.value = parseFloat(speedControls.value).toFixed(2);
	video.playbackRate = clamp(0.1, speedControls.value, 16);
};

speedControls.oninput = () => {
	// Caused by keyboard input
	speedControls.value = parseFloat(speedControls.value).toFixed(2);
};

// Zoom
zoomBtn.onclick = toggleZoom;


// TIME
// ----

const progressBar = document.querySelector('#video-bar');
const timeIndicator = document.querySelector('#time-indicator');
const currentTime = document.querySelector('#current-time');
const timeRemaining = document.querySelector('#time-remaining');
const replayBtn = document.querySelector('#replay-btn');
const forwardBtn = document.querySelector('#forward-btn');
const duration = document.querySelector('#duration');

video.addEventListener('timeupdate', () => {
	// Needed only if the video src is changed after the video is loaded
	if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
		return;
	}

	updateProgressBarValue();
	updateIndicators();
});

// Seek to the point clicked on the progress bar
progressBar.addEventListener('input', () => {
	video.currentTime = (progressBar.valueAsNumber * video.duration) / 100;

	// Needed to show the time in real-time when the progress bar is dragged
	updateIndicators();
});

function updateProgressBarValue() {
	progressBar.valueAsNumber = (video.currentTime * 100) / video.duration;
}

function updateIndicators() {
	progressBar.style.setProperty("--progress", `${progressBar.valueAsNumber}%`);
	currentTime.textContent = secondsToTime(video.currentTime);
	timeRemaining.textContent = `-${secondsToTime(video.duration - video.currentTime)}`;
}

// progressBar also has tabindex="-1"
progressBar.onfocus = () => { progressBar.blur(); };

replayBtn.onclick = replay;
forwardBtn.onclick = forward;

// Toggle current time/remaining time
timeIndicator.addEventListener('click', () => {
	[timeRemaining.hidden, currentTime.hidden] = [currentTime.hidden, timeRemaining.hidden];
});

video.addEventListener('emptied', () => {
	// Needed when another video is loaded while the current one is playing
	playBtn.textContent = 'play_arrow';
});

// Save time in local storage when the window is closed/refreshed
window.onbeforeunload = () => {
	if (video.src && !video.ended) {
		updateLocalStorage();
	}
};

// CLEANUP
for (const key of Object.keys(localStorage)) {
	const entryDate = new Date(JSON.parse(localStorage.getItem(key)).last_opened);
	if (entryDate < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
		localStorage.removeItem(key);
	}
}

video.onended = () => {
	localStorage.removeItem(localStorageKey);
};


// KEYBOARD SHORTCUTS
// ------------------

document.addEventListener('keydown', (e) => {
	// Ignore key presses when a modifier key is pressed
	if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey)
		return;

	if (e.key !== ' ') {
		document.activeElement.blur();
	}

	switch (e.key) {
		case ' ': // Toggle play
			if (document.activeElement.tagName === 'BUTTON')
				break;
		case 'k':
			togglePlay();
			break;
		case 's': // Slow down
		case 'S':
			speedControls.stepDown();
			speedControls.dispatchEvent(new Event('change'));
			break;
		case 'd': // Speed up
		case 'D':
			speedControls.stepUp();
			speedControls.dispatchEvent(new Event('change'));
			break;
		case 'z': // Rewind
		case 'Z':
		case 'ArrowLeft':
		case 'ArrowDown':
			if (document.activeElement.tagName !== 'INPUT')
				replay();
			break;
		case 'x': // Advance
		case 'X':
		case 'ArrowRight':
		case 'ArrowUp':
			if (document.activeElement.tagName !== 'INPUT')
				forward();
			break;
		case 'r': // Reset speed
			video.playbackRate = video.defaultPlaybackRate;
			break;
		case 't': // Toggle time indicator
			toggleTimeIndicator();
			break;
		case 'a': // Preferred fast speed
			video.playbackRate = preferences.speed;
			break;
		case 'm': // Toggle mute
			toggleMute();
			break;
		case 'c': // Toggle zoom
			toggleZoom();
			break;
		case 'p': // Toggle PiP
			togglePictureInPicture();
			break;
		case 'f':
		case 'Enter':
			if (document.activeElement.tagName !== 'BUTTON' && document.activeElement.tagName !== 'INPUT')
				toggleFullScreen();
	}
});

function togglePlay() {
	video.paused ? video.play() : video.pause();
}

function toggleMute() {
	video.muted = !video.muted;
}

function clamp(min, value, max) {
	return Math.min(Math.max(value, min), max);
}

function replay() {
	video.currentTime = Math.max(video.currentTime - preferences.timeSkip, 0);
}

function forward() {
	video.currentTime = Math.min(video.currentTime + preferences.timeSkip, video.duration);
}

function togglePictureInPicture() {
	(document.pictureInPictureElement) ?
		document.exitPictureInPicture() :
		video.requestPictureInPicture();
}

function toggleFullScreen() {
	(document.fullscreenElement) ?
		document.exitFullscreen() :
		player.requestFullscreen();
}

function toggleZoom() {
	if (zoomBtn.textContent === 'zoom_out_map') {
		video.style.objectFit = 'cover';
		zoomBtn.textContent = 'crop_free';
	} else {
		video.style.objectFit = 'contain';
		zoomBtn.textContent = 'zoom_out_map';
	}
}

function toggleTimeIndicator() {
	[currentTime.hidden, timeRemaining.hidden] = [timeRemaining.hidden, currentTime.hidden];
}

// Convert seconds to time in format (h:)mm:ss
// Use https://tc39.es/proposal-temporal/docs/duration.html when available
function secondsToTime(seconds) {
	return new Date(seconds * 1000).toISOString().substring((seconds >= 3600) ? 12 : 14, 19);
}


// UTILITIES
// ---------

async function hashFile(file) {
	// Get byte array of file
	const arrayBuffer = await file.arrayBuffer();

	// Hash the byte array
	const hashAsArrayBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);

	// Get the hex value of each byte and store it in an array
	const hashAsUint8 = new Uint8Array(hashAsArrayBuffer);
	const hashAsArray = Array.from(hashAsUint8);

	// Convert each byte to a hex string
	const hashAsString = hashAsArray.map((b) => { b.toString(16).padStart(2, '0') }).join('');
	return hashAsString;
}

function updateLocalStorage() {
	let state = {
		timer: video.currentTime,
		playbackRate: video.playbackRate,
		last_opened: Date.now()
	};
	localStorage.setItem(localStorageKey, JSON.stringify(state));
}
