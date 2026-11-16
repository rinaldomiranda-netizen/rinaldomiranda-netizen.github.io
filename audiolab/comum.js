/* RMD AudioLab — funções comuns (professor, aluno e projeção). Textos de usuários entram sempre como texto. */
"use strict";
const AL = {
  async api(caminho, corpo, extra = {}) {
    const o = { method: corpo !== undefined ? "POST" : "GET", headers: {}, credentials: "same-origin", cache: "no-store" };
    if (corpo !== undefined) { o.headers["Content-Type"] = "application/json"; o.body = JSON.stringify(corpo); }
    Object.assign(o.headers, extra.headers || {});
    let r;
    try { r = await fetch(caminho, o); } catch (e) { const er = new Error("Sem conexão com o computador do professor."); er.rede = true; throw er; }
    let d = {};
    try { d = await r.json(); } catch (e) { /* vazio */ }
    if (!r.ok) { const er = new Error(d.erro || "Erro " + r.status); er.status = r.status; throw er; }
    return d;
  },
  h(tag, attrs, ...filhos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else if (k === "class") e.className = v;
      else if (v === true) e.setAttribute(k, "");
      else e.setAttribute(k, v);
    }
    const por = (f) => { if (f === null || f === undefined || f === false) return; if (Array.isArray(f)) f.forEach(por); else e.append(f instanceof Node ? f : document.createTextNode(String(f))); };
    filhos.forEach(por);
    return e;
  },
  limpar(el, ...filhos) {
    el.replaceChildren();
    const por = (f) => { if (f === null || f === undefined || f === false) return; if (Array.isArray(f)) f.forEach(por); else el.append(f instanceof Node ? f : document.createTextNode(String(f))); };
    filhos.forEach(por); return el;
  },
  toast(msg, erro) {
    const t = AL.h("div", { class: "toast" + (erro ? " erro" : ""), role: "status" }, msg);
    document.body.append(t); setTimeout(() => t.remove(), 3200);
  },
  tema(t) { document.documentElement.dataset.tema = ["claro", "medio", "escuro"].includes(t) ? t : "escuro"; },
  cabecalho(el, info, subtitulo, direita) {
    AL.limpar(el, AL.h("div", { class: "logo", "aria-hidden": "true" }, "AL"),
      AL.h("div", { class: "marca" }, AL.h("b", {}, info.nome_empresa || "RMD AudioLab"), AL.h("small", {}, "RMD AudioLab · " + subtitulo)),
      AL.h("div", { class: "direita" }, direita || null));
  },
  tempo(s) { s = Math.max(0, Math.round(s || 0)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); },
  // descrição dos controles da mesa (nome, rótulo, unidade)
  CANAIS: [
    ["voz", "VOZ (microfone)", [["ganho", "GANHO", "dB"], ["grave", "GRAVE · 100 Hz", "dB"], ["mgrave", "MÉDIO-GRAVE · 300 Hz", "dB"], ["medio", "MÉDIO · 1 kHz", "dB"],
      ["magudo", "MÉDIO-AGUDO · 2,5 kHz", "dB"], ["agudo", "AGUDO · 8 kHz", "dB"], ["atraso", "ATRASO DO CANAL", "ms"], ["pan", "PANORAMA", ""], ["fader", "FADER", "dB"]],
      [["hpf", "FILTRO DE GRAVES"], ["comp", "COMPRESSOR"], ["fx", "EFEITO (eco)"]]],
    ["mus", "MÚSICA (playback)", [["ganho", "GANHO", "dB"], ["grave", "GRAVE · 100 Hz", "dB"], ["mgrave", "MÉDIO-GRAVE · 300 Hz", "dB"], ["medio", "MÉDIO · 1 kHz", "dB"],
      ["magudo", "MÉDIO-AGUDO · 2,5 kHz", "dB"], ["agudo", "AGUDO · 8 kHz", "dB"], ["pan", "PANORAMA", ""], ["fader", "FADER", "dB"]],
      [["hpf", "FILTRO DE GRAVES"]]],
  ],
  /* Desenha a mesa. aoMudar(nome, valor) é chamado quando o aluno mexe (só se editavel). Devolve {atualizar(controles), editavel(bool), vu(niveis)} */
  mesa(el, limites, aoMudar) {
    const campos = {}, rotulos = {}, botoes = {}, vus = {}, mexido = {};
    let pode = false;
    // no celular o fader não recebe "foco" ao arrastar: guarda a hora do último toque para a atualização do servidor não puxar o fader de volta
    const tocar = (nome) => { mexido[nome] = Date.now(); };
    const fmt = (v, u) => (u === "dB" && v > 0 ? "+" : "") + v + (u ? " " + u : "");
    const canais = AL.CANAIS.map(([pre, titulo, faders, chaves]) => {
      const vu = AL.h("i"); vus[pre] = vu;
      return AL.h("div", { class: "canal" }, AL.h("h3", {}, titulo), AL.h("div", { class: "vu", "aria-hidden": "true" }, vu),
        faders.map(([k, rot, u]) => {
          const nome = pre + "_" + k, [a, b] = limites[nome];
          const valor = AL.h("b", {}, "");
          const inp = AL.h("input", { type: "range", min: a, max: b, step: nome.endsWith("atraso") ? 5 : 1, "aria-label": titulo + " " + rot,
            onpointerdown: () => tocar(nome), ontouchstart: () => tocar(nome),
            oninput: () => { tocar(nome); valor.textContent = fmt(Number(inp.value), u); if (pode) aoMudar(nome, Number(inp.value)); } });
          campos[nome] = inp; rotulos[nome] = [valor, u];
          return AL.h("div", { class: "ctl" }, AL.h("div", { class: "rot" }, AL.h("span", {}, rot), valor), inp);
        }),
        AL.h("div", { class: "botoes-canal" }, chaves.map(([k, rot]) => {
          const nome = pre + "_" + k;
          const bt = AL.h("button", { type: "button", "aria-pressed": "false", onclick: () => { if (!pode) return; const v = bt.classList.contains("ligado") ? 0 : 1; marcar(bt, v); aoMudar(nome, v); } }, rot);
          botoes[nome] = bt; return bt;
        })));
    });
    const mv = AL.h("i"); vus.master = mv;
    const mval = AL.h("b", {}, "");
    const [ma, mb] = limites.master;
    const minp = AL.h("input", { type: "range", min: ma, max: mb, step: 1, "aria-label": "Master", onpointerdown: () => tocar("master"), ontouchstart: () => tocar("master"),
      oninput: () => { tocar("master"); mval.textContent = fmt(Number(minp.value), "dB"); if (pode) aoMudar("master", Number(minp.value)); } });
    campos.master = minp; rotulos.master = [mval, "dB"];
    const master = AL.h("div", { class: "canal" }, AL.h("h3", {}, "MASTER L/R"), AL.h("div", { class: "vu" }, mv),
      AL.h("div", { class: "ctl" }, AL.h("div", { class: "rot" }, AL.h("span", {}, "MASTER"), mval), minp),
      AL.h("p", { class: "mudo", style: { "font-size": ".8rem" } }, "Saída geral para as caixas."));
    function marcar(bt, v) { bt.classList.toggle("ligado", !!v); bt.setAttribute("aria-pressed", v ? "true" : "false"); }
    AL.limpar(el, AL.h("div", { class: "mesa" }, canais, master));
    return {
      atualizar(c) {
        for (const [n, inp] of Object.entries(campos)) {
          if (c[n] === undefined || (pode && (document.activeElement === inp || Date.now() - (mexido[n] || 0) < 1500))) continue;
          inp.value = c[n]; const [lab, u] = rotulos[n]; lab.textContent = fmt(Number(c[n]), u);
        }
        for (const [n, bt] of Object.entries(botoes)) if (c[n] !== undefined) marcar(bt, c[n]);
      },
      editavel(sim) { pode = !!sim; Object.values(campos).forEach((i) => (i.disabled = !sim)); Object.values(botoes).forEach((b) => (b.disabled = !sim)); },
      vu(niveis) { for (const [k, i] of Object.entries(vus)) i.style.width = Math.round(Math.min(1, Math.max(0, niveis[k] || 0)) * 100) + "%"; },
    };
  },
};
