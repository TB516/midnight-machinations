<script lang="ts">
  import Icon from '../Icon.svelte';
  import StyledText from '../StyledText.svelte';
  import Select from '../Select.svelte';
  import DetailsSummary from '../DetailsSummary.svelte';
  import GraveCard from './Grave.svelte';
  import '../chatMenu.css';
  import '../chatMessage.css';
  import { tick } from 'svelte';
  import type { ChatGroup, ChatMessage, ChatMessageIndex } from '$lib/game/chat';
  import type { RoleList } from '$lib/game/role-list';
  import { chatMessageClass, chatTone, formatChatMessage, playerName, roleName, replaceMentions, text } from '$lib/live/format';

  interface ChatSenderOption {
    player: number;
    label: string;
    canPubliclyChat: boolean;
    whisperTargets: number[];
  }

  interface Props {
    messages: Array<[ChatMessageIndex, ChatMessage]>;
    players: string[];
    roleList: RoleList;
    twoThirdsMajority?: boolean;
    canSend?: boolean;
    lobby?: boolean;
    embedded?: boolean;
    myIndex?: number | null;
    senders?: ChatSenderOption[];
    sendingAs?: number | null;
    whisperTargets?: number[];
    whisperTo?: number | null;
    onSend?: (message: string, whisperTo: number | null, sendingAs: number | null) => void;
    onForward?: (messageIndex: ChatMessageIndex) => void;
  }

  let {
    messages,
    players,
    roleList,
    twoThirdsMajority = false,
    canSend = false,
    lobby = false,
    embedded = false,
    myIndex = null,
    senders = [],
    sendingAs = $bindable(null),
    whisperTargets = [],
    whisperTo = $bindable(null),
    onSend,
    onForward
  }: Props = $props();

  let message = $state('');
  let groupFilter = $state<ChatGroup | 'allGroups'>('allGroups');
  let query = $state('');
  let history = $state<string[]>([]);
  let historyIndex = $state(-1);
  let feed: HTMLDivElement;

  let normalizedQuery = $derived(query.trim().toLocaleLowerCase('en-US'));
  let visibleMessages = $derived(messages.filter(([, item]) => {
    if (groupFilter !== 'allGroups' && item.chatGroup !== groupFilter) return false;
    if (normalizedQuery === '') return true;
    return formatChatMessage(item, players, roleList, { twoThirdsMajority }).toLocaleLowerCase('en-US').includes(normalizedQuery);
  }));
  let groups = $derived([...new Set(messages.map(([, item]) => item.chatGroup).filter((group): group is ChatGroup => group !== null))]);
  let activeSender = $derived(senders.find((sender) => sender.player === sendingAs) ?? null);
  let activeWhisperTargets = $derived(activeSender?.whisperTargets ?? whisperTargets);
  let composerEnabled = $derived(senders.length > 0 ? activeSender !== null : canSend);
  let canPubliclyChat = $derived(activeSender?.canPubliclyChat ?? canSend);

  $effect(() => {
    if (senders.length > 0 && !senders.some((sender) => sender.player === sendingAs)) {
      sendingAs = senders[0]?.player ?? null;
      return;
    }
    if (whisperTo !== null && !activeWhisperTargets.includes(whisperTo)) {
      whisperTo = canPubliclyChat ? null : activeWhisperTargets[0] ?? null;
      return;
    }
    if (whisperTo === null && !canPubliclyChat && activeWhisperTargets.length > 0) {
      whisperTo = activeWhisperTargets[0];
    }
  });

  $effect(() => {
    messages.length;
    void tick().then(() => {
      if (feed && feed.scrollHeight - feed.scrollTop - feed.clientHeight < 180) {
        feed.scrollTop = feed.scrollHeight;
      }
    });
  });

  function submit(): void {
    const trimmed = message.trim();
    if (!trimmed || !onSend) return;
    onSend(trimmed, whisperTo, sendingAs);
    whisperTo = null;
    history = [trimmed, ...history.filter((item) => item !== trimmed)].slice(0, 40);
    historyIndex = -1;
    message = '';
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === 'ArrowUp' && message.split('\n').length === 1) {
      event.preventDefault();
      historyIndex = Math.min(historyIndex + 1, history.length - 1);
      message = history[historyIndex] ?? message;
      return;
    }
    if (event.key === 'ArrowDown' && historyIndex >= 0) {
      event.preventDefault();
      historyIndex -= 1;
      message = historyIndex < 0 ? '' : history[historyIndex] ?? '';
      return;
    }
    if (event.key === 'Escape') {
      whisperTo = null;
    }
  }

  async function copy(textToCopy: string): Promise<void> {
    await navigator.clipboard.writeText(textToCopy);
  }
</script>
<div class="chat-menu" class:chat-menu-colors={!embedded} class:lobby class:embedded>
  {#if query}
    <div class="chat-filter-zone highlighted"><StyledText value={query} {players} /><button class="button highlighted" aria-label="Clear filter" onclick={() => query = ''}><Icon>filter_alt_off</Icon></button></div>
  {/if}
  <div class="chat-message-section" bind:this={feed} role="log" aria-live="polite" aria-relevant="additions">
    <div class="chat-message-list">
      {#each visibleMessages as [index, item] (index)}
        {@const rendered = formatChatMessage(item, players, roleList, { twoThirdsMajority })}
        {@const groupIcon = item.chatGroup === 'all' ? '' : item.chatGroup === null ? text('noGroup.icon') : text('chatGroup.' + item.chatGroup + '.icon')}
        <div class="chat-message-div">
          {#if item.variant.type === 'playerDied'}
            {@const grave = item.variant.grave}
            <DetailsSummary open={myIndex === null && !lobby && !embedded}>
              {#snippet summary()}<span class={'chat-message ' + chatMessageClass(item)}><StyledText value={text('chatMessage.playerDied', players[grave.player], grave.information.type === 'normal' ? roleName(grave.information.role) : text('obscured'))} {players} {myIndex} /></span>{/snippet}
              <GraveCard {grave} {players} {roleList} />
            </DetailsSummary>
          {:else}
          <span class={'chat-message ' + chatMessageClass(item)} class:player={item.variant.type === 'normal'} class:block={item.variant.type === 'normal' && item.variant.block} class:dead={item.variant.type === 'normal' && item.chatGroup === 'dead'}>
            {#if item.variant.type === 'normal'}
              {@const sender = item.variant.messageSender}
              {@const senderName = sender.type === 'player' || sender.type === 'livingToDead' ? players[sender.player] : roleName(sender.type)}
              <StyledText value={groupIcon + (sender.type === 'livingToDead' ? text('messageSender.livingToDead.icon') : '') + ' ' + senderName + ': '} {players} {myIndex} sender /><StyledText value={replaceMentions(item.variant.text, players, roleList)} {players} {myIndex} />
            {:else if item.variant.type === 'lobbyMessage'}
              <span class="keyword-player-sender">{item.variant.sender}</span>: <StyledText value={replaceMentions(item.variant.text, players, roleList)} />
            {:else}<StyledText value={groupIcon + ' ' + rendered} {players} {myIndex} />{/if}
          </span>
          <div class="chat-message-div-small-button-div">
            <button class="button chat-message-div-small-button" aria-label="Copy message" onclick={() => copy(rendered)}><Icon>content_copy</Icon></button>
            {#if onForward}<button class="button chat-message-div-small-button material-symbols-rounded" aria-label="Forward message" onclick={() => onForward?.(index)}>forward</button>{/if}
          </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
  {#if (composerEnabled || lobby) && onSend}
    <div class="chat-menu-chat-controller">
      {#if activeSender}
        <div class="chat-menu-icons">
          {#if !canPubliclyChat}{text('noAll.icon')}{:else}{text('chatGroup.all.icon')}{/if}
          {#if senders.length > 1}<Select value={sendingAs ?? senders[0].player} options={senders.map(sender => ({value: sender.player, label: sender.label}))} onchange={value => sendingAs = value} label="Speak as" />
          {:else}<StyledText value={activeSender.label} {players} />{/if}
        </div>
      {/if}
      {#if whisperTo !== null}
        <div class="chat-whisper-notification discreet">
          <StyledText value={text('playerIsWhisperingToPlayer', activeSender?.label ?? '', playerName(players, whisperTo))} {players} />
          <button class="button highlighted" onclick={() => whisperTo = null}>{text('cancelWhisper')}</button>
        </div>
      {/if}
      <div class="chat-send-section">
        <textarea aria-label="Message" bind:value={message} disabled={lobby && !canSend} onkeydown={handleKeydown} placeholder={text('menu.chat.placeHolder')}></textarea>
        <button class="button flush" aria-label={text('menu.chat.button.send')} disabled={!canPubliclyChat && whisperTo === null} onclick={submit}><Icon>send</Icon></button>
      </div>
    </div>
  {/if}
</div>
<style>
  .chat-menu { display: flex; flex-direction: column; height: calc(100% - 1.75rem); min-height: 0; }
  .chat-menu.lobby { height: auto; }
  .chat-menu.embedded { height: auto; overflow: visible; }
  .lobby > .chat-message-section { height: 20em; overflow: auto; flex: auto; border-bottom: .13rem solid var(--primary-border-color); }
  .chat-message-section { min-height: 0; flex: 1; display: flex; flex-direction: column; }
  .chat-message-list { margin-top: auto; }
  .chat-message-div-small-button-div { display: none; }
  .chat-message-div:hover .chat-message-div-small-button-div, .chat-message-div:focus-within .chat-message-div-small-button-div { display: block; }
</style>
