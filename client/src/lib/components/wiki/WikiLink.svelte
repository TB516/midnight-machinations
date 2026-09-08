<script lang="ts">
    import type { WikiArticleSummary } from "$lib/wiki";
    import StyledText from '../StyledText.svelte';

    interface Props {
        article: WikiArticleSummary;
        showExcerpt?: boolean;
        disabled?: boolean;
    }

    let { article, disabled = false }: Props = $props();
</script>

<a class="button wiki-link" class:keyword-disabled={disabled} href={article.href}>
    <StyledText value={article.title} noLinks />
</a>

<style>
a { display: inline-block; }
</style>
