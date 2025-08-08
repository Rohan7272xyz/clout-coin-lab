import os
import hashlib
import json
from datetime import datetime
from pathlib import Path
import subprocess

STATE_FILE = ".indexer_state.json"
OUTPUT_FILE = "project_context.md"
IGNORE_DIRS = {".git", "__pycache__", "node_modules", "dist", "build", ".vscode", ".idea"}

# -------- Helpers -------- #
def hash_file(path):
    """Return SHA1 hash of file contents."""
    h = hashlib.sha1()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def build_repo_map(root_dir):
    """Return repo tree as a pretty string."""
    tree_lines = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        depth = Path(dirpath).relative_to(root_dir).parts
        indent = "    " * len(depth)
        if depth:
            tree_lines.append(f"{indent}├── {Path(dirpath).name}/")
        for f in sorted(filenames):
            if f in IGNORE_DIRS:
                continue
            subindent = "    " * (len(depth) + 1)
            tree_lines.append(f"{subindent}├── {f}")
    return "## Repo Map\n```\n" + "\n".join(tree_lines) + "\n```"

def load_state():
    """Load previous file hashes."""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {}

def save_state(state):
    """Save file hashes."""
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

def get_changed_files(root_dir, old_state):
    """Compare current file hashes to old state and return changed files."""
    changed = []
    new_state = {}
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for filename in filenames:
            if filename in IGNORE_DIRS:
                continue
            path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(path, root_dir)
            file_hash = hash_file(path)
            new_state[rel_path] = file_hash
            if old_state.get(rel_path) != file_hash:
                changed.append(rel_path)
    return changed, new_state

def format_changed_files(root_dir, changed_files):
    """Return Markdown for changed files with code blocks."""
    if not changed_files:
        return "## Changed Files\n_No changes detected._\n"
    
    lines = ["## Changed Files\n"]
    for rel_path in sorted(changed_files):
        full_path = os.path.join(root_dir, rel_path)
        ext = Path(rel_path).suffix.lstrip(".")
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            lines.append(f"### {rel_path}\n_Binary or non-text file, skipped._\n")
            continue

        lines.append(f"### {rel_path}\n```{ext}\n{content}\n```")
    return "\n\n".join(lines)

# -------- Main -------- #
def main():
    root_dir = os.getcwd()
    old_state = load_state()

    print("[1/3] Building repo map...")
    repo_map_md = build_repo_map(root_dir)

    print("[2/3] Detecting changed files...")
    changed_files, new_state = get_changed_files(root_dir, old_state)

    print(f"[INFO] {len(changed_files)} file(s) changed.")

    print("[3/3] Writing project_context.md...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(f"# Project Context — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(repo_map_md + "\n\n")
        f.write(format_changed_files(root_dir, changed_files))

    save_state(new_state)
    print(f"[DONE] Context file saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
