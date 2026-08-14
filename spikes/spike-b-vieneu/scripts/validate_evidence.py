"""
Evidence validation script for SPIKE-B-VIENEU

Validates:
1. testedImplementationSha ancestry and zero post-test executable code drift
2. Completeness and validity of all required persistent evidence artifacts
3. Mathematical consistency between raw CSV/JSON runs and summary statistics
4. P0 Gate check (Sustained throughput >= 1.0x)
5. Human Listening Rating sheet verification (no missing/unrated samples)
"""

import sys
import json
import csv
import subprocess
from pathlib import Path
import numpy as np


REQUIRED_EVIDENCE_FILES = [
    "environment.json",
    "model_load.json",
    "raw_benchmark_runs.csv",
    "raw_benchmark_runs.json",
    "corpus_summary.json",
    "sustained_sequence.json",
    "ready_buffer_simulation.json",
    "cancellation_experiment.json",
    "human_rating_sheet.json",
    "verification_summary.md"
]


def main():
    repo_root = Path("d:/Workspace/Youtube dubbing")
    evidence_dir = repo_root / "evidence/SPIKE-B-VIENEU"

    print("=== SPIKE-B-VIENEU Evidence Verification ===")

    # 1. Check all required evidence files exist
    print("\n[Step 1] Checking presence of required evidence files...")
    missing_files = []
    for fname in REQUIRED_EVIDENCE_FILES:
        fpath = evidence_dir / fname
        if not fpath.exists() or fpath.stat().st_size == 0:
            missing_files.append(fname)

    if missing_files:
        print(f"[ERROR] Missing or empty required evidence files: {missing_files}")
        sys.exit(1)
    print(f"[OK] All {len(REQUIRED_EVIDENCE_FILES)} required evidence files present.")

    # 2. Validate environment.json and testedImplementationSha
    print("\n[Step 2] Validating environment metadata and implementation SHA topology...")
    with open(evidence_dir / "environment.json", "r", encoding="utf-8") as f:
        env = json.load(f)

    tested_sha = env.get("testedImplementationSha")
    if not tested_sha:
        print("[ERROR] environment.json missing 'testedImplementationSha'")
        sys.exit(1)

    print(f"Recorded testedImplementationSha: {tested_sha}")

    # Verify ancestry: tested_sha must be ancestor of HEAD (or equal to HEAD)
    try:
        subprocess.check_call(
            ["git", "merge-base", "--is-ancestor", tested_sha, "HEAD"],
            cwd=str(repo_root)
        )
        print(f"[OK] testedImplementationSha {tested_sha} is valid ancestor of current HEAD.")
    except subprocess.CalledProcessError:
        print(f"[ERROR] testedImplementationSha {tested_sha} is not an ancestor of current HEAD.")
        sys.exit(1)

    # Verify zero post-test executable drift between testedImplementationSha and HEAD
    try:
        drift = subprocess.check_output(
            ["git", "diff", "--name-only", tested_sha, "HEAD", "--",
             "spikes/spike-b-vieneu/src",
             "spikes/spike-b-vieneu/test",
             "spikes/spike-b-vieneu/corpus",
             "spikes/spike-b-vieneu/scripts"],
            cwd=str(repo_root),
            text=True
        ).strip()
        if drift:
            print(f"[ERROR] Executable code drift detected after testedImplementationSha:\n{drift}")
            sys.exit(1)
        print("[OK] Zero executable code drift between testedImplementationSha and HEAD.")
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Failed to check git diff: {e}")
        sys.exit(1)

    # 3. Validate mathematical consistency of raw and summary runs
    print("\n[Step 3] Validating raw runs and summary statistics...")
    with open(evidence_dir / "raw_benchmark_runs.json", "r", encoding="utf-8") as f:
        raw_runs = json.load(f)
    
    with open(evidence_dir / "corpus_summary.json", "r", encoding="utf-8") as f:
        corpus_summary = json.load(f)

    print(f"Total raw runs: {len(raw_runs)}, Total corpus samples: {len(corpus_summary)}")

    for sample_sum in corpus_summary:
        sample_id = sample_sum["sampleId"]
        matching_runs = [r for r in raw_runs if r["sampleId"] == sample_id]
        if len(matching_runs) < 3:
            print(f"[ERROR] Sample {sample_id} has insufficient repetitions ({len(matching_runs)} < 3)")
            sys.exit(1)

        # Cross check median RTF and throughput
        run_rtfs = [r["rtf"] for r in matching_runs]
        run_tps = [r["mediaSecondsPerWallSecond"] for r in matching_runs]
        
        calc_median_rtf = round(float(np.median(run_rtfs)), 4)
        calc_median_tp = round(float(np.median(run_tps)), 4)

        if sample_sum["rtf"]["median"] != calc_median_rtf:
            print(f"[ERROR] Median RTF mismatch for {sample_id}: summary={sample_sum['rtf']['median']}, calculated={calc_median_rtf}")
            sys.exit(1)

        if sample_sum["throughput"]["median"] != calc_median_tp:
            print(f"[ERROR] Median Throughput mismatch for {sample_id}: summary={sample_sum['throughput']['median']}, calculated={calc_median_tp}")
            sys.exit(1)

    print("[OK] Mathematical consistency verified across all corpus runs.")

    # 4. Check Sustained Long-Run P0 Gate
    print("\n[Step 4] Checking sustained multi-minute sequence throughput and memory stability...")
    with open(evidence_dir / "sustained_sequence.json", "r", encoding="utf-8") as f:
        sustained = json.load(f)

    sustained_tp = sustained.get("sustainedThroughput", 0.0)
    sustained_rtf = sustained.get("sustainedRtf", 99.0)
    total_audio_sec = sustained.get("totalAudioSec", 0.0)
    is_mem_stable = sustained.get("isMemoryStable", False)

    print(f"Sustained sequence audio: {total_audio_sec:.1f}s, Throughput: {sustained_tp:.2f}x, RTF: {sustained_rtf:.2f}")

    if total_audio_sec < 60.0:
        print(f"[ERROR] Sustained sequence total audio duration is too short ({total_audio_sec}s < 60s)")
        sys.exit(1)

    if sustained_tp < 1.0:
        print(f"[FAIL] Sustained throughput {sustained_tp:.2f}x is below P0 requirement of 1.0x!")
        sys.exit(1)

    if not is_mem_stable:
        print(f"[WARN/ERROR] Memory instability flagged in sustained sequence: {sustained.get('rssGrowthRateMbPerChunk')} MB/chunk growth")
        sys.exit(1)

    print(f"[OK] P0 Gate Passed: Sustained preparation throughput is {sustained_tp:.2f}x (>= 1.0x) with stable memory.")

    # 5. Check Human Listening Rating Sheet Completeness
    print("\n[Step 5] Checking human listening evaluation sheet completeness...")
    with open(evidence_dir / "human_rating_sheet.json", "r", encoding="utf-8") as f:
        ratings = json.load(f)

    unrated_samples = []
    for r in ratings:
        sid = r["sampleId"]
        if r.get("naturalnessScore") is None or r.get("pronunciationScore") is None or r.get("isAcceptableForDubbing") is None:
            unrated_samples.append(sid)

    if unrated_samples:
        print(f"[ERROR] Human listening evaluation incomplete! Unrated samples: {unrated_samples}")
        print("Under AGENTS.md / SPIKE-B manifest, human listening rating is mandatory before READY_FOR_AUDIT.")
        sys.exit(1)

    print(f"[OK] Human listening ratings complete for all {len(ratings)} representative samples.")
    print("\n[SUCCESS] All evidence validation checks passed!")


if __name__ == "__main__":
    main()
