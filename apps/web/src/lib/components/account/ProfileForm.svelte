<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import Avatar from "$lib/components/Avatar.svelte";
  import PlacePicker from "$lib/components/PlacePicker.svelte";
  import { accountCopy } from "$lib/copy/account";
  import type { Place } from "$lib/geo";
  import { collection, pb } from "$lib/pb";
  import type { User } from "$lib/types";

  let { user }: { user: User } = $props();
  const initialUser = untrack(() => user);
  let name = $state(initialUser.name);
  let about = $state(initialUser.about ?? "");
  let place = $state<Place | null>(
    initialUser.area
      ? { label: initialUser.area, lat: initialUser.lat, lng: initialUser.lng }
      : null,
  );
  let takingRequests = $state(initialUser.taking_requests);
  let avatarFile = $state<File | null>(null);
  let previewUrl = $state("");
  let busy = $state(false);
  let saved = $state(false);
  let error = $state("");

  const avatarUrl = $derived(
    previewUrl || (user.avatar ? pb.files.getURL(user, user.avatar, { thumb: "300x300" }) : ""),
  );

  function handleAvatar(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    error = "";
    saved = false;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    avatarFile = null;

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      error = accountCopy.profile.avatarErrorType;
      input.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      error = accountCopy.profile.avatarErrorSize;
      input.value = "";
      return;
    }
    avatarFile = file;
    previewUrl = URL.createObjectURL(file);
  }

  async function saveProfile() {
    busy = true;
    saved = false;
    error = "";
    const values = {
      name: name.trim(),
      about: about.trim(),
      area: place?.label ?? "",
      lat: place?.lat ?? null,
      lng: place?.lng ?? null,
      taking_requests: takingRequests,
    };

    try {
      let updated: User;
      if (avatarFile) {
        const data = new FormData();
        for (const [key, value] of Object.entries(values)) {
          data.append(key, value === null ? "" : String(value));
        }
        data.append("avatar", avatarFile);
        updated = await collection<User>("users").update(user.id, data);
      } else {
        updated = await collection<User>("users").update(user.id, values);
      }
      pb.authStore.save(pb.authStore.token, updated);
      saved = true;
      avatarFile = null;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = "";
    } catch {
      error = accountCopy.profile.error;
    } finally {
      busy = false;
    }
  }

  onDestroy(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  });
</script>

<section class="paper-panel account-section profile-section" aria-labelledby="profile-title">
  <h2 id="profile-title">{accountCopy.profile.title}</h2>
  <p class="section-intro">{accountCopy.profile.intro}</p>
  <form
    oninput={() => (saved = false)}
    onsubmit={(event) => {
      event.preventDefault();
      void saveProfile();
    }}
  >
    <div class="avatar-row">
      <Avatar name={name || user.name} id={user.id} src={avatarUrl} size="large" />
      <div class="avatar-field">
        <label for="profile-avatar">{accountCopy.profile.avatar}</label>
        <input
          id="profile-avatar"
          type="file"
          accept="image/*"
          aria-describedby="avatar-help"
          onchange={handleAvatar}
        />
        <p class="help" id="avatar-help">{accountCopy.profile.avatarHelp}</p>
      </div>
    </div>

    <div class="field">
      <label for="profile-name">{accountCopy.profile.name}</label>
      <input id="profile-name" bind:value={name} maxlength="60" required />
    </div>

    <div class="field">
      <div class="label-row">
        <label for="profile-about">{accountCopy.profile.about}</label>
        <span class="counter">{about.length}/500 {accountCopy.profile.characters}</span>
      </div>
      <textarea
        id="profile-about"
        bind:value={about}
        maxlength="500"
        rows="5"
        aria-describedby="about-help"
      ></textarea>
      <p class="help" id="about-help">{accountCopy.profile.aboutHelp}</p>
    </div>

    <PlacePicker
      id="profile-town"
      bind:value={place}
      label={accountCopy.profile.town}
      placeholder={accountCopy.profile.townPlaceholder}
    />

    <div class="request-setting">
      <label class="switch-label" for="taking-requests">
        <span>
          <strong>{accountCopy.profile.takingRequests}</strong>
          <span class="help" id="taking-requests-help">{accountCopy.profile.takingRequestsHelp}</span>
        </span>
        <span class="switch">
          <input
            id="taking-requests"
            type="checkbox"
            role="switch"
            bind:checked={takingRequests}
            aria-describedby="taking-requests-help"
          />
          <span class="switch-track" aria-hidden="true"></span>
        </span>
      </label>
    </div>

    {#if error}<p class="form-error" role="alert">{error}</p>{/if}
    <div class="save-row">
      <button class="button" type="submit" disabled={busy}>
        {busy ? accountCopy.common.saving : accountCopy.profile.save}
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
    gap: 1.25rem;
  }

  .avatar-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .avatar-field {
    min-width: 0;
    flex: 1;
  }

  label,
  .label-row {
    font-weight: 700;
  }

  .avatar-field label,
  .field > label {
    display: block;
    margin-bottom: 0.35rem;
  }

  input:not([type="checkbox"]),
  textarea {
    width: 100%;
    min-height: 2.9rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--ink-soft);
    border-radius: 3px;
    background: white;
    color: var(--ink);
  }

  input[type="file"] {
    padding: 0.4rem;
    font-size: 0.85rem;
  }

  textarea {
    resize: vertical;
  }

  .label-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
  }

  .counter,
  .help {
    color: var(--ink-soft);
    font-size: 0.8rem;
    font-weight: 400;
  }

  .help {
    display: block;
    margin: 0.35rem 0 0;
  }

  .request-setting {
    padding-block: 0.75rem;
    border-block: 1px solid var(--paper-dark);
  }

  .switch-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .switch {
    position: relative;
    flex: 0 0 auto;
    width: 3.25rem;
    height: 1.85rem;
  }

  .switch input {
    position: absolute;
    z-index: 1;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    cursor: pointer;
    opacity: 0;
  }

  .switch-track {
    position: absolute;
    inset: 0;
    border: 2px solid var(--ink-soft);
    border-radius: 999px;
    background: var(--paper-dark);
  }

  .switch-track::after {
    position: absolute;
    top: 0.18rem;
    left: 0.2rem;
    width: 1.15rem;
    height: 1.15rem;
    border-radius: 50%;
    background: var(--ink-soft);
    content: "";
    transition: transform 150ms ease;
  }

  .switch input:checked + .switch-track {
    border-color: var(--brick);
    background: var(--brick);
  }

  .switch input:checked + .switch-track::after {
    background: white;
    transform: translateX(1.35rem);
  }

  .switch input:focus-visible + .switch-track {
    outline: 3px solid var(--focus);
    outline-offset: 3px;
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

  @media (max-width: 420px) {
    .avatar-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .avatar-field {
      width: 100%;
    }
  }
</style>
