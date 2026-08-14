"""
Scope validation script for SPIKE-B-VIENEU

Ensures that all changed files relative to base_ref (origin/main)
strictly adhere to the manifest allowlist.
"""

import sys
import subprocess
from pathlib import Path


ALLOWED_PREFIXES = [
    "spikes/spike-b-vieneu/",
    "evidence/SPIKE-B-VIENEU/"
]


def main():
    base_ref = "origin/main"
    try:
        diff_out = subprocess.check_output(
            ["git", "diff", "--name-only", f"{base_ref}...HEAD"],
            text=True
        ).strip()
    except subprocess.CalledProcessError as e:
        print(f"Error executing git diff: {e}")
        sys.exit(1)

    changed_files = [line.strip().replace("\\", "/") for line in diff_out.splitlines() if line.strip()]

    print(f"Validating scope for {len(changed_files)} changed files against allowlist...")
    disallowed = []

    for f in changed_files:
        is_allowed = any(f.startswith(prefix) for prefix in ALLOWED_PREFIXES)
        if not is_allowed:
            disallowed.append(f)

    if disallowed:
        print("\n[ERROR] Disallowed paths found in changeset:")
        for f in disallowed:
            print(f"  - {f}")
        sys.exit(1)

    print("[SUCCESS] All changed paths strictly comply with SPIKE-B-VIENEU allowlist.")


if __name__ == "__main__":
    main()
