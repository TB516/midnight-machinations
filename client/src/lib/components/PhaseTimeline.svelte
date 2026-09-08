<script lang="ts">
  import { tick } from 'svelte';
  import { text } from '$lib/live/format';
  import type { PhaseTimeSettings } from '$lib/game/phases';
  import './phaseTimeSelector.css';
  type Phase = keyof PhaseTimeSettings;
  let { times, noTrial = false, disabled = false, onchange }: { times: PhaseTimeSettings; noTrial?: boolean; disabled?: boolean; onchange: (phase: Phase, seconds: number) => void } = $props();
  const colours: Record<Phase, string> = { briefing: '#725548', dusk: '#5b4292', night: '#430752', discussion: '#5058ce', obituary: '#352d56', nomination: '#42853c', adjournment: '#2b8599', testimony: '#a89225', judgement: '#613f26', finalWords: '#971111' };
  const trial: Phase[] = ['nomination', 'adjournment', 'nomination', 'adjournment', 'nomination', 'testimony', 'judgement', 'finalWords'];
  let order = $derived<Phase[]>(['briefing', 'dusk', 'night', 'obituary', 'discussion', ...(noTrial ? [] : trial)]);
  let total = $derived(order.reduce((sum, phase) => sum + times[phase], 0));
  let phase = $state<Phase>('briefing');
  let popup: HTMLDivElement;
  let input = $state<HTMLInputElement>();
  let anchor: HTMLButtonElement;
  let editing = $state(false);
  let drag: { phase: Phase; y: number; value: number } | null = null;

  async function show(event: Event, selected: Phase, edit: boolean): Promise<void> {
    if (editing && !edit) return;
    phase = selected;
    anchor = event.currentTarget as HTMLButtonElement;
    editing = edit && !disabled;
    await tick();
    const bounds = anchor.getBoundingClientRect();
    popup.style.left = bounds.left + 'px';
    popup.style.top = bounds.bottom + 4 + 'px';
    popup.showPopover();
    if (editing) { input?.focus(); input?.select(); }
  }
  function change(value: number): void { if (Number.isInteger(value) && value >= 0 && value <= 1000) onchange(phase, value); }
</script>

<svelte:window onpointermove={event => { if (drag) onchange(drag.phase, Math.max(0, Math.min(1000, drag.value - Math.floor((event.clientY - drag.y) / 10)))); }} onpointerup={() => drag = null} />
<section class="phase-times-selector will-menu-colors selector-section">
  <div class="phase-times-visualizer"><div class="phase-times-visualizer-scroll">
    {#each order as selected, index (index)}
      <button style:width={(times[selected] / (total || 1) * 100) + '%'} style:background-color={colours[selected]} onpointerdown={event => { if (!disabled && event.pointerType === 'mouse') drag = { phase: selected, y: event.clientY, value: times[selected] }; }} onclick={event => show(event, selected, true)} onmouseenter={event => show(event, selected, false)} onmouseleave={() => { if (!editing) popup.hidePopover(); }} onfocus={event => show(event, selected, false)} onblur={() => { if (!editing) popup.hidePopover(); }}>{text('phase.' + selected)}</button>
    {/each}
  </div></div>
</section>
<div class="phase-popover will-menu-colors" bind:this={popup} popover="auto" ontoggle={event => { if (event.newState === 'closed') editing = false; }}>
  <div>{text('phase.' + phase)}: {#if editing}<input bind:this={input} class="phase-time-input" aria-label={text('phase.' + phase)} type="number" value={times[phase]} oninput={event => change(event.currentTarget.valueAsNumber)} onkeydown={event => { if (event.key === 'Enter') popup.hidePopover(); }} />{:else}{times[phase]}{/if}</div>
</div>

<style>
  .phase-popover { position: fixed; margin: 0; padding: .25rem; border: .13rem solid var(--primary-border-color); border-radius: .25rem; background: var(--background-color); color: var(--text-color); }
</style>
