import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";
import * as api from "../../lib/api";

vi.mock("../../lib/api", async (original) => ({
  ...await original(), getMilestonePreparation: vi.fn(), saveMilestonePreparation: vi.fn(),
  getWoman: vi.fn(), recordVisit: vi.fn(), getBpReadings: vi.fn().mockResolvedValue([]),
  getMedications: vi.fn().mockResolvedValue([]),
}));
let saved;
const milestones = [1, 2].map(n => ({ rule_id: `ANC-0${n}`, type: `antenatal_visit_${n}`,
  due_date: "2026-10-19", state: "due", days_overdue: 0 }));
beforeEach(() => {
  vi.clearAllMocks(); saved = {};
  localStorage.clear();
  localStorage.setItem("punarnava_token", "test-session");
  localStorage.setItem("punarnava_role", "mother");
  localStorage.setItem("punarnava_linked_id", "mother-a");
  api.getWoman.mockResolvedValue({ id: "mother-a", name: "Mother", milestones });
  api.getMilestonePreparation.mockImplementation(async (wid, id) => {
    const milestone = milestones.find(m => m.rule_id === id);
    if (!milestone) throw Object.assign(new Error("not found"), { status: 404 });
    return { milestone, guidance: null, preparation: saved[id] ?? {
      questions: "", checklist: [{ label: "My health records", checked: false }],
    } };
  });
  api.saveMilestonePreparation.mockImplementation(async (wid, id, payload) => {
    const { expected_due_date, ...preparation } = payload;
    if (expected_due_date !== milestones.find(m => m.rule_id === id).due_date) {
      throw Object.assign(new Error("Journey changed"), { status: 409 });
    }
    saved[id] = structuredClone(preparation);
    return api.getMilestonePreparation(wid, id);
  });
});
function open(path) { window.history.replaceState({}, "", path); return render(<App />); }

it("opens visit 2, saves a question and checklist, reloads, isolates visit 1, and returns to Journey", async () => {
  const user = userEvent.setup();
  let view = open("/m/mother-a");
  await user.click((await screen.findAllByRole("link", { name: "Antenatal visit 2" }))[0]);
  await screen.findByRole("heading", { name: "Antenatal visit 2" });
  await user.type(screen.getByLabelText("My questions for this visit"), "Can we discuss my visit plan?");
  await user.click(screen.getByRole("checkbox", { name: "My health records" }));
  await user.click(screen.getByRole("button", { name: "Save preparation" }));
  await screen.findByRole("status");
  view.unmount();
  view = open("/m/item/ANC-02");
  expect(await screen.findByLabelText("My questions for this visit")).toHaveValue("Can we discuss my visit plan?");
  expect(screen.getByRole("checkbox", { name: "My health records" })).toBeChecked();
  await user.click(screen.getByRole("link", { name: "Back to Journey" }));
  await screen.findByText("Your journey");
  await user.click((await screen.findAllByRole("link", { name: "Antenatal visit 1" }))[0]);
  expect(await screen.findByLabelText("My questions for this visit")).toHaveValue("");
  expect(api.getMilestonePreparation).toHaveBeenCalledWith("mother-a", "ANC-02");
});

it("handles an unknown direct link with a way back", async () => {
  open("/m/item/unknown");
  await screen.findByRole("heading", { name: "Milestone not found" });
  expect(screen.getByRole("link", { name: "Back to Journey" })).toHaveAttribute("href", "/m/mother-a");
  expect(screen.queryByRole("button", { name: "Save preparation" })).not.toBeInTheDocument();
});

it("redirects an unsigned direct link to login", async () => {
  localStorage.clear();
  open("/m/item/ANC-02");
  await screen.findByText("Log in");
  expect(api.getMilestonePreparation).not.toHaveBeenCalled();
});

it("keeps a failed save editable and retries without losing the question", async () => {
  const user = userEvent.setup();
  api.saveMilestonePreparation.mockRejectedValueOnce(new Error("offline"));
  open("/m/item/ANC-02");
  await user.type(await screen.findByLabelText("My questions for this visit"), "My unsaved question");
  await user.click(screen.getByRole("button", { name: "Save preparation" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("My questions for this visit")).toHaveValue("My unsaved question");
  await user.click(screen.getByRole("button", { name: "Save preparation" }));
  await screen.findByRole("status");
});

it("explains a Journey date conflict and retains editable questions and checklist", async () => {
  const user = userEvent.setup();
  api.saveMilestonePreparation.mockRejectedValueOnce(Object.assign(new Error("conflict"), { status: 409 }));
  open("/m/item/ANC-02");
  await user.type(await screen.findByLabelText("My questions for this visit"), "Keep my unsaved question");
  await user.click(screen.getByRole("checkbox", { name: "My health records" }));
  await user.click(screen.getByRole("button", { name: "Save preparation" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Journey has changed/);
  expect(screen.getByRole("alert")).toHaveTextContent(/not saved/i);
  expect(screen.getByRole("alert")).toHaveTextContent(/still here/i);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(api.saveMilestonePreparation).toHaveBeenLastCalledWith("mother-a", "ANC-02", {
    expected_due_date: "2026-10-19", questions: "Keep my unsaved question",
    checklist: [{ label: "My health records", checked: true }],
  });
  expect(screen.getByLabelText("My questions for this visit")).toHaveValue("Keep my unsaved question");
  expect(screen.getByRole("checkbox", { name: "My health records" })).toBeChecked();
  await user.type(screen.getByLabelText("My questions for this visit"), " edited");
  expect(screen.getByLabelText("My questions for this visit")).toHaveValue("Keep my unsaved question edited");
  await user.click(screen.getByRole("link", { name: "Back to Journey" }));
  await screen.findByText("Your journey");
});

it("keeps Journey outcome buttons separate from the title links", async () => {
  const user = userEvent.setup();
  api.recordVisit.mockResolvedValue({ status: "persisted" });
  open("/m/mother-a");
  await user.click((await screen.findAllByRole("button", { name: /I went/ }))[0]);
  expect(api.recordVisit).toHaveBeenLastCalledWith("mother-a", "done", undefined, "ANC-01");
  expect(window.location.pathname).toBe("/m/mother-a");
  await user.click(screen.getAllByRole("button", { name: "Could not go" })[0]);
  await user.click(screen.getByRole("button", { name: "No transport" }));
  expect(api.recordVisit).toHaveBeenLastCalledWith("mother-a", "could_not_go", "no_transport", "ANC-01");
  expect(window.location.pathname).toBe("/m/mother-a");
});
