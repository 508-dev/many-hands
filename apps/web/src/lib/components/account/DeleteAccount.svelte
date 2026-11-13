<script lang="ts">
  import Modal from "$lib/components/Modal.svelte";
  import { accountCopy } from "$lib/copy/account";
  import { collection, pb } from "$lib/pb";
  import type { User } from "$lib/types";

  let { userId }: { userId: string } = $props();
  let open = $state(false);
  let busy = $state(false);
  let error = $state("");

  async function deleteAccount() {
    busy = true;
    error = "";
    try {
      await collection<User>("users").delete(userId);
      pb.authStore.clear();
      window.location.assign("/");
    } catch {
      error = accountCopy.danger.error;
      busy = false;
    }
  }
</script>

<section class="paper-panel account-section danger-zone" aria-labelledby="danger-title">
  <h2 id="danger-title">{accountCopy.danger.title}</h2>
  <p>{accountCopy.danger.intro}</p>
  <button class="danger-button" type="button" onclick={() => (open = true)}>
    {accountCopy.danger.delete}
  </button>
</section>

<Modal bind:open title={accountCopy.danger.modalTitle} onclose={() => (error = "")}>
  <p>{accountCopy.danger.warning}</p>
  {#if error}<p class="form-error" role="alert">{error}</p>{/if}
  <div class="button-row">
    <button class="button-secondary" type="button" disabled={busy} onclick={() => (open = false)}>
      {accountCopy.common.cancel}
    </button>
    <button class="danger-button" type="button" disabled={busy} onclick={() => void deleteAccount()}>
      {busy ? accountCopy.danger.deleting : accountCopy.danger.confirm}
    </button>
  </div>
</Modal>

<style>
  .danger-zone {
    border-left: 5px solid var(--brick-dark);
  }

  .danger-zone p {
    margin-top: 0;
  }

  .danger-button {
    min-height: 2.9rem;
    padding: 0.7rem 1.05rem;
    border: 2px solid var(--brick-dark);
    border-radius: 4px;
    background: var(--brick-dark);
    color: white;
    font-weight: 700;
  }

  .danger-button:hover {
    background: #651b11;
  }

  .danger-button:disabled,
  .button-secondary:disabled {
    cursor: wait;
    opacity: 0.7;
  }

  .button-row {
    justify-content: flex-end;
    margin-top: 1.25rem;
  }

  .form-error {
    padding: 0.75rem;
    border-left: 4px solid var(--brick);
    background: #f8dfd6;
    color: var(--brick-dark);
    font-weight: 700;
  }
</style>
