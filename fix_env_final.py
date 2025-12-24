
import os

env_path = r'c:\Users\shamb\Documents\ShortlistAI\.env'
with open(env_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
paypal_cid = "AZ21vrgYgA4U2rLqz1nx4WSjzArSnwvY-mSklUntBOz9Nx0TY5JfTpK9j76tOM9fXl_nwqgdpo55EC4u"

for line in lines:
    clean = line.strip()
    # Skip any old paypal client id entries or residues
    if clean.startswith("PAYPAL_CLIENT_ID=") or clean.startswith("NEXT_PUBLIC_PAYPAL_CLIENT_ID="):
        continue
    # Skip lines that look like residues of broken IDs
    if "JKAtzajBJp1u6D9GYJ-9ulWd8jeUI_XVnKYn9" in clean:
        continue
    if "AU0PxegJ" in clean and "=" not in clean: # likely truncated residue
        continue
    if clean:
        new_lines.append(line + "\n")

new_lines.append(f"PAYPAL_CLIENT_ID={paypal_cid}\n")
new_lines.append(f"NEXT_PUBLIC_PAYPAL_CLIENT_ID={paypal_cid}\n")

with open(env_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Corrected .env with new Client ID")
