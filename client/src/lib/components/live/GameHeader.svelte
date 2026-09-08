<script lang="ts">
  import Icon from '../Icon.svelte';
  import Select from '../Select.svelte';
  import StyledText from '../StyledText.svelte';
  import type { Snippet } from 'svelte';
  import '../headerMenu.css';
  import type { ConnectionState, GameState } from '$lib/game/state';
  import { PHASES, type FastForwardSetting, type PhaseType } from '$lib/game/phases';
  import { phaseName, playerName, roleName, text } from '$lib/live/format';

  interface MenuOption {
    id: string;
    label: string;
  }

  interface Props {
    state: GameState;
    connection: ConnectionState;
    menus: MenuOption[];
    activeMenus: string[];
    compact?: boolean;
    judgement?: Snippet;
    reconnecting?: boolean;
    onToggleMenu: (id: string) => void;
    onFastForward: (setting: FastForwardSetting) => void;
    onToggleHost: () => void;
    onReconnect: () => void;
    onLeave: () => void;
  }

  let {
    state,
    connection,
    menus,
    activeMenus,
    compact = false,
    judgement,
    reconnecting = false,
    onToggleMenu,
    onFastForward,
    onToggleHost,
    onReconnect,
    onLeave
  }: Props = $props();

  let currentPhaseLength = $derived(
    state.phase.type === 'recess' ? null : state.phaseTimes[state.phase.type] * 1_000
  );
  let timerProgress = $derived(
    state.timeLeftMs === null || currentPhaseLength === null || currentPhaseLength === 0
      ? 100
      : Math.max(0, Math.min(100, state.timeLeftMs / currentPhaseLength * 100))
  );
  let me = $derived(
    state.client.type === 'player' && state.client.myIndex !== null
      ? state.players[state.client.myIndex]
      : null
  );
  let ownRole = $derived(state.client.type === 'player' ? state.client.myRole : null);

  function remainingTime(milliseconds: number | null): string {
    if (milliseconds === null) return '∞';
    return String(Math.max(0, Math.floor(milliseconds / 1_000)));
  }

  function phaseLabel(): string {
    if (state.phase.type === 'recess') return phaseName(state.phase.type);
    return `${phaseName(state.phase.type)} ${state.dayNumber}`;
  }

  function trialLabel(): string | null {
    if ('playerOnTrial' in state.phase) {
      return text(state.phase.type + '.playerOnTrial', state.players[state.phase.playerOnTrial].name);
    }
    if ('trialsLeft' in state.phase) {
      return text(state.phase.trialsLeft === 1 ? 'trialsRemaining.1' : 'trialsRemaining', state.phase.trialsLeft);
    }
    return null;
  }

  function serializeFastForward(setting: FastForwardSetting): string {
    if (setting.type !== 'phase') return setting.type;
    return `phase/${setting.phase}/${setting.day}`;
  }

  function parseFastForward(value: string): FastForwardSetting {
    if (value === 'skip') return { type: 'skip' };
    if (!value.startsWith('phase/')) return { type: 'none' };
    const [, phase, day] = value.split('/');
    return { type: 'phase', phase: phase as PhaseType, day: Number(day) };
  }

  function futurePhases(): Array<{ value: string; label: string }> {
    const options: Array<{ value: string; label: string }> = [];
    const currentIndex = PHASES.indexOf(state.phase.type);
    for (let day = state.dayNumber; day <= state.dayNumber + 3; day += 1) {
      for (const phase of ['discussion', 'nomination', 'night'] as const) {
        if (day === state.dayNumber && PHASES.indexOf(phase) <= currentIndex) continue;
        options.push({
          value: serializeFastForward({ type: 'phase', phase, day }),
          label: `${phaseName(phase)} ${day}`
        });
      }
    }
    return options;
  }

  const icons: Record<string, string> = {wiki: '📖', dossier: '⚙️', players: '🕵🏾', chat: '💬', notes: '📜', abilities: '🔎'};
  let fastForwardOptions = $derived([{value: 'none', label: '', icon: 'play_arrow'}, {value: 'skip', label: '', icon: 'fast_forward'}, ...futurePhases().map(option => ({...option, icon: 'fast_forward'}))]);
</script>

<header class="header-menu" class:reduced-header={compact} class:background-night={state.phase.type === 'night' || state.phase.type === 'obituary'} class:background-day={state.phase.type !== 'briefing' && state.phase.type !== 'night' && state.phase.type !== 'obituary'}>
  {#if state.client.type === 'player' || state.hostClients !== null}
    <Select class={'brand fast-forward-button' + (state.fastForward.type !== 'none' ? ' highlighted' : '')} hideArrow label="Fast forward vote" value={serializeFastForward(state.fastForward)} options={fastForwardOptions} onchange={value => onFastForward(parseFastForward(value))} />
  {/if}
  {#if !compact}
    <div class="information">
      <div class="my-information"><div>
        <h3><div>{phaseLabel()}⏳{remainingTime(state.timeLeftMs)}</div></h3>
        {#if state.client.type === 'player'}<StyledText value={(me?.name ?? '') + ' (' + roleName(ownRole) + ')'} players={state.players.map(player => player.name)} myIndex={state.client.myIndex} />{/if}
      </div></div>
      {#if trialLabel()}<div class="phase-specific"><div class="highlighted"><StyledText value={trialLabel() ?? ''} />{#if judgement}{@render judgement()}{/if}</div></div>{/if}
    </div>
  {/if}
  <nav class="menu-buttons desktop-menus" aria-label="Game panels">
    {#each menus as menu (menu.id)}<button class="button" data-menu={menu.id} class:highlighted={activeMenus.includes(menu.id)} aria-pressed={activeMenus.includes(menu.id)} onclick={() => onToggleMenu(menu.id)}>{icons[menu.id]}<span class="mobile-hidden">{menu.label}</span></button>{/each}
  </nav>
  <div class="timer-box" aria-hidden="true"><div style:width={timerProgress + '%'} style="height: 100%; background: red; margin: 0 auto"></div></div>
  {#if connection.status !== 'open'}<div role="status">{connection.error ?? connection.status}<button disabled={reconnecting || connection.status === 'connecting'} onclick={onReconnect}>{reconnecting ? 'Reconnecting...' : 'Reconnect'}</button></div>{/if}
</header>
<style>
  @media (max-width: 600px) { .desktop-menus { display: none; } }
</style>
