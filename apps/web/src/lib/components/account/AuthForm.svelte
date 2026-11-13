<script lang="ts">
  import { goto } from "$app/navigation";
  import { auth } from "$lib/auth.svelte";
  import { accountCopy } from "$lib/copy/account";
  import { collection, pb } from "$lib/pb";
  import type { User } from "$lib/types";
  import { getFieldError } from "./errors";

  type Props = {
    mode: "login" | "signup";
    redirectTo?: string;
  };

  let { mode, redirectTo = "/skills" }: Props = $props();
  let name = $state("");
  let email = $state("");
  let password = $state("");
  let adult = $state(false);
  let website = $state("");
  let showPassword = $state(false);
  let busy = $state(false);
  let error = $state("");

  const destination = $derived(
    redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/skills",
  );

  $effect(() => {
    if (auth.isLoggedIn) void goto("/me");
  });

  function signupError(cause: unknown): string {
    const emailError = getFieldError(cause, "email");
    if (emailError) {
      if (emailError.code === "validation_not_unique") return accountCopy.signup.errors.emailUsed;
      return accountCopy.signup.errors.emailInvalid;
    }
    if (getFieldError(cause, "name")) return accountCopy.signup.errors.name;
    if (getFieldError(cause, "password")) return accountCopy.signup.errors.password;
    if (getFieldError(cause, "adult")) return accountCopy.signup.errors.adult;
    return accountCopy.common.genericError;
  }

  async function submit() {
    busy = true;
    error = "";
    try {
      if (mode === "signup") {
        const data: Record<string, unknown> = {
          name: name.trim(),
          email: email.trim(),
          password,
          passwordConfirm: password,
          adult,
          taking_requests: true,
        };
        if (website) data.website = website;
        await collection<User>("users").create(data);
        await pb.collection("users").authWithPassword(email.trim(), password);
        await goto("/me?welcome=1");
      } else {
        await pb.collection("users").authWithPassword(email.trim(), password);
        await goto(destination);
      }
    } catch (cause) {
      error =
        mode === "signup" ? signupError(cause) : accountCopy.login.mismatch;
    } finally {
      busy = false;
    }
  }
</script>

<div class="page-shell narrow-page auth-page">
  <section class="paper-panel auth-card">
    {#if mode === "signup"}
      <h1>{accountCopy.signup.title}</h1>
      <p class="intro">{accountCopy.signup.intro}</p>
    {:else}
      <h1>{accountCopy.login.title}</h1>
      <p class="intro">{accountCopy.login.intro}</p>
    {/if}

    <form
      onsubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {#if mode === "signup"}
        <div class="field">
          <label for="account-name">{accountCopy.signup.name}</label>
          <input
            id="account-name"
            bind:value={name}
            placeholder={accountCopy.signup.namePlaceholder}
            autocomplete="name"
            maxlength="60"
            required
          />
        </div>
      {/if}

      <div class="field">
        <label for="account-email">{accountCopy.common.email}</label>
        <input
          id="account-email"
          type="email"
          bind:value={email}
          placeholder={accountCopy.signup.emailPlaceholder}
          autocomplete="email"
          required
        />
      </div>

      <div class="field">
        <label for="account-password">
          {mode === "signup" ? accountCopy.signup.password : accountCopy.common.password}
        </label>
        <div class="password-field">
          <input
            id="account-password"
            type={showPassword ? "text" : "password"}
            bind:value={password}
            autocomplete={mode === "signup" ? "new-password" : "current-password"}
            minlength="8"
            required
          />
          <button
            type="button"
            class="password-toggle"
            aria-pressed={showPassword}
            aria-controls="account-password"
            onclick={() => (showPassword = !showPassword)}
          >
            {showPassword ? accountCopy.common.hidePassword : accountCopy.common.showPassword}
          </button>
        </div>
      </div>

      {#if mode === "signup"}
        <div class="honeypot" aria-hidden="true">
          <label for="account-website">{accountCopy.signup.website}</label>
          <input
            id="account-website"
            name="website"
            bind:value={website}
            tabindex="-1"
            autocomplete="off"
            aria-hidden="true"
          />
        </div>
        <label class="adult-check">
          <input type="checkbox" bind:checked={adult} required />
          <span>{accountCopy.signup.adult}</span>
        </label>
      {/if}

      {#if error}<p class="error" role="alert">{error}</p>{/if}

      <button class="button submit" type="submit" disabled={busy}>
        {#if busy}
          {mode === "signup" ? accountCopy.signup.submitting : accountCopy.login.submitting}
        {:else}
          {mode === "signup" ? accountCopy.signup.submit : accountCopy.login.submit}
        {/if}
      </button>
    </form>

    {#if mode === "login"}
      <p class="forgot">{accountCopy.login.forgot}</p>
    {/if}

    <p class="switch-page">
      {mode === "signup" ? accountCopy.signup.haveAccount : accountCopy.login.newHere}
      <a href={mode === "signup" ? "/login" : "/signup"}>
        {mode === "signup" ? accountCopy.signup.loginLink : accountCopy.login.signupLink}
      </a>
    </p>
    {#if mode === "signup"}
      <p class="safety-link">
        {accountCopy.signup.safetyIntro} <a href="/safety">{accountCopy.signup.safetyLink}</a>.
      </p>
    {/if}
  </section>
</div>

<style>
  .auth-page {
    max-width: 38rem;
  }

  .auth-card {
    transform: rotate(-0.2deg);
  }

  h1 {
    font-size: clamp(2.8rem, 10vw, 4rem);
  }

  .intro {
    margin: 0 0 1.5rem;
    color: var(--ink-soft);
  }

  form {
    display: grid;
    gap: 1.1rem;
  }

  .field > label {
    display: block;
    margin-bottom: 0.35rem;
    font-weight: 700;
  }

  input:not([type="checkbox"]) {
    width: 100%;
    min-height: 2.9rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--ink-soft);
    border-radius: 3px;
    background: white;
    color: var(--ink);
  }

  .password-field {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem;
  }

  .password-toggle {
    min-height: 2.9rem;
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--ink-soft);
    border-radius: 3px;
    background: var(--paper-dark);
    color: var(--ink);
    font-size: 0.85rem;
    font-weight: 700;
  }

  .adult-check {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    font-weight: 700;
  }

  .adult-check input {
    width: 1.35rem;
    height: 1.35rem;
    margin: 0;
    accent-color: var(--brick);
  }

  .honeypot {
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }

  .submit {
    width: 100%;
  }

  .submit:disabled {
    cursor: wait;
    opacity: 0.7;
  }

  .error {
    margin: 0;
    padding: 0.75rem;
    border-left: 4px solid var(--brick);
    background: #f8dfd6;
    color: var(--brick-dark);
    font-weight: 700;
  }

  .forgot,
  .switch-page,
  .safety-link {
    margin: 1.25rem 0 0;
    font-size: 0.95rem;
  }

  .switch-page,
  .safety-link {
    text-align: center;
  }

  .safety-link {
    margin-top: 0.65rem;
    color: var(--ink-soft);
  }

  @media (max-width: 420px) {
    .password-field {
      grid-template-columns: minmax(0, 1fr);
    }

    .password-toggle {
      justify-self: start;
    }
  }
</style>
