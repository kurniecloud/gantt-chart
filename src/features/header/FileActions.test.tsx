import { render, screen, within } from '@testing-library/react';
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
    description: 'To be replaced',
    tasks: [{ id: 'X', name: 'Old task' }],
    milestones: [{ name: 'Old milestone', date: '2026-11-02' }],
  });

const incoming = () =>
  makeProject({
    name: 'Website relaunch',
    description: 'Q4 marketing site',
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

const fileInput = () => screen.getByLabelText('Project file to import');
const jsonFile = (text: string, name = 'plan.gantt.json') =>
  new File([text], name, { type: 'application/json' });

describe('export', () => {
  let saved: { name: string; text: Promise<string> } | undefined;

  beforeEach(() => {
    saved = undefined;
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:test';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      saved = { name: this.download, text: blob!.text() };
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('downloads the whole project, named after its title', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(saved?.name).toBe('old-plan.gantt.json');
    const file = JSON.parse(await saved!.text);
    expect(file.format).toBe('gantt-chart');
    expect(file.project).toEqual(useProjectStore.getState().project);
  });
});

describe('import', () => {
  it('asks first, then replaces title, description, tasks and milestones (undoable)', async () => {
    const user = setup();
    const before = structuredClone(useProjectStore.getState().project);
    await user.upload(fileInput(), jsonFile(serializeProject(incoming(), '2026-11-01')));

    const confirm = screen.getByRole('dialog', { name: 'Import “plan.gantt.json”?' });
    expect(confirm).toHaveTextContent(
      'replaces the current title, description, 1 task and 1 milestone',
    );
    expect(confirm).toHaveTextContent('“Website relaunch” with 2 tasks and 1 milestone');
    expect(useProjectStore.getState().project.name).toBe('Old plan'); // nothing yet

    await user.click(within(confirm).getByRole('button', { name: 'Import' }));
    const { project } = useProjectStore.getState();
    expect(project).toMatchObject({ name: 'Website relaunch', description: 'Q4 marketing site' });
    expect(project.id).toBe(before.id); // overwrites the open project
    expect(project.taskOrder).toEqual(['P', 'A']);
    expect(project.milestones.map((m) => m.name)).toEqual(['Sign-off']);
    expect(screen.getByRole('textbox', { name: 'Project title' })).toHaveValue('Website relaunch');

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(useProjectStore.getState().project).toEqual(before);
  });

  it('changes nothing when the import is cancelled', async () => {
    const user = setup();
    await user.upload(fileInput(), jsonFile(serializeProject(incoming(), '2026-11-01')));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(useProjectStore.getState().project.name).toBe('Old plan');
  });

  it('explains why a file can’t be imported', async () => {
    const user = setup();
    await user.upload(fileInput(), jsonFile('{"hello": "world"}', 'notes.json'));
    const error = screen.getByRole('dialog', { name: 'Couldn’t import “notes.json”' });
    expect(error).toHaveTextContent("This isn't a Gantt Chart project file.");
    expect(error).toHaveTextContent('Nothing was changed.');
    await user.click(within(error).getByRole('button', { name: 'OK' }));
    expect(useProjectStore.getState().project.name).toBe('Old plan');
  });
});
