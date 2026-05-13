// vendas/vendas.js — modulo de vendas (placeholder)

import { requireAuth } from "../shared/auth-gate.js";
import { signOut }     from "../shared/auth.js";

const $app    = document.getElementById("app");
const tplPage = document.getElementById("tpl-page");

requireAuth(() => {
  $app.replaceChildren(tplPage.content.cloneNode(true));
  $app.querySelector('[data-action="signout"]').addEventListener("click", async () => {
    await signOut();
    window.location.href = "../";
  });
});
