<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Icon from './Icon.svelte';
  import Select from './Select.svelte';
  import StyledText from './StyledText.svelte';
  import PhaseTimeline from './PhaseTimeline.svelte';
  import FlushInput from './FlushInput.svelte';
  import Popover from './Popover.svelte';
  import { text } from '$lib/live/format';
  import { roleData } from '$lib/game/roles';
  import './gameModesEditor.css';
  import './gameModeSelector.css';
  import './selectorSection.css';
  import './disabledRoleSelector.css';
  import './outlineSelector.css';
  import dummyNames from '../../resources/dummyNames.json';
  import {
    LATEST_GAME_MODE_FORMAT,
    CONCLUSIONS,
    INSIDER_GROUPS,
    MODIFIERS,
    PHASES,
    ROLE_SETS,
    cloneValue,
    createBlankGameMode,
    defaultGameModes,
    defaultModifierState,
    isRoleId,
    loadGameModes,
    modifierNames,
    parseGameModeStorage,
    parseImportedText,
    parseShareableGameMode,
    phaseNames,
    resetGameModes,
    roleIds,
    roleNames,
    roleSetNames,
    roles,
    saveGameModes,
    type GameModeData,
    type GameModeStorage,
    type ModifierId,
    type RoleId,
    type RoleOption,
    type ShareableGameMode
  } from '$lib/game-modes';

  type Props = {
    initialGameMode?: ShareableGameMode<RoleId>;
    initialError?: string;
  };

  type GameModeLocation = { name: string; players: number };
  type StatusKind = 'neutral' | 'success' | 'error';
  type OutlineConstraint = 'winIfAny' | 'insiderGroups' | 'playerPool';

  const conclusionNames: Record<(typeof CONCLUSIONS)[number], string> = {
    town: 'Town',
    mafia: 'Mafia',
    cult: 'Cult',
    fiends: 'Fiends',
    politician: 'Politician',
    niceList: 'Nice list',
    naughtyList: 'Naughty list',
    draw: 'Draw'
  };
  const insiderGroupNames: Record<(typeof INSIDER_GROUPS)[number], string> = {
    mafia: 'Mafia',
    cult: 'Cult',
    puppeteer: 'Puppeteer'
  };

  let { initialGameMode, initialError = '' }: Props = $props();

  const importedMode = untrack(() => initialGameMode);
  const importedError = untrack(() => initialError);

  const builtInLibrary = defaultGameModes();
  const builtInLocation = preferredLocation(builtInLibrary);
  const builtInData = builtInLocation
    ? builtInLibrary.gameModes.find((mode) => mode.name === builtInLocation.name)?.data[
        builtInLocation.players
      ]
    : undefined;
  const firstData = importedMode
    ? dataFromShareable(importedMode)
    : (builtInData ?? createBlankGameMode());

  let library = $state<GameModeStorage<RoleId>>(builtInLibrary);
  let current = $state<GameModeData<RoleId>>(cloneValue(firstData));
  let modeName = $state(importedMode?.name ?? builtInLocation?.name ?? '');
  let selectedKey = $state(importedMode ? '' : locationKey(builtInLocation));
  let selectedSnapshot = $state(importedMode ? null : JSON.stringify(firstData));
  let storageError = $state('');
  let status = $state(importedError);
  let statusKind = $state<StatusKind>(importedError ? 'error' : 'neutral');
  let roleSearch = $state('');
  let importText = $state('');
  let customLimitRole = $state<RoleId>(roleIds[0]);
  let customLimitValue = $state(1);

  let locations = $derived.by(() => {
    const result: GameModeLocation[] = [];
    for (const mode of library.gameModes) {
      const counts = Object.keys(mode.data)
        .map((players) => Number.parseInt(players, 10))
        .sort((left, right) => left - right);
      for (const players of counts) result.push({ name: mode.name, players });
    }
    return result;
  });
  let filteredRoles = $derived.by(() => {
    const query = roleSearch.trim().toLocaleLowerCase();
    if (!query) return roles;
    return roles.filter(
      (role) =>
        role.name.toLocaleLowerCase().includes(query) ||
        role.id.toLocaleLowerCase().includes(query) ||
        roleSetNames[role.mainRoleSet].toLocaleLowerCase().includes(query)
    );
  });
  let shareableMode = $derived.by(
    () =>
      ({
        format: LATEST_GAME_MODE_FORMAT,
        name: modeName.trim() || 'Unnamed Game Mode',
        ...cloneValue(current)
      }) satisfies ShareableGameMode<RoleId>
  );
  let serializedMode = $derived(JSON.stringify(shareableMode, null, 2));
  let dirty = $derived(selectedSnapshot !== null && selectedSnapshot !== JSON.stringify(current));
  let enabledRoleCount = $derived(current.enabledRoles.length);
  let customLimits = $derived.by(
    () => current.modifierSettings.find(([id]) => id === 'customRoleLimits')?.[1].limits ?? []
  );

  onMount(() => {
    const saved = loadGameModes(localStorage);
    if (saved.ok) {
      library = saved.value;
      if (!importedMode) {
        const location = preferredLocation(library);
        if (location) loadLocation(location);
      }
    } else {
      storageError = `${saved.reason}. ${saved.snippet}`;
    }
  });

  function preferredLocation(source: GameModeStorage<RoleId>): GameModeLocation | null {
    const experimental = source.gameModes.find((mode) => mode.name === 'Experimental');
    if (experimental) {
      if (experimental.data[15]) return { name: experimental.name, players: 15 };
      if (experimental.data[14]) return { name: experimental.name, players: 14 };
      const players = Number.parseInt(Object.keys(experimental.data)[0] ?? '', 10);
      if (Number.isInteger(players)) return { name: experimental.name, players };
    }

    const first = source.gameModes[0];
    if (!first) return null;
    const players = Number.parseInt(Object.keys(first.data)[0] ?? '', 10);
    return Number.isInteger(players) ? { name: first.name, players } : null;
  }

  function dataFromShareable(mode: ShareableGameMode<RoleId>): GameModeData<RoleId> {
    return {
      roleList: cloneValue(mode.roleList),
      phaseTimes: cloneValue(mode.phaseTimes),
      enabledRoles: [...mode.enabledRoles],
      modifierSettings: cloneValue(mode.modifierSettings),
      ...(mode.randomSeed === undefined ? {} : { randomSeed: mode.randomSeed })
    };
  }

  function locationKey(location: GameModeLocation | null): string {
    return location ? `${location.name}:${location.players}` : '';
  }

  function locationFromKey(key: string): GameModeLocation | null {
    return locations.find((location) => locationKey(location) === key) ?? null;
  }

  function loadLocation(location: GameModeLocation): void {
    const data = library.gameModes.find((mode) => mode.name === location.name)?.data[location.players];
    if (!data) return;
    current = cloneValue(data);
    modeName = location.name;
    selectedKey = locationKey(location);
    selectedSnapshot = JSON.stringify(current);
    report(`Loaded ${location.name} for ${location.players} players.`, 'neutral');
  }


  function newMode(): void {
    current = createBlankGameMode();
    modeName = '';
    selectedKey = '';
    selectedSnapshot = null;
    report('Started a new game mode.', 'neutral');
  }

  function saveCurrent(): boolean {
    const name = modeName.trim();
    if (!name || name.length >= 100) {
      report('Use a game mode name between 1 and 99 characters.', 'error');
      return false;
    }
    if (current.roleList.length === 0) {
      report('Add at least one role-list slot before saving.', 'error');
      return false;
    }

    const next = cloneValue(library);
    let mode = next.gameModes.find((candidate) => candidate.name === name);
    if (!mode) {
      mode = { name, data: {} };
      next.gameModes.push(mode);
    } else if (mode.data[current.roleList.length]) {
      const sameSelection = selectedKey === locationKey({ name, players: current.roleList.length });
      if (!sameSelection && !window.confirm(`Overwrite ${name} for ${current.roleList.length} players?`)) {
        report('Save cancelled.', 'neutral');
        return false;
      }
    }

    mode.data[current.roleList.length] = cloneValue(current);
    next.format = LATEST_GAME_MODE_FORMAT;
    library = next;
    saveGameModes(localStorage, library);
    modeName = name;
    selectedKey = locationKey({ name, players: current.roleList.length });
    selectedSnapshot = JSON.stringify(current);
    storageError = '';
    report(`Saved ${name} for ${current.roleList.length} players.`, 'success');
    return true;
  }

  function deleteSelected(): void {
    const location = locationFromKey(selectedKey);
    if (!location) return;
    if (!window.confirm(`Delete ${location.name} for ${location.players} players?`)) return;

    const next = cloneValue(library);
    const index = next.gameModes.findIndex((mode) => mode.name === location.name);
    if (index < 0) return;
    delete next.gameModes[index].data[location.players];
    if (Object.keys(next.gameModes[index].data).length === 0) next.gameModes.splice(index, 1);
    library = next;
    saveGameModes(localStorage, library);

    const fallback = preferredLocation(library);
    if (fallback) loadLocation(fallback);
    else newMode();
    report(`Deleted ${location.name} for ${location.players} players.`, 'success');
  }


  function handleKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key.toLocaleLowerCase() === 's') {
      event.preventDefault();
      saveCurrent();
    }
  }

  function updatePhase(phase: (typeof PHASES)[number], text: string): void {
    const value = Number(text);
    if (!Number.isFinite(value)) return;
    current = {
      ...current,
      phaseTimes: { ...current.phaseTimes, [phase]: Math.min(1_000, Math.max(0, Math.round(value))) }
    };
  }


  function toggleRole(role: RoleId, enabled: boolean): void {
    const enabledRoles = current.enabledRoles.filter((candidate) => candidate !== role);
    if (enabled) enabledRoles.push(role);
    current = { ...current, enabledRoles };
  }



  function toggleModifier(id: ModifierId, enabled: boolean): void {
    const settings = current.modifierSettings.filter(([candidate]) => candidate !== id);
    if (enabled) settings.push([id, defaultModifierState<RoleId>(id)]);
    current = { ...current, modifierSettings: settings };
  }

  function setRoleLimit(): void {
    const limit = Math.min(255, Math.max(0, Math.trunc(customLimitValue)));
    const limits = customLimits.filter(([role]) => role !== customLimitRole);
    limits.push([customLimitRole, limit]);
    replaceCustomLimits(limits);
    report(`Set ${roleNames[customLimitRole]} to a maximum of ${limit}.`, 'success');
  }

  function removeRoleLimit(role: RoleId): void {
    replaceCustomLimits(customLimits.filter(([candidate]) => candidate !== role));
  }

  function replaceCustomLimits(limits: [RoleId, number][]): void {
    current = {
      ...current,
      modifierSettings: current.modifierSettings.map(([id, state]) => {
        if (id === 'customRoleLimits') return [id, { ...state, limits }];
        return [id, state];
      })
    };
  }

  function optionChoice(option: RoleOption<RoleId>): string {
    return 'role' in option && option.role ? `role:${option.role}` : `set:${option.roleSet}`;
  }

  function changeOption(slotIndex: number, optionIndex: number, choice: string): void {
    const [kind, id] = choice.split(':', 2);
    const roleList = cloneValue(current.roleList);
    const old = roleList[slotIndex][optionIndex] as RoleOption<RoleId> & Record<string, unknown>;
    const preserved = { ...old };
    delete preserved.role;
    delete preserved.roleSet;

    let replacement: RoleOption<RoleId>;
    if (kind === 'role' && isRoleId(id)) {
      replacement = { ...preserved, role: id } as RoleOption<RoleId>;
      if (!current.enabledRoles.includes(id)) {
        current = { ...current, enabledRoles: [...current.enabledRoles, id] };
      }
    } else if (kind === 'set' && (ROLE_SETS as readonly string[]).includes(id)) {
      replacement = { ...preserved, roleSet: id } as RoleOption<RoleId>;
    } else {
      return;
    }
    roleList[slotIndex][optionIndex] = replacement;
    current = { ...current, roleList };
  }

  function updateOption(
    slotIndex: number,
    optionIndex: number,
    update: (option: RoleOption<RoleId> & Record<string, unknown>) => void
  ): void {
    const roleList = cloneValue(current.roleList);
    const option = roleList[slotIndex][optionIndex] as RoleOption<RoleId> & Record<string, unknown>;
    update(option);
    current = { ...current, roleList };
  }

  function customizeConstraint(
    slotIndex: number,
    optionIndex: number,
    constraint: OutlineConstraint
  ): void {
    updateOption(slotIndex, optionIndex, (option) => {
      option[constraint] = [];
    });
  }

  function useDefaultConstraint(
    slotIndex: number,
    optionIndex: number,
    constraint: OutlineConstraint
  ): void {
    updateOption(slotIndex, optionIndex, (option) => {
      delete option[constraint];
    });
  }

  function toggleConstraintValue(
    slotIndex: number,
    optionIndex: number,
    constraint: OutlineConstraint,
    value: string | number,
    enabled: boolean
  ): void {
    updateOption(slotIndex, optionIndex, (option) => {
      const fields: Record<string, unknown> = option;
      const saved = fields[constraint];
      const values = Array.isArray(saved) ? [...saved] : [];
      const next = values.filter((candidate) => candidate !== value);
      if (enabled) next.push(value);
      fields[constraint] = next;
    });
  }


  function addSlot(): void {
    current = { ...current, roleList: [...current.roleList, [{ roleSet: 'any' }]] };
  }

  function removeSlot(index: number): void {
    current = {
      ...current,
      roleList: current.roleList.filter((_, slotIndex) => slotIndex !== index)
    };
  }


  function addAlternative(slotIndex: number): void {
    const roleList = cloneValue(current.roleList);
    roleList[slotIndex].push({ roleSet: 'any' });
    current = { ...current, roleList };
  }

  function removeAlternative(slotIndex: number, optionIndex: number): void {
    const roleList = cloneValue(current.roleList);
    roleList[slotIndex].splice(optionIndex, 1);
    if (roleList[slotIndex].length === 0) roleList[slotIndex] = [{ roleSet: 'any' }];
    current = { ...current, roleList };
  }

  function simplify(): void {
    function optionRoles(option: RoleOption<RoleId>): RoleId[] {
      if (option.role !== undefined) return [option.role];
      if (option.roleSet === 'any') return roleIds;
      return roleIds.filter(role => roleData[role].roleSets.includes(option.roleSet));
    }
    const roleList = current.roleList.map(outline => {
      const unique = outline.filter((option, index) => outline.findIndex(other => JSON.stringify(other) === JSON.stringify(option)) === index);
      return unique.filter(option => !unique.some(other => other !== option && optionRoles(option).every(role => optionRoles(other).includes(role))))
        .sort((a, b) => optionRoles(b).length - optionRoles(a).length);
    });
    current = { ...current, roleList };
  }

  async function copyText(text: string, description: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      report(`${description} copied to the clipboard.`, 'success');
    } catch {
      report('Clipboard access was denied. You can copy the JSON from the import box instead.', 'error');
      importText = text;
    }
  }

  function copyShareLink(): void {
    const url = new URL('/gameMode', window.location.origin);
    url.searchParams.set('mode', JSON.stringify(shareableMode));
    void copyText(url.toString(), 'Share link');
  }



  function importValue(): void {
    const decoded = parseImportedText(importText);
    if (!decoded.ok) {
      report(`${decoded.reason}.`, 'error');
      return;
    }

    const shared = parseShareableGameMode(decoded.value);
    if (shared.ok) {
      current = dataFromShareable(shared.value);
      modeName = shared.value.name;
      selectedKey = '';
      selectedSnapshot = null;
      report(`Imported ${shared.value.name}. Save it to add it to your library.`, 'success');
      return;
    }

    const importedLibrary = parseGameModeStorage(decoded.value);
    if (importedLibrary.ok) {
      if (!window.confirm('Replace every saved game mode with this imported library?')) return;
      library = importedLibrary.value;
      saveGameModes(localStorage, library);
      const location = preferredLocation(library);
      if (location) loadLocation(location);
      else newMode();
      report('Imported the game mode library.', 'success');
      return;
    }

    report(`${shared.reason}. ${shared.snippet}`, 'error');
  }


  function report(message: string, kind: StatusKind): void {
    status = message;
    statusKind = kind;
  }

  let hideDisabledRoles = $state(false);
  let hideDisabledModifiers = $state(false);
  let draggingOutline = $state<number | null>(null);
  const roleOptions = [
    ...ROLE_SETS.map(set => ({ value: 'set:' + set, label: text(set) })),
    ...roles.map(role => ({ value: 'role:' + role.id, label: role.name }))
  ];
  let modeOptions = $derived([
    ...(!selectedKey ? [{ value: '', label: 'Custom' }] : []),
    ...locations.map(location => ({ value: locationKey(location), label: location.name + ': ' + location.players + (dirty && selectedKey === locationKey(location) ? '*' : '') }))
  ]);
  function chooseMode(value: string): void {
    const location = locationFromKey(value);
    if (location) loadLocation(location);
  }
  function toggleRoleOption(value: string): void {
    const selected = value.startsWith('role:') ? roles.filter(role => role.id === value.slice(5)) : roles.filter(role => role.roleSets.includes(value.slice(4) as typeof ROLE_SETS[number]) || value === 'set:any');
    const enabled = selected.some(role => current.enabledRoles.includes(role.id));
    const ids = new Set(selected.map(role => role.id));
    current = { ...current, enabledRoles: enabled ? current.enabledRoles.filter(role => !ids.has(role)) : [...new Set([...current.enabledRoles, ...ids])] };
  }
  function dropOutline(index: number): void {
    if (draggingOutline === null) return;
    const list = [...current.roleList];
    const [outline] = list.splice(draggingOutline, 1);
    list.splice(index, 0, outline);
    draggingOutline = null;
    current = { ...current, roleList: list };
  }
  async function pasteMode(): Promise<void> {
    try { importText = await navigator.clipboard.readText(); importValue(); }
    catch { report('Clipboard access was denied.', 'error'); }
  }
</script>

<svelte:window onkeydown={handleKeydown} />
<div class="game-modes-editor">
  <header>
    <section class="chat-menu-colors selector-section">
      <div class="save-menu">
        <Select value={selectedKey} options={modeOptions} onchange={chooseMode} label="Game mode" class="brand" />
        <FlushInput bind:value={modeName} label="Game mode name" />
        <div class="vertical-line-separator"></div>
        <div>
          <button class="button flush" aria-label="Save" onclick={saveCurrent}><Icon>save</Icon></button>
          {#if selectedKey}<button class="button flush" aria-label="Refresh" onclick={() => chooseMode(selectedKey)}><Icon>refresh</Icon></button>{/if}
          <button class="button flush" aria-label="Copy game mode" onclick={() => copyText(serializedMode, 'Game mode')}><Icon>content_copy</Icon></button>
          <button class="button flush" aria-label="Paste game mode" onclick={pasteMode}><Icon>content_paste_go</Icon></button>
          <button class="button flush" aria-label="Share game mode" onclick={copyShareLink}><Icon>share</Icon></button>
          {#if selectedKey}<button class="button flush" aria-label="Delete game mode" onclick={deleteSelected}><Icon>delete</Icon></button>{/if}
        </div>
      </div>
      {#if storageError}<p role="alert">{storageError}</p>{/if}
      {#if statusKind === 'error' && status}<p role="alert">{status}</p>{/if}
    </section>
    <PhaseTimeline times={current.phaseTimes} noTrial={current.modifierSettings.some(([id]) => id === 'noTrialPhases')} onchange={(phase, seconds) => updatePhase(phase, String(seconds))} />
  </header>
  <main>
    <div>
      <section class="role-specific-colors selector-section">
        <div class="selector-section-header">
          {text('menu.lobby.enabledRoles')}
          <Select value="toggle" options={[{value: 'toggle', label: text('menu.enabledRoles.toggle')}, ...roleOptions]} onchange={toggleRoleOption} noCloseOnKeyboardSelect />
          <button class="button flush" aria-label="Hide disabled roles" onclick={() => hideDisabledRoles = !hideDisabledRoles}><Icon>{hideDisabledRoles ? 'visibility' : 'visibility_off'}</Icon></button>
        </div>
        <div><div class="enabled-roles-button-panel">
          {#each [...roles].sort((a, b) => ROLE_SETS.indexOf(a.mainRoleSet) - ROLE_SETS.indexOf(b.mainRoleSet)).filter(role => !hideDisabledRoles || current.enabledRoles.includes(role.id)) as role (role.id)}
            <button class="button" onclick={() => toggleRole(role.id, !current.enabledRoles.includes(role.id))}><span class:keyword-disabled={!current.enabledRoles.includes(role.id)}><StyledText value={role.name} noLinks /></span></button>
          {/each}
        </div></div>
      </section>
      <section class="graveyard-menu-colors selector-section">
        <div class="selector-section-header">{text('modifiers')}<button class="button flush" aria-label="Hide disabled modifiers" onclick={() => hideDisabledModifiers = !hideDisabledModifiers}><Icon>{hideDisabledModifiers ? 'visibility' : 'visibility_off'}</Icon></button></div>
        <div class="enabled-roles-button-panel">
          {#each MODIFIERS.filter(modifier => !hideDisabledModifiers || current.modifierSettings.some(([id]) => id === modifier)) as modifier}
            <button class="button" onclick={() => toggleModifier(modifier, !current.modifierSettings.some(([id]) => id === modifier))}><span class:keyword-disabled={!current.modifierSettings.some(([id]) => id === modifier)}><StyledText value={text(modifier)} noLinks /></span></button>
          {/each}
        </div>
        {#if current.modifierSettings.some(([id]) => id === 'customRoleLimits')}
          <Popover>
            {#snippet trigger(toggle)}<button class="button" onclick={toggle}>{text('customRoleLimits')}</button>{/snippet}
            <div class="custom-role-limit-selection">
              <Select value={customLimitRole} options={roles.map(role => ({value: role.id, label: role.name}))} onchange={value => customLimitRole = value} />
              <input type="number" min="0" max="255" bind:value={customLimitValue} aria-label="Maximum" />
              <button class="button" onclick={setRoleLimit}><Icon>add</Icon></button>
            </div>
            {#each customLimits as [role, limit]}
              <div><StyledText value={roleNames[role]} />: {limit}<button class="button" aria-label="Remove limit" onclick={() => removeRoleLimit(role)}><Icon>delete</Icon></button></div>
            {/each}
          </Popover>
        {/if}
      </section>
    </div>
    <div>
      <section class="graveyard-menu-colors selector-section">
        <div class="selector-section-header">
          {text('menu.lobby.roleList')}: {current.roleList.length}
          <button class="button" onclick={simplify}><Icon>filter_list</Icon> {text('simplify')}</button>
        </div>
        <div class="role-list-setter-list">
          {#each current.roleList as outline, slotIndex}
            <div class="draggable" role="group" aria-label={'Outline ' + (slotIndex + 1)} draggable="true" ondragstart={() => draggingOutline = slotIndex} ondragover={event => event.preventDefault()} ondrop={event => {event.preventDefault(); dropOutline(slotIndex);}} ondragend={() => draggingOutline = null}>
              <div class="role-list-setter-outline-div">
                <Icon>drag_indicator</Icon>
                <div class="role-picker">
                  {#each outline as option, optionIndex}
                    <div class="role-picker-option">
                      {#each ['playerPool', 'insiderGroups', 'winIfAny'] as key}
                        {@const constraint = key as OutlineConstraint}
                        <Popover>
                          {#snippet trigger(toggle)}
                            <button class="button" aria-label={key} onclick={toggle}>
                              {#if option[constraint] === undefined}<Icon>{key === 'playerPool' ? 'diversity_1' : key === 'insiderGroups' ? 'chat_bubble_outline' : 'emoji_events'}</Icon>
                              {:else}<StyledText value={(option[constraint] ?? []).join(', ')} noLinks />{/if}
                            </button>{key === 'playerPool' ? ':' : ','}
                          {/snippet}
                          {#if option[constraint] === undefined}
                            <button class="button" onclick={() => customizeConstraint(slotIndex, optionIndex, constraint)}>{text('setNotDefault')}</button>
                          {:else}
                            <button class="button" onclick={() => useDefaultConstraint(slotIndex, optionIndex, constraint)}>{text('setDefault')}</button>
                            {#if constraint === 'playerPool'}
                              {#each current.roleList as _, playerIndex}
                                <button class="button" class:highlighted={option.playerPool?.includes(playerIndex)} onclick={() => toggleConstraintValue(slotIndex, optionIndex, 'playerPool', playerIndex, !option.playerPool?.includes(playerIndex))}>{dummyNames[playerIndex] ?? String(playerIndex + 1)}</button>
                              {/each}
                            {:else if constraint === 'insiderGroups'}
                              {#each INSIDER_GROUPS as group}<button class="button" class:highlighted={option.insiderGroups?.includes(group)} onclick={() => toggleConstraintValue(slotIndex, optionIndex, 'insiderGroups', group, !option.insiderGroups?.includes(group))}><StyledText value={text(group)} noLinks /></button>{/each}
                            {:else}
                              {#each CONCLUSIONS as conclusion}<button class="button" class:highlighted={option.winIfAny?.includes(conclusion)} onclick={() => toggleConstraintValue(slotIndex, optionIndex, 'winIfAny', conclusion, !option.winIfAny?.includes(conclusion))}><StyledText value={text(conclusion)} noLinks /></button>{/each}
                            {/if}
                          {/if}
                        </Popover>
                      {/each}
                      <Select value={optionChoice(option)} options={roleOptions} onchange={value => changeOption(slotIndex, optionIndex, value)} label={'Role for outline ' + (slotIndex + 1)} />
                      <button class="button" aria-label="Remove alternative" onclick={() => removeAlternative(slotIndex, optionIndex)}><Icon size="tiny">remove</Icon></button>
                    </div>
                  {/each}
                  <button class="button" aria-label="Add alternative" onclick={() => addAlternative(slotIndex)}><Icon size="tiny">add</Icon></button>
                </div>
                <button class="button" aria-label="Remove outline" onclick={() => removeSlot(slotIndex)}><Icon>delete</Icon></button>
              </div>
            </div>
          {/each}
          <div class="role-list-setter-outline-div role-list-setter-add-button-div"><button class="button" aria-label="Add outline" onclick={addSlot}><Icon>add</Icon></button></div>
        </div>
      </section>
    </div>
  </main>
</div>
