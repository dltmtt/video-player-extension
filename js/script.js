'use strict'

// DRAG 'N' DROP
const dragPanel = document.querySelector('#drag-panel')
const dropOverlay = document.querySelector('#drop-overlay')
const droppableElements = document.querySelectorAll('.droppable')
const fileName = document.querySelector('#file-name')
const video = document.querySelector('video')
var videoObjURL
var videoId

droppableElements.forEach(droppable => {
    droppable.addEventListener('dragenter', function (e) {
        if (e.dataTransfer.items[0].type.includes('video')) {
            this.dataset.fileHover = true
            dropOverlay.hidden = false
        }
    })
})

dropOverlay.addEventListener('dragleave', function () {
    dropOverlay.hidden = true
    droppableElements.forEach(droppable => {
        delete droppable.dataset.fileHover
    })
})

dropOverlay.addEventListener('dragover', function (e) {
    e.preventDefault()
})

dropOverlay.addEventListener('drop', function (e) {
    e.preventDefault()

    if (videoObjURL === undefined) {
        dragPanel.hidden = true
        player.hidden = false
    } else {
        URL.revokeObjectURL(videoObjURL)
        skipTimeUpdate = true
    }

    const file = e.dataTransfer.files[0]
    videoObjURL = URL.createObjectURL(file)
    video.src = videoObjURL

    fileName.textContent = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    videoId = `Timer for ${file.name}`

    dropOverlay.hidden = true
    droppableElements.forEach(droppable => delete droppable.dataset.fileHover)
})


// NAVIGATION
const player = document.querySelector('.player')
const playBtn = document.querySelector('.play-btn')
const fullscreenBtn = document.querySelector('.fullscreen-btn')
const zoomBtn = document.querySelector('.zoom-btn')
const speedDisplay = document.querySelector('#speed-display')
const speedIncrease = document.querySelector('.speed-increase')
const speedDecrease = document.querySelector('.speed-decrease')

// Play/pause
playBtn.onclick = togglePlay
video.onclick = togglePlay
video.onpause = () => { playBtn.textContent = 'play_arrow' }
video.onplay = () => { playBtn.textContent = 'pause' }

// Fullscreen
fullscreenBtn.onclick = toggleFullScreen
document.onfullscreenchange = function () {
    if (document.fullscreenElement)
        fullscreenBtn.textContent = 'fullscreen_exit'
    else
        fullscreenBtn.textContent = 'fullscreen'
}

video.addEventListener('dblclick', toggleFullScreen)

// Speed
video.onratechange = function () {
    speedDisplay.value = this.playbackRate.toFixed(2)
}

speedIncrease.onclick = () => addToSpeed(0.1)
speedDecrease.onclick = () => addToSpeed(-0.1)

speedDisplay.oninput = function () {
    video.playbackRate = clamp(0.1, this.value, 16)
}

speedDisplay.addEventListener('keydown', function (e) {
    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault()
            addToSpeed(0.1)
            break
        case 'ArrowDown':
            e.preventDefault()
            addToSpeed(-0.1)
    }
})

// Zoom
zoomBtn.onclick = toggleZoom


// TIME
const videoBar = document.querySelector('#video-bar')
const timeIndicator = document.querySelector('#time-indicator')
const currentTime = document.querySelector('.current-time')
const timeRemaining = document.querySelector('.time-remaining')
const duration = document.querySelector('.duration')
var skipTimeUpdate

video.addEventListener('loadedmetadata', function () {
    skipTimeUpdate = false

    // Restore video position from local storage
    this.currentTime = localStorage.getItem(videoId)

    timeRemaining.textContent = `-${secondsToTime(this.duration - this.currentTime)}`
    duration.textContent = secondsToTime(this.duration)
    videoBar.setAttribute('max', this.duration)
})

video.addEventListener('timeupdate', function () {
    if (!skipTimeUpdate) {
        // Update video bar position
        videoBar.value = this.currentTime
        videoBar.ariaValueText = secondsToTextTime(this.currentTime)

        // Save time in local storage
        localStorage.setItem(videoId, this.currentTime)

        // Update time indicator
        currentTime.textContent = secondsToTime(this.currentTime)
        timeRemaining.textContent = `-${secondsToTime(this.duration - this.currentTime)}`
    }
})

// Seek to the point clicked on the progress bar
videoBar.addEventListener('input', function () {
    video.currentTime = this.value

    // Needed to show real-time the time corresponding to the progress bar
    currentTime.textContent = secondsToTime(video.currentTime)
    timeRemaining.textContent = `-${secondsToTime(video.duration - video.currentTime)}`
})

// videoBar also has tabindex="-1"
videoBar.onfocus = function () { this.blur() }

// Toggle current time/remaining time
timeIndicator.addEventListener('click', function () {
    [timeRemaining.hidden, currentTime.hidden] = [currentTime.hidden, timeRemaining.hidden]
})

// Delete video position from local storage
video.onended = () => { localStorage.removeItem(videoId) }


// KEYBOARD SHORTCUTS
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case ' ': // Toggle play
            if (document.activeElement.tagName !== 'BUTTON')
                togglePlay()
            break
        case 's': // Slow down
            addToSpeed(-0.1)
            break
        case 'd': // Speed up
            addToSpeed(0.1)
            break
        case 'z': // Rewind
        case 'ArrowLeft':
        case 'ArrowDown':
            if (document.activeElement.tagName !== 'INPUT')
                video.currentTime -= 15
            break
        case 'x': // Advance
        case 'ArrowRight':
        case 'ArrowUp':
            if (document.activeElement.tagName !== 'INPUT')
                video.currentTime += 15
            break
        case 'r': // Reset speed
            video.playbackRate = video.defaultPlaybackRate
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


// AUXILIARY FUNCTIONS
function clamp(min, value, max) {
    return Math.min(Math.max(value, min), max)
}

function togglePlay() {
    video.paused ? video.play() : video.pause()
}

function toggleMute() {
    video.muted = !video.muted
}

function addToSpeed(delta) {
    // Clamp speed between 0.1 and 16 (Chrome range is [0.0625, 16])
    video.playbackRate = clamp(0.1, (video.playbackRate + delta).toFixed(2), 16)
}

function togglePictureInPicture() {
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture()
    } else {
        video.requestPictureInPicture()
    }
}

function toggleFullScreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen()
    } else {
        player.requestFullscreen()
    }
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

// Convert seconds to time in format (h:)mm:ss
// Use https://tc39.es/proposal-temporal/docs/duration.html when available
function secondsToTime(seconds) {
    let time = new Date(seconds * 1000)
    let h = time.getUTCHours(),
        m = time.getUTCMinutes().toString().padStart(2, '0'),
        s = time.getUTCSeconds().toString().padStart(2, '0')

    return (h > 0) ? `${h}:${m}:${s}` : `${m}:${s}`
}

// Used for aria-valuetext
function secondsToTextTime(seconds) {
    let time = new Date(seconds * 1000)
    let h = time.getUTCHours(),
        m = time.getUTCMinutes(),
        s = time.getUTCSeconds()

    let hText = `${h} hour${(h === 1) ? '' : 's'} `
    let mText = `${m} minute${(m === 1) ? '' : 's'} `
    let sText = `${s} second${(s === 1) ? '' : 's'}`

    return `${h ? hText : ''}${m ? mText : ''}${sText}`
}
