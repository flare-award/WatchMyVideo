/**
 * WatchMyVideo - Local YouTube & TikTok Player
 * Vanilla JavaScript implementation fulfilling all functional and architectural requirements.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const videoFileinput = document.getElementById('video-file-input');
    const subFileInput = document.getElementById('sub-file-input');
    const qualityFileInput = document.getElementById('quality-file-input');
    const welcomeScreen = document.getElementById('welcome-screen');
    const dropzone = document.getElementById('dropzone');
    const playerWrapper = document.getElementById('player-wrapper');
    const video = document.getElementById('video-element');
    const loadingSpinner = document.getElementById('loading-spinner');
    const doubleTapIndicator = document.getElementById('double-tap-indicator');
    const tapAnimationContent = document.getElementById('tap-animation-content');
    const subtitleOverlay = document.getElementById('subtitle-overlay');
    const tiktokSidebar = document.getElementById('tiktok-sidebar');
    const customControlsOverlay = document.getElementById('custom-controls-overlay');

    // Control Buttons & Sliders
    const btnPlayPause = document.getElementById('btn-play-pause');
    const playPauseIcon = document.getElementById('play-pause-icon');
    const btnPrevFrame = document.getElementById('btn-prev-frame');
    const btnNextFrame = document.getElementById('btn-next-frame');
    const btnMute = document.getElementById('btn-mute');
    const volumeIcon = document.getElementById('volume-icon');
    const volumeSlider = document.getElementById('volume-slider');
    const btnVolumeBoost = document.getElementById('btn-volume-boost');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');

    const btnSubtitles = document.getElementById('btn-subtitles');
    const ccIndicator = document.getElementById('cc-indicator');
    const btnSettings = document.getElementById('btn-settings');
    const btnPip = document.getElementById('btn-pip');
    const btnTheater = document.getElementById('btn-theater');
    const theaterIcon = document.getElementById('theater-icon');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const fullscreenIcon = document.getElementById('fullscreen-icon');

    // Progress Bar
    const progressContainer = document.getElementById('progress-container');
    const progressBuffered = document.getElementById('progress-buffered');
    const progressPlayed = document.getElementById('progress-played');
    const progressScrubber = document.getElementById('progress-scrubber');
    const progressTooltip = document.getElementById('progress-tooltip');

    // Header & Style Toggle
    const btnToggleStyle = document.getElementById('btn-toggle-style');
    const styleNameEl = document.getElementById('style-name');
    const btnFullscreenApp = document.getElementById('btn-fullscreen-app');
    const btnLoadDemo = document.getElementById('btn-load-demo');

    // Settings Menu
    const settingsMenu = document.getElementById('settings-menu');
    const settingsMain = document.getElementById('settings-main');
    const settingsSpeed = document.getElementById('settings-speed');
    const settingsQuality = document.getElementById('settings-quality');
    const settingsSubtitlesMenu = document.getElementById('settings-subtitles-menu');
    const currentSpeedLabel = document.getElementById('current-speed-label');
    const currentQualityLabel = document.getElementById('current-quality-label');
    const currentSubLabel = document.getElementById('current-sub-label');
    const pitchCheckbox = document.getElementById('pitch-checkbox');
    const loopCheckbox = document.getElementById('loop-checkbox');
    const btnAutoSub = document.getElementById('btn-auto-sub');
    const speedOptions = document.getElementById('speed-options');
    const customSpeedInput = document.getElementById('custom-speed-input');
    const btnApplyCustomSpeed = document.getElementById('btn-apply-custom-speed');
    const qualityOptions = document.getElementById('quality-options');
    const subtitlesOptionsList = document.getElementById('subtitles-options-list');

    // State Variables
    let isPlaying = false;
    let isTheater = false;
    let isMuted = false;
    let volumeBeforeMute = 1;
    let isBoosted = false;
    let playbackSpeed = 1;
    let isLooping = false;
    let playerStyle = 'youtube'; // 'youtube' or 'tiktok'
    let controlsTimeout = null;
    let isDraggingProgress = false;

    // Web Audio API for Volume Boost & Pitch
    let audioCtx = null;
    let sourceNode = null;
    let gainNode = null;

    // Quality management (multiple files for different qualities)
    let qualitySources = {}; // e.g. { '1080': 'blob:...', '720': 'blob:...' }
    let currentQualityKey = 'original';

    // Subtitles management
    let subtitleTracks = []; // { id, name, cues: [{ start, end, text }] }
    let currentSubtitleTrackId = 'off';
    let activeCues = [];

    // Initialize Web Audio API
    function initWebAudio() {
        if (audioCtx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            sourceNode = audioCtx.createMediaElementSource(video);
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 1.0;

            sourceNode.connect(gainNode);
            gainNode.connect(audioCtx.destination);
        } catch (e) {
            console.warn('Web Audio API initialization failed:', e);
        }
    }

    // Ensure audio context resumes on user interaction
    function resumeAudioContext() {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // --- 1. Load Video (File API & Drag-and-Drop) ---
    function loadVideoFromFile(file) {
        if (!file) return;
        const fileURL = URL.createObjectURL(file);
        qualitySources = { 'original': fileURL };
        currentQualityKey = 'original';
        
        video.src = fileURL;
        video.load();
        
        // Hide welcome screen, show player
        welcomeScreen.classList.add('hidden');
        playerWrapper.classList.remove('hidden');
        
        // Reset state
        video.playbackRate = playbackSpeed;
        video.loop = isLooping;
        
        initWebAudio();
        resumeAudioContext();
        
        video.play().then(() => {
            updatePlayPauseButton(true);
        }).catch(err => {
            console.log("Autoplay prevented:", err);
            updatePlayPauseButton(false);
        });

        updateQualityUI();
    }

    // Demo video loader
    btnLoadDemo.addEventListener('click', () => {
        // Use a reliable open-source sample video
        const demoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        qualitySources = { 'original': demoUrl };
        currentQualityKey = 'original';
        video.src = demoUrl;
        video.load();

        welcomeScreen.classList.add('hidden');
        playerWrapper.classList.remove('hidden');
        initWebAudio();
        video.play().then(() => updatePlayPauseButton(true));
        updateQualityUI();
    });

    videoFileinput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            loadVideoFromFile(e.target.files[0]);
        }
    });

    // Drag and drop events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files[0]) {
            loadVideoFromFile(files[0]);
        }
    });

    // Also allow dropping video anywhere on player wrapper or welcome screen
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files && files[0] && files[0].type.startsWith('video/')) {
            loadVideoFromFile(files[0]);
        }
    });
    window.addEventListener('dragover', (e) => e.preventDefault());

    // --- 2. Player Style Switcher (YouTube vs TikTok) ---
    btnToggleStyle.addEventListener('click', () => {
        if (playerStyle === 'youtube') {
            playerStyle = 'tiktok';
            playerWrapper.classList.remove('youtube-style');
            playerWrapper.classList.add('tiktok-style');
            tiktokSidebar.classList.remove('hidden');
            styleNameEl.textContent = 'TikTok стиль';
        } else {
            playerStyle = 'youtube';
            playerWrapper.classList.remove('tiktok-style');
            playerWrapper.classList.add('youtube-style');
            tiktokSidebar.classList.add('hidden');
            styleNameEl.textContent = 'YouTube стиль';
        }
    });

    // --- Auto-Hide Controls ---
    function showControls() {
        playerWrapper.classList.remove('hide-controls');
        resetControlsTimeout();
    }

    function resetControlsTimeout() {
        clearTimeout(controlsTimeout);
        if (isPlaying) {
            controlsTimeout = setTimeout(() => {
                if (!video.paused && !settingsMenu.classList.contains('hidden') === false && !isDraggingProgress) {
                    playerWrapper.classList.add('hide-controls');
                }
            }, 2500);
        }
    }

    playerWrapper.addEventListener('mousemove', showControls);
    playerWrapper.addEventListener('mousedown', showControls);
    playerWrapper.addEventListener('touchstart', showControls);

    // --- Play / Pause Logic ---
    function togglePlayPause() {
        resumeAudioContext();
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }

    function updatePlayPauseButton(isPlayingState) {
        isPlaying = isPlayingState;
        if (isPlaying) {
            playPauseIcon.className = 'fa-solid fa-pause';
            btnPlayPause.title = 'Пауза (Space)';
            resetControlsTimeout();
        } else {
            playPauseIcon.className = 'fa-solid fa-play';
            btnPlayPause.title = 'Воспроизвести (Space)';
            playerWrapper.classList.remove('hide-controls');
            clearTimeout(controlsTimeout);
        }
    }

    btnPlayPause.addEventListener('click', togglePlayPause);
    video.addEventListener('click', togglePlayPause);

    video.addEventListener('play', () => updatePlayPauseButton(true));
    video.addEventListener('pause', () => updatePlayPauseButton(false));

    // Loading events
    video.addEventListener('waiting', () => loadingSpinner.classList.remove('hidden'));
    video.addEventListener('playing', () => loadingSpinner.classList.add('hidden'));
    video.addEventListener('canplay', () => loadingSpinner.classList.add('hidden'));

    // --- Time & Progress Bar ---
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const hours = Math.floor(mins / 60);
        const remMins = mins % 60;
        if (hours > 0) {
            return `${hours}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
        }
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    video.addEventListener('timeupdate', () => {
        if (!isDraggingProgress && video.duration) {
            const percent = (video.currentTime / video.duration) * 100;
            progressPlayed.style.width = `${percent}%`;
            progressScrubber.style.left = `${percent}%`;
            currentTimeEl.textContent = formatTime(video.currentTime);
        }
        updateSubtitles(video.currentTime);
    });

    video.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(video.duration);
    });

    // Buffered progress
    video.addEventListener('progress', () => {
        if (video.buffered.length > 0 && video.duration) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const percent = (bufferedEnd / video.duration) * 100;
            progressBuffered.style.width = `${percent}%`;
        }
    });

    // Progress bar scrubbing & hover
    function getScrubTime(e) {
        const rect = progressContainer.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        return pos * video.duration;
    }

    progressContainer.addEventListener('mousemove', (e) => {
        if (!video.duration) return;
        const scrubTime = getScrubTime(e);
        progressTooltip.style.left = `${e.clientX - progressContainer.getBoundingClientRect().left}px`;
        progressTooltip.textContent = formatTime(scrubTime);
        progressTooltip.style.display = 'block';
    });

    progressContainer.addEventListener('mouseleave', () => {
        progressTooltip.style.display = 'none';
    });

    progressContainer.addEventListener('mousedown', (e) => {
        isDraggingProgress = true;
        const scrubTime = getScrubTime(e);
        video.currentTime = scrubTime;
        progressPlayed.style.width = `${(scrubTime / video.duration) * 100}%`;
        progressScrubber.style.left = `${(scrubTime / video.duration) * 100}%`;

        function onMouseMove(moveEvent) {
            const t = getScrubTime(moveEvent);
            video.currentTime = t;
            progressPlayed.style.width = `${(t / video.duration) * 100}%`;
            progressScrubber.style.left = `${(t / video.duration) * 100}%`;
            currentTimeEl.textContent = formatTime(t);
        }

        function onMouseUp(upEvent) {
            isDraggingProgress = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    });

    // --- 3. Rewind / Forward (±5s) with Animation Indicator ---
    function triggerDoubleTapAnimation(text, isForward) {
        tapAnimationContent.innerHTML = isForward 
            ? `<span>+5 сек</span><i class="fa-solid fa-angles-right"></i>`
            : `<i class="fa-solid fa-angles-left"></i><span>-5 сек</span>`;
        doubleTapIndicator.classList.add('show');
        setTimeout(() => {
            doubleTapIndicator.classList.remove('show');
        }, 600);
    }

    function skipTime(seconds) {
        if (!video.duration) return;
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
        triggerDoubleTapAnimation(seconds > 0 ? '+5 сек' : '-5 сек', seconds > 0);
    }

    // --- 4. Frame-by-frame viewing (only when paused) ---
    function stepFrame(frames) {
        if (!video.paused) return;
        // Estimated frame rate ~ 30 fps
        const fps = 30;
        const step = frames / fps;
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + step));
    }

    btnPrevFrame.addEventListener('click', () => stepFrame(-1));
    btnNextFrame.addEventListener('click', () => stepFrame(1));

    // --- 5. Playback Speed & Pitch Preservation ---
    function setPlaybackSpeed(speed) {
        playbackSpeed = speed;
        video.playbackRate = speed;
        currentSpeedLabel.innerHTML = `${speed === 1 ? 'Нормальная (1x)' : speed + 'x'} <i class="fa-solid fa-chevron-right"></i>`;
        
        // Highlight active speed option
        document.querySelectorAll('#speed-options .settings-option').forEach(opt => {
            if (parseFloat(opt.getAttribute('data-speed')) === speed) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }

    speedOptions.addEventListener('click', (e) => {
        const option = e.target.closest('.settings-option');
        if (option) {
            const speed = parseFloat(option.getAttribute('data-speed'));
            setPlaybackSpeed(speed);
            switchSettingsView(settingsMain);
        }
    });

    btnApplyCustomSpeed.addEventListener('click', () => {
        const val = parseFloat(customSpeedInput.value);
        if (!isNaN(val) && val > 0.05 && val <= 16) {
            setPlaybackSpeed(val);
            switchSettingsView(settingsMain);
        }
    });

    pitchCheckbox.addEventListener('change', (e) => {
        video.preservesPitch = e.target.checked;
        if (video.webkitPreservesPitch !== undefined) {
            video.webkitPreservesPitch = e.target.checked;
        }
    });

    // --- 6. Loop (Repeat) ---
    loopCheckbox.addEventListener('change', (e) => {
        isLooping = e.target.checked;
        video.loop = isLooping;
    });

    // Seamless loop event listener fallback
    video.addEventListener('ended', () => {
        if (isLooping) {
            video.currentTime = 0;
            video.play();
        }
    });

    // --- 7. Video Quality Selection & Multi-Quality Loading ---
    function updateQualityUI() {
        const keys = Object.keys(qualitySources);
        qualityOptions.innerHTML = '';
        keys.forEach(key => {
            const opt = document.createElement('div');
            opt.className = `settings-option ${key === currentQualityKey ? 'active' : ''}`;
            opt.setAttribute('data-quality', key);
            opt.textContent = key === 'original' ? 'Исходное (Original)' : `${key}p`;
            opt.addEventListener('click', () => {
                switchQuality(key);
                switchSettingsView(settingsMain);
            });
            qualityOptions.appendChild(opt);
        });
        currentQualityLabel.innerHTML = `${currentQualityKey === 'original' ? 'Исходное' : currentQualityKey + 'p'} <i class="fa-solid fa-chevron-right"></i>`;
    }

    function switchQuality(qualityKey) {
        if (!qualitySources[qualityKey] || qualityKey === currentQualityKey) return;
        const currentTime = video.currentTime;
        const wasPlaying = !video.paused;

        currentQualityKey = qualityKey;
        video.src = qualitySources[qualityKey];
        video.currentTime = currentTime;
        video.load();

        if (wasPlaying) {
            video.play();
        }
        updateQualityUI();
    }

    document.querySelector('[data-action="add-quality-file"]').addEventListener('click', () => {
        qualityFileInput.click();
    });

    qualityFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const qualityName = prompt("Введите название качества для этого файла (например: 720, 1080, 4K):", "720");
            if (qualityName) {
                const url = URL.createObjectURL(file);
                qualitySources[qualityName] = url;
                updateQualityUI();
                alert(`Файл качества ${qualityName} успешно добавлен! Теперь его можно выбрать в настройках.`);
            }
        }
    });

    // --- 8. Subtitles (.srt/.vtt parsing & Speech AI auto-generation) ---
    function parseVTT(text) {
        const cues = [];
        const lines = text.replace(/\r\n/g, '\n').split('\n');
        let i = 0;

        // Skip WEBVTT header if present
        if (lines[i].includes('WEBVTT')) {
            i++;
        }

        while (i < lines.length) {
            while (i < lines.length && lines[i].trim() === '') i++;
            if (i >= lines.length) break;

            // Optional cue identifier
            if (!lines[i].includes('-->') && i + 1 < lines.length && lines[i + 1].includes('-->')) {
                i++;
            }

            if (i < lines.length && lines[i].includes('-->')) {
                const parts = lines[i].split('-->');
                const start = parseTimestamp(parts[0].trim());
                const end = parseTimestamp(parts[1].trim().split(' ')[0]);
                i++;

                let cueText = '';
                while (i < lines.length && lines[i].trim() !== '') {
                    cueText += (cueText ? '\n' : '') + lines[i].trim();
                    i++;
                }

                if (!isNaN(start) && !isNaN(end)) {
                    cues.push({ start, end, text: cueText });
                }
            } else {
                i++;
            }
        }
        return cues;
    }

    function parseSRT(text) {
        // SRT format is very similar to VTT with comma timestamp separator
        const vttText = 'WEBVTT\n\n' + text.replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4');
        return parseVTT(vttText);
    }

    function parseTimestamp(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length === 3) {
            const hours = parseFloat(parts[0]);
            const mins = parseFloat(parts[1]);
            const secs = parseFloat(parts[2]);
            return hours * 3600 + mins * 60 + secs;
        } else if (parts.length === 2) {
            const mins = parseFloat(parts[0]);
            const secs = parseFloat(parts[1]);
            return mins * 60 + secs;
        }
        return 0;
    }

    function loadSubtitleFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            let cues = [];
            if (file.name.endsWith('.srt')) {
                cues = parseSRT(content);
            } else {
                cues = parseVTT(content);
            }

            const trackId = 'sub_' + Date.now();
            const trackName = file.name;
            subtitleTracks.push({ id: trackId, name: trackName, cues });
            
            updateSubtitlesMenu();
            selectSubtitleTrack(trackId);
            alert(`Субтитры "${trackName}" (${cues.length} реплик) успешно загружены!`);
        };
        reader.readAsText(file);
    }

    subFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            loadSubtitleFile(e.target.files[0]);
        }
    });

    function updateSubtitlesMenu() {
        subtitlesOptionsList.innerHTML = `<div class="settings-option ${currentSubtitleTrackId === 'off' ? 'active' : ''}" data-sub="off">Выключены</div>`;
        subtitleTracks.forEach(track => {
            const opt = document.createElement('div');
            opt.className = `settings-option ${track.id === currentSubtitleTrackId ? 'active' : ''}`;
            opt.setAttribute('data-sub', track.id);
            opt.textContent = track.name;
            opt.addEventListener('click', () => {
                selectSubtitleTrack(track.id);
                switchSettingsView(settingsMain);
            });
            subtitlesOptionsList.appendChild(opt);
        });

        if (currentSubtitleTrackId === 'off') {
            currentSubLabel.innerHTML = `Выключены <i class="fa-solid fa-chevron-right"></i>`;
            ccIndicator.classList.remove('active');
        } else {
            const activeTrack = subtitleTracks.find(t => t.id === currentSubtitleTrackId);
            currentSubLabel.innerHTML = `${activeTrack ? activeTrack.name : 'Включены'} <i class="fa-solid fa-chevron-right"></i>`;
            ccIndicator.classList.add('active');
        }
    }

    function selectSubtitleTrack(trackId) {
        currentSubtitleTrackId = trackId;
        updateSubtitlesMenu();
        if (trackId === 'off') {
            subtitleOverlay.textContent = '';
        }
    }

    subtitlesOptionsList.addEventListener('click', (e) => {
        const option = e.target.closest('.settings-option');
        if (option) {
            const subId = option.getAttribute('data-sub');
            selectSubtitleTrack(subId);
            switchSettingsView(settingsMain);
        }
    });

    btnSubtitles.addEventListener('click', () => {
        // Toggle subtitles on/off or open menu
        if (subtitleTracks.length === 0) {
            subFileInput.click();
            return;
        }
        if (currentSubtitleTrackId === 'off') {
            selectSubtitleTrack(subtitleTracks[0].id);
        } else {
            selectSubtitleTrack('off');
        }
    });

    function updateSubtitles(currentTime) {
        if (currentSubtitleTrackId === 'off') {
            subtitleOverlay.textContent = '';
            return;
        }
        const track = subtitleTracks.find(t => t.id === currentSubtitleTrackId);
        if (!track) {
            subtitleOverlay.textContent = '';
            return;
        }
        const currentCue = track.cues.find(cue => currentTime >= cue.start && currentTime <= cue.end);
        subtitleOverlay.textContent = currentCue ? currentCue.text : '';
    }

    // Auto-generate subtitles using Web Speech API (SpeechRecognition)
    btnAutoSub.addEventListener('click', () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Ваш браузер не поддерживает Web Speech API (SpeechRecognition). Рекомендуем использовать Google Chrome.');
            return;
        }

        if (video.paused) {
            alert('Пожалуйста, запустите видео воспроизведение для генерации субтитров.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ru-RU'; // Can adjust or auto-detect

        const generatedCues = [];
        let startTime = video.currentTime;

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const text = event.results[i][0].transcript;
                    const endTime = video.currentTime;
                    generatedCues.push({ start: startTime, end: endTime, text });
                    startTime = endTime;
                }
            }
        };

        recognition.onerror = (err) => {
            console.warn('Speech recognition error:', err);
        };

        recognition.onend = () => {
            if (generatedCues.length > 0) {
                const trackId = 'ai_sub_' + Date.now();
                subtitleTracks.push({ id: trackId, name: 'AI Авто-субтитры (Speech-to-Text)', cues: generatedCues });
                updateSubtitlesMenu();
                selectSubtitleTrack(trackId);
                alert('Автоматические субтитры успешно сгенерированы!');
            } else {
                alert('Не удалось распознать речь в видео или аудиодорожка пуста.');
            }
        };

        try {
            recognition.start();
            alert('Идет генерация субтитров (распознавание речи)... Дождитесь окончания воспроизведения или приостановите запись при необходимости.');
        } catch (e) {
            console.error(e);
        }
    });

    // --- 9. Sound Management (Volume Slider & Volume Boost up to 200%) ---
    volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        video.volume = val;
        if (gainNode) {
            gainNode.gain.value = isBoosted ? val * 2.0 : val;
        }
        isMuted = val === 0;
        updateVolumeIcon(val);
    });

    function updateVolumeIcon(vol) {
        if (vol === 0 || isMuted) {
            volumeIcon.className = 'fa-solid fa-volume-xmark';
        } else if (vol < 0.5) {
            volumeIcon.className = 'fa-solid fa-volume-low';
        } else {
            volumeIcon.className = 'fa-solid fa-volume-high';
        }
    }

    btnMute.addEventListener('click', () => {
        if (isMuted || video.volume === 0) {
            isMuted = false;
            video.volume = volumeBeforeMute || 0.5;
            volumeSlider.value = video.volume * 100;
            if (gainNode) gainNode.gain.value = isBoosted ? video.volume * 2.0 : video.volume;
            updateVolumeIcon(video.volume);
        } else {
            volumeBeforeMute = video.volume;
            isMuted = true;
            video.volume = 0;
            volumeSlider.value = 0;
            if (gainNode) gainNode.gain.value = 0;
            updateVolumeIcon(0);
        }
    });

    btnVolumeBoost.addEventListener('click', () => {
        initWebAudio();
        isBoosted = !isBoosted;
        if (isBoosted) {
            btnVolumeBoost.classList.add('active');
            if (gainNode) gainNode.gain.value = video.volume * 2.0;
        } else {
            btnVolumeBoost.classList.remove('active');
            if (gainNode) gainNode.gain.value = video.volume;
        }
    });

    // --- 10. Picture-in-Picture (PiP) ---
    btnPip.addEventListener('click', async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
                await video.requestPictureInPicture();
            }
        } catch (err) {
            console.error('PiP error:', err);
        }
    });

    // --- 11. View Modes (Normal & Theater Mode) ---
    btnTheater.addEventListener('click', () => {
        isTheater = !isTheater;
        if (isTheater) {
            playerWrapper.classList.add('theater-mode');
            theaterIcon.className = 'fa-solid fa-compress';
            btnTheater.title = 'Обычный режим (T)';
        } else {
            playerWrapper.classList.remove('theater-mode');
            theaterIcon.className = 'fa-solid fa-rectangle-ad';
            btnTheater.title = 'Режим кинотеатра (T)';
        }
    });

    // --- 12. Fullscreen Mode (on .player-wrapper) ---
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            playerWrapper.requestFullscreen().catch(err => {
                console.error('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    btnFullscreen.addEventListener('click', toggleFullscreen);

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenIcon.className = 'fa-solid fa-compress';
            btnFullscreen.title = 'Выйти из полноэкранного режима (F)';
        } else {
            fullscreenIcon.className = 'fa-solid fa-expand';
            btnFullscreen.title = 'На весь экран (F)';
        }
    });

    btnFullscreenApp.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });

    // --- Settings Menu Toggle & Navigation ---
    btnSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsMenu.classList.toggle('hidden');
        switchSettingsView(settingsMain);
    });

    document.addEventListener('click', (e) => {
        if (!settingsMenu.contains(e.target) && e.target !== btnSettings && !btnSettings.contains(e.target)) {
            settingsMenu.classList.add('hidden');
        }
    });

    function switchSettingsView(viewElement) {
        document.querySelectorAll('.settings-view').forEach(v => v.classList.add('hidden'));
        viewElement.classList.remove('hidden');
    }

    document.querySelectorAll('.settings-item[data-action]').forEach(item => {
        item.addEventListener('click', (e) => {
            const action = item.getAttribute('data-action');
            if (action === 'speed') switchSettingsView(settingsSpeed);
            if (action === 'quality') switchSettingsView(settingsQuality);
            if (action === 'subtitles-menu') switchSettingsView(settingsSubtitlesMenu);
        });
    });

    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetViewId = btn.getAttribute('data-back');
            switchSettingsView(document.getElementById(targetViewId));
        });
    });

    // --- Keyboard Shortcuts (Non-interfering) ---
    window.addEventListener('keydown', (e) => {
        // Ignore if typing in input fields
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

        const key = e.key.toLowerCase();

        if (key === ' ' || key === 'k') {
            e.preventDefault();
            togglePlayPause();
        } else if (key === 'f') {
            e.preventDefault();
            toggleFullscreen();
        } else if (key === 't') {
            e.preventDefault();
            btnTheater.click();
        } else if (key === 'm') {
            e.preventDefault();
            btnMute.click();
        } else if (key === 'c') {
            e.preventDefault();
            btnSubtitles.click();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            skipTime(5);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            skipTime(-5);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            video.volume = Math.min(1, video.volume + 0.05);
            volumeSlider.value = video.volume * 100;
            if (gainNode) gainNode.gain.value = isBoosted ? video.volume * 2.0 : video.volume;
            updateVolumeIcon(video.volume);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            video.volume = Math.max(0, video.volume - 0.05);
            volumeSlider.value = video.volume * 100;
            if (gainNode) gainNode.gain.value = isBoosted ? video.volume * 2.0 : video.volume;
            updateVolumeIcon(video.volume);
        } else if (e.key === '<' || e.key === ',') {
            e.preventDefault();
            stepFrame(-1);
        } else if (e.key === '>' || e.key === '.') {
            e.preventDefault();
            stepFrame(1);
        }
    });

});
