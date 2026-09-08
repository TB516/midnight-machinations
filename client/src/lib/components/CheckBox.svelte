<script lang="ts">
  import Icon from './Icon.svelte';
  let { checked, onchange, label }: { checked: boolean; onchange: (checked: boolean) => void; label: string } = $props();
</script>

<button type="button" class="checkbox" role="checkbox" aria-checked={checked} aria-label={label} onclick={() => onchange(!checked)}><Icon>{checked ? 'check' : 'close'}</Icon></button>

<style>
  button.checkbox { display: inline-flex; background-color: var(--secondary-color); border: .13rem solid var(--primary-border-color); border-radius: .2rem; padding: 0; margin: .25rem 0 0; }
</style>
