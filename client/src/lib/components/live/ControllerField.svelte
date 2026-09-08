<script lang="ts">
  import DetailsSummary from '../DetailsSummary.svelte';
  import StyledText from '../StyledText.svelte';
  import CheckBox from '../CheckBox.svelte';
  import Select from '../Select.svelte';
  import Icon from '../Icon.svelte';
  import TextDropdown from '../TextDropdown.svelte';
  import { gameSession } from '$lib/game/session';
  import abilityData from '../../../resources/abilityId.json';
  import { controllerIdLink } from '$lib/game/controllers';
  import { optionalText, text } from '$lib/live/format';
  import type {
    Controller,
    ControllerID,
    ControllerSelection,
    KiraGuess
  } from '$lib/game/controllers';
  import type { GraveDeathCause } from '$lib/game/graves';
  import type { RoleList } from '$lib/game/role-list';
  import { ROLE_SETS, rolesForSet, type Role, type RoleSet } from '$lib/game/roles';
  import { controllerName, humanize, playerName, roleName, roleOutlineName, selectionName } from '$lib/live/format';

  interface Props {
    id: ControllerID;
    controller: Controller;
    players: string[];
    alivePlayers?: number[];
    roleList: RoleList;
    messageIndexes?: number[];
    onInput: (selection: ControllerSelection) => void;
    includeDropdown?: boolean;
  }

  let {
    id,
    controller,
    players,
    alivePlayers = [],
    roleList,
    messageIndexes = [],
    onInput,
    includeDropdown = true
  }: Props = $props();

  let disabled = $derived(controller.parameters.grayedOut);
  let translationKey = $derived('controllerId.' + controllerIdLink(id).replaceAll('/', '.'));
  let metadata = $derived((abilityData as Record<string, { instant?: boolean; midnight?: boolean; visit?: string }>)[controllerIdLink(id)]);
  let summary = $derived(selectionName(controller.selection, players, roleList));
  let twoPlayerDraft = $state<[number | null, number | null]>([null, null]);
  let observedTwoPlayerSelection: [number, number] | null | undefined;
  let kiraPlayers = $derived.by(() => {
    if (controller.parameters.available.type !== 'kira') return [];
    const owner = 'player' in id ? id.player : null;
    return alivePlayers.filter((player) => player !== owner);
  });
  const pairPositions = [0, 1] as const;
  const townRoles = rolesForSet('town');

  $effect(() => {
    if (controller.selection.type !== 'twoPlayerOption') {
      observedTwoPlayerSelection = undefined;
      twoPlayerDraft = [null, null];
      return;
    }

    const next = controller.selection.selection;
    const unchanged = observedTwoPlayerSelection !== undefined
      && ((next === null && observedTwoPlayerSelection === null)
        || (next !== null
          && observedTwoPlayerSelection !== null
          && next[0] === observedTwoPlayerSelection[0]
          && next[1] === observedTwoPlayerSelection[1]));
    if (unchanged) return;

    observedTwoPlayerSelection = next === null ? null : [...next];
    twoPlayerDraft = next === null ? [null, null] : [...next];
  });

  function numberValue(event: Event): number {
    return Number((event.currentTarget as HTMLInputElement | HTMLSelectElement).value);
  }

  function integerOptions(min: number, max: number): number[] {
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  }

  function stringValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }




  function updateTwoPlayers(position: 0 | 1, value: number): void {
    if (controller.selection.type !== 'twoPlayerOption') return;
    const available = controller.parameters.available;
    if (available.type !== 'twoPlayerOption') return;

    if (value === -1) {
      twoPlayerDraft = [null, null];
      onInput({ type: 'twoPlayerOption', selection: null });
      return;
    }

    const next: [number | null, number | null] = [...twoPlayerDraft];
    next[position] = value;
    if (!available.selection.canChooseDuplicates && next[0] !== null && next[0] === next[1]) return;

    twoPlayerDraft = next;
    if (next[0] === null || next[1] === null) return;
    onInput({ type: 'twoPlayerOption', selection: [next[0], next[1]] });
  }

  function availablePlayersAt(position: 0 | 1): number[] {
    const available = controller.parameters.available;
    if (available.type !== 'twoPlayerOption') return [];
    const playersAtPosition = position === 0
      ? available.selection.availableFirstPlayers
      : available.selection.availableSecondPlayers;
    if (available.selection.canChooseDuplicates) {
      return playersAtPosition;
    }
    const other = twoPlayerDraft[position === 0 ? 1 : 0];
    if (other === null) return playersAtPosition;
    return playersAtPosition.filter((player) => player !== other);
  }

  function updateTwoRoles(position: 0 | 1, value: string): void {
    if (controller.selection.type !== 'twoRoleOption') return;
    const next: [Role | null, Role | null] = [...controller.selection.selection];
    next[position] = value === '' ? null : value as Role;
    onInput({ type: 'twoRoleOption', selection: next });
  }

  function availableRolesAt(position: 0 | 1): Array<Role | null> {
    const available = controller.parameters.available;
    if (available.type !== 'twoRoleOption') return [];
    if (available.selection.canChooseDuplicates || controller.selection.type !== 'twoRoleOption') {
      return available.selection.availableRoles;
    }
    const other = controller.selection.selection[position === 0 ? 1 : 0];
    return available.selection.availableRoles.filter((role) => role === null || role !== other);
  }

  function updateTwoOutlines(position: 0 | 1, value: number): void {
    if (controller.selection.type !== 'twoRoleOutlineOption') return;
    const next: [number | null, number | null] = [...controller.selection.selection];
    next[position] = value === -1 ? null : value;
    onInput({ type: 'twoRoleOutlineOption', selection: next });
  }

  function availableOutlinesAt(position: 0 | 1): Array<number | null> {
    const available = controller.parameters.available;
    if (available.type !== 'twoRoleOutlineOption' || controller.selection.type !== 'twoRoleOutlineOption') return [];

    const other = controller.selection.selection[position === 0 ? 1 : 0];
    if (other === null) return available.selection;
    return available.selection.filter((outline) => outline === null || outline !== other);
  }

  function updateKira(player: number, guess: KiraGuess): void {
    if (controller.selection.type !== 'kira') return;
    const guesses = new Map(controller.selection.selection);
    guesses.set(player, guess);
    const next: Array<[number, KiraGuess]> = kiraPlayers.map((index) => [index, guesses.get(index) ?? 'none']);
    onInput({ type: 'kira', selection: next });
  }

  function graveCauseValue(cause: GraveDeathCause): string {
    if (cause.type === 'role' || cause.type === 'roleSet') return `${cause.type}:${cause.value}`;
    return cause.type;
  }

  function graveCauseFromValue(value: string): GraveDeathCause | null {
    if (value === '') return null;
    if (value === 'execution' || value === 'ascension' || value === 'suicide' || value === 'quit') {
      return { type: value };
    }
    if (value.startsWith('role:')) return { type: 'role', value: value.slice(5) as Role };
    if (value.startsWith('roleSet:')) return { type: 'roleSet', value: value.slice(8) as RoleSet };
    return null;
  }

  function updateGraveCause(index: number, event: Event): void {
    if (controller.selection.type !== 'graveDeathCauses') return;
    const cause = graveCauseFromValue(stringValue(event));
    let selection = [...controller.selection.selection];
    if (cause === null) {
      selection.splice(index, 1);
    } else if (index === selection.length) {
      selection.push(cause);
    } else {
      selection[index] = cause;
    }
    onInput({ type: 'graveDeathCauses', selection });
  }

  function appendGraveCause(event: Event): void {
    if (controller.selection.type !== 'graveDeathCauses') return;
    updateGraveCause(controller.selection.selection.length, event);
  }
</script>

{#snippet controls()}
<fieldset class="controller" {disabled}>

  {#if controller.selection.type === 'unit'}
    <button class="primary" onclick={() => onInput(controller.selection)}>Use ability</button>
  {:else if controller.selection.type === 'boolean'}
    {@const trueLabel = optionalText(translationKey + '.boolean.true')}
    {@const falseLabel = optionalText(translationKey + '.boolean.false')}
    {#if trueLabel && falseLabel}
      <Select label={controllerName(id)} value={Number(controller.selection.selection)} options={[{value: 1, label: trueLabel}, {value: 0, label: falseLabel}]} onchange={value => onInput({type: 'boolean', selection: Boolean(value)})} />
    {:else}<CheckBox label={controllerName(id)} checked={controller.selection.selection} onchange={selection => onInput({type: 'boolean', selection})} />{/if}
  {:else if controller.selection.type === 'integer' && controller.parameters.available.type === 'integer'}
    <Select label={controllerName(id)} value={controller.selection.selection} options={integerOptions(controller.parameters.available.selection.min, controller.parameters.available.selection.max).map(value => ({value, label: optionalText(translationKey + '.integer.' + value) ?? String(value)}))} onchange={selection => onInput({type: 'integer', selection})} />
  {:else if controller.selection.type === 'string'}
    <TextDropdown title={controllerName(id)} value={controller.selection.selection} defaultOpen onsave={selection => onInput({type: 'string', selection})} onpost={value => gameSession.sendChatMessage(value, true, 'player' in id ? id.player : undefined)} />
  {:else if controller.selection.type === 'playerList' && controller.parameters.available.type === 'playerList'}
    {@const selected = controller.selection.selection}
    {@const available = controller.parameters.available.selection}
    {@const remaining = available.availablePlayers.filter(player => available.canChooseDuplicates || !selected.includes(player))}
    <div class="choice-grid">
      {#each selected as player, index}
        <Select label={controllerName(id)} value={player} options={[{value: -1, label: text('none')}, ...available.availablePlayers.filter(option => available.canChooseDuplicates || !selected.includes(option) || option === player).map(value => ({value, label: playerName(players, value)}))]} onchange={value => { const selection = [...selected]; if (value === -1) selection.splice(index, 1); else selection[index] = value; onInput({type: 'playerList', selection}); }} />
      {/each}
      {#if selected.length < (available.maxPlayers ?? Infinity) && remaining.length > 0}
        <Select label={controllerName(id)} value={-1} options={[{value: -1, label: text('none')}, ...remaining.map(value => ({value, label: playerName(players, value)}))]} onchange={value => { if (value !== -1) onInput({type: 'playerList', selection: [...selected, value]}); }} />
      {/if}
      <div>
        {#if (available.maxPlayers ?? Infinity) >= available.availablePlayers.length && remaining.length > 0}<button class="button flush" aria-label="Select all" onclick={() => onInput({type: 'playerList', selection: available.availablePlayers})}><Icon>select_all</Icon></button>{/if}
        {#if (available.maxPlayers ?? Infinity) > 1 && available.availablePlayers.length > 1 && selected.length > 0}<button class="button flush" aria-label="Deselect all" onclick={() => onInput({type: 'playerList', selection: []})}><Icon>deselect</Icon></button>{/if}
      </div>
    </div>
  {:else if controller.selection.type === 'twoPlayerOption' && controller.parameters.available.type === 'twoPlayerOption'}
    <div class="paired-inputs">
      {#each pairPositions as position}
        <Select label={position === 0 ? 'First player' : 'Second player'} value={twoPlayerDraft[position] ?? -1} options={[...(controller.parameters.available.selection.canChooseNone ? [{value: -1, label: text('none')}] : []), ...availablePlayersAt(position).map(value => ({value, label: playerName(players, value)}))]} onchange={value => updateTwoPlayers(position, value)} />
      {/each}
    </div>
  {:else if controller.selection.type === 'roleList' && controller.parameters.available.type === 'roleList'}
    {@const selected = controller.selection.selection}
    {@const available = controller.parameters.available.selection}
    {@const remaining = available.availableRoles.filter(role => available.canChooseDuplicates || !selected.includes(role))}
    <div class="choice-grid">
      {#each selected as role, index}
        <Select label={controllerName(id)} value={role} options={[{value: '', label: text('none')}, ...available.availableRoles.filter(option => available.canChooseDuplicates || !selected.includes(option) || option === role).map(value => ({value, label: roleName(value)}))]} onchange={value => { const selection = [...selected]; if (value === '') selection.splice(index, 1); else selection[index] = value as Role; onInput({type: 'roleList', selection}); }} />
      {/each}
      {#if selected.length < (available.maxRoles ?? Infinity)}
        <Select label={controllerName(id)} value="" options={[{value: '', label: text('none')}, ...remaining.map(value => ({value, label: roleName(value)}))]} onchange={value => { if (value !== '') onInput({type: 'roleList', selection: [...selected, value as Role]}); }} />
      {/if}
      <div>
        {#if (available.maxRoles ?? Infinity) >= available.availableRoles.length && remaining.length > 0}<button class="button flush" aria-label="Select all" onclick={() => onInput({type: 'roleList', selection: available.availableRoles})}><Icon>select_all</Icon></button>{/if}
        {#if (available.maxRoles ?? Infinity) > 1 && available.availableRoles.length > 1 && selected.length > 0}<button class="button flush" aria-label="Deselect all" onclick={() => onInput({type: 'roleList', selection: []})}><Icon>deselect</Icon></button>{/if}
      </div>
    </div>
  {:else if controller.selection.type === 'twoRoleOption' && controller.parameters.available.type === 'twoRoleOption'}
    <div class="paired-inputs">
      {#each pairPositions as position}
        <Select label={position === 0 ? 'First role' : 'Second role'} value={controller.selection.selection[position] ?? ''} options={availableRolesAt(position).map(value => ({value: value ?? '', label: value === null ? text('none') : roleName(value)}))} onchange={value => updateTwoRoles(position, value)} />
      {/each}
    </div>
  {:else if controller.selection.type === 'twoRoleOutlineOption' && controller.parameters.available.type === 'twoRoleOutlineOption'}
    <div class="paired-inputs">
      {#each pairPositions as position}
        <Select label={position === 0 ? 'First role-list entry' : 'Second role-list entry'} value={controller.selection.selection[position] ?? -1} options={availableOutlinesAt(position).map(value => ({value: value ?? -1, label: value === null ? text('none') : (value + 1) + ': ' + roleOutlineName(roleList[value] ?? [], players)}))} onchange={value => updateTwoOutlines(position, value)} />
      {/each}
    </div>
  {:else if controller.selection.type === 'kira'}
    <div class="large-kira-menu">
      {#each kiraPlayers as index (index)}
        <div class="kira-guess-picker">
          <StyledText value={players[index]} {players} />
          <Select label={'Guess for ' + players[index]} value={controller.selection.selection.find(([player]) => player === index)?.[1] ?? 'none'} options={[{value: 'none', label: text('none')}, {value: 'nonTown', label: text('nonTown')}, ...townRoles.map(value => ({value, label: roleName(value)}))]} onchange={value => updateKira(index, value as KiraGuess)} />
        </div>
      {/each}
    </div>
  {:else if controller.selection.type === 'graveDeathCauses'}
    <div class="grave-causes">
      {#each controller.selection.selection as cause, index (index)}
        <label>
          <span>Cause {index + 1}</span>
          <select value={graveCauseValue(cause)} onchange={(event) => updateGraveCause(index, event)}>
            <option value="">Remove cause</option>
            {#each ['execution', 'ascension', 'suicide', 'quit'] as type}
              <option value={type}>{humanize(type)}</option>
            {/each}
            <optgroup label="Roles">
              {#each rolesForSet('any') as role (role)}
                <option value={`role:${role}`}>{roleName(role)}</option>
              {/each}
            </optgroup>
            <optgroup label="Role sets">
              {#each ROLE_SETS as roleSet (roleSet)}
                <option value={`roleSet:${roleSet}`}>{humanize(roleSet)} role</option>
              {/each}
            </optgroup>
          </select>
        </label>
      {/each}
      <label>
        <span>Add a cause</span>
        <select value="" onchange={appendGraveCause}>
          <option value="">Choose a cause</option>
          {#each ['execution', 'ascension', 'suicide', 'quit'] as type}
            <option value={type}>{humanize(type)}</option>
          {/each}
          <optgroup label="Roles">
            {#each rolesForSet('any') as role (role)}
              <option value={`role:${role}`}>{roleName(role)}</option>
            {/each}
          </optgroup>
          <optgroup label="Role sets">
            {#each ROLE_SETS as roleSet (roleSet)}
              <option value={`roleSet:${roleSet}`}>{humanize(roleSet)} role</option>
            {/each}
          </optgroup>
        </select>
      </label>
      {#if controller.selection.selection.length > 0}
        <button type="button" class="ghost" onclick={() => onInput({ type: 'graveDeathCauses', selection: [] })}>Clear causes</button>
      {/if}
    </div>
  {:else if controller.selection.type === 'chatMessage'}
    <label>
      <span class="sr-only">Message</span>
      <select
        value={controller.selection.selection ?? ''}
        onchange={(event) => onInput({ type: 'chatMessage', selection: stringValue(event) === '' ? null : numberValue(event) })}
      >
        <option value="">Choose a message</option>
        {#each messageIndexes as index (index)}<option value={index}>Message {index}</option>{/each}
      </select>
    </label>
  {:else}
    <p class="empty">Current selection: {summary || 'None'}</p>
  {/if}

</fieldset>
{/snippet}

{#snippet title()}
  <div class="generic-ability-menu-tab-summary">
    <span><StyledText value={includeDropdown ? controllerName(id) : optionalText(translationKey + '.name') ?? controllerName(id)} /></span>
    <span>
      {#if metadata?.instant}<span title={text('wiki.article.standard.controller.tooltip.instant')}>{text('instant.icon')}</span>{/if}
      {#if metadata?.midnight}<span title={text('wiki.article.standard.controller.tooltip.night')}>{text('night.icon')}</span>{/if}
      {#if metadata?.visit}<span title={text('wiki.article.standard.controller.tooltip.visit.' + metadata.visit)}>{text('visit.icon.' + metadata.visit)}</span>{/if}
    </span>
  </div>
{/snippet}

{#if includeDropdown}
  <DetailsSummary summary={title} open={true}>{@render controls()}</DetailsSummary>
{:else}
  <div class="generic-ability-menu-tab-no-summary">{@render title()}{@render controls()}</div>
{/if}

<style>
  .controller { min-width: 0; margin: 0; border: 0; padding: 0; }
  .generic-ability-menu-tab-summary { display: flex; flex-direction: row; justify-content: space-between; width: 100%; }
  .generic-ability-menu-tab-summary > span { display: inline-flex; align-items: center; justify-content: center; gap: .13rem; flex-wrap: wrap; }
  .generic-ability-menu-tab-no-summary { display: flex; flex-direction: column; border-bottom: .13rem dotted var(--primary-border-color); }
  .generic-ability-menu-tab-no-summary:last-child { border-bottom: none; }
  .generic-ability-menu-tab-no-summary > .generic-ability-menu-tab-summary { padding: 0 .13rem; }
  .choice-grid { display: flex; flex-wrap: wrap; align-items: center; }
  .paired-inputs { display: flex; flex-wrap: wrap; }
  .grave-causes { display: flex; flex-direction: column; }
  .kira-guess-picker { display: flex; flex-direction: row; width: 100%; justify-content: space-between; align-items: center; border-bottom: .13rem solid var(--primary-border-color); }
</style>
