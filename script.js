const trackData = [
    {
        "chapterNum": 4,
        "title": "Olde California",
        "videoFile": "",
        "duration": "0:30",
        "audioFile": "Chapter4-audio-file.mp3",
        "imgFile": "ch4.jpg"
    },
    {
        "chapterNum": 5,
        "title": "Avila Adobe",
        "videoFile": "360-stock_injected.mp4",
        "duration": "0:44",
        "audioFile": "Chapter5-audio-file.mp3",
        "imgFile": "ch5.jpg"
    },
    {
        "chapterNum": 6,
        "title": "Mexicans in LA",
        "videoFile": "",
        "duration": "0:30",
        "audioFile": "Chapter6-audio-file.mp3",
        "imgFile": "ch6.jpg"
    }
];

const permissions = document.getElementById("permissions");
const allowButton = document.getElementById("allowButton");
const tourContainer = document.getElementById("tourContainer");
const chapterAudio = document.getElementById("chapterAudio");
const trackImage = document.getElementById("trackImage");
const trackInfo = document.getElementById("trackInfo");
const trackTitle = document.getElementById("trackTitle");
const tourTitle = document.getElementById("tourTitle");
const xrContent = document.getElementById("xrContent");
const xrVideo = document.getElementById("xrVideo");
const videoContainer = document.getElementById("videoContainer");
const viewXRButton = document.getElementById("viewXR");
const exitXRButton = document.getElementById("exitXR");
const menuButton = document.getElementById("menuButton");
const prevButton = document.getElementById("prevButton");
const playButton = document.getElementById("playButton");
const nextButton = document.getElementById("nextButton");
const speedButton = document.getElementById("speedButton");
const muteButton = document.getElementById("muteButton");
const volumeSlider = document.getElementById("volumeSlider");
const currTime = document.getElementById("currTime");
const progressBar = document.getElementById("progressBar");
const trackDuration = document.getElementById("trackDuration");
const audio = document.getElementById("audio");
const playlistChapters = document.getElementById("playlistChapters");
const playlistContainer = document.getElementById("playlistContainer");


let currTrack = 0;
let isPlaying = false;
let isXR = false;
let iframeReady = false;
let exitingXR = false;
let isMuted = false;
let videoElem = null;
let iframeQueue = [];

function initializeTour() {
    setupEvents();
    setupAudio();
    loadTrack(0);
    loadMenu();
    window.addEventListener('message', handleIframe);
}

function setupEvents() {
    playButton.addEventListener('click', updatePlayPause);
    muteButton.addEventListener('click', muteUnmute);
    volumeSlider.addEventListener('click', adjustVol);
    audio.addEventListener('timeupdate', updateProgress);
    const trackProgress = document.getElementById('trackProgress');
    trackProgress.addEventListener('click', seekProgress);
    progressBar.addEventListener('click', seekProgress);
    viewXRButton.addEventListener('click', enterXR);
    exitXRButton.addEventListener('click', exitXR);
    menuButton.addEventListener('click', playlistOpenClose);
    nextButton.addEventListener('click', playNext);
    prevButton.addEventListener('click', playPrevious);
    speedButton.addEventListener('click', adjustSpeed);
    videoContainer.addEventListener('load', iframeLoaded);


    playlistChapters.addEventListener('click', (e) => {
        const track = e.target.closest('.playlist-item');
        if (track && track.dataset.index) {
            loadTrack(parseInt(track.dataset.index), true);
            playlistOpenClose();
        }
    });
}

function muteUnmute() {
    isMuted = !isMuted;
    audio.muted = isMuted;
    if (isMuted) {
        muteButton.innerHTML = `<img src="vol.svg" style="max-width: 40px; height: auto;">`;
    } else {
        muteButton.innerHTML = `<img src="mute.svg" style="max-width: 40px; height: auto;">`;
    }
}

function adjustVol(e) {
    audio.volume = e.target.value;
}

function updateProgress() {
    const curr = audio.currentTime;
    const totalTime = audio.duration;
    const progress = (curr / totalTime)  * 100;
    progressBar.style.width = `${progress}%`;
    currTime.textContent = formatDuration(curr);

    if (isXR) {
        postMsgToIframe({
            action: 'setTime',
            time: curr
        });
    }
}

function seekProgress(e) {
    const progress = document.getElementById('trackProgress');
    const rect = progress.getBoundingClientRect();
    const clickPos = (e.clientX - rect.left) / rect.width;
    let updatedTime = clickPos * audio.duration;

    updatedTime = Math.max(0, Math.min(updatedTime, audio.duration));
    audio.currentTime = updatedTime;

    const pct = 100 * (updatedTime / audio.duration);
    progressBar.style.width = `${pct}%`;
    currTime.textContent = formatDuration(updatedTime);

    if (isXR) {
        postMsgToIframe({
            action: 'setTime',
            time: updatedTime
        });
    }

    if (isPlaying) {
        postMsgToIframe({
            action: 'play',
            time: updatedTime
        });
        audio.play();
    }

}

function sync() {
    if (videoContainer && audio) {
        videoContainer.currentTime = audio.currentTime;
    }
}

function iframeLoaded() {
    const video = videoContainer.contentDocument.querySelector('video');
      if (video) {
          video.currentTime = audio.currentTime;
          if (!audio.paused) {
              video.play();
          }
      }
}

function enterXR() {
//remember to mute the XR video
    let curr = trackData[currTrack];
    const vid = curr.videoFile;

    isXR = true;
    exitingXR = false;

    xrContent.style.display = 'block';
    exitXRButton.style.display = 'flex';

    let wasPlaying = !audio.paused;

    setupXR(vid, () => {
        postMsgToIframe({
            action: 'setTime',
            time: audio.currentTime
        });
    });

    if (wasPlaying) {
            postMsgToIframe({
                action: 'play',
                time: audio.currentTime
            });
        }
}

function setupXR(vid) {
    xrContent.innerHTML = "";

    const iframe = document.createElement('iframe');
    iframe.id = "xrVideo";
    iframe.allowFullScreen = true;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    
    xrContent.appendChild(iframe);

    const hideAframeUI = `
    <style>
      .a-loader-title, .a-enter-vr-button, .a-loader {
        display: none !important;
      }
    </style>`;

    iframe.srcdoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
      <title>Immersive Scene</title>
      <script src="https://aframe.io/releases/1.7.1/aframe.min.js"></script>
      ${hideAframeUI}
      <style>
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        a-scene {
          width: 100%;
          height: 100%;
        }
      </style>
    </head>
    <body>
      <a-scene device-orientation-permission-ui=""
               loading-screen="enabled: false"
               vr-mode-ui="enabled: false"> 
        <a-assets>
          <video id="xrVideo"
                 src="${vid}"
                 crossorigin="anonymous"
                 playsinline
                 webkit-playsinline
                 muted
                 autoplay
                 preload="auto"
                 xr-layer
                 loop="false">
          </video>
        </a-assets>
        
        <a-videosphere src="#xrVideo" rotation="0 -90 0"></a-videosphere>
      
        <a-entity position="0 1.6 0">
          <a-camera
              look-controls="pointerLockEnabled: false;
                          reverseMouseDrag: false;
                          touchEnabled: true;
                          mouseEnabled: true;s
                          magicWindowTrackingEnabled: true">
          </a-camera>
          <a-cursor></a-cursor>
        </a-entity>

        <script>
          const video = document.getElementById('xrVideo');
          video.muted = true;
           video.playsInline = true;

          function syncVid(time) {
            if (Math.abs(video.currentTime - time) > 0.1) {
              video.currentTime = time;
            }
          }

          function notifyReady() {
            window.parent.postMessage({ 
              type: 'aframeReady'
            }, '*');
          }

          video.addEventListener('loadedmetadata', notifyReady);
          video.addEventListener('ended', () => {
            window.parent.postMessage({
              type: 'videoEnded'
            }, '*');
          });
        
          window.addEventListener('message', (e) => {

            if (e.data.action == "play") {
                syncVid(e.data.time);
                video.play();
            } else if (e.data.action == "pause") {
                video.pause();
            } else if (e.data.action == "setTime") {
             syncVid(e.data.time);
             } else if (e.data.action == "getCurrentTime") {
             window.parent.postMessage({
                  type: 'currentTime',
                  time: video.currentTime
                }, '*');
             }

          });

          if (video.readyState > 2) {
            notifyReady();
          }
        </script>
      </a-scene>
    </body>
    </html>
    `;

    iframe.onload = () => {
        iframeReady = true;
    }

    iframe.onerror = (error) => {
        console.error('Iframe load error:', error);
    };
}

function exitXR(vidTime) {
    exitingXR = true;


    postMsgToIframe({
        action:  'getCurrentTime'
    });

    chapterAudio.style.display = 'flex';
    xrContent.style.display = 'none';


    xrContent.innerHTML = "";

        exitingXR = false;
        isXR = false;

}

function finishExitXR(vidTime) {
 const atEnd = vidTime >= (audio.duration - 0.6);

    const newTime = atEnd ? 0 : vidTime;
    audio.currentTime = newTime;

    if (!atEnd) {
        audio.currentTime = newTime;
               updatePlayPause();

    } else {
        audio.currentTime = 0;
        updatePlayPause();
    }


    isXR = false;
}

function loadTrack(idx, autoplay = false) {

    let track = trackData[idx];

    currTrack = idx;
    isPlaying = false;
    if (isXR) {
    exitingXR = true;
        exitXR();
        return;
    } else {
        exitXRButton.style.display = 'none';
    }

    audio.removeEventListener('canplay', playAudio);

    audio.src = track.audioFile;
    trackImage.src = track.imgFile;
    trackTitle.textContent = `Chapter ${track.chapterNum}. ${track.title}`;
    tourTitle.textContent = `Neither Here Nor There`;
    trackDuration.textContent = track.duration;

    progressBar.style.width = "0%";
    currTime.textContent = '0:00';

    const showXR = track.videoFile;
    let has360 = showXR && showXR !== "";
    if (has360) {
             const xrMode = document.getElementById('xrMode');

        xrMode.classList.remove('content');
        xrMode.style.display = 'flex';
        xrMode.style.justifyContent = 'center';
        xrMode.style.alignItems = 'center';
    

        viewXRButton.style.display = 'flex';
            exitXRButton.style.display = 'none';
    } else {
            viewXRButton.style.display = 'none';
                exitXRButton.style.display = 'none';
    }

    playButton.innerHTML = `<img src="play.svg" style="max-width: 40px; height: auto;">`;

    if (autoplay) {

        isPlaying = true;
        playButton.innerHTML = `<img src="pause.svg" style="max-width: 40px; height: auto;">`;
        audio.play();

        if (audio.readyState >= 3) {
            playAudio();
        }
        
    } else {
        isPlaying = false;
        playButton.innerHTML = `<img src="play.svg" style="max-width: 40px; height: auto;">`;
    }


}

function playAudio() {
    audio.play().then(() => {
        isPlaying = true;
        playButton.innerHTML = `<img src="pause.svg" style="max-width: 40px; height: auto;">`;
        audio.removeEventListener('canplay', playAudio);
            }).catch(error => {
                isPlaying = false;
                playButton.innerHTML = `<img src="play.svg" style="max-width: 40px; height: auto;">`;
                audio.removeEventListener('canplay', playAudio);
    });
        
}

function loadMenu() {  

    playlistChapters.innerHTML = '';

    for (i=0; i<trackData.length; i++) {
        const chapter = document.createElement("div");
        chapter.className = 'playlist-item';
        chapter.dataset.index = i;
        const track = trackData[i];

        chapter.innerHTML = `
        ${track.chapterNum}. ${track.title}
         <span class="duration">${track.duration}</span>
        `;

        playlistChapters.appendChild(chapter);
    }

  
        playlistContainer.style.display = 'none';
    
}

function playlistOpenClose() {
    playlistContainer.classList.toggle('open');

    if (playlistContainer.classList.contains('open')) {
        menuButton.textContent="X";
        playlistContainer.style.display = 'flex';
    } else {
        menuButton.innerHTML = `<img src="menu.svg" style="max-width: 40px; height: auto;">`;
        playlistContainer.style.display = 'none';
    }
}

function playPrevious() {
 if (isXR) {
        exitXR();
    }

    const prev = (currTrack - 1 + 3) % 3;
    loadTrack(prev, true);

}

function playNext() {
    if (isXR) {
        exitXR();
    } else {
        exitXRButton.style.display='none';
    }

    const next = (currTrack + 1) % 3;
    loadTrack(next, true);

     audio.removeEventListener('canplay', playAudio);

}

function adjustSpeed() {
    const speed = [1, 2];
    const currSpeed = audio.playbackRate;
    let currIndex = speed.indexOf(currSpeed);
    if (currIndex === 0) {
        currIndex = 1;
    } else {
        currIndex = 0;
    }
    const newSpeed = speed[currIndex];

    audio.playbackRate = newSpeed;
    if (xrVideo) {
        xrVideo.playbackRate = newSpeed;
    }

    speedButton.textContent = `${newSpeed}x`;
}

function formatDuration (seconds) {
    seconds = parseFloat(seconds);
    let minutes = Math.floor(seconds/60);
    let secs = `${Math.floor(seconds%60)}`;
    if (secs < 10) {
        secs = `0${secs}`;
    }
    return `${minutes}:${secs}`;
}


function setupAudio() {
    audio.addEventListener('ended', () => {
        let currChapter = trackData[currTrack].chapterNum;
        isPlaying = false;
        updatePlayPause();
        playNext();
    });

    audio.addEventListener('loadedmetadata', ()=> {
        trackDuration.textContent = formatDuration(audio.duration);
    });
}

function updatePlayPause() {
    isPlaying = !isPlaying;

    if (isPlaying) {
        audio.play();
        playButton.innerHTML = `<img src="pause.svg" style="max-width: 40px; height: auto;">`;
    } else {
        audio.pause();
        playButton.innerHTML = `<img src="play.svg" style="max-width: 40px; height: auto;">`;
    }
}



function handleIframe(e) {
    if (e.data.type === 'aframeReady') {
        iframeReady = true;
      iframeQueue.forEach(msg => postMsgToIframe(msg));
      iframeQueue = [];
    } else if (e.data.type === 'currentTime') {
    if (exitingXR) {
      finishExitXR(e.data.time);
      loadTrack(currTrack, isPlaying);
    }
  }  else if (e.data.type === 'videoEnded') {
      audio.currentTime = 0;
      playNext();
  }
}

function postMsgToIframe(msg) {
    if (!iframeReady) {
    iframeQueue.push(msg);
    return;
  }
  videoContainer?.contentWindow?.postMessage(msg, '*');
}

document.addEventListener('DOMContentLoaded', initializeTour);
