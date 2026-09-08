<script lang="ts">
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import StyledText from './StyledText.svelte';
  import Select from './Select.svelte';
  import './detailsSummary.css';
  import './textAreaDropdown.css';
  let { title, value, onsave, onpost, onremove, defaultOpen = false, senders = [], draggable = false }: { title: string; value: string; onsave: (value: string) => void; onpost?: (value: string, sender: number | null) => void; onremove?: () => void; defaultOpen?: boolean; senders?: { player: number; label: string }[]; draggable?: boolean } = $props();
  let open = $state(false);
  let draft = $state('');
  let editing = $state(false);
  let sender = $state<number | null>(null);
  let area = $state<HTMLTextAreaElement>();
  $effect(() => { draft = value; });
  $effect(() => { open = defaultOpen; });
  $effect(() => { if (senders.length && !senders.some(item => item.player === sender)) sender = senders[0].player; });
  $effect(() => { draft; if (area) { area.style.height = 'auto'; area.style.height = 'calc(.25rem + ' + area.scrollHeight + 'px)'; } });
  async function edit(): Promise<void> { editing = true; await tick(); area?.focus(); }
  function post(): void { onsave(draft); onpost?.(draft, sender); }
</script>

<div class="details-summary-container text-area-dropdown">
  <div class="details-summary-summary-container" class:open role="button" tabindex="0" aria-expanded={open} onclick={() => open = !open} onkeydown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) {event.preventDefault(); open = !open;} }}>
    <Icon>{open ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}</Icon>
    <div>
      {#if draggable}<Icon>drag_handle</Icon>{/if}<span class="label-text"><StyledText value={title} /></span>
      <span role="presentation" onclick={event => event.stopPropagation()} onkeydown={event => event.stopPropagation()}>
        {#if onremove}<button class="button flush" aria-label="Delete" onclick={onremove}><Icon>delete</Icon></button>{/if}
        <button class="button flush" class:highlighted={draft !== value} aria-label="Save" onclick={() => onsave(draft)}><Icon>save</Icon></button>
        {#if senders.length > 1}<Select value={sender ?? senders[0].player} options={senders.map(item => ({value: item.player, label: item.label}))} onchange={value => sender = value} label="Post as" />{/if}
        <button class="button flush" disabled={!onpost} aria-label="Post" onclick={post}><Icon>send</Icon></button>
      </span>
    </div>
  </div>
  {#if open}
    {#if draft !== value}Unsaved{/if}
    <div class="pretty-text-area">
      {#if editing}<textarea bind:this={area} class="textarea" aria-label={title} bind:value={draft} onblur={() => editing = false} onkeydown={event => { if (event.ctrlKey && event.key === 's') {event.preventDefault(); onsave(draft);} else if (event.ctrlKey && event.key === 'Enter') post(); }}></textarea>
      {:else}<div class="textarea" role="textbox" aria-label={title} tabindex="0" onfocus={edit} onclick={edit} onkeydown={edit}><StyledText value={draft} noLinks /></div>{/if}
    </div>
  {/if}
</div>
