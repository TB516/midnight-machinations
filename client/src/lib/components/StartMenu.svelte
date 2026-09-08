<script lang="ts">
  import { SITE_NAME } from '$lib';
  import { goto } from '$app/navigation';
  import { overlays } from './overlays.svelte';
</script>


<div class="sm">
  <header>
    <h1><span><span class="keyword-title glitch" data-text={SITE_NAME}>{SITE_NAME}</span></span></h1>
  </header>

  <main>
    <div class="satellite">
    <div class="left">
      <button class="button brand" onclick={() => goto('/play')}><span class="material-symbols-rounded icon" aria-hidden="true">play_arrow</span> Play</button>
      <button class="button" onclick={() => overlays.card = 'settings'}><span class="material-symbols-rounded icon" aria-hidden="true">settings</span> Settings</button>
    </div>
    <div class="center"></div>
    <div class="right">
      <button class="button" onclick={() => overlays.card = 'game-modes'}><span class="material-symbols-rounded icon" aria-hidden="true">edit</span> Game Mode Editor</button>
      <button class="button" onclick={() => goto('/wiki')}><span class="material-symbols-rounded icon" aria-hidden="true">menu_book</span> Midnight Manual</button>
    </div>
    </div>
  </main>

  <footer>
    <a class="button" href="https://www.github.com/ItsSammyM/mafia-rust">Github</a>
    <button class="button" onclick={() => window.open('https://discord.gg/Vxw7gFPfJj', '_blank', 'noopener,noreferrer')}><span class="material-symbols-rounded icon" aria-hidden="true">public</span> Discord</button>
    <button class="button" onclick={() => goto('/credits')}>Credits</button>
    <a class="button" href="https://mafia.dev.jackpapel.com">Dev (Experimental)</a>
  </footer>
</div>
