import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { serializeProject } from '../../io/projectFile';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { makeProject } from '../../test/fixtures';

const current = () =>
  makeProject({
    name: 'Old plan',
    description: 'To be edited',
    tasks: [
      { id: 'P', name: 'Website' },
      { id: 'A', name: 'Design', parent: 'P', start: '2026-11-02', finish: '2026-11-06' },
    ],
    milestones: [{ name: 'Sign-off', date: '2026-11-13' }],
  });

function setup() {
  useProjectStore.getState().loadProject(current());
  useUiStore.getState().closeDialog();
  const user = userEvent.setup();
  render(<App storageAvailable />);
  return user;
}

const editorDialog = () => screen.getByRole('dialog', { name: 'JSON Editor' });
const editor = () => within(editorDialog()).getByRole('textbox', { name: 'Project JSON' });
const status = () => within(editorDialog()).getByRole('status');
const button = (name: string) => within(editorDialog()).getByRole('button', { name });
const setText = (text: string) => fireEvent.change(editor(), { target: { value: text } });

/** The editor's text with `change` applied to the project inside it. */
function edited(
  change: (
    project: Record<string, unknown> & { tasks: Record<string, Record<string, unknown>> },
  ) => void,
) {
  const file = JSON.parse((editor() as HTMLTextAreaElement).value);
  change(file.project);
  return JSON.stringify(file, null, 2);
}

describe('JSON Editor', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 9, 10));
  });

  afterEach(() => vi.useRealTimers());

  async function open() {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'JSON Editor' }));
    return user;
  }

  it('shows exactly the text Export downloads, from the top', async () => {
    await open();
    const text = serializeProject(useProjectStore.getState().project, '2026-11-09');
    expect(editor()).toHaveValue(text);
    expect(editor()).toHaveFocus();
    expect((editor() as HTMLTextAreaElement).selectionStart).toBe(0);
    expect(status()).toHaveTextContent('');
  });

  it('offers Validate, Cancel and Save', async () => {
    await open();
    const names = within(editorDialog())
      .getAllByRole('button')
      .map((b) => b.textContent);
    expect(names).toEqual(['Validate', 'Cancel', 'Save']);
  });

  it('Validate says the text is valid, counting tasks as the totals do', async () => {
    const user = await open();
    await user.click(button('Validate'));
    expect(status()).toHaveTextContent('Valid: 1 task and 1 milestone.');
    expect(editor()).not.toHaveAttribute('aria-invalid');
  });

  it('Validate says where broken JSON breaks, and typing clears the message', async () => {
    const user = await open();
    setText('{\n  "format": "gantt-chart",\n}');
    await user.click(button('Validate'));
    expect(status()).toHaveTextContent("This isn't valid JSON (line 3, column 1).");
    expect(editor()).toHaveAttribute('aria-invalid', 'true');

    setText('{}');
    expect(status()).toHaveTextContent('');
  });

  it('Validate checks the project rules, as Import does', async () => {
    const user = await open();
    setText(edited((p) => void (p.tasks.A!.start = '2026-13-45')));
    await user.click(button('Validate'));
    expect(status()).toHaveTextContent(
      'The project data is damaged: task “Design” has an invalid start date.',
    );
  });

  it('Save replaces the whole project, closes, and is one undo step', async () => {
    const user = await open();
    const before = structuredClone(useProjectStore.getState().project);
    setText(
      edited((p) => {
        p.name = 'Edited in JSON';
        p.tasks.A!.name = 'Design v2';
        p.milestones = [];
      }),
    );
    await user.click(button('Save'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const { project, past } = useProjectStore.getState();
    expect(project.id).toBe(before.id);
    expect(project.name).toBe('Edited in JSON');
    expect(project.tasks.A?.name).toBe('Design v2');
    expect(project.milestones).toEqual([]);
    expect(past.at(-1)?.label).toBe('Edit JSON');
    expect(screen.getByRole('textbox', { name: 'Project Title' })).toHaveValue('Edited in JSON');

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(useProjectStore.getState().project).toEqual(before);
  });

  it('Save refuses invalid text and keeps the editor open with the text and the reason', async () => {
    const user = await open();
    const before = structuredClone(useProjectStore.getState().project);
    setText('{ "format": "gantt-chart" ');
    await user.click(button('Save'));

    expect(editorDialog()).toBeInTheDocument();
    expect(editor()).toHaveValue('{ "format": "gantt-chart" ');
    expect(status()).toHaveTextContent("This isn't valid JSON");
    expect(useProjectStore.getState().project).toEqual(before);
  });

  it('Save without changes just closes, adding no undo step', async () => {
    const user = await open();
    const steps = useProjectStore.getState().past.length;
    await user.click(button('Save'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useProjectStore.getState().past).toHaveLength(steps);
  });

  it('Cancel discards the edits', async () => {
    const user = await open();
    const before = structuredClone(useProjectStore.getState().project);
    const original = (editor() as HTMLTextAreaElement).value;
    setText(edited((p) => void (p.name = 'Not saved')));
    await user.click(button('Cancel'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useProjectStore.getState().project).toEqual(before);
    await user.click(screen.getByRole('button', { name: 'JSON Editor' }));
    expect(editor()).toHaveValue(original);
  });
});
