// shared/auth-gate.js
// Helper pra sub-paginas: se nao logado, redireciona pra raiz.
// Uso:  import { requireAuth } from "../shared/auth-gate.js";
//       requireAuth((user) => { /* render seu modulo */ });

import { onAuthChange } from "./auth.js";

export function requireAuth(onUser, rootPath = "../") {
  return onAuthChange((user) => {
    if (!user) {
      window.location.href = rootPath;
    } else {
      onUser(user);
    }
  });
}
