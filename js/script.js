'use strict'

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
			this.dataset.fileHover = true
			dropOverlay.hidden = false
		}
	})
})

dropOverlay.addEventListener('dragover', function (e) {
	e.preventDefault()
})

dropOverlay.addEventListener('drop', async (e) => {
	e.preventDefault()

	// The type check is done in dragenter and in manageFileHandle
	const fileHandle = await e.dataTransfer.items[0].getAsFileSystemHandle()

	manageFileHandle(fileHandle)
	handleDragEnd()
})

dropOverlay.addEventListener('dragleave', handleDragEnd)

function handleDragEnd() {
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

async function manageFileHandle(fileHandle) {
	const file = await fileHandle.getFile()

	if (!file.type.startsWith('video/'))
		return

	if (video.src) {
		console.log('A video change was detected. Saving the old video state in local storage…')
		updateLocalStorage()
		URL.revokeObjectURL(video.src)
	} else {
		console.log('Showing the player…')
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
		console.log('Setting title and artwork…')
		const artwork = capture()
		navigator.mediaSession.metadata = new MediaMetadata({
			title: fileName.textContent,
			artwork: [
				{ src: artwork, sizes: '512x512', type: 'image/png' }
			]
		})
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
const videoBar = document.querySelector('#video-bar')
const timeIndicator = document.querySelector('#time-indicator')
const currentTime = document.querySelector('.current-time')
const timeRemaining = document.querySelector('.time-remaining')
const replayBtn = document.querySelector('.replay-btn')
const forwardBtn = document.querySelector('.forward-btn')
const duration = document.querySelector('.duration')
var metadataAvailable = true // Used to prevent the time indicator from updating when the metadata is not loaded

video.addEventListener('loadedmetadata', function () {
	metadataAvailable = true

	if (localStorage.getItem(localStorageKey)) {
		console.log('Video state found in local storage. Restoring…')
		restoreFromLocalStorage()
	} else {
		console.log('No video state found in local storage.')
	}

	updateTimeIndicators()
	duration.textContent = secondsToTime(this.duration)

	videoBar.setAttribute('max', this.duration)
	updateVideoBar()
})

video.addEventListener('emptied', function () {
	metadataAvailable = false

	// Needed when another video is loaded while the current one is playing
	playBtn.textContent = 'play_arrow'
})

video.addEventListener('timeupdate', function () {
	if (!metadataAvailable)
		return

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

// Save time in local storage when the window is closed
window.onbeforeunload = () => {
	if (video.src && !video.ended) {
		updateLocalStorage()
	}
}

// Delete video state from local storage
video.onended = () => {
	localStorage.removeItem(localStorageKey)
	console.log('Video ended. Video state deleted from local storage.')
}


// KEYBOARD SHORTCUTS
document.addEventListener('keydown', (e) => {
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
		case 'a': // Preferred speed
			video.playbackRate = 2
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
	video.currentTime = Math.max(video.currentTime - 10, 0);
}

function forward() {
	video.currentTime = Math.min(video.currentTime + 10, video.duration);
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
	let data = {
		timer: video.currentTime,
		playbackRate: video.playbackRate
	}
	localStorage.setItem(localStorageKey, JSON.stringify(data))
	console.log('Video state saved in local storage.')
}

function restoreFromLocalStorage() {
	let data = JSON.parse(localStorage.getItem(localStorageKey))
	video.currentTime = data.timer
	video.playbackRate = data.playbackRate
	console.log('Video state restored from local storage.')
}

function capture() {
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
