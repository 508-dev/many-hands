<script lang="ts">
  import { untrack } from "svelte";
  import Board from "$lib/components/Board.svelte";
  import Card from "$lib/components/Card.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { categories, getCategory, type CategorySlug } from "$lib/categories";
  import { accountCopy } from "$lib/copy/account";
  import { collection } from "$lib/pb";
  import type { Mode, Skill } from "$lib/types";

  type Props = {
    userId: string;
    initialSkills: Skill[];
  };

  let { userId, initialSkills }: Props = $props();
  const savedSkills = untrack(() => initialSkills);
  let skills = $state<Skill[]>(savedSkills);
  let modalOpen = $state(false);
  let editingId = $state("");
  let category = $state<CategorySlug>("building");
  let title = $state("");
  let description = $state("");
  let mode = $state<Mode>("either");
  let busy = $state(false);
  let deletingId = $state("");
  let error = $state("");
  let modalError = $state("");

  const modes: Mode[] = ["in_person", "remote", "either"];

  function openNew() {
    editingId = "";
    category = "building";
    title = "";
    description = "";
    mode = "either";
    modalError = "";
    modalOpen = true;
  }

  function openEdit(skill: Skill) {
    editingId = skill.id;
    category = skill.category;
    title = skill.title;
    description = skill.description;
    mode = skill.mode;
    modalError = "";
    modalOpen = true;
  }

  async function saveSkill() {
    busy = true;
    modalError = "";
    const data = {
      user: userId,
      category,
      title: title.trim(),
      description: description.trim(),
      mode,
    };
    try {
      if (editingId) {
        const updated = await collection<Skill>("skills").update(editingId, data);
        skills = skills.map((skill) => (skill.id === editingId ? updated : skill));
      } else {
        const created = await collection<Skill>("skills").create(data);
        skills = [created, ...skills];
      }
      modalOpen = false;
    } catch {
      modalError = accountCopy.skills.saveError;
    } finally {
      busy = false;
    }
  }

  async function deleteSkill(skill: Skill) {
    if (!window.confirm(accountCopy.skills.deleteConfirm)) return;
    deletingId = skill.id;
    error = "";
    try {
      await collection<Skill>("skills").delete(skill.id);
      skills = skills.filter((item) => item.id !== skill.id);
    } catch {
      error = accountCopy.skills.deleteError;
    } finally {
      deletingId = "";
    }
  }
</script>

<section class="paper-panel account-section" aria-labelledby="skills-title">
  <div class="section-heading">
    <div>
      <h2 id="skills-title">{accountCopy.skills.title}</h2>
      <p>{accountCopy.skills.intro}</p>
    </div>
    <button class="button" type="button" onclick={openNew}>{accountCopy.skills.add}</button>
  </div>

  {#if error}<p class="form-error" role="alert">{error}</p>{/if}

  {#if skills.length === 0}
    <p class="empty">{accountCopy.skills.empty}</p>
  {:else}
    <Board label={accountCopy.skills.title}>
      {#each skills as skill (skill.id)}
        {@const skillCategory = getCategory(skill.category)}
        <Card
          id={skill.id}
          title={skill.title}
          eyebrow={`${skillCategory.emoji} ${skillCategory.label}`}
          pinColour={skillCategory.colour}
        >
          {#if skill.description}<p>{skill.description}</p>{/if}
          <p class="skill-mode">{accountCopy.skills.modes[skill.mode]}</p>
          {#snippet footer()}
            <div class="card-actions">
              <button class="button-secondary" type="button" onclick={() => openEdit(skill)}>
                {accountCopy.skills.edit}
              </button>
              <button
                class="delete-button"
                type="button"
                disabled={deletingId === skill.id}
                onclick={() => void deleteSkill(skill)}
              >
                {deletingId === skill.id ? accountCopy.skills.deleting : accountCopy.skills.delete}
              </button>
            </div>
          {/snippet}
        </Card>
      {/each}
    </Board>
  {/if}
</section>

<Modal
  bind:open={modalOpen}
  title={editingId ? accountCopy.skills.editTitle : accountCopy.skills.addTitle}
  onclose={() => (modalError = "")}
>
  <form
    class="skill-form"
    onsubmit={(event) => {
      event.preventDefault();
      void saveSkill();
    }}
  >
    <div class="field">
      <label for="skill-category">{accountCopy.skills.category}</label>
      <select id="skill-category" bind:value={category}>
        {#each categories as option (option.slug)}
          <option value={option.slug}>{option.emoji} {option.label}</option>
        {/each}
      </select>
    </div>

    <div class="field">
      <label for="skill-title-input">{accountCopy.skills.skillTitle}</label>
      <input
        id="skill-title-input"
        bind:value={title}
        placeholder={accountCopy.skills.titlePlaceholder}
        minlength="2"
        maxlength="80"
        required
      />
    </div>

    <div class="field">
      <div class="label-row">
        <label for="skill-description">{accountCopy.skills.description}</label>
        <span class="counter">{description.length}/300</span>
      </div>
      <textarea
        id="skill-description"
        bind:value={description}
        placeholder={accountCopy.skills.descriptionPlaceholder}
        maxlength="300"
        rows="4"
      ></textarea>
    </div>

    <fieldset>
      <legend>{accountCopy.skills.mode}</legend>
      <div class="mode-options">
        {#each modes as option (option)}
          <label>
            <input type="radio" name="skill-mode" value={option} bind:group={mode} />
            {accountCopy.skills.modes[option]}
          </label>
        {/each}
      </div>
    </fieldset>

    {#if modalError}<p class="form-error" role="alert">{modalError}</p>{/if}
    <button class="button" type="submit" disabled={busy}>
      {busy ? accountCopy.common.saving : accountCopy.skills.save}
    </button>
  </form>
</Modal>

<style>
  .section-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .section-heading p {
    margin: -0.25rem 0 0;
    color: var(--ink-soft);
  }

  .empty {
    margin: 1rem 0 0;
    padding: 1rem;
    border: 1px dashed var(--ink-soft);
    text-align: center;
  }

  .skill-mode {
    color: var(--ink-soft);
    font-weight: 700;
  }

  .card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .card-actions button {
    min-height: 2.5rem;
    padding: 0.45rem 0.75rem;
    font-size: 0.85rem;
  }

  .delete-button {
    border: 2px solid var(--brick-dark);
    border-radius: 4px;
    background: transparent;
    color: var(--brick-dark);
    font-weight: 700;
  }

  .delete-button:hover {
    background: #f8dfd6;
  }

  .skill-form {
    display: grid;
    gap: 1rem;
  }

  .field > label,
  .label-row,
  legend {
    font-weight: 700;
  }

  .field > label {
    display: block;
    margin-bottom: 0.35rem;
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
  }

  .counter {
    color: var(--ink-soft);
    font-size: 0.8rem;
    font-weight: 400;
  }

  .skill-form input:not([type="radio"]),
  .skill-form select,
  .skill-form textarea {
    width: 100%;
    min-height: 2.9rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--ink-soft);
    border-radius: 3px;
    background: white;
    color: var(--ink);
  }

  .skill-form textarea {
    resize: vertical;
  }

  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    margin-bottom: 0.5rem;
  }

  .mode-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem 1rem;
  }

  .mode-options label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .mode-options input {
    width: 1.15rem;
    height: 1.15rem;
    margin: 0;
    accent-color: var(--brick);
  }

  .form-error {
    margin: 0 0 1rem;
    padding: 0.75rem;
    border-left: 4px solid var(--brick);
    background: #f8dfd6;
    color: var(--brick-dark);
    font-weight: 700;
  }

  .skill-form .form-error {
    margin-bottom: 0;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.7;
  }
</style>
