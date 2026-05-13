// app.js — orquestracao da raiz (login + hub)

import { onAuthChange, signInWithGoogle, signOut } from "./shared/auth.js";

const $app     = document.getElementById("app");
const tplLogin = document.getElementById("tpl-login");
const tplHub   = document.getElementById("tpl-hub");

function renderLogin() {
  $app.replaceChildren(tplLogin.content.cloneNode(true));

  const $btn    = $app.querySelector('[data-action="signin"]');
  const $status = $app.querySelector('[data-login-status]');

  $btn.addEventListener("click", async () => {
    $btn.disabled = true;
    $status.textContent = "Abrindo login do Google…";
    $status.className   = "login__status muted";
    try {
      await signInWithGoogle();
      // onAuthChange dispara renderHub
    } catch (err) {
      console.error(err);
      $btn.disabled = false;
      const msg = err.code === "auth/popup-closed-by-user"
        ? "Login cancelado."
        : err.code === "auth/popup-blocked"
        ? "Pop-up bloqueado. Permita pop-ups e tente de novo."
        : `Erro ao entrar: ${err.code || err.message || err}`;
      $status.textContent = msg;
      $status.className   = "login__status status status--err";
    }
  });
}

function renderHub(user) {
  $app.replaceChildren(tplHub.content.cloneNode(true));

  $app.querySelector('[data-user-name]').textContent = user.displayName || user.email;
  const $avatar = $app.querySelector('[data-user-avatar]');
  if (user.photoURL) {
    $avatar.src = user.photoURL;
    $avatar.alt = `Foto de ${user.displayName || user.email}`;
  } else {
    $avatar.remove();
  }

  $app.querySelector('[data-action="signout"]').addEventListener("click", async () => {
    await signOut();
    // onAuthChange dispara renderLogin
  });
}

// Boot: aguarda o Firebase resolver o auth state inicial.
onAuthChange((user) => {
  if (user) renderHub(user);
  else      renderLogin();
});
