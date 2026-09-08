<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import './detailsSummary.css';
  let { summary, children, open = $bindable(false) }: { summary: string | Snippet; children: Snippet; open?: boolean } = $props();
</script>

<div class="details-summary-container">
  <div class="details-summary-summary-container" role="button" tabindex="0" class:open aria-expanded={open} onclick={() => open = !open} onkeydown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) {event.preventDefault(); open = !open;} }}><Icon>{open ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}</Icon>{#if typeof summary === 'string'}{summary}{:else}{@render summary()}{/if}</div>
  {#if open}{@render children()}{/if}
</div>
