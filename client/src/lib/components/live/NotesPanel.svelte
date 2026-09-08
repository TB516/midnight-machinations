<script lang="ts">
  import TextDropdown from '../TextDropdown.svelte';
  import Icon from '../Icon.svelte';
  import { text } from '$lib/live/format';
  import type { GameState } from '$lib/game/state';
  import { roleData } from '$lib/game/roles';

  interface PostSender {
    player: number;
    label: string;
  }

  interface Props {
    state: GameState;
    postSenders: PostSender[];
    onSaveWill: (will: string) => void;
    onSaveNotes: (notes: string[]) => void;
    onSaveCallingCard: (callingCard: string | null) => void;
    onPost: (text: string, player: number | null) => void;
  }

  let { state: game, postSenders, onSaveWill, onSaveNotes, onSaveCallingCard, onPost }: Props = $props();

  let client = $derived(game.client.type === 'player' ? game.client : null);
  let savedWill = $derived.by(() => {
    if (!client) return '';
    const controller = client.controllers.find(([id, value]) =>
      id.type === 'alibi' && value.selection.type === 'string'
    );
    if (!controller || controller[1].selection.type !== 'string') return '';
    return controller[1].selection.selection;
  });
  let canWriteCallingCard = $derived(client?.myRole ? roleData[client.myRole].canWriteCallingCard : false);
  let canPostOwn = $derived(
    client?.myIndex !== null && client?.myIndex !== undefined &&
    postSenders.some((sender) => sender.player === client.myIndex)
  );
  let canPostNote = $derived(postSenders.length > 0);

  let willDraft = $state('');
  let noteDrafts = $state<string[]>([]);
  let callingCardDraft = $state('');
  let lastSaved = $state('');
  let notePosters = $state<Record<number, number>>({});

  $effect(() => {
    willDraft = savedWill;
  });

  $effect(() => {
    noteDrafts = client?.notes.slice() ?? [];
  });

  $effect(() => {
    callingCardDraft = client?.callingCard ?? '';
  });

  function reportSaved(label: string): void {
    lastSaved = label;
    window.setTimeout(() => {
      if (lastSaved === label) lastSaved = '';
    }, 1_600);
  }

  function saveWill(): void {
    onSaveWill(willDraft);
    reportSaved('Alibi saved');
  }

  function saveNotes(next = noteDrafts): void {
    noteDrafts = next;
    onSaveNotes(next);
    reportSaved('Notes saved');
  }

  function updateNote(index: number, value: string): void {
    const next = noteDrafts.slice();
    next[index] = value;
    noteDrafts = next;
  }

  function addNote(): void {
    saveNotes([...noteDrafts, `Note ${noteDrafts.length + 1}`]);
  }

  function removeNote(index: number): void {
    saveNotes(noteDrafts.filter((_, noteIndex) => noteIndex !== index));
  }

  function moveNote(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= noteDrafts.length) return;
    const next = noteDrafts.slice();
    [next[index], next[target]] = [next[target], next[index]];
    saveNotes(next);
  }

  function saveCallingCard(): void {
    onSaveCallingCard(callingCardDraft.trim() || null);
    reportSaved('Calling card saved');
  }

  function notePoster(index: number): number | null {
    const selected = notePosters[index];
    if (postSenders.some((sender) => sender.player === selected)) return selected;
    return postSenders[0]?.player ?? null;
  }

  function postWill(): void {
    saveWill();
    onPost(willDraft, client?.myIndex ?? null);
  }

  function postCallingCard(): void {
    saveCallingCard();
    onPost(callingCardDraft, client?.myIndex ?? null);
  }

  function postNote(index: number, note: string): void {
    saveNotes();
    onPost(note, notePoster(index));
  }

  let draggingNote = $state<number | null>(null);
</script>

<div class="will-menu will-menu-colors">
  {#if client}
    <section>
      <TextDropdown title={text('menu.will.will')} value={savedWill} onsave={onSaveWill} onpost={canPostOwn ? value => onPost(value, client?.myIndex ?? null) : undefined} defaultOpen />
      {#if canWriteCallingCard}<TextDropdown title={text('menu.will.callingCard')} value={client.callingCard ?? ''} onsave={value => onSaveCallingCard(value || null)} onpost={canPostOwn ? value => onPost(value, client?.myIndex ?? null) : undefined} />{/if}
      <span>{text('menu.will.notes.icon')} {text('menu.will.notes')}</span>
      {#each client.notes.length ? client.notes : [''] as note, index}
        <div class="draggable" draggable="true" role="group" aria-label={'Note ' + (index + 1)} ondragstart={() => draggingNote = index} ondragover={event => event.preventDefault()} ondrop={event => {event.preventDefault(); if (draggingNote === null) return; const notes = [...(client?.notes ?? [])]; const [value] = notes.splice(draggingNote, 1); notes.splice(index, 0, value); onSaveNotes(notes); draggingNote = null;}} ondragend={() => draggingNote = null}>
          <TextDropdown title={note.split('\n')[0] || text('menu.will.notes')} value={note} onsave={value => { const notes = [...(client?.notes ?? [])]; notes[index] = value; onSaveNotes(notes); }} onpost={canPostNote ? (value, sender) => onPost(value, sender ?? client?.myIndex ?? null) : undefined} onremove={() => removeNote(index)} senders={postSenders} draggable />
        </div>
      {/each}
      <button class="button flush" aria-label="Add note" onclick={addNote}><Icon>add</Icon></button>
    </section>
  {/if}
</div>
