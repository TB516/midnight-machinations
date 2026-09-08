<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import LobbyRoom from '$lib/components/live/LobbyRoom.svelte';
  import {
    gameConnection,
    gameSession,
    gameState,
    loadReconnectData,
    type GameSessionState,
    type RoomCode
  } from '$lib/game';
  import { roomCode as formatRoomCode, text } from '$lib/live/format';

  let status = $state('Connecting to the lobby server...');
  let statusKind = $state<'neutral' | 'error'>('neutral');
  let joinedOnce = false;

  let requestedCode = $derived(parseRoomCode(page.params.code ?? ''));
  let matchingLobby = $derived(
    $gameState.kind === 'lobby' && $gameState.roomCode === requestedCode ? $gameState : null
  );

  onMount(() => {
    let active = true;
    const unsubscribe = gameState.subscribe((state) => {
      if (!active) return;
      handleState(state);
    });

    void initialize();
    return () => {
      active = false;
      unsubscribe();
    };
  });

  function parseRoomCode(value: string): RoomCode | null {
    if (!/^[0-9a-h]+$/i.test(value)) return null;
    const parsed = Number.parseInt(value, 18);
    if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
    return parsed;
  }

  function handleState(state: GameSessionState): void {
    if (state.kind === 'game') {
      void goto('/game');
      return;
    }
    if (state.kind === 'lobby') {
      joinedOnce = true;
      if (state.roomCode !== requestedCode) {
        void goto(`/lobby/${formatRoomCode(state.roomCode).toLocaleLowerCase('en-US')}`);
      }
      return;
    }
    if (joinedOnce) void goto('/play');
  }

  async function initialize(): Promise<void> {
    const code = requestedCode;
    if (code === null) {
      status = 'This invite has an invalid room code.';
      statusKind = 'error';
      return;
    }

    const current = gameSession.getSnapshot();
    if (current.kind !== 'outsideRoom') {
      handleState(current);
      return;
    }

    const connected = await gameSession.open();
    if (!connected) {
      status = gameSession.getConnectionSnapshot().error ?? 'Could not reach the lobby server.';
      statusKind = 'error';
      return;
    }

    const saved = loadReconnectData();
    let joined = false;
    if (saved?.roomCode === code) {
      status = `Reconnecting to room ${formatRoomCode(code)}...`;
      joined = await gameSession.rejoinRoom(saved.roomCode, saved.playerId);
    }
    if (!joined) {
      status = `Joining room ${formatRoomCode(code)}...`;
      joined = await gameSession.joinRoom(code);
    }

    if (joined) return;
    const state = gameSession.getSnapshot();
    const rejection = state.kind === 'outsideRoom' ? state.lastJoinRejection : null;
    status = rejection
      ? text(`notification.rejectJoin.${rejection}`)
      : gameSession.getConnectionSnapshot().error ?? 'The room did not accept the connection.';
    statusKind = 'error';
  }
</script>

<svelte:head>
  <title>{requestedCode === null ? 'Invalid room' : `Room ${formatRoomCode(requestedCode)}`} | Midnight Machinations</title>
  <meta
    name="description"
    content="Join the lobby, choose a seat, and get ready for a Midnight Machinations game."
  />
</svelte:head>

{#if matchingLobby}
  <LobbyRoom lobby={matchingLobby} />
{:else}
  <section class="lobby-loading">
    <div class="panel-card">

      <h1>{statusKind === 'error' ? 'Could not join' : 'Taking your seat'}</h1>
      <p class:error={statusKind === 'error'} aria-live="polite">{status}</p>
      {#if $gameConnection.status === 'connecting'}
        <div class="progress" aria-hidden="true"><span></span></div>
      {/if}
      {#if statusKind === 'error'}
        <a class="button primary" href="/play">Browse rooms</a>
      {/if}
    </div>
  </section>
{/if}

<style>
  .lobby-loading {
    display: grid;
    min-height: 70vh;
    place-items: center;
    padding-block: 4rem;
  }

  .lobby-loading > div {
    width: min(100%, 34rem);
    padding: .25rem .5rem;
    text-align: center;
  }

  h1 {
    margin-bottom: 1rem;
    font-size: 1.25rem;
  }

  .lobby-loading p.error {
    color: #ffc1c4;
  }

  .progress {
    height: 2px;
    overflow: hidden;
    margin-top: 1.5rem;
    background: var(--line);
  }

  .progress span {
    display: block;
    width: 45%;
    height: 100%;
    background: var(--blood-bright);
    animation: connecting 1.2s ease-in-out infinite alternate;
  }

  .lobby-loading .button {
    margin-top: 1rem;
  }

  @keyframes connecting {
    from { transform: translateX(-100%); }
    to { transform: translateX(220%); }
  }

  @media (prefers-reduced-motion: reduce) {
    .progress span {
      animation: none;
      transform: none;
    }
  }
</style>
