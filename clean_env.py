
import os
import re

env_path = r'c:\Users\shamb\Documents\ShortlistAI\.env'
with open(env_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove lines that are purely residues or broken
lines = content.splitlines()
new_lines = []
for line in lines:
    clean = line.strip()
    if not clean:
        new_lines.append("")
        continue
    if clean == "hi wrong^":
        continue
    if "JKAtzajBJ" in clean or "AU0PxegJ" in clean and "=" not in clean:
        continue
    # Keep the rest
    new_lines.append(line)

with open(env_path, 'w', encoding='utf-8') as f:
    f.write("\n".join(new_lines) + "\n")

print("Cleaned .env from residues")
