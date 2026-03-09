#!/usr/bin/env python3
"""
OLM Cheat Trainer
Builds a trained cheat script with API key and optional knowledge
"""

import os
from pathlib import Path


def main():
    print("=" * 50)
    print("        OLM CHEAT TRAINER")
    print("=" * 50)
    print()

    base_dir = Path(__file__).resolve().parent

    base_script_path = base_dir / "olm_cheat_base.js"
    knowledge_path = base_dir / "knowledge.txt"
    output_path = base_dir / "olm_cheat_trained.js"

    print("Enter your Groq API key")
    print("(Leave blank to use default key)")
    api_key = input("API Key: ").strip()

    if not api_key:
        api_key = "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"
        print("Using default API key")
    else:
        print("Using custom API key")

    print()

    knowledge = ""

    if knowledge_path.exists():
        print("Found knowledge.txt")
        with open(knowledge_path, "r", encoding="utf-8") as f:
            knowledge = f.read().strip()
        print("Loaded knowledge")
    else:
        print("No knowledge.txt found")

    print()

    if not base_script_path.exists():
        print("ERROR: olm_cheat_base.js not found")
        input("Press Enter to exit...")
        return

    print("Loading base script...")
    with open(base_script_path, "r", encoding="utf-8") as f:
        script = f.read()

    script = script.replace(
        "groqApiKey: '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'",
        f"groqApiKey: '{api_key}'"
    )

    if knowledge:
        config_start = script.find("const CONFIG = {")
        config_end = script.find("};", config_start)

        if config_start != -1 and config_end != -1:
            injection = f",\n    knowledge: `{knowledge}`"
            script = script[:config_end] + injection + script[config_end:]
            print("Injected custom knowledge")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(script)

    print()
    print("SUCCESS! Created:", output_path.name)
    print()
    input("Press Enter to exit...")


if __name__ == "__main__":
    main()
