
import os

env_path = r'c:\Users\shamb\Documents\ShortlistAI\.env'
with open(env_path, 'r') as f:
    lines = f.readlines()

new_lines = []
paypal_cid = "AU0PxegJYh06-3bmpgEZJKAtzajBJp1u6D9GYJ-9ulWd8jeUI_XVnKYn9" # Combining the parts I saw

for line in lines:
    clean = line.strip()
    if clean.startswith("PAYPAL_CLIENT_ID=") or clean.startswith("NEXT_PUBLIC_PAYPAL_CLIENT_ID="):
        continue
    # Skip lines that look like residues of the broken CID
    if "JKAtzajBJp1u6D9GYJ-9ulWd8jeUI_XVnKYn9" in clean:
        continue
    if clean:
        new_lines.append(line)

new_lines.append(f"PAYPAL_CLIENT_ID={paypal_cid}\n")
new_lines.append(f"NEXT_PUBLIC_PAYPAL_CLIENT_ID={paypal_cid}\n")

with open(env_path, 'w') as f:
    f.writelines(new_lines)

print("Fixed .env")
