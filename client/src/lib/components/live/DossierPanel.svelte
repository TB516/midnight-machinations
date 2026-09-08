<script lang="ts">
  import DetailsSummary from '../DetailsSummary.svelte';
  import Icon from '../Icon.svelte';
  import StyledText from '../StyledText.svelte';
  import { allRoles, ROLE_SETS, roleData } from '$lib/game/roles';
  import { MODIFIERS } from '$lib/game/modifiers';
  import { text } from '$lib/live/format';
  import '../graveyardMenu.css';
  import type { GameState } from '$lib/game/state';
  import { formatChatMessage, modifierName, roleName, roleOutlineName } from '$lib/live/format';

  interface Props {
    state: GameState;
    onCrossOut: (indexes: number[]) => void;
  }

  let { state: game, onCrossOut }: Props = $props();

  let names = $derived(game.players.map((player) => player.name));
  let twoThirdsMajority = $derived(
    game.modifierSettings.modifiers.some(([id]) => id === 'twoThirdsMajority')
  );
  let crossedOut = $derived(game.client.type === 'player' ? game.client.crossedOutOutlines : []);

  function toggleOutline(index: number): void {
    if (game.client.type !== 'player') return;
    const next = crossedOut.includes(index)
      ? crossedOut.filter((outline) => outline !== index)
      : [...crossedOut, index];
    onCrossOut(next);
  }

  function modifierDetail(index: number): string | null {
    const modifier = game.modifierSettings.modifiers[index]?.[1];
    if (!modifier || modifier.type !== 'customRoleLimits') return null;
    return modifier.limits.map(([role, limit]) => `${roleName(role)}: ${limit}`).join(', ');
  }

  let hideRoles = $state(true);
  let hideModifiers = $state(true);
</script>

<div class="graveyard-menu graveyard-menu-colors">
  <DetailsSummary summary={text('menu.lobby.roleList') + ': ' + game.roleList.length} open>
    {#each game.roleList as outline, index}
      <button class="button role-list-button" onclick={() => toggleOutline(index)}><span class:crossed={crossedOut.includes(index)}><span class="keyword-outline-number">{index + 1}</span> <StyledText value={roleOutlineName(outline, names)} players={names} /></span></button>
    {/each}
  </DetailsSummary>
  <div class="graveyard-menu-excludedRoles">
    <DetailsSummary>
      {#snippet summary()}<span class="enabled-roles-summary-span">{text('menu.enabledRoles.enabledRoles')}<button class="button flush" aria-label="Hide disabled roles" onclick={event => {event.stopPropagation(); hideRoles = !hideRoles;}}><Icon>{hideRoles ? 'visibility' : 'visibility_off'}</Icon></button></span>{/snippet}
      <div class="enabled-roles-button-panel">
        {#each allRoles().filter(role => !hideRoles || game.enabledRoles.includes(role)).sort((a, b) => ROLE_SETS.indexOf(roleData[a].mainRoleSet) - ROLE_SETS.indexOf(roleData[b].mainRoleSet) || roleName(a).localeCompare(roleName(b))) as role}
          <div class="placard" class:disabled={!game.enabledRoles.includes(role)}><span class:keyword-disabled={!game.enabledRoles.includes(role)}><StyledText value={roleName(role)} /></span></div>
        {/each}
      </div>
    </DetailsSummary>
  </div>
  <div class="graveyard-menu-excludedRoles">
    <DetailsSummary>
      {#snippet summary()}<span class="enabled-roles-summary-span">{text('modifiers')}<button class="button flush" aria-label="Hide disabled modifiers" onclick={event => {event.stopPropagation(); hideModifiers = !hideModifiers;}}><Icon>{hideModifiers ? 'visibility' : 'visibility_off'}</Icon></button></span>{/snippet}
      <div class="enabled-roles-button-panel">
        {#each MODIFIERS.filter(modifier => !hideModifiers || game.modifierSettings.modifiers.some(([id]) => id === modifier)) as modifier}
          <div class="placard" class:disabled={!game.modifierSettings.modifiers.some(([id]) => id === modifier)}><span class:keyword-disabled={!game.modifierSettings.modifiers.some(([id]) => id === modifier)}><StyledText value={text(modifier)} /></span></div>
        {/each}
      </div>
    </DetailsSummary>
  </div>
</div>
<style>.crossed { text-decoration: line-through; }</style>
