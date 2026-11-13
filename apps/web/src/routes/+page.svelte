<script lang="ts">
  import { onMount } from "svelte";
  import Board from "$lib/components/Board.svelte";
  import Card from "$lib/components/Card.svelte";
  import SkillCard from "$lib/components/SkillCard.svelte";
  import { getCategory } from "$lib/categories";
  import { copy } from "$lib/copy";
  import { directory } from "$lib/copy/directory";
  import { collection, pb } from "$lib/pb";
  import type { Need, Skill } from "$lib/types";

  let skills = $state<Skill[]>([]);
  let needs = $state<Need[]>([]);
  let loading = $state(true);

  const skillExamples = copy.landing.examples.filter((example) => example.kind === "skill");
  const needExamples = copy.landing.examples.filter((example) => example.kind === "need");

  onMount(() => {
    let active = true;

    async function loadLatest() {
      const [skillResult, needResult] = await Promise.allSettled([
        collection<Skill>("skills").getList(1, 3, { sort: "-created", expand: "user" }),
        collection<Need>("needs").getList(1, 3, {
          filter: pb.filter("status = {:status}", { status: "open" }),
          sort: "-created",
        }),
      ]);
      if (!active) return;
      skills = skillResult.status === "fulfilled" ? skillResult.value.items : [];
      needs = needResult.status === "fulfilled" ? needResult.value.items : [];
      loading = false;
    }

    void loadLatest();
    return () => {
      active = false;
    };
  });
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

  {#if loading}
    <section class="paper-panel loading-panel" aria-live="polite">
      <p>{copy.landing.loading}</p>
    </section>
  {:else}
    <section class="latest" aria-labelledby="fresh-skills-title">
      <div class="section-heading paper-panel">
        <div>
          <h2 id="fresh-skills-title">{copy.landing.freshSkillsTitle}</h2>
          <p>{copy.landing.freshSkillsIntro}</p>
        </div>
        <a class="button-secondary" href="/skills">{copy.landing.browse}</a>
      </div>
      <Board label={copy.landing.freshSkillsTitle}>
        {#each skills as skill (skill.id)}
          <SkillCard {skill} />
        {/each}
        {#each skillExamples.slice(0, 3 - skills.length) as example (example.id)}
          {@const category = getCategory(example.category)}
          <Card
            id={example.id}
            title={example.title}
            eyebrow={copy.landing.skillKind}
            pinColour={category.colour}
          >
            <span class="example-badge">{copy.landing.exampleLabel}</span>
            <p>{example.description}</p>
            {#snippet footer()}<p>{example.meta}</p>{/snippet}
          </Card>
        {/each}
      </Board>
    </section>

    <section class="latest" aria-labelledby="fresh-needs-title">
      <div class="section-heading paper-panel">
        <div>
          <h2 id="fresh-needs-title">{copy.landing.freshNeedsTitle}</h2>
          <p>{copy.landing.freshNeedsIntro}</p>
        </div>
        <a class="button-secondary" href="/needs/new">{copy.landing.postNeed}</a>
      </div>
      <Board label={copy.landing.freshNeedsTitle}>
        {#each needs as need (need.id)}
          {@const category = getCategory(need.category)}
          <Card
            id={need.id}
            title={need.title}
            eyebrow={`${category.emoji} ${category.label}`}
            pinColour={category.colour}
          >
            {#if need.details}<p class="need-details">{need.details}</p>{/if}
            <p class="need-meta">
              {[directory.mode[need.mode], need.when, need.area].filter(Boolean).join(" · ")}
            </p>
            {#snippet footer()}
              <a class="need-link" href={`/needs/${need.id}`}>
                {copy.landing.viewNeed} <span aria-hidden="true">→</span>
              </a>
            {/snippet}
          </Card>
        {/each}
        {#each needExamples.slice(0, 3 - needs.length) as example (example.id)}
          {@const category = getCategory(example.category)}
          <Card
            id={example.id}
            title={example.title}
            eyebrow={copy.landing.needKind}
            pinColour={category.colour}
          >
            <span class="example-badge">{copy.landing.exampleLabel}</span>
            <p>{example.description}</p>
            {#snippet footer()}<p>{example.meta}</p>{/snippet}
          </Card>
        {/each}
      </Board>
    </section>
  {/if}

  <section class="join-cta paper-panel" aria-labelledby="join-title">
    <h2 id="join-title">{copy.landing.joinTitle}</h2>
    <p>{copy.landing.joinText}</p>
    <div class="button-row">
      <a class="button" href="/signup">{copy.landing.join}</a>
      <a class="button-secondary" href="/needs/new">{copy.landing.postNeed}</a>
    </div>
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

  .section-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 1rem 1.25rem;
  }

  .section-heading h2,
  .section-heading p {
    margin: 0;
  }

  .section-heading p {
    margin-top: 0.25rem;
    color: var(--ink-soft);
  }

  .need-details {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    line-clamp: 4;
  }

  .need-meta {
    color: var(--ink-soft);
    font-size: 0.9rem;
  }

  .need-link {
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    gap: 0.35rem;
    color: var(--brick-dark);
  }

  .join-cta {
    text-align: center;
  }

  .join-cta h2,
  .join-cta p {
    margin-bottom: 0.75rem;
  }

  .join-cta .button-row {
    justify-content: center;
  }

  .loading-panel {
    text-align: center;
  }

  .loading-panel p {
    margin: 0;
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
  }

  @media (min-width: 700px) {
    .how ol {
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
