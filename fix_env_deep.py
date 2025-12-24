
import os

env_path = r'c:\Users\shamb\Documents\ShortlistAI\.env'
with open(env_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any multi-line blobs of spaces and the specific residue
import re
# Residue found in terminal logs
residue = "JKAtzajBJp1u6D9GYJ-9ulWd8jeUI_XVnKYn9"
content = re.sub(r'\s*' + re.escape(residue) + r'\s*', '', content)

# Clean up any lines that are just whitespace or very broken
lines = content.splitlines()
new_lines = []
for line in lines:
    clean = line.strip()
    # Check for truncated entries
    if clean == "NEXT_PUBLIC_PAYPAL_CLIENT_ID=AU0PxegJ":
        continue
    if clean.startswith("PAYPAL_CLIENT_ID=") or clean.startswith("NEXT_PUBLIC_PAYPAL_CLIENT_ID="):
        continue
    if clean:
        new_lines.append(line)

paypal_cid = "AU0PxegJYh06-3bmpgEZJKAtzajBJp1u6D9GYJ-9ulWd8jeUI_XVnKYn9"
new_lines.append(f"PAYPAL_CLIENT_ID={paypal_cid}")
new_lines.append(f"NEXT_PUBLIC_PAYPAL_CLIENT_ID={paypal_cid}")

with open(env_path, 'w', encoding='utf-8') as f:
    f.write("\n".join(new_lines) + "\n")

print("Deep Clean Finished")
