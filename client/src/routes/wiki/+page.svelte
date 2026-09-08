<script lang="ts">
    import WikiSearch from "$lib/components/wiki/WikiSearch.svelte";
    import type { PageData } from "./$types";

    interface Props {
        data: PageData;
    }

    let { data }: Props = $props();
</script>

<svelte:head>
    <title>Midnight Manual | Midnight Machinations</title>
    <meta
        name="description"
        content="Rules, roles, modifiers, phases, and strategies for Midnight Machinations."
    />
</svelte:head>

<section class="standalone-wiki wiki-menu-colors">
    <header>
        <h2>Midnight Manual</h2>
        
    </header>

    <div><WikiSearch articles={data.articles} groups={data.groups} /></div>
</section>
