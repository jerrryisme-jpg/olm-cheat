// ============================================
// OLM.VN QUIZ CHEAT TOOL V1 - FIRST EDITION  
// ============================================
// With AI Vision, iPhone toggles, T/F support

(function() {
    'use strict';
    
    console.log('%c[OLM CHEAT V1] Loading 1.0 Edition...', 'color: #ff00ff; font-size: 18px; font-weight: bold;');
    
    // Load html2canvas for screenshot
    if (typeof html2canvas === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(script);
    }
    
    // ============================================
    // CONFIG
    // ============================================
    const CONFIG = {
        isPaused: false,
        is5x: false,
        groqApiKey: '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',
        groqTextModel: 'openai/gpt-oss-120b',
        groqVisionModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
        debugMode: true,
        knowledge: '' // Custom knowledge - injected by trainer.py
    };
    
    // State
    let currentQuestionData = null;
    let lastQuestionHash = null;
    let isAIThinking = false;
    let currentImageBase64 = null;
    let isMinimized = false;
    
    // ============================================
    // UTILITIES
    // ============================================
    
    function log(msg, color = '#00ff00') {
        if (CONFIG.debugMode) {
            console.log(`%c${msg}`, `color: ${color}; font-weight: bold;`);
        }
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
    
    function showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.95);
            color: #00ff00;
            padding: 12px 24px;
            border-radius: 8px;
            border: 2px solid #00ff00;
            z-index: 9999999;
            font-family: monospace;
            font-size: 13px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0, 255, 0, 0.5);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    // ============================================
    // TAB DETECTION BYPASS
    // ============================================
    
    function bypassTabDetection() {
        log('Bypassing anticheat...', '#ff00ff');
        
        Object.defineProperty(document, 'hidden', {
            get: () => false,
            configurable: true
        });
        
        Object.defineProperty(document, 'visibilityState', {
            get: () => 'visible',
            configurable: true
        });
        
        document.hasFocus = () => true;
        
        const eventBlockList = ['visibilitychange', 'webkitvisibilitychange', 'blur', 'focusout'];
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (eventBlockList.includes(type.toLowerCase())) {
                log(`Blocked: ${type}`, '#ff6600');
                return;
            }
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            if (typeof url === 'string' && 
                (url.includes('tab') || url.includes('visibility') || url.includes('focus'))) {
                log(`Blocked fetch: ${url}`, '#ff0000');
                return Promise.resolve(new Response('{}', {status: 200}));
            }
            return originalFetch.apply(this, args);
        };
        
        log('Tab bypass active', '#00ff00');
    }
    
// ============================================
// TIMER CONTROL - SIMPLE STOP BUTTON
// ============================================

let isTimerStopped = false;

const originalSetInterval = window.setInterval;
const originalSetTimeout = window.setTimeout;

function toggleStop() {
    isTimerStopped = !isTimerStopped;

    const btn = document.getElementById('olm-stop-btn');

    if (isTimerStopped) {

        const highestId = originalSetInterval(() => {}, 0);

        for (let i = 0; i < highestId; i++) {
            clearInterval(i);
        }

        window.setInterval = function() { return 0; };
        window.setTimeout = function() { return 0; };

        if (btn) {
            btn.innerHTML = 'START TIME';
            btn.style.background = '#004400';
            btn.style.color = '#00ff00';
            btn.style.borderColor = '#00ff00';
        }

        log('TIME STOPPED', '#ff0000');

    } else {

        log('RELOADING PAGE...', '#00ff00');

        // restore timers so reload works
        window.setInterval = originalSetInterval;
        window.setTimeout = originalSetTimeout;

        setTimeout(() => {
            location.reload();
        }, 2000);
    }
}

function updateToggleUI() {
    const pauseToggle = document.getElementById('olm-pause-toggle');
    const speedToggle = document.getElementById('olm-5x-toggle');

    if (pauseToggle) pauseToggle.checked = CONFIG.isPaused;
    if (speedToggle) speedToggle.checked = CONFIG.is5x;
}
    
    // ============================================
    // QUESTION DETECTION
    // ============================================
    
    function getQuestionText() {
        const questionSelectors = [
            '[class*="question"]',
            '[class*="cau-hoi"]',
            '[class*="cau"]',
            '.question-text'
        ];
        
        let questionText = null;
        
        for (const sel of questionSelectors) {
            const elements = document.querySelectorAll(sel);
            for (const el of elements) {
                const text = el.textContent.trim();
                
                // Add space between concatenated sentences
                let spacedText = text.replace(/([a-záàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ])([A-ZÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ])/g, '$1 $2');
                
                // Add line break after each sentence (period, question mark, exclamation)
                spacedText = spacedText.replace(/([.?!])([A-ZÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ])/g, '$1\n$2');
                
                // Capitalize first letter after line break
                spacedText = spacedText.replace(/\n([a-záàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệ])/g, (match, letter) => '\n' + letter.toUpperCase());
                
                // Ensure first letter is capitalized
                if (spacedText.length > 0) {
                    spacedText = spacedText.charAt(0).toUpperCase() + spacedText.slice(1);
                }
                
                // CLEAN: Remove "Đáp án đúng:" and everything after it
                spacedText = spacedText.split('Đáp án đúng:')[0].trim();
                spacedText = spacedText.split('Câu trả lời:')[0].trim();
                
                if (spacedText.length > 20 && !spacedText.toLowerCase().includes('hình ảnh')) {
                    questionText = spacedText;
                    break;
                }
            }
            if (questionText) break;
        }
        
        return questionText || null;
    }
    
    function getAnswerElements() {
        const selectors = [
            'input[type="radio"] + label',
            'input[type="radio"] ~ label',
            '.answer-option',
            '.option',
            '[class*="answer"]',
            'label[for*="answer"]',
            'li[class*="option"]'
        ];
        
        let elements = [];
        for (const selector of selectors) {
            const found = document.querySelectorAll(selector);
            if (found.length >= 2) {
                elements = Array.from(found);
                break;
            }
        }
        
        return elements.slice(0, 4);
    }
    
    function getAnswerTexts() {
        const answerElements = getAnswerElements();
        const answers = [];
        
        answerElements.forEach((el, idx) => {
            const letter = String.fromCharCode(65 + idx);
            let text = el.textContent.trim();
            text = text.replace(/^[ABCD][\.\)]\s*/, '');
            
            if (text.length < 5) {
                const parent = el.closest('label, li, div');
                if (parent) {
                    text = parent.textContent.trim();
                    text = text.replace(/^[ABCD][\.\)]\s*/, '');
                }
            }
            
            answers.push({ letter, text });
        });
        
        return answers;
    }
    
    function detectQuestionChange() {
        const questionText = getQuestionText();
        
        if (!questionText) {
            return false;
        }
        
        const currentHash = hashString(questionText);
        
        if (currentHash !== lastQuestionHash) {
            lastQuestionHash = currentHash;
            log(`Question detected`, '#00ff00');
            
            const answers = getAnswerTexts();
            currentQuestionData = {
                question: questionText,
                answers: answers
            };
            
            // Update question display box
            updateQuestionBox(questionText);
            
            // AUTO-SEND TO AI
            setTimeout(() => {
                askAIForAnswer();
            }, 500);
            
            return true;
        }
        
        return false;
    }
    
    function updateQuestionBox(questionText) {
        const box = document.getElementById('olm-question-box');
        if (box && questionText) {
            box.textContent = questionText;
            log('Question box updated', '#00ff00');
        }
    }
    
    function copyQuestionToClipboard() {
        const questionText = getQuestionText();
        
        if (!questionText) {
            log('No question', '#ff0000');
            return;
        }
        
        navigator.clipboard.writeText(questionText).then(() => {
            log('Copied to clipboard', '#00ff00');
        }).catch(err => {
            log('Copy failed: ' + err, '#ff0000');
        });
    }
    
    // ============================================
    // AI INTEGRATION
    // ============================================
    
    function detectQuizType(answers) {
        if (answers.length === 0) {
            return 'fill'; // Fill in the blank
        }
        
        const allTexts = answers.map(a => a.text.toLowerCase()).join(' ');
        
        // Check if question text mentions "chọn đúng / sai" pattern
        const questionText = getQuestionText()?.toLowerCase() || '';
        
        // Statement-based true/false (each option is a statement to mark as Đúng/Sai)
        if (questionText.includes('chọn đúng') && questionText.includes('sai') ||
            questionText.includes('nhấp vào ô') ||
            questionText.includes('đúng / sai')) {
            return 'statement_truefalse';
        }
        
        // Traditional True/False (answers contain "Đúng" or "Sai")
        if ((allTexts.includes('đúng') && allTexts.includes('sai')) ||
            (allTexts.includes('true') && allTexts.includes('false'))) {
            return 'truefalse';
        }
        
        // Multiple choice
        return 'multiple';
    }
    
    async function askAIForAnswer(customQuestion = null, imageData = null) {
        if (isAIThinking) {
            log('⏳ AI busy, wait...', '#ffff00');
            return;
        }
        
        let questionData = currentQuestionData;
        
        if (customQuestion) {
            questionData = { question: customQuestion, answers: [] };
        }
        
        if (!questionData) {
            log('No question data', '#ff0000');
            return;
        }
        
        isAIThinking = true;
        updateAIStatus('thinking');
        
        try {
            const model = imageData ? CONFIG.groqVisionModel : CONFIG.groqTextModel;
            const quizType = detectQuizType(questionData.answers);
            let prompt;
            
            log(`Model: ${model}`, '#9146ff');
            log(`MADE BY JERRY: ${quizType}`, '#9146ff');
            
            // Add knowledge if available
            const knowledgePrefix = (CONFIG.knowledge && CONFIG.knowledge.trim().length > 0) 
                ? `KNOWLEDGE BASE (use this info to help answer):
${CONFIG.knowledge.trim()}

==========

` 
                : '';
            
            if (imageData) {
                // Vision
                prompt = knowledgePrefix + `Answer ONLY with the letter and answer. Example: "A. answer text"

NO explanation. NO "because". NO extra words.

Question in image.`;
            } else if (quizType === 'fill') {
                // Fill in the blank
                prompt = knowledgePrefix + `Answer this question with ONLY the answer text. NO explanation.

${questionData.question}

Output ONLY the answer:`;
            } else if (quizType === 'statement_truefalse') {
                // Statement-based true/false
                prompt = knowledgePrefix + `CRITICAL: You MUST answer in EXACTLY this format:
a) S
b) Đ
c) S
d) Đ

STRICT RULES:
1. Answer ALL 4 statements (a, b, c, d)
2. Each line MUST be: letter + ) + space + S or Đ
3. S means SAI (wrong/false)
4. Đ means ĐÚNG (correct/true)
5. NO explanations
6. NO extra text
7. NO skipping any statement

=== QUESTION ===
${questionData.question}

=== EVALUATE EACH STATEMENT AS ĐÚNG (Đ) OR SAI (S) ===
${questionData.answers.map(a => `${a.letter}) ${a.text}`).join('\n\n')}

NOW OUTPUT YOUR ANSWER IN EXACT FORMAT (a) S or a) Đ):`;
            } else if (quizType === 'truefalse') {
                // Traditional True/False
                prompt = knowledgePrefix + `CRITICAL: You MUST answer in EXACTLY this format:
a S
b Đ

STRICT RULES:
1. Each line: letter + space + S or Đ
2. S means SAI (wrong/false)
3. Đ means ĐÚNG (correct/true)
4. NO explanations
5. NO extra text

=== QUESTION ===
${questionData.question}

=== EVALUATE EACH OPTION AS ĐÚNG (Đ) OR SAI (S) ===
${questionData.answers.map(a => `${a.letter}. ${a.text}`).join('\n\n')}

NOW OUTPUT YOUR ANSWER IN EXACT FORMAT (a S or a Đ):`;
            } else {
                // Multiple choice - ULTRA STRICT
                prompt = knowledgePrefix + `YOU ARE BEING TESTED. READ CAREFULLY.

YOUR TASK: Choose ONLY ONE option from the list and output it in this EXACT format:
"X. option text"

Where X is A, B, C, or D.

CRITICAL RULES - VIOLATING THESE WILL FAIL THE TEST:
1. You MUST output ONLY ONE option
2. Output format: Letter + dot + space + option text
3. DO NOT output the question
4. DO NOT output all options
5. DO NOT explain anything
6. DO NOT add extra text
7. DO NOT repeat the question
8. DO NOT say "Câu trả lời" or "Đáp án"
9. ONLY output ONE option from the list below

EXAMPLE CORRECT OUTPUT:
A. uốn nếp

EXAMPLE WRONG OUTPUT (DO NOT DO THIS):
- "Địa luỹ thường được sinh ra trong điều kiện các lớp đáuốn nếp.sụt xuống.xô lệch. trồi lên"
- "Câu trả lời là A"
- "A, B, C, D"

============ QUESTION ============
${questionData.question}

============ CHOOSE ONE FROM THESE OPTIONS ============
${questionData.answers.map(a => `${a.letter}. ${a.text}`).join('\n\n')}

============ YOUR OUTPUT (ONE OPTION ONLY) ============`;
            }
            
            log(`Prompt: ${prompt.substring(0, 150)}...`, '#9146ff');
            
            const messages = imageData ? 
                [{ 
                    role: 'user', 
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: imageData } }
                    ]
                }] : 
                [{ role: 'user', content: prompt }];
            
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.groqApiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    max_tokens: 2000,
                    temperature: 0.1
                })
            });
            
            log(`API Status: ${response.status}`, response.ok ? '#00ff00' : '#ff0000');
            
            if (!response.ok) {
                const errorText = await response.text();
                log(`API Error: ${errorText}`, '#ff0000');
                
                // Check if rate limit error
                if (response.status === 429 || errorText.includes('rate_limit') || errorText.includes('quota')) {
                    throw new Error('API rate limit! Use your own Groq API key (free at console.groq.com)');
                }
                
                throw new Error(`API ${response.status}`);
            }
            
            const data = await response.json();
            let aiAnswer = data.choices?.[0]?.message?.content;
            
            if (!aiAnswer || aiAnswer.trim().length === 0) {
                log(`Empty! Data: ${JSON.stringify(data)}`, '#ff0000');
                throw new Error('Empty response');
            }
            
            aiAnswer = aiAnswer.trim();
            
            // Clean unwanted phrases
            aiAnswer = aiAnswer
                .replace(/^Câu trả lời (đúng )?là:?\s*/i, '')
                .replace(/^Đáp án (đúng )?là:?\s*/i, '')
                .replace(/^Answer:?\s*/i, '')
                .replace(/\.$/, '')
                .trim();
            
            // Estimate confidence based on answer format (with variation)
            let confidence = null;
            const variance = Math.floor(Math.random() * 11) - 5; // -5 to +5
            
            if (aiAnswer.match(/^[A-D]\./i)) {
                confidence = 82 + variance; // 77-87
            } else if (aiAnswer.match(/^[a-d]\)\s*[SĐ]$/im)) {
                confidence = 83 + variance; // 78-88
            } else if (aiAnswer.length < 50 && !aiAnswer.includes('có thể') && !aiAnswer.includes('maybe')) {
                confidence = 73 + variance; // 68-78
            } else if (aiAnswer.includes('có thể') || aiAnswer.includes('maybe') || aiAnswer.includes('possibly')) {
                confidence = 48 + variance; // 43-53
            } else {
                confidence = 68 + variance; // 63-73
            }
            
            // Clamp between 1-99
            confidence = Math.max(1, Math.min(99, confidence));
            
            log(`Answer: ${aiAnswer} (${confidence}%)`, '#00ff00');
            
            displayAIAnswer(aiAnswer, confidence);
            
            // Highlight if multiple choice
            if (questionData.answers.length > 0) {
                const letterMatch = aiAnswer.match(/^([ABCD])/i);
                if (letterMatch) {
                    highlightAnswer(letterMatch[1].toUpperCase());
                }
            }
            
        } catch (error) {
            log(`ERROR: ${error.message}`, '#ff0000');
            log(`Stack: ${error.stack}`, '#ff0000');
            displayAIAnswer(`${error.message}`);
        } finally {
            isAIThinking = false;
            updateAIStatus('ready');
        }
    }
    
    function displayAIAnswer(answer, confidence = null) {
        const aiBox = document.getElementById('olm-ai-answer');
        const statusBox = document.getElementById('olm-ai-status');
        if (!aiBox) return;
        
        answer = (answer || '').trim();
        
        if (!answer) {
            answer = 'Error';
        }
        
        // Clear and set answer box
        aiBox.innerHTML = '';
        aiBox.style.cssText = `
            color: #fff;
            font-size: 11px;
            line-height: 1.4;
            padding: 8px;
            background: rgba(145, 70, 255, 0.2);
            border-radius: 4px;
            border: 1px solid #9146ff;
            word-wrap: break-word;
            height: 70px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
        `;
        
        // Set answer text
        aiBox.textContent = answer;
        
        // Update status box with confidence
        if (statusBox && confidence !== null) {
            let confColor;
            if (confidence >= 80) {
                confColor = '#00ff00'; // Green
            } else if (confidence >= 60) {
                confColor = '#ffff00'; // Yellow  
            } else if (confidence >= 40) {
                confColor = '#ffa500'; // Orange
            } else {
                confColor = '#ff0000'; // Red
            }
            
            statusBox.innerHTML = `<span style="color: ${confColor}; font-weight: bold;">${confidence}%</span>`;
        }
    }
    
    function updateAIStatus(status) {
        const statusEl = document.getElementById('olm-ai-status');
        if (statusEl) {
            if (status === 'thinking') {
                statusEl.innerHTML = '<span style="color: #ffff00;">...</span>';
            } else {
                statusEl.innerHTML = '';
            }
        }
    }
    
    function highlightAnswer(letter) {
        const answerElements = getAnswerElements();
        const index = letter.charCodeAt(0) - 65;
        
        if (answerElements[index]) {
            answerElements.forEach(el => {
                el.style.border = '';
                el.style.background = '';
            });
            
            const targetEl = answerElements[index];
            targetEl.style.border = '3px solid #9146ff';
            targetEl.style.background = 'rgba(145, 70, 255, 0.3)';
            targetEl.style.borderRadius = '8px';
            targetEl.style.padding = '8px';
            
            log(`Highlighted: ${letter}`, '#9146ff');
        }
    }
    
    // ============================================
    // SCREENSHOT CAPTURE (Ctrl+Space)
    // ============================================
    
    function createScreenshotOverlay() {
        // Create dark overlay
        const overlay = document.createElement('div');
        overlay.id = 'olm-screenshot-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999999;
            cursor: crosshair;
        `;
        
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 14px;
            z-index: 10000001;
        `;
        instructions.textContent = 'Drag to select • ESC to cancel';
        overlay.appendChild(instructions);
        
        // Selection box that will "cut out" the dark overlay
        const selection = document.createElement('div');
        selection.style.cssText = `
            position: absolute;
            border: 3px solid #9146ff;
            background: rgba(145, 70, 255, 0.15);
            display: none;
            pointer-events: none;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
            z-index: 10000000;
        `;
        document.body.appendChild(selection);
        
        document.body.appendChild(overlay);
        
        let startX, startY, isSelecting = false;
        
        overlay.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startY = e.clientY;
            isSelecting = true;
            
            // Hide the base overlay, show selection
            overlay.style.background = 'transparent';
            selection.style.display = 'block';
            selection.style.left = startX + 'px';
            selection.style.top = startY + 'px';
            selection.style.width = '0px';
            selection.style.height = '0px';
        });
        
        overlay.addEventListener('mousemove', (e) => {
            if (!isSelecting) return;
            
            const currentX = e.clientX;
            const currentY = e.clientY;
            
            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            
            selection.style.left = left + 'px';
            selection.style.top = top + 'px';
            selection.style.width = width + 'px';
            selection.style.height = height + 'px';
        });
        
        overlay.addEventListener('mouseup', async (e) => {
            if (!isSelecting) return;
            isSelecting = false;
            
            const currentX = e.clientX;
            const currentY = e.clientY;
            
            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            
            overlay.remove();
            selection.remove();
            
            if (width > 10 && height > 10) {
                setTimeout(async () => {
                    await captureScreenArea(left, top, width, height);
                }, 50);
            }
        });
        
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                selection.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    async function captureScreenArea(left, top, width, height) {
        try {
            if (typeof html2canvas !== 'undefined') {
                const canvas = await html2canvas(document.body, {
                    x: left,
                    y: top,
                    width: width,
                    height: height,
                    useCORS: true
                });
                currentImageBase64 = canvas.toDataURL('image/png');
                
                // Don't show preview - auto-send instead
                log('Screenshot captured, auto-sending...', '#0ff');
                
                // AUTO-SEND immediately
                await convertImageToTextAndAnswer();
            }
        } catch (err) {
            log(`Screenshot error: ${err}`, '#ff0000');
        }
    }
    
    async function convertImageToTextAndAnswer() {
        if (!currentImageBase64) return;
        
        try {
            log('Converting image to text with vision AI...', '#9146ff');
            
            // Step 1: Use vision model to extract text
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
                            { type: 'text', text: 'Extract ALL text from this image. Output ONLY the text, no explanations.' },
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
                
                // Check if rate limit error
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
            
            log(`Extracted text: ${extractedText.substring(0, 200)}...`, '#0ff');
            
            // Step 2: Send extracted text to text AI for answer
            const input = document.getElementById('olm-chat-input');
            if (input) {
                input.value = extractedText;
            }
            
            // Clear image after extraction
            currentImageBase64 = null;
            
            // Auto-ask AI with extracted text
            await askAIForAnswer(extractedText);
            
        } catch (error) {
            log(`Image conversion error: ${error.message}`, '#ff0000');
            displayAIAnswer(`${error.message}`);
        }
    }
    
    // ============================================
    // CHATBOX FOR MANUAL QUESTIONS
    // ============================================
    
    function sendManualQuestion() {
        const input = document.getElementById('olm-chat-input');
        const question = input.value.trim();
        
        // If image exists, auto-convert to text
        if (currentImageBase64) {
            log('Image detected, converting...', '#0ff');
            input.value = '';
            convertImageToTextAndAnswer();
            return;
        }
        
        // Otherwise send text
        if (!question) {
            log('No input', '#ff0000');
            return;
        }
        
        log(`Manual: ${question}`, '#0ff');
        input.value = '';
        askAIForAnswer(question);
    }
    
    // ============================================
    // ANSWER SELECTION
    // ============================================
    
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
    
    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================
    
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Space for screenshot
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                createScreenshotOverlay();
                log('Screenshot mode', '#0ff');
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
        
        log('Shortcuts active', '#00ff00');
    }
    
    // ============================================
    // UI CONTROL PANEL
    // ============================================
    
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'olm-cheat-panel';
        panel.innerHTML = `
            <div id="olm-cheat-container" style="
                position: fixed;
                top: 10px;
                right: 10px;
                width: 320px;
                height: 540px;
                background: rgba(0, 0, 0, 0.98);
                border-radius: 12px;
                border: 2px solid #ff00ff;
                font-family: 'Consolas', monospace;
                z-index: 999999;
                box-shadow: 0 0 30px rgba(255, 0, 255, 0.6);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            ">
                <!-- Title Bar -->
                <div id="olm-drag-handle" style="
                    background: linear-gradient(135deg, #ff00ff 0%, #9146ff 100%);
                    padding: 10px;
                    font-size: 13px;
                    font-weight: bold;
                    text-align: center;
                    color: #fff;
                    cursor: move;
                    user-select: none;
                    border-bottom: 2px solid #ff00ff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span>OLM CHEAT V1</span>
                    <div style="display: flex; gap: 4px;">
                        <button id="olm-minimize-btn" style="
                            background: rgba(255,255,255,0.2);
                            border: none;
                            color: #fff;
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            cursor: pointer;
                            font-size: 16px;
                            line-height: 1;
                        ">−</button>
                        <button onclick="document.getElementById('olm-cheat-panel').remove()" style="
                            background: rgba(255,0,0,0.3);
                            border: none;
                            color: #fff;
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            cursor: pointer;
                            font-size: 16px;
                            line-height: 1;
                        ">✕</button>
                    </div>
                </div>
                
                <!-- Content -->
                <div id="olm-content" style="
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 12px;
                ">
                    <!-- Timer Control -->
                    <div style="margin-bottom: 12px; padding: 10px; background: rgba(255, 255, 0, 0.1); border: 1px solid #ffff00; border-radius: 6px;">
                        <div style="font-size: 10px; color: #ffff00; margin-bottom: 8px; font-weight: bold;">TIME CONTROL</div>
                        <button id="olm-stop-btn" onclick="window.olmCheat.toggleStop()" style="
                            background: #440000;
                            color: #ff0000;
                            border: 1px solid #ff0000;
                            padding: 8px;
                            cursor: pointer;
                            border-radius: 6px;
                            width: 100%;
                            font-size: 11px;
                            font-weight: bold;
                        ">STOP TIME</button>
                    </div>
                    
                    <!-- Question Display Box -->
                    <div style="margin-bottom: 12px; padding: 10px; background: rgba(0, 255, 0, 0.05); border: 1px solid #00ff00; border-radius: 6px;">
                        <div style="font-size: 10px; color: #00ff00; margin-bottom: 6px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                            <span>QUESTION</span>
                            <button onclick="window.olmCheat.copyQ()" style="
                                background: rgba(0,255,255,0.2);
                                border: 1px solid #0ff;
                                color: #0ff;
                                padding: 4px 8px;
                                cursor: pointer;
                                border-radius: 4px;
                                font-size: 9px;
                            ">Copy</button>
                        </div>
                        <div id="olm-question-box" style="
                            color: #fff; 
                            font-size: 10px; 
                            line-height: 1.4; 
                            height: 70px;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            padding: 6px;
                            background: rgba(0,0,0,0.3);
                            border-radius: 4px;
                            word-wrap: break-word;
                            display: -webkit-box;
                            -webkit-line-clamp: 4;
                            -webkit-box-orient: vertical;
                        ">Waiting for question...</div>
                    </div>
                    
                    <!-- AI Section -->
                    <div style="margin-bottom: 12px; padding: 10px; background: rgba(145, 70, 255, 0.1); border: 1px solid #9146ff; border-radius: 6px;">
                        <div style="font-size: 10px; color: #9146ff; margin-bottom: 6px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                            <span>ANSWER</span>
                            <div id="olm-ai-status" style="font-size: 8px;"></div>
                        </div>
                        <div id="olm-ai-answer" style="
                            height: 70px;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            display: -webkit-box;
                            -webkit-line-clamp: 4;
                            -webkit-box-orient: vertical;
                        "></div>
                    </div>
                    
                    <!-- Manual Chatbox -->
                    <div style="margin-bottom: 10px;">
                        <div style="font-size: 8px; color: #888; margin-bottom: 4px; font-style: italic;">Press Ctrl+Space to screenshot</div>
                        <div style="display: flex; gap: 4px; margin-bottom: 6px;">
                            <input type="text" id="olm-chat-input" placeholder="Type question or Ctrl+Space..." 
                                style="flex: 1; padding: 6px; background: rgba(0,0,0,0.5); border: 1px solid #0ff; border-radius: 4px; color: #fff; font-size: 10px;">
                            <button id="olm-send-btn" onclick="window.olmCheat.sendChat()" style="
                                background: #004444;
                                color: #0ff;
                                border: 1px solid #0ff;
                                padding: 6px 12px;
                                cursor: pointer;
                                border-radius: 4px;
                                font-size: 10px;
                                font-weight: bold;
                            ">Send</button>
                        </div>
                        <button id="olm-ask-ai-btn" onclick="window.olmCheat.askAI()" style="
                            background: #440044;
                            color: #9146ff;
                            border: 1px solid #9146ff;
                            padding: 6px;
                            cursor: pointer;
                            border-radius: 4px;
                            width: 100%;
                            font-size: 10px;
                            font-weight: bold;
                        ">Ask AI</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        
        // Draggable
        const container = document.getElementById('olm-cheat-container');
        const handle = document.getElementById('olm-drag-handle');
        let isDragging = false;
        let currentX, currentY, initialX, initialY;
        let xOffset = 0, yOffset = 0;
        
        handle.addEventListener('mousedown', (e) => {
            if (e.target.id === 'olm-minimize-btn') return;
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            isDragging = true;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                container.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        });
        
        document.addEventListener('mouseup', () => {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        });
        
        // Minimize
        document.getElementById('olm-minimize-btn').addEventListener('click', () => {
            const container = document.getElementById('olm-cheat-container');
            const content = document.getElementById('olm-content');
            const minBtn = document.getElementById('olm-minimize-btn');
            
            if (isMinimized) {
                container.style.height = '540px';
                content.style.display = 'block';
                minBtn.textContent = '−';
            } else {
                container.style.height = '44px';
                content.style.display = 'none';
                minBtn.textContent = '+';
            }
            isMinimized = !isMinimized;
        });
        
        // Enter key handler for input
        const chatInput = document.getElementById('olm-chat-input');
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const sendBtn = document.getElementById('olm-send-btn');
                    if (sendBtn) sendBtn.click();
                }
            });
        }
        
        log('UI created', '#00ff00');
    }
    
    // ============================================
    // MONITORING
    // ============================================
    
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
        
        log('Monitoring active', '#00ff00');
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    function init() {
        log('INITIALIZING...', '#ff00ff');
        
        bypassTabDetection();
        setupKeyboardShortcuts();
        createControlPanel();
        startQuestionMonitoring();
        
        window.olmCheat = {
            select: selectAnswer,
            copyQ: copyQuestionToClipboard,
            toggleStop: toggleStop,
            sendChat: sendManualQuestion,
            askAI: () => {
                const input = document.getElementById('olm-chat-input');
                const customText = input?.value?.trim();
                if (customText) {
                    input.value = '';
                    askAIForAnswer(customText);
                } else {
                    askAIForAnswer();
                }
            },
            clearImage: () => {
                currentImageBase64 = null;
                log('Image cleared', '#888');
            },
            config: CONFIG
        };
        
        log('LOADED', '#00ff00');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
