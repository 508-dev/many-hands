<script lang="ts">
  import { untrack } from "svelte";
  import { accountCopy } from "$lib/copy/account";
  import { collection } from "$lib/pb";
  import type { Contact, ContactMethod } from "$lib/types";

  type Props = {
    userId: string;
    contact: Contact | null;
  };

  let { userId, contact }: Props = $props();
  const initialContact = untrack(() => contact);
  let recordId = $state(initialContact?.id ?? "");
  let method = $state<ContactMethod>(initialContact?.method ?? "email");
  let value = $state(initialContact?.value ?? "");
  let note = $state(initialContact?.note ?? "");
  let busy = $state(false);
  let saved = $state(false);
  let error = $state("");

  const methods: ContactMethod[] = ["email", "phone", "whatsapp", "signal", "telegram", "other"];

  async function saveContact() {
    busy = true;
    saved = false;
    error = "";
    const data = { method, value: value.trim(), note: note.trim() };
    try {
      if (recordId) {
        await collection<Contact>("contacts").update(recordId, data);
      } else {
        const created = await collection<Contact>("contacts").create({ ...data, user: userId });
        recordId = created.id;
      }
      saved = true;
    } catch {
      error = accountCopy.contact.error;
    } finally {
      busy = false;
    }
  }
</script>

<section class="paper-panel account-section" aria-labelledby="contact-title">
  <h2 id="contact-title">{accountCopy.contact.title}</h2>
  <p class="section-intro">{accountCopy.contact.intro}</p>
  <form
    oninput={() => (saved = false)}
    onsubmit={(event) => {
      event.preventDefault();
      void saveContact();
    }}
  >
    <div class="field">
      <label for="contact-method">{accountCopy.contact.method}</label>
      <select id="contact-method" bind:value={method}>
        {#each methods as option (option)}
          <option value={option}>{accountCopy.contact.methods[option]}</option>
        {/each}
      </select>
    </div>

    <div class="field">
      <label for="contact-value">{accountCopy.contact.value}</label>
      <input
        id="contact-value"
        bind:value
        placeholder={accountCopy.contact.placeholders[method]}
        maxlength="200"
        required
      />
    </div>

    <div class="field">
      <label for="contact-note">{accountCopy.contact.note}</label>
      <input
        id="contact-note"
        bind:value={note}
        placeholder={accountCopy.contact.notePlaceholder}
        maxlength="200"
      />
    </div>

    <p class="privacy">{accountCopy.contact.privacy}</p>
    {#if error}<p class="form-error" role="alert">{error}</p>{/if}
    <div class="save-row">
      <button class="button" type="submit" disabled={busy}>
        {busy ? accountCopy.common.saving : accountCopy.contact.save}
      </button>
      {#if saved}<span class="saved" role="status">{accountCopy.common.saved}</span>{/if}
    </div>
  </form>
</section>

<style>
  .section-intro {
    margin: -0.25rem 0 1.4rem;
    color: var(--ink-soft);
  }

  form {
    display: grid;
    gap: 1.1rem;
  }

  label {
    display: block;
    margin-bottom: 0.35rem;
    font-weight: 700;
  }

  input,
  select {
    width: 100%;
    min-height: 2.9rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--ink-soft);
    border-radius: 3px;
    background: white;
    color: var(--ink);
  }

  .privacy {
    margin: 0;
    padding: 0.75rem;
    border-left: 4px solid #38632f;
    background: #e9efdf;
    color: #2f4729;
    font-size: 0.9rem;
  }

  .save-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .saved {
    color: #315f38;
    font-weight: 700;
  }

  .form-error {
    margin: 0;
    padding: 0.75rem;
    border-left: 4px solid var(--brick);
    background: #f8dfd6;
    color: var(--brick-dark);
    font-weight: 700;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.7;
  }
</style>
