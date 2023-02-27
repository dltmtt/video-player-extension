# Player for local videos
This a video player for local videos whose main features are:
* Light/dark theme (following system preferences)
* Restores video state[^note]
* [Keyboard shortcuts](#keyboard-shortcuts)
* Global Media Controls integration
* Works offline

Light mode | Dark mode
:---------:|:--------:
![Welcome screen (light mode)](https://user-images.githubusercontent.com/50383865/165765909-c72741f4-2a99-40aa-b3c6-5a8e622c5e40.png) | ![Welcome screen (dark mode)](https://user-images.githubusercontent.com/50383865/165765936-fbbebb27-6a37-4469-a44a-9b03ac261354.png)
![Player (light mode)](https://user-images.githubusercontent.com/50383865/165766797-734916fd-f3e1-4a96-ac27-b2423431e158.png) | ![Player (dark mode)](https://user-images.githubusercontent.com/50383865/165766804-6310aa0c-4a04-426d-b37b-f978b9187222.png)

## Usage
To use the extension, click on its tooltip icon or press `Ctrl+Shift+O`[^1].

To open a video, drag and drop it on the extension page or click on the button. If another video is opened, its state will be saved and the dragged video will be opened.

## Keyboard shortcuts
The following keyboard shortcuts are supported:
| Key | Action |
|:---:|---|
| `Space`<br>`k` | Toggle play/pause |
<<<<<<< HEAD
| `S` | Slow down by 0.1× |
| `D` | Speed up by 0.1× |
=======
| `S` | Slow down by 0.1 |
| `D` | Speed up by 0.1 |
>>>>>>> 1405972 (Update README)
| `Z`<br>`Left arrow`<br>`Down arrow` | Rewind 10 seconds |
| `X`<br>`Right arrow`<br>`Up arrow` | Forward 10 seconds |
| `R` | Reset default speed |
| `T` | Toggle time/remaining |
| `A` | Set speed to 1.8 |
| `M` | Toggle mute |
| `C` | Toggle video zoom |
| `P` | Toggle PiP |
| `F`<br>`Enter` | Toggle fullscreen |

[![Available in the Chrome Web Store](https://user-images.githubusercontent.com/50383865/166124241-0a01a0b4-855a-44be-8f24-b823bb1ed7bd.png)](https://chrome.google.com/webstore/detail/player-for-local-videos/jobmoeleihhccoboiljgojnjkejppiih)

[^note]: The video state is saved in the browser's local storage. If you clear your browser's data, the state will be lost. Saved state will be deleted upon video completion or for videos last played more than 30 days ago.

[^1]: `Cmd+Shift+O` on macOS. Customizable under `chrome://extensions/shortcuts`.
