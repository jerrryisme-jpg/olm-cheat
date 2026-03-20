(function() {
    'use strict';
    
    console.log('%c[OLM CHEAT V2.0] Loading...', 'color: #9146ff; font-size: 18px; font-weight: bold;');
    
    if (typeof html2canvas === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(script);
    }
    

    const CONFIG = {
        version: '2.0',
        githubUrl: 'https://github.com/jerrryisme-jpg',
        isPaused: false,
        is5x: false,
        groqApiKey: 'gsk_xwrvFUjIteAW5LguAVxOWGyb3FYSbe1EvIGnNe1ExYZGD1rluwR',
        groqTextModel: 'openai/gpt-oss-120b',
        groqVisionModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
        debugMode: true,
        knowledge: '',
        autoUpdate: false,
        performanceMode: false
    };
    
    let currentQuestionData = null;
    let lastQuestionHash = null;
    let isAIThinking = false;
    let currentImageBase64 = null;
    let isMinimized = false;
    let isResizing = false;
    let resizeType = null;
    let startLeft = 0;
    
    // Server-side time freeze state
    let timeFrozen = false;
    let frozenTimeSpent = null;
    let frozenDisplayTime = null;
    let timerObserver = null;
    

    
    function log(msg, color = '#9146ff') {
    }
    
    function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
    
    // ============================================
    // HIJACK EXAM_UI ANTI-CHEAT SYSTEM
    // ============================================
    
    function hijackEXAMUI() {
        if (!window.EXAM_UI) {
            return false;
        }
        
        // Disable violation counting
        if (EXAM_UI.getData) {
            const originalGetData = EXAM_UI.getData;
            EXAM_UI.getData = function(key) {
                const data = originalGetData.call(this, key);
                if (key === 'asubmit') return 0; // No auto-submit limit
                if (key === 'count_log') return 0; // No violations logged
                return data;
            };
        }
        
        // Block the setData to prevent log updates
        if (EXAM_UI.setData) {
            const originalSetData = EXAM_UI.setData;
            EXAM_UI.setData = function(key, value) {
                if (key === 'count_log') {
                    return; // Block violation counter updates
                }
                return originalSetData.call(this, key, value);
            };
        }
        
        return true;
    }
    
    // ============================================
    // SERVER-SIDE TIME HIJACKING
    // ============================================
    
    function hijackCATEUI() {
        if (!window.CATE_UI) {
            return false;
        }
        
        if (window.CATE_UI.timeNext) {
            const originalTimeNext = window.CATE_UI.timeNext;
            window.CATE_UI.timeNext = function() {
                if (timeFrozen) {
                    const timer = window.CATE_UI.getTimer();
                    const savedTimeSpent = timer.time_spent;
                    
                    originalTimeNext.call(this);
                    
                    timer.time_spent = savedTimeSpent;
                    
                    try {
                        const data = window.CATE_UI.getData();
                        let key = 'time_spent:' + data.id_page_user + '.' + data.id_category;
                        if (data.id_courseware) {
                            key += '.' + data.id_courseware;
                        }
                        localStorage.setItem(key, JSON.stringify(frozenTimeSpent));
                    } catch(e) {}
                    
                    return;
                }
                return originalTimeNext.call(this);
            };
        }
        
        if (window.CATE_UI.saveResult) {
            const originalSaveResult = window.CATE_UI.saveResult;
            window.CATE_UI.saveResult = function(data, callback, includeTime) {
                // Block violation logs
                if (data && data.log) {
                    if (callback) callback(true);
                    return;
                }
                
                // Freeze time if enabled
                if (timeFrozen && frozenTimeSpent !== null) {
                    data = data || {};
                    data.time_spent = frozenTimeSpent;
                }
                
                return originalSaveResult.call(this, data, callback, includeTime);
            };
        }
        
        if (window.CATE_UI.saveLocalRecord) {
            const originalSaveLocalRecord = window.CATE_UI.saveLocalRecord;
            window.CATE_UI.saveLocalRecord = function(key, data) {
                if (timeFrozen && key === 'time_spent') {
                    return;
                }
                return originalSaveLocalRecord.call(this, key, data);
            };
        }
        
        return true;
    }
    
    
    function normalizeVietnamese(text) {
        text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
        
        return text
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' '); // normalize whitespace
    }
    
    function levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,      // deletion
                        dp[i][j - 1] + 1,      // insertion
                        dp[i - 1][j - 1] + 1   // substitution
                    );
                }
            }
        }
        
        return dp[m][n];
    }
    
    function calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }
    
    function findBestMatch(query, candidates) {
        const normalizedQuery = normalizeVietnamese(query);
        let bestMatch = null;
        let bestScore = 0;
        
        candidates.forEach((candidate, index) => {
            const normalizedCandidate = normalizeVietnamese(candidate.question);
            
            if (normalizedCandidate.includes(normalizedQuery)) {
                const score = 0.95 + (0.05 * (normalizedQuery.length / normalizedCandidate.length));
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = candidate;
                }
                return;
            }
            
            const similarity = calculateSimilarity(normalizedQuery, normalizedCandidate);
            
            if (similarity >= 0.75 && similarity > bestScore) {
                bestScore = similarity;
                bestMatch = candidate;
            }
        });
        
        if (bestMatch) {
            log(`Fuzzy match found! Score: ${(bestScore * 100).toFixed(1)}%`, '#00ff00');
        }
        
        return bestMatch;
    }
    
        /*
    function showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(27, 31, 40, 0.95);
            backdrop-filter: blur(10px);
            color: #9146ff;
            padding: 12px 24px;
            border-radius: 8px;
            border: 1px solid rgba(145, 70, 255, 0.4);
            z-index: 9999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 10px 30px rgba(145, 70, 255, 0.3);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    */
    

    
    function bypassTabDetection() {
        console.log('%c[OLM v2.0] 🚀 Bypassing anticheat...', 'color: #ff00ff; font-weight: bold;');
        
        // Tab switch detection killer
        let hidden = false;
        Object.defineProperty(document, 'hidden', {
            get: function() { return hidden; },
            configurable: true
        });
        
        Object.defineProperty(document, 'visibilityState', {
            get: function() { return 'visible'; },
            configurable: true
        });
        
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            const blockedEvents = [
                'visibilitychange',
                'blur', 
                'focus',
                'pause',
                'resume',
                'fullscreenchange',
                'webkitfullscreenchange',
                'mozfullscreenchange',
                'msfullscreenchange',
                'beforeunload'
            ];
            
            if (blockedEvents.includes(type)) {
                return;
            }
            
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        // Fullscreen detection killer
        Object.defineProperty(document, 'fullscreenElement', {
            get: () => document.documentElement,
            configurable: true
        });
        
        Object.defineProperty(document, 'webkitFullscreenElement', {
            get: () => document.documentElement,
            configurable: true
        });
        
        Object.defineProperty(document, 'mozFullScreenElement', {
            get: () => document.documentElement,
            configurable: true
        });
        
        Object.defineProperty(document, 'msFullscreenElement', {
            get: () => document.documentElement,
            configurable: true
        });
        
        // Copy/paste/right-click freedom
        const protectedEvents = ['copy', 'paste', 'cut', 'contextmenu', 'selectstart', 'mousedown'];
        
        protectedEvents.forEach(eventType => {
            document.addEventListener(eventType, function(e) {
                e.stopImmediatePropagation();
            }, true);
        });
        
        const enableSelection = () => {
            if (!document.body) return;
            
            document.body.style.userSelect = 'auto';
            document.body.style.webkitUserSelect = 'auto';
            document.body.style.mozUserSelect = 'auto';
            document.body.style.msUserSelect = 'auto';
            
            document.querySelectorAll('*').forEach(el => {
                if (el.style.userSelect === 'none') {
                    el.style.userSelect = 'auto';
                }
            });
        };
        
        enableSelection();
        setInterval(enableSelection, 500);
        
        // DevTools shortcuts freedom
        const originalPreventDefault = Event.prototype.preventDefault;
        Event.prototype.preventDefault = function() {
            if (this.type === 'keydown') {
                const key = this.key;
                const ctrl = this.ctrlKey;
                const shift = this.shiftKey;
                
                if (key === 'F12' || 
                    (ctrl && shift && key === 'I') ||
                    (ctrl && shift && key === 'C') ||
                    (ctrl && key === 'U')) {
                    return;
                }
            }
            
            if (this.type === 'contextmenu') {
                return;
            }
            
            return originalPreventDefault.call(this);
        };
        
        // Block logging requests
        const blockedEndpoints = [
            'teacher-static',
            'saveResult', 
            'teacher-log',
            'newexam-log',
            'course/teacher-static'
        ];
        
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = String(args[0]);
            if (blockedEndpoints.some(endpoint => url.includes(endpoint))) {
                return Promise.resolve(new Response('{"success":true}', {
                    status: 200,
                    headers: {'Content-Type': 'application/json'}
                }));
            }
            return originalFetch.apply(this, args);
        };
        
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            if (blockedEndpoints.some(endpoint => url.includes(endpoint))) {
                this._blocked = true;
            }
            return originalXHROpen.apply(this, [method, url, ...rest]);
        };
        
        const originalXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(...args) {
            if (this._blocked) {
                return;
            }
            return originalXHRSend.apply(this, args);
        };
        
        // Violation counter killer
        const cleanupWarnings = () => {
            const scoreEl = document.getElementById('tmp-score');
            if (scoreEl && scoreEl.textContent.includes('Dấu hiệu gian lận')) {
                scoreEl.textContent = '';
                scoreEl.classList.remove('text-danger', 'font-weight-bold');
            }
            
            // Reverse the warning messages instead of removing them
            document.querySelectorAll('.noti-out-view').forEach(el => {
                if (el.textContent.includes('rời khỏi màn hình') || el.textContent.includes('báo cáo')) {
                    el.innerHTML = `<p class='mb-1'>Lưu ý: Hệ thống KHÔNG theo dõi khi bạn rời khỏi màn hình.</p><p class='mb-1'>Bạn có thể thoát ra thoải mái, không bị báo cáo.</p>`;
                }
            });
            
            // Remove other warning alerts
            document.querySelectorAll('.alert-danger, .alert-warning').forEach(el => {
                const text = el.textContent;
                if (text.includes('rời khỏi màn hình') || 
                    text.includes('toàn màn hình') ||
                    text.includes('gian lận') ||
                    text.includes('Cảnh báo') && text.includes('thoát')) {
                    el.remove();
                }
            });
        };
        
        cleanupWarnings();
        setInterval(cleanupWarnings, 1000);
        
        window._dialogAlert = function(msg) {
            return;
        };
        
        window._dialogConfirm = function(title, msg, callback) {
            if (callback) callback(true);
            return;
        };
        
        console.log('%c[OLM v2.0] ✅ Anticheat bypassed', 'color: #00ff00; font-weight: bold;');
        
        // ============================================
        // HIJACK LOCALSTORAGE TO FREEZE TIME_SPENT
        // ============================================
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
            // If time is frozen and this is a time_spent key, block the update
            if (key.startsWith('time_spent:') && localStorage.getItem('olm_time_frozen') === 'true') {
                const frozenValue = localStorage.getItem('olm_frozen_time');
                if (frozenValue) {
                    return originalSetItem.call(this, key, frozenValue);
                }
                return; // Block the update
            }
            return originalSetItem.call(this, key, value);
        };
    }
    

    
    function toggleStop() {
        CONFIG.isPaused = !CONFIG.isPaused;
        const btn = document.getElementById('olm-stop-btn');
        
        if (CONFIG.isPaused) {
            log('Time stopped', '#ffff00');
            btn.textContent = ' RESUME TIME';
            btn.style.background = 'rgba(0, 68, 0, 0.6)';
            btn.style.color = '#00ff00';
            btn.style.borderColor = 'rgba(0, 255, 0, 0.4)';
            stopAllTimers();
        } else {
            log('Time resumed', '#00ff00');
            btn.textContent = ' STOP TIME';
            btn.style.background = 'rgba(68, 0, 0, 0.6)';
            btn.style.color = '#ff4444';
            btn.style.borderColor = 'rgba(255, 0, 0, 0.4)';
            resumeAllTimers();
        }
    }
    
    function stopAllTimers() {
        // Server-side freeze using CATE_UI hijacking
        if (window.CATE_UI) {
            const timer = window.CATE_UI.getTimer();
            if (timer) {
                timeFrozen = true;
                frozenTimeSpent = timer.time_spent;
                
                // CRITICAL: Also freeze the localStorage value so it persists across reloads
                const data = window.CATE_UI.getData();
                const lsKey = 'time_spent:' + data.id_page_user + '.' + data.id_category;
                const fullKey = data.id_courseware ? lsKey + '.' + data.id_courseware : lsKey;
                
                // Store the frozen time in localStorage
                try {
                    localStorage.setItem(fullKey, JSON.stringify(frozenTimeSpent));
                    localStorage.setItem('olm_time_frozen', 'true');
                    localStorage.setItem('olm_frozen_time', JSON.stringify(frozenTimeSpent));
                } catch(e) {}
            }
        }
        
        // Client-side display freeze
        const timerEl = document.getElementById('timecount');
        if (timerEl) {
            frozenDisplayTime = timerEl.textContent;
            
            if (timerObserver) {
                timerObserver.disconnect();
            }
            
            timerObserver = new MutationObserver(() => {
                if (timeFrozen && timerEl.textContent !== frozenDisplayTime) {
                    timerEl.textContent = frozenDisplayTime;
                }
            });
            timerObserver.observe(timerEl, { 
                childList: true, 
                characterData: true, 
                subtree: true 
            });
        }
        
        log('Timers frozen (server + client + localStorage)', '#ffff00');
    }
    
    function resumeAllTimers() {
        // Server-side unfreeze
        timeFrozen = false;
        frozenTimeSpent = null;
        frozenDisplayTime = null;
        
        // Clear freeze markers from localStorage
        try {
            localStorage.removeItem('olm_time_frozen');
            localStorage.removeItem('olm_frozen_time');
        } catch(e) {}
        
        if (timerObserver) {
            timerObserver.disconnect();
            timerObserver = null;
        }
        
        log('Timers resumed', '#00ff00');
    }
    

    
    function getQuestionText() {
        const patterns = [
            '.card .card-title',
            '.question-text',
            '[class*="question"]',
            'h3', 'h4',
            '.card-body p'
        ];
        
        for (const pattern of patterns) {
            const elements = document.querySelectorAll(pattern);
            for (const el of elements) {
                const text = el.textContent.trim();
                if (text.length > 20 && text.length < 2000) {
                    return text;
                }
            }
        }
        
        return null;
    }
    
    function getAnswerElements() {
        const patterns = [
            'label[for^="answer"]',
            '.answer-option',
            '[class*="option"]',
            'label'
        ];
        
        for (const pattern of patterns) {
            const elements = Array.from(document.querySelectorAll(pattern));
            if (elements.length >= 2 && elements.length <= 6) {
                return elements;
            }
        }
        
        return [];
    }
    
    function getAnswerTexts() {
        const elements = getAnswerElements();
        return elements.map(el => el.textContent.trim());
    }
    
    function displayQuestion(questionText) {
        const box = document.getElementById('olm-question-box');
        if (box) {
            box.textContent = questionText;
            log(`Question: ${questionText.substring(0, 100)}...`, '#00ff00');
        }
    }
    
    function copyQuestionToClipboard() {
        if (!currentQuestionData) return;
        
        const text = `Q: ${currentQuestionData.question}\n\nAnswers:\n${currentQuestionData.answers.map((a, i) => `${String.fromCharCode(65 + i)}. ${a}`).join('\n')}`;
        
        navigator.clipboard.writeText(text).then(() => {
            log('Copied to clipboard', '#0ff');
        });
    }
    

    
    let teacherDocAnswers = null; // Stores Q&A pairs: [{question: "text", answer: "D"}, ...]
    let isDownloadingDoc = false;
    
    function loadJSZip() {
        return new Promise((resolve, reject) => {
            if (window.JSZip) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => {
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load jszip.js'));
            };
            document.head.appendChild(script);
        });
    }
    

    async function downloadAndParseTeacherDoc() {
        const isExamPage = window.location.pathname.match(/\/chu-de\//);
        if (!isExamPage) {
            log('Not on exam page (/chu-de/), skipping doc download', '#ff8c00');
            teacherDocAnswers = [];
            populateQAList(); // This will show "No exam detected" message
            return;
        }
        
        if (isDownloadingDoc) {
            return;
        }
        
        if (teacherDocAnswers !== null) {
            return;
        }
        
        isDownloadingDoc = true;
        
        try {
            await loadJSZip();
            
            const pathMatch = window.location.pathname.match(/(\d+)$/);
            if (!pathMatch) {
                teacherDocAnswers = {}; // Empty object = tried but failed
                return;
            }
            
            const id_cate = pathMatch[0];
            
            const apiUrl = `https://olm.vn/download-word-for-user?id_cate=${id_cate}&showAns=1&questionNotApproved=0`;
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || !data.file) {
                throw new Error('No file URL in response');
            }
            
            const fileUrl = data.file;
            
            const fileResponse = await fetch(fileUrl);
            
            if (!fileResponse.ok) {
                throw new Error(`Failed to download: ${fileResponse.status}`);
            }
            
            const arrayBuffer = await fileResponse.arrayBuffer();
            
            
            await loadJSZip();
            const zip = await JSZip.loadAsync(arrayBuffer);
            const documentXml = await zip.file('word/document.xml').async('string');
            
            
            teacherDocAnswers = parseDocxXML(documentXml);
            populateQAList();
            
            
        } catch (error) {
            teacherDocAnswers = {}; // Empty = tried but failed
        } finally {
            isDownloadingDoc = false;
        }
    }
    
    function parseDocxXML(xmlContent) {
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        const W  = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
        const V  = 'urn:schemas-microsoft-com:vml';
        const RN = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
        
        const allRuns = xmlDoc.getElementsByTagNameNS(W, 'r');
        
        const textChunks = [];
        let position = 0;
        
        for (let i = 0; i < allRuns.length; i++) {
            const run = allRuns[i];
            
            let isUnderlined = false;
            const rPr = run.getElementsByTagNameNS(W, 'rPr')[0];
            if (rPr && rPr.getElementsByTagNameNS(W, 'u').length > 0) {
                isUnderlined = true;
            }
            
            for (const child of run.childNodes) {
                const name = child.nodeName;
                if (name === 'w:t') {
                    const text = child.textContent;
                    textChunks.push({ text, isUnderlined, start: position });
                    position += text.length;
                } else if (name === 'w:object') {
                    const imgDatas = child.getElementsByTagNameNS(V, 'imagedata');
                    if (imgDatas.length > 0) {
                        const rId = imgDatas[0].getAttributeNS(RN, 'id') ||
                                    imgDatas[0].getAttribute('r:id') || '';
                        const shapes = child.getElementsByTagNameNS(V, 'shape');
                        let wPt = '', hPt = '';
                        if (shapes.length > 0) {
                            const style = shapes[0].getAttribute('style') || '';
                            const wm = style.match(/width:([\d.]+)pt/);
                            const hm = style.match(/height:([\d.]+)pt/);
                            if (wm) wPt = wm[1];
                            if (hm) hPt = hm[1];
                        }
                        if (rId) {
                            const token = `[IMG:${rId}:${wPt}:${hPt}]`;
                            textChunks.push({ text: token, isUnderlined, start: position });
                            position += token.length;
                        }
                    }
                }
            }
        }
        
        const fullText = textChunks.map(c => c.text).join('');
        
        const questionRegex = /(Question\s+\d+\.|Câu\s+\d+\.)/gi;
        const questionMarkers = [];
        let match;
        while ((match = questionRegex.exec(fullText)) !== null) {
            questionMarkers.push({ marker: match[0], index: match.index });
        }
        
        
        const qaPairs = [];
        
        for (let qIdx = 0; qIdx < questionMarkers.length; qIdx++) {
            const startIdx = questionMarkers[qIdx].index + questionMarkers[qIdx].marker.length;
            const endIdx = qIdx + 1 < questionMarkers.length ? questionMarkers[qIdx + 1].index : fullText.length;
            const block = fullText.substring(startIdx, endIdx).trim();
            
            let answerLetter = null;
            for (const chunk of textChunks) {
                if (chunk.start >= startIdx && chunk.start < endIdx && chunk.isUnderlined) {
                    const letterMatch = chunk.text.trim().match(/^([A-D])\.?\s*$/);
                    if (letterMatch) {
                        answerLetter = letterMatch[1];
                        break;
                    }
                }
            }
            
            const textAnswerMatch = block.match(/^(.+?)\s*\[([^\]]+)\]\s*$/s);
            if (textAnswerMatch) {
                const questionText = textAnswerMatch[1].replace(/\s+/g, ' ').trim();
                const answerText = textAnswerMatch[2].trim();
                
                
                qaPairs.push({
                    question: questionText,
                    answerLetter: null,
                    answerText: answerText,
                    allOptions: {},
                    isTextAnswer: true
                });
                continue;
            }
            
            const isTrueFalse = /[a-d]\).*?\(\s*[TF]\s*\)/i.test(block);
            
            if (isTrueFalse) {
                const mainQuestionMatch = block.match(/^(.+?)(?=\s*a\))/s);
                const mainQuestion = mainQuestionMatch ? mainQuestionMatch[1].replace(/\s+/g, ' ').trim() : '';
                
                const subQuestions = [];
                const subMatches = block.matchAll(/([a-d])\)\s*(.+?)\s*\(\s*([TF])\s*\)/gi);
                
                for (const match of subMatches) {
                    const letter = match[1].toLowerCase();
                    const questionText = match[2].trim();
                    const answer = match[3].toUpperCase() === 'T' ? 'Đ' : 'S';
                    subQuestions.push({ letter, questionText, answer });
                }
                
                if (subQuestions.length > 0) {
                    const answerText = subQuestions.map(sq => `${sq.letter}) ${sq.answer}`).join('\n');
                    
                    
                    qaPairs.push({
                        question: mainQuestion,
                        answerLetter: null,
                        answerText: answerText,
                        allOptions: {},
                        isTrueFalse: true,
                        subQuestions: subQuestions
                    });
                }
                continue;
            }
            
            if (!answerLetter) {
                continue;
            }
            
            
            let questionText = '';
            const firstOptionMatch = block.match(/(?:^|\n)\s*A\.\s/);
            if (firstOptionMatch) {
                questionText = block.substring(0, firstOptionMatch.index).replace(/\s+/g, ' ').trim();
            } else {
                const match = block.match(/^(.+?)(?=\s*A\.|$)/s);
                questionText = match ? match[1].replace(/\s+/g, ' ').trim() : block.substring(0, 100);
            }
            
            const options = {};
            const optionRegex = /([A-D])\.\s*(.+?)(?=[A-D]\.|$)/gs;
            let optMatch;
            
            while ((optMatch = optionRegex.exec(block)) !== null) {
                const letter = optMatch[1];
                let text = optMatch[2].trim();
                text = text.replace(/\.\s*$/, '').trim();
                text = text.replace(/\s+[A-D]\.?\s*$/, '').trim();
                
                if (text && text.length > 1) {
                    options[letter] = text;
                }
            }
            
            const answerText = options[answerLetter] || answerLetter;
            
            
            qaPairs.push({
                question: questionText,
                answerLetter: answerLetter,
                answerText: answerText,
                allOptions: options,
                isTrueFalse: false,
                isTextAnswer: false
            });
        }
        
        return qaPairs;
    }
    
    
    function findAnswerByQuestionText(questionText) {
        if (!teacherDocAnswers || teacherDocAnswers.length === 0) {
            return null;
        }
        
        return findBestMatch(questionText, teacherDocAnswers);
    }
    

    
    function displayAIAnswer(answer, confidence = null) {
        const box = document.getElementById('olm-ai-answer');
        const status = document.getElementById('olm-ai-status');
        
        if (box) {
            box.innerHTML = `<div style="color: #9146ff; font-weight: 600; font-size: 18px; margin-bottom: 8px;">${answer}</div>`;
            
            if (confidence !== null) {
                box.innerHTML += `<div style="font-size: 9px; color: rgba(145, 70, 255, 0.7);">Confidence: ${confidence}%</div>`;
            }
        }
        
        if (status) {
            status.textContent = '';
        }
        
        isAIThinking = false;
    }
    
    function highlightAnswer(letter) {
        const answerElements = getAnswerElements();
        const index = letter.toUpperCase().charCodeAt(0) - 65;
        
        if (answerElements[index]) {
            answerElements.forEach((el, i) => {
                el.style.background = '';
                el.style.border = '';
            });
            
            const targetEl = answerElements[index];
            targetEl.style.background = 'rgba(145, 70, 255, 0.3)';
            targetEl.style.border = '2px solid rgba(145, 70, 255, 0.8)';
            targetEl.style.borderRadius = '8px';
            targetEl.style.transition = 'all 0.3s ease';
            
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            log(`Highlighted: ${letter}`, '#9146ff');
        }
    }
    
    async function askAIForAnswer(customQuestion = null) {
        if (isAIThinking) {
            log('AI already thinking...', '#ff6600');
            return;
        }
        
        const questionText = customQuestion || currentQuestionData?.question;
        const answerTexts = customQuestion ? [] : (currentQuestionData?.answers || []);
        
        if (!questionText) {
            log('No question available', '#ff0000');
            return;
        }
        
        isAIThinking = true;
        const status = document.getElementById('olm-ai-status');
        const aiBox = document.getElementById('olm-ai-answer');
        
        if (status) status.textContent = '🤖 Thinking...';
        if (aiBox) aiBox.innerHTML = '<div style="color: rgba(145, 70, 255, 0.6); font-size: 11px; font-style: italic;">Asking AI...</div>';
        
        try {
                
            let prompt;
            if (answerTexts.length > 0) {
                prompt = `You are taking a Vietnamese quiz. Answer ONLY with the letter (A, B, C, or D). No explanations.\n\nQuestion: ${questionText}\n\nOptions:\n${answerTexts.map((a, i) => `${String.fromCharCode(65 + i)}. ${a}`).join('\n')}\n\nAnswer (letter only):`;
            } else {
                prompt = `Answer this Vietnamese question. Give ONLY a concise answer, no explanations:\n\n${questionText}`;
            }
            
            if (CONFIG.knowledge) {
                prompt = `KNOWLEDGE BASE:\n${CONFIG.knowledge}\n\n${prompt}`;
            }
            
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.groqApiKey}`
                },
                body: JSON.stringify({
                    model: CONFIG.groqTextModel,
                    messages: [
                        { role: 'system', content: 'You are a helpful quiz assistant. Answer concisely.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 200,
                    temperature: 0.3
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                log(`Groq API Error: ${errorText}`, '#ff0000');
                
                if (response.status === 429 || errorText.includes('rate_limit') || errorText.includes('quota')) {
                    throw new Error('API rate limit! Get free key at console.groq.com');
                }
                
                throw new Error(`API error ${response.status}`);
            }
            
            const data = await response.json();
            const answer = data.choices?.[0]?.message?.content?.trim();
            
            if (!answer) {
                throw new Error('No answer from AI');
            }
            
                
            const letterMatch = answer.match(/^([A-D])/i);
            if (letterMatch) {
                const letter = letterMatch[1].toUpperCase();
                displayAIAnswer(letter, 85);
                highlightAnswer(letter);
            } else {
                displayAIAnswer(answer, null);
            }
            
        } catch (error) {
            log(`AI Error: ${error.message}`, '#ff0000');
            displayAIAnswer(`Error: ${error.message}`);
        }
    }
    

    
    function detectQuestionChange() {
        const questionText = getQuestionText();
        if (!questionText) return false;
        
        const answerTexts = getAnswerTexts();
        const currentHash = hashString(questionText + answerTexts.join(''));
        
        if (currentHash !== lastQuestionHash) {
            lastQuestionHash = currentHash;
            
            currentQuestionData = {
                question: questionText,
                answers: answerTexts
            };
            
            displayQuestion(questionText);
                


            
            const teacherAnswer = findAnswerByQuestionText(questionText);
            
            if (teacherAnswer) {
            }
            
            if (teacherAnswer) {
                log(`Found answer: ${teacherAnswer.answerLetter || teacherAnswer.answerText}`, '#00ff00');
                
                if (CONFIG.autoUpdate) {
                    
                    const searchBar = document.getElementById('olm-search-bar');
                    
                    if (searchBar) {
                        searchBar.value = questionText;
                        searchBar.dispatchEvent(new Event('input'));
                    } else {
                    }
                    
                    if (teacherAnswer.answerLetter) {
                        setTimeout(() => {
                            const result = selectAnswer(teacherAnswer.answerLetter);
                        }, 300);
                    } else {
                    }
                } else {
                }
            } else {
                        setTimeout(() => {
                    askAIForAnswer();
                }, 500);
            }
            
            return true;
        }
        
        return false;
    }
    

    
    function createScreenshotOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'olm-screenshot-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999998;
            cursor: crosshair;
        `;
        
        const hint = document.createElement('div');
        hint.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(27, 31, 40, 0.7);
            backdrop-filter: blur(20px);
            color: #fff;
            padding: 16px 28px;
            border-radius: 12px;
            border: 1px solid rgba(145, 70, 255, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 15px;
            font-weight: 600;
            z-index: 1000000000;
        `;
        hint.textContent = '📸 Click and drag to capture question';
        
        overlay.appendChild(hint);
        document.body.appendChild(overlay);
        
        let startX, startY, selectionBox;
        
        function mouseDownHandler(e) {
            if (e.target !== overlay) return;
            
            startX = e.clientX;
            startY = e.clientY;
            
            selectionBox = document.createElement('div');
            selectionBox.style.cssText = `
                position: fixed;
                border: 2px solid #9146ff;
                background: rgba(145, 70, 255, 0.25);
                backdrop-filter: brightness(2.2);
                -webkit-backdrop-filter: brightness(2.2);
                z-index: 9999999;
                pointer-events: none;
                will-change: transform, width, height;
                transition: none;
            `;
            document.body.appendChild(selectionBox);
        }
        
        function mouseMoveHandler(e) {
            if (!selectionBox) return;
            
            const currentX = e.clientX;
            const currentY = e.clientY;
            
            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            
            selectionBox.style.left = left + 'px';
            selectionBox.style.top = top + 'px';
            selectionBox.style.width = width + 'px';
            selectionBox.style.height = height + 'px';
        }
        
        function mouseUpHandler(e) {
            if (!selectionBox) return;
            
            const rect = selectionBox.getBoundingClientRect();
            
            if (rect.width > 50 && rect.height > 50) {
                captureScreenArea(rect.left, rect.top, rect.width, rect.height);
            }
            
            selectionBox.remove();
            overlay.remove();
            document.removeEventListener('mousedown', mouseDownHandler);
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            document.removeEventListener('keydown', escHandler);
        }
        
        function escHandler(e) {
            if (e.key === 'Escape') {
                if (selectionBox) selectionBox.remove();
                overlay.remove();
                document.removeEventListener('mousedown', mouseDownHandler);
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
                document.removeEventListener('keydown', escHandler);
            }
        }
        
        document.addEventListener('mousedown', mouseDownHandler);
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        document.addEventListener('keydown', escHandler);
    }
    
    async function captureScreenArea(left, top, width, height) {
        try {
            if (typeof html2canvas !== 'undefined') {
                const olmPanel = document.getElementById('olm-cheat-panel');
                const wasVisible = olmPanel && olmPanel.style.display !== 'none';
                if (olmPanel) olmPanel.style.display = 'none';
                
                await new Promise(resolve => setTimeout(resolve, 50));
                
                const canvas = await html2canvas(document.body, {
                    x: left,
                    y: top,
                    width: width,
                    height: height,
                    useCORS: true,
                    ignoreElements: (element) => {
                        return element.id === 'olm-cheat-panel' || 
                               element.id === 'olm-cheat-container' ||
                               element.classList?.contains('olm-');
                    }
                });
                
                if (olmPanel && wasVisible) olmPanel.style.display = '';
                
                currentImageBase64 = canvas.toDataURL('image/png');
                
                log('📸 Screenshot captured, converting...', '#0ff');
                
                await convertImageToTextAndAnswer();
            }
        } catch (err) {
            const olmPanel = document.getElementById('olm-cheat-panel');
            if (olmPanel) olmPanel.style.display = '';
            
            log(`Screenshot error: ${err}`, '#ff0000');
        }
    }
    
    async function convertImageToTextAndAnswer() {
        if (!currentImageBase64) return;
        
        try {
            log('Using vision AI to extract text...', '#9146ff');
            
            const visionResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.groqApiKey}`
                },
                body: JSON.stringify({
                    model: CONFIG.groqVisionModel,
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Extract ONLY the question text from this image. Ignore any answer options (A, B, C, D), buttons, UI elements, or formatting. Output just the question text, nothing else.' },
                            { type: 'image_url', image_url: { url: currentImageBase64 } }
                        ]
                    }],
                    max_tokens: 1500,
                    temperature: 0.1
                })
            });
            
            if (!visionResponse.ok) {
                const errorText = await visionResponse.text();
                log(`Vision API Error: ${errorText}`, '#ff0000');
                
                if (visionResponse.status === 429 || errorText.includes('rate_limit') || errorText.includes('quota')) {
                    throw new Error('API rate limit! Get your own free Groq key at console.groq.com');
                }
                
                throw new Error(`Vision API ${visionResponse.status}`);
            }
            
            const visionData = await visionResponse.json();
            const extractedText = visionData.choices?.[0]?.message?.content?.trim();
            
            if (!extractedText) {
                throw new Error('No text extracted from image');
            }
            
            log(`✓ Extracted: ${extractedText.substring(0, 200)}...`, '#0ff');
            
            currentImageBase64 = null;
            const searchBar = document.getElementById('olm-search-bar');
            if (searchBar) {
                searchBar.value = extractedText;
                searchBar.dispatchEvent(new Event('input')); // Trigger search
                }
            
            const teacherAnswer = findAnswerByQuestionText(extractedText);
            
            if (teacherAnswer) {
            } else {
                await askAIForAnswer(extractedText);
            }
            
        } catch (error) {
            log(`Image conversion error: ${error.message}`, '#ff0000');
            displayAIAnswer(`Error: ${error.message}`);
        }
    }
    

    
    function selectAnswer(letter) {
        const answerElements = getAnswerElements();
        const index = letter.toUpperCase().charCodeAt(0) - 65;
        
        if (answerElements[index]) {
            const el = answerElements[index];
            
            const input = el.querySelector('input') || 
                          el.previousElementSibling?.tagName === 'INPUT' ? el.previousElementSibling :
                          document.querySelector(`input[id="${el.getAttribute('for')}"]`);
            
            if (input) {
                input.click();
                input.checked = true;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            el.click();
            log(`Selected: ${letter}`, '#00ff00');
        }
    }
    

    
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
                        if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                createScreenshotOverlay();
                log('Screenshot mode activated', '#0ff');
                return;
            }
            
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key.toLowerCase()) {
                case 'w': case 'a':
                    selectAnswer('A');
                    break;
                case 's': case 'b':
                    selectAnswer('B');
                    break;
                case 'd': case 'c':
                    selectAnswer('C');
                    break;
                case 'e':
                    selectAnswer('D');
                    break;
            }
        });
        
    }
    

    
    function setupDragAndResize() {
        const panel = document.getElementById('olm-cheat-panel');
        const container = document.getElementById('olm-cheat-container');
        const handle = document.getElementById('olm-drag-handle');
        
        if (!panel || !container || !handle) return;
        
        
        let dragState = { dragging: false, startX: 0, startY: 0, initX: 0, initY: 0 };
        let dragRAF = null;
        let currentDragX = 0;
        let currentDragY = 0;
        let targetDragX = 0;
        let targetDragY = 0;
        
        handle.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            
            const rect = container.getBoundingClientRect();
            container.style.right = 'auto';
            container.style.left = `${rect.left}px`;
            container.style.top = `${rect.top}px`;
            
            currentDragX = rect.left;
            currentDragY = rect.top;
            targetDragX = rect.left;
            targetDragY = rect.top;
            
            dragState = { 
                dragging: true, 
                startX: e.clientX, 
                startY: e.clientY, 
                initX: rect.left, 
                initY: rect.top 
            };
            
            container.style.transition = 'none';
            window.addEventListener('pointermove', onPointerMoveDrag);
            window.addEventListener('pointerup', onPointerUpDrag);
            
            function smoothDrag() {
                if (!dragState.dragging) return;
                
                currentDragX += (targetDragX - currentDragX) * 0.3;
                currentDragY += (targetDragY - currentDragY) * 0.3;
                
                container.style.left = `${currentDragX}px`;
                container.style.top = `${currentDragY}px`;
                
                dragRAF = requestAnimationFrame(smoothDrag);
            }
            smoothDrag();
        });
        
        function onPointerMoveDrag(e) {
            if (!dragState.dragging) return;
            e.preventDefault();
            
            const dx = e.clientX - dragState.startX;
            const dy = e.clientY - dragState.startY;
            let left = dragState.initX + dx;
            let top = dragState.initY + dy;
            
            const rect = container.getBoundingClientRect();
            const maxL = window.innerWidth - rect.width - 6;
            const maxT = window.innerHeight - rect.height - 6;
            left = Math.max(6, Math.min(maxL, left));
            top = Math.max(6, Math.min(maxT, top));
            
            targetDragX = left;
            targetDragY = top;
        }
        
        function onPointerUpDrag() {
            dragState.dragging = false;
            if (dragRAF) cancelAnimationFrame(dragRAF);
            window.removeEventListener('pointermove', onPointerMoveDrag);
            window.removeEventListener('pointerup', onPointerUpDrag);
            container.style.transition = '';
        }
        
        
        const resizeHandle = panel.querySelector('.resize-handle');
        
        let resizeState = { active: false, startX: 0, startY: 0, startW: 0, startH: 0, startLeft: 0 };
        let resizeRAF = null;
        let currentResizeW = 0;
        let currentResizeH = 0;
        let currentResizeL = 0;
        let targetResizeW = 0;
        let targetResizeH = 0;
        let targetResizeL = 0;
        
        if (resizeHandle) {
            resizeHandle.addEventListener('pointerdown', (e) => {
                if (e.button !== 0 && e.pointerType === 'mouse') return;
                e.preventDefault();
                e.stopPropagation();
                
                const rect = container.getBoundingClientRect();
                resizeState = {
                    active: true,
                    startX: e.clientX,
                    startY: e.clientY,
                    startW: rect.width,
                    startH: rect.height,
                    startLeft: rect.left
                };
                
                currentResizeW = rect.width;
                currentResizeH = rect.height;
                currentResizeL = rect.left;
                targetResizeW = rect.width;
                targetResizeH = rect.height;
                targetResizeL = rect.left;
                
                isResizing = true;
                container.style.transition = 'none';
                window.addEventListener('pointermove', onPointerMoveResize);
                window.addEventListener('pointerup', onPointerUpResize);
                
                function smoothResize() {
                    if (!resizeState.active) return;
                    
                    currentResizeW += (targetResizeW - currentResizeW) * 0.3;
                    currentResizeH += (targetResizeH - currentResizeH) * 0.3;
                    currentResizeL += (targetResizeL - currentResizeL) * 0.3;
                    
                    container.style.width = currentResizeW + 'px';
                    container.style.height = currentResizeH + 'px';
                    container.style.left = currentResizeL + 'px';
                    
                    resizeRAF = requestAnimationFrame(smoothResize);
                }
                smoothResize();
            });
        }
        
        function onPointerMoveResize(e) {
            if (!resizeState.active) return;
            e.preventDefault();
            
            const deltaX = resizeState.startX - e.clientX;
            const deltaY = e.clientY - resizeState.startY;
            
            const MIN_W = 300;
            const MIN_H = 200;
            
            const newWidth  = Math.max(MIN_W, resizeState.startW + deltaX);
            const newHeight = Math.max(MIN_H, resizeState.startH + deltaY);
            const actualDeltaX = newWidth - resizeState.startW;
            const newLeft = resizeState.startLeft - actualDeltaX;
            
            targetResizeW = newWidth;
            targetResizeH = newHeight;
            targetResizeL = newLeft;
        }
        
        function onPointerUpResize() {
            resizeState.active = false;
            isResizing = false;
            if (resizeRAF) cancelAnimationFrame(resizeRAF);
            window.removeEventListener('pointermove', onPointerMoveResize);
            window.removeEventListener('pointerup', onPointerUpResize);
            container.style.transition = '';
        }
    }
    
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'olm-cheat-panel';
        panel.innerHTML = `
<style>
    #olm-cheat-container {
        position: fixed;
        top: 10px;
        right: 10px;
        width: 480px;
        height: 700px;
        background: rgba(30, 25, 35, 0.65);
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
        border: 1px solid rgba(145, 70, 255, 0.3);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: height 0.3s ease;
        will-change: transform, width, height;
        transform: translateZ(0);
    }
    
    #olm-drag-handle {
        cursor: grab;
        user-select: none;
    }
    
    #olm-drag-handle:active {
        cursor: grabbing;
    }
    
    .resize-handle {
        position: absolute;
        left: 6px;
        bottom: 6px;
        width: 22px;
        height: 22px;
        cursor: nesw-resize;
        border-left: 3px solid rgba(145, 70, 255, 0.9);
        border-bottom: 3px solid rgba(145, 70, 255, 0.9);
        border-bottom-left-radius: 4px;
        z-index: 10;
        transition: opacity 0.3s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        box-shadow: -2px 2px 8px rgba(145, 70, 255, 0.4);
    }
    
    .resize-handle::after {
        content: '';
        position: absolute;
        left: 4px;
        bottom: 4px;
        width: 8px;
        height: 8px;
        border-left: 2px solid rgba(145, 70, 255, 0.55);
        border-bottom: 2px solid rgba(145, 70, 255, 0.55);
        border-bottom-left-radius: 2px;
    }
    
    .resize-handle:hover {
        border-color: #c084ff;
        box-shadow: -3px 3px 14px rgba(145, 70, 255, 0.75);
    }
    
    .resize-handle.hidden {
        opacity: 0;
        pointer-events: none;
    }
    
    #jerry-link:hover {
        color: #ff4444 !important;
        text-shadow: 0 0 8px rgba(255, 68, 68, 0.7);
    }
    
    /* "by Jerry" hover glow - whole span */
    #by-jerry:hover {
        color: #ff4444 !important;
        text-shadow: 0 0 8px rgba(255, 68, 68, 0.7);
    }
    
    /* Custom Scrollbar */
    #olm-qa-list::-webkit-scrollbar {
        width: 8px;
    }
    
    #olm-qa-list::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
    }
    
    #olm-qa-list::-webkit-scrollbar-thumb {
        background: rgba(145, 70, 255, 0.5);
        border-radius: 4px;
    }
    
    #olm-qa-list::-webkit-scrollbar-thumb:hover {
        background: rgba(145, 70, 255, 0.8);
    }
    
    .qa-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 30px 0;
        color: rgba(255, 255, 255, 0.5);
        gap: 0;
    }
    
    .qa-loading > div:first-child,
    .qa-loading > div:nth-child(2),
    .qa-loading > div:nth-child(3) {
        display: inline-block;
    }
    
    .qa-loading {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 6px;
    }
    
    .qa-loading-dot {
        width: 7px;
        height: 7px;
        background: rgba(145, 70, 255, 0.7);
        border-radius: 50%;
        animation: olm-pulse 1.2s ease-in-out infinite;
    }
    
    .qa-loading-dot:nth-child(2) { animation-delay: 0.2s; }
    .qa-loading-dot:nth-child(3) { animation-delay: 0.4s; }
    
    @keyframes olm-pulse {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
        40% { transform: scale(1); opacity: 1; }
    }
    
    .qa-loading > div:last-child {
        flex-basis: 100%;
        text-align: center;
    }
    
    /* iOS Toggle Switch - Better styling */
    .toggle-switch {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 28px;
    }
    
    .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    
    .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        transition: .3s;
        border-radius: 28px;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .toggle-slider:before {
        position: absolute;
        content: "";
        height: 25px;
        width: 25px;
        left: 3px;
        top: 4.5px;
        background-color: white;
        transition: .3s;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    input:checked + .toggle-slider {
        background-color: #9146ff;
        border-color: #9146ff;
    }
    
    input:checked + .toggle-slider:before {
        transform: translateX(20px);
    }
    
    /* Search Bar */
    #olm-search-bar {
        width: 100%;
        padding: 10px 12px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(145, 70, 255, 0.4);
        border-radius: 8px;
        color: #fff;
        font-size: 13px;
        outline: none;
        box-sizing: border-box;
    }
    
    #olm-search-bar:focus {
        border-color: #9146ff;
        box-shadow: 0 0 8px rgba(145, 70, 255, 0.3);
    }
    
    #olm-search-bar::placeholder {
        color: rgba(255, 255, 255, 0.4);
    }
    
    /* Q&A List */
    .qa-item {
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(145, 70, 255, 0.2);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .qa-item:hover {
        background: rgba(145, 70, 255, 0.2);
        border-color: rgba(145, 70, 255, 0.5);
    }
    
    .qa-item.highlighted {
        background: rgba(145, 70, 255, 0.4);
        border-color: #9146ff;
        box-shadow: 0 0 12px rgba(145, 70, 255, 0.5);
    }
    
    .qa-question {
        color: rgba(255, 255, 255, 0.9);
        font-size: 12px;
        line-height: 1.8;
        margin-bottom: 6px;
    }
    
    .qa-answer {
        color: #00ff00;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.8;
        white-space: pre-line;
    }
    
    /* Answer Display */
    #olm-answer-display {
        background: rgba(0, 255, 0, 0.1);
        border: 2px solid rgba(0, 255, 0, 0.4);
        border-radius: 8px;
        padding: 12px;
        color: #00ff00;
        font-size: 14px;
        font-weight: 600;
        line-height: 2;
        min-height: 60px;
        display: none;
        word-break: break-word;
        white-space: pre-line;
    }
    
    #olm-answer-display.show {
        display: block;
    }
</style>

<div id="olm-cheat-container">
    <!-- Title Bar -->
    <div id="olm-drag-handle" style="
        background: linear-gradient(135deg, rgba(145, 70, 255, 0.3) 0%, rgba(145, 70, 255, 0.2) 100%);
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.95);
        border-bottom: 1px solid rgba(145, 70, 255, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
    ">
        <div style="display: flex; align-items: center; gap: 8px;">
            <img src="https://files.catbox.moe/hnd9dc.png" style="width: 20px; height: 20px; border-radius: 4px;" onerror="this.style.display='none'">
            <div style="display: flex; align-items: baseline; gap: 6px;">
                <span style="font-size: 14px; font-weight: 600;">OLM CHEAT V2.0</span>
                <span id="by-jerry" style="font-size: 12px; color: rgba(255, 255, 255, 0.6); transition: color .15s ease, text-shadow .15s ease; cursor: pointer;">
                    by <span style="text-decoration: underline;">Jerry</span>
                </span>
            </div>
        </div>
        <div style="display: flex; gap: 4px;">
            <button id="olm-minimize-btn" style="
                background: rgba(255, 255, 255, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #fff;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 20px;
                line-height: 28px;
                text-align: center;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            " onmouseover="this.style.background='rgba(255, 255, 255, 0.25)'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.15)'; this.style.transform='translateY(0)'">−</button>
            <button onclick="
                var panel = document.getElementById('olm-cheat-panel');
                panel.style.transition = 'opacity 0.3s, transform 0.3s';
                panel.style.opacity = '0';
                panel.style.transform = 'scale(0.9)';
                setTimeout(() => panel.remove(), 300);
            " style="
                background: rgba(255, 0, 0, 0.2);
                border: 1px solid rgba(255, 0, 0, 0.3);
                color: #fff;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 20px;
                line-height: 28px;
                text-align: center;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            " onmouseover="this.style.background='rgba(255, 68, 68, 0.3)'; this.style.borderColor='rgba(255, 68, 68, 0.5)'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(255, 0, 0, 0.2)'; this.style.borderColor='rgba(255, 0, 0, 0.3)'; this.style.transform='translateY(0)'">✕</button>
        </div>
    </div>
    
    <!-- Content -->
    <div style="flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px;">
        
        <!-- Time Control Toggle -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255, 255, 0, 0.08); border: 1px solid rgba(255, 255, 0, 0.3); border-radius: 8px;">
            <span style="font-size: 12px; color: rgba(255, 255, 255, 0.9); font-weight: 600;">⏱️ FREEZE TIME</span>
            <label class="toggle-switch">
                <input type="checkbox" id="olm-time-toggle">
                <span class="toggle-slider"></span>
            </label>
        </div>
        
        <!-- Answer Display (Hidden by default) -->
        <div id="olm-answer-display"></div>
        
        <!-- Search Bar -->
        <div>
            <input type="text" id="olm-search-bar" placeholder="🔍 Search questions or screenshot (Ctrl+Space)...">
        </div>
        
        <!-- Q&A List -->
        <div id="olm-qa-list" style="flex: 1; overflow-y: auto; padding-right: 4px;">
            <div class="qa-loading">
                <div class="qa-loading-dot"></div>
                <div class="qa-loading-dot"></div>
                <div class="qa-loading-dot"></div>
                <div style="margin-top: 10px; font-size: 11px; opacity: 0.6;">Fetching answers...</div>
            </div>
        </div>
    </div>
    
    <!-- Resize Handle -->
    <div class="resize-handle"></div>
</div>
`;
        
        document.body.appendChild(panel);
        
        setupDragAndResize();
        setupTimeToggle();
        setupSearch();
        setupJerryLink();
        setupMinimize();
    }
    

    
    
    function populateQAList() {
        const list = document.getElementById('olm-qa-list');
        if (!list) {
                setTimeout(populateQAList, 100);
            return;
        }
        
        if (!teacherDocAnswers || teacherDocAnswers.length === 0) {
            const isExamPage = window.location.pathname.match(/\/chu-de\//);
            
            if (!isExamPage) {
                list.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6); user-select: none;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
                        <div style="font-size: 15px; font-weight: 600; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px;">No exam detected</div>
                        <div style="font-size: 12px;">Join an exam to load answers</div>
                    </div>
                `;
            } else {
                list.innerHTML = '<div class="qa-loading"><div class="qa-loading-dot"></div><div class="qa-loading-dot"></div><div class="qa-loading-dot"></div><div style="margin-top:10px;font-size:11px;opacity:0.5;">No answers loaded</div></div>';
            }
            return;
        }
        
        
        list.innerHTML = '';
        teacherDocAnswers.forEach((qa, index) => {
            const item = document.createElement('div');
            item.className = 'qa-item';
            item.dataset.index = index;
            
            const checkmark = (qa.isTrueFalse || qa.isTextAnswer) ? '' : '✓ ';
            
            item.innerHTML = `
                <div class="qa-question">${qa.question.replace(/\[IMG:[^\]]+\]/g, "[formulas]").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
                <div class="qa-answer">${checkmark}${qa.answerText.replace(/\[IMG:[^\]]+\]/g, "[formulas]").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
            `;
            
            item.onclick = () => {
                document.querySelectorAll('.qa-item').forEach(i => i.classList.remove('highlighted'));
                item.classList.add('highlighted');
                updateAnswerDisplay(qa.answerText);
            };
            
            list.appendChild(item);
        });
        

    }
    
    function updateAnswerDisplay(text) {
        const display = document.getElementById('olm-answer-display');
        if (!display) return;
        
        if (text) {
            display.textContent = text.replace(/\[IMG:[^\]]+\]/g, "[formulas]");
            display.classList.add('show');
        } else {
            display.innerHTML = '';
            display.classList.remove('show');
        }
    }
    
    function setupTimeToggle() {
        const toggle = document.getElementById('olm-time-toggle');
        if (!toggle) return;
        
        toggle.addEventListener('change', function() {
            CONFIG.isPaused = this.checked;
            if (this.checked) {
                log('Time frozen', '#ffff00');
                stopAllTimers();
            } else {
                log('Time resumed', '#00ff00');
                resumeAllTimers();
            }
        });
    }
    
    function setupSearch() {
        const searchBar = document.getElementById('olm-search-bar');
        if (!searchBar) return;
        
        searchBar.addEventListener('input', function() {
            const query = this.value.trim();
            
            if (!query) {
                document.querySelectorAll('.qa-item').forEach(item => {
                    item.style.display = 'block';
                    item.classList.remove('highlighted');
                });
                updateAnswerDisplay('');
                return;
            }
            
            const match = findBestMatch(query, teacherDocAnswers);
            
            let foundMatch = false;
            document.querySelectorAll('.qa-item').forEach(item => {
                const index = parseInt(item.dataset.index);
                const qa = teacherDocAnswers[index];
                
                if (match && qa === match) {
                    item.style.display = 'block';
                    item.classList.add('highlighted');
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    updateAnswerDisplay(qa.answerText);
                    foundMatch = true;
                } else {
                    const normalizedQ = normalizeVietnamese(qa.question);
                    const normalizedQuery = normalizeVietnamese(query);
                    
                    if (normalizedQ.includes(normalizedQuery)) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                        item.classList.remove('highlighted');
                    }
                }
            });
            
            if (!foundMatch) {
                updateAnswerDisplay('');
            }
        });
    }
    
    function setupJerryLink() {
        const byJerry = document.getElementById('by-jerry');
        if (!byJerry) return;
        
        byJerry.onclick = (e) => {
            e.preventDefault();
            window.open(CONFIG.githubUrl, '_blank');
        };
    }
    
    function setupMinimize() {
        const minBtn = document.getElementById('olm-minimize-btn');
        const content = document.querySelector('#olm-cheat-container > div:nth-child(2)');
        const container = document.getElementById('olm-cheat-container');
        const resizeHandle = document.querySelector('.resize-handle');
        
        if (!minBtn || !content || !container) return;
        
        let isMinimized = false;
        let savedHeight = null;
        
        minBtn.onclick = () => {
            if (isMinimized) {
                container.style.height = savedHeight || '700px';
                content.style.display = 'flex';
                minBtn.textContent = '−';
                minBtn.style.lineHeight = '28px';
                if (resizeHandle) resizeHandle.classList.remove('hidden');
            } else {
                savedHeight = container.getBoundingClientRect().height + 'px';
                container.style.height = '44px';
                content.style.display = 'none';
                minBtn.textContent = '+';
                minBtn.style.lineHeight = '26px';
                if (resizeHandle) resizeHandle.classList.add('hidden');
            }
            isMinimized = !isMinimized;
        };
    }
    
    function startQuestionMonitoring() {
        setInterval(() => {
            detectQuestionChange();
        }, 200);
        
        const observer = new MutationObserver(() => {
            detectQuestionChange();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
        
    }
    

    
    function applyPerformanceMode() {
        
        if (CONFIG.performanceMode) {
            
            const existing = document.getElementById('olm-performance-mode');
            if (existing) {
                existing.remove();
            }
            
            const style = document.createElement('style');
            style.id = 'olm-performance-mode';
            style.textContent = `
                *,
                *::before,
                *::after {
                    animation: none !important;
                    transition: none !important;
                    scroll-behavior: auto !important;
                }
                #olm-cheat-container {
                    animation: none !important;
                    transition: none !important;
                }
            `;
            document.head.appendChild(style);
            
            
            const check = document.getElementById('olm-performance-mode');
            if (check) {
            } else {
            }
        } else {
            
            const style = document.getElementById('olm-performance-mode');
            if (style) {
                style.remove();
            } else {
            }
        }
    }
    
    function init() {
        
        try {
            const autoUpdate = localStorage.getItem('olm_autoUpdate');
            const performanceMode = localStorage.getItem('olm_performanceMode');
            
            
            if (autoUpdate !== null) {
                CONFIG.autoUpdate = autoUpdate === 'true';
            } else {
            }
            
            if (performanceMode !== null) {
                CONFIG.performanceMode = performanceMode === 'true';
                applyPerformanceMode();
            }
            
        } catch (error) {
        }
        
        bypassTabDetection();
        setupKeyboardShortcuts();
        createControlPanel();
        startQuestionMonitoring();
        
        // Check if time was frozen before page reload
        try {
            if (localStorage.getItem('olm_time_frozen') === 'true') {
                const savedFrozenTime = localStorage.getItem('olm_frozen_time');
                if (savedFrozenTime) {
                    timeFrozen = true;
                    frozenTimeSpent = JSON.parse(savedFrozenTime);
                    CONFIG.isPaused = true;
                    
                    // Update the toggle UI to OFF (unfrozen) after reload
                    setTimeout(() => {
                        const toggle = document.getElementById('olm-time-toggle');
                        if (toggle) toggle.checked = false;
                    }, 500);
                }
            }
        } catch(e) {}
        
        // Poll for EXAM_UI and disable anti-cheat
        if (!hijackEXAMUI()) {
            const examPollInterval = setInterval(() => {
                if (hijackEXAMUI()) {
                    clearInterval(examPollInterval);
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(examPollInterval);
            }, 10000);
        }
        
        // Poll for CATE_UI and hijack it for server-side time control
        if (!hijackCATEUI()) {
            const pollInterval = setInterval(() => {
                if (hijackCATEUI()) {
                    clearInterval(pollInterval);
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(pollInterval);
            }, 10000);
        }
        
        setTimeout(() => {

            downloadAndParseTeacherDoc();
        }, 1000);
        
        window.olmCheat = {
            select: selectAnswer,
            copyQ: copyQuestionToClipboard,
            toggleStop: toggleStop,
            config: CONFIG,
            version: CONFIG.version,
            refreshTeacherDoc: downloadAndParseTeacherDoc,
            getTeacherDoc: () => teacherDocAnswers,
            testMatch: (text) => {
                const result = findAnswerByQuestionText(text);
                return result;
            },
            showAllQuestions: () => {
                if (!teacherDocAnswers || teacherDocAnswers.length === 0) {
                    return;
                }
                teacherDocAnswers.forEach((qa, i) => {
                });
            }
        };
        
        
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
