<script lang="ts">
  import Icon from '../Icon.svelte';
  import GraveCard from './Grave.svelte';
  import StyledText from '../StyledText.svelte';
  import { text } from '$lib/live/format';
  import '../playerListMenu.css';
  import '../playerNamePlate.css';
  import type { Controller, ControllerID } from '$lib/game/controllers';
  import type { Grave } from '$lib/game/graves';
  import type { GamePlayer, GameState } from '$lib/game/state';
  import { formatChatMessage, playerName, roleName, tagName } from '$lib/live/format';

  interface Props {
    state: GameState;
    onControllerInput: (id: ControllerID, controller: Controller, players: number[]) => void;
    onWhisper: (player: number) => void;
  }

  let { state: game, onControllerInput, onWhisper }: Props = $props();

  let names = $derived(game.players.map((player) => player.name));
  let twoThirdsMajority = $derived(
    game.modifierSettings.modifiers.some(([id]) => id === 'twoThirdsMajority')
  );
  let nomination = $derived.by(() => {
    if (game.client.type !== 'player') return null;
    return game.client.controllers.find(([id, controller]) =>
      id.type === 'nominate' &&
      controller.selection.type === 'playerList' &&
      controller.parameters.available.type === 'playerList'
    ) ?? null;
  });
  let whispersEnabled = $derived(!game.modifierSettings.modifiers.some(([id]) => id === 'noWhispers'));

  function graveFor(player: number): Grave | null {
    return game.graves.find(([, grave]) => grave.player === player)?.[1] ?? null;
  }

  function mostRecentStatement(player: number): string | null {
    for (let index = game.chatMessages.length - 1; index >= 0; index -= 1) {
      const message = game.chatMessages[index][1];
      if (
        message.variant.type === 'normal' &&
        message.variant.block &&
        'player' in message.variant.messageSender &&
        message.variant.messageSender.player === player
      ) {
        return formatChatMessage(message, names, game.roleList, { twoThirdsMajority }).split('\n').at(-1) ?? null;
      }
    }
    return null;
  }

  function canNominate(index: number): boolean {
    if (!nomination || nomination[1].parameters.grayedOut) return false;
    if (nomination[1].parameters.available.type !== 'playerList') return false;
    return nomination[1].parameters.available.selection.availablePlayers.includes(index);
  }

  function isNominated(index: number): boolean {
    if (!nomination || nomination[1].selection.type !== 'playerList') return false;
    return nomination[1].selection.selection.includes(index);
  }

  function toggleNomination(index: number): void {
    if (!nomination || nomination[1].selection.type !== 'playerList') return;
    const selected = isNominated(index) ? [] : [index];
    onControllerInput(nomination[0], nomination[1], selected);
  }



  let openAlibis = $state<number[]>([]);
  let openGraves = $state<number[]>([]);
  let orderedPlayers = $derived([...game.players.filter(player => player.alive), ...game.players.filter(player => !player.alive)]);
</script>

<div class="player-list-menu player-list-menu-colors">
  <div class="player-list">
    {#each orderedPlayers as player, index (player.index)}
      {@const grave = graveFor(player.index)}
      {@const statement = mostRecentStatement(player.index)}
      {@const mine = game.client.type === 'player' && game.client.myIndex === player.index}
      {#if !player.alive && (index === 0 || orderedPlayers[index - 1].alive)}<span>{text('grave.icon')} {text('graveyard')}</span>{/if}
      <div class="player-card-holder">
        <div class="player-card">
          <div class="player-name-plate" class:keyword-dead={!player.alive}>
            {#if 'playerOnTrial' in game.phase && game.phase.playerOnTrial === player.index}{text('trial.icon')} {/if}
            <span class="keyword-player-number" class:keyword-player-important={mine}>{player.index + 1}</span> <span class="keyword-player" class:keyword-player-important={mine}>{player.name}</span>
            {#if mine && game.client.type === 'player'} <StyledText value={'(' + roleName(game.client.myRole) + ')'} />
            {:else if player.alive && player.roleLabel} <StyledText value={'(' + roleName(player.roleLabel) + ')'} />{/if}
            {#each player.tags as tag}<StyledText value={tagName(tag)} />{/each}
          </div>
          {#if statement}<button class="button alibi-button will-menu-colors" onclick={() => openAlibis = openAlibis.includes(player.index) ? openAlibis.filter(index => index !== player.index) : [...openAlibis, player.index]}><StyledText value={statement.split('\n')[0].trim().slice(0, 30)} noLinks /></button>{/if}
          {#if grave}<button class="button grave-button graveyard-menu-colors" onclick={() => openGraves = openGraves.includes(player.index) ? openGraves.filter(index => index !== player.index) : [...openGraves, player.index]}><StyledText value={(grave.information.type === 'normal' ? roleName(grave.information.role) : text('obscured')) + ' ' + text(grave.diedPhase + '.icon') + grave.dayNumber} noLinks /></button>{/if}
          {#if game.phase.type === 'nomination' && player.alive}
            {#if game.client.type === 'spectator'}<Icon>how_to_vote</Icon>{player.numVoted}
            {:else}<button class="button flush" class:highlighted={isNominated(player.index)} disabled={!canNominate(player.index)} aria-label={'Nominate ' + player.name} onclick={() => toggleNomination(player.index)}><Icon>how_to_vote</Icon>{player.numVoted}</button>{/if}
          {/if}
          {#if game.client.type === 'player'}<button class="button flush" disabled={!whispersEnabled} aria-label={'Whisper to ' + player.name} onclick={() => onWhisper(player.index)}><Icon>chat</Icon></button>{/if}
        </div>
        {#if statement && openAlibis.includes(player.index)}<div class="open-alibi will-menu-colors"><StyledText value={statement} players={names} /></div>{/if}
        {#if grave && openGraves.includes(player.index)}
          <GraveCard {grave} players={names} roleList={game.roleList} />
        {/if}
      </div>
    {/each}
  </div>
</div>
