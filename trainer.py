#!/usr/bin/env python3
"""
OLM Cheat Trainer
Injects custom knowledge and API key into the cheat script
"""

import os
import sys

def main():
    print("=" * 50)
    print("   OLM CHEAT TRAINER")
    print("=" * 50)
    print()
    
    # Ask for API key
    print("Enter your Groq API key")
    print("(Leave blank to use default key)")
    api_key = input("API Key: ").strip()
    
    if not api_key:
        api_key = "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"
        print("✓ Using default API key")
    else:
        print("✓ Using custom API key")
    
    print()
    
    # Check for knowledge file
    knowledge = ""
    if os.path.exists("knowledge.txt"):
        print("Found knowledge.txt!")
        with open("knowledge.txt", "r", encoding="utf-8") as f:
            knowledge = f.read().strip()
        print(f"✓ Loaded {len(knowledge)} characters of knowledge")
    else:
        print("No knowledge.txt found - using default knowledge")
    
    print()
    
    # Load base script
    print("Loading base script...")
    with open("lib/olm_cheat_base.js", "r", encoding="utf-8") as f:
        script = f.read()
    
    # Replace API key
    script = script.replace(
        "groqApiKey: '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'",
        f"groqApiKey: '{api_key}'"
    )
    
    # Inject knowledge if available
    if knowledge:
        # Find CONFIG section and add knowledge field
        config_start = script.find("const CONFIG = {")
        config_end = script.find("};", config_start)
        
        # Insert knowledge before closing brace
        injection = f",\n        knowledge: `{knowledge}`"
        script = script[:config_end] + injection + script[config_end:]
        
        print("✓ Injected custom knowledge")
    
    # Save trained script
    output_path = "olm_cheat_trained.js"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(script)
    
    print()
    print("=" * 50)
    print(f"✅ SUCCESS! Created: {output_path}")
    print("=" * 50)
    print()
    print("Next steps:")
    print("1. Open OLM website in Chrome")
    print("2. Press F12 to open DevTools")
    print("3. Go to Console tab")
    print("4. Copy-paste the entire trained script")
    print("5. Press Enter")
    print()
    input("Press Enter to exit...")

if __name__ == "__main__":
    main()
