<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status} | Midnight Machinations</title>
</svelte:head>

<section class="error-page">

  <h1>{page.status}</h1>
  <p>{page.error?.message ?? 'The requested page could not be found.'}</p>
  <a class="button primary" href="/">Return home</a>
</section>
