/**
 * 歌手写真轮播插件 - Content Script
 * 注入到播放器页面，实现写真轮播功能
 */

(function() {
    'use strict';

    // 写真轮播状态
    const state = {
        artistBackgroundImages: [],
        currentBackgroundIndex: 0,
        backgroundRotationTimer: null,
        currentArtistId: null,
        backgroundImage1: null,
        backgroundImage2: null,
        activeLayer: 1,
        rotationInterval: 10000, // 10 秒轮播
        isInitialized: false,
        observer: null,
        checkInterval: null,
        lastSongHash: null
    };

    /**
     * 更新背景图层的辅助函数
     * @param {string} imageSrc - 图片 URL
     */
    function updateBackgroundLayer(imageSrc) {
        if (!imageSrc) return;

        const layer1 = document.getElementById('wallpaper-layer-1');
        const layer2 = document.getElementById('wallpaper-layer-2');
        
        if (!layer1 || !layer2) return;

        if (state.activeLayer === 1) {
            // 当前是图层 1，更新图层 2 并切换到图层 2
            layer2.style.backgroundImage = `url(${imageSrc})`;
            state.backgroundImage2 = imageSrc;
            requestAnimationFrame(() => {
                state.activeLayer = 2;
                layer1.style.opacity = '0';
                layer2.style.opacity = '1';
            });
        } else {
            // 当前是图层 2，更新图层 1 并切换到图层 1
            layer1.style.backgroundImage = `url(${imageSrc})`;
            state.backgroundImage1 = imageSrc;
            requestAnimationFrame(() => {
                state.activeLayer = 1;
                layer2.style.opacity = '0';
                layer1.style.opacity = '1';
            });
        }
    }

    /**
     * 初始化双缓冲背景图层
     */
    function initBackgroundLayers() {
        const lyricsScreen = document.querySelector('.lyrics-screen');
        if (!lyricsScreen) return;

        // 检查是否已存在背景图层
        if (document.getElementById('wallpaper-layer-1')) return;

        // 创建背景容器
        const bgContainer = document.createElement('div');
        bgContainer.id = 'wallpaper-container';
        bgContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: 0;
        `;

        // 创建背景图层 1
        const layer1 = document.createElement('div');
        layer1.id = 'wallpaper-layer-1';
        layer1.className = 'bg-layer wallpaper-layer';
        layer1.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            transition: opacity 1s ease-in-out;
            opacity: 1;
        `;

        // 创建背景图层 2
        const layer2 = document.createElement('div');
        layer2.id = 'wallpaper-layer-2';
        layer2.className = 'bg-layer wallpaper-layer';
        layer2.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            transition: opacity 1s ease-in-out;
            opacity: 0;
        `;

        // 添加到容器
        bgContainer.appendChild(layer1);
        bgContainer.appendChild(layer2);
        
        // 插入到 lyrics-screen 的最前面
        lyricsScreen.insertBefore(bgContainer, lyricsScreen.firstChild);

        console.log('[ArtistWallpaper] 背景图层初始化完成');
    }

    /**
     * 清除轮播定时器
     */
    function clearRotationTimer() {
        if (state.backgroundRotationTimer) {
            clearInterval(state.backgroundRotationTimer);
            state.backgroundRotationTimer = null;
            console.log('[ArtistWallpaper] 清除轮播定时器');
        }
    }

    /**
     * 启动写真轮播
     * @param {string[]} images - 写真图片 URL 数组
     */
    function startRotation(images) {
        clearRotationTimer();

        if (!images || images.length === 0) return;

        state.artistBackgroundImages = images;
        state.currentBackgroundIndex = 0;

        // 只有一张图片时，不轮播
        if (images.length === 1) {
            updateBackgroundLayer(images[0]);
            return;
        }

        // 初始化前两张图片
        updateBackgroundLayer(images[0]);
        setTimeout(() => {
            updateBackgroundLayer(images[1] || images[0]);
        }, 100);

        // 启动轮播
        state.backgroundRotationTimer = setInterval(() => {
            state.currentBackgroundIndex = (state.currentBackgroundIndex + 1) % images.length;
            const nextImage = images[state.currentBackgroundIndex];

            // 预加载下一张图片
            const img = new Image();
            img.src = nextImage;

            img.onload = () => {
                // 确保图片完全解码后再切换
                if ('decode' in img) {
                    img.decode().then(() => {
                        updateBackgroundLayer(nextImage);
                    }).catch(() => {
                        updateBackgroundLayer(nextImage);
                    });
                } else {
                    updateBackgroundLayer(nextImage);
                }
            };

            img.onerror = (error) => {
                console.warn('[ArtistWallpaper] 背景图加载失败:', nextImage, error);
            };
        }, state.rotationInterval);

        console.log('[ArtistWallpaper] 启动轮播，图片数量:', images.length);
    }

    /**
     * 使用专辑封面作为背景
     */
    function useAlbumCoverAsBackground(albumCoverUrl) {
        clearRotationTimer();
        state.artistBackgroundImages = [];
        
        const defaultBg = albumCoverUrl || 'https://random.MoeJue.cn/randbg.php';
        updateBackgroundLayer(defaultBg);
        
        console.log('[ArtistWallpaper] 使用专辑封面作为背景');
    }

    /**
     * 获取多个歌手的写真并合并
     * @param {string[]} artistIds - 歌手 ID 数组
     * @param {string[]} artistNames - 歌手名称数组
     */
    async function fetchMultipleArtistsBackground(artistIds, artistNames) {
        const allImages = [];
        
        try {
            // 并发获取所有歌手的写真
            const promises = artistIds.map(async (id, index) => {
                const name = artistNames[index] || `歌手${index + 1}`;
                
                try {
                    const result = await chrome.runtime.sendMessage({
                        type: 'FETCH_ARTIST_WALLPAPER',
                        artistId: id,
                        artistName: name
                    });
                    
                    if (result.success && result.data && result.data.length > 0) {
                        return result.data;
                    } else {
                        return [];
                    }
                } catch (error) {
                    console.warn('[ArtistWallpaper] 获取歌手写真失败:', name, error);
                    return [];
                }
            });
            
            const results = await Promise.all(promises);
            
            // 合并所有图片
            results.forEach(images => {
                allImages.push(...images);
            });
            
            // 去重
            const uniqueImages = [...new Set(allImages)];
            
            if (uniqueImages.length > 0) {
                startRotation(uniqueImages);
            } else {
                // 没有歌手写真，使用专辑封面
                const currentSong = getCurrentSong();
                useAlbumCoverAsBackground(currentSong?.img);
            }
        } catch (error) {
            console.error('[ArtistWallpaper] 获取多歌手写真失败:', error);
            const currentSong = getCurrentSong();
            useAlbumCoverAsBackground(currentSong?.img);
        }
    }

    /**
     * 获取当前播放歌曲信息
     * @returns {Object|null}
     */
    function getCurrentSong() {
        try {
            // 尝试从 localStorage 获取
            const currentSongStr = localStorage.getItem('current_song');
            if (currentSongStr) {
                return JSON.parse(currentSongStr);
            }
        } catch (error) {
            console.warn('[ArtistWallpaper] 获取当前歌曲失败:', error);
        }
        return null;
    }

    /**
     * 从搜索 API 获取歌手 ID
     * @param {string} artistName - 歌手名称
     * @returns {Promise<string|null>}
     */
    async function fetchArtistIdByName(artistName) {
        if (!artistName) return null;
        
        try {
            const result = await chrome.runtime.sendMessage({
                type: 'SEARCH_ARTIST_ID',
                artistName: artistName
            });
            
            if (result.success && result.data) {
                return result.data;
            }
        } catch (error) {
            console.warn('[ArtistWallpaper] 搜索歌手 ID 失败:', artistName, error);
        }
        return null;
    }

    /**
     * 获取歌手写真背景
     * @param {string} artistName - 歌手名称
     * @param {string} artistId - 歌手 ID
     */
    async function fetchArtistBackground(artistName, artistId) {
        if (!artistId) {
            // 尝试通过搜索获取歌手 ID
            const searchedId = await fetchArtistIdByName(artistName);
            if (searchedId) {
                artistId = searchedId;
            } else {
                useAlbumCoverAsBackground(getCurrentSong()?.img);
                return;
            }
        }

        try {
            const result = await chrome.runtime.sendMessage({
                type: 'FETCH_ARTIST_WALLPAPER',
                artistId: artistId,
                artistName: artistName
            });
            
            if (result.success && result.data && result.data.length > 0) {
                startRotation(result.data);
            } else {
                useAlbumCoverAsBackground(getCurrentSong()?.img);
            }
        } catch (error) {
            console.error('[ArtistWallpaper] 获取歌手写真失败:', error);
            useAlbumCoverAsBackground(getCurrentSong()?.img);
        }
    }

    /**
     * 处理歌曲切换
     */
    async function handleSongChange() {
        const currentSong = getCurrentSong();
        if (!currentSong) return;

        const artistId = currentSong.author_id || currentSong.singerid;
        const author = currentSong.author || '';

        // 清除之前的写真和定时器
        clearRotationTimer();
        state.artistBackgroundImages = [];

        if (artistId) {
            // 检查是否有多个歌手
            const artistIds = String(artistId).split(/[&/,、]/).map(id => id.trim()).filter(id => id);
            const artistNames = author.split(/[&/,、]/).map(name => name.trim()).filter(name => name);
            
            if (artistIds.length > 1) {
                // 多歌手情况：获取所有歌手的写真
                fetchMultipleArtistsBackground(artistIds, artistNames);
            } else {
                // 单歌手情况
                fetchArtistBackground(artistNames[0] || author, artistIds[0]);
            }
        } else if (author) {
            // 歌曲数据中没有歌手 ID，尝试通过搜索获取
            const artistNames = author.split(/[&/,、]/).map(name => name.trim()).filter(name => name);
            
            if (artistNames.length > 1) {
                // 多歌手情况：分别搜索每个歌手
                const searchPromises = artistNames.map(name => fetchArtistIdByName(name));
                
                Promise.all(searchPromises).then(results => {
                    const ids = results.filter(id => id !== null);
                    if (ids.length > 0) {
                        fetchMultipleArtistsBackground(ids, artistNames);
                    } else {
                        useAlbumCoverAsBackground(currentSong.img);
                    }
                });
            } else {
                // 单歌手情况
                const id = await fetchArtistIdByName(artistNames[0] || author);
                if (id) {
                    state.currentArtistId = id;
                    fetchArtistBackground(artistNames[0] || author, id);
                } else {
                    useAlbumCoverAsBackground(currentSong.img);
                }
            }
        } else {
            useAlbumCoverAsBackground(currentSong.img);
        }
    }

    /**
     * 监听歌词界面显示和歌曲切换
     */
    function setupLyricsObserver() {
        let lastSongHash = null;
        let checkInterval = null;
        
        // 定时检查歌曲变化
        const startSongCheckInterval = () => {
            if (checkInterval) clearInterval(checkInterval);
            checkInterval = setInterval(() => {
                const currentSong = getCurrentSong();
                const currentHash = currentSong?.hash;
                
                // 如果歌曲变化了，更新写真
                if (currentHash && currentHash !== lastSongHash) {
                    console.log('[ArtistWallpaper] 定时检测 - 歌曲切换:', currentHash);
                    lastSongHash = currentHash;
                    handleSongChange();
                }
            }, 1000); // 每秒检查一次
        };
        
        // 停止定时检查
        const stopSongCheckInterval = () => {
            if (checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
            }
        };
        
        // 使用 MutationObserver 监听 DOM 变化
        state.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    const lyricsScreen = document.querySelector('.lyrics-screen');
                    if (lyricsScreen) {
                        // 歌词界面显示时初始化背景图层
                        if (!state.isInitialized) {
                            state.isInitialized = true;
                            initBackgroundLayers();
                            // 延迟处理歌曲以等待数据加载
                            setTimeout(handleSongChange, 500);
                            // 启动定时检查
                            startSongCheckInterval();
                        }
                        
                        // 每次歌词界面显示时都检查歌曲是否变化
                        const currentSong = getCurrentSong();
                        const currentHash = currentSong?.hash;
                        
                        // 如果歌曲变化了，更新写真
                        if (currentHash && currentHash !== lastSongHash) {
                            console.log('[ArtistWallpaper] MutationObserver - 歌曲切换:', currentHash);
                            lastSongHash = currentHash;
                            handleSongChange();
                        }
                    } else {
                        // 歌词界面隐藏时
                        state.isInitialized = false;
                        stopSongCheckInterval();
                    }
                }
            }
        });

        state.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[ArtistWallpaper] 观察者已启动');
    }

    /**
     * 监听 localStorage 变化
     */
    function setupStorageListener() {
        window.addEventListener('storage', (event) => {
            if (event.key === 'current_song') {
                console.log('[ArtistWallpaper] 检测到歌曲变化');
                handleSongChange();
            }
        });
    }

    /**
     * 清理资源
     */
    function cleanup() {
        clearRotationTimer();
        
        // 清除歌曲检查定时器
        if (state.checkInterval) {
            clearInterval(state.checkInterval);
            state.checkInterval = null;
        }
        
        if (state.observer) {
            state.observer.disconnect();
            state.observer = null;
        }

        // 移除背景容器
        const bgContainer = document.getElementById('wallpaper-container');
        if (bgContainer) bgContainer.remove();
        
        // 移除设置界面和按钮
        const settingsPanel = document.getElementById('wallpaper-settings-panel');
        if (settingsPanel) settingsPanel.remove();
        
        const settingsBtn = document.getElementById('wallpaper-settings-btn');
        if (settingsBtn) settingsBtn.remove();

        state.isInitialized = false;
        console.log('[ArtistWallpaper] 已清理资源');
    }

    /**
     * 初始化插件
     */
    function init() {
        console.log('[ArtistWallpaper] 插件初始化');

        // 等待 DOM 加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setupLyricsObserver();
                setupStorageListener();
            });
        } else {
            setupLyricsObserver();
            setupStorageListener();
        }

        // 监听页面卸载
        window.addEventListener('beforeunload', cleanup);
    }

    // 启动插件
    init();
})();
