<script lang="ts">
  import { stylePlayerText } from '$lib/live/keywords';
  let { value, noLinks = false, players = [], sender = false, myIndex = null }: { value: string; noLinks?: boolean; players?: string[]; sender?: boolean; myIndex?: number | null } = $props();
  let html = $derived(stylePlayerText(value, players, noLinks, sender, myIndex).replaceAll('\n', '<br>'));
</script>

<!-- styleText escapes all input before adding the bundled keyword markup. -->
<span>{@html html}</span>
