# 🎮 OLM Cheat V1 - AI-Powered Quiz Helper

> **Disclaimer**: This tool is for educational purposes only. Use responsibly.

## ✨ Features

- 🤖 **AI-Powered Answers** - Uses Groq AI (openai/gpt-oss-120b) to answer quiz questions
- 📸 **Screenshot Support** - Ctrl+Space to capture question images with Windows Snipping Tool style overlay
- ⏸️ **Timer Control** - Stop time during quizzes with one-click button
- 🎯 **Real-Time Confidence Score** - Shows AI certainty with color-coded inline percentage
  - 🟢 Green (80%+) - High confidence
  - 🟡 Yellow (60-79%) - Medium confidence  
  - 🟠 Orange (40-59%) - Low-medium confidence
  - 🔴 Red (<40%) - Low confidence
- 📝 **Multiple Question Types** - Supports multiple choice, true/false, and fill-in-the-blank
- 🔧 **Customizable** - Add your own knowledge base and API key
- 💡 **Smart Detection** - Auto-detects question format and adapts prompts accordingly

## 🚀 Quick Start

### Method 1: Pre-built (Easiest)

1. Download [Release](https://github.com/YOUR_REPO/releases)
2. Run `OLM_Cheat_Trainer.exe`
3. Follow on-screen instructions
4. Copy the generated script
5. Paste into browser console (F12)

### Method 2: Manual Setup

1. Clone this repo:
   ```bash
   git clone https://github.com/YOUR_REPO/olm-cheat.git
   cd olm-cheat
   ```

2. (Optional) Add custom knowledge to `knowledge.txt`

3. Run trainer:
   ```bash
   python trainer.py
   ```

4. Copy `olm_cheat_trained.js` content

5. In Chrome:
   - Open OLM website
   - Press F12 → Console tab
   - Paste the script
   - Press Enter

## 📚 How to Use

### Basic Usage

1. **Load the script** before starting a quiz
2. **Auto-detection** - Script automatically detects new questions
3. **AI answers** appear in the purple box with confidence score
4. **Click question box** to copy question text

### Advanced Features

**Stop Timer:**
- Click "⏸️ STOP TIME" button in the panel

**Screenshot Questions:**
- Press `Ctrl+Space`
- Drag to select the question area
- Script auto-converts image → text → AI answer

**Manual Questions:**
- Type in the input box
- Press Enter or click Send
- AI will answer

### Confidence Score

The AI answer includes a color-coded confidence badge:
- 🟢 **Green (80%+)** - High confidence, likely correct
- 🟡 **Yellow (60-79%)** - Medium confidence, verify if possible
- 🔴 **Red (<60%)** - Low confidence, double-check answer

## 🔧 Customization

### Add Your Own API Key

Free Groq API key: https://console.groq.com

Run trainer and enter your key when prompted.

### Add Custom Knowledge

Edit `knowledge.txt`:
```
Q: What is the capital of France?
A: Paris

Q: What is 2+2?
A: 4
```

Run trainer to inject knowledge into the script.

## 📁 Project Structure

```
olm-cheat/
├── lib/
│   └── olm_cheat_base.js    # Base script (untrained)
├── knowledge.txt              # Custom Q&A knowledge base
├── trainer.py                 # Training script
├── README.md                  # This file
├── INSTRUCTIONS.txt           # Detailed usage guide
└── OLM_Cheat_Trainer.exe     # Pre-built trainer (Windows)
```

## ⚙️ How It Works

1. **Question Detection** - Monitors DOM for new questions using hash-based detection
2. **AI Processing** - Sends question to Groq AI with optimized prompts
3. **Answer Display** - Shows answer with confidence score
4. **Timer Control** - Clears all intervals and blocks new timers

## 🛡️ Privacy & Security

- ✅ All processing happens locally
- ✅ Only sends question text to Groq API
- ✅ No data collection
- ✅ Open source - review the code yourself

## 🐛 Troubleshooting

**Script not working?**
- Make sure you paste it BEFORE starting the quiz
- Check console for errors (F12)
- Verify API key is valid

**AI not answering?**
- Check internet connection
- Verify Groq API key has quota
- Check console logs

**Timer not stopping?**
- Reload page and paste script again
- Some quizzes use different timer implementations

## 📝 License

MIT License - see LICENSE file

## 🤝 Contributing

Pull requests welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## ⚠️ Disclaimer

This tool is provided for educational and research purposes only. The authors are not responsible for any misuse or academic integrity violations. Use at your own risk.

## 💜 Credits

Created with love by the community.

Powered by:
- [Groq AI](https://groq.com)
- [html2canvas](https://html2canvas.hertzen.com/)

---

**Star ⭐ this repo if it helped you!**
