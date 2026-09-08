<script lang="ts">
  import type { Snippet } from 'svelte';
  let { max, current, children }: { max: number; current: number; children: Snippet } = $props();
</script>

<div class="counter">
  <div>{@render children()}</div>
  <div class="counter-count" aria-label={`${current} / ${max}`}>
    {#each Array.from({ length: Math.max(max, current) }) as _, index}
      <div class="counter-circle" class:counter-circle-empty={index >= current}></div>
    {/each}
  </div>
</div>

<style>
  .counter { display: flex; flex-direction: row; justify-content: space-between; align-items: center; padding: 0 .13rem; }
  .counter-count { display: flex; flex-direction: row; align-items: center; gap: .25rem; }
  .counter-circle { width: 1em; height: 1em; border-radius: .5em; background-color: var(--focus-outline-color); border: .13rem solid var(--primary-border-color); border-bottom-color: var(--primary-border-shadow-color); border-right-color: var(--primary-border-shadow-color); }
  .counter-circle-empty { background: var(--secondary-color); }
</style>
