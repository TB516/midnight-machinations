<script lang="ts">
  import { SITE_DESCRIPTION, SITE_NAME } from '$lib';
  import StartMenu from '$lib/components/StartMenu.svelte';
</script>

<svelte:head>
  <title>{SITE_NAME}</title>
  <meta name="description" content={SITE_DESCRIPTION} />
</svelte:head>

<StartMenu />
