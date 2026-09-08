<script lang="ts">
  import type { ClientRoleState } from '$lib/game/roles';
  import type { GameState } from '$lib/game/state';
  import type { ConsortOptions } from '$lib/game/session';
  import Counter from '../Counter.svelte';
  import DetailsSummary from '../DetailsSummary.svelte';
  import StyledText from '../StyledText.svelte';
  import CheckBox from '../CheckBox.svelte';
  import { text, roleName, chatMessageClass, formatChatMessage } from '$lib/live/format';

  let { ability, game, onHypnotistOptions }: {
    ability: ClientRoleState;
    game: GameState;
    onHypnotistOptions: (options: ConsortOptions) => void;
  } = $props();

  // These are the role-specific counters shown by the original client.
  const counters: Partial<Record<ClientRoleState['type'], { field: string; key: string; max?: number }>> = {
    jailor: { field: 'executionsRemaining', key: 'role.jailor.roleDataText.executionsRemaining' },
    kidnapper: { field: 'executionsRemaining', key: 'role.jailor.roleDataText.executionsRemaining', max: 1 },
    medium: { field: 'hauntsRemaining', key: 'role.medium.roleDataText.hauntsRemaining' },
    doctor: { field: 'selfHealsRemaining', key: 'role.doctor.roleDataText', max: 1 },
    bodyguard: { field: 'selfShieldsRemaining', key: 'role.bodyguard.roleDataText', max: 1 },
    veteran: { field: 'alertsRemaining', key: 'role.veteran.roleDataText' },
    armorsmith: { field: 'openShopsRemaining', key: 'role.armorsmith.roleDataText' },
    counterfeiter: { field: 'forgesRemaining', key: 'role.forger.roleDataText' },
    forger: { field: 'forgesRemaining', key: 'role.forger.roleDataText' },
    cerenovous: { field: 'charges', key: 'role.cerenovous.roleDataText' },
    warden: { field: 'charges', key: 'role.warden.roleDataText' },
    mortician: { field: 'cremationsRemaining', key: 'role.mortician.roleDataText' },
    steward: { field: 'stewardProtectsRemaining', key: 'role.steward.roleDataText', max: 1 },
    puppeteer: { field: 'marionettesRemaining', key: 'role.puppeteer.smallRoleMenu.marionettesRemaining' },
    yer: { field: 'starPassesRemaining', key: 'role.yer.shapeshiftsRemaining' },
    recruiter: { field: 'recruitsRemaining', key: 'role.recruiter.smallRoleMenu.recruitsRemaining', max: 5 },
    mercenary: { field: 'attacksRemaining', key: 'role.mercenary.roleDataText' }
  };
  const stories = [
    ['youWereRoleblockedMessage', 'roleBlocked'],
    ['youSurvivedAttackMessage', 'youSurvivedAttack'],
    ['youWereGuardedMessage', 'youWereGuarded'],
    ['youWereTransportedMessage', 'transported'],
    ['youWerePossessedMessage', 'youWerePossessed'],
    ['youWereWardblockedMessage', 'wardblocked']
  ] as const;
  let info = $derived.by(() => {
    const counter = counters[ability.type];
    const maximum = Math.ceil(game.players.length / 5);
    if (counter) {
      const current = Number(ability[counter.field]);
      const max = ability.type === 'warden' ? Math.ceil(game.players.length / 2) : counter.max ?? maximum;
      return { current, max, message: text(counter.key, current, max) };
    }
    if (ability.type === 'vigilante' || ability.type === 'martyr') {
      const state = ability.state as { type: string; bullets: number };
      if (state.type === 'loaded' || state.type === 'stillPlaying') {
        return { current: state.bullets, max: maximum, message: text(`role.${ability.type}.roleDataText`, state.bullets) };
      }
      if (ability.type === 'vigilante') {
        const suffix = state.type === 'willSuicide' ? 'suicide' : 'notLoaded';
        return { message: text(`role.vigilante.roleDataText.${suffix}`) };
      }
    }
    if (ability.type === 'engineer') return { message: text(`role.engineer.roleDataText.${(ability.trap as { type: string }).type}`) };
    if (ability.type === 'marksman') return { message: text(`role.marksman.roleDataText.${(ability.state as { type: string }).type}`) };
    if (ability.type === 'courtesan') return { message: (ability.previous as number[]).map(index => game.players[index].name).join() };
    if (ability.type === 'spiral' && game.players.some(player => player.tags.includes('spiraling'))) return { message: text('role.spiral.roleDataText.cannotSelect') };
    return null;
  });

  function updateStory(key: keyof ConsortOptions, value: boolean): void {
    onHypnotistOptions({
      roleblock: Boolean(ability.roleblock),
      youWereRoleblockedMessage: Boolean(ability.youWereRoleblockedMessage),
      youSurvivedAttackMessage: Boolean(ability.youSurvivedAttackMessage),
      youWereGuardedMessage: Boolean(ability.youWereGuardedMessage),
      youWereTransportedMessage: Boolean(ability.youWereTransportedMessage),
      youWerePossessedMessage: Boolean(ability.youWerePossessedMessage),
      youWereWardblockedMessage: Boolean(ability.youWereWardblockedMessage),
      [key]: value
    });
  }
</script>

{#if info || ability.type === 'hypnotist'}
  <DetailsSummary open={true}>
    {#snippet summary()}<StyledText value={roleName(ability.type)} />{/snippet}
    {#if ability.type === 'hypnotist'}
      <div class="large-hypnotist-menu">
        <div><StyledText value={text('wiki.article.standard.roleblock.title')} /><CheckBox label={text('wiki.article.standard.roleblock.title')} checked={Boolean(ability.roleblock)} onchange={value => updateStory('roleblock', value)} /></div>
        {#each stories as [key, type]}
          {@const message = { variant: { type }, chatGroup: null }}
          <div><span class={`chat-message ${chatMessageClass(message)}`}><StyledText value={formatChatMessage(message, [], game.roleList)} /></span><CheckBox label={text(`chatMessage.${type}`)} checked={Boolean(ability[key])} onchange={value => updateStory(key, value)} /></div>
        {/each}
      </div>
    {:else if info}
      {#if ability.type === 'martyr'}<div class="role-information"><StyledText value={text('role.martyr.roleDataText.eccentric')} /></div>{/if}
      {#if info.current !== undefined}
        <Counter current={info.current} max={info.max}><StyledText value={info.message} /></Counter>
      {:else}<div class="role-information"><StyledText value={info.message} players={game.players.map(player => player.name)} /></div>{/if}
      {#if ability.type === 'mercenary'}
        <span class="chat-message"><StyledText value={formatChatMessage({ chatGroup: null, variant: { type: 'mercenaryHits', roles: ability.roles as ClientRoleState['type'][] ?? [] } }, [], game.roleList)} /></span>
      {/if}
    {/if}
  </DetailsSummary>
{/if}

<style>
  .role-information { display: flex; flex-direction: row; padding: .13rem; align-items: center; justify-content: space-between; }
  .large-hypnotist-menu { padding-top: .2rem; }
  .large-hypnotist-menu > div { margin: .2rem; display: flex; flex-direction: row; justify-content: space-between; text-align: left; align-items: center; background-color: var(--primary-color); }
  .large-hypnotist-menu > div:first-child { margin-bottom: 1rem; margin-top: 1rem; }
</style>
