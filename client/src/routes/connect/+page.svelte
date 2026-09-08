<script lang="ts">
  import { page } from '$app/state';
  import LobbyBrowser from '$lib/components/live/LobbyBrowser.svelte';

  let invitedCode = $derived(page.url.searchParams.get('code') ?? '');
</script>

<svelte:head>
  <title>Join a room | Midnight Machinations</title>
  <meta
    name="description"
    content="Join a Midnight Machinations room from an invite link or room code."
  />
</svelte:head>

<LobbyBrowser initialCode={invitedCode} autoJoin />
