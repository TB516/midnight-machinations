<script lang="ts">
  import type { Grave } from '$lib/game/graves';
  import type { RoleList } from '$lib/game/role-list';
  import { text, roleName, replaceMentions } from '$lib/live/format';
  import StyledText from '../StyledText.svelte';
  let { grave, players, roleList, noLinks = false }: { grave: Grave; players: string[]; roleList: RoleList; noLinks?: boolean } = $props();
  let role = $derived(grave.information.type === 'obscured' ? text('obscured') : roleName(grave.information.role));
  let causes = $derived(grave.information.type === 'normal' ? grave.information.deathCauses.map(cause => {
    if (cause.type === 'role') return roleName(cause.value);
    if (cause.type === 'roleSet') return text(cause.value);
    return text('grave.deathCause.' + cause.type);
  }).join(', ') : '');
</script>

<div class="grave graveyard-menu-colors">
  <div><StyledText value={text(grave.diedPhase === 'day' ? 'day' : 'phase.night') + text(grave.diedPhase + '.icon') + grave.dayNumber} {noLinks} /></div>
  <div><StyledText value={players[grave.player] + ' (' + role + ')'} {players} {noLinks} /></div>
  {#if causes}<div><StyledText value={text('killedBy') + ' ' + causes} {noLinks} /></div>{/if}
  {#if grave.information.type === 'normal'}
    {#if grave.information.alibi}
      {text('alibi')}
      <div class="note-area"><StyledText value={replaceMentions(grave.information.alibi, players, roleList)} {players} {noLinks} /></div>
    {/if}
    {#each grave.information.callingCards as card}
      {text('grave.callingCard')}
      <div class="note-area"><StyledText value={replaceMentions(card, players, roleList)} {players} {noLinks} /></div>
    {/each}
  {/if}
</div>

<style>
  .grave { white-space: normal; background-color: var(--primary-color); margin: .25rem; padding: .25rem; border-radius: 1rem; border: .13rem solid var(--primary-border-color); border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
  .grave .note-area { background-color: var(--secondary-color); margin-bottom: .5rem; text-align: left; }
</style>
