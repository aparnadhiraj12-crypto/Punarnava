import { afterEach, expect, it, vi } from 'vitest';
import { BASE, deleteFoodFeedback, getFoodFeedback, getFoodSuggestions, postFoodFeedback } from './api';

afterEach(() => vi.unstubAllGlobals());
it('uses encoded authenticated feedback list and undo routes', async () => {
  localStorage.setItem('punarnava_token', 'test-token');
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ feedback: [] }) });
  vi.stubGlobal('fetch', fetch);
  await expect(getFoodFeedback('mother/1')).resolves.toEqual({ feedback: [] });
  expect(fetch).toHaveBeenLastCalledWith(`${BASE}/wellness/food-feedback/mother%2F1`, expect.objectContaining({
    method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
  }));
  await deleteFoodFeedback('mother/1', 'food/a');
  expect(fetch).toHaveBeenLastCalledWith(`${BASE}/wellness/food-feedback/mother%2F1/food%2Fa`, expect.objectContaining({ method: 'DELETE' }));
  localStorage.removeItem('punarnava_token');
});
it('passes suggestion context and swap identifiers without renaming fields', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'saved' }) });
  vi.stubGlobal('fetch', fetch);
  await getFoodSuggestions('mother', { stage: 'pregnancy_t2', region: 'general' });
  expect(fetch).toHaveBeenLastCalledWith(`${BASE}/wellness/food-suggestions/mother?stage=pregnancy_t2&region=general`, expect.objectContaining({ method: 'GET' }));
  const payload = { woman_id: 'mother', food_id: 'rice', issue: 'swapped', alternative_id: 'dal', stage: 'pregnancy_t2' };
  await postFoodFeedback('mother', payload);
  expect(fetch).toHaveBeenLastCalledWith(`${BASE}/wellness/food-feedback/mother`, expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }));
});
it('surfaces rejected undo responses instead of treating them as success', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ detail: 'Not allowed' }) }));
  await expect(deleteFoodFeedback('mother', 'food')).rejects.toMatchObject({ message: 'Not allowed', status: 403 });
});
