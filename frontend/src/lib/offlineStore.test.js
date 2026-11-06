// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  clearOfflineQueue, getOfflineQueue, queueRequest, syncOfflineQueue,
} from "./offlineStore";

beforeEach(() => {
  clearOfflineQueue();
  vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
});

afterEach(() => {
  clearOfflineQueue();
  vi.restoreAllMocks();
});

it("submits a queued visit once when reconnect and manual sync overlap", async () => {
  queueRequest({ method: "POST", path: "/outreach/respond", body: {} });

  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const send = vi.fn(() => gate);

  const reconnect = syncOfflineQueue(send);
  const manual = syncOfflineQueue(send);
  await Promise.resolve();
  release();
  await Promise.all([reconnect, manual]);

  expect(send).toHaveBeenCalledTimes(1);
  expect(getOfflineQueue()).toHaveLength(0);
});

it("keeps a failed enrolment and removes it after a successful retry", async () => {
  const item = queueRequest({ method: "POST", path: "/ingestion/manual", body: {} });
  const send = vi.fn()
    .mockRejectedValueOnce(new Error("Connection lost"))
    .mockResolvedValueOnce({});

  await syncOfflineQueue(send);
  expect(getOfflineQueue().map(entry => entry.id)).toEqual([item.id]);

  await syncOfflineQueue(send);
  expect(send).toHaveBeenCalledTimes(2);
  expect(getOfflineQueue()).toHaveLength(0);
});
