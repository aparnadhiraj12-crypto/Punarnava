import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Diet from './Diet';
import * as api from '../../lib/api';

vi.mock('../../components/AppShell', () => ({ default: ({ children }) => <main>{children}</main> }));
vi.mock('../../lib/session', () => ({ getSession: () => ({ linkedId: 'mother/1' }) }));
vi.mock('../../lib/api', () => ({
  getDietProfile: vi.fn(), saveDietProfile: vi.fn(), getAllergyProfile: vi.fn(),
  putAllergyProfile: vi.fn(), getBudgetProfile: vi.fn(), putBudgetProfile: vi.fn(),
  getFoodSuggestions: vi.fn(), postFoodFeedback: vi.fn(), getFoodFeedback: vi.fn(),
  deleteFoodFeedback: vi.fn(), getDailyCheckIns: vi.fn(), postDailyCheckIn: vi.fn(),
}));
const food = { id: 'rice', title: 'Rice meal', stage: 'pregnancy_t1', meal_types: ['lunch'],
  ingredients: ['rice', 'milk'], allergens: ['milk'], affordability: 'low',
  affordability_estimate: { basis: 'illustrative per serving', currency: 'INR', min: 20, max: 30,
    ingredients: [{ ingredient: 'rice', quantity_g: 60, unit_price_basis: 'INR per kg' }],
    assumptions: ['Illustrative only; local prices vary.'] },
  limit_notes: 'Portion sizes vary.', is_demo: true };
const guidance = { ruleset_version: 'test-v1', disclaimer: 'Discuss your needs with your clinician.',
  context_notes: ['Based on your saved check-in.'], cards: [{ rule_id: 'DIET-1', layer: 'nausea',
    citation: 'Verified nutrition source, section 2', eat: ['Small meals'], limit: ['Strong smells'],
    tip: 'Try cool foods.', note: 'General guidance only.', limit_notes: 'Not a treatment plan.' }] };
beforeEach(() => {
  vi.resetAllMocks();
  api.getDietProfile.mockResolvedValue({ profile: { weight_kg: 52 } });
  api.getAllergyProfile.mockResolvedValue({ allergens: [] });
  api.getBudgetProfile.mockResolvedValue({ budget: 'medium', available_ingredients: [] });
  api.getFoodSuggestions.mockResolvedValue({ suggestions: [food], guidance });
  api.getFoodFeedback.mockResolvedValue({ feedback: [] });
  api.getDailyCheckIns.mockResolvedValue({ checkins: [] });
});

it('renders sourced guidance separately from illustrative meal metadata and limitations', async () => {
  render(<Diet />);
  const section = await screen.findByRole('region', { name: 'Personalized diet guidance' });
  expect(within(section).getByText('Small meals')).toBeInTheDocument();
  for (const text of ['Strong smells', 'Try cool foods.', 'General guidance only.', 'Not a treatment plan.',
    'Verified nutrition source, section 2', 'Based on your saved check-in.']) {
    expect(within(section).getByText(text)).toBeInTheDocument();
  }
  expect(section).toHaveTextContent('test-v1');
  expect(screen.getByText(/Ingredients: rice, milk/)).toBeInTheDocument();
  expect(screen.getByText(/Allergens: milk/)).toBeInTheDocument();
  expect(screen.getByText(/illustrative per serving/)).toHaveTextContent('INR');
  expect(screen.getByText('Portion sizes vary.')).toBeInTheDocument();
  expect(screen.getByText(/not GDM-approved/i)).toBeInTheDocument();
  expect(screen.queryByText(/not yet/)).not.toBeInTheDocument();
});

it('can undo feedback for a rejected food absent from suggestions without losing check-in answers', async () => {
  const user = userEvent.setup();
  api.getFoodFeedback.mockResolvedValue({ feedback: [{ food_id: 'hidden-rice', issue: 'disliked' }] });
  render(<Diet />);
  await screen.findByRole('button', { name: 'Edit diet profile' });
  await user.click(screen.getByRole('radio', { name: 'Severe' }));
  const undo = await screen.findByRole('button', { name: /Undo feedback.*hidden-rice/ });
  await user.click(undo);
  await waitFor(() => expect(api.deleteFoodFeedback).toHaveBeenCalledWith('mother/1', 'hidden-rice'));
  await waitFor(() => expect(api.getFoodFeedback).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('radio', { name: 'Severe' })).toBeChecked();
});

it('preserves profile drafts through failed saves and suggestion retries', async () => {
  const user = userEvent.setup();
  render(<Diet />);
  await user.click(await screen.findByRole('button', { name: 'Edit diet profile' }));
  const weight = screen.getByRole('spinbutton', { name: 'Your current weight (kg)' });
  await user.clear(weight);
  await user.type(weight, '61');
  api.saveDietProfile.mockRejectedValueOnce(new Error('Save unavailable'));
  await user.click(screen.getByRole('button', { name: 'Save my profile' }));
  await screen.findByText(/Save unavailable/);
  expect(weight).toHaveValue(61);
  await user.click(screen.getByRole('button', { name: 'Retry suggestions' }));
  await waitFor(() => expect(api.getFoodSuggestions).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('spinbutton', { name: 'Your current weight (kg)' })).toHaveValue(61);
});

it('refreshes guidance after daily save without resetting dirty preferences or check-in answers', async () => {
  const user = userEvent.setup();
  render(<Diet />);
  await screen.findByRole('button', { name: 'Edit diet profile' });
  await user.click(screen.getByRole('radio', { name: 'Severe' }));
  await user.type(screen.getByRole('textbox', { name: 'Allergies, separated by commas' }), 'peanut');
  api.getFoodSuggestions.mockResolvedValueOnce({ suggestions: [], guidance: { ...guidance, context_notes: ['Updated from daily answers.'] } });
  await user.click(screen.getByRole('button', { name: "Save today's check-in" }));
  await waitFor(() => expect(api.postDailyCheckIn).toHaveBeenCalled());
  await waitFor(() => expect(api.getFoodSuggestions).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('textbox', { name: 'Allergies, separated by commas' })).toHaveValue('peanut');
  expect(screen.getByRole('radio', { name: 'Severe' })).toBeChecked();
  expect(api.getAllergyProfile).toHaveBeenCalledTimes(1);
  expect(api.getFoodFeedback).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('Updated from daily answers.')).toBeInTheDocument();
});

it('preserves all drafts across failed feedback, retries, and successful undo', async () => {
  const user = userEvent.setup();
  api.getFoodFeedback.mockResolvedValue({ feedback: [{ food_id: 'hidden-rice', issue: 'disliked' }] });
  render(<Diet />);
  await user.click(await screen.findByRole('button', { name: 'Edit diet profile' }));
  const weight = screen.getByRole('spinbutton', { name: 'Your current weight (kg)' });
  await user.clear(weight);
  await user.type(weight, '63');
  await user.click(screen.getByRole('radio', { name: 'Severe' }));
  await user.type(screen.getByRole('textbox', { name: 'Allergies, separated by commas' }), 'peanut');
  api.deleteFoodFeedback.mockRejectedValueOnce(new Error('Undo unavailable'));
  await user.click(screen.getByRole('button', { name: /Undo feedback.*hidden-rice/ }));
  await screen.findByText(/Undo unavailable/);
  await user.click(screen.getByRole('button', { name: 'Retry suggestions' }));
  await waitFor(() => expect(api.getFoodSuggestions).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole('button', { name: /Undo feedback.*hidden-rice/ })).toBeEnabled());
  api.getFoodFeedback.mockResolvedValueOnce({ feedback: [] });
  await user.click(screen.getByRole('button', { name: /Undo feedback.*hidden-rice/ }));
  await screen.findByText('Feedback undone. History kept.');
  await waitFor(() => expect(screen.queryByRole('button', { name: /Undo feedback.*hidden-rice/ })).not.toBeInTheDocument());
  expect(screen.getByRole('spinbutton', { name: 'Your current weight (kg)' })).toHaveValue(63);
  expect(screen.getByRole('textbox', { name: 'Allergies, separated by commas' })).toHaveValue('peanut');
  expect(screen.getByRole('radio', { name: 'Severe' })).toBeChecked();
});

it('posts a swap with its selected stage and restores the hidden original using undo', async () => {
  const user = userEvent.setup();
  const alternative = { ...food, id: 'dal', title: 'Dal meal' };
  api.getFoodSuggestions.mockResolvedValue({ suggestions: [food, alternative], guidance });
  render(<Diet />);
  await user.click(await screen.findByRole('button', { name: 'Show alternatives for Rice meal' }));
  api.postFoodFeedback.mockImplementationOnce(async () => {
    api.getFoodSuggestions.mockResolvedValue({ suggestions: [alternative], guidance });
    api.getFoodFeedback.mockResolvedValue({ feedback: [{ food_id: 'rice', issue: 'swapped', alternative_id: 'dal' }] });
  });
  await user.click(screen.getByRole('button', { name: 'Choose Dal meal' }));
  await waitFor(() => expect(api.postFoodFeedback).toHaveBeenCalledWith('mother/1', expect.objectContaining({
    issue: 'swapped', food_id: 'rice', alternative_id: 'dal', stage: 'pregnancy_t1',
  })));
  const undo = await screen.findByRole('button', { name: 'Undo feedback: rice' });
  api.deleteFoodFeedback.mockImplementationOnce(async () => {
    api.getFoodFeedback.mockResolvedValue({ feedback: [] });
    api.getFoodSuggestions.mockResolvedValue({ suggestions: [food, alternative], guidance });
  });
  await user.click(undo);
  expect(await screen.findByRole('heading', { name: 'Rice meal' })).toBeInTheDocument();
});

it('offers one undo per food when history has multiple entries for that food', async () => {
  api.getFoodFeedback.mockResolvedValue({ feedback: [
    { id: 1, food_id: 'hidden', issue: 'worked' }, { id: 2, food_id: 'hidden', issue: 'disliked' },
  ] });
  render(<Diet />);
  await screen.findByRole('button', { name: 'Edit diet profile' });
  expect(screen.getAllByRole('button', { name: 'Undo feedback: hidden' })).toHaveLength(1);
});

it('does not present an undone history event as an active rating', async () => {
  api.getFoodFeedback.mockResolvedValue({ feedback: [
    { id: 1, food_id: 'hidden', issue: 'disliked' }, { id: 2, food_id: 'hidden', issue: 'undone' },
  ] });
  render(<Diet />);
  await screen.findByRole('button', { name: 'Edit diet profile' });
  expect(screen.queryByRole('button', { name: 'Undo feedback: hidden' })).not.toBeInTheDocument();
});

it('preserves saved food preferences when editing other profile fields', async () => {
  const user = userEvent.setup();
  api.getDietProfile.mockResolvedValue({ profile: { weight_kg: 52, food_preferences: ['South Indian'] } });
  render(<Diet />);
  await user.click(await screen.findByRole('button', { name: 'Edit diet profile' }));
  await user.click(screen.getByRole('button', { name: 'Save my profile' }));
  await waitFor(() => expect(api.saveDietProfile).toHaveBeenCalledWith('mother/1', expect.objectContaining({ food_preferences: ['South Indian'] })));
});

it('does not claim suggestions refreshed when saving succeeded but refresh failed', async () => {
  const user = userEvent.setup();
  render(<Diet />);
  await screen.findByRole('button', { name: 'Edit diet profile' });
  api.getFoodSuggestions.mockRejectedValueOnce(new Error('Refresh failed'));
  await user.click(screen.getByRole('button', { name: 'Save preferences' }));
  await screen.findByText('Refresh failed');
  expect(screen.queryByText(/Suggestions refreshed/)).not.toBeInTheDocument();
  expect(screen.getByText('Preferences saved.')).toBeInTheDocument();
});

it('shows guidance with no meal matches, including while preferences and profile are being edited', async () => {
  const user = userEvent.setup();
  api.getFoodSuggestions.mockResolvedValue({ suggestions: [], guidance });
  render(<Diet />);
  expect(await screen.findByText('No matching options available.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Edit diet profile' }));
  await user.type(screen.getByRole('textbox', { name: 'Ingredients at home, separated by commas' }), 'carrot');
  expect(screen.getByRole('region', { name: 'Personalized diet guidance' })).toHaveTextContent('Small meals');
  expect(screen.getByText('Guidance uses your saved answers, not unsaved edits.')).toBeInTheDocument();
});

it('shows the verified-guidance empty state rather than inventing advice', async () => {
  api.getFoodSuggestions.mockResolvedValue({ suggestions: [], guidance: { ...guidance, cards: [] } });
  render(<Diet />);
  const region = await screen.findByRole('region', { name: 'Personalized diet guidance' });
  expect(region).toHaveTextContent('No verified guidance is available for this context.');
  expect(region).toHaveTextContent('Discuss your needs with your clinician.');
  expect(region).not.toHaveTextContent('Small meals');
});
