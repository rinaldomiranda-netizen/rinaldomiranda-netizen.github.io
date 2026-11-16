/* RMD AudioLab — guardar o resultado dos treinos na pasta do aluno (16/11/2026, pedido do Rinaldo).
   Vale para o Laboratório da voz, a segunda voz, o treino de ouvido e a regência com câmera.
   - No celular do aluno: guarda sozinho no nome dele (o servidor pega o nome pelo crachá do aluno).
   - No computador do professor: aparece o campo "Aluno" e o botão "Guardar na pasta do aluno".
   O professor vê tudo em Resultados › Treinos de voz, ouvido e regência. */
"use strict";
const TreinosAL = (() => {
  const h = AL.h;
  let modo = null, token = null, ultimoNome = "", conhecidos = null, serie = 0, enviarCasa = null;
  const AREAS = { voz: "Laboratório da voz", ouvido: "Treino de ouvido", regencia: "Regência com câmera" };

  function comoAluno(tok) { modo = "aluno"; token = tok; }
  function comoProfessor() { modo = "professor"; }
  /** Treino em casa (site no celular): quem envia é o app de casa (com fila quando está sem internet). */
  function comoCasa(fn) { modo = "casa"; enviarCasa = fn; }
  async function nomes() {
    if (conhecidos) return conhecidos;
    try { conhecidos = (await AL.api("/api/prof/treinos")).alunos_conhecidos || []; } catch (e) { conhecidos = []; }
    return conhecidos;
  }

  /** Caixa para pôr no fim do cartão de resultado de um treino. nota: 0 a 100. */
  function caixa(area, treino, nota, detalhe) {
    const n = Math.max(0, Math.min(100, Math.round(Number(nota) || 0)));
    const el = h("div", { class: "linha", style: { gap: ".4rem", "flex-wrap": "wrap", "align-items": "center", "margin-top": ".6rem" } });
    if (modo === "casa") {
      el.textContent = "⏳ Enviando a nota para o professor…";
      enviarCasa({ area, treino, nota: n, detalhe: detalhe || "" })
        .then((r) => { el.textContent = r && r.fila ? "📥 Nota guardada no celular (" + n + "%). Vai para o professor quando tiver internet." : "✔ Nota enviada para o professor (" + n + "%)."; el.className = r && r.fila ? "aviso" : "ok"; })
        .catch((e) => { el.textContent = "⚠️ Não enviou: " + e.message; el.className = "aviso"; });
      return el;
    }
    if (modo === "aluno") {
      el.textContent = "⏳ Guardando na sua pasta…";
      AL.api("/api/aluno/treino", { area, treino, nota: n, detalhe }, { headers: { "X-Aluno": token || "" } })
        .then(() => { el.textContent = "✔ Guardado na sua pasta (" + n + "%). O professor vê."; el.className = "ok"; })
        .catch((e) => { el.textContent = "⚠️ Não guardou: " + e.message; el.className = "aviso"; });
      return el;
    }
    const id = "al-nomes-" + (++serie);
    const lista = h("datalist", { id });
    const nome = h("input", { list: id, maxlength: 60, value: ultimoNome, placeholder: "Nome do aluno", "aria-label": "Nome do aluno", style: { width: "auto", "min-width": "14rem", flex: "1 1 14rem" } });
    const botao = h("button", { class: "primario", onclick: async () => {
      const quem = nome.value.split(/\s+/).filter(Boolean).join(" ");
      if (!quem) { AL.toast("Escreva o nome do aluno.", true); nome.focus(); return; }
      botao.disabled = true;
      try {
        await AL.api("/api/prof/treino", { aluno: quem, area, treino, nota: n, detalhe });
        ultimoNome = quem; if (conhecidos && !conhecidos.includes(quem)) conhecidos.push(quem);
        AL.limpar(el, h("span", { class: "ok" }, "✔ Guardado na pasta de " + quem + " (" + n + "%)."));
      } catch (e) {
        botao.disabled = false;
        AL.toast(e.status === 401 ? "Entre como professor (painel do professor) para guardar." : e.message, true);
      }
    } }, "💾 Guardar na pasta do aluno");
    AL.limpar(el, h("span", {}, "Quem fez:"), nome, lista, botao);
    nomes().then((ns) => AL.limpar(lista, ns.map((x) => h("option", { value: x }))));
    return el;
  }

  return { comoAluno, comoProfessor, comoCasa, caixa, AREAS, modo: () => modo };
})();
