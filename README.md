# Player for local videos
This a video player for local videos whose main features are:
* Light/dark theme (following system preferences)
* Restores video location[^note]
* Keyboard shortcuts
* Works offline

<div float="left">
	<img width="49.5%" alt="welcome_light" src="https://user-images.githubusercontent.com/50383865/165765909-c72741f4-2a99-40aa-b3c6-5a8e622c5e40.png">
	<img width="49.5%" alt="welcome_dark" src="https://user-images.githubusercontent.com/50383865/165765936-fbbebb27-6a37-4469-a44a-9b03ac261354.png">
</div>

<div float="left">
	<img width="49.5%" alt="player_light" src="https://user-images.githubusercontent.com/50383865/165766797-734916fd-f3e1-4a96-ac27-b2423431e158.png">
	<img width="49.5%" alt="player_dark" src="https://user-images.githubusercontent.com/50383865/165766804-6310aa0c-4a04-426d-b37b-f978b9187222.png">
</div>

## Usage
To use the extension, click on its tooltip icon or press `Ctrl+Shift+O`[^1].

To open a video, drag and drop it on the extension page. If another video is opened, the player will switch to that.

To toggle between time elapsed and time remaining, click on the video duration.

## Keyboard shortcuts
The following keyboard shortcuts are supported:
| Key | Action |
|:---:|---|
| `Space`<br>`k` | Toggle play/pause |
| `S` | Slow down by 0.1× |
| `D` | Speed up by 0.1× |
| `Z`<br>`Left arrow`<br>`Down arrow` | Rewind 15 seconds |
| `X`<br>`Right arrow`<br>`Up arrow` | Forward 15 seconds |
| `R` | Reset default speed |
| `A` | Set speed to 2× |
| `M` | Toggle mute |
| `C` | Toggle video zoom |
| `P` | Toggle PiP |
| `F`<br>`Enter` | Toggle Fullscreen |

[![Available in the Chrome Web Store](https://user-images.githubusercontent.com/50383865/166124241-0a01a0b4-855a-44be-8f24-b823bb1ed7bd.png)](https://chrome.google.com/webstore/detail/player-for-local-videos/jobmoeleihhccoboiljgojnjkejppiih)

[^note]: The mechanism is based on the file name, so the video location won't be restored if the video is renamed. The time is stored in `localStorage` and gets automatically deleted when a video ends.

[^1]: `Cmd+Shift+O` on macOS. Customizable under `chrome://extensions/shortcuts`
