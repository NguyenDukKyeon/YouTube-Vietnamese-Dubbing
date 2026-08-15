"""
Metrics and Calculation Helpers for SPIKE-B-VIENEU

Provides deterministic calculation formulas and ready-buffer simulation logic:
1. RTF (Real-Time Factor) = wallClockSeconds / audioDurationSeconds
2. mediaSecondsPerWallSecond = audioDurationSeconds / wallClockSeconds
3. Summary statistics (count, min, median, mean, p90, p95, max, std, cv)
4. Dubbing Ready-Buffer simulation across playback rates (1.0x, 1.25x, 1.5x, 2.0x)
"""

from typing import List, Dict, Any
import numpy as np


def calculate_rtf(generation_wall_sec: float, audio_duration_sec: float) -> float:
    """Calculate Real-Time Factor (RTF).
    
    RTF < 1.0 means faster than realtime.
    """
    if audio_duration_sec <= 0:
        raise ValueError("audio_duration_sec must be positive")
    return round(float(generation_wall_sec / audio_duration_sec), 4)


def calculate_throughput(generation_wall_sec: float, audio_duration_sec: float) -> float:
    """Calculate media preparation throughput (media seconds per wall second).
    
    throughput >= 1.0 means sufficient raw preparation speed for 1.0x realtime playback.
    """
    if generation_wall_sec <= 0:
        raise ValueError("generation_wall_sec must be positive")
    return round(float(audio_duration_sec / generation_wall_sec), 4)


def compute_statistics(values: List[float]) -> Dict[str, float]:
    """Compute standard summary statistics over a series of numbers."""
    if not values:
        return {
            "count": 0,
            "min": 0.0,
            "median": 0.0,
            "mean": 0.0,
            "p90": 0.0,
            "p95": 0.0,
            "max": 0.0,
            "std": 0.0,
            "cv": 0.0
        }
    
    arr = np.array(values, dtype=np.float64)
    mean_val = float(np.mean(arr))
    std_val = float(np.std(arr, ddof=0))
    cv_val = float(std_val / mean_val) if mean_val > 0 else 0.0

    return {
        "count": len(values),
        "min": round(float(np.min(arr)), 4),
        "median": round(float(np.median(arr)), 4),
        "mean": round(mean_val, 4),
        "p90": round(float(np.percentile(arr, 90)), 4),
        "p95": round(float(np.percentile(arr, 95)), 4),
        "max": round(float(np.max(arr)), 4),
        "std": round(std_val, 4),
        "cv": round(cv_val, 4)
    }


def simulate_ready_buffer(
    chunk_generations: List[Dict[str, float]],
    playback_rates: List[float] = [1.0, 1.25, 1.5, 2.0],
    initial_prebuffer_sec: float = 2.0
) -> Dict[str, Any]:
    """Simulate audio ready-buffer dynamics across a continuous sequence of generated chunks.
    
    Each chunk in chunk_generations must have:
      - 'wall_sec': Generation wall-clock time in seconds
      - 'audio_sec': Generated audio duration in seconds
    
    For each playback rate:
      - Simulates playback drain rate = playback_rate * dt
      - Simulates buffer accumulation at completion of each chunk
      - Tracks buffer minimum (underrun risk), final buffer, and required initial pre-buffer
      - Calculates headroom = (total_audio_sec / total_wall_sec) - playback_rate
    """
    total_wall = sum(c["wall_sec"] for c in chunk_generations)
    total_audio = sum(c["audio_sec"] for c in chunk_generations)
    avg_throughput = total_audio / total_wall if total_wall > 0 else 0.0

    results = {
        "totalChunks": len(chunk_generations),
        "totalWallSec": round(total_wall, 3),
        "totalAudioSec": round(total_audio, 3),
        "overallThroughput": round(avg_throughput, 3),
        "rates": {}
    }

    for rate in playback_rates:
        buffer_level = initial_prebuffer_sec
        min_buffer = buffer_level
        exhaustion_events = 0
        timeline = []

        elapsed_wall = 0.0
        for i, c in enumerate(chunk_generations):
            gen_time = c["wall_sec"]
            audio_time = c["audio_sec"]

            # During generation time, player consumes buffer at 'rate'
            drained = gen_time * rate
            buffer_before_add = buffer_level - drained
            
            if buffer_before_add < 0:
                exhaustion_events += 1
                effective_buffer_before_add = 0.0
            else:
                effective_buffer_before_add = buffer_before_add

            min_buffer = min(min_buffer, buffer_before_add)

            # Chunk completes and adds audio_time to buffer
            buffer_level = effective_buffer_before_add + audio_time
            elapsed_wall += gen_time

            timeline.append({
                "chunkIndex": i,
                "elapsedWallSec": round(elapsed_wall, 3),
                "bufferBeforeAddSec": round(buffer_before_add, 3),
                "bufferAfterAddSec": round(buffer_level, 3)
            })

        required_prebuffer = max(0.0, -min_buffer) if min_buffer < 0 else 0.0
        headroom = avg_throughput - rate

        results["rates"][str(rate)] = {
            "playbackRate": rate,
            "isSustained": headroom >= 0,
            "headroomPerSec": round(headroom, 3),
            "exhaustionCountWithInitialBuffer": exhaustion_events,
            "minBufferLevelSec": round(min_buffer, 3),
            "finalBufferLevelSec": round(buffer_level, 3),
            "requiredInitialPrebufferSec": round(required_prebuffer, 3)
        }

    return results
