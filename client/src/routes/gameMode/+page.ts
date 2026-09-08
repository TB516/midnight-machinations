import { parseJson, parseShareableGameMode, type ShareableGameMode, type RoleId } from '$lib/game-modes';
import type { PageLoad } from './$types';

export const prerender = false;
export const ssr = true;

export const load: PageLoad = ({ url }) => {
  const encodedMode = url.searchParams.get('mode');
  if (encodedMode === null) {
    return {
      sharedMode: null,
      importError: 'This share link does not include a game mode.'
    };
  }

  const json = parseJson(encodedMode);
  if (!json.ok) {
    return {
      sharedMode: null,
      importError: json.reason
    };
  }

  const mode = parseShareableGameMode(json.value);
  if (!mode.ok) {
    return {
      sharedMode: null,
      importError: `${mode.reason}. ${mode.snippet}`
    };
  }

  return {
    sharedMode: mode.value satisfies ShareableGameMode<RoleId>,
    importError: ''
  };
};
