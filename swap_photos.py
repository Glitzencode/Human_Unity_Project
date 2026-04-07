"""
Human Unity — Photo Swap Script
Run this once from inside your human-unity folder:
    python3 swap_photos.py

It replaces every photo-placeholder div with a real <img> tag.
"""

import re, glob, os

# Map of placeholder hint text → image path + alt text
PHOTOS = {
    "event-1.jpg":           ("images/event-1.jpg",           "Community event"),
    "event-2.jpg":           ("images/event-2.jpg",           "Community gathering"),
    "event-3.jpg":           ("images/event-3.jpg",           "Human Unity in action"),
    "community-ground.jpg":  ("images/community-ground.jpg",  "Community Ground chapter"),
    "cg-event-1.jpg":        ("images/cg-event-1.jpg",        "Community Ground event"),
    "cg-event-2.jpg":        ("images/cg-event-2.jpg",        "Community Ground gathering"),
    "conflict-bridge.jpg":   ("images/conflict-bridge.jpg",   "Conflict Bridge session"),
    "conflict-bridge-1.jpg": ("images/conflict-bridge-1.jpg", "Conflict Bridge training"),
    "leadership-lab.jpg":    ("images/leadership-lab.jpg",    "Leadership Lab cohort"),
    "lab-cohort.jpg":        ("images/lab-cohort.jpg",        "Leadership Lab at work"),
    "coordination-layer.jpg":("images/coordination-layer.jpg","The Coordination Layer"),
    "common-story.jpg":      ("images/common-story.jpg",      "Common Story project"),
}

IMG_TAG = '<img src="{src}" alt="{alt}" style="width:100%;border-radius:var(--radius);aspect-ratio:16/9;object-fit:cover;display:block">'

PLACEHOLDER_PATTERN = re.compile(
    r'<div class="photo-placeholder"[^>]*>.*?</div>',
    re.DOTALL
)

def replace_placeholder(match, filepath):
    block = match.group(0)
    # Find which image filename is referenced in this placeholder
    for filename, (src, alt) in PHOTOS.items():
        if filename in block:
            # Fix path for initiative subpages
            if filepath.startswith("initiatives/") or filepath.startswith("initiatives\\"):
                src = "../" + src
            print(f"  → Swapped: {filename}")
            return IMG_TAG.format(src=src, alt=alt)
    # No match found — leave placeholder untouched
    return block

all_files = glob.glob("*.html") + glob.glob("initiatives/*.html")
total_swaps = 0

for filepath in sorted(all_files):
    with open(filepath, "r", encoding="utf-8") as f:
        original = f.read()

    swapped = [0]
    def replacer(match):
        result = replace_placeholder(match, filepath)
        if result != match.group(0):
            swapped[0] += 1
        return result

    updated = PLACEHOLDER_PATTERN.sub(replacer, original)

    if updated != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(updated)
        print(f"\n{filepath}: {swapped[0]} photo(s) replaced")
        total_swaps += swapped[0]
    else:
        print(f"{filepath}: no placeholders found")

print(f"\n✓ Done. {total_swaps} photos swapped across {len(all_files)} files.")
print("Commit and push to GitHub to see the changes live.")
