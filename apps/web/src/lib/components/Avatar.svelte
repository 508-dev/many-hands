<script lang="ts">
  type Props = {
    name: string;
    id?: string;
    src?: string;
    size?: "small" | "medium" | "large";
  };

  let { name, id = name, src, size = "medium" }: Props = $props();

  const initials = $derived(
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?",
  );

  function colourFor(value: string): string {
    const colours = ["#87402d", "#245b85", "#38632f", "#654482", "#8a3562", "#276455"];
    let hash = 0;
    for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0;
    return colours[Math.abs(hash) % colours.length];
  }

  const colour = $derived(colourFor(id));
</script>

<span class={`avatar ${size}`} style={`--avatar-colour: ${colour};`}>
  {#if src}
    <img {src} alt="" />
  {:else}
    <span aria-hidden="true">{initials}</span>
  {/if}
</span>

<style>
  .avatar {
    display: inline-grid;
    flex: 0 0 auto;
    place-items: center;
    overflow: hidden;
    border: 2px solid var(--paper);
    border-radius: 50%;
    background: var(--avatar-colour);
    box-shadow: 0 0 0 1px rgb(43 33 24 / 20%);
    color: white;
    font-weight: 700;
  }

  .small {
    width: 2rem;
    height: 2rem;
    font-size: 0.8rem;
  }

  .medium {
    width: 3rem;
    height: 3rem;
  }

  .large {
    width: 5rem;
    height: 5rem;
    font-size: 1.5rem;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
