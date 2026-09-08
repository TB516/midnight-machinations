<script lang="ts">
  import Icon from './Icon.svelte';
  import './flushInput.css';
  let { value = $bindable(''), label, class: className = '', onconfirm }: { value?: string; label: string; class?: string; onconfirm?: (value: string) => void } = $props();
  let input: HTMLInputElement;
  let focused = $state(false);
  let width = $state(50);
  $effect(() => {
    value;
    if (!input) return;
    const style = getComputedStyle(input);
    const measure = document.createElement('span');
    Object.assign(measure.style, { fontSize: style.fontSize, fontFamily: style.fontFamily, fontWeight: style.fontWeight, whiteSpace: 'pre' });
    measure.textContent = value;
    document.body.appendChild(measure);
    width = measure.getBoundingClientRect().width;
    measure.remove();
  });
</script>

<div class="flush-input-container">
  <input bind:this={input} class={`flush-input ${className}`} type="text" aria-label={label} bind:value style:width={width + 'px'} onfocus={() => focused = true} onblur={() => { focused = false; onconfirm?.(value); }} onkeydown={event => { if (event.key === 'Enter') onconfirm?.(value); }} />
  {#if !focused}<button class="flush-input-button" aria-label={'Edit ' + label} onclick={() => { input.focus(); input.select(); }}><Icon>edit</Icon></button>{/if}
</div>
