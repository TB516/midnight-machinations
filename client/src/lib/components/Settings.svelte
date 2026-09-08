<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { LANGUAGES, clearApplicationStorage, defaultSettings, languageNames, loadSettings, saveSettings, type MenuId, type Settings } from '$lib/game-modes';
  import { setLanguage, text } from '$lib/live/format';
  import Icon from '$lib/components/Icon.svelte';
  import { overlays } from './overlays.svelte';
  import CheckBox from '$lib/components/CheckBox.svelte';
  import '$lib/components/settings.css';

  const menus: Record<MenuId, [string, string, string]> = {
    WikiMenu: ['📖', 'wiki-menu-colors', 'Wiki'],
    GraveyardMenu: ['⚙️', 'graveyard-menu-colors', 'Game Mode'],
    PlayerListMenu: ['🕵🏾', 'player-list-menu-colors', 'Players'],
    ChatMenu: ['💬', 'chat-menu-colors', 'Chat'],
    WillMenu: ['📜', 'will-menu-colors', 'Alibi'],
    RoleSpecificMenu: ['🔎', 'role-specific-colors', 'Abilities']
  };
  let settings = $state<Settings>(defaultSettings(false));
  let fontSize = $state(1);
  let maxMenus = $state(6);
  let draggedMenu = $state<number | null>(null);

  onMount(() => {
    settings = loadSettings(localStorage, window.innerWidth < 600);
    fontSize = settings.fontSize;
    maxMenus = settings.maxMenus;
  });

  function update<K extends keyof Settings>(key: K, value: Settings[K]): void {
    settings = { ...settings, [key]: value };
    saveSettings(localStorage, settings);
    window.dispatchEvent(new Event('settingschange'));
    setLanguage(settings.language);
    document.documentElement.style.fontSize = settings.fontSize + 'em';
    document.body.dataset.accessibleFont = String(settings.accessibilityFont);
  }

  function toggleMenu(index: number): void {
    update('menuOrder', settings.menuOrder.map((entry, i) => [entry[0], i === index ? !entry[1] : entry[1]]));
  }

  function dropMenu(index: number): void {
    if (draggedMenu === null) return;
    const order = [...settings.menuOrder];
    const [entry] = order.splice(draggedMenu, 1);
    order.splice(index, 0, entry);
    draggedMenu = null;
    update('menuOrder', order);
  }

  function eraseData(): void {
    if (!window.confirm(text('confirmDelete'))) return;
    clearApplicationStorage(localStorage);
    overlays.card = null;
    void goto('/');
  }
</script>


<div class="settings-menu-card">
  <header><h2><Icon size="tiny">settings</Icon> {text('menu.settings.title')}</h2></header>
  <main class="settings-menu">
    <div class="graveyard-menu-colors">
      <section class="player-list-menu-colors">
        <h2>{text('menu.settings.defaultName')}</h2>
        <input type="text" aria-label={text('menu.settings.defaultName')} value={settings.defaultName ?? ''} placeholder={text('menu.lobby.field.namePlaceholder')} oninput={(event) => update('defaultName', event.currentTarget.value || null)} />
      </section>
      <section>
        <div class="settings-volume-container"><Icon>volume_up</Icon><input class="settings-volume" aria-label="Volume" type="range" min="0" max="1" step="0.01" value={settings.volume} oninput={(event) => update('volume', event.currentTarget.valueAsNumber)} /></div>
      </section>
      <section class="wiki-menu-colors">
        <div class="settings-language-container">
          <Icon>language</Icon>
          <select name="lang-select" aria-label="Language" value={settings.language} onchange={(event) => update('language', event.currentTarget.value as Settings['language'])}>
            {#each LANGUAGES as language}<option value={language}>{languageNames[language]}</option>{/each}
          </select>
        </div>
        <label>{text('menu.settings.fontSize')}<input type="number" min="0.5" max="2" step="0.1" bind:value={fontSize} onblur={() => { if (!(fontSize >= 0.5 && fontSize <= 2)) fontSize = 1; update('fontSize', fontSize); }} /></label>
        <div class="setting-label">{text('menu.settings.accessibilityFont')} <CheckBox label={text('menu.settings.accessibilityFont')} checked={settings.accessibilityFont} onchange={(checked) => update('accessibilityFont', checked)} /></div>
      </section>
    </div>
    <div class="chat-menu-colors">
      <section>
        <div class="menu-order">
          {text('menu.settings.menuOrder')}
          <div class="menu-list">
            {#each settings.menuOrder as [id, visible], index (id)}
              <div class="draggable" draggable="true" role="group" aria-label={menus[id][2]} ondragstart={() => draggedMenu = index} ondragover={(event) => event.preventDefault()} ondrop={(event) => { event.preventDefault(); dropMenu(index); }} ondragend={() => draggedMenu = null}>
                <button class="button placard {menus[id][1]}" class:highlighted={visible} aria-label={menus[id][2]} aria-pressed={visible} onclick={() => toggleMenu(index)} onkeydown={(event) => { if (!event.altKey) return; const target = index + (event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0); if (target < 0 || target >= settings.menuOrder.length || target === index) return; event.preventDefault(); draggedMenu = index; dropMenu(target); }}>{menus[id][0]}</button>
              </div>
            {/each}
          </div>
        </div>
        <label>{text('menu.settings.maxMenus')}<input type="number" min="1" max="6" step="1" bind:value={maxMenus} onblur={() => { if (!Number.isInteger(maxMenus) || maxMenus < 1 || maxMenus > 6) maxMenus = 6; update('maxMenus', maxMenus); }} /></label>
        <div class="setting-label">{text('menu.settings.enableHeader')} <CheckBox label={text('menu.settings.enableHeader')} checked={settings.headerEnabled ?? true} onchange={(checked) => update('headerEnabled', checked)} /></div>
      </section>
      <section class="role-specific-colors">
        <h2><span class="keyword-evil">{text('menu.settings.dangerZone')}</span></h2>
        <button class="button" onclick={eraseData}><Icon>delete_forever</Icon> {text('menu.settings.eraseSaveData')}</button>
      </section>
    </div>
  </main>
</div>

<style>
  .setting-label { display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: .5rem; margin-top: .25rem; }
</style>
