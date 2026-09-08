<script lang="ts">
  import ControllerField from './ControllerField.svelte';
  import RoleInformation from './RoleInformation.svelte';
  import DetailsSummary from '../DetailsSummary.svelte';
  import StyledText from '../StyledText.svelte';
  import abilityData from '../../../resources/abilityId.json';
  import type { Controller, ControllerID, ControllerSelection } from '$lib/game/controllers';
  import { controllerIdKey, controllerIdLink } from '$lib/game/controllers';
  import type { ConsortOptions } from '$lib/game/session';
  import type { GameState } from '$lib/game/state';
  import { controllerName, roleName, text } from '$lib/live/format';

  let { state, onInput, onHypnotistOptions }: {
    state: GameState;
    onInput: (id: ControllerID, selection: ControllerSelection) => void;
    onHypnotistOptions: (options: ConsortOptions) => void;
  } = $props();

  let client = $derived(state.client.type === 'player' ? state.client : null);
  let names = $derived(state.players.map(player => player.name));
  let alivePlayers = $derived(state.players.filter(player => player.alive).map(player => player.index));
  const metadata: Record<string, { visible?: boolean; midnight?: boolean; instant?: boolean; visit?: string }> = abilityData;

  let groups = $derived.by(() => {
    const result = new Map<string, { name: string; controllers: [ControllerID, Controller][] }>();
    for (const [id, controller] of client?.controllers ?? []) {
      if (controller.parameters.grayedOut || metadata[controllerIdLink(id)]?.visible === false) continue;
      let key: string = id.type;
      let name = controllerName(id);
      if (id.type === 'role') {
        key = `role/${id.player}/${id.role}`;
        name = roleName(id.role);
      } else if (id.type.startsWith('syndicate')) {
        key = 'syndicate';
        name = text('mafia');
      } else if (['nominate', 'pitchforkVote', 'callWitness'].includes(id.type)) {
        key = 'vote';
        name = text('vote');
      }
      const group = result.get(key) ?? { name, controllers: [] };
      group.controllers.push([id, controller]);
      result.set(key, group);
    }
    return [...result.entries()];
  });
</script>

<div class="ability-menu role-specific-colors">
  {#if client}
    {#each client.abilityStates as [id, ability] (JSON.stringify(id))}
      <RoleInformation {ability} game={state} {onHypnotistOptions} />
    {/each}
    {#each groups as [key, group] (key)}
      {#if group.controllers.length > 1}
        <DetailsSummary open={true}>
          {#snippet summary()}<StyledText value={group.name} />{/snippet}
          {#each group.controllers as [id, controller] (controllerIdKey(id))}
            <ControllerField {id} {controller} players={names} {alivePlayers} roleList={state.roleList} messageIndexes={state.chatMessages.map(([index]) => index)} includeDropdown={false} onInput={selection => onInput(id, selection)} />
          {/each}
        </DetailsSummary>
      {:else}
        {@const [id, controller] = group.controllers[0]}
        <ControllerField {id} {controller} players={names} {alivePlayers} roleList={state.roleList} messageIndexes={state.chatMessages.map(([index]) => index)} onInput={selection => onInput(id, selection)} />
      {/if}
    {/each}
  {/if}
</div>

<style>
  .ability-menu { height: 100%; overflow-y: auto; }
</style>
