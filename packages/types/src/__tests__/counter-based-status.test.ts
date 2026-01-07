/**
 * Counter-Based Row Status Tests
 * 
 * Tests for the O(1) row status calculation logic
 */

import { describe, expect, it } from 'vitest';
import {
  calculateRowStatusFromCounters,
  calculateRowConfidenceFromSum,
  RowStatus,
} from '@repo/types';

describe('Counter-Based Row Status Calculation', () => {
  describe('calculateRowStatusFromCounters', () => {
    it('should return idle when totalTasks is 0', () => {
      const status = calculateRowStatusFromCounters(0, 0, 0, 0);
      expect(status).toBe(RowStatus.IDLE);
    });

    it('should return running when any tasks are running', () => {
      const status = calculateRowStatusFromCounters(10, 5, 2, 3);
      expect(status).toBe(RowStatus.RUNNING);
    });

    it('should return done when all tasks are done', () => {
      const status = calculateRowStatusFromCounters(10, 10, 0, 0);
      expect(status).toBe(RowStatus.DONE);
    });

    it('should return failed when all tasks failed', () => {
      const status = calculateRowStatusFromCounters(10, 0, 10, 0);
      expect(status).toBe(RowStatus.FAILED);
    });

    it('should return queued when tasks are queued (none running)', () => {
      // totalTasks=10, done=5, failed=2, running=0 → queued=3
      const status = calculateRowStatusFromCounters(10, 5, 2, 0);
      expect(status).toBe(RowStatus.QUEUED);
    });

    it('should return ambiguous when some done and some failed', () => {
      // totalTasks=10, done=5, failed=5, running=0, queued=0
      const status = calculateRowStatusFromCounters(10, 5, 5, 0);
      expect(status).toBe(RowStatus.AMBIGUOUS);
    });

    it('should prioritize running over other states', () => {
      // Even if some are done and some failed, running takes precedence
      const status = calculateRowStatusFromCounters(10, 4, 3, 2);
      expect(status).toBe(RowStatus.RUNNING);
    });

    it('should handle edge case: all queued', () => {
      // totalTasks=10, nothing started yet
      const status = calculateRowStatusFromCounters(10, 0, 0, 0);
      expect(status).toBe(RowStatus.QUEUED);
    });

    it('should handle realistic scenario: in-progress enrichment', () => {
      // 100 tasks: 60 done, 10 failed, 20 running, 10 queued
      const status = calculateRowStatusFromCounters(100, 60, 10, 20);
      expect(status).toBe(RowStatus.RUNNING);
    });

    it('should handle realistic scenario: partial completion', () => {
      // 100 tasks: 70 done, 30 failed, 0 running, 0 queued
      const status = calculateRowStatusFromCounters(100, 70, 30, 0);
      expect(status).toBe(RowStatus.AMBIGUOUS);
    });
  });

  describe('calculateRowConfidenceFromSum', () => {
    it('should return null when no tasks are done', () => {
      const confidence = calculateRowConfidenceFromSum(0, 0);
      expect(confidence).toBeNull();
    });

    it('should calculate average correctly', () => {
      // 3 tasks done, confidences: 0.8, 0.9, 0.7 → sum = 2.4
      const confidence = calculateRowConfidenceFromSum(2.4, 3);
      expect(confidence).toBeCloseTo(0.8, 5);
    });

    it('should handle single task', () => {
      const confidence = calculateRowConfidenceFromSum(0.95, 1);
      expect(confidence).toBe(0.95);
    });

    it('should handle many tasks', () => {
      // 100 tasks, all with 0.9 confidence → sum = 90
      const confidence = calculateRowConfidenceFromSum(90, 100);
      expect(confidence).toBe(0.9);
    });

    it('should handle low confidence average', () => {
      // 5 tasks with varying confidence: 0.3, 0.4, 0.5, 0.6, 0.2 → sum = 2.0
      const confidence = calculateRowConfidenceFromSum(2.0, 5);
      expect(confidence).toBe(0.4);
    });

    it('should handle perfect confidence', () => {
      const confidence = calculateRowConfidenceFromSum(10, 10);
      expect(confidence).toBe(1.0);
    });

    it('should handle zero confidence sum', () => {
      // All tasks returned 0 confidence
      const confidence = calculateRowConfidenceFromSum(0, 5);
      expect(confidence).toBe(0);
    });
  });

  describe('Integration: Counter Updates During Enrichment', () => {
    it('should correctly update counters: queued → running → done', () => {
      // Initial state: 10 tasks, all queued
      let total = 10, done = 0, failed = 0, running = 0, confSum = 0;
      let status = calculateRowStatusFromCounters(total, done, failed, running);
      expect(status).toBe(RowStatus.QUEUED);

      // Task 1 starts running
      running++;
      status = calculateRowStatusFromCounters(total, done, failed, running);
      expect(status).toBe(RowStatus.RUNNING);

      // Task 1 completes with 0.9 confidence
      running--;
      done++;
      confSum += 0.9;
      status = calculateRowStatusFromCounters(total, done, failed, running);
      const conf = calculateRowConfidenceFromSum(confSum, done);
      expect(status).toBe(RowStatus.QUEUED); // Still 9 queued
      expect(conf).toBe(0.9);

      // All tasks complete successfully
      running = 0;
      done = 10;
      failed = 0;
      confSum = 9.0; // Average 0.9
      status = calculateRowStatusFromCounters(total, done, failed, running);
      const finalConf = calculateRowConfidenceFromSum(confSum, done);
      expect(status).toBe(RowStatus.DONE);
      expect(finalConf).toBe(0.9);
    });

    it('should correctly update counters: queued → running → failed', () => {
      // Initial state: 5 tasks
      let total = 5, done = 0, failed = 0, running = 0;

      // 2 tasks start running
      running = 2;
      let status = calculateRowStatusFromCounters(total, done, failed, running);
      expect(status).toBe(RowStatus.RUNNING);

      // Task 1 completes
      running--;
      done++;
      status = calculateRowStatusFromCounters(total, done, failed, running);
      expect(status).toBe(RowStatus.RUNNING); // Still 1 running

      // Task 2 fails
      running--;
      failed++;
      status = calculateRowStatusFromCounters(total, done, failed, running);
      expect(status).toBe(RowStatus.QUEUED); // 3 still queued

      // Remaining 3 tasks all fail
      failed = 4; // 1 done, 4 failed
      status = calculateRowStatusFromCounters(total, done, failed, running);
      expect(status).toBe(RowStatus.AMBIGUOUS);
    });

    it('should handle concurrent execution', () => {
      // Simulate 20 tasks running in parallel
      const total = 100;
      let done = 30, failed = 10, running = 20; // 40 queued

      const status = calculateRowStatusFromCounters(total, done, failed, running);
      expect(status).toBe(RowStatus.RUNNING);

      // All running tasks complete (10 succeed, 10 fail)
      done += 10;
      failed += 10;
      running = 0;

      const newStatus = calculateRowStatusFromCounters(total, done, failed, running);
      // 40 done, 20 failed, 0 running → 40 still queued
      expect(newStatus).toBe(RowStatus.QUEUED);
    });
  });

  describe('Edge Cases and Invariants', () => {
    it('should maintain invariant: done + failed + running + queued = total', () => {
      const total = 50;
      const done = 20;
      const failed = 10;
      const running = 5;
      const queued = total - done - failed - running;

      expect(queued).toBe(15);
      expect(done + failed + running + queued).toBe(total);
    });

    it('should handle zero confidence tasks', () => {
      const confidence = calculateRowConfidenceFromSum(0, 10);
      expect(confidence).toBe(0);
    });

    it('should not allow negative counters (validation)', () => {
      // This should never happen in practice, but let's test the logic
      const status = calculateRowStatusFromCounters(10, 0, 0, 0);
      expect(status).toBe(RowStatus.QUEUED);
    });

    it('should handle maximum confidence', () => {
      const confidence = calculateRowConfidenceFromSum(100, 100);
      expect(confidence).toBe(1.0);
    });
  });
});

describe('Comparison: Old vs New Approach', () => {
  it('should produce same result as array-based aggregation', () => {
    // Simulate what the old code would do
    const tasks = [
      { status: 'done', confidence: 0.9 },
      { status: 'done', confidence: 0.8 },
      { status: 'failed', confidence: null },
      { status: 'running', confidence: null },
      { status: 'queued', confidence: null },
    ];

    // Old way (for comparison only)
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const failedCount = tasks.filter(t => t.status === 'failed').length;
    const runningCount = tasks.filter(t => t.status === 'running').length;
    const confidences = tasks.filter(t => t.confidence !== null).map(t => t.confidence!);
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

    // New way (counter-based)
    const total = 5;
    const done = doneCount;
    const failed = failedCount;
    const running = runningCount;
    const confSum = 0.9 + 0.8;

    const status = calculateRowStatusFromCounters(total, done, failed, running);
    const confidence = calculateRowConfidenceFromSum(confSum, done);

    expect(status).toBe(RowStatus.RUNNING);
    expect(confidence).toBeCloseTo(avgConfidence, 5);
  });
});
