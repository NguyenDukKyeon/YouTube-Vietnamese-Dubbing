"""
Unit tests for metrics and calculation formulas
"""

import pytest
from src.metrics import calculate_rtf, calculate_throughput, compute_statistics, simulate_ready_buffer


def test_calculate_rtf():
    # 2.0s wall time to generate 4.0s audio -> RTF = 0.5
    assert calculate_rtf(2.0, 4.0) == 0.5
    # 3.0s wall time to generate 2.0s audio -> RTF = 1.5
    assert calculate_rtf(3.0, 2.0) == 1.5


def test_calculate_throughput():
    # 4.0s audio in 2.0s wall time -> 2.0x throughput
    assert calculate_throughput(2.0, 4.0) == 2.0
    # 2.0s audio in 3.0s wall time -> 0.6667x throughput
    assert calculate_throughput(3.0, 2.0) == 0.6667


def test_compute_statistics():
    data = [1.0, 2.0, 3.0, 4.0, 5.0]
    stats = compute_statistics(data)
    assert stats["count"] == 5
    assert stats["min"] == 1.0
    assert stats["median"] == 3.0
    assert stats["mean"] == 3.0
    assert stats["max"] == 5.0
    assert stats["cv"] > 0


def test_simulate_ready_buffer():
    # 5 chunks, each takes 2.0s wall time and produces 2.5s audio (throughput 1.25x)
    chunks = [{"wall_sec": 2.0, "audio_sec": 2.5} for _ in range(5)]
    # With 2.0s initial pre-buffer, draining at 1.0x over 2.0s leaves exactly 0.0s before chunk completes
    sim = simulate_ready_buffer(chunks, playback_rates=[1.0, 1.25, 1.5, 2.0], initial_prebuffer_sec=2.0)
    
    assert sim["totalChunks"] == 5
    assert sim["totalWallSec"] == 10.0
    assert sim["totalAudioSec"] == 12.5
    assert sim["overallThroughput"] == 1.25

    # At 1.0x, headroom is positive (+0.25)
    rate_1 = sim["rates"]["1.0"]
    assert rate_1["isSustained"] is True
    assert rate_1["headroomPerSec"] == 0.25
    assert rate_1["exhaustionCountWithInitialBuffer"] == 0

    # At 1.5x, headroom is negative (-0.25)
    rate_15 = sim["rates"]["1.5"]
    assert rate_15["isSustained"] is False
    assert rate_15["headroomPerSec"] == -0.25
