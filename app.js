/**
 * WatchMyVideo — local video player in YouTube / Плеер / TikTok styles.
 * Vanilla JS, no dependencies. Everything works offline (FontAwesome is vendored locally).
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const $ = (id) => document.getElementById(id);

    // ---- DOM references ----
    const welcomeScreen = $('welcome-screen');
    const dropzone = $('dropzone');
    const appShell = $('app-shell');
    const playerWrapper = $('player-wrapper');
    const video = $('video-element');
    const loadingSpinner = $('loading-spinner');
    const doubleTapIndicator = $('double-tap-indicator');
    const tapAnimationContent = $('tap-animation-content');
    const subtitleOverlay = $('subtitle-overlay');

    const centerFlash = $('center-flash');
    const centerFlashIcon = $('center-flash-icon');
    const replayOverlay = $('replay-overlay');
    const btnReplay = $('btn-replay');

    const videoFileInput = $('video-file-input');
    const subFileInput = $('sub-file-input');
    const tkVolumeSlider = $('tk-volume-slider');
    const tkVolumeValue = $('tk-sheet-volume-value');
    const btnCloseVideoHeader = $('btn-close-header');
    const audioCover = $('audio-cover');
    let coverIsGenerated = false; // only generated artwork is copy-protected
    if (audioCover) {
        audioCover.setAttribute('draggable', 'false');
        audioCover.addEventListener('contextmenu', (e) => {
            if (coverIsGenerated) e.preventDefault(); // «Сохранить картинку» would expose the generated art
        });
    }
    const qualityCanvasEl = $('quality-canvas');
    const btnLoopToggle = $('btn-loop-toggle');
    const btnAutoplay = $('btn-autoplay');
    const btnScreenshot = $('btn-screenshot');
    const settingsQualityBadge = $('settings-quality-badge');
    const studioLightCheckbox = $('studio-light-checkbox');
    const seekPreview = $('seek-preview');
    const seekPreviewCanvas = $('seek-preview-canvas');
    const ambientCanvas = $('ambient-canvas');
    const ambientHalo = $('ambient-halo');
    const qualityCanvas = $('quality-canvas');
    let qualityCtx = null;   // created lazily, only for the non-WebGL fallback

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
    const loopCheckbox = null; // removed — loop lives in the repeat button
    const speedSlider = $('speed-slider');
    const speedSliderValue = $('speed-slider-value');
    const speedDecrease = $('speed-decrease');
    const speedIncrease = $('speed-increase');
    const speedPresets = $('speed-presets');
    const qualityOptions = $('quality-options');
    const subtitlesOptionsList = $('subtitles-options-list');

    // YouTube chrome
    const searchInput = $('search-input');
    const searchBtn = $('search-btn');
    const searchClear = $('search-clear');
    const ytTitle = $('yt-title');
    const ytAvatar = $('yt-avatar');
    const ytChannelCount = $('yt-channel-count');
    const btnSubscribe = $('btn-subscribe');
    const btnLike = $('btn-like');
    const btnDislike = $('btn-dislike');
    const likeCountEl = $('like-count');
    const btnShareYt = $('btn-share-yt');
    const btnDownload = $('btn-download');
    const btnSave = $('btn-save');
    const saveIcon = $('save-icon');
    const saveLabel = $('save-label');
    const ytDescription = $('yt-description');
    const ytDescriptionText = $('yt-description-text');
    const ytDescriptionMore = $('yt-description-more');
    const ytCommentCount = $('yt-comment-count');
    const ytCommentForm = $('yt-comment-form');
    const ytCommentInput = $('yt-comment-input');
    const ytCommentList = $('yt-comment-list');
    const suggestList = $('suggest-list');

    // TikTok chrome
    const tkAvatar = $('tk-avatar');
    const tkFollow = $('tk-follow');
    const tkFollowIcon = $('tk-follow-icon');
    const tkLike = $('tk-like');
    const tkLikeCount = $('tk-like-count');
    const tkCommentCount = $('tk-comment-count');
    const tkSave = $('tk-save');
    const tkSaveIcon = $('tk-save-icon');
    const tkSaveLabel = $('tk-save-label');
    const tkShare = $('tk-share');
    const tkAuthor = $('tk-author');
    const tkDesc = $('tk-desc');
    const tkMusicText = $('tk-music-text');
    const tkComments = $('tk-comments');
    const tkDrawer = $('tk-drawer');
    const tkBackdrop = $('tk-backdrop');
    const tkDrawerClose = $('tk-drawer-close');
    const tkDrawerCount = $('tk-drawer-count');
    const tkCommentForm = $('tk-comment-form');
    const tkCommentInput = $('tk-comment-input');
    const tkCommentList = $('tk-comment-list');

    // Misc
    const toastEl = $('toast');
    const thumbVideo = $('thumb-video');
    const seekThumbVideo = $('seek-thumb-video');
    const modePillButtons = Array.from(document.querySelectorAll('.mode-pill-btn'));

    // ---- State ----
    const IDLE_DELAY_MS = 1600;
    const ESTIMATED_FPS = 30;

    let isTheater = false;
    let currentIsAudio = false;
    let autoplayOn = storageGet('wmv_autoplay', '0') === '1';
    let seekPreviewEnabled = storageGet('wmv_seek_preview', '1') === '1';
    let studioLight = storageGet('wmv_studio_light', '0') === '1';
    let isMuted = false;
    let volumeBeforeMute = 1;
    let isBoosted = false;
    let playbackSpeed = 1;
    let isLooping = false;
    let currentMode = 'youtube'; // 'player' | 'youtube' | 'tiktok'
    let idleTimer = null;
    let isDraggingProgress = false;
    let currentVideoKey = null;
    let currentFileName = '';
    let currentFileSize = 0;
    let currentFileCreated = null; // ms epoch — the file's own mtime, null for session restores
    let currentFileUrl = null; // object URL (session-scoped)
    let pendingSeekTime = null;

    // Web Audio — created lazily ONLY when the user enables boost
    let audioCtx = null;
    let sourceNode = null;
    let gainNode = null;

    // Quality management — the site renders low tiers itself via a canvas
    const QUALITY_LADDER = [144, 240, 360, 480, 720, 1080, 1440, 2160];  // standard tiers only
    const QUALITY_ARTIFICIAL_DOWN = [144, 240, 360, 480, 720, 1080, 1440]; // below-source rungs we synthesize
    const QUALITY_ARTIFICIAL_UP = [1440, 2160];                            // upscale tiers offered when missing
    let availableQualities = [{ key: 'original', label: '0', height: 0, original: true }];
    let currentQualityKey = 'original';
    let qualityProxyOn = false;

    // Subtitles
    let subtitleTracks = [];
    let currentSubtitleTrackId = 'off';

    // Suggestions feed (session-scoped)
    let recentVideos = [];

    // =========================================================
    //  Storage helpers (localStorage, private-mode safe)
    // =========================================================
    function stripExtension(name) {
        return String(name || '').replace(/\.(mp4|webm|mkv|mov|avi|ogv|m4v|mp3|wav|flac|ogg|m4a|aac)$/i, '');
    }

    function storageGet(key, fallback = null) {
        try {
            const v = localStorage.getItem(key);
            return v === null ? fallback : v;
        } catch (_) {
            return fallback;
        }
    }

    function storageSet(key, value) {
        try {
            localStorage.setItem(key, String(value));
        } catch (_) { /* storage unavailable */ }
    }

    function storageGetJSON(key, fallback) {
        try {
            const v = localStorage.getItem(key);
            return v ? JSON.parse(v) : fallback;
        } catch (_) {
            return fallback;
        }
    }

    function storageSetJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (_) { /* storage unavailable / quota */ }
    }

    const likeCountKey = (k) => `wmv_like_count_${k}`;
    const likedKey = (k) => `wmv_liked_${k}`;
    const dislikedKey = (k) => `wmv_disliked_${k}`;
    const savedKey = (k) => `wmv_saved_${k}`;
    const commentsKey = (k) => `wmv_comments_${k}`;
    const SUBSCRIBED_KEY = 'wmv_subscribed';
    const MODE_KEY = 'wmv_mode';

    // =========================================================
    //  Toast
    // =========================================================
    let toastTimer = null;
    function showToast(message, duration = 3200) {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
    }

    function formatCount(n) {
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(n);
    }

    function formatBytes(bytes) {
        if (!isFinite(bytes) || bytes <= 0) return '';
        const units = ['Б', 'КБ', 'МБ', 'ГБ'];
        let value = bytes;
        let unit = 0;
        while (value >= 1024 && unit < units.length - 1) {
            value /= 1024;
            unit++;
        }
        return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
    }

    function timeAgo(ts) {
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'только что';
        if (mins < 60) return `${mins} мин назад`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} ч назад`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} д назад`;
        return new Date(ts).toLocaleDateString('ru-RU');
    }

    function slugify(name) {
        const base = String(name).replace(/\.[^.]+$/, '').toLowerCase();
        const slug = base.replace(/[^a-z0-9а-яё_]+/gi, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24);
        return slug || 'local';
    }

    function hueFromString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) | 0;
        }
        return Math.abs(hash) % 360;
    }

    // =========================================================
    //  Web Audio — volume boost (lazy graph so the normal path
    //  always uses the element's native volume control)
    // =========================================================
    function ensureBoostGraph() {
        if (audioCtx) return true;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return false;
            audioCtx = new AudioContext();
            sourceNode = audioCtx.createMediaElementSource(video);
            gainNode = audioCtx.createGain();
            gainNode.gain.value = isBoosted ? 2.0 : 1.0;
            sourceNode.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            return true;
        } catch (e) {
            console.warn('Web Audio boost init failed:', e);
            audioCtx = null;
            gainNode = null;
            return false;
        }
    }

    function resumeAudioContext() {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
    }

    function applyBoostGain() {
        if (gainNode) {
            gainNode.gain.value = isBoosted ? 2.0 : 1.0;
        }
    }

    // =========================================================
    //  Idle manager — hide chrome when the mouse goes quiet
    // =========================================================
    // tkShareSheet is declared later (share-sheet section) — reference lazily.
    const isShareSheetOpen = () => {
        const el = document.getElementById('tk-share-sheet');
        return !!(el && el.classList.contains('open'));
    };

    function isOverlayOpen() {
        return !settingsMenu.classList.contains('hidden') ||
               document.body.classList.contains('tk-drawer-open') ||
               isShareSheetOpen();
    }

    function clearIdle() {
        clearTimeout(idleTimer);
        if (document.body.classList.contains('idle')) {
            document.body.classList.remove('idle');
        }
    }

    function scheduleIdle() {
        clearTimeout(idleTimer);
        if (isOverlayOpen() || isDraggingProgress) {
            return;
        }
        idleTimer = setTimeout(() => {
            if (!isOverlayOpen() && !isDraggingProgress) {
                document.body.classList.add('idle');
            }
        }, IDLE_DELAY_MS);
    }

    function pokeUI() {
        clearIdle();
        clearTimeout(chromeHideTimer);
        document.body.classList.remove('idle');
        scheduleIdle();
    }

    function closeSettingsMenuIfOpen() {
        if (!settingsMenu.classList.contains('hidden')) {
            settingsMenu.classList.add('hidden');
            btnSettings.classList.remove('active');
            const gear = document.getElementById('settings-gear-icon');
            if (gear) gear.classList.remove('gear-open');
        }
        closeShareSheet();
    }

    playerWrapper.addEventListener('mouseenter', () => pokeUI());
    let chromeHideTimer = 0;
    // Cursor left the player area — hide the chrome shortly after,
    // even when paused. The settings menu stays open. Moving straight onto
    // the floating header / menus cancels the hide (they're part of the UI).
    function scheduleChromeHide(delay = 160) {
        clearTimeout(chromeHideTimer);
        chromeHideTimer = window.setTimeout(() => {
            if (!isOverlayOpen() && !isDraggingProgress) {
                document.body.classList.add('idle');
            }
        }, delay);
    }
    playerWrapper.addEventListener('mouseleave', (e) => {
        clearIdle();
        const t = e.relatedTarget;
        if (t instanceof Element && t.closest('.app-header, .settings-menu, .tk-share-sheet, .seek-preview')) {
            pokeUI();
            return;
        }
        scheduleChromeHide(160);
    });
    // Only un-hide the chrome when the pointer is actually over the player
    // (or something floating inside/above it — menus, sheets, seek preview).
    // Moving over the info area below/beside the video must NOT bring it back.
    const CHROME_HOVER_ZONE = '#player-wrapper, .settings-menu, .tk-share-sheet, .tk-sheet-backdrop, .seek-preview, .app-header';
    const appHeaderEl = document.getElementById('app-header');
    const headerBand = () => {
        if (!appHeaderEl) return null;
        const r = appHeaderEl.getBoundingClientRect();
        return { left: r.left, right: r.right, bottom: r.bottom };
    };
    document.addEventListener('mousemove', (e) => {
        if (e.target instanceof Element && e.target.closest(CHROME_HOVER_ZONE)) {
            pokeUI();
            return;
        }
        // Header is click-through while idle (opacity 0) — reveal the chrome
        // as soon as the pointer enters its band, wherever along the width.
        const hb = headerBand();
        if (hb && e.clientY <= hb.bottom && e.clientX >= hb.left && e.clientX <= hb.right) {
            pokeUI();
        }
    }, { passive: true });
    document.addEventListener('wheel', pokeUI, { passive: true });
    ['mousedown', 'touchstart', 'keydown'].forEach((evt) => {
        document.addEventListener(evt, pokeUI, { passive: true });
    });
    document.addEventListener('mouseleave', () => {
        if (!isOverlayOpen()) {
            document.body.classList.add('idle');
        }
    });

    // =========================================================
    //  Player modes: Плеер / YouTube / TikTok
    // =========================================================
    function setMode(mode, { persist = true } = {}) {
        if (!['player', 'youtube', 'tiktok'].includes(mode)) mode = 'youtube';
        currentMode = mode;
        document.body.classList.remove('mode-player', 'mode-youtube', 'mode-tiktok');
        document.body.classList.add('mode-' + mode);
        modePillButtons.forEach((btn) => {
            const active = btn.getAttribute('data-mode') === mode;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        if (mode !== 'tiktok') {
            closeCommentsDrawer();
            closeShareSheet();
        }
        applyLoopForMode();
        if (persist) storageSet(MODE_KEY, mode);
        pokeUI();
    }

    modePillButtons.forEach((btn) => {
        btn.addEventListener('click', () => setMode(btn.getAttribute('data-mode')));
    });

    // =========================================================
    //  Loading videos (file input / drag & drop)
    // =========================================================
    function isAudioFile(file) {
        return (file.type && file.type.startsWith('audio/')) || /\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(file.name || '');
    }

    function startPlaybackSession(sourceUrl, videoKey, fileName, fileSize, opts = {}) {
        stopQualityProxy();
        qualitiesComputed = false;
        resetFpsSampler();
        currentQualityKey = 'original';
        leaveSheetMode();
        if (settingsMenu) settingsMenu.classList.add('hidden');
        currentVideoKey = videoKey;
        currentFileUrl = sourceUrl;
        currentFileName = fileName || 'Видео';
        currentFileSize = fileSize || 0;
        currentFileCreated = opts.created || null;
        currentIsAudio = !!opts.audio;

        video.src = sourceUrl;
        video.load();
        if (seekThumbVideo) {
            try { seekThumbVideo.src = sourceUrl; } catch (_) { /* keep old source */ }
        }
        // Spec: load() resets playbackRate -> defaultPlaybackRate, so set both
        video.defaultPlaybackRate = playbackSpeed;
        video.playbackRate = playbackSpeed;
        video.loop = isLooping;

        welcomeScreen.classList.add('hidden');
        appShell.classList.remove('hidden');
        replayOverlay.classList.add('hidden');
        playerWrapper.classList.remove('video-ended');
        playerWrapper.classList.toggle('audio-mode', currentIsAudio);
        document.body.classList.add('video-active');
        document.body.classList.toggle('is-audio', currentIsAudio);
        // A fresh video must never inherit the previous progress state.
        progressPlayed.style.width = '0%';
        progressBuffered.style.width = '0%';
        progressScrubber.style.left = '0%';
        progressContainer.setAttribute('aria-valuenow', '0');
        currentTimeEl.textContent = '0:00';
        durationEl.textContent = '0:00';
        if (audioCover) {
            if (currentIsAudio) {
                if (opts.coverUrl) {
                    audioCover.src = opts.coverUrl;
                    coverIsGenerated = false;
                } else {
                    audioCover.src = generateAudioCover(stripExtension(currentFileName) || 'Аудио');
                    coverIsGenerated = true;
                }
                audioCover.alt = stripExtension(currentFileName) || 'Обложка трека';
                audioCover.draggable = false;
                audioCover.classList.remove('hidden');
                if (studioLight && ambientCanvas) paintAmbientFrame();
            } else {
                audioCover.removeAttribute('src');
                audioCover.classList.add('hidden');
            }
        }

        // Autoplay only when the switch is on — otherwise wait for a click.
        applyLoopForMode();
        if (autoplayOn) {
            // Try immediately, and again once data is ready — the browser
            // decides whether the gesture/autoplay policy allows it.
            const tryPlay = () => { return video.play().then(() => true).catch(err => { console.warn('autoplay blocked:', err.name, err.message); return false; }); };
            let played = false;
            tryPlay().then(ok => { played = ok; });
            video.addEventListener('loadedmetadata', () => { tryPlay().then(ok => { played = played || ok; }); }, { once: true });
            video.addEventListener('canplay', () => { tryPlay(); }, { once: true });
        } else {
            video.pause();
            updatePlayPauseButton(false);
        }

        updateQualityUI();
        refreshVideoInfo();
        refreshSocialUI();
        renderComments();
        pokeUI();
        window.scrollTo({ top: 0 });
    }

    function loadVideoFromFile(file) {
        if (!file) return;
        const audio = isAudioFile(file);
        const looksLikeVideo = (file.type && file.type.startsWith('video/')) || /\.(mkv|avi|mov|webm|mp4|ogv|m4v)$/i.test(file.name);
        if (!audio && !looksLikeVideo) {
            showToast('Пожалуйста, выберите видео- или аудиофайл');
            return;
        }
        const url = URL.createObjectURL(file);
        const key = `file:${file.name}:${file.size}`;
        registerRecentVideo({ key, title: stripExtension(file.name), url, isDemo: false, size: file.size, created: file.lastModified || null });
        if (audio) {
            // Try to pull embedded cover art (ID3 APIC); fall back to a generated cover.
            extractEmbeddedCover(file).then((blob) => {
                startPlaybackSession(url, key, file.name, file.size, { audio: true, coverUrl: blob ? URL.createObjectURL(blob) : null, created: file.lastModified || null });
            }).catch(() => {
                startPlaybackSession(url, key, file.name, file.size, { audio: true, coverUrl: null, created: file.lastModified || null });
            });
        } else {
            startPlaybackSession(url, key, file.name, file.size, { audio: false, created: file.lastModified || null });
        }
    }

    videoFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) loadVideoFromFile(file);
        e.target.value = '';
    });

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

    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file && ((file.type && (file.type.startsWith('video/') || file.type.startsWith('audio/'))) || /\.(mkv|avi|mov|webm|mp4|ogv|m4v|mp3|wav|flac|ogg|m4a|aac)$/i.test(file.name))) {
            loadVideoFromFile(file);
        }
    });

    // =========================================================
    //  Close current video — back to the dropzone
    // =========================================================
    function closeCurrentVideo() {
        video.pause();
        stopQualityProxy();
        resetTheater();
        video.removeAttribute('src');
        video.load();
        currentVideoKey = null;
        currentFileUrl = null;
        currentFileName = '';
        currentFileSize = 0;
        currentFileCreated = null;
        pendingSeekTime = null;
        qualitiesComputed = false;
        currentQualityKey = 'original';
        availableQualities = [{ key: 'original', label: '0', height: 0, original: true }];

        subtitleTracks = [];
        currentSubtitleTrackId = 'off';
        updateSubtitlesMenu();
        subtitleOverlay.textContent = '';

        clearSleepTimer();
        currentIsAudio = false;
        playerWrapper.classList.remove('audio-mode', 'video-ended', 'scrubbing');
        document.body.classList.remove('video-active', 'is-audio');
        if (audioCover) {
            audioCover.classList.add('hidden');
            audioCover.removeAttribute('src');
        }
        updateCloseButtonsVisibility();
        currentTimeEl.textContent = '0:00';
        durationEl.textContent = '0:00';
        progressPlayed.style.width = '0%';
        progressScrubber.style.left = '0%';
        progressBuffered.style.width = '0%';
        progressContainer.setAttribute('aria-valuenow', '0');
        loadingSpinner.classList.add('hidden');
        replayOverlay.classList.add('hidden');

        playerWrapper.style.removeProperty('--video-ar');
        playerWrapper.style.removeProperty('--video-ar-num');
        document.body.classList.remove('idle');
        document.title = 'WatchMyVideo';
        welcomeScreen.classList.remove('hidden');
        appShell.classList.add('hidden');
        updateQualityUI();
        pokeUI();
        showToast('Видео закрыто');
    }

    if (btnCloseVideoHeader) btnCloseVideoHeader.addEventListener('click', closeCurrentVideo);

    // =========================================================
    //  Suggestions feed ("Похожие видео")
    // =========================================================
    function registerRecentVideo(entry) {
        const existing = recentVideos.findIndex((v) => v.key === entry.key);
        if (existing !== -1) {
            recentVideos.splice(existing, 1);
        }
        recentVideos.unshift(entry);
        entry.hue = hueFromString(entry.title);
        entry.thumb = null;
        entry.durationLabel = '';
        captureThumbnail(entry).catch(() => { /* keep gradient placeholder */ });
        renderSuggestions();
        updateChannelCount();
    }

    function updateChannelCount() {
        ytChannelCount.textContent = String(recentVideos.length);
    }

    function currentQuery() {
        return (searchInput.value || '').trim().toLowerCase();
    }

    function filteredVideos() {
        const q = currentQuery();
        if (!q) return recentVideos;
        return recentVideos.filter((v) => v.title.toLowerCase().includes(q));
    }

    function renderSuggestions() {
        const items = filteredVideos();
        suggestList.innerHTML = '';
        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'suggest-empty';
            empty.textContent = currentQuery()
                ? `По запросу «${currentQuery()}» ничего не найдено — откройте больше локальных видео.`
                : 'Здесь появятся ваши видео. Откройте файл — и он появится в ленте.';
            suggestList.appendChild(empty);
            return;
        }
        items.forEach((v) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'suggest-item' + (v.key === currentVideoKey ? ' active' : '');
            item.title = stripExtension(v.title);

            const thumb = document.createElement('div');
            thumb.className = 'suggest-thumb';
            thumb.style.setProperty('--hue', String(v.hue || 0));
            if (v.thumb) {
                const img = document.createElement('img');
                img.src = v.thumb;
                img.alt = '';
                thumb.appendChild(img);
            } else {
                const icon = document.createElement('i');
                icon.className = 'fa-solid fa-film suggest-thumb-icon';
                thumb.appendChild(icon);
            }
            if (v.durationLabel) {
                const dur = document.createElement('span');
                dur.className = 'suggest-duration';
                dur.textContent = v.durationLabel;
                thumb.appendChild(dur);
            }

            const meta = document.createElement('div');
            meta.className = 'suggest-meta';
            const title = document.createElement('div');
            title.className = 'suggest-title';
            title.textContent = v.title;
            const sub = document.createElement('div');
            sub.className = 'suggest-sub';
            const sizePart = v.size ? formatBytes(v.size) : '';
            sub.textContent = v.isDemo
                ? 'WatchMyVideo · демо'
                : ['WatchMyVideo · локальный файл', sizePart].filter(Boolean).join(' · ');
            meta.appendChild(title);
            meta.appendChild(sub);

            item.appendChild(thumb);
            item.appendChild(meta);
            // Filter out legacy demo entries stored by earlier builds — the demo is gone.
            if (!v.isDemo) {
                item.addEventListener('click', () => {
                    startPlaybackSession(v.url, v.key, v.title, v.size, { created: v.created || null });
                });
            } else {
                item.remove();
                return;
            }
            suggestList.appendChild(item);
        });
    }

    function captureThumbnail(entry) {
        return new Promise((resolve, reject) => {
            let done = false;
            const finish = (err) => {
                if (done) return;
                done = true;
                clearTimeout(timeout);
                tv.removeEventListener('seeked', onSeeked);
                tv.removeEventListener('error', onError);
                tv.removeEventListener('loadedmetadata', onMeta);
                if (err) reject(err); else resolve();
            };
            const tv = thumbVideo;
            const onMeta = () => {
                const duration = isFinite(tv.duration) ? tv.duration : 0;
                entry.durationLabel = duration ? formatTime(duration) : '';
                const target = duration ? Math.min(Math.max(0.2, duration * 0.25), Math.max(0.2, duration - 0.1)) : 0.1;
                try {
                    tv.currentTime = target;
                } catch (e) {
                    finish(e);
                }
            };
            const onSeeked = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 320;
                    canvas.height = 180;
                    const ctx = canvas.getContext('2d');
                    const vw = tv.videoWidth;
                    const vh = tv.videoHeight;
                    if (!vw || !vh) {
                        finish(new Error('empty video size'));
                        return;
                    }
                    const scale = Math.max(320 / vw, 180 / vh);
                    const sw = vw * scale;
                    const sh = vh * scale;
                    ctx.drawImage(tv, (320 - sw) / 2, (180 - sh) / 2, sw, sh);
                    entry.thumb = canvas.toDataURL('image/jpeg', 0.7);
                    finish(null);
                    renderSuggestions();
                } catch (e) {
                    finish(e); // CORS-tainted canvas etc. — keep placeholder
                }
            };
            const onError = () => finish(new Error('thumbnail failed'));
            const timeout = setTimeout(() => finish(new Error('thumbnail timeout')), 8000);
            tv.addEventListener('loadedmetadata', onMeta);
            tv.addEventListener('seeked', onSeeked);
            tv.addEventListener('error', onError);
            tv.muted = true;
            tv.crossOrigin = 'anonymous';
            tv.src = entry.url;
        });
    }

    searchInput.addEventListener('input', () => {
        searchClear.classList.toggle('hidden', !searchInput.value);
        renderSuggestions();
    });
    searchBtn.addEventListener('click', () => {
        searchInput.focus();
        renderSuggestions();
    });
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.classList.add('hidden');
        renderSuggestions();
        searchInput.focus();
    });

    // =========================================================
    //  Video info block (title / description / channel)
    // =========================================================
    function refreshVideoInfo() {
        const displayName = stripExtension(currentFileName) || currentFileName;
        ytTitle.textContent = displayName;
        ytAvatar.textContent = (displayName[0] || 'W').toUpperCase();
        ytDescriptionText.textContent = buildDescription();
        document.title = `${displayName} - WatchMyVideo`;

        const handle = slugify(displayName);
        tkAvatar.textContent = (handle[0] || 'W').toUpperCase();
        tkAuthor.textContent = '@' + handle;
        tkDesc.textContent = displayName;
        const musicLine = `оригинальный звук — ${tkAuthor.textContent}`;
        const musicSep = '\u00A0\u00A0\u00A0•\u00A0\u00A0\u00A0';
        tkMusicText.textContent = musicLine + musicSep + musicLine + musicSep;
    }

    function buildDescription() {
        const parts = [];
        if (currentFileCreated) {
            try {
                parts.push('Создано: ' + new Date(currentFileCreated).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }));
            } catch (_) { /* unreadable mtime — skip the date */ }
        }
        if (currentFileSize) parts.push(formatBytes(currentFileSize));
        return parts.join('  ·  ');
    }

    // Flag for files that report an infinite duration until they are seeked once
    // (MediaRecorder, some camera streams). The synthetic seek used to discover
    // the real duration must not surface as a user-facing "ended" event or as a
    // playhead jump. `infiniteFixGuard` is a time-boxed deadline checked by the
    // 'ended' handler, independent of the one-shot `infiniteFixPending` flag used
    // by the timeupdate handler — either event may fire first.
    let infiniteFixPending = false;
    let infiniteFixGuard = 0;

    let qualitiesComputed = false;

    function afterMetadataReady() {
        if (video.videoWidth && video.videoHeight) {
            const ar = video.videoWidth / video.videoHeight;
            playerWrapper.style.setProperty('--video-ar', `${video.videoWidth} / ${video.videoHeight}`);
            playerWrapper.style.setProperty('--video-ar-num', String(ar));
        }
        durationEl.textContent = formatTime(video.duration);
        if (!qualitiesComputed) {
            qualitiesComputed = true;
            computeQualities();
            updateQualityUI();
        }
        ytDescriptionText.textContent = buildDescription();
        const active = recentVideos.find((v) => v.key === currentVideoKey);
        if (active) {
            active.durationLabel = formatTime(video.duration);
            renderSuggestions();
        }
        if (pendingSeekTime !== null) {
            const target = Math.min(pendingSeekTime, Math.max(0, (video.duration || pendingSeekTime) - 0.1));
            video.currentTime = target;
            pendingSeekTime = null;
        }
    }

    video.addEventListener('loadedmetadata', () => {
        // Files produced by MediaRecorder (and some streams) report an infinite
        // duration until the element is seeked once — nudge it past the end so
        // the browser can compute the real duration.
        if (!isFinite(video.duration) || video.duration === 0) {
            infiniteFixPending = true;
            infiniteFixGuard = Date.now() + 3000;
            try {
                video.currentTime = Number.MAX_SAFE_INTEGER;
            } catch (_) {
                infiniteFixPending = false;
                infiniteFixGuard = 0;
            }
            return;
        }
        afterMetadataReady();
    });

    ytDescription.addEventListener('click', () => {
        const expanded = ytDescription.getAttribute('aria-expanded') === 'true';
        ytDescription.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        ytDescriptionMore.textContent = expanded ? 'Ещё' : 'Свернуть';
    });

    // =========================================================
    //  Social actions: like / dislike / save / subscribe / share / download
    // =========================================================
    function readLikeState(key) {
        return {
            count: parseInt(storageGet(likeCountKey(key), '0'), 10) || 0,
            liked: storageGet(likedKey(key), '0') === '1',
            disliked: storageGet(dislikedKey(key), '0') === '1',
        };
    }

    function writeLikeState(key, state) {
        storageSet(likeCountKey(key), state.count);
        storageSet(likedKey(key), state.liked ? '1' : '0');
        storageSet(dislikedKey(key), state.disliked ? '1' : '0');
    }

    function refreshSocialUI() {
        const key = currentVideoKey;
        const liked = key ? readLikeState(key) : { count: 0, liked: false, disliked: false };
        const saved = key ? storageGet(savedKey(key), '0') === '1' : false;
        const subscribed = storageGet(SUBSCRIBED_KEY, '0') === '1';

        // YouTube buttons
        likeCountEl.textContent = formatCount(liked.count);
        btnLike.classList.toggle('toggled', liked.liked);
        btnLike.setAttribute('aria-pressed', liked.liked ? 'true' : 'false');
        btnDislike.classList.toggle('toggled', liked.disliked);
        btnDislike.setAttribute('aria-pressed', liked.disliked ? 'true' : 'false');
        btnSave.classList.toggle('toggled', saved);
        btnSave.setAttribute('aria-pressed', saved ? 'true' : 'false');
        saveIcon.className = (saved ? 'fa-solid' : 'fa-regular') + ' fa-bookmark';
        saveLabel.textContent = saved ? 'Сохранено' : 'Сохранить';
        btnSubscribe.classList.toggle('subscribed', subscribed);
        btnSubscribe.setAttribute('aria-pressed', subscribed ? 'true' : 'false');
        btnSubscribe.textContent = subscribed ? 'Вы подписались' : 'Подписаться';

        // TikTok rail
        tkLikeCount.textContent = formatCount(liked.count);
        tkLike.classList.toggle('toggled', liked.liked);
        tkLike.setAttribute('aria-pressed', liked.liked ? 'true' : 'false');
        tkSave.classList.toggle('saved', saved);
        tkSave.setAttribute('aria-pressed', saved ? 'true' : 'false');
        tkSaveIcon.className = (saved ? 'fa-solid' : 'fa-regular') + ' fa-bookmark';
        tkSaveLabel.textContent = saved ? 'Сохранено' : 'В избранное';
        tkFollow.classList.toggle('subscribed', subscribed);
        tkFollow.setAttribute('aria-pressed', subscribed ? 'true' : 'false');
        tkFollowIcon.className = subscribed ? 'fa-solid fa-check' : 'fa-solid fa-plus';
    }

    function toggleLike() {
        if (!currentVideoKey) return;
        const state = readLikeState(currentVideoKey);
        if (state.liked) {
            state.liked = false;
            state.count = Math.max(0, state.count - 1);
        } else {
            state.liked = true;
            state.count += 1;
            state.disliked = false;
        }
        writeLikeState(currentVideoKey, state);
        refreshSocialUI();
    }

    function toggleDislike() {
        if (!currentVideoKey) return;
        const state = readLikeState(currentVideoKey);
        if (state.disliked) {
            state.disliked = false;
        } else {
            state.disliked = true;
            if (state.liked) {
                state.liked = false;
                state.count = Math.max(0, state.count - 1);
            }
        }
        writeLikeState(currentVideoKey, state);
        refreshSocialUI();
    }

    function toggleSave() {
        if (!currentVideoKey) return;
        const saved = storageGet(savedKey(currentVideoKey), '0') === '1';
        storageSet(savedKey(currentVideoKey), saved ? '0' : '1');
        refreshSocialUI();
        showToast(saved ? 'Удалено из сохранённого' : 'Сохранено к вам');
    }

    let tkFollowHideTimer = 0;

    function toggleSubscribe() {
        const subscribed = storageGet(SUBSCRIBED_KEY, '0') === '1';
        const next = !subscribed;
        storageSet(SUBSCRIBED_KEY, next ? '1' : '0');
        refreshSocialUI();
        clearTimeout(tkFollowHideTimer);
        if (next) {
            tkFollowHideTimer = setTimeout(() => tkFollow.classList.add('follow-hidden'), 300);
        } else {
            tkFollow.classList.remove('follow-hidden');
        }
        showToast(next ? 'Вы подписались' : 'Вы отписались');
    }

    // Share / Download — requested inert stubs («заглушки»)
    function shareStub() {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(window.location.href).catch(() => {});
            }
        } catch (_) { /* clipboard unavailable — the toast still confirms */ }
        showToast('Ссылка скопирована');
    }

    function downloadStub() {
        showToast('Скачивание начнётся…', 1600);
        setTimeout(() => showToast('Загрузка завершена', 1800), 1700);
    }

    btnLike.addEventListener('click', toggleLike);
    btnDislike.addEventListener('click', toggleDislike);
    tkLike.addEventListener('click', toggleLike);
    btnShareYt.addEventListener('click', shareStub);
    btnSave.addEventListener('click', toggleSave);
    tkSave.addEventListener('click', toggleSave);
    btnSubscribe.addEventListener('click', toggleSubscribe);
    tkFollow.addEventListener('click', toggleSubscribe);

    btnDownload.addEventListener('click', downloadStub);

    // =========================================================
    //  Comments (YouTube section + TikTok drawer, shared storage)
    // =========================================================
    function getComments(key) {
        return storageGetJSON(commentsKey(key), []);
    }

    function setComments(key, comments) {
        storageSetJSON(commentsKey(key), comments);
    }

    function commentNode(comment, onDelete) {
        const item = document.createElement('div');
        item.className = 'yt-comment';

        const avatar = document.createElement('div');
        avatar.className = 'yt-comment-avatar';
        avatar.textContent = 'Я';

        const body = document.createElement('div');
        body.className = 'yt-comment-body';

        const meta = document.createElement('div');
        meta.className = 'yt-comment-meta';
        const name = document.createElement('span');
        name.className = 'yt-comment-name';
        name.textContent = 'Вы';
        const time = document.createElement('span');
        time.textContent = timeAgo(comment.ts);
        meta.appendChild(name);
        meta.appendChild(time);

        const text = document.createElement('div');
        text.className = 'yt-comment-text';
        text.textContent = comment.text;

        body.appendChild(meta);
        body.appendChild(text);
        item.appendChild(avatar);
        item.appendChild(body);

        if (onDelete) {
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'yt-comment-delete';
            del.title = 'Удалить комментарий';
            del.setAttribute('aria-label', 'Удалить комментарий');
            del.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            del.addEventListener('click', onDelete);
            item.appendChild(del);
        }
        return item;
    }

    function tkCommentNode(comment, onDelete) {
        const item = document.createElement('div');
        item.className = 'tk-comment';

        const avatar = document.createElement('div');
        avatar.className = 'tk-comment-avatar';
        avatar.textContent = 'Я';

        const body = document.createElement('div');
        body.className = 'tk-comment-body';

        const name = document.createElement('div');
        name.className = 'tk-comment-name';
        name.textContent = '@you';

        const text = document.createElement('div');
        text.className = 'tk-comment-text';
        text.textContent = comment.text;

        const meta = document.createElement('div');
        meta.className = 'tk-comment-meta';
        const time = document.createElement('span');
        time.textContent = timeAgo(comment.ts);
        const reply = document.createElement('button');
        reply.type = 'button';
        reply.className = 'tk-comment-reply';
        reply.textContent = 'Ответить';
        meta.appendChild(time);
        meta.appendChild(reply);

        body.appendChild(name);
        body.appendChild(text);
        body.appendChild(meta);
        item.appendChild(avatar);
        item.appendChild(body);

        const actions = document.createElement('div');
        actions.className = 'tk-comment-actions';
        actions.innerHTML = '<i class="fa-solid fa-heart"></i><span>0</span>';
        item.appendChild(actions);

        if (onDelete) {
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'tk-comment-delete';
            del.title = 'Удалить комментарий';
            del.setAttribute('aria-label', 'Удалить комментарий');
            del.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            del.addEventListener('click', onDelete);
            item.appendChild(del);
        }
        return item;
    }

    function renderComments() {
        const key = currentVideoKey;
        const comments = key ? getComments(key) : [];
        ytCommentCount.textContent = String(comments.length);
        tkCommentCount.textContent = String(comments.length);
        tkDrawerCount.textContent = String(comments.length);

        const renderInto = (container, withDelete, variant) => {
            container.innerHTML = '';
            if (comments.length === 0) {
                const empty = document.createElement('div');
                empty.className = variant === 'tk' ? 'tk-comment-empty' : 'yt-comment-empty';
                empty.textContent = 'Комментариев пока нет. Будьте первым!';
                container.appendChild(empty);
                return;
            }
            comments.slice().reverse().forEach((comment) => {
                const onDelete = () => {
                    const next = getComments(key).filter((c) => c.id !== comment.id);
                    setComments(key, next);
                    renderComments();
                };
                container.appendChild(variant === 'tk'
                    ? tkCommentNode(comment, withDelete ? onDelete : null)
                    : commentNode(comment, withDelete ? onDelete : null));
            });
        };

        renderInto(ytCommentList, true, 'yt');
        renderInto(tkCommentList, true, 'tk');
    }

    function addComment(text) {
        if (!currentVideoKey) {
            showToast('Сначала откройте видео');
            return;
        }
        const trimmed = text.trim();
        if (!trimmed) return;
        const comments = getComments(currentVideoKey);
        comments.push({ id: 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1e5), text: trimmed.slice(0, 500), ts: Date.now() });
        setComments(currentVideoKey, comments);
        renderComments();
    }

    ytCommentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addComment(ytCommentInput.value);
        ytCommentInput.value = '';
    });

    tkCommentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addComment(tkCommentInput.value);
        tkCommentInput.value = '';
    });

    function openCommentsDrawer() {
        document.body.classList.add('tk-drawer-open');
        clearIdle();
        renderComments();
    }

    function closeCommentsDrawer() {
        document.body.classList.remove('tk-drawer-open');
        scheduleIdle();
    }

    tkComments.addEventListener('click', () => {
        if (document.body.classList.contains('tk-drawer-open')) {
            closeCommentsDrawer();
        } else {
            openCommentsDrawer();
        }
    });
    tkDrawerClose.addEventListener('click', closeCommentsDrawer);
    tkBackdrop.addEventListener('click', closeCommentsDrawer);

    // =========================================================
    //  Play / pause
    // =========================================================
    function restartVideo() {
        playerWrapper.classList.remove('video-ended');
        replayOverlay.classList.add('hidden');
        video.currentTime = 0;
        video.play().catch(() => {});
    }

    function togglePlayPause() {
        if (!video.src) return;
        resumeAudioContext();
        if (video.ended) {
            restartVideo();
            return;
        }
        if (video.paused) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    }

    function flashCenterIcon(iconClass) {
        centerFlashIcon.className = iconClass;
        centerFlash.classList.remove('show');
        void centerFlash.offsetWidth; // restart animation
        centerFlash.classList.add('show');
    }

    function isVideoEndedState() {
        return video.ended || (hasDuration() && isFinite(video.duration) && video.currentTime >= video.duration - 0.05);
    }

    function updatePlayPauseButton(playing) {
        if (video.ended) {
            playPauseIcon.className = 'fa-solid fa-rotate-right';
            btnPlayPause.setAttribute('data-tooltip', 'Смотреть снова (k)');
            btnPlayPause.setAttribute('aria-label', 'Смотреть снова');
            clearTimeout(idleTimer);
            return;
        }
        if (playing) {
            playPauseIcon.className = 'fa-solid fa-pause';
            btnPlayPause.setAttribute('data-tooltip', 'Пауза (k)');
            btnPlayPause.setAttribute('aria-label', 'Пауза');
            scheduleIdle();
        } else {
            playPauseIcon.className = 'fa-solid fa-play';
            btnPlayPause.setAttribute('data-tooltip', 'Воспроизвести (k)');
            btnPlayPause.setAttribute('aria-label', 'Воспроизвести');
            clearTimeout(idleTimer);
            document.body.classList.remove('idle');
        }
    }

    btnPlayPause.addEventListener('click', togglePlayPause);
    video.addEventListener('click', togglePlayPause);
    const qualityCanvasTop = $('quality-canvas');
    const audioCoverTop = $('audio-cover');
    if (qualityCanvasTop) qualityCanvasTop.addEventListener('click', togglePlayPause);
    if (audioCoverTop) audioCoverTop.addEventListener('click', togglePlayPause);

    video.addEventListener('play', () => {
        startFpsSampler();
        scheduleIdle();
        playerWrapper.classList.remove('video-ended');
        updatePlayPauseButton(true);
        replayOverlay.classList.add('hidden');
        if (video.readyState >= 2) flashCenterIcon('fa-solid fa-play');
    });

    video.addEventListener('pause', () => {
        updatePlayPauseButton(false);
        if (!video.ended) flashCenterIcon('fa-solid fa-pause');
    });

    video.addEventListener('ended', () => {
        if (Date.now() < infiniteFixGuard) {
            // Artificial seek used only to measure the real duration — reset silently.
            infiniteFixGuard = 0;
            infiniteFixPending = false;
            video.currentTime = 0;
            afterMetadataReady();
            if (autoplayOn) video.play().catch(() => {});
            return;
        }
        if (!video.loop) {
            playerWrapper.classList.add('video-ended');
            replayOverlay.classList.remove('hidden');
            updatePlayPauseButton(false);
            // Theater end-of-video: hide the chrome, like YouTube.
            scheduleIdle();
        }
    });

    btnReplay.addEventListener('click', restartVideo);
    replayOverlay.addEventListener('click', restartVideo);
    replayOverlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            restartVideo();
        }
    });

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
    //  Time & progress
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
        if (infiniteFixPending) {
            // First tick after the synthetic seek — the browser now knows the
            // real duration. Reset to the start and finish initialisation.
            infiniteFixPending = false;
            video.currentTime = 0;
            afterMetadataReady();
            if (autoplayOn) video.play().catch(() => {});
            return;
        }
        if (!isDraggingProgress && hasDuration()) {
            const percent = (video.currentTime / video.duration) * 100;
            progressPlayed.style.width = percent + '%';
            progressScrubber.style.left = percent + '%';
            progressContainer.setAttribute('aria-valuenow', String(Math.round(percent)));
            currentTimeEl.textContent = formatTime(video.currentTime);
        }
        updateSubtitles(video.currentTime);
    });

    video.addEventListener('progress', () => {
        if (video.buffered.length > 0 && hasDuration()) {
            let bufferedEnd = 0;
            for (let i = 0; i < video.buffered.length; i++) {
                const start = video.buffered.start(i);
                const end = video.buffered.end(i);
                if (video.currentTime >= start - 0.5 && video.currentTime <= end + 0.5) {
                    bufferedEnd = end;
                    break;
                }
                bufferedEnd = Math.max(bufferedEnd, end);
            }
            progressBuffered.style.width = Math.min(100, (bufferedEnd / video.duration) * 100) + '%';
        }
    });

    progressContainer.addEventListener('pointermove', (e) => {
        if (!hasDuration()) return;
        const rect = progressContainer.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (!isDraggingProgress) {
            const tooltipX = ratio * rect.width;
            progressTooltip.style.left = Math.max(18, Math.min(rect.width - 18, tooltipX)) + 'px';
            progressTooltip.textContent = formatTime(ratio * video.duration);
            progressTooltip.style.display = 'block';
            showSeekPreview(ratio);
        }
    });

    progressContainer.addEventListener('pointerleave', () => {
        progressTooltip.style.display = 'none';
        hideSeekPreview();
    });

    function seekToPosition(e) {
        if (!hasDuration()) return;
        const rect = progressContainer.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = ratio * video.duration;
        video.currentTime = time;
        progressPlayed.style.width = ratio * 100 + '%';
        progressScrubber.style.left = ratio * 100 + '%';
        currentTimeEl.textContent = formatTime(time);
        progressTooltip.style.left = Math.max(18, Math.min(rect.width - 18, ratio * rect.width)) + 'px';
        progressTooltip.textContent = formatTime(time);
        progressTooltip.style.display = 'block';
        showSeekPreview(ratio);
    }

    progressContainer.addEventListener('pointerdown', (e) => {
        if (!hasDuration()) return;
        e.preventDefault();
        isDraggingProgress = true;
        progressContainer.classList.add('scrubbing');
        playerWrapper.classList.add('scrubbing');
        try { progressContainer.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        replayOverlay.classList.add('hidden');
        playerWrapper.classList.remove('video-ended');
        seekToPosition(e);
        pokeUI();
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
        playerWrapper.classList.remove('scrubbing');
        progressTooltip.style.display = 'none';
        hideSeekPreview();
        scheduleIdle();
    }

    progressContainer.addEventListener('pointerup', endScrubbing);
    progressContainer.addEventListener('pointercancel', endScrubbing);

    // =========================================================
    //  Skip ±5s / ±10s + indicator
    // =========================================================
    function triggerDoubleTapAnimation(seconds) {
        const isForward = seconds > 0;
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
        triggerDoubleTapAnimation(seconds);
    }

    // =========================================================
    //  Frame-by-frame (paused only)
    // =========================================================
    function stepFrame(frames) {
        if (!video.paused || !hasDuration()) return;
        const step = frames / ESTIMATED_FPS;
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + step));
    }

    btnPrevFrame.addEventListener('click', () => stepFrame(-1));
    btnNextFrame.addEventListener('click', () => stepFrame(1));

    // =========================================================
    //  Settings helpers
    // =========================================================
    function setChevronValue(el, text) {
        el.textContent = '';
        el.appendChild(document.createTextNode(text + ' '));
        const chevron = document.createElement('i');
        chevron.className = 'fa-solid fa-chevron-right';
        el.appendChild(chevron);
    }

    // =========================================================
    //  Playback speed & pitch
    // =========================================================
    function speedDisplayName(speed) {
        return speed === 1 ? 'Обычная' : `${parseFloat(speed.toFixed(2))}x`;
    }

    function clampSpeed(speed) {
        return Math.min(2, Math.max(0.25, Math.round(speed * 100) / 100));
    }

    /* Slider position <-> rate mapping. The slider is symmetric around 1x
       (0.25 at far left, 1x dead center, 2x at far right): left half covers
       0.25..1, right half covers 1..2. */
    function sliderPosToRate(p) {
        p = Math.min(1, Math.max(0, p));
        return p <= 0.5 ? 0.25 + 0.75 * (p / 0.5) : 1 + 1 * ((p - 0.5) / 0.5);
    }

    function rateToSliderPos(r) {
        r = clampSpeed(r);
        return r <= 1 ? 0.5 * (r - 0.25) / 0.75 : 0.5 + 0.5 * (r - 1);
    }

    function speedBigValue(speed) {
        return `${Number(speed).toFixed(2)}x`;
    }

    function paintSpeedSlider() {
        speedSlider.style.setProperty('--fill', (rateToSliderPos(playbackSpeed) * 100) + '%');
    }

    function setPlaybackSpeed(speed) {
        playbackSpeed = clampSpeed(speed);
        video.defaultPlaybackRate = playbackSpeed;
        video.playbackRate = playbackSpeed;
        setChevronValue(currentSpeedLabel, speedDisplayName(playbackSpeed));
        speedSlider.value = String(rateToSliderPos(playbackSpeed));
        speedSlider.setAttribute('aria-valuenow', String(playbackSpeed));
        speedSlider.setAttribute('aria-valuetext', speedBigValue(playbackSpeed));
        speedSliderValue.textContent = playbackSpeed.toFixed(2) + 'x';
        speedPresets.querySelectorAll('.speed-pill').forEach((pill) => {
            pill.classList.toggle('active', Math.abs(parseFloat(pill.getAttribute('data-speed')) - playbackSpeed) < 1e-9);
        });
        paintSpeedSlider();
    }

    // The menu stays open while dragging — fine-tune like on YouTube.
    speedSlider.addEventListener('input', () => {
        setPlaybackSpeed(sliderPosToRate(parseFloat(speedSlider.value)));
    });

    // Keyboard support with real 0.05 steps (native step is finer).
    speedSlider.addEventListener('keydown', (e) => {
        const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
        if (e.key in dir) {
            e.preventDefault();
            setPlaybackSpeed(playbackSpeed + dir[e.key] * 0.05);
            return;
        }
        if (e.key === 'Home') { e.preventDefault(); setPlaybackSpeed(0.25); return; }
        if (e.key === 'End') { e.preventDefault(); setPlaybackSpeed(2); }
    });

    speedDecrease.addEventListener('click', () => setPlaybackSpeed(playbackSpeed - 0.05));
    speedIncrease.addEventListener('click', () => setPlaybackSpeed(playbackSpeed + 0.05));

    speedPresets.addEventListener('click', (e) => {
        const pill = e.target.closest('.speed-pill');
        if (!pill) return;
        setPlaybackSpeed(parseFloat(pill.getAttribute('data-speed')));
    });

    pitchCheckbox.addEventListener('change', (e) => {
        video.preservesPitch = e.target.checked;
        if ('webkitPreservesPitch' in video) {
            video.webkitPreservesPitch = e.target.checked;
        }
    });

    // =========================================================
    //  Loop — repeat button + TikTok sheet toggle, one shared state
    //  across every style (off by default)
    // =========================================================
    isLooping = false;
    function applyLoopForMode() {
        video.loop = isLooping;
        if (btnLoopToggle) {
            btnLoopToggle.classList.toggle('active', isLooping);
            btnLoopToggle.setAttribute('aria-pressed', String(isLooping));
        }
        const tkLoop = document.getElementById('tk-loop-toggle');
        if (tkLoop) {
            tkLoop.classList.toggle('active', isLooping);
            tkLoop.setAttribute('aria-pressed', String(isLooping));
        }
    }
    function toggleLoop() {
        isLooping = !isLooping;
        applyLoopForMode();
    }
    if (btnLoopToggle) btnLoopToggle.addEventListener('click', toggleLoop);

    // =========================================================
    //  Close buttons in the top bar (video loaded state only)
    // =========================================================
    function updateCloseButtonsVisibility() {
        document.body.classList.toggle('video-active', !!currentVideoKey);
    }

    // =========================================================
    //  Audio files — embedded cover (ID3 APIC) + generated fallback
    // =========================================================
    function trackFrameSize(view, offset) {
        // ID3v2.4 uses syncsafe sizes; v2.2/v2.3 use a plain 32-bit big-endian size.
        const plain = view.getUint32(offset, false);
        const syncsafe = ((view.getUint8(offset) & 0x7f) << 21) | ((view.getUint8(offset + 1) & 0x7f) << 14) | ((view.getUint8(offset + 2) & 0x7f) << 7) | (view.getUint8(offset + 3) & 0x7f);
        if (plain > 0 && plain < view.byteLength && offset + plain <= view.byteLength) return { size: plain, syncsafe: false };
        return { size: syncsafe, syncsafe: true };
    }

    // Minimal MP4 atom walker: moov → udta → meta → ilst → covr → data.
    // Best-effort — any structural surprise falls back to the generated cover.
    async function extractMp4Cover(file) {
        try {
            const buf = await file.arrayBuffer();
            const dv = new DataView(buf);
            const len = dv.byteLength;
            const typeOf = (off) => String.fromCharCode(dv.getUint8(off), dv.getUint8(off + 1), dv.getUint8(off + 2), dv.getUint8(off + 3));
            const readAtoms = (start, end) => {
                const atoms = [];
                let off = start;
                while (off + 8 <= end) {
                    let size = dv.getUint32(off);
                    const type = typeOf(off + 4);
                    let header = 8;
                    if (size === 1) { if (off + 16 > end) break; size = Number(dv.getBigUint64(off + 8)); header = 16; }
                    else if (size === 0) { size = end - off; }
                    if (size < header || off + size > end) break;
                    atoms.push({ type, start: off + header, end: off + size });
                    off += size;
                }
                return atoms;
            };
            const child = (atom, wanted) => atom && readAtoms(atom.start, atom.end).find((a) => a.type === wanted);
            const moov = readAtoms(0, len).find((a) => a.type === 'moov');
            if (!moov) return null;
            let cur = moov;
            const udta = child(cur, 'udta');
            if (udta) cur = udta;
            const meta = child(cur, 'meta');
            if (!meta) return null;
            const ilst = readAtoms(meta.start + 4, meta.end).find((a) => a.type === 'ilst'); // 4 bytes version/flags
            const covr = child(ilst, 'covr');
            const dataAtom = child(covr, 'data');
            if (!dataAtom) return null;
            const imgStart = dataAtom.start + 8; // 1B type + 3B locale + 4B reserved
            const imgEnd = dataAtom.end;
            if (imgEnd - imgStart < 32) return null;
            const bytes = new Uint8Array(buf.slice(imgStart, imgEnd));
            const mime = bytes[0] === 0x89 ? 'image/png' : (bytes[0] === 0xff ? 'image/jpeg' : null);
            return mime ? new Blob([bytes], { type: mime }) : null;
        } catch (_) {
            return null;
        }
    }

    async function extractEmbeddedCover(file) {
        try {
            const ext = ((file.name.match(/\.([a-z0-9]+)$/i) || [])[1] || '').toLowerCase();
            if (ext === 'mp4' || ext === 'm4a' || ext === 'm4b' || ext === 'aac' || ext === 'mov') {
                return await extractMp4Cover(file);
            }
            const buf = await file.arrayBuffer();
            const view = new DataView(buf);
            if (view.byteLength < 10) return null;
            if (view.getUint8(0) !== 0x49 || view.getUint8(1) !== 0x44 || view.getUint8(2) !== 0x33) return null; // "ID3"
            const major = view.getUint8(3);
            const sizeBytes = [6, 7, 8, 9].map((i) => view.getUint8(i));
            const tagSize = ((sizeBytes[0] & 0x7f) << 21) | ((sizeBytes[1] & 0x7f) << 14) | ((sizeBytes[2] & 0x7f) << 7) | (sizeBytes[3] & 0x7f);
            let offset = 10;
            const end = Math.min(view.byteLength, 10 + tagSize);
            const flags = view.getUint8(5);
            if (major >= 3 && (flags & 0x40) && offset + 4 <= end) {
                // Extended header — best-effort skip
                const extRaw = view.getUint32(offset, false);
                const extSync = ((view.getUint8(offset) & 0x7f) << 21) | ((view.getUint8(offset + 1) & 0x7f) << 14) | ((view.getUint8(offset + 2) & 0x7f) << 7) | (view.getUint8(offset + 3) & 0x7f);
                const extSize = (major === 4) ? extSync : extRaw;
                offset += (major === 4 ? extSize + 4 : extSize + 4) || 0;
            }
            const idLen = major <= 2 ? 3 : 4;
            const sizeLen = major <= 2 ? 3 : 4;
            const headerLen = idLen + sizeLen + (major <= 2 ? 0 : 2);
            while (offset + headerLen <= end) {
                let id = '';
                for (let i = 0; i < idLen; i++) id += String.fromCharCode(view.getUint8(offset + i));
                if (!/^[A-Z0-9]+$/.test(id)) break;
                let frameSize = 0;
                if (major === 4) {
                    frameSize = ((view.getUint8(offset + 4) & 0x7f) << 21) | ((view.getUint8(offset + 5) & 0x7f) << 14) | ((view.getUint8(offset + 6) & 0x7f) << 7) | (view.getUint8(offset + 7) & 0x7f);
                } else if (major === 3) {
                    frameSize = view.getUint32(offset + 4, false);
                } else { // v2.2 — 24-bit sizes
                    frameSize = (view.getUint8(offset + 3) << 16) | (view.getUint8(offset + 4) << 8) | view.getUint8(offset + 5);
                }
                if (frameSize <= 0 || offset + headerLen + frameSize > view.byteLength) break;
                const bodyStart = offset + headerLen;
                if (id === 'APIC' || id === 'PIC') {
                    let p = bodyStart;
                    const frameEnd = bodyStart + frameSize;
                    const encoding = view.getUint8(p); p += 1;
                    let mime = '';
                    if (id === 'PIC') { // v2.2: 3-char format instead of mime string
                        mime = 'image/' + String.fromCharCode(view.getUint8(p), view.getUint8(p + 1), view.getUint8(p + 2)).toLowerCase().replace('jpg', 'jpeg');
                        p += 3;
                    } else {
                        while (p < frameEnd && view.getUint8(p) !== 0) { mime += String.fromCharCode(view.getUint8(p)); p += 1; }
                        p += 1; // null terminator
                    }
                    p += 1; // picture type byte
                    if (encoding === 1 || encoding === 2) { // UTF-16 description: skip to double-null
                        while (p + 1 < frameEnd) {
                            if (view.getUint8(p) === 0 && view.getUint8(p + 1) === 0) { p += 2; break; }
                            p += 2;
                        }
                    } else {
                        while (p < frameEnd && view.getUint8(p) !== 0) p += 1;
                        p += 1;
                    }
                    if (p >= frameEnd) return null;
                    const data = buf.slice(p, frameEnd);
                    return new Blob([data], { type: mime || 'image/jpeg' });
                }
                offset += headerLen + frameSize;
            }
            return null;
        } catch (_) {
            return null;
        }
    }

    function generateAudioCover(title) {
        const text = (title || 'Аудио').trim() || 'Аудио';
        const c = document.createElement('canvas');
        c.width = 512; c.height = 512;
        const ctx = c.getContext('2d');
        const h = hueFromString(text);
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, `hsl(${h} 62% 44%)`);
        grad.addColorStop(1, `hsl(${(h + 75) % 360} 65% 15%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.beginPath(); ctx.arc(438, 74, 190, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(48, 452, 150, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = '900 185px "Font Awesome 7 Free", "Font Awesome 6 Free", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\uf001', 256, 214); // fa-music glyph
        // Track title, up to two lines
        ctx.font = '700 39px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'alphabetic';
        const words = text.split(/\s+/);
        const lines = [];
        let line = '';
        for (const word of words) {
            const next = line ? line + ' ' + word : word;
            if (ctx.measureText(next).width > 440 && line) { lines.push(line); line = word; } else { line = next; }
            if (lines.length === 2) break;
        }
        if (line && lines.length < 2) lines.push(line);
        const startY = lines.length > 1 ? 388 : 414;
        lines.slice(0, 2).forEach((l, i) => {
            let out = l;
            while (ctx.measureText(out).width > 448 && out.length > 1) out = out.slice(0, -2);
            if (out !== l) out = out.slice(0, -1) + '…';
            ctx.fillText(out, 256, startY + i * 48);
        });
        return c.toDataURL('image/png');
    }

    // =========================================================
    //  Профессиональное освещение — YouTube-style ambient: a blurred,
    //  cover-fit painting of the live frame bleeds into the black
    //  letterbox area around the picture. Re-painted while playing.
    // =========================================================
    let ambientTimer = null;

    // Size/position the page-level halo around the player (YouTube glows
    // from behind the player's edges — it does not wash the whole page).
    function positionAmbientHalo() {
        if (!ambientHalo || !playerWrapper) return;
        const parent = ambientHalo.parentElement;
        if (!parent) return;
        const wrap = playerWrapper.getBoundingClientRect();
        const col = parent.getBoundingClientRect();
        const padX = Math.round(wrap.width * 0.11);
        const padTop = Math.round(wrap.height * 0.16);
        const padBottom = Math.round(wrap.height * 0.18);
        ambientHalo.style.left = (wrap.left - col.left - padX) + 'px';
        ambientHalo.style.top = (wrap.top - col.top - padTop) + 'px';
        ambientHalo.style.width = (wrap.width + padX * 2) + 'px';
        ambientHalo.style.height = (wrap.height + padTop + padBottom) + 'px';
    }

    function paintAmbientFrame() {
        try {
            if (!ambientCanvas && !ambientHalo) return;
            const drawInto = (canvas, withGradient) => {
                if (!canvas) return;
                const W = 144, H = 81; // tiny — CSS blur + upscaling does the rest
                if (canvas.width !== W) { canvas.width = W; canvas.height = H; }
                const ctx = canvas.getContext('2d');
                if (currentIsAudio) {
                    // Static soft radial in the track's own hue (audio has no frames)
                    const hue = hueFromString(currentFileName || 'audio');
                    const g = ctx.createRadialGradient(W / 2, H / 2, 6, W / 2, H / 2, W * 0.75);
                    g.addColorStop(0, `hsl(${hue} 62% 48%)`);
                    g.addColorStop(0.55, `hsl(${(hue + 32) % 360} 52% 26%)`);
                    g.addColorStop(1, '#050505');
                    ctx.fillStyle = g;
                    ctx.fillRect(0, 0, W, H);
                    return;
                }
                const sw = video.videoWidth, sh = video.videoHeight;
                if (!sw || !sh) return;
                // Cover-fit: same colors, pushed all the way into the edges
                const scale = Math.max(W / sw, H / sh);
                const dw = sw * scale, dh = sh * scale;
                ctx.clearRect(0, 0, W, H);
                ctx.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh);
            };
            positionAmbientHalo();
            drawInto(ambientCanvas);
            drawInto(ambientHalo);
        } catch (_) { /* frame not ready — keep the previous paint */ }
    }

    window.addEventListener('resize', () => { if (studioLight) positionAmbientHalo(); });

    function applyStudioLight() {
        document.body.classList.toggle('studio-light', studioLight);
        if (studioLightCheckbox) studioLightCheckbox.checked = studioLight;
        const tk = document.getElementById('tk-studio-light');
        if (tk) {
            tk.classList.toggle('active', studioLight);
            tk.setAttribute('aria-pressed', String(studioLight));
        }
        clearInterval(ambientTimer);
        ambientTimer = null;
        if (studioLight) {
            paintAmbientFrame();
            if (!currentIsAudio) {
                ambientTimer = setInterval(paintAmbientFrame, 350);
            }
        }
    }

    if (studioLightCheckbox) {
        studioLightCheckbox.addEventListener('change', (e) => {
            studioLight = e.target.checked;
            storageSet('wmv_studio_light', studioLight ? '1' : '0');
            applyStudioLight();
        });
    }

    // =========================================================
    //  Sleep timer — «Автовыключение»
    // =========================================================
    const SLEEP_STEPS = [10, 15, 20, 30, 45, 60];
    const settingsSleepView = $('settings-sleep');
    const sleepOptionsList = $('sleep-options');
    const currentSleepLabel = $('current-sleep-label');
    let sleepMode = 'off';            // 'off' | 'minutes' | 'end'
    let sleepMinutesChosen = 0;
    let sleepDeadline = 0;
    let sleepInterval = null;

    function fmtRemainMs(ms) {
        const totalMin = Math.max(0, Math.ceil(ms / 60000));
        if (totalMin >= 60) {
            const h = Math.floor(totalMin / 60);
            const m = totalMin % 60;
            return m ? `${h} ч ${m} мин` : `${h} ч`;
        }
        return `${totalMin} мин`;
    }

    function paintSleepLabel() {
        if (!currentSleepLabel) return;
        if (sleepMode === 'off') setChevronValue(currentSleepLabel, 'Выкл.');
        else if (sleepMode === 'minutes') setChevronValue(currentSleepLabel, fmtRemainMs(sleepDeadline - Date.now()));
        else setChevronValue(currentSleepLabel, 'По окончании видео');
    }

    function renderSleepOptions() {
        if (!sleepOptionsList) return;
        sleepOptionsList.innerHTML = '';
        const make = (value, label, sub) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'settings-option';
            btn.setAttribute('role', 'menuitem');
            const isActive = (value === 'off' && sleepMode === 'off')
                || (value === 'end' && sleepMode === 'end')
                || (typeof value === 'number' && sleepMode === 'minutes' && sleepMinutesChosen === value);
            if (isActive) btn.classList.add('active');
            btn.textContent = label;
            if (sub) {
                const subEl = document.createElement('span');
                subEl.className = 'settings-option-sub';
                subEl.textContent = sub;
                btn.appendChild(subEl);
            }
            btn.addEventListener('click', () => selectSleepOption(value));
            sleepOptionsList.appendChild(btn);
        };
        make('off', 'ВЫКЛ');
        SLEEP_STEPS.forEach((n) => {
            const sub = (sleepMode === 'minutes' && sleepMinutesChosen === n) ? `Осталось ~${fmtRemainMs(sleepDeadline - Date.now())}` : null;
            make(n, `${n} мин`, sub);
        });
        let endSub = 'Остановить видео в конце';
        if (hasDuration() && isFinite(video.duration)) {
            endSub = `Осталось ~${fmtRemainMs((video.duration - video.currentTime) * 1000)}`;
        }
        make('end', 'По окончании видео', endSub);
    }

    function tickSleep() {
        if (sleepMode === 'minutes') {
            if (Date.now() >= sleepDeadline) {
                video.pause();
                clearSleepTimer();
                showToast('Автовыключение: видео приостановлено', 2800);
                return;
            }
            paintSleepLabel();
            if (settingsSleepView && !settingsSleepView.classList.contains('hidden')) renderSleepOptions();
        } else if (sleepMode === 'end') {
            if (settingsSleepView && !settingsSleepView.classList.contains('hidden')) renderSleepOptions();
        }
    }

    function selectSleepOption(value) {
        clearInterval(sleepInterval);
        sleepInterval = null;
        if (value === 'off') {
            sleepMode = 'off';
            sleepMinutesChosen = 0;
            sleepDeadline = 0;
        } else if (value === 'end') {
            sleepMode = 'end';
            sleepMinutesChosen = 0;
            sleepDeadline = 0;
        } else {
            sleepMode = 'minutes';
            sleepMinutesChosen = value;
            sleepDeadline = Date.now() + value * 60000;
            sleepInterval = setInterval(tickSleep, 1000);
        }
        paintSleepLabel();
        renderSleepOptions();
    }

    function clearSleepTimer() {
        clearInterval(sleepInterval);
        sleepInterval = null;
        sleepMode = 'off';
        sleepMinutesChosen = 0;
        sleepDeadline = 0;
        paintSleepLabel();
        renderSleepOptions();
    }

    let lastSleepEndRender = 0;
    video.addEventListener('timeupdate', () => {
        if (sleepMode === 'end' && hasDuration() && isFinite(video.duration)) {
            if (video.currentTime >= video.duration - 0.35) {
                video.pause();
                clearSleepTimer();
                showToast('Автовыключение: видео приостановлено', 2800);
                return;
            }
            if (settingsSleepView && !settingsSleepView.classList.contains('hidden')) {
                const now = Date.now();
                if (now - lastSleepEndRender > 2500) {
                    lastSleepEndRender = now;
                    renderSleepOptions();
                }
            }
        }
    });

    // =========================================================
    //  TikTok share-style settings sheet
    // =========================================================
    const tkShareSheet = $('tk-share-sheet');
    const tkSheetBackdrop = $('tk-sheet-backdrop');
    const tkSheetOpenSubtitles = $('tk-open-subtitles');
    const tkSheetOpenSleep = $('tk-open-sleep');
    const tkSheetOpenSpeed = $('tk-open-speed');
    const tkSheetOpenQuality = $('tk-open-quality');
    const tkStudioLight = $('tk-studio-light');
    const tkLoopSheetBtn = $('tk-loop-toggle');

    let settingsFromSheet = false;

    function openShareSheet(open) {
        if (!tkShareSheet) return;
        tkShareSheet.classList.toggle('open', open);
        if (tkSheetBackdrop) tkSheetBackdrop.classList.toggle('open', open);
        tkShareSheet.setAttribute('aria-hidden', String(!open));
        playerWrapper.classList.toggle('tk-sheet-open', open);
        if (open) {
            document.body.classList.remove('idle');
            clearIdle();
        } else {
            scheduleIdle();
        }
    }

    function closeShareSheet() {
        openShareSheet(false);
    }

    if (tkShare) {
        tkShare.addEventListener('click', (e) => {
            e.stopPropagation();
            openShareSheet(!tkShareSheet.classList.contains('open'));
        });
    }
    if (tkSheetBackdrop) tkSheetBackdrop.addEventListener('click', closeShareSheet);
    if (tkShareSheet) tkShareSheet.addEventListener('click', (e) => e.stopPropagation());

    function openSettingsViewFromSheet(view) {
        closeShareSheet();
        settingsFromSheet = true;
        settingsMenu.classList.add('as-sheet');
        openSettingsMenu(true, view);
    }

    function leaveSheetMode() {
        settingsFromSheet = false;
        if (settingsMenu) settingsMenu.classList.remove('as-sheet');
    }

    const stopProp = (fn) => (e) => { e.stopPropagation(); fn(); };
    if (tkSheetOpenSubtitles) tkSheetOpenSubtitles.addEventListener('click', stopProp(() => openSettingsViewFromSheet(settingsSubtitlesMenu)));
    if (tkSheetOpenSleep) tkSheetOpenSleep.addEventListener('click', stopProp(() => openSettingsViewFromSheet(settingsSleepView)));
    if (tkSheetOpenSpeed) tkSheetOpenSpeed.addEventListener('click', stopProp(() => openSettingsViewFromSheet(settingsSpeed)));
    if (tkSheetOpenQuality) tkSheetOpenQuality.addEventListener('click', stopProp(() => openSettingsViewFromSheet(settingsQuality)));
    const tkSheetShareSystem = $('tk-share-system');
    const tkSheetShareDownload = $('tk-share-download');
    const sheetAction = (fn) => stopProp(() => { openShareSheet(false); fn(); });
    if (tkSheetShareSystem) tkSheetShareSystem.addEventListener('click', sheetAction(shareStub));
    if (tkSheetShareDownload) tkSheetShareDownload.addEventListener('click', sheetAction(downloadStub));
    if (tkStudioLight) tkStudioLight.addEventListener('click', (e) => e.stopPropagation());
    if (tkLoopSheetBtn) tkLoopSheetBtn.addEventListener('click', (e) => e.stopPropagation());
    if (tkStudioLight) {
        tkStudioLight.addEventListener('click', () => {
            studioLight = !studioLight;
            storageSet('wmv_studio_light', studioLight ? '1' : '0');
            applyStudioLight();
        });
    }
    if (tkLoopSheetBtn) tkLoopSheetBtn.addEventListener('click', () => toggleLoop());

    // TikTok volume slider — same level as the main one
    if (tkVolumeSlider) {
        tkVolumeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) / 100;
            if (val > 0) isMuted = false;
            setVolume(val);
        });
    }

    // =========================================================
    //  Autoplay toggle (bottom-right, left of Субтитры)
    // =========================================================
    function paintAutoplay() {
        if (btnAutoplay) btnAutoplay.setAttribute('aria-pressed', String(autoplayOn));
    }

    if (btnAutoplay) {
        btnAutoplay.addEventListener('click', () => {
            autoplayOn = !autoplayOn;
            storageSet('wmv_autoplay', autoplayOn ? '1' : '0');
            paintAutoplay();
        });
    }

    // =========================================================
    //  Скриншот — save the current frame (or the cover for audio)
    // =========================================================
    if (btnScreenshot) {
        btnScreenshot.addEventListener('click', () => {
            if (!currentVideoKey) {
                showToast('Сначала откройте видео');
                return;
            }
            try {
                const c = document.createElement('canvas');
                if (currentIsAudio && audioCover && audioCover.currentSrc) {
                    const img = audioCover;
                    c.width = img.naturalWidth || 512;
                    c.height = img.naturalHeight || 512;
                    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                } else {
                    const srcEl = qualityProxyOn ? qualityCanvas : video;
                    const w = srcEl.videoWidth || srcEl.width;
                    const h = srcEl.videoHeight || srcEl.height;
                    if (!w || !h) {
                        showToast('Кадр ещё не готов');
                        return;
                    }
                    c.width = w;
                    c.height = h;
                    c.getContext('2d').drawImage(srcEl, 0, 0, w, h);
                }
                const a = document.createElement('a');
                const t = formatTime(video.currentTime || 0).replace(/[:.]/g, '-');
                a.download = `${stripExtension(currentFileName) || 'screenshot'}-${t}.png`;
                a.href = c.toDataURL('image/png');
                document.body.appendChild(a);
                a.click();
                a.remove();
            } catch (_) {
                showToast('Не удалось сохранить снимок');
            }
        });
    }

    // =========================================================
    //  Seek preview — mini-frame above the time while scrubbing
    // =========================================================
    const seekPreviewCheckbox = $('seek-preview-checkbox');

    function drawSeekPreview(source) {
        if (!seekPreviewEnabled || !seekPreviewCanvas) return;
        if (currentIsAudio) return;
        const sw = source.videoWidth, sh = source.videoHeight;
        if (!sw || !sh) return;
        const ctx = seekPreviewCanvas.getContext('2d');
        const cw = seekPreviewCanvas.width, ch = seekPreviewCanvas.height;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, cw, ch);
        const scale = Math.min(cw / sw, ch / sh);
        const dw = Math.max(2, Math.round(sw * scale));
        const dh = Math.max(2, Math.round(sh * scale));
        try {
            ctx.drawImage(source, Math.round((cw - dw) / 2), Math.round((ch - dh) / 2), dw, dh);
        } catch (_) { /* frame not decoded yet */ }
    }

    // Hover-preview seeks (throttled by the browser's own seek pipeline)
    let seekThumbBusy = false;
    let seekThumbWantedRatio = 0;

    function queueThumbPreview(ratio) {
        if (!seekThumbVideo || !hasDuration()) return;
        seekThumbWantedRatio = ratio;
        if (seekThumbBusy) return;
        seekThumbBusy = true;
        try {
            seekThumbVideo.currentTime = ratio * video.duration;
        } catch (_) {
            seekThumbBusy = false;
        }
    }

    if (seekThumbVideo) {
        seekThumbVideo.addEventListener('seeked', () => {
            drawSeekPreview(seekThumbVideo);
            // A newer position was requested while we were seeking — catch up
            const wanted = seekThumbWantedRatio * video.duration;
            if (hasDuration() && Math.abs(seekThumbVideo.currentTime - wanted) > 0.08) {
                try {
                    seekThumbVideo.currentTime = wanted;
                    return;
                } catch (_) { /* give up quietly */ }
            }
            seekThumbBusy = false;
        });
        seekThumbVideo.addEventListener('error', () => { seekThumbBusy = false; });
    }

    function positionSeekPreview(ratio) {
        if (!seekPreview) return;
        const rect = progressContainer.getBoundingClientRect();
        const halfW = 84; // half of the 168px preview frame
        const x = Math.max(halfW + 2, Math.min(rect.width - halfW - 2, ratio * rect.width));
        seekPreview.style.left = x + 'px';
    }

    function showSeekPreview(ratio) {
        if (!seekPreviewEnabled || !seekPreview) return;
        positionSeekPreview(ratio);
        if (isDraggingProgress) {
            drawSeekPreview(video);
        } else {
            queueThumbPreview(ratio);
        }
        seekPreview.classList.remove('hidden');
    }

    function hideSeekPreview() {
        if (seekPreview) seekPreview.classList.add('hidden');
    }

    video.addEventListener('seeked', () => {
        if (isDraggingProgress) drawSeekPreview(video);
    });

    if (seekPreviewCheckbox) {
        seekPreviewCheckbox.checked = seekPreviewEnabled;
        seekPreviewCheckbox.addEventListener('change', (e) => {
            seekPreviewEnabled = e.target.checked;
            storageSet('wmv_seek_preview', seekPreviewEnabled ? '1' : '0');
            if (!seekPreviewEnabled) hideSeekPreview();
        });
    }

    // =========================================================
    //  Quality — the site synthesizes low tiers itself (canvas downscale); the
    //  original tier is derived from the source resolution.
    // =========================================================
    function qualityOverline(height) {
        if (height >= 2160) return '4K';
        if (height >= 1080) return 'HD'; // 1080p and 1440p both read HD
        return '';
    }

    let knownFps = null;       // measured during real playback via rVFC
    let fpsSamples = [];
    let fpsLastMediaTime = 0;
    let fpsSampling = false;

    let sourceMinDim = 0;      // min(videoWidth, videoHeight) of the loaded file
    // rAF-measured refresh rate of the current display. A ?displayHz=N query
    // overrides the measurement — escape hatch for adaptive-sync displays
    // whose reported cadence is not their actual refresh rate.
    let displayHzOverride = 0;
    try {
        const v = parseFloat(new URLSearchParams(window.location.search).get('displayHz') || '0');
        if (v >= 30 && v <= 240) displayHzOverride = v;
    } catch (_) { displayHzOverride = 0; }
    let measuredDisplayHz = displayHzOverride;
    function qualityLabel(height) {
        const h = Number(height) || 0;
        if (!h) return 'Авто';
        // fps is always shown; if the real rate is not measurable, 60 is assumed.
        // The 4K rung of a non-4K source interpolates to the display's refresh
        // rate — advertise the rate the user will actually get (measured).
        if (h === 2160 && sourceMinDim > 0 && sourceMinDim < 2160 && measuredDisplayHz >= 100) {
            return `2160p${Math.round(measuredDisplayHz)}`;
        }
        return `${h}p${knownFps || 60}`;
    }
    // One-off display refresh measurement (rAF cadence) — decides whether the
    // 4K rung may promise real 120/144 fps instead of the source rate.
    (function startDisplayHzProbe() {
        let last = 0;
        const deltas = [];
        const step = (now) => {
            if (last) deltas.push(now - last);
            last = now;
            if (deltas.length < 45) { requestAnimationFrame(step); return; }
            const sorted = deltas.slice().sort((a, b) => a - b);
            const mid = sorted[Math.floor(sorted.length / 2)];
            if (!displayHzOverride) {
                const hz = mid > 0 ? Math.round(1000 / mid) : 0;
                if (hz > measuredDisplayHz) measuredDisplayHz = hz;
            }
            if (updateQualityUI) updateQualityUI();
        };
        requestAnimationFrame(step);
    })();

    function resetFpsSampler() {
        knownFps = null;
        fpsSamples = [];
        fpsLastMediaTime = 0;
        fpsSampling = false;
    }

    function startFpsSampler() {
        if (fpsSampling) return;
        if (typeof video.requestVideoFrameCallback !== 'function') return;
        fpsSampling = true;
        const step = (now, meta) => {
            if (!fpsSampling) return;
            if (meta && typeof meta.mediaTime === 'number') {
                if (fpsLastMediaTime) {
                    const delta = meta.mediaTime - fpsLastMediaTime;
                    if (delta > 0.001 && delta < 0.2) fpsSamples.push(delta);
                }
                fpsLastMediaTime = meta.mediaTime;
            }
            if (fpsSamples.length >= 30) {
                const sorted = fpsSamples.slice(-30).sort((a, b) => a - b);
                const mid = sorted[Math.floor(sorted.length / 2)];
                const fps = Math.round(1 / mid);
                fpsSampling = false;
                // Snap to the nearest standard rate (30fps content measured as 31 is still 30)
                const standards = [10, 15, 24, 25, 30, 48, 50, 60, 90, 120, 144, 240];
                let snapped = fps;
                for (const std of standards) {
                    if (Math.abs(fps - std) <= 2) { snapped = std; break; }
                }
                if (snapped >= 10 && snapped <= 240 && snapped !== knownFps) {
                    knownFps = snapped;
                    if (updateQualityUI) updateQualityUI();
                }
                return;
            }
            video.requestVideoFrameCallback(step);
        };
        video.requestVideoFrameCallback(step);
    }

    function masterTierFor(minDim) {
        let best = null;
        for (const t of QUALITY_LADDER) {
            if (minDim * 1.05 >= t) best = t;
        }
        return best || Math.max(2, Math.floor(minDim));
    }

    function computeQualities() {
        stopQualityProxy();
        const vw = video.videoWidth || 0;
        const vh = video.videoHeight || 0;
        const minDim = Math.min(vw, vh);
        sourceMinDim = minDim;
        if (!minDim) {
            availableQualities = [{ key: 'original', label: '0', height: 0, original: true }];
            currentQualityKey = 'original';
            return;
        }
        // Snap the source to the standard ladder (a 960-class source reads 720p, etc.)
        const orig = masterTierFor(minDim);
        const list = [{ key: 'original', label: String(orig), height: orig, original: true }];
        const seen = new Set(['original']);
        // Rungs below the source (downscale).
        for (const t of QUALITY_ARTIFICIAL_DOWN) {
            if (t < orig && !seen.has(String(t))) {
                list.push({ key: String(t), label: String(t), height: t, original: false });
                seen.add(String(t));
            }
        }
        // Upscale tiers — offered even when the source is below them
        // (canvas upscale; the source stays untouched).
        for (const t of QUALITY_ARTIFICIAL_UP) {
            if (t > orig && !seen.has(String(t))) {
                list.push({ key: String(t), label: String(t), height: t, original: false });
                seen.add(String(t));
            }
        }
        // Display: largest first, original sits at its natural rung.
        list.sort((a, b) => b.height - a.height);
        availableQualities = list;
        currentQualityKey = 'original';
    }

    function updateQualityUI() {
        qualityOptions.innerHTML = '';
        availableQualities.forEach((q) => {
            const opt = document.createElement('div');
            opt.className = 'settings-option' + (q.key === currentQualityKey ? ' active' : '') + (q.original ? ' quality-original' : '');
            opt.setAttribute('data-quality', q.key);
            opt.setAttribute('role', 'menuitem');
            opt.setAttribute('tabindex', '0');
            const main = document.createElement('span');
            main.className = 'quality-main';
            const name = document.createElement('span');
            name.className = 'quality-name';
            name.textContent = qualityLabel(q.height);
            main.appendChild(name);
            const overline = qualityOverline(q.height);
            if (overline) {
                const over = document.createElement('span');
                over.className = 'quality-overline';
                over.textContent = overline;
                main.appendChild(over);
            }
            opt.appendChild(main);
            opt.addEventListener('click', () => {
                switchQuality(q.key);
                switchSettingsView(settingsMain);
            });
            qualityOptions.appendChild(opt);
        });
        const active = availableQualities.find((q) => q.key === currentQualityKey) || availableQualities[0];
        setChevronValue(currentQualityLabel, active ? qualityLabel(active.height) : 'Авто');
        updateQualityBadge(active ? active.height : 0);
    }

    // Gear badge — HD for 1080+, 4K for 2160, none below 1080
    function updateQualityBadge(rungHeight) {
        if (!settingsQualityBadge) return;
        const h = Number(rungHeight) || 0;
        let text = '';
        if (h >= 2160) text = '4K';
        else if (h >= 1080) text = 'HD';
        settingsQualityBadge.textContent = text;
        settingsQualityBadge.classList.toggle('hidden', !text);
    }

    // =========================================================
    //  GPU enhancement — the upscale tiers run a real unsharp
    //  mask + filmic contrast/saturation on the GPU, so the picture
    //  genuinely looks sharper (never just a blurry enlargement)
    // =========================================================
    let glCtx = null;
    let glProgram = null;
    let glTex = null;
    let glLocations = null;
    let glUsable = null;

    function ensureEnhanceGL() {
        if (glUsable !== null) return glUsable;
        const gl = qualityCanvas.getContext('webgl', {
            alpha: false, antialias: false, depth: false, stencil: false,
            preserveDrawingBuffer: false, powerPreference: 'high-performance'
        });
        if (!gl) { glUsable = false; return false; }
        const vsSource = 'attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';
        const fsSource = `precision highp float;
uniform sampler2D uTex;
uniform float uDegrade;
uniform float uBlockPx;
uniform float uQuant;
uniform float uMosquito;
uniform float uNoise;
uniform float uChroma;
uniform float uFlatten;
uniform float uDeblock;
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;
float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}
float lumc(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
void main() {
    vec3 c = texture2D(uTex, vUv).rgb;
    vec3 outc;
    if (uDegrade > 0.5) {
        // Low-bitrate emulation modelled on a block DCT codec (H.264/VP9 as used
        // for YouTube 144p-480p): flat blocks collapse to a single DC colour, real
        // edges keep their residual, the in-loop deblocking filter softens block
        // borders, chroma is stored far below luma resolution (4:2:0), levels are
        // coarsely quantized (banding) and edges shimmer with mosquito noise.
        vec2 res = uResolution;
        float bpx = uBlockPx;
        vec2 px = vUv * res;
        vec2 blockCoord = px / bpx;
        vec2 blockIdx = floor(blockCoord);
        // Block DC colour + variance: 8x8 taps spanning the whole block
        vec3 dcAcc = vec3(0.0);
        float sumL = 0.0, sumL2 = 0.0;
        vec2 stepUV = vec2(bpx / 8.0) / res;
        vec2 origin = (blockIdx * bpx) / res + stepUV * 0.5;
        for (int y = 0; y < 8; y++) {
            for (int x = 0; x < 8; x++) {
                vec3 s2 = texture2D(uTex, origin + vec2(float(x), float(y)) * stepUV).rgb;
                dcAcc += s2;
                float L2 = lumc(s2);
                sumL += L2;
                sumL2 += L2 * L2;
            }
        }
        vec3 dcC = dcAcc / 64.0;
        float dcLum = sumL / 64.0;
        float variance = max(0.0, sumL2 / 64.0 - dcLum * dcLum);
        // Near-flat blocks become single-colour quadrants — the signature look
        float flatMix = 1.0 - smoothstep(0.0006, 0.0060, variance);

        // Cross-border bilinear of the 4 neighbouring block DCs — what the
        // deblocking filter leaves behind: borders are soft, never hard grids
        vec2 fcell = fract(blockCoord - 0.5);
        vec2 i00 = floor(blockCoord - 0.5);
        vec3 dc00 = texture2D(uTex, (i00 + 0.5) * bpx / res).rgb;
        vec3 dc10 = texture2D(uTex, (i00 + vec2(1.5, 0.5)) * bpx / res).rgb;
        vec3 dc01 = texture2D(uTex, (i00 + vec2(0.5, 1.5)) * bpx / res).rgb;
        vec3 dc11 = texture2D(uTex, (i00 + vec2(1.5, 1.5)) * bpx / res).rgb;
        vec3 base = mix(mix(dc00, dc10, fcell.x), mix(dc01, dc11, fcell.x), fcell.y);

        // Flat blocks -> flat quadrants; structured blocks keep texture
        vec3 rec = mix(c, dcC, clamp(flatMix * uFlatten, 0.0, 1.0));

        // Deblocking: only near the block borders, pull toward the cross-border field
        vec2 bEdge = abs(fract(blockCoord) - 0.5) * 2.0;
        float border = smoothstep(0.45, 0.95, max(bEdge.x, bEdge.y));
        rec = mix(rec, base, uDeblock * border);

        // Chroma is stored at a fraction of luma resolution and bleeds across
        // luma edges (4:2:0) — the smeared-colour-halo look
        float Luma = lumc(rec);
        vec3 coFine = rec - vec3(Luma);
        vec3 coCoarse = base - vec3(lumc(base));
        rec = vec3(Luma) + mix(coFine, coCoarse, uChroma);

        // Mosquito noise: flickering speckle that hugs strong edges. Each block
        // breathes out of phase — low-bitrate streams never sit still.
        float Lx1 = lumc(texture2D(uTex, vUv + vec2(1.6 / res.x, 0.0)).rgb);
        float Lx0 = lumc(texture2D(uTex, vUv - vec2(1.6 / res.x, 0.0)).rgb);
        float Ly1 = lumc(texture2D(uTex, vUv + vec2(0.0, 1.6 / res.y)).rgb);
        float Ly0 = lumc(texture2D(uTex, vUv - vec2(0.0, 1.6 / res.y)).rgb);
        float grad = abs(Lx1 - Lx0) + abs(Ly1 - Ly0);
        float edge = smoothstep(0.07, 0.45, grad);
        float pump = 0.6 + 0.8 * (0.5 + 0.5 * sin(uTime * 1.5 + hash21(blockIdx + 17.0) * 6.2831));
        float mz = (hash21(floor(px) + vec2(fract(uTime * 6.7) * 149.0, fract(uTime * 9.1) * 271.0)) - 0.5)
                    * uMosquito * edge * pump;
        rec += mz;

        // Coarse quantization of the level range — visible banding in gradients
        rec = floor(rec * uQuant + 0.5) / uQuant;

        // Low noise floor
        float n = (hash21(floor(px) + vec2(fract(uTime * 11.0) * 63.0, fract(uTime * 15.0) * 191.0)) - 0.5) * uNoise;
        rec += n;
        outc = clamp(rec, 0.0, 1.0);
    } else {
        // Neutral pass — the quality proxy never recolors the video.
        outc = c;
    }
    gl_FragColor = vec4(outc, 1.0);
}`;
        const compile = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.warn('Enhance shader failed:', gl.getShaderInfoLog(shader));
                return null;
            }
            return shader;
        };
        const vs = compile(gl.VERTEX_SHADER, vsSource);
        const fs = compile(gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) { glUsable = false; return false; }
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.warn('Enhance program failed:', gl.getProgramInfoLog(program));
            glUsable = false;
            return false;
        }
        gl.useProgram(program);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(program, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        glTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        glLocations = {
            uDegrade: gl.getUniformLocation(program, 'uDegrade'),
            uBlockPx: gl.getUniformLocation(program, 'uBlockPx'),
            uQuant: gl.getUniformLocation(program, 'uQuant'),
            uMosquito: gl.getUniformLocation(program, 'uMosquito'),
            uNoise: gl.getUniformLocation(program, 'uNoise'),
            uChroma: gl.getUniformLocation(program, 'uChroma'),
            uFlatten: gl.getUniformLocation(program, 'uFlatten'),
            uDeblock: gl.getUniformLocation(program, 'uDeblock'),
            uTime: gl.getUniformLocation(program, 'uTime'),
            uResolution: gl.getUniformLocation(program, 'uResolution'),
        };
        glCtx = gl;
        glProgram = program;
        glUsable = true;
        return true;
    }

    // Artificial low rungs: model a real low-bitrate YouTube/Twitch stream —
    // flat quantized blocks with softened (deblocked) borders, 4:2:0 chroma
    // bleeding, banding from coarse levels, breathing mosquito noise — not a
    // clean resample and not uniform fog.
    function degradeParamsForHeight(targetH) {
        if (targetH <= 150) return { block: 16, flatten: 0.95, deblock: 0.50, chroma: 0.80, quant: 12, mosquito: 0.13, noise: 0.032, sat: 0.78, contrast: 0.93, sharp: 0, warm: 0 };
        if (targetH <= 260) return { block: 12, flatten: 0.80, deblock: 0.38, chroma: 0.60, quant: 16, mosquito: 0.11, noise: 0.024, sat: 0.85, contrast: 0.955, sharp: 0, warm: 0 };
        if (targetH <= 380) return { block: 8,  flatten: 0.55, deblock: 0.25, chroma: 0.42, quant: 24, mosquito: 0.07, noise: 0.015, sat: 0.90, contrast: 0.97, sharp: 0, warm: 0 };
        return { block: 8, flatten: 0.40, deblock: 0.18, chroma: 0.32, quant: 28, mosquito: 0.04, noise: 0.010, sat: 0.92, contrast: 0.98, sharp: 0, warm: 0 };
    }

    const degradeState = { active: false, params: null };
    const blockCanvas = document.createElement('canvas');
    const noiseTile = document.createElement('canvas');
    noiseTile.width = 96; noiseTile.height = 96;
    (function makeNoiseTile() {
        const nctx = noiseTile.getContext('2d');
        const img = nctx.createImageData(96, 96);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = 96 + Math.floor(Math.random() * 96);
            img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
        }
        nctx.putImageData(img, 0, 0);
    })();

    function drawQualityFrameGL() {
        const gl = glCtx;
        qualityCanvas.style.filter = 'none';
        gl.useProgram(glProgram);
        gl.bindTexture(gl.TEXTURE_2D, glTex);
        try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        } catch (_) {
            return; // frame not decodable yet
        }
        gl.viewport(0, 0, qualityCanvas.width, qualityCanvas.height);
        const p = (degradeState.active && degradeState.params) || { block: 8, quant: 32, mosquito: 0, noise: 0, chroma: 0, flatten: 0, deblock: 0 };
        gl.uniform1f(glLocations.uDegrade, degradeState.active ? 1 : 0);
        gl.uniform1f(glLocations.uBlockPx, p.block);
        gl.uniform1f(glLocations.uQuant, p.quant);
        gl.uniform1f(glLocations.uMosquito, p.mosquito || 0);
        gl.uniform1f(glLocations.uNoise, p.noise || 0);
        gl.uniform1f(glLocations.uChroma, p.chroma || 0);
        gl.uniform1f(glLocations.uFlatten, p.flatten || 0);
        gl.uniform1f(glLocations.uDeblock, p.deblock || 0);
        gl.uniform1f(glLocations.uTime, (performance.now() % 100000) / 1000);
        gl.uniform2f(glLocations.uResolution, qualityCanvas.width, qualityCanvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function drawQualityFrame2d() {
        if (!qualityCtx) qualityCtx = qualityCanvas.getContext('2d', { alpha: false });
        if (!qualityCtx) return;
        const w = qualityCanvas.width, h = qualityCanvas.height;
        if (degradeState.active && degradeState.params) {
            const p = degradeState.params;
            // Block DCT look without WebGL: coarse DC grid + level quantization
            const bw = Math.max(2, Math.round(w / p.block));
            const bh = Math.max(2, Math.round(h / p.block));
            blockCanvas.width = bw; blockCanvas.height = bh;
            const bctx = blockCanvas.getContext('2d', { alpha: false, willReadFrequently: true });
            bctx.imageSmoothingEnabled = true;
            bctx.imageSmoothingQuality = 'high';
            bctx.filter = 'none';
            bctx.drawImage(video, 0, 0, bw, bh);
            try {
                const img = bctx.getImageData(0, 0, bw, bh);
                const d = img.data;
                const levels = p.quant;
                const step = 255 / levels;
                const bleed = p.chroma;
                for (let i = 0; i < d.length; i += 4) {
                    let r = d[i], g = d[i + 1], b = d[i + 2];
                    // 4:2:0-style chroma bleed: pull colour toward the local grey
                    const gray = r * 0.2126 + g * 0.7152 + b * 0.0722;
                    r = gray + (r - gray) * (1 - bleed * 0.55);
                    g = gray + (g - gray) * (1 - bleed * 0.55);
                    b = gray + (b - gray) * (1 - bleed * 0.55);
                    // Coarse level quantization -> banding
                    r = Math.round(Math.round(r / step) * step);
                    g = Math.round(Math.round(g / step) * step);
                    b = Math.round(Math.round(b / step) * step);
                    d[i] = r; d[i + 1] = g; d[i + 2] = b;
                }
                bctx.putImageData(img, 0, 0);
            } catch (_) { /* willReadFrequently unsupported — blocky grid still fine */ }
            qualityCtx.filter = `saturate(${p.sat}) contrast(${p.contrast})`;
            qualityCtx.imageSmoothingEnabled = true;
            qualityCtx.imageSmoothingQuality = 'high';
            qualityCtx.drawImage(blockCanvas, 0, 0, w, h);
            qualityCtx.filter = 'none';
            // Grain
            qualityCtx.globalAlpha = Math.min(0.5, p.noise * 2.2);
            const pat = qualityCtx.createPattern(noiseTile, 'repeat');
            if (pat) { qualityCtx.fillStyle = pat; qualityCtx.fillRect(0, 0, w, h); }
            qualityCtx.globalAlpha = 1;
            qualityCanvas.style.filter = 'none';
            return;
        }
        qualityCtx.filter = 'none';
        qualityCtx.imageSmoothingEnabled = true;
        qualityCtx.imageSmoothingQuality = 'high';
        qualityCtx.drawImage(video, 0, 0, w, h);
        qualityCanvas.style.filter = 'none';
    }

    let qualityCanvasHeight = 0;

    // ---------- 4K interpolation (2160p rung, non-4K sources only) ----------
    // Crossfade between consecutive decoded frames — a "motion smoothing" TV
    // mode, not a recolor: the video itself is never edited. Engaged only on
    // high-refresh displays (>=100 Hz measured via rAF); the fps label then
    // reflects the real refresh rate. Native-4K sources always keep native fps.
    const interpolationState = {
        active: false,
        prev: null, cur: null,
        pctx: null, cctx: null,
        lastFrameTime: -1,
        rafId: 0
    };

    // Dedicated output canvas for interpolation — the shared #quality-canvas may
    // already hold a WebGL context (context types are sticky), so interpolation
    // always runs in 2D on its own element. Same class -> same CSS behaviour.
    let interpCanvasEl = null;
    let interpCtx = null;
    function getInterpCanvas() {
        if (!interpCanvasEl) {
            interpCanvasEl = document.createElement('canvas');
            interpCanvasEl.className = 'quality-canvas';
            interpCanvasEl.setAttribute('aria-hidden', 'true');
            qualityCanvas.parentNode.insertBefore(interpCanvasEl, qualityCanvas);
        }
        return interpCanvasEl;
    }

    function startInterpolationProxy() {
        if (!video.videoWidth || !video.videoHeight) { stopQualityProxy(); return; }
        stopQualityProxy();
        const w = video.videoWidth, h = video.videoHeight;
        if (!interpolationState.prev) {
            interpolationState.prev = document.createElement('canvas');
            interpolationState.cur = document.createElement('canvas');
            interpolationState.pctx = interpolationState.prev.getContext('2d', { alpha: false });
            interpolationState.cctx = interpolationState.cur.getContext('2d', { alpha: false });
        }
        interpolationState.prev.width = w; interpolationState.prev.height = h;
        interpolationState.cur.width = w; interpolationState.cur.height = h;
        const cv = getInterpCanvas();
        // Canvas stays at SOURCE resolution — the CSS upscales it losslessly;
        // we only crossfade, so no processing cost scales with output size.
        cv.width = w; cv.height = h;
        if (!interpCtx) interpCtx = cv.getContext('2d', { alpha: false });
        qualityCanvasHeight = 2160;
        qualityProxyOn = true;
        interpolationState.active = true;
        interpolationState.lastFrameTime = video.currentTime;
        interpolationState.cctx.drawImage(video, 0, 0, w, h);
        interpolationState.pctx.drawImage(interpolationState.cur, 0, 0);
        cv.classList.add('active');
        video.classList.add('video-proxied');
        const frameInterval = 1 / Math.max(1, knownFps || 60);
        const tick = () => {
            if (!interpolationState.active) return;
            const t = video.currentTime;
            if (t < interpolationState.lastFrameTime - 0.001) {
                // seek / replay — re-prime both buffers at the new position
                interpolationState.cctx.drawImage(video, 0, 0, w, h);
                interpolationState.pctx.drawImage(interpolationState.cur, 0, 0);
                interpolationState.lastFrameTime = t;
            } else if (t - interpolationState.lastFrameTime >= frameInterval) {
                // advance one source frame: prev <- cur, cur <- video
                interpolationState.pctx.drawImage(interpolationState.cur, 0, 0);
                interpolationState.cctx.drawImage(video, 0, 0, w, h);
                interpolationState.lastFrameTime = t;
            }
            const alpha = Math.max(0, Math.min(1, (t - interpolationState.lastFrameTime) / frameInterval));
            interpCtx.globalAlpha = 1;
            interpCtx.drawImage(interpolationState.prev, 0, 0);
            interpCtx.globalAlpha = alpha;
            interpCtx.drawImage(interpolationState.cur, 0, 0);
            interpCtx.globalAlpha = 1;
            interpolationState.rafId = requestAnimationFrame(tick);
        };
        interpolationState.rafId = requestAnimationFrame(tick);
    }

    function stopInterpolationProxy() {
        interpolationState.active = false;
        if (interpolationState.rafId) cancelAnimationFrame(interpolationState.rafId);
        interpolationState.rafId = 0;
        if (interpCanvasEl) interpCanvasEl.classList.remove('active');
    }

    function drawQualityFrame() {
        if (interpolationState.active) return; // interpolation has its own frame loop
        if (ensureEnhanceGL()) drawQualityFrameGL();
        else drawQualityFrame2d();
    }

    function startQualityProxy(height) {
        if (!height || !video.videoWidth || !video.videoHeight) return;
        stopQualityProxy();
        const minDim = Math.min(video.videoWidth, video.videoHeight);
        const scale = height / minDim;
        if (scale >= 0.999) { stopQualityProxy(); return; } // 1:1 — the file plays as-is
        degradeState.active = true;
        degradeState.params = degradeParamsForHeight(height);
        qualityCanvas.width = Math.max(2, Math.round(video.videoWidth * scale));
        qualityCanvas.height = Math.max(2, Math.round(video.videoHeight * scale));
        qualityCanvasHeight = height;
        qualityProxyOn = true;
        qualityCanvas.classList.add('active');
        video.classList.add('video-proxied');

        if (typeof video.requestVideoFrameCallback === 'function') {
            const frame = () => {
                if (!qualityProxyOn) return;
                drawQualityFrame();
                video.requestVideoFrameCallback(frame);
            };
            video.requestVideoFrameCallback(frame);
        } else {
            const raf = () => {
                if (!qualityProxyOn) return;
                drawQualityFrame();
                requestAnimationFrame(raf);
            };
            requestAnimationFrame(raf);
        }
        // Frame pumps for the moments rVFC never fires (ended/seek/no-frame-yet):
        // paint once the video can actually deliver a frame.
        drawQualityFrame();
    }

    const paintQualityFrameOnce = () => { if (qualityProxyOn) drawQualityFrame(); };
    ['loadeddata', 'seeked', 'play', 'canplay'].forEach((evt) => video.addEventListener(evt, paintQualityFrameOnce));
    video.addEventListener('ended', () => window.setTimeout(paintQualityFrameOnce, 150));

    function stopQualityProxy() {
        stopInterpolationProxy();
        qualityProxyOn = false;
        degradeState.active = false;
        degradeState.params = null;
        qualityCanvas.classList.remove('active');
        video.classList.remove('video-proxied');
    }

    function switchQuality(qualityKey) {
        if (qualityKey === currentQualityKey) return;
        const target = availableQualities.find((q) => q.key === qualityKey);
        if (!target) return;
        currentQualityKey = qualityKey;
        if (target.original) {
            stopQualityProxy();
        } else {
            const srcMin = Math.min(video.videoWidth || 0, video.videoHeight || 0);
            if (srcMin && target.height > srcMin) {
                // Upscale rung — pixels stay untouched (CSS/compositor scaling);
                // 4K of a non-4K source interpolates to the display's refresh rate.
                if (target.height === 2160 && srcMin < 2160 && measuredDisplayHz >= 100) {
                    startInterpolationProxy();
                } else {
                    stopQualityProxy();
                }
            } else {
                // Downscale rung — the low-bitrate proxy runs at reduced size
                startQualityProxy(target.height);
            }
        }
        updateQualityUI();
    }

    video.addEventListener('seeked', () => {
        if (qualityProxyOn) drawQualityFrame();
    });

    // =========================================================
    //  Subtitles
    // =========================================================
    function parseTimestamp(timeStr) {
        const cleaned = String(timeStr).trim().replace(',', '.');
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
            .replace(/<[^>]*>/g, '')
            .replace(/\{[^}]*\}/g, '')
            .trim();
    }

    function parseVTT(text) {
        const cues = [];
        const normalized = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
        const lines = normalized.split('\n');
        let i = 0;

        if (lines[i] && lines[i].trim().toUpperCase().startsWith('WEBVTT')) {
            i++;
        }

        while (i < lines.length) {
            while (i < lines.length && lines[i].trim() === '') i++;
            if (i >= lines.length) break;

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
        const normalized = String(text).replace(/(\d{1,2}:\d{2}:\d{2}),(\d{1,3})/g, '$1.$2');
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
        offOption.textContent = 'Выкл.';
        subtitlesOptionsList.appendChild(offOption);

        subtitleTracks.forEach((track) => {
            const opt = document.createElement('div');
            opt.className = 'settings-option' + (track.id === currentSubtitleTrackId ? ' active' : '');
            opt.setAttribute('data-sub', track.id);
            opt.textContent = track.name;
            subtitlesOptionsList.appendChild(opt);
        });

        if (currentSubtitleTrackId === 'off') {
            setChevronValue(currentSubLabel, 'Выкл.');
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
    //  Volume
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

    function paintVolumeSlider(percent) {
        const p = Math.max(0, Math.min(100, Math.round(percent)));
        volumeSlider.value = String(p);
        volumeSlider.style.setProperty('--fill', p + '%');
        if (tkVolumeSlider) {
            tkVolumeSlider.value = String(p);
            tkVolumeSlider.style.setProperty('--fill', p + '%');
        }
        if (tkVolumeValue) tkVolumeValue.textContent = p + '%';
    }

    function setVolume(vol) {
        const clamped = Math.max(0, Math.min(1, vol));
        video.volume = clamped;
        paintVolumeSlider(clamped * 100);
        isMuted = clamped === 0;
        if (clamped > 0 && audioCtx) resumeAudioContext();
        updateVolumeIcon(clamped);
    }

    volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        if (val > 0) isMuted = false;
        setVolume(val);
    });

    btnMute.addEventListener('click', () => {
        if (isMuted || video.volume === 0) {
            isMuted = false;
            setVolume(volumeBeforeMute > 0 ? volumeBeforeMute : 0.5);
        } else {
            volumeBeforeMute = video.volume;
            isMuted = true;
            video.volume = 0;
            paintVolumeSlider(0);
            updateVolumeIcon(0);
        }
    });

    btnVolumeBoost.addEventListener('click', () => {
        if (!ensureBoostGraph()) {
            showToast('Усиление громкости не поддерживается в этом браузере');
            return;
        }
        resumeAudioContext();
        isBoosted = !isBoosted;
        btnVolumeBoost.classList.toggle('active', isBoosted);
        applyBoostGain();
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
    //  Theater mode (affects the YouTube page layout; in Плеер
    //  mode the player is already edge-to-edge)
    // =========================================================
    function setTheater(on) {
        isTheater = on;
        document.body.classList.toggle('theater-mode', on);
        btnTheater.classList.toggle('active', on);
        btnTheater.setAttribute('aria-pressed', on ? 'true' : 'false');
        const label = on ? 'Режим просмотра по умолчанию (t)' : 'Широкий экран (t)';
        btnTheater.setAttribute('data-tooltip', label);
        btnTheater.setAttribute('aria-label', label);
    }

    function resetTheater() {
        setTheater(false);
    }

    btnTheater.addEventListener('click', () => setTheater(!isTheater));

    // =========================================================
    //  Fullscreen
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
        const fsLabel = isFullscreen ? 'Выйти из полноэкранного режима (f)' : 'На весь экран (f)';
        btnFullscreen.setAttribute('data-tooltip', fsLabel);
        btnFullscreen.setAttribute('aria-label', fsLabel);
    });

    // =========================================================
    //  Settings menu
    // =========================================================
    const settingsGearIcon = $('settings-gear-icon');

    function openSettingsMenu(open, view) {
        settingsMenu.classList.toggle('hidden', !open);
        btnSettings.classList.toggle('active', open);
        if (settingsGearIcon) settingsGearIcon.classList.toggle('gear-open', open);
        if (open) {
            clearTimeout(idleTimer);
            document.body.classList.remove('idle');
            switchSettingsView(view || settingsMain);
        } else {
            scheduleIdle();
            leaveSheetMode();
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
            else if (action === 'sleep') {
                renderSleepOptions();
                paintSleepLabel();
                switchSettingsView(settingsSleepView);
            }
        });
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
    });

    settingsMenu.querySelectorAll('.back-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (settingsFromSheet) {
                settingsMenu.classList.add('hidden');
                if (btnSettings) btnSettings.classList.remove('active');
                if (settingsGearIcon) settingsGearIcon.classList.remove('gear-open');
                leaveSheetMode();
                openShareSheet(true);
                return;
            }
            const target = document.getElementById(btn.getAttribute('data-back'));
            if (target) switchSettingsView(target);
        });
    });

    // =========================================================
    //  Keyboard shortcuts — via e.code so they work on any layout
    // =========================================================
    function isTypingTarget(el) {
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }

    window.addEventListener('keydown', (e) => {
        if (isTypingTarget(document.activeElement)) return;

        const code = e.code;
        const key = (e.key || '').toLowerCase();
        // Russian (ЙЦУКЕН) layout — e.code is already layout-independent, so map
        // the physical letters by e.key as a fallback for non-standard layouts.
        const RU_TO_CODE = {
            'е': 'KeyT',  // Т → theater
            'л': 'KeyK',  // К → play/pause
            'а': 'KeyF',  // Ф → fullscreen
            'ь': 'KeyM',  // Ь → mute
            'с': 'KeyC',  // С → subtitles
            'о': 'KeyJ',  // О → back 10
            'д': 'KeyL',  // Д → forward 10
            'б': 'Comma', // Б → prev frame
            'ю': 'Period',// Ю → next frame
        };
        const effective = RU_TO_CODE[key] || code;

        pokeUI();

        if (code === 'Escape') {
            if (document.body.classList.contains('tk-drawer-open')) {
                closeCommentsDrawer();
                e.preventDefault();
                return;
            }
            if (tkShareSheet && tkShareSheet.classList.contains('open')) {
                closeShareSheet();
                e.preventDefault();
                return;
            }
            if (!settingsMenu.classList.contains('hidden')) {
                const backToSheet = settingsFromSheet;
                openSettingsMenu(false);
                if (backToSheet) openShareSheet(true);
                e.preventDefault();
            }
            return;
        }

        switch (effective) {
            case 'Space':
            case 'KeyK':
                e.preventDefault();
                togglePlayPause();
                return;
            case 'KeyF':
                e.preventDefault();
                toggleFullscreen();
                return;
            case 'KeyT':
                if (currentMode === 'youtube') {
                    e.preventDefault();
                    setTheater(!isTheater);
                }
                return;
            case 'KeyM':
                e.preventDefault();
                btnMute.click();
                return;
            case 'KeyC':
                e.preventDefault();
                btnSubtitles.click();
                return;
            case 'KeyJ':
                e.preventDefault();
                skipTime(-10);
                return;
            case 'KeyL':
                e.preventDefault();
                skipTime(10);
                return;
            case 'ArrowRight':
                e.preventDefault();
                skipTime(5);
                return;
            case 'ArrowLeft':
                e.preventDefault();
                skipTime(-5);
                return;
            case 'ArrowUp':
                e.preventDefault();
                setVolume(video.volume + 0.05);
                if (isMuted && video.volume > 0) isMuted = false;
                updateVolumeIcon(video.volume);
                return;
            case 'ArrowDown':
                e.preventDefault();
                setVolume(video.volume - 0.05);
                return;
            case 'Home':
                if (hasDuration()) { e.preventDefault(); video.currentTime = 0; }
                return;
            case 'End':
                if (hasDuration()) { e.preventDefault(); video.currentTime = video.duration; }
                return;
            case 'Comma': // «,» / «Б» on Russian layout — previous frame
                e.preventDefault();
                stepFrame(-1);
                return;
            case 'Period': // «.» / «Ю» on Russian layout — next frame
                e.preventDefault();
                stepFrame(1);
                return;
            default:
                break;
        }

        if (/^(Digit|Numpad)[0-9]$/.test(code) && hasDuration()) {
            e.preventDefault();
            const digit = parseInt(code.slice(-1), 10);
            video.currentTime = (digit / 10) * video.duration;
            return;
        }
    });

    // =========================================================
    //  Init
    // =========================================================
    paintVolumeSlider((video.volume || 1) * 100);
    paintAutoplay();
    applyStudioLight();
    paintSleepLabel();
    renderSleepOptions();

    setMode(storageGet(MODE_KEY, 'youtube'), { persist: false });
    updateQualityUI();
    updateSubtitlesMenu();
    setVolume(1);
    setPlaybackSpeed(1);
    renderSuggestions();
    refreshSocialUI();
    renderComments();
    // Signal a fully-initialized page (used by the watchdog banner in index.html)
    window.__wmvReady = true;
    try { clearTimeout(window.__wmvWatchdog); } catch (_) { /* ignore */ }
});
