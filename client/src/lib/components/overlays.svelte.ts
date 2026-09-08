export type CoverCard = 'settings' | 'game-modes' | 'wiki' | 'host';

/** Client-only dialog state. Opening a dialog leaves the current screen mounted. */
export const overlays = $state<{ card: CoverCard | null }>({ card: null });
