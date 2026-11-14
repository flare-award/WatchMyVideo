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
    const qualityFileInput = $('quality-file-input');
    const btnLoadDemo = $('btn-load-demo');

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
    const loopCheckbox = $('loop-checkbox');
    const speedOptions = $('speed-options');
    const customSpeedInput = $('custom-speed-input');
    const btnApplyCustomSpeed = $('btn-apply-custom-speed');
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
    const modePillButtons = Array.from(document.querySelectorAll('.mode-pill-btn'));

    // ---- State ----
    const DEMO_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    const DEMO_KEY = 'demo:bigbuckbunny';
    const IDLE_DELAY_MS = 1600;
    const ESTIMATED_FPS = 30;

    let isTheater = false;
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
    let currentFileUrl = null; // object URL or demo URL (session-scoped)
    let pendingSeekTime = null;
    let wasPlayingBeforeQualitySwitch = false;

    // Web Audio — created lazily ONLY when the user enables boost
    let audioCtx = null;
    let sourceNode = null;
    let gainNode = null;

    // Quality management
    let qualitySources = {};
    let currentQualityKey = 'original';

    // Subtitles
    let subtitleTracks = [];
    let currentSubtitleTrackId = 'off';

    // Suggestions feed (session-scoped)
    let recentVideos = [];

    // =========================================================
    //  Storage helpers (localStorage, private-mode safe)
    // =========================================================
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
    function isOverlayOpen() {
        return !settingsMenu.classList.contains('hidden') ||
               document.body.classList.contains('tk-drawer-open');
    }

    function clearIdle() {
        clearTimeout(idleTimer);
        if (document.body.classList.contains('idle')) {
            document.body.classList.remove('idle');
        }
    }

    function scheduleIdle() {
        clearTimeout(idleTimer);
        if (video.paused || isOverlayOpen() || isDraggingProgress) {
            return;
        }
        idleTimer = setTimeout(() => {
            if (!video.paused && !isOverlayOpen() && !isDraggingProgress) {
                document.body.classList.add('idle');
            }
        }, IDLE_DELAY_MS);
    }

    function pokeUI() {
        clearIdle();
        scheduleIdle();
    }

    ['mousemove', 'wheel'].forEach((evt) => {
        document.addEventListener(evt, pokeUI, { passive: true });
    });
    ['mousedown', 'touchstart', 'keydown'].forEach((evt) => {
        document.addEventListener(evt, pokeUI, { passive: true });
    });
    document.addEventListener('mouseleave', () => {
        if (!video.paused && !isOverlayOpen()) {
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
        }
        if (persist) storageSet(MODE_KEY, mode);
        pokeUI();
    }

    modePillButtons.forEach((btn) => {
        btn.addEventListener('click', () => setMode(btn.getAttribute('data-mode')));
    });

    // =========================================================
    //  Loading videos (file input / drag & drop / demo)
    // =========================================================
    function revokeBlobUrls(map) {
        Object.values(map).forEach((url) => {
            if (typeof url === 'string' && url.startsWith('blob:')) {
                try { URL.revokeObjectURL(url); } catch (_) { /* ignore */ }
            }
        });
    }

    function startPlaybackSession(sourceUrl, qualityMap, qualityKey, videoKey, fileName, fileSize) {
        revokeBlobUrls(qualitySources);
        qualitySources = qualityMap;
        currentQualityKey = qualityKey;
        currentVideoKey = videoKey;
        currentFileUrl = sourceUrl;
        currentFileName = fileName || 'Видео';
        currentFileSize = fileSize || 0;

        video.src = sourceUrl;
        video.load();
        video.playbackRate = playbackSpeed;
        video.loop = isLooping;

        welcomeScreen.classList.add('hidden');
        appShell.classList.remove('hidden');
        replayOverlay.classList.add('hidden');

        const playPromise = video.play();
        if (playPromise && playPromise.catch) {
            playPromise.catch(() => updatePlayPauseButton(false));
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
        const looksLikeVideo = file.type.startsWith('video/') || /\.(mkv|avi|mov|webm|mp4|ogv|m4v)$/i.test(file.name);
        if (!looksLikeVideo) {
            showToast('Пожалуйста, выберите видеофайл');
            return;
        }
        const url = URL.createObjectURL(file);
        const key = `file:${file.name}:${file.size}`;
        registerRecentVideo({ key, title: file.name, url, isDemo: false, size: file.size });
        startPlaybackSession(url, { original: url }, 'original', key, file.name, file.size);
    }

    function loadDemoVideo() {
        registerRecentVideo({ key: DEMO_KEY, title: 'Big Buck Bunny — демо (Blender Foundation)', url: DEMO_VIDEO_URL, isDemo: true, size: 0 });
        startPlaybackSession(DEMO_VIDEO_URL, { original: DEMO_VIDEO_URL }, 'original', DEMO_KEY, 'Big Buck Bunny — демо', 0);
    }

    videoFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) loadVideoFromFile(file);
        e.target.value = '';
    });

    btnLoadDemo.addEventListener('click', () => {
        loadDemoVideo();
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
        if (file && (file.type.startsWith('video/') || /\.(mkv|avi|mov|webm|mp4|ogv|m4v)$/i.test(file.name))) {
            loadVideoFromFile(file);
        }
    });

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
            item.title = v.title;

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
            item.addEventListener('click', () => {
                if (v.isDemo) {
                    loadDemoVideo();
                } else {
                    startPlaybackSession(v.url, { original: v.url }, 'original', v.key, v.title, v.size);
                }
            });
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
        ytTitle.textContent = currentFileName;
        ytAvatar.textContent = (currentFileName[0] || 'W').toUpperCase();
        ytDescriptionText.textContent = buildDescription();
        document.title = `${currentFileName} — WatchMyVideo`;

        const handle = slugify(currentFileName);
        const isDemo = currentVideoKey === DEMO_KEY;
        tkAvatar.textContent = (isDemo ? 'B' : (handle[0] || 'L')).toUpperCase();
        tkAuthor.textContent = '@' + (isDemo ? 'bigbuckbunny' : handle);
        tkDesc.textContent = isDemo
            ? 'Big Buck Bunny — демо-ролик Blender Foundation. Открывается локально в вашем браузере.'
            : currentFileName;
        tkMusicText.textContent = `оригинальный звук — ${tkAuthor.textContent}`;
    }

    function buildDescription() {
        const lines = [];
        lines.push(currentFileName);
        const parts = [];
        if (currentFileSize) parts.push(formatBytes(currentFileSize));
        if (hasDuration()) parts.push('Длительность: ' + formatTime(video.duration));
        if (video.videoWidth && video.videoHeight) parts.push(`${video.videoWidth}×${video.videoHeight}`);
        const ext = (currentFileName.match(/\.([a-z0-9]+)$/i) || [])[1];
        if (ext) parts.push(ext.toUpperCase());
        if (parts.length) lines.push(parts.join('  ·  '));
        lines.push('Открыто локально в браузере — файл никуда не загружается.');
        return lines.join('\n');
    }

    // Flag for files that report an infinite duration until they are seeked once
    // (MediaRecorder, some camera streams). The synthetic seek used to discover
    // the real duration must not surface as a user-facing "ended" event or as a
    // playhead jump. `infiniteFixGuard` is a time-boxed deadline checked by the
    // 'ended' handler, independent of the one-shot `infiniteFixPending` flag used
    // by the timeupdate handler — either event may fire first.
    let infiniteFixPending = false;
    let infiniteFixGuard = 0;

    function afterMetadataReady() {
        durationEl.textContent = formatTime(video.duration);
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

    function toggleSubscribe() {
        const subscribed = storageGet(SUBSCRIBED_KEY, '0') === '1';
        storageSet(SUBSCRIBED_KEY, subscribed ? '0' : '1');
        refreshSocialUI();
        showToast(subscribed ? 'Вы отписались' : 'Спасибо за подписку!');
    }

    async function shareCurrentVideo() {
        const shareData = {
            title: currentFileName || 'WatchMyVideo',
            text: currentFileName || 'Видео в WatchMyVideo',
            url: window.location.href,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
                return;
            }
            throw new Error('Web Share unavailable');
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            try {
                await navigator.clipboard.writeText(shareData.url);
                showToast('Ссылка скопирована в буфер обмена');
            } catch (_) {
                showToast('Буфер обмена недоступен');
            }
        }
    }

    btnLike.addEventListener('click', toggleLike);
    btnDislike.addEventListener('click', toggleDislike);
    tkLike.addEventListener('click', toggleLike);
    btnShareYt.addEventListener('click', shareCurrentVideo);
    tkShare.addEventListener('click', shareCurrentVideo);
    btnSave.addEventListener('click', toggleSave);
    tkSave.addEventListener('click', toggleSave);
    btnSubscribe.addEventListener('click', toggleSubscribe);
    tkFollow.addEventListener('click', toggleSubscribe);

    btnDownload.addEventListener('click', () => {
        if (!currentFileUrl) return;
        const a = document.createElement('a');
        a.href = currentFileUrl;
        a.download = currentFileName || 'video';
        document.body.appendChild(a);
        a.click();
        a.remove();
    });

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

    function renderComments() {
        const key = currentVideoKey;
        const comments = key ? getComments(key) : [];
        ytCommentCount.textContent = String(comments.length);
        tkCommentCount.textContent = String(comments.length);
        tkDrawerCount.textContent = String(comments.length);

        const renderInto = (container, withDelete) => {
            container.innerHTML = '';
            if (comments.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'yt-comment-empty';
                empty.textContent = 'Комментариев пока нет. Будьте первым!';
                container.appendChild(empty);
                return;
            }
            comments.slice().reverse().forEach((comment) => {
                container.appendChild(commentNode(comment, withDelete ? () => {
                    const next = getComments(key).filter((c) => c.id !== comment.id);
                    setComments(key, next);
                    renderComments();
                } : null));
            });
        };

        renderInto(ytCommentList, true);
        renderInto(tkCommentList, true);
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
        void centerFlash.offsetWidth; // restart animation
        centerFlash.classList.add('show');
    }

    function updatePlayPauseButton(playing) {
        if (playing) {
            playPauseIcon.className = 'fa-solid fa-pause';
            btnPlayPause.title = 'Пауза (K)';
            scheduleIdle();
        } else {
            playPauseIcon.className = 'fa-solid fa-play';
            btnPlayPause.title = 'Воспроизвести (K)';
            clearTimeout(idleTimer);
            document.body.classList.remove('idle');
        }
    }

    btnPlayPause.addEventListener('click', togglePlayPause);
    video.addEventListener('click', togglePlayPause);

    video.addEventListener('play', () => {
        updatePlayPauseButton(true);
        replayOverlay.classList.add('hidden');
        if (video.readyState >= 2) flashCenterIcon('fa-solid fa-play');
    });

    video.addEventListener('pause', () => {
        updatePlayPauseButton(false);
        flashCenterIcon('fa-solid fa-pause');
    });

    video.addEventListener('ended', () => {
        if (Date.now() < infiniteFixGuard) {
            // Artificial seek used only to measure the real duration — reset silently.
            infiniteFixGuard = 0;
            infiniteFixPending = false;
            video.currentTime = 0;
            afterMetadataReady();
            return;
        }
        if (!video.loop) {
            replayOverlay.classList.remove('hidden');
        }
    });

    btnReplay.addEventListener('click', () => {
        replayOverlay.classList.add('hidden');
        video.currentTime = 0;
        video.play().catch(() => {});
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
        }
    });

    progressContainer.addEventListener('pointerleave', () => {
        progressTooltip.style.display = 'none';
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
    }

    progressContainer.addEventListener('pointerdown', (e) => {
        if (!hasDuration()) return;
        e.preventDefault();
        isDraggingProgress = true;
        progressContainer.classList.add('scrubbing');
        try { progressContainer.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        replayOverlay.classList.add('hidden');
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
        progressTooltip.style.display = 'none';
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
    //  Loop
    // =========================================================
    loopCheckbox.addEventListener('change', (e) => {
        isLooping = e.target.checked;
        video.loop = isLooping;
    });

    // =========================================================
    //  Quality
    // =========================================================
    function updateQualityUI() {
        const keys = Object.keys(qualitySources);
        qualityOptions.innerHTML = '';
        if (keys.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'settings-option inert';
            empty.textContent = 'Нет источников';
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

        const probeUrl = URL.createObjectURL(file);
        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.muted = true;
        probe.src = probeUrl;

        probe.addEventListener('loadedmetadata', () => {
            const h = probe.videoHeight;
            const key = h ? `${h}p` : `Файл ${Object.keys(qualitySources).length + 1}`;
            qualitySources[key] = probeUrl;
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

    function setVolume(vol) {
        const clamped = Math.max(0, Math.min(1, vol));
        video.volume = clamped;
        volumeSlider.value = String(Math.round(clamped * 100));
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
            volumeSlider.value = '0';
            updateVolumeIcon(0);
        }
    });

    btnVolumeBoost.addEventListener('click', () => {
        if (!ensureBoostGraph()) {
            showToast('Усиление звука не поддерживается в этом браузере');
            return;
        }
        resumeAudioContext();
        isBoosted = !isBoosted;
        btnVolumeBoost.classList.toggle('active', isBoosted);
        applyBoostGain();
        showToast(isBoosted ? 'Усиление звука включено (+6 дБ)' : 'Усиление звука выключено');
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
        btnTheater.title = on ? 'Обычный режим (T)' : 'Режим кинотеатра (T)';
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
        btnFullscreen.title = isFullscreen ? 'Выйти из полноэкранного режима (F)' : 'На весь экран (F)';
    });

    // =========================================================
    //  Settings menu
    // =========================================================
    function openSettingsMenu(open) {
        settingsMenu.classList.toggle('hidden', !open);
        btnSettings.classList.toggle('active', open);
        if (open) {
            clearTimeout(idleTimer);
            document.body.classList.remove('idle');
            switchSettingsView(settingsMain);
        } else {
            scheduleIdle();
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
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
    });

    settingsMenu.querySelectorAll('.back-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
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
        const key = e.key;

        pokeUI();

        if (code === 'Escape') {
            if (document.body.classList.contains('tk-drawer-open')) {
                closeCommentsDrawer();
                e.preventDefault();
                return;
            }
            if (!settingsMenu.classList.contains('hidden')) {
                openSettingsMenu(false);
                e.preventDefault();
            }
            return;
        }

        switch (code) {
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
            case 'KeyP':
                e.preventDefault();
                btnPip.click();
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
    setMode(storageGet(MODE_KEY, 'youtube'), { persist: false });
    updateQualityUI();
    updateSubtitlesMenu();
    setVolume(1);
    renderSuggestions();
    refreshSocialUI();
    renderComments();
});
