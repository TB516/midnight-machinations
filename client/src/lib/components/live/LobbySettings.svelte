<script lang="ts">
  import Icon from '../Icon.svelte';
  import Select from '../Select.svelte';
  import StyledText from '../StyledText.svelte';
  import PhaseTimeline from '../PhaseTimeline.svelte';
  import FlushInput from '../FlushInput.svelte';
  import { overlays } from '../overlays.svelte';
  import '../gameModeSelector.css';
  import '../disabledRoleSelector.css';
  import { onMount } from 'svelte';
  import RoleListEditor from '$lib/components/live/RoleListEditor.svelte';
  import {
    CONCLUSIONS,
    INSIDER_GROUPS,
    MODIFIERS,
    allRoles,
    defaultModifierState,
    gameSession,
    type Conclusion,
    type InsiderGroup,
    type LobbyState,
    type ModifierID,
    type ModifierSettings,
    type ModifierState,
    type Role,
    type RoleList,
    type RoleOutlineOption,
    type RoleSet
  } from '$lib/game';
  import {
    defaultGameModes,
    LATEST_GAME_MODE_FORMAT,
    loadGameModes,
    saveGameModes,
    parseImportedText,
    parseShareableGameMode,
    type GameModeStorage,
    type GameModeData,
    type ModifierSettings as SavedModifierSettings,
    type RoleId,
    type RoleList as SavedRoleList
  } from '$lib/game-modes';
  import { modifierName, roleName, text } from '$lib/live/format';

  interface Props {
    lobby: LobbyState;
    disabled?: boolean;
  }

  interface Preset {
    key: string;
    name: string;
    players: number;
    data: GameModeData<RoleId>;
  }

  let { lobby, disabled = false }: Props = $props();

  let presets = $state<Preset[]>([]);
  let library = $state<GameModeStorage<RoleId>>(defaultGameModes());
  let modeName = $state('');
  let toolbarError = $state('');
  let modeData = $derived<GameModeData<RoleId>>({
    roleList: lobby.roleList,
    phaseTimes: lobby.phaseTimes,
    enabledRoles: lobby.enabledRoles,
    modifierSettings: lobby.modifierSettings.modifiers,
    randomSeed: lobby.randomSeed
  });
  let serialized = $derived(JSON.stringify({format: LATEST_GAME_MODE_FORMAT, name: modeName || 'Unnamed Game Mode', ...modeData}));
  let selectedPreset = $state('');
  let presetStatus = $state('');
  let roleQuery = $state('');
  let limitRole = $state<Role>(allRoles()[0]);
  let limitValue = $state(1);

  let playerNames = $derived(
    lobby.players.flatMap(([, client]) => client.clientType.type === 'player' ? [client.clientType.name] : [])
  );
  let currentModifiers = $derived(lobby.modifierSettings.modifiers.map(([id]) => id));
  let customLimits = $derived.by(() => {
    const entry = lobby.modifierSettings.modifiers.find(([id]) => id === 'customRoleLimits');
    return entry?.[1].type === 'customRoleLimits' ? entry[1].limits : [];
  });
  let visibleRoles = $derived.by(() => {
    const query = roleQuery.trim().toLocaleLowerCase('en-US');
    const roles = allRoles();
    if (!query) return roles;
    return roles.filter((role) => roleName(role).toLocaleLowerCase('en-US').includes(query));
  });

  onMount(() => {
    const loaded = loadGameModes(localStorage);
    library = loaded.ok ? loaded.value : defaultGameModes();
    refreshPresets();
    const matching = presets.find(preset => JSON.stringify(preset.data.roleList) === JSON.stringify(lobby.roleList) && JSON.stringify(preset.data.enabledRoles) === JSON.stringify(lobby.enabledRoles));
    if (matching) { selectedPreset = matching.key; modeName = matching.name; }
  });

  function refreshPresets(): void {
    presets = library.gameModes.flatMap((mode, modeIndex) =>
      Object.entries(mode.data)
        .map(([players, data]) => ({
          key: `${modeIndex}:${players}`,
          name: mode.name,
          players: Number(players),
          data
        }))
        .sort((left, right) => left.players - right.players)
    );
  }

  function saveMode(): void {
    if (disabled || !lobby.roleList.length) return;
    if (!modeName.length || modeName.length >= 100) { toolbarError = text('notification.saveGameMode.failure.invalidName'); return; }
    const next = structuredClone($state.snapshot(library));
    const existing = next.gameModes.find(mode => mode.name === modeName);
    const count = lobby.roleList.length;
    if (existing?.data[count] && !window.confirm(text('confirmOverwrite'))) return;
    if (existing) existing.data[count] = structuredClone($state.snapshot(modeData));
    else next.gameModes.push({name: modeName, data: {[count]: structuredClone($state.snapshot(modeData))}});
    saveGameModes(localStorage, next);
    library = next;
    refreshPresets();
    selectedPreset = presets.find(preset => preset.name === modeName && preset.players === count)!.key;
    toolbarError = '';
  }

  function deleteMode(): void {
    const preset = presets.find(preset => preset.key === selectedPreset);
    if (disabled || !preset || !window.confirm(text('confirmDelete'))) return;
    const next = structuredClone($state.snapshot(library));
    const mode = next.gameModes.find(mode => mode.name === preset.name)!;
    delete mode.data[preset.players];
    next.gameModes = next.gameModes.filter(mode => Object.keys(mode.data).length > 0);
    saveGameModes(localStorage, next);
    library = next;
    refreshPresets();
    selectedPreset = '';
  }

  async function pasteMode(): Promise<void> {
    try {
      const decoded = parseImportedText(await navigator.clipboard.readText());
      if (!decoded.ok) { toolbarError = decoded.reason; return; }
      const parsed = parseShareableGameMode(decoded.value);
      if (!parsed.ok) { toolbarError = parsed.reason; return; }
      modeName = parsed.value.name;
      selectedPreset = '';
      applyData(parsed.value);
      toolbarError = '';
    } catch { toolbarError = text('notification.importGameMode.failure'); }
  }

  async function copyMode(share: boolean): Promise<void> {
    const url = new URL('/gameMode', location.origin);
    url.searchParams.set('mode', serialized);
    try { await navigator.clipboard.writeText(share ? url.href : serialized); }
    catch { toolbarError = text('notification.copy.failure'); }
  }

  function toServerRoleList(saved: SavedRoleList<RoleId>): RoleList {
    return saved.map((outline) => outline.map((option): RoleOutlineOption => {
      let converted: RoleOutlineOption;
      if (option.role !== undefined) {
        converted = { role: option.role };
      } else {
        converted = { roleSet: option.roleSet as RoleSet };
      }

      if (Array.isArray(option.winIfAny)) {
        converted.winIfAny = option.winIfAny.filter(
          (value): value is Conclusion =>
            typeof value === 'string' && CONCLUSIONS.includes(value as Conclusion)
        );
      }
      if (Array.isArray(option.insiderGroups)) {
        converted.insiderGroups = option.insiderGroups.filter(
          (value): value is InsiderGroup => INSIDER_GROUPS.includes(value as InsiderGroup)
        );
      }
      if (Array.isArray(option.playerPool)) {
        converted.playerPool = option.playerPool.filter(
          (value) => Number.isSafeInteger(value) && value >= 0
        );
      }
      return converted;
    }));
  }

  function toServerModifiers(saved: SavedModifierSettings<RoleId>): ModifierSettings {
    return {
      modifiers: saved.map(([id, modifier]): [ModifierID, ModifierState] => {
        if (id === 'customRoleLimits') {
          return [id, {
            type: id,
            limits: (modifier.limits ?? []).map(([role, limit]) => [role, limit])
          }];
        }
        return [id, { type: id }];
      })
    };
  }

  function applyPreset(): void {
    const preset = presets.find((candidate) => candidate.key === selectedPreset);
    if (!preset || disabled) return;
    modeName = preset.name;
    applyData(preset.data);
  }

  function applyData(data: GameModeData<RoleId>): void {
    if (disabled) return;
    const sent = [
      gameSession.setPhaseTimes(data.phaseTimes),
      gameSession.setEnabledRoles([...data.enabledRoles]),
      gameSession.setRoleList(toServerRoleList(data.roleList)),
      gameSession.setModifierSettings(toServerModifiers(data.modifierSettings)),
      gameSession.setRandomSeed(data.randomSeed ?? null)
    ].every(Boolean);

    presetStatus = sent
      ? ''
      : 'The preset could not be sent to the server.';
  }

  function setPhaseTime(phase: keyof LobbyState['phaseTimes'], value: string): void {
    const seconds = Math.round(Number(value));
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 1_000) return;
    gameSession.setPhaseTime(phase, seconds);
  }

  function toggleRole(role: Role, enabled: boolean): void {
    let roles = lobby.enabledRoles.filter((candidate) => candidate !== role);
    if (enabled) roles = [...roles, role];
    gameSession.setEnabledRoles(roles);
  }

  function toggleModifier(id: ModifierID, enabled: boolean): void {
    let modifiers = lobby.modifierSettings.modifiers.filter(([candidate]) => candidate !== id);
    if (enabled) modifiers = [...modifiers, [id, defaultModifierState(id)]];
    gameSession.setModifierSettings({ modifiers });
  }

  function saveCustomLimit(role: Role, value: number): void {
    if (!Number.isSafeInteger(value) || value < 0 || value > 255) return;
    const limits = customLimits.filter(([candidate]) => candidate !== role);
    limits.push([role, value]);
    replaceCustomLimits(limits);
  }

  function removeCustomLimit(role: Role): void {
    replaceCustomLimits(customLimits.filter(([candidate]) => candidate !== role));
  }

  function replaceCustomLimits(limits: Array<[Role, number]>): void {
    const modifiers = lobby.modifierSettings.modifiers.map(([id, modifier]): [ModifierID, ModifierState] => {
      if (id === 'customRoleLimits') return [id, { type: id, limits }];
      return [id, modifier];
    });
    gameSession.setModifierSettings({ modifiers });
  }

  function updateRandomSeed(value: string): void {
    if (value.trim() === '') {
      gameSession.setRandomSeed(null);
      return;
    }
    const seed = Number(value);
    if (Number.isSafeInteger(seed) && seed >= 0) gameSession.setRandomSeed(seed);
  }

  let hideRoles = $state(false);
  let hideModifiers = $state(false);
</script>

<section class="chat-menu-colors selector-section">
  <div class="save-menu">
    {#if !disabled}
      <Select value={selectedPreset} options={[{value: '', label: 'Custom'}, ...presets.map(preset => ({value: preset.key, label: preset.name + ': ' + preset.players}))]} onchange={value => {selectedPreset = value; applyPreset();}} label="Game mode" class="brand" />
      <FlushInput bind:value={modeName} label="Game mode name" />
      <div class="vertical-line-separator"></div>
    {/if}
    <div class="toolbar-buttons">
      {#if !disabled}<button class="button flush" aria-label="Save game mode" onclick={saveMode}><Icon>save</Icon></button>{/if}
      {#if !disabled && selectedPreset}<button class="button flush" aria-label="Reload game mode" onclick={applyPreset}><Icon>refresh</Icon></button>{/if}
      <button class="button flush" aria-label="Copy game mode" onclick={() => copyMode(false)}><Icon>content_copy</Icon></button>
      {#if !disabled}<button class="button flush" aria-label="Paste game mode" onclick={pasteMode}><Icon>content_paste</Icon></button>{/if}
      <button class="button flush" aria-label="Share game mode" onclick={() => copyMode(true)}><Icon>share</Icon></button>
      {#if !disabled && selectedPreset}<button class="button flush" aria-label="Delete game mode" onclick={deleteMode}><Icon>delete</Icon></button>{/if}
    </div>
  </div>
  {#if toolbarError}<p role="alert">{toolbarError}</p>{/if}
</section>
<div class="lobby-settings">
  <PhaseTimeline {disabled} times={lobby.phaseTimes} noTrial={currentModifiers.includes('noTrialPhases')} onchange={(phase, seconds) => { if (!disabled) setPhaseTime(phase, String(seconds)); }} />
  <section class="graveyard-menu-colors selector-section">
    <div class="selector-section-header">{text('menu.lobby.roleList')}: {lobby.roleList.length}{#if !disabled}<button class="button" onclick={() => gameSession.simplifyRoleList()}><Icon>filter_list</Icon> {text('simplify')}</button>{/if}</div>
    <RoleListEditor roleList={lobby.roleList} players={playerNames} {disabled} onChange={roleList => gameSession.setRoleList(roleList)} />
  </section>
  <section class="role-specific-colors selector-section">
    <div class="selector-section-header">{text('menu.lobby.enabledRoles')}<button class="button flush" aria-label="Hide disabled roles" onclick={() => hideRoles = !hideRoles}><Icon>{hideRoles ? 'visibility' : 'visibility_off'}</Icon></button></div>
    <div class="enabled-roles-button-panel">
      {#each allRoles().filter(role => !hideRoles || lobby.enabledRoles.includes(role)) as role}
        {#if disabled}<div class="placard" class:keyword-disabled={!lobby.enabledRoles.includes(role)}><StyledText value={roleName(role)} /></div>
        {:else}<button class="button" onclick={() => toggleRole(role, !lobby.enabledRoles.includes(role))}><span class:keyword-disabled={!lobby.enabledRoles.includes(role)}><StyledText value={roleName(role)} noLinks /></span></button>{/if}
      {/each}
    </div>
  </section>
  <section class="graveyard-menu-colors selector-section">
    <div class="selector-section-header">{text('modifiers')}<button class="button flush" aria-label="Hide disabled modifiers" onclick={() => hideModifiers = !hideModifiers}><Icon>{hideModifiers ? 'visibility' : 'visibility_off'}</Icon></button></div>
    <div class="enabled-roles-button-panel">
      {#each MODIFIERS.filter(modifier => !hideModifiers || currentModifiers.includes(modifier)) as modifier}
        {#if disabled}<div class="placard" class:keyword-disabled={!currentModifiers.includes(modifier)}><StyledText value={text(modifier)} /></div>
        {:else}<button class="button" onclick={() => toggleModifier(modifier, !currentModifiers.includes(modifier))}><span class:keyword-disabled={!currentModifiers.includes(modifier)}><StyledText value={text(modifier)} noLinks /></span></button>{/if}
      {/each}
    </div>
    {#if currentModifiers.includes('customRoleLimits')}
      <div class="custom-role-limit-selection">
        <Select value={limitRole} options={allRoles().map(role => ({value: role, label: roleName(role)}))} {disabled} onchange={value => limitRole = value} />
        <input aria-label="Role limit" type="number" min="0" max="255" bind:value={limitValue} {disabled} />
        <button class="button" {disabled} onclick={() => saveCustomLimit(limitRole, limitValue)}><Icon>add</Icon></button>
      </div>
      {#each customLimits as [role, maximum]}<div><StyledText value={roleName(role)} />: {maximum}<button class="button" {disabled} aria-label="Remove limit" onclick={() => removeCustomLimit(role)}><Icon>delete</Icon></button></div>{/each}
    {/if}
  </section>
  <section class="chat-menu-colors selector-section">
    <div class="selector-section-header">{text('wiki.article.standard.randomSeed.title')}: {#if disabled}{lobby.randomSeed ?? text('none')}{:else}<input aria-label="Random seed" type="text" value={lobby.randomSeed ?? ''} oninput={event => updateRandomSeed(event.currentTarget.value)} />{/if}</div>
  </section>
</div>
