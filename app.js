/**
 * WatchMyVideo — Local video player in YouTube (and TikTok) style.
 * Vanilla JavaScript, no dependencies.
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const $ = (id) => document.getElementById(id);

    // ---- DOM references ----
    const videoFileInput = $('video-file-input');
    const subFileInput = $('sub-file-input');
    const qualityFileInput = $('quality-file-input');
    const welcomeScreen = $('welcome-screen');
    const dropzone = $('dropzone');
    const playerWrapper = $('player-wrapper');
    const video = $('video-element');
    const loadingSpinner = $('loading-spinner');
    const doubleTapIndicator = $('double-tap-indicator');
    const tapAnimationContent = $('tap-animation-content');
    const subtitleOverlay = $('subtitle-overlay');
    const tiktokSidebar = $('tiktok-sidebar');
    const tkLikeBtn = $('tk-like');
    const tkLikeCount = $('tk-like-count');
    const tkShareBtn = $('tk-share');
    const tkSoundIcon = $('tk-sound-icon');

    const centerFlash = $('center-flash');
    const centerFlashIcon = $('center-flash-icon');
    const replayOverlay = $('replay-overlay');
    const btnReplay = $('btn-replay');

    // Controls
    const btnPlayPause = $('btn-play-pause');
    const playPauseIcon = $('play-pause-icon');
    const btnPrevFrame = $('btn-prev-frame');
    const btnNextFrame = $('btn-next-frame');
    const btnMute = $('btn-mute');
    const volumeIcon = $('volume-icon');
    const volumeSlider = $('volume-slider');
    const btnVolumeBoost = $('btn-volume-boost');
    const currentTimeEl = $('current-time');
    const durationEl = $('duration');

    const btnSubtitles = $('btn-subtitles');
    const ccIndicator = $('cc-indicator');
    const btnSettings = $('btn-settings');
    const btnPip = $('btn-pip');
    const btnTheater = $('btn-theater');
    const btnFullscreen = $('btn-fullscreen');
    const fullscreenIcon = $('fullscreen-icon');

    // Progress bar
    const progressContainer = $('progress-container');
    const progressBuffered = $('progress-buffered');
    const progressPlayed = $('progress-played');
    const progressScrubber = $('progress-scrubber');
    const progressTooltip = $('progress-tooltip');

    // Header & style toggle
    const btnToggleStyle = $('btn-toggle-style');
    const styleToggleIcon = $('style-toggle-icon');
    const styleNameEl = $('style-name');
    const btnLoadDemo = $('btn-load-demo');

    // Settings menu
    const settingsMenu = $('settings-menu');
    const settingsMain = $('settings-main');
    const settingsSpeed = $('settings-speed');
    const settingsQuality = $('settings-quality');
    const settingsSubtitlesMenu = $('settings-subtitles-menu');
    const currentSpeedLabel = $('current-speed-label');
    const currentQualityLabel = $('current-quality-label');
    const currentSubLabel = $('current-sub-label');
    const pitchCheckbox = $('pitch-checkbox');
    const loopCheckbox = $('loop-checkbox');
    const speedOptions = $('speed-options');
    const customSpeedInput = $('custom-speed-input');
    const btnApplyCustomSpeed = $('btn-apply-custom-speed');
    const qualityOptions = $('quality-options');
    const subtitlesOptionsList = $('subtitles-options-list');

    const toastEl = $('toast');

    // ---- State ----
    let isTheater = false;
    let isMuted = false;
    let volumeBeforeMute = 1;
    let isBoosted = false;
    let playbackSpeed = 1;
    let isLooping = false;
    let playerStyle = 'youtube'; // 'youtube' | 'tiktok'
    let controlsTimeout = null;
    let isDraggingProgress = false;
    let currentVideoKey = null; // used for per-video like persistence
    let pendingSeekTime = null; // applied on 'loadedmetadata' after a quality switch
    let wasPlayingBeforeQualitySwitch = false;

    // Web Audio (volume boost)
    let audioCtx = null;
    let sourceNode = null;
    let gainNode = null;

    // Quality management: map of label -> source URL
    let qualitySources = {};
    let currentQualityKey = 'original';

    // Subtitles management
    let subtitleTracks = []; // [{ id, name, cues: [{start, end, text}] }]
    let currentSubtitleTrackId = 'off';

    const DEMO_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

    // =========================================================
    //  Toast notifications (replaces alert/prompt)
    // =========================================================
    let toastTimer = null;
    function showToast(message, duration = 3200) {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
    }

    // =========================================================
    //  Web Audio API — volume boost
    // =========================================================
    function initWebAudio() {
        if (audioCtx) return true;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return false;
            audioCtx = new AudioContext();
            sourceNode = audioCtx.createMediaElementSource(video);
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 1.0;
            sourceNode.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            return true;
        } catch (e) {
            console.warn('Web Audio API initialization failed:', e);
            audioCtx = null;
            gainNode = null;
            return false;
        }
    }

    function resumeAudioContext() {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // video.volume carries the slider value; the gain node is only the boost multiplier
    function applyBoostGain() {
        if (gainNode) {
            gainNode.gain.value = isBoosted ? 2.0 : 1.0;
        }
    }

    // =========================================================
    //  Loading videos (file input, drag & drop, demo)
    // =========================================================
    function revokeBlobUrls(map) {
        Object.values(map).forEach((url) => {
            if (typeof url === 'string' && url.startsWith('blob:')) {
                try { URL.revokeObjectURL(url); } catch (_) { /* ignore */ }
            }
        });
    }

    function startPlaybackSession(sourceUrl, qualityMap, qualityKey, videoKey) {
        revokeBlobUrls(qualitySources);
        qualitySources = qualityMap;
        currentQualityKey = qualityKey;
        currentVideoKey = videoKey;

        video.src = sourceUrl;
        video.load();

        // Reset element state to match stored settings
        video.playbackRate = playbackSpeed;
        video.loop = isLooping;

        welcomeScreen.classList.add('hidden');
        playerWrapper.classList.remove('hidden');
        replayOverlay.classList.add('hidden');

        initWebAudio();
        resumeAudioContext();

        const playPromise = video.play();
        if (playPromise && playPromise.catch) {
            playPromise.catch(() => updatePlayPauseButton(false));
        }

        updateQualityUI();
        refreshTikTokLikeUI();
        playerWrapper.classList.remove('hide-controls');
        scheduleControlsHide();
    }

    function loadVideoFromFile(file) {
        if (!file) return;
        if (!file.type.startsWith('video/') && !/\.(mkv|avi|mov|webm|mp4|ogv)$/i.test(file.name)) {
            showToast('Пожалуйста, выберите видеофайл');
            return;
        }
        const url = URL.createObjectURL(file);
        startPlaybackSession(url, { original: url }, 'original', `file:${file.name}:${file.size}`);
    }

    function loadDemoVideo() {
        startPlaybackSession(DEMO_VIDEO_URL, { original: DEMO_VIDEO_URL }, 'original', 'demo:bigbuckbunny');
    }

    videoFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) loadVideoFromFile(file);
        e.target.value = ''; // allow re-selecting the same file
    });

    btnLoadDemo.addEventListener('click', loadDemoVideo);

    // Drag & drop on the dropzone
    ['dragenter', 'dragover'].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) loadVideoFromFile(file);
    });

    // Allow dropping a video anywhere on the page
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file && (file.type.startsWith('video/') || /\.(mkv|avi|mov|webm|mp4|ogv)$/i.test(file.name))) {
            loadVideoFromFile(file);
        }
    });

    // =========================================================
    //  YouTube / TikTok style switcher
    // =========================================================
    function applyPlayerStyle(style) {
        const toTikTok = style === 'tiktok';
        playerStyle = toTikTok ? 'tiktok' : 'youtube';
        playerWrapper.classList.toggle('tiktok-style', toTikTok);
        playerWrapper.classList.toggle('youtube-style', !toTikTok);
        tiktokSidebar.classList.toggle('hidden', !toTikTok);
        styleNameEl.textContent = toTikTok ? 'TikTok стиль' : 'YouTube стиль';
        styleToggleIcon.className = toTikTok ? 'fa-brands fa-tiktok' : 'fa-brands fa-youtube';
        styleToggleIcon.id = 'style-toggle-icon';
        styleToggleIcon.style.color = toTikTok ? '' : '#ff0000';
        btnToggleStyle.title = toTikTok ? 'Переключить на YouTube стиль' : 'Переключить на TikTok стиль';
    }

    btnToggleStyle.addEventListener('click', () => {
        applyPlayerStyle(playerStyle === 'youtube' ? 'tiktok' : 'youtube');
    });

    // =========================================================
    //  TikTok action rail: like (persisted) & share
    // =========================================================
    function likeStorageKeys() {
        const k = currentVideoKey || 'global';
        return { count: `wmv_likes_${k}`, liked: `wmv_liked_${k}` };
    }

    function readLikeState() {
        const keys = likeStorageKeys();
        if (!keys) return { count: 0, liked: false };
        try {
            const count = parseInt(localStorage.getItem(keys.count) || '0', 10) || 0;
            const liked = localStorage.getItem(keys.liked) === '1';
            return { count, liked };
        } catch (_) {
            return { count: 0, liked: false };
        }
    }

    function writeLikeState(count, liked) {
        const keys = likeStorageKeys();
        if (!keys) return;
        try {
            localStorage.setItem(keys.count, String(count));
            localStorage.setItem(keys.liked, liked ? '1' : '0');
        } catch (_) { /* storage unavailable (private mode etc.) */ }
    }

    function formatCount(n) {
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(n);
    }

    function refreshTikTokLikeUI() {
        const { count, liked } = readLikeState();
        tkLikeCount.textContent = formatCount(count);
        tkLikeBtn.classList.toggle('liked', liked);
        tkLikeBtn.setAttribute('aria-pressed', liked ? 'true' : 'false');
    }

    tkLikeBtn.addEventListener('click', () => {
        const { count, liked } = readLikeState();
        const nextLiked = !liked;
        const nextCount = Math.max(0, count + (nextLiked ? 1 : -1));
        writeLikeState(nextCount, nextLiked);
        refreshTikTokLikeUI();
    });

    async function shareCurrentVideo() {
        const shareData = {
            title: document.title,
            text: 'WatchMyVideo',
            url: window.location.href
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
                return;
            }
            throw new Error('Web Share API unavailable');
        } catch (err) {
            if (err && err.name === 'AbortError') return; // user cancelled the share sheet
            try {
                await navigator.clipboard.writeText(shareData.url);
                showToast('Ссылка скопирована в буфер обмена');
            } catch (_) {
                showToast('Не удалось поделиться: буфер обмена недоступен');
            }
        }
    }

    tkShareBtn.addEventListener('click', shareCurrentVideo);

    function setSoundDiskSpinning(spinning) {
        tkSoundIcon.classList.toggle('paused', !spinning);
    }

    // =========================================================
    //  Auto-hide controls
    // =========================================================
    function scheduleControlsHide() {
        clearTimeout(controlsTimeout);
        if (video.paused || !settingsMenu.classList.contains('hidden') || isDraggingProgress) {
            return;
        }
        controlsTimeout = setTimeout(() => {
            if (!video.paused && settingsMenu.classList.contains('hidden') && !isDraggingProgress) {
                playerWrapper.classList.add('hide-controls');
            }
        }, 2600);
    }

    function showControls() {
        playerWrapper.classList.remove('hide-controls');
        scheduleControlsHide();
    }

    playerWrapper.addEventListener('mousemove', showControls);
    playerWrapper.addEventListener('mousedown', showControls);
    playerWrapper.addEventListener('touchstart', showControls, { passive: true });
    playerWrapper.addEventListener('mouseleave', () => {
        if (!video.paused && settingsMenu.classList.contains('hidden') && !isDraggingProgress) {
            playerWrapper.classList.add('hide-controls');
        }
    });

    // =========================================================
    //  Play / pause
    // =========================================================
    function togglePlayPause() {
        if (!video.src) return;
        resumeAudioContext();
        if (video.paused) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    }

    function flashCenterIcon(iconClass) {
        centerFlashIcon.className = iconClass;
        centerFlash.classList.remove('show');
        // force reflow so the animation restarts
        void centerFlash.offsetWidth;
        centerFlash.classList.add('show');
    }

    function updatePlayPauseButton(playing) {
        if (playing) {
            playPauseIcon.className = 'fa-solid fa-pause';
            btnPlayPause.title = 'Пауза (K)';
            scheduleControlsHide();
        } else {
            playPauseIcon.className = 'fa-solid fa-play';
            btnPlayPause.title = 'Воспроизвести (K)';
            clearTimeout(controlsTimeout);
            playerWrapper.classList.remove('hide-controls');
        }
    }

    btnPlayPause.addEventListener('click', togglePlayPause);
    video.addEventListener('click', togglePlayPause);

    video.addEventListener('play', () => {
        updatePlayPauseButton(true);
        replayOverlay.classList.add('hidden');
        setSoundDiskSpinning(true);
        // Don't flash the icon when autoplay kicks in on load without user gesture context
        if (video.readyState >= 2) flashCenterIcon('fa-solid fa-play');
    });

    video.addEventListener('pause', () => {
        updatePlayPauseButton(false);
        setSoundDiskSpinning(false);
        flashCenterIcon('fa-solid fa-pause');
    });

    video.addEventListener('ended', () => {
        setSoundDiskSpinning(false);
        if (!video.loop) {
            replayOverlay.classList.remove('hidden');
        }
    });

    btnReplay.addEventListener('click', () => {
        replayOverlay.classList.add('hidden');
        video.currentTime = 0;
        video.play().catch(() => {});
    });

    // Loading spinner + errors
    video.addEventListener('loadstart', () => loadingSpinner.classList.remove('hidden'));
    video.addEventListener('waiting', () => loadingSpinner.classList.remove('hidden'));
    video.addEventListener('playing', () => loadingSpinner.classList.add('hidden'));
    video.addEventListener('canplay', () => loadingSpinner.classList.add('hidden'));
    video.addEventListener('error', () => {
        loadingSpinner.classList.add('hidden');
        if (video.src) {
            showToast('Не удалось загрузить видео. Проверьте файл или ссылку.', 4000);
        }
    });

    // =========================================================
    //  Time & progress bar
    // =========================================================
    function formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) return '0:00';
        const total = Math.floor(seconds);
        const secs = total % 60;
        const mins = Math.floor(total / 60) % 60;
        const hours = Math.floor(total / 3600);
        const ss = String(secs).padStart(2, '0');
        if (hours > 0) {
            return `${hours}:${String(mins).padStart(2, '0')}:${ss}`;
        }
        return `${Math.floor(total / 60)}:${ss}`;
    }

    function hasDuration() {
        return isFinite(video.duration) && video.duration > 0;
    }

    video.addEventListener('timeupdate', () => {
        if (!isDraggingProgress && hasDuration()) {
            const percent = (video.currentTime / video.duration) * 100;
            progressPlayed.style.width = percent + '%';
            progressScrubber.style.left = percent + '%';
            progressContainer.setAttribute('aria-valuenow', String(Math.round(percent)));
            currentTimeEl.textContent = formatTime(video.currentTime);
        }
        updateSubtitles(video.currentTime);
    });

    video.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(video.duration);
        if (pendingSeekTime !== null) {
            const target = Math.min(pendingSeekTime, Math.max(0, (video.duration || pendingSeekTime) - 0.1));
            video.currentTime = target;
            pendingSeekTime = null;
        }
    });

    video.addEventListener('progress', () => {
        if (video.buffered.length > 0 && hasDuration()) {
            // Find the buffered range that contains the current position
            let bufferedEnd = 0;
            for (let i = 0; i < video.buffered.length; i++) {
                const end = video.buffered.end(i);
                const start = video.buffered.start(i);
                if (video.currentTime >= start - 0.5 && video.currentTime <= end + 0.5) {
                    bufferedEnd = end;
                    break;
                }
                bufferedEnd = Math.max(bufferedEnd, end);
            }
            progressBuffered.style.width = Math.min(100, (bufferedEnd / video.duration) * 100) + '%';
        }
    });

    // Tooltip while hovering the progress bar
    progressContainer.addEventListener('pointermove', (e) => {
        if (!hasDuration()) return;
        const rect = progressContainer.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (!isDraggingProgress) {
            const tooltipX = ratio * rect.width;
            progressTooltip.style.left = Math.max(18, Math.min(rect.width - 18, tooltipX)) + 'px';
            progressTooltip.textContent = formatTime(ratio * video.duration);
            progressTooltip.style.display = 'block';
        }
    });

    progressContainer.addEventListener('pointerleave', () => {
        progressTooltip.style.display = 'none';
    });

    // Scrubbing with pointer events (mouse + touch + pen)
    function seekToPosition(e) {
        if (!hasDuration()) return;
        const rect = progressContainer.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = ratio * video.duration;
        video.currentTime = time;
        progressPlayed.style.width = ratio * 100 + '%';
        progressScrubber.style.left = ratio * 100 + '%';
        currentTimeEl.textContent = formatTime(time);
        // Keep the tooltip synced while scrubbing
        progressTooltip.style.left = Math.max(18, Math.min(rect.width - 18, ratio * rect.width)) + 'px';
        progressTooltip.textContent = formatTime(time);
        progressTooltip.style.display = 'block';
    }

    progressContainer.addEventListener('pointerdown', (e) => {
        if (!hasDuration()) return;
        e.preventDefault();
        isDraggingProgress = true;
        progressContainer.classList.add('scrubbing');
        try { progressContainer.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        replayOverlay.classList.add('hidden');
        seekToPosition(e);
        showControls();
    });

    progressContainer.addEventListener('pointermove', (e) => {
        if (isDraggingProgress) {
            seekToPosition(e);
        }
    });

    function endScrubbing() {
        if (!isDraggingProgress) return;
        isDraggingProgress = false;
        progressContainer.classList.remove('scrubbing');
        progressTooltip.style.display = 'none';
        scheduleControlsHide();
    }

    progressContainer.addEventListener('pointerup', endScrubbing);
    progressContainer.addEventListener('pointercancel', endScrubbing);

    // =========================================================
    //  Seek ±5s + indicator animation
    // =========================================================
    function triggerDoubleTapAnimation(seconds, isForward) {
        const amount = Math.abs(seconds);
        tapAnimationContent.innerHTML = isForward
            ? `<span>+${amount} сек</span><i class="fa-solid fa-angles-right"></i>`
            : `<i class="fa-solid fa-angles-left"></i><span>-${amount} сек</span>`;
        doubleTapIndicator.classList.add('show');
        setTimeout(() => doubleTapIndicator.classList.remove('show'), 650);
    }

    function skipTime(seconds) {
        if (!hasDuration()) return;
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
        replayOverlay.classList.add('hidden');
        triggerDoubleTapAnimation(seconds, seconds > 0);
    }

    // =========================================================
    //  Frame-by-frame stepping (only while paused)
    // =========================================================
    const ESTIMATED_FPS = 30;

    function stepFrame(frames) {
        if (!video.paused || !hasDuration()) return;
        const step = frames / ESTIMATED_FPS;
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + step));
    }

    btnPrevFrame.addEventListener('click', () => stepFrame(-1));
    btnNextFrame.addEventListener('click', () => stepFrame(1));

    // =========================================================
    //  Labels helper: text + chevron-right (XSS-safe)
    // =========================================================
    function setChevronValue(el, text) {
        el.textContent = '';
        el.appendChild(document.createTextNode(text + ' '));
        const chevron = document.createElement('i');
        chevron.className = 'fa-solid fa-chevron-right';
        el.appendChild(chevron);
    }

    // =========================================================
    //  Playback speed & pitch preservation
    // =========================================================
    function speedDisplayName(speed) {
        return speed === 1 ? 'Нормальная (1x)' : `${parseFloat(speed.toFixed(2))}x`;
    }

    function setPlaybackSpeed(speed) {
        playbackSpeed = speed;
        video.playbackRate = speed;
        setChevronValue(currentSpeedLabel, speedDisplayName(speed));

        speedOptions.querySelectorAll('.settings-option').forEach((opt) => {
            const optSpeed = parseFloat(opt.getAttribute('data-speed'));
            opt.classList.toggle('active', Math.abs(optSpeed - speed) < 1e-9);
        });
    }

    speedOptions.addEventListener('click', (e) => {
        const option = e.target.closest('.settings-option');
        if (!option || !option.hasAttribute('data-speed')) return;
        const speed = parseFloat(option.getAttribute('data-speed'));
        if (isNaN(speed)) return;
        setPlaybackSpeed(speed);
        switchSettingsView(settingsMain);
    });

    btnApplyCustomSpeed.addEventListener('click', () => {
        const val = parseFloat(customSpeedInput.value);
        if (!isNaN(val) && val >= 0.1 && val <= 16) {
            setPlaybackSpeed(val);
            switchSettingsView(settingsMain);
        } else {
            showToast('Скорость должна быть от 0.1 до 16');
        }
    });

    pitchCheckbox.addEventListener('change', (e) => {
        video.preservesPitch = e.target.checked;
        if ('webkitPreservesPitch' in video) {
            video.webkitPreservesPitch = e.target.checked;
        }
    });

    // =========================================================
    //  Loop (repeat)
    // =========================================================
    loopCheckbox.addEventListener('change', (e) => {
        isLooping = e.target.checked;
        video.loop = isLooping;
    });

    // =========================================================
    //  Quality selection & multi-quality files
    // =========================================================
    function updateQualityUI() {
        const keys = Object.keys(qualitySources);
        qualityOptions.innerHTML = '';
        if (keys.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'settings-option';
            empty.textContent = 'Нет источников';
            empty.style.cursor = 'default';
            qualityOptions.appendChild(empty);
        }
        keys.forEach((key) => {
            const opt = document.createElement('div');
            opt.className = 'settings-option' + (key === currentQualityKey ? ' active' : '');
            opt.setAttribute('data-quality', key);
            opt.textContent = key === 'original' ? 'Исходное (Original)' : key;
            opt.addEventListener('click', () => {
                switchQuality(key);
                switchSettingsView(settingsMain);
            });
            qualityOptions.appendChild(opt);
        });
        setChevronValue(currentQualityLabel, currentQualityKey === 'original' ? 'Исходное' : currentQualityKey);
    }

    function switchQuality(qualityKey) {
        if (!qualitySources[qualityKey] || qualityKey === currentQualityKey) return;
        pendingSeekTime = video.currentTime;
        wasPlayingBeforeQualitySwitch = !video.paused;
        currentQualityKey = qualityKey;
        video.src = qualitySources[qualityKey];
        video.load();
        if (wasPlayingBeforeQualitySwitch) {
            video.play().catch(() => updatePlayPauseButton(false));
        }
        updateQualityUI();
    }

    document.querySelector('[data-action="add-quality-file"]').addEventListener('click', () => {
        qualityFileInput.click();
    });

    qualityFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;

        // Auto-detect the resolution instead of asking the user to type it
        const probeUrl = URL.createObjectURL(file);
        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.muted = true;
        probe.src = probeUrl;

        probe.addEventListener('loadedmetadata', () => {
            const h = probe.videoHeight;
            const key = h ? `${h}p` : `Файл ${Object.keys(qualitySources).length + 1}`;
            qualitySources[key] = probeUrl; // keep it, the element is only a probe
            updateQualityUI();
            showToast(`Файл качества ${key} добавлен`);
            probe.removeAttribute('src');
        });

        probe.addEventListener('error', () => {
            try { URL.revokeObjectURL(probeUrl); } catch (_) { /* ignore */ }
            showToast('Не удалось прочитать видеофайл');
        });
    });

    // =========================================================
    //  Subtitles (.srt / .vtt parsing)
    // =========================================================
    function parseTimestamp(timeStr) {
        const cleaned = timeStr.trim().replace(',', '.');
        const parts = cleaned.split(':');
        const toSeconds = (p) => parseFloat(p) || 0;
        if (parts.length === 3) {
            return toSeconds(parts[0]) * 3600 + toSeconds(parts[1]) * 60 + toSeconds(parts[2]);
        }
        if (parts.length === 2) {
            return toSeconds(parts[0]) * 60 + toSeconds(parts[1]);
        }
        return 0;
    }

    function stripSubtitleMarkup(text) {
        return text
            .replace(/<[^>]*>/g, '')          // VTT voice/style tags
            .replace(/\{[^}]*\}/g, '')         // ASS-style overrides, just in case
            .trim();
    }

    function parseVTT(text) {
        const cues = [];
        const normalized = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
        const lines = normalized.split('\n');
        let i = 0;

        if (lines[i] && lines[i].trim().toUpperCase().startsWith('WEBVTT')) {
            i++;
        }

        while (i < lines.length) {
            while (i < lines.length && lines[i].trim() === '') i++;
            if (i >= lines.length) break;

            // Optional cue identifier line before the timestamp line
            if (!lines[i].includes('-->') && i + 1 < lines.length && lines[i + 1].includes('-->')) {
                i++;
            }

            if (i < lines.length && lines[i].includes('-->')) {
                const parts = lines[i].split('-->');
                const start = parseTimestamp(parts[0]);
                const end = parseTimestamp((parts[1] || '').trim().split(/\s+/)[0]);
                i++;

                let cueText = '';
                while (i < lines.length && lines[i].trim() !== '') {
                    cueText += (cueText ? '\n' : '') + lines[i].trim();
                    i++;
                }
                cueText = stripSubtitleMarkup(cueText);

                if (isFinite(start) && isFinite(end) && end >= start && cueText) {
                    cues.push({ start, end, text: cueText });
                }
            } else {
                i++;
            }
        }
        return cues;
    }

    function parseSRT(text) {
        // SRT uses "," as the millisecond separator — normalize then reuse the VTT parser
        const normalized = text.replace(/(\d{1,2}:\d{2}:\d{2}),(\d{1,3})/g, '$1.$2');
        return parseVTT(normalized);
    }

    function loadSubtitleFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = String(e.target.result || '');
            const isSrt = /\.srt$/i.test(file.name);
            const cues = isSrt ? parseSRT(content) : parseVTT(content);

            if (cues.length === 0) {
                showToast('Не удалось распознать субтитры в файле');
                return;
            }

            const trackId = 'sub_' + Date.now();
            subtitleTracks.push({ id: trackId, name: file.name, cues });
            updateSubtitlesMenu();
            selectSubtitleTrack(trackId);
            showToast(`Субтитры «${file.name}» загружены (${cues.length} реплик)`);
        };
        reader.onerror = () => showToast('Не удалось прочитать файл субтитров');
        reader.readAsText(file);
    }

    subFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) loadSubtitleFile(file);
        e.target.value = '';
    });

    function updateSubtitlesMenu() {
        subtitlesOptionsList.innerHTML = '';

        const offOption = document.createElement('div');
        offOption.className = 'settings-option' + (currentSubtitleTrackId === 'off' ? ' active' : '');
        offOption.setAttribute('data-sub', 'off');
        offOption.textContent = 'Выключены';
        subtitlesOptionsList.appendChild(offOption);

        subtitleTracks.forEach((track) => {
            const opt = document.createElement('div');
            opt.className = 'settings-option' + (track.id === currentSubtitleTrackId ? ' active' : '');
            opt.setAttribute('data-sub', track.id);
            opt.textContent = track.name;
            subtitlesOptionsList.appendChild(opt);
        });

        if (currentSubtitleTrackId === 'off') {
            setChevronValue(currentSubLabel, 'Выключены');
            ccIndicator.classList.remove('active');
        } else {
            const activeTrack = subtitleTracks.find((t) => t.id === currentSubtitleTrackId);
            setChevronValue(currentSubLabel, activeTrack ? activeTrack.name : 'Включены');
            ccIndicator.classList.add('active');
        }
    }

    function selectSubtitleTrack(trackId) {
        currentSubtitleTrackId = trackId;
        updateSubtitlesMenu();
        if (trackId === 'off') {
            subtitleOverlay.textContent = '';
        } else {
            updateSubtitles(video.currentTime || 0);
        }
    }

    subtitlesOptionsList.addEventListener('click', (e) => {
        const option = e.target.closest('.settings-option');
        if (!option) return;
        const subId = option.getAttribute('data-sub');
        selectSubtitleTrack(subId);
        switchSettingsView(settingsMain);
    });

    btnSubtitles.addEventListener('click', () => {
        if (subtitleTracks.length === 0) {
            // No subtitles yet — offer to load a file
            subFileInput.click();
            return;
        }
        if (currentSubtitleTrackId === 'off') {
            selectSubtitleTrack(subtitleTracks[subtitleTracks.length - 1].id);
        } else {
            selectSubtitleTrack('off');
        }
    });

    function updateSubtitles(currentTime) {
        if (currentSubtitleTrackId === 'off') {
            if (subtitleOverlay.textContent) subtitleOverlay.textContent = '';
            return;
        }
        const track = subtitleTracks.find((t) => t.id === currentSubtitleTrackId);
        if (!track) {
            subtitleOverlay.textContent = '';
            return;
        }
        const cue = track.cues.find((c) => currentTime >= c.start && currentTime <= c.end);
        const text = cue ? cue.text : '';
        if (subtitleOverlay.textContent !== text) {
            subtitleOverlay.textContent = text;
        }
    }

    // =========================================================
    //  Volume: slider, mute, boost
    // =========================================================
    function updateVolumeIcon(vol) {
        if (isMuted || vol === 0) {
            volumeIcon.className = 'fa-solid fa-volume-xmark';
        } else if (vol < 0.5) {
            volumeIcon.className = 'fa-solid fa-volume-low';
        } else {
            volumeIcon.className = 'fa-solid fa-volume-high';
        }
    }

    function setVolume(vol, { fromSlider = false } = {}) {
        const clamped = Math.max(0, Math.min(1, vol));
        video.volume = clamped;
        volumeSlider.value = String(Math.round(clamped * 100));
        isMuted = clamped === 0;
        applyBoostGain();
        updateVolumeIcon(clamped);
    }

    volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        if (val > 0) isMuted = false;
        setVolume(val, { fromSlider: true });
    });

    btnMute.addEventListener('click', () => {
        if (isMuted || video.volume === 0) {
            isMuted = false;
            const restore = volumeBeforeMute > 0 ? volumeBeforeMute : 0.5;
            setVolume(restore);
        } else {
            volumeBeforeMute = video.volume;
            isMuted = true;
            video.volume = 0;
            volumeSlider.value = '0';
            applyBoostGain();
            updateVolumeIcon(0);
        }
    });

    btnVolumeBoost.addEventListener('click', () => {
        if (!initWebAudio()) {
            showToast('Усиление звука не поддерживается в этом браузере');
            return;
        }
        resumeAudioContext();
        isBoosted = !isBoosted;
        btnVolumeBoost.classList.toggle('active', isBoosted);
        applyBoostGain();
        showToast(isBoosted ? 'Усиление звука включено (до 200%)' : 'Усиление звука выключено');
    });

    // =========================================================
    //  Picture-in-picture
    // =========================================================
    btnPip.addEventListener('click', async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                return;
            }
            if (document.pictureInPictureEnabled && video.src) {
                await video.requestPictureInPicture();
            } else {
                showToast('Картинка в картинке недоступна в этом браузере');
            }
        } catch (err) {
            console.error('PiP error:', err);
            showToast('Не удалось открыть режим «картинка в картинке»');
        }
    });

    // =========================================================
    //  Theater mode
    // =========================================================
    btnTheater.addEventListener('click', () => {
        isTheater = !isTheater;
        playerWrapper.classList.toggle('theater-mode', isTheater);
        btnTheater.classList.toggle('active', isTheater);
        btnTheater.setAttribute('aria-pressed', isTheater ? 'true' : 'false');
        btnTheater.title = isTheater ? 'Обычный режим (T)' : 'Режим кинотеатра (T)';
    });

    // =========================================================
    //  Fullscreen (on the player wrapper)
    // =========================================================
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (playerWrapper.requestFullscreen) {
                playerWrapper.requestFullscreen().catch((err) => {
                    console.error('Fullscreen error:', err);
                    showToast('Не удалось войти в полноэкранный режим');
                });
            }
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }

    btnFullscreen.addEventListener('click', toggleFullscreen);

    document.addEventListener('fullscreenchange', () => {
        const isFullscreen = !!document.fullscreenElement;
        fullscreenIcon.className = isFullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
        btnFullscreen.title = isFullscreen ? 'Выйти из полноэкранного режима (F)' : 'На весь экран (F)';
    });

    // =========================================================
    //  Settings menu toggle & navigation
    // =========================================================
    function openSettingsMenu(open) {
        settingsMenu.classList.toggle('hidden', !open);
        btnSettings.classList.toggle('active', open);
        if (open) {
            clearTimeout(controlsTimeout);
            playerWrapper.classList.remove('hide-controls');
            switchSettingsView(settingsMain);
        } else {
            scheduleControlsHide();
        }
    }

    btnSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        openSettingsMenu(settingsMenu.classList.contains('hidden'));
    });

    document.addEventListener('click', (e) => {
        if (!settingsMenu.classList.contains('hidden') &&
            !settingsMenu.contains(e.target) &&
            !btnSettings.contains(e.target)) {
            openSettingsMenu(false);
        }
    });

    function switchSettingsView(viewElement) {
        settingsMenu.querySelectorAll('.settings-view').forEach((v) => v.classList.add('hidden'));
        viewElement.classList.remove('hidden');
    }

    settingsMenu.querySelectorAll('.settings-item[data-action]').forEach((item) => {
        item.addEventListener('click', () => {
            const action = item.getAttribute('data-action');
            if (action === 'speed') switchSettingsView(settingsSpeed);
            else if (action === 'quality') switchSettingsView(settingsQuality);
            else if (action === 'subtitles-menu') switchSettingsView(settingsSubtitlesMenu);
        });
    });

    settingsMenu.querySelectorAll('.back-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.getAttribute('data-back'));
            if (target) switchSettingsView(target);
        });
    });

    // =========================================================
    //  Keyboard shortcuts (YouTube-compatible)
    // =========================================================
    function isTypingTarget(el) {
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }

    window.addEventListener('keydown', (e) => {
        if (isTypingTarget(document.activeElement)) return;

        const key = e.key;
        const lower = key.toLowerCase();

        if (key === 'Escape') {
            // Hide the settings menu if it is open (Fullscreen exit is handled natively by the browser)
            if (!settingsMenu.classList.contains('hidden')) {
                openSettingsMenu(false);
                e.preventDefault();
            }
            return;
        }

        if (key === ' ' || lower === 'k') {
            e.preventDefault();
            togglePlayPause();
        } else if (lower === 'f') {
            e.preventDefault();
            toggleFullscreen();
        } else if (lower === 't') {
            e.preventDefault();
            btnTheater.click();
        } else if (lower === 'm') {
            e.preventDefault();
            btnMute.click();
        } else if (lower === 'c') {
            e.preventDefault();
            btnSubtitles.click();
        } else if (lower === 'p') {
            e.preventDefault();
            btnPip.click();
        } else if (key === 'ArrowRight') {
            e.preventDefault();
            skipTime(5);
        } else if (key === 'ArrowLeft') {
            e.preventDefault();
            skipTime(-5);
        } else if (lower === 'l') {
            e.preventDefault();
            skipTime(10);
        } else if (lower === 'j') {
            e.preventDefault();
            skipTime(-10);
        } else if (key === 'ArrowUp') {
            e.preventDefault();
            setVolume(video.volume + 0.05);
            if (isMuted && video.volume > 0) isMuted = false;
        } else if (key === 'ArrowDown') {
            e.preventDefault();
            setVolume(video.volume - 0.05);
        } else if (key === 'Home') {
            if (hasDuration()) { e.preventDefault(); video.currentTime = 0; }
        } else if (key === 'End') {
            if (hasDuration()) { e.preventDefault(); video.currentTime = video.duration; }
        } else if (key >= '0' && key <= '9') {
            if (hasDuration()) {
                e.preventDefault();
                video.currentTime = (parseInt(key, 10) / 10) * video.duration;
            }
        } else if (key === ',' || key === '<') {
            e.preventDefault();
            stepFrame(-1);
        } else if (key === '.' || key === '>') {
            e.preventDefault();
            stepFrame(1);
        }
    });

    // =========================================================
    //  Initial UI state
    // =========================================================
    applyPlayerStyle('youtube');
    updateQualityUI();
    updateSubtitlesMenu();
    setVolume(1);
    setSoundDiskSpinning(false);
});
