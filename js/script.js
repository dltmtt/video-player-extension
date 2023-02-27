'use strict'

var preferences = {
	speed: 1.8,
	timeSkip: 10
}

console.groupCollapsed('Checking for localStorage entries older than 30 days…')
for (const key in localStorage) {
	if (Object.hasOwn(localStorage, key)) {
		const entryDate = new Date(JSON.parse(localStorage.getItem(key)).timestamp)
		if (entryDate < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
			localStorage.removeItem(key)
			console.info(`${key} deleted.`)
		} else {
			console.info(`${key} kept.`)
		}
	}
}
console.groupEnd()

// VIDEO SELECTION
// ---------------

// DRAG AND DROP
const dragPanel = document.querySelector('#drag-panel')
const dropOverlay = document.querySelector('#drop-overlay')
const droppableElements = document.querySelectorAll('.droppable')
const fileName = document.querySelector('#file-name')
const video = document.querySelector('video')
var localStorageKey

droppableElements.forEach(droppable => {
	droppable.addEventListener('dragenter', function (e) {
		if (e.dataTransfer.items[0].type.startsWith('video/')) {
			console.info(`A video file has entered #${e.target.id}'s dragging area. Showing the drop overlay…`)
			this.dataset.fileHover = true
			dropOverlay.hidden = false
		}
	})
})

dropOverlay.addEventListener('dragover', e => e.preventDefault())

dropOverlay.addEventListener('drop', async (e) => {
	console.info(`A ${e.dataTransfer.items[0].type} file was dropped on #${e.target.id}.`)
	e.preventDefault()

	// Type check is done in dragenter and in the click handler
	const fileHandle = await e.dataTransfer.items[0].getAsFileSystemHandle()

	manageFileHandle(fileHandle)
	handleDragEnd()
})

dropOverlay.addEventListener('dragleave', handleDragEnd)

function handleDragEnd() {
	console.info('The drag event has ended. Hiding the drop overlay…')
	dropOverlay.hidden = true
	droppableElements.forEach(droppable => {
		delete droppable.dataset.fileHover
	})
}

// FILE INPUT
const filePicker = document.querySelector('#file-picker')
filePicker.addEventListener('click', async () => {
	try {
		const [fileHandle] = await window.showOpenFilePicker({
			excludeAcceptAllOption: true,
			types: [
				{
					description: 'Videos',
					accept: {
						'video/*': ['.avi', '.mp4', '.mpeg', '.ogv', '.ts', '.webm', '.3gp', '.3g2']
					}
				}
			],
			multiple: false
		})

		manageFileHandle(fileHandle)
	} catch (abortError) { }
})

// FILE HANDLING
async function manageFileHandle(fileHandle) {
	const file = await fileHandle.getFile()

	if (video.src) {
		console.info('A video change was detected. Saving the old video state in local storage…')
		updateLocalStorage()
		URL.revokeObjectURL(video.src)
	} else {
		console.info('Hiding the drag panel and showing the player…')
		dragPanel.hidden = true
		player.hidden = false
	}

	// Don't change the order of these lines!
	localStorageKey = await hashFile(file)
	video.src = URL.createObjectURL(file)

	// Remove the file extension
	fileName.textContent = file.name.replace(/\.[^.]+$/, '')

	// Update the media session on first play
	video.addEventListener('seeked', function () {
		console.info('First seek detected. Updating Global Media Controls…')
		const artwork = capture()
		navigator.mediaSession.metadata = new MediaMetadata({
			title: fileName.textContent,
			artwork: [
				{ src: artwork, sizes: '512x512', type: 'image/png' }
			]
		})
		console.info('Title and artwork for Global Media Controls updated.')
	}, { once: true })

	// Bind the global media controls to the video
	const actionHandlers = [
		['seekbackward', replay],
		['seekforward', forward]
	]

	for (const [action, handler] of actionHandlers) {
		navigator.mediaSession.setActionHandler(action, handler)
	}
}


// CONTROL PLAYBACK
// ----------------

// NAVIGATION
const player = document.querySelector('.player')
const playBtn = document.querySelector('.play-btn')
const fullscreenBtn = document.querySelector('.fullscreen-btn')
const zoomBtn = document.querySelector('.zoom-btn')
const speedControls = document.querySelector('#speed-controls')

// Play/pause
playBtn.onclick = togglePlay
video.onclick = togglePlay
video.onpause = () => { playBtn.textContent = 'play_arrow' }
video.onplay = () => { playBtn.textContent = 'pause' }

// Fullscreen
fullscreenBtn.onclick = toggleFullScreen
document.onfullscreenchange = function () {
	fullscreenBtn.textContent = (document.fullscreenElement) ?
		'fullscreen_exit' :
		'fullscreen'
}

video.addEventListener('dblclick', toggleFullScreen)

// Speed
video.onratechange = function () {
	speedControls.value = this.playbackRate.toFixed(2)
}

speedControls.onchange = function () {
	// Caused by keyboard shortcuts
	this.value = parseFloat(this.value).toFixed(2)
	video.playbackRate = clamp(0.1, this.value, 16)
}

speedControls.oninput = function () {
	// Caused by keyboard input
	this.value = parseFloat(this.value).toFixed(2)
}

// Zoom
zoomBtn.onclick = toggleZoom


// TIME
// ----

const videoBar = document.querySelector('#video-bar')
const timeIndicator = document.querySelector('#time-indicator')
const currentTime = document.querySelector('.current-time')
const timeRemaining = document.querySelector('.time-remaining')
const replayBtn = document.querySelector('.replay-btn')
const forwardBtn = document.querySelector('.forward-btn')
const duration = document.querySelector('.duration')

video.addEventListener('loadedmetadata', function () {
	if (localStorage.getItem(localStorageKey)) {
		console.info('Video state found in local storage. Restoring…')
		restoreFromLocalStorage()
	} else {
		console.info('No video state found in local storage.')
	}

	updateTimeIndicators()
	duration.textContent = secondsToTime(this.duration)

	videoBar.setAttribute('max', this.duration)
	updateVideoBar()
})

video.addEventListener('emptied', function () {
	// Needed when another video is loaded while the current one is playing
	playBtn.textContent = 'play_arrow'
})

video.addEventListener('timeupdate', function () {
	if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
		console.info('The video metadata is not loaded yet. Skipping timeupdate event.')
		return
	}

	updateVideoBar()
	updateTimeIndicators()
})

// Seek to the point clicked on the progress bar
videoBar.addEventListener('input', function () {
	videoBar.style.setProperty("--progress", (this.valueAsNumber * 100 / video.duration) + "%")

	video.currentTime = this.value

	// Needed to show live the time when the progress bar is dragged
	updateTimeIndicators()
})

function updateTimeIndicators() {
	currentTime.textContent = secondsToTime(video.currentTime)
	timeRemaining.textContent = `-${secondsToTime(video.duration - video.currentTime)}`
}

function updateVideoBar() {
	videoBar.value = video.currentTime
	videoBar.style.setProperty("--progress", (videoBar.valueAsNumber * 100 / video.duration) + "%")
}

// videoBar also has tabindex="-1"
videoBar.onfocus = function () { this.blur() }

replayBtn.onclick = replay
forwardBtn.onclick = forward

// Toggle current time/remaining time
timeIndicator.addEventListener('click', function () {
	[timeRemaining.hidden, currentTime.hidden] = [currentTime.hidden, timeRemaining.hidden]
})

// Save time in local storage when the window is closed/refreshed
window.onbeforeunload = () => {
	if (video.src && !video.ended) {
		updateLocalStorage()
	}
}

// Delete video state from local storage
video.onended = () => {
	console.info('Video ended. Deleting video state from local storage…')
	localStorage.removeItem(localStorageKey)
}


// KEYBOARD SHORTCUTS
// ------------------

document.addEventListener('keydown', (e) => {
	// Ignore key presses when a modifier key is pressed
	if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey)
		return

	if (e.key !== ' ') {
		document.activeElement.blur()
	}

	switch (e.key) {
		case ' ': // Toggle play
			if (document.activeElement.tagName == 'BUTTON')
				break
		case 'k':
			togglePlay()
			break
		case 's': // Slow down
		case 'S':
			speedControls.stepDown()
			speedControls.dispatchEvent(new Event('change'))
			break
		case 'd': // Speed up
		case 'D':
			speedControls.stepUp()
			speedControls.dispatchEvent(new Event('change'))
			break
		case 'z': // Rewind
		case 'Z':
		case 'ArrowLeft':
		case 'ArrowDown':
			if (document.activeElement.tagName !== 'INPUT')
				replay()
			break
		case 'x': // Advance
		case 'X':
		case 'ArrowRight':
		case 'ArrowUp':
			if (document.activeElement.tagName !== 'INPUT')
				forward()
			break
		case 'r': // Reset speed
			video.playbackRate = video.defaultPlaybackRate
			break
		case 't': // Toggle time indicator
			toggleTimeIndicator()
			break
		case 'a': // Preferred fast speed
			video.playbackRate = preferences.speed
			break
		case 'm': // Toggle mute
			toggleMute()
			break
		case 'c': // Toggle zoom
			toggleZoom()
			break
		case 'p': // Toggle PiP
			togglePictureInPicture()
			break
		case 'f':
		case 'Enter':
			if (document.activeElement.tagName !== 'BUTTON' && document.activeElement.tagName !== 'INPUT')
				toggleFullScreen()
	}
})

function togglePlay() {
	video.paused ? video.play() : video.pause()
}

function toggleMute() {
	video.muted = !video.muted
}

function clamp(min, value, max) {
	return Math.min(Math.max(value, min), max)
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
		video.requestPictureInPicture()
}

function toggleFullScreen() {
	(document.fullscreenElement) ?
		document.exitFullscreen() :
		player.requestFullscreen()
}

function toggleZoom() {
	if (zoomBtn.textContent === 'zoom_out_map') {
		video.style.objectFit = 'cover'
		zoomBtn.textContent = 'crop_free'
	} else {
		video.style.objectFit = 'contain'
		zoomBtn.textContent = 'zoom_out_map'
	}
}

function toggleTimeIndicator() {
	[currentTime.hidden, timeRemaining.hidden] = [timeRemaining.hidden, currentTime.hidden]
}

// Convert seconds to time in format (h:)mm:ss
// Use https://tc39.es/proposal-temporal/docs/duration.html when available
function secondsToTime(seconds) {
	return new Date(seconds * 1000).toISOString().substring((seconds >= 3600) ? 12 : 14, 19)
}


// UTILITIES
// ---------

async function hashFile(file) {
	// Get byte array of file
	const arrayBuffer = await file.arrayBuffer();

	// Hash the byte array
	const hashAsArrayBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);

	// Get the hex value of each byte and store it in an array
	const uint8ViewOfHash = new Uint8Array(hashAsArrayBuffer);

	// Convert each byte to a hex string
	const hashAsString = Array.from(uint8ViewOfHash).map((b) => b.toString(16).padStart(2, '0')).join('');
	return hashAsString;
}

function updateLocalStorage() {
	let state = {
		timer: video.currentTime,
		playbackRate: video.playbackRate,
		timestamp: Date.now()
	}
	localStorage.setItem(localStorageKey, JSON.stringify(state))
	console.info('Video state saved in local storage.')
}

function restoreFromLocalStorage() {
	let state = JSON.parse(localStorage.getItem(localStorageKey))
	video.currentTime = state.timer
	video.playbackRate = state.playbackRate
	console.info('Video state restored from local storage.')
}

function capture() {
	console.info('Capturing a screenshot of the video…')
	const canvas = document.createElement('canvas')
	canvas.width = canvas.height = 512

	const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight)
	const x = (canvas.width / 2) - (video.videoWidth / 2) * scale
	const y = (canvas.height / 2) - (video.videoHeight / 2) * scale

	const ctx = canvas.getContext('2d')
	ctx.drawImage(video, x, y, video.videoWidth * scale, video.videoHeight * scale)

	const dataURL = canvas.toDataURL()

	return dataURL
}
