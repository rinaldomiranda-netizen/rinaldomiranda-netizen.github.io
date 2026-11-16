/* RMD AudioLab — treino em casa (16/11/2026, pedido do Rinaldo).
   O aluno entra com o código que o professor deu, treina no celular (voz, segunda voz, ouvido, regência, metrônomo)
   e a NOTA de cada treino vai para o professor pela nuvem. Sem internet, a nota fica guardada no celular e vai depois.
   O som do microfone e a imagem da câmera nunca saem do celular. */
"use strict";
(function () {
  const NUVEM = "https://cxzzutbijljjteapowuv.supabase.co/functions/v1/audiolab";
  const h = AL.h, app = document.getElementById("app"), cabeca = document.getElementById("cabeca");
  const ler = (k, p) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : p; } catch (e) { return p; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
  let conta = ler("al_casa_conta", null); // { codigo, nome }
  let pedidoInstalar = null;
  const filaEl = h("p", { class: "aviso", style: { margin: ".3rem 0" } });
  const instalarBtn = h("button", { class: "primario oculto", onclick: instalar }, "📲 Instalar o ícone no celular");

  AL.tema("escuro");
  const cab = (sub, direita) => AL.cabecalho(cabeca, { nome_empresa: "RMD AudioLab" }, sub, direita);

  async function nuvem(corpo) {
    let r;
    try { r = await fetch(NUVEM, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo), cache: "no-store" }); }
    catch (e) { const er = new Error("Sem internet agora."); er.rede = true; throw er; }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const er = new Error(d.erro || "Erro " + r.status); er.status = r.status; throw er; }
    return d;
  }

  // ---------------------------------------------------------------- notas: envia já ou guarda para depois
  const agoraTxt = () => new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  function mostrarFila() {
    const n = ler("al_casa_fila", []).length;
    filaEl.textContent = n ? "📥 " + n + " nota(s) guardada(s) no celular: vão para o professor quando tiver internet." : "";
    filaEl.classList.toggle("oculto", !n);
  }
  async function enviarFila() {
    const fila = ler("al_casa_fila", []);
    if (!fila.length || !conta) return mostrarFila();
    const resto = [];
    for (const t of fila) {
      try { await nuvem({ acao: "aluno_treino", codigo: conta.codigo, area: t.area, treino: t.treino, nota: t.nota, detalhe: t.detalhe }); }
      catch (e) { if (e.rede || e.status >= 500 || e.status === 429) resto.push(t); }
    }
    gravar("al_casa_fila", resto); mostrarFila();
  }
  async function enviarTreino(t) {
    try { await nuvem({ acao: "aluno_treino", codigo: conta.codigo, ...t }); return { ok: true }; }
    catch (e) {
      if (e.rede || e.status >= 500) {
        const f = ler("al_casa_fila", []);
        f.push({ ...t, detalhe: (t.detalhe ? t.detalhe + " · " : "") + "feito em " + agoraTxt() });
        gravar("al_casa_fila", f.slice(-200)); mostrarFila();
        return { fila: true };
      }
      if (e.status === 403) setTimeout(() => sair("O seu código foi desativado. Fale com o professor."), 1500);
      throw e;
    }
  }
  window.addEventListener("online", enviarFila);

  // ---------------------------------------------------------------- instalar o ícone
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); pedidoInstalar = e; instalarBtn.classList.remove("oculto"); });
  window.addEventListener("appinstalled", () => { instalarBtn.classList.add("oculto"); AL.toast("Ícone instalado! Abra pelo ícone RMD AudioLab."); });
  const instalado = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  async function instalar() {
    if (pedidoInstalar) { pedidoInstalar.prompt(); await pedidoInstalar.userChoice.catch(() => null); pedidoInstalar = null; instalarBtn.classList.add("oculto"); return; }
    alert(/iphone|ipad/i.test(navigator.userAgent)
      ? "No iPhone: toque no botão Compartilhar (quadrado com seta) e depois em “Adicionar à Tela de Início”."
      : "Abra o menu ⋮ do navegador e toque em “Instalar app” ou “Adicionar à tela inicial”.");
  }

  // ---------------------------------------------------------------- entrar
  function telaEntrar(msg, codigoInicial) {
    cab("Treino em casa");
    const cod = h("input", { class: "codigo", maxlength: 12, value: codigoInicial || "", placeholder: "XXXX-XXXX", autocomplete: "off", "aria-label": "Código do aluno" });
    const botao = h("button", { class: "primario bloco", style: { "margin-top": "1rem" } }, "Entrar");
    AL.limpar(app, h("div", { class: "cartao entrar" },
      h("h2", {}, "🎧 Treino em casa"),
      h("p", {}, "Digite o código que o professor te passou. Ele vem na mensagem junto com o link."),
      msg ? h("p", { class: "erro" }, msg) : null,
      h("form", { onsubmit: async (e) => {
        e.preventDefault(); botao.disabled = true;
        try { const r = await nuvem({ acao: "aluno_entrar", codigo: cod.value }); conta = { codigo: cod.value.toUpperCase().trim(), nome: r.nome }; gravar("al_casa_conta", conta); montar(); }
        catch (er) { AL.toast(er.rede ? "Sem internet agora. Para entrar a primeira vez precisa de internet." : er.message, true); botao.disabled = false; }
      } }, h("label", {}, "Código do aluno"), cod, botao)));
    if (!codigoInicial) cod.focus();
  }
  function sair(msg) {
    if (!msg && !confirm("Sair deste celular? As notas que ainda não foram enviadas serão perdidas.")) return;
    try { localStorage.removeItem("al_casa_conta"); localStorage.removeItem("al_casa_fila"); } catch (e) { /* ok */ }
    conta = null; FerramentasAL.parar(); telaEntrar(msg);
  }

  // ---------------------------------------------------------------- tela principal
  function montar() {
    TreinosAL.comoCasa(enviarTreino);
    cab("Treino em casa", h("button", { onclick: () => sair() }, "Sair"));
    const corpoTreino = h("div"), corpoNotas = h("div");
    const abas = [["treino", "🎤 Treinar", corpoTreino], ["notas", "📋 Minhas notas", corpoNotas]];
    const barra = h("div", { class: "abas" }, abas.map(([id, t]) => h("button", { "data-aba": id, onclick: () => trocar(id) }, t)));
    function trocar(id) {
      barra.querySelectorAll("button").forEach((b) => b.classList.toggle("ligado", b.dataset.aba === id));
      abas.forEach(([x, , el]) => el.classList.toggle("oculto", x !== id));
      if (id === "notas") carregarNotas(); else if (!corpoTreino.childElementCount) FerramentasAL.montar(corpoTreino, { semTelao: true, itens: ["labvoz", "ouvido", "camera", "metronomo"] });
      if (id !== "treino") FerramentasAL.parar();
    }
    async function carregarNotas() {
      AL.limpar(corpoNotas, h("p", { class: "mudo" }, "Carregando…"));
      try {
        const d = await nuvem({ acao: "aluno_meus", codigo: conta.codigo });
        AL.limpar(corpoNotas, h("div", { class: "cartao" }, h("h2", {}, "Minhas notas (as últimas 40)"),
          d.itens.length ? h("div", { class: "rolar" }, h("table", {}, h("thead", {}, h("tr", {}, ["Quando", "Treino", "Nota"].map((t) => h("th", {}, t)))),
            h("tbody", {}, d.itens.map((x) => h("tr", {}, h("td", {}, new Date(x.criado).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })),
              h("td", {}, x.treino, x.detalhe ? h("small", { class: "mudo", style: { display: "block" } }, x.detalhe) : null),
              h("td", {}, h("b", { class: x.nota >= 80 ? "ok" : x.nota >= 50 ? "aviso" : "erro" }, x.nota + "%")))))))
            : h("p", { class: "mudo" }, "Você ainda não tem notas. Faça um treino e toque em terminar: a nota aparece aqui e vai para o professor.")));
      } catch (e) { AL.limpar(corpoNotas, h("p", { class: e.rede ? "aviso" : "erro" }, e.rede ? "Sem internet agora: as notas aparecem quando voltar a internet." : e.message)); }
    }
    AL.limpar(app,
      h("div", { class: "cartao" }, h("h2", {}, "Olá, " + conta.nome.split(" ")[0] + "! 👋"),
        h("p", { class: "mudo" }, "Escolha um treino. No fim de cada um, a nota vai sozinha para o professor. Use fone de ouvido nos treinos de voz e de ouvido."),
        instado(), filaEl),
      barra, corpoTreino, corpoNotas);
    trocar("treino"); mostrarFila(); enviarFila();
  }
  function instado() { return instalado() ? null : h("div", {}, instalarBtn, h("p", { class: "mudo", style: { margin: ".3rem 0 0" } }, "Com o ícone instalado, o treino abre direto, como um aplicativo.")); }

  // ---------------------------------------------------------------- começo
  if ("serviceWorker" in navigator && /\/$|index\.html$/.test(location.pathname)) navigator.serviceWorker.register("sw.js").catch(() => {});
  const q = new URLSearchParams(location.search), codigoLink = (q.get("c") || "").toUpperCase();
  if (codigoLink) history.replaceState(null, "", location.pathname); // o código não fica aparecendo na barra
  if (conta && (!codigoLink || codigoLink === conta.codigo)) { montar(); return; }
  if (codigoLink) {
    // veio pelo link do professor: entra sozinho
    cab("Treino em casa");
    AL.limpar(app, h("p", { class: "mudo" }, "Entrando…"));
    nuvem({ acao: "aluno_entrar", codigo: codigoLink })
      .then((r) => { conta = { codigo: codigoLink, nome: r.nome }; gravar("al_casa_conta", conta); montar(); })
      .catch((e) => telaEntrar(e.rede ? "Sem internet agora. Conecte e tente de novo." : e.message, codigoLink));
    return;
  }
  telaEntrar();
})();
