import { create } from 'zustand';

/** Which modal is open. Lives outside the project so it is never saved or undone. */
export type OpenDialog =
  | { kind: 'add-task'; parentId: string | null }
  | { kind: 'edit-task'; taskId: string }
  | { kind: 'delete-task'; taskId: string }
  | null;

type UiState = {
  dialog: OpenDialog;
  openDialog: (dialog: Exclude<OpenDialog, null>) => void;
  closeDialog: () => void;
};

export const useUiStore = create<UiState>()((set) => ({
  dialog: null,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
}));
