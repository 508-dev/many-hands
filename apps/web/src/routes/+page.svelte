<script lang="ts">
  import Board from "$lib/components/Board.svelte";
  import Card from "$lib/components/Card.svelte";
  import { getCategory } from "$lib/categories";
  import { copy } from "$lib/copy";

  const pinColours = [
    getCategory("building").colour,
    getCategory("moving").colour,
    getCategory("art").colour,
  ];
</script>

<svelte:head><title>{copy.siteName} · {copy.landing.tagline}</title></svelte:head>

<div class="page-shell landing">
  <section class="hero paper-panel" aria-labelledby="hero-title">
    <p class="label">{copy.landing.eyebrow}</p>
    <h1 id="hero-title">{copy.landing.title}</h1>
    <p class="tagline">{copy.landing.tagline}</p>
    <p class="intro">{copy.landing.intro}</p>
    <div class="button-row">
      <a class="button" href="/signup">{copy.landing.join}</a>
      <a class="button-secondary" href="/skills">{copy.landing.browse}</a>
    </div>
  </section>

  <section class="how" aria-labelledby="how-title">
    <h2 class="paper-label" id="how-title">{copy.landing.howTitle}</h2>
    <ol>
      {#each copy.landing.steps as step, index (step.title)}
        <li class="paper-panel">
          <span class="step-number" aria-hidden="true">{index + 1}</span>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
        </li>
      {/each}
    </ol>
  </section>

  <section class="examples" aria-labelledby="examples-title">
    <div class="examples-heading paper-panel">
      <h2 id="examples-title">{copy.landing.examplesTitle}</h2>
      <p>{copy.landing.examplesIntro}</p>
    </div>
    <Board label={copy.landing.examplesTitle}>
      {#each copy.landing.examples as example, index (example.id)}
        <Card
          id={example.id}
          title={example.title}
          eyebrow={index === 1 ? copy.landing.needKind : copy.landing.skillKind}
          pinColour={pinColours[index]}
        >
          <span class="example-badge">{copy.landing.exampleLabel}</span>
          <p>{example.description}</p>
          {#snippet footer()}<p>{example.meta}</p>{/snippet}
        </Card>
      {/each}
    </Board>
  </section>

  <aside class="safety-note paper-panel">
    <p>{copy.landing.safetyNote}</p>
    <a href="/safety">{copy.landing.safetyLink}</a>
  </aside>
</div>

<style>
  .landing {
    display: grid;
    gap: 2.5rem;
  }

  .hero {
    position: relative;
    overflow: hidden;
    transform: rotate(-0.25deg);
  }

  .hero::after {
    position: absolute;
    right: -2rem;
    bottom: -3rem;
    width: 9rem;
    height: 9rem;
    border: 2px solid rgb(178 58 38 / 10%);
    border-radius: 50%;
    content: "";
  }

  .hero h1 {
    color: var(--brick-dark);
  }

  .tagline {
    max-width: 40rem;
    margin: 0 0 0.75rem;
    font-size: clamp(1.25rem, 4vw, 1.65rem);
    font-weight: 700;
    line-height: 1.25;
  }

  .intro {
    max-width: 44rem;
    margin: 0 0 1.5rem;
    color: var(--ink-soft);
  }

  .how ol {
    display: grid;
    gap: 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .how li {
    position: relative;
    padding-top: 1.5rem;
  }

  .how h3 {
    margin: 0 0 0.4rem;
    font-family: var(--font-heading);
    font-size: 1.65rem;
    line-height: 1.1;
  }

  .how p {
    margin: 0;
  }

  .step-number {
    position: absolute;
    top: -0.65rem;
    right: 1rem;
    display: grid;
    width: 2.2rem;
    height: 2.2rem;
    place-items: center;
    border-radius: 50%;
    background: var(--brick);
    color: white;
    font-family: var(--font-heading);
    font-size: 1.5rem;
    font-weight: 700;
  }

  .examples-heading {
    margin-bottom: 1rem;
    padding: 1rem 1.25rem;
  }

  .examples-heading h2,
  .examples-heading p {
    margin: 0;
  }

  .examples-heading p {
    margin-top: 0.35rem;
    color: var(--ink-soft);
  }

  .examples :global(.card-grid) {
    display: grid;
    gap: 1.35rem;
  }

  .safety-note {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
  }

  .safety-note p {
    margin: 0;
  }

  .safety-note a {
    font-weight: 700;
    white-space: nowrap;
  }

  @media (min-width: 700px) {
    .how ol,
    .examples :global(.card-grid) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .how li:nth-child(2) {
      transform: rotate(0.6deg);
    }

    .how li:nth-child(3) {
      transform: rotate(-0.5deg);
    }
  }
</style>
