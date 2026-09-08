<script lang="ts">
  import GameModeEditor from '$lib/components/GameModeEditor.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Shared game mode | Midnight Machinations</title>
  <meta
    name="description"
    content="Review and save a Midnight Machinations game mode shared by another player."
  />
  <meta name="robots" content="noindex" />
</svelte:head>

{#if data.sharedMode}
  <GameModeEditor initialGameMode={data.sharedMode} />
{:else}
  <section class="invalid-link panel-card">

    <h2>This link does not contain a supported game mode.</h2>
    <p>{data.importError}</p>
    <a class="button primary" href="/game-modes">Open the game mode editor</a>
  </section>
{/if}



<style>
  .invalid-link {
    max-width: 48rem;
    margin-bottom: 6rem;
    padding: .25rem .5rem;
  }

  .invalid-link h2 {
    font-size: 1.25rem;
  }

  .invalid-link .button {
    margin-top: 1rem;
  }
</style>
