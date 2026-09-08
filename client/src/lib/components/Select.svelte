<script lang="ts" generics="T extends string | number">
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import StyledText from './StyledText.svelte';
  import './select.css';
  let { value, options, onchange, disabled = false, label, hideArrow = false, class: className = '', noCloseOnKeyboardSelect = false }: { value: T; options: { value: T; label: string; icon?: string }[]; onchange: (value: T) => void; disabled?: boolean; label?: string; hideArrow?: boolean; class?: string; noCloseOnKeyboardSelect?: boolean } = $props();
  let open = $state(false);
  let query = $state('');
  let index = $state(0);
  let button: HTMLButtonElement;
  let popup: HTMLDivElement;
  let results = $derived(query === '' ? options : options.filter(option => query.toLowerCase().split(' ').every(word => option.label.toLowerCase().includes(word))).sort((a, b) => String(a.value).length - String(b.value).length));
  let shown = $derived(results.length ? results : options);
  let selected = $derived(options.find(option => option.value === value)?.label ?? String(value));
  let selectedIcon = $derived(options.find(option => option.value === value)?.icon);

  async function toggle(next: boolean): Promise<void> {
    open = next;
    query = '';
    index = 0;
    if (!open) { popup?.hidePopover(); return; }
    await tick();
    popup.showPopover();
    place();
  }

  function place(): void {
    if (!open || !button || !popup) return;
    const bounds = button.getBoundingClientRect();
    const rem = parseFloat(getComputedStyle(button).fontSize);
    const below = innerHeight - bounds.bottom;
    popup.style.width = bounds.width + 'px';
    popup.style.left = bounds.left + 'px';
    popup.style.top = bounds.top > below ? 'auto' : bounds.bottom + rem * .25 + 'px';
    popup.style.bottom = bounds.top > below ? below + bounds.height + rem * .25 + 'px' : 'auto';
    popup.style.maxHeight = Math.min(24.75 * rem, Math.max(below, bounds.top) - .25 * rem) + 'px';
    const right = popup.getBoundingClientRect().right;
    if (right > innerWidth) popup.style.left = Math.max(0, bounds.left - (right - innerWidth)) + 'px';
  }

  function choose(option: T): void { onchange(option); void toggle(false); button.focus(); }

  async function keydown(event: KeyboardEvent): Promise<void> {
    if (event.key === 'Tab') { void toggle(false); return; }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    if (event.key === 'Escape') { event.stopPropagation(); void toggle(false); return; }
    if (!open && ['Enter', 'ArrowDown', ' '].includes(event.key)) { await toggle(true); return; }
    if (event.key === 'Enter') { if (results[index]) { if (noCloseOnKeyboardSelect) { onchange(results[index].value); query = ''; index = 0; } else choose(results[index].value); } return; }
    if (event.key === 'ArrowDown') index = Math.min(index + 1, results.length - 1);
    else if (event.key === 'ArrowUp') index = Math.max(0, index - 1);
    else if (event.key === 'Backspace') { query = query.slice(0, -1); index = 0; }
    else if (/^[a-zA-Z0-9- ]$/.test(event.key)) { if (!open) await toggle(true); query += event.key; index = 0; }
    await tick();
    popup?.querySelector('.fauxcus-visible')?.scrollIntoView({ block: 'nearest' });
    place();
  }
</script>

<svelte:window onresize={place} />
<button bind:this={button} class="button custom-select {className}" {disabled} aria-label={label} aria-haspopup="listbox" aria-expanded={open} onclick={() => toggle(!open)} onkeydown={keydown}>
  {#if !hideArrow}<Icon>{open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</Icon>{/if}{#if selectedIcon}<Icon>{selectedIcon}</Icon>{/if}<StyledText value={selected} noLinks />
</button><div bind:this={popup} popover="auto" class="custom-select-options-popover" ontoggle={(event) => { if (event.newState === 'closed') open = false; }}>
  <div>
    {#if query}🔎<span>{query.slice(0, 20)}</span>{/if}
    <div class="custom-select-options"><div role="listbox" aria-label={label}>
      {#each shown as option, i (option.value)}
        <button class="button" class:fauxcus-visible={i === index} role="option" aria-selected={option.value === value} onclick={() => choose(option.value)}>{#if option.icon}<Icon>{option.icon}</Icon>{/if}<StyledText value={option.label} noLinks /></button>
      {/each}
    </div></div>
  </div>
</div>

<style>
  .custom-select-options-popover { position: fixed; margin: 0; }
  .custom-select-options-popover:popover-open { display: block; }
</style>
