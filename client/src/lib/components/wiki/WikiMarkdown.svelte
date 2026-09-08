<script lang="ts">
  import { Marked } from 'marked';
  import { stylePlayerText } from '$lib/live/keywords';
  import dummyNames from '../../../resources/dummyNames.json';
  let { source }: { source: string } = $props();
  const markdown = new Marked({ breaks: true, gfm: true, renderer: {
    text(token) {
      if ('tokens' in token && token.tokens) return this.parser.parseInline(token.tokens);
      return stylePlayerText(token.text, dummyNames);
    }
  } });
  let html = $derived(markdown.parse(source, { async: false }));
</script>

<!-- Only repository-owned wiki markdown is accepted here. Plain text tokens are escaped by styleText. -->
<span class="wiki-article-standard">{@html html}</span>
