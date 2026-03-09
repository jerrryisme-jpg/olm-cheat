# 🎮 OLM Cheat - AI Quiz Helper

AI-powered tool to help answer OLM.VN quiz questions.

## ✨ Features

- 🤖 AI answers using Groq (openai/gpt-oss-120b)
- 📸 Screenshot questions with Ctrl+Space
- ⏸️ Stop timer button
- 🎯 Confidence scores (color-coded 🟢🟡🟠🔴)
- 📝 Supports multiple choice, true/false, fill-in-blank

## 🚀 Quick Start

1. Run `trainer.exe`
2. Enter API key (or leave blank for default)
3. Copy generated `olm_cheat_trained.js`
4. Open OLM quiz → Press F12 → Console tab
5. Paste script → Press Enter

## 🔧 Customization

**Add Knowledge:**
Edit `knowledge.txt` with facts/answers the AI should know.

**Use Your API Key:**
Get free key at https://console.groq.com

## 💡 Usage

- Script auto-detects questions and answers
- Confidence shown next to answer (green=high, red=low)
- Click "STOP TIME" to freeze timer
- Press Ctrl+Space to screenshot questions
- Click question box to copy

**⚠️ Timer Note:** After clicking "START TIME", the page reloads. You must **paste the script again** to continue using it. This is normal behavior.

## 📁 Files

- `lib/olm_cheat_base.js` - Main script
- `trainer.exe` - Customization tool
- `knowledge.txt` - Knowledge base
- `INSTRUCTIONS.txt` - Detailed guide

## ⚠️ Disclaimer

Educational purposes only. Use responsibly.

## 📝 License

MIT License - see LICENSE file

## Made by Jerry 
Contact Tiktok @jerry_tesfayee
