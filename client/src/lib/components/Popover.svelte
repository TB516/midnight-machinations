<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  let { trigger, children }: { trigger: Snippet<[(event: MouseEvent) => void]>; children: Snippet } = $props();
  let popup: HTMLDivElement;
  async function toggle(event: MouseEvent): Promise<void> {
    if (popup.matches(':popover-open')) { popup.hidePopover(); return; }
    const anchor = event.currentTarget as HTMLElement;
    popup.showPopover();
    await tick();
    const rect = anchor.getBoundingClientRect();
    popup.style.left = Math.max(0, Math.min(rect.left, innerWidth - popup.offsetWidth)) + 'px';
    if (rect.top > innerHeight - rect.bottom) { popup.style.top = 'auto'; popup.style.bottom = innerHeight - rect.top + 4 + 'px'; }
    else { popup.style.top = rect.bottom + 4 + 'px'; popup.style.bottom = 'auto'; }
  }
</script>

{@render trigger(toggle)}<div class="popover" bind:this={popup} popover="auto">{@render children()}</div>

<style>
  .popover:popover-open { display: block; }
  .popover { position: fixed; margin: 0; padding: .13rem; min-width: max-content; max-width: 100vw; max-height: 25rem; overflow: auto; color: var(--text-color); background: var(--background-color); border: .13rem solid var(--primary-border-color); border-radius: .25rem; }
</style>
