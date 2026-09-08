<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children, size = 'normal' }: { children: Snippet; size?: 'normal' | 'small' | 'tiny' } = $props();
</script>

<span class="material-symbols-rounded" class:icon={size === 'normal'} class:icon-small={size === 'small'} class:icon-tiny={size === 'tiny'} aria-hidden="true">{@render children()}</span>
