"use strict";
const $ = (s, root = document) => root.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  calendar:
    "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM7 14h3M14 14h3M7 18h3",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  wallet:
    "M20 8V5H4a2 2 0 0 1 0-4h14v4M3 3v16a2 2 0 0 0 2 2h16V8H5M16 12h5v5h-5z",
  settings:
    "m12 3 2 3 3-1 2 3-2 3 2 3-2 3-3-1-2 3-3-2-3 1-2-3 2-3-2-3 2-3 3 1Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  arrow: "M4 12h16M14 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  clock: "M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  check: "m5 12 4 4L19 6",
  shuffle: "m4 4 16 16M16 20h4v-4M4 20l6-6M14 10l6-6M16 4h4v4",
  ball: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-10-5 5 4-2 6H9l-2-6ZM12 2v5M2 12l5-1M6 20l3-3M18 20l-3-3M22 12l-5-1",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  trophy:
    "M8 3h8v7a4 4 0 0 1-8 0ZM8 5H3v3a5 5 0 0 0 5 5M16 5h5v3a5 5 0 0 1-5 5M12 14v6M7 21h10",
  share: "M12 16V2M7 7l5-5 5 5M5 11H3v10h18V11h-2",
  spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z",
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.ball}"/></svg>`;
const money = (n) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
const initials = (n) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
const colors = [
  "#e4ebd7",
  "#e9ddd0",
  "#dce6e5",
  "#e9e1ef",
  "#f2e7c9",
  "#dce5ce",
];
const avatar = (p) =>
  `<span class="avatar" style="background:${colors[p.id % colors.length]}">${esc(initials(p.name))}</span>`;
const day = new Date();
day.setDate(day.getDate() + ((2 - day.getDay() + 7) % 7 || 7));
const localDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const seed = () => ({
  version: 1,
  group: "Pelada de terça",
  venue: "Arena da Vila",
  fee: 30,
  capacity: 14,
  teamCount: 2,
  lineup: 7,
  players: [
    "Rafael Lima",
    "Bruno Santos",
    "Lucas Oliveira",
    "Gabriel Costa",
    "Pedro Henrique",
    "Thiago Alves",
    "Matheus Silva",
    "Diego Rocha",
    "Felipe Souza",
    "André Martins",
    "Gustavo Melo",
    "João Victor",
    "Caio Ribeiro",
    "Vinícius Dias",
    "Daniel Gomes",
    "Leo Ferreira",
    "Renato Cruz",
    "Henrique Luz",
  ].map((name, i) => ({
    id: i + 1,
    name,
    position: i < 2 ? "Goleiro" : ["Defesa", "Meio", "Ataque"][i % 3],
    rating: [
      8.2, 7.8, 8.5, 7.2, 9, 7.5, 8, 7.3, 8.6, 7.9, 6.8, 8.1, 7.6, 8.4, 7, 7.7,
      8.3, 6.9,
    ][i],
    paid: i < 11,
  })),
  matches: [
    {
      id: 1,
      date: localDate(day),
      time: "19:30",
      venue: "Arena da Vila",
      notes: "Chega 15 min antes. Depois do jogo tem resenha!",
      capacity: 14,
      teamCount: 2,
      fee: 30,
      status: "open",
      attendance: Object.fromEntries(
        Array.from({ length: 18 }, (_, i) => [
          i + 1,
          i < 12 ? "confirmed" : "pending",
        ]),
      ),
      teams: [],
      score: [0, 0],
      elapsed: 0,
      runningSince: null,
      round: 1,
      finished: false,
    },
  ],
  activities: [],
});
let storageWorks = true;
let state;
try {
  state = JSON.parse(localStorage.getItem("resenha-v1"));
  if (
    !state ||
    state.version !== 1 ||
    !Array.isArray(state.players) ||
    !Array.isArray(state.matches)
  )
    state = seed();
} catch {
  state = seed();
  storageWorks = false;
}
let activeMatchId = state.activeMatchId || state.matches[0]?.id;
let view = "inicio",
  tab = "confirmed",
  playerFilter = "all",
  query = "",
  toastTimer,
  returnFocus;
const save = () => {
  try {
    localStorage.setItem("resenha-v1", JSON.stringify(state));
  } catch {
    storageWorks = false;
    toast("Não foi possível salvar. Os dados durarão apenas nesta sessão.");
  }
};
const match = () =>
  state.matches.find((m) => m.id === activeMatchId) || state.matches[0];
const nextMatch = () =>
  [...state.matches]
    .filter((m) => !m.finished)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
const confirmed = (m) =>
  state.players.filter((p) => m.attendance[p.id] === "confirmed");
const paidTotal = () => state.players.filter((p) => p.paid).length * state.fee;
const dateObj = (m) => new Date(`${m.date}T${m.time}:00`);
const dateLabel = (m) =>
  dateObj(m).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
const btn = (label, action, style = "", id = "") =>
  `<button class="button ${style}" data-action="${action}" ${id !== "" ? `data-id="${id}"` : ""}>${label}</button>`;
const navItems = [
  ["inicio", "home", "Visão geral"],
  ["partida", "calendar", "Partidas"],
  ["jogadores", "users", "Jogadores"],
  ["caixa", "wallet", "Caixa"],
  ["regras", "settings", "Configurações"],
];
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3500);
}
function log(text) {
  state.activities.unshift({ text, at: Date.now() });
  state.activities = state.activities.slice(0, 10);
  save();
}
function heading(eyebrow, title, subtitle, actions = "") {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function progress(value, total) {
  const p = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return `<div class="progress"><span style="width:${p}%"></span></div>`;
}
function page() {
  const base = ["presenca", "sorteio", "campo"].includes(view)
    ? "partida"
    : view;
  $("#nav").innerHTML = navItems
    .map(
      ([key, i, label]) =>
        `<a href="#${key}" class="nav-link ${base === key ? "active" : ""}" ${base === key ? 'aria-current="page"' : ""}>${icon(i)}<span>${label}</span>${key === "jogadores" ? `<span class="badge">${state.players.length}</span>` : ""}</a>`,
    )
    .join("");
  $("#breadcrumb").textContent =
    navItems.find((n) => n[0] === base)?.[2] || "Partidas";
  $("#group-name").textContent = state.group;
  $("#main").innerHTML = (
    {
      inicio: home,
      partida: matches,
      presenca: attendance,
      sorteio: teams,
      campo: live,
      jogadores: players,
      caixa: finance,
      regras: settings,
    }[view] || home
  )();
  updateTimer();
}
function navigate(key) {
  if (location.hash === `#${key}`) {
    view = key;
    page();
  } else location.hash = key;
}
function home() {
  const m = nextMatch();
  const paid = paidTotal(),
    total = state.players.length * state.fee;
  const stats = [
    [
      "users",
      "Elenco da pelada",
      state.players.length,
      "jogadores",
      "Todo mundo no mesmo time",
    ],
    [
      "calendar",
      "Próximo encontro",
      m ? dateObj(m).getDate().toString().padStart(2, "0") : "—",
      m ? dateObj(m).toLocaleDateString("pt-BR", { month: "short" }) : "",
      "<span>Bora tirar a bola do armário?</span>",
    ],
    [
      "check",
      "Presenças confirmadas",
      m ? confirmed(m).length : 0,
      m ? `/ ${m.capacity}` : "",
      "A lista está esperando a galera",
    ],
    [
      "wallet",
      "Caixa da pelada",
      money(paid),
      "",
      `<span>${total ? Math.round((paid / total) * 100) : 0}% recebido</span> neste período`,
    ],
  ];
  return (
    heading(
      "O JOGO COMEÇA NA ORGANIZAÇÃO",
      "Bora jogar, <em>galera.</em>",
      "Menos mensagem no grupo. Mais bola no pé.",
      btn(`${icon("plus")} Criar partida`, "new-match"),
    ) +
    `<div class="stats">${stats.map(([i, l, n, u, f]) => `<div class="stat"><div class="stat-top">${l}<span class="stat-icon">${icon(i)}</span></div><div class="stat-value">${n}<small>${u}</small></div><div class="stat-foot">${f}</div></div>`).join("")}</div><div class="dashboard-grid"><div><section class="hero"><div class="hero-top"><span class="hero-label"><i></i> PRÓXIMA PARTIDA</span><span>O NOSSO COMPROMISSO SAGRADO</span></div>${m ? `<h2>${esc(state.group)}.<br><span>Dentro de campo.</span></h2><div class="hero-meta">${icon("calendar")} ${esc(dateLabel(m))} · ${esc(m.time)}</div><div class="hero-meta">${icon("pin")} ${esc(m.venue)} · Society</div><div class="pitch" aria-hidden="true"><span class="goal"></span><span class="goal bottom"></span><span class="pitch-ball">⚽</span></div><div class="hero-bottom"><div class="hero-people"><div class="avatar-stack">${confirmed(m).slice(0, 4).map(avatar).join("")}</div><span><strong>${confirmed(m).length} confirmados</strong> · ${Math.max(0, m.capacity - confirmed(m).length)} vagas</span></div>${btn(`Abrir lista de presença ${icon("arrow")}`, "open-match", "lime", m.id)}</div>` : `<h2>A próxima resenha<br><span>começa com você.</span></h2><p class="hero-meta">Marque uma partida e chame os amigos.</p>${btn("Criar primeira partida", "new-match", "lime")}`}</section><div class="section-heading"><h2>Resolve em um toque</h2><span class="eyebrow" style="margin:0">MENOS BUROCRACIA, MAIS JOGO</span></div><div class="shortcuts">${[
      ["calendar", "Nova partida", "new-match"],
      ["shuffle", "Sortear times", "quick-draw"],
      ["users", "Ver elenco", "go-players"],
      ["wallet", "Organizar caixa", "go-finance"],
    ]
      .map(
        ([i, l, a]) =>
          `<button class="shortcut" data-action="${a}">${icon(i)}${l}</button>`,
      )
      .join(
        "",
      )}</div><div class="section-heading"><h2>Na agenda <span class="badge-number">${state.matches.filter((m) => !m.finished).length}</span></h2>${btn(`Ver partidas ${icon("arrow")}`, "go-matches", "ghost")}</div>${
      [...state.matches]
        .filter((m) => !m.finished)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .slice(0, 2)
        .map(matchCard)
        .join("") ||
      '<div class="empty">Nenhuma partida marcada. Que tal começar?</div>'
    }</div><div class="dashboard-aside"><section class="panel"><div class="panel-title"><h2>Caixa em dia, jogo tranquilo</h2><span class="chip green">Por jogador</span></div><p class="eyebrow">RECEBIDO NO PERÍODO</p><div class="finance-value">${money(paid)} <small>de ${money(total)}</small></div>${progress(paid, total)}<div class="progress-label"><strong>${total ? Math.round((paid / total) * 100) : 0}% do total</strong><span>Faltam ${money(total - paid)}</span></div><hr class="divider">${
      state.players
        .filter((p) => !p.paid)
        .slice(0, 2)
        .map(
          (p) =>
            `<div class="mini-row">${avatar(p)}<div><span class="name">${esc(p.name)}</span><small>Contribuição da pelada</small></div><span class="right">${money(state.fee)}</span></div>`,
        )
        .join("") || '<p class="subtitle">Todo mundo em dia. Boa, galera!</p>'
    }${btn(`Ver pagamentos ${icon("arrow")}`, "go-finance", "secondary full")}</section><section><div class="section-heading"><h2>A resenha tá acontecendo</h2><span class="chip">Atividade</span></div><div class="panel">${(state.activities.length ? state.activities.slice(0, 3) : [{ text: "Seu elenco está pronto. Confirme quem vem jogar." }, { text: "Sua próxima partida já está na agenda." }, { text: "Organize os times e deixe o resto com a bola." }]).map((a, i) => `<div class="activity-row"><span class="activity-icon">${icon(["check", "calendar", "users"][i % 3])}</span><div><p>${esc(a.text)}</p><small>${a.at ? "Salvo neste navegador" : "Vamos nessa"}</small></div></div>`).join("")}</div></section><div class="tip">${icon("spark")}<div><strong>Time equilibrado. Resenha garantida.</strong><p>Use as notas do elenco para distribuir a habilidade e deixar o jogo bom para todo mundo.</p></div></div></div></div>`
  );
}
function matchCard(m) {
  return `<button class="match-row" style="width:100%;text-align:left" data-action="open-match" data-id="${m.id}"><span class="date-tile"><b>${dateObj(m).getDate().toString().padStart(2, "0")}</b><span>${esc(dateObj(m).toLocaleDateString("pt-BR", { month: "short" }))}</span></span><span class="match-info"><strong>${esc(state.group)} · ${esc(m.time)}</strong><p>${esc(m.venue)} · ${confirmed(m).length}/${m.capacity} confirmados</p></span><span class="chip ${m.finished ? "dark" : m.status === "closed" ? "orange" : "green"}">${m.finished ? "Encerrada" : m.status === "closed" ? "Lista fechada" : "Lista aberta"}</span><span class="chevron">↗</span></button>`;
}
function matches() {
  return (
    heading(
      "AGENDA DA GALERA",
      "O próximo jogo <em>já tem lugar.</em>",
      "Marque o encontro. A gente organiza o resto.",
      btn(`${icon("plus")} Criar partida`, "new-match"),
    ) + state.matches.map(matchCard).join("")
  );
}
function matchTabs() {
  return `<div class="tabs" aria-label="Etapas da partida">${[
    ["presenca", "Presença"],
    ["sorteio", "Sorteio"],
    ["campo", "Em campo"],
  ]
    .map(
      ([v, l]) =>
        `<button data-action="match-tab" data-id="${v}" class="${view === v ? "active" : ""}">${l}</button>`,
    )
    .join("")}</div>`;
}
function attendance() {
  const m = match();
  if (!m) return noMatch();
  const c = confirmed(m).length;
  const count = (k) =>
    state.players.filter((p) => (m.attendance[p.id] || "pending") === k).length;
  return (
    heading(
      "PARTIDA · " + esc(m.time),
      esc(state.group),
      "Você organiza a lista. A galera traz o futebol.",
      btn("Ver detalhes", "match-details", "secondary"),
    ) +
    matchTabs() +
    `<div class="two-col"><section class="panel"><div class="panel-title"><h2>Quem fecha com a gente?</h2><span class="chip ${m.status === "closed" ? "orange" : "green"}">${m.status === "closed" ? "Lista fechada" : "Lista aberta"}</span></div><div class="tabs">${[
      ["confirmed", "Confirmados"],
      ["pending", "Pendentes"],
      ["queue", "Fila"],
    ]
      .map(
        ([k, l]) =>
          `<button data-action="attendance-tab" data-id="${k}" class="${tab === k ? "active" : ""}">${l} (${count(k)})</button>`,
      )
      .join("")}</div>${
      state.players
        .filter((p) => (m.attendance[p.id] || "pending") === tab)
        .map(
          (p) =>
            `<div class="player-row">${avatar(p)}<div class="player-detail"><strong>${esc(p.name)}</strong><small>${esc(p.position)} · Nota ${p.rating.toFixed(1)}</small></div>${btn(tab === "confirmed" ? "Remover" : tab === "queue" ? "Sair da fila" : "Confirmar", tab === "pending" ? "confirm" : "unconfirm", "secondary", p.id).replace("<button ", `<button ${m.status === "closed" ? "disabled " : ""}`)}</div>`,
        )
        .join("") ||
      '<div class="empty">Ninguém por aqui. A lista está atualizada!</div>'
    }</section><aside><section class="panel"><div class="panel-title"><h2>O encontro</h2>${icon("calendar")}</div><p class="subtitle">${esc(dateLabel(m))} · ${esc(m.time)}<br>${esc(m.venue)}</p><hr class="divider"><div class="stat-value">${c}<small>de ${m.capacity} vagas</small></div>${progress(c, m.capacity)}<p class="subtitle">${Math.max(0, m.capacity - c)} vagas livres · ${count("queue")} na fila</p><hr class="divider"><p class="subtitle">${esc(m.notes || "Bora jogar!")}</p><div class="section-spacer">${m.status === "closed" ? btn("Reabrir lista", "reopen", "secondary full") : btn(`${icon("shuffle")} Fechar lista e sortear`, "close-draw", "full")}</div></section><div class="tip">${icon("users")}<div><strong>Lotou? Tem lugar na fila.</strong><p>Quando uma vaga abre, o primeiro da fila entra automaticamente. A lista fechada protege os times.</p></div></div></aside></div>`
  );
}
function noMatch() {
  return (
    heading(
      "BORA JOGAR",
      "O primeiro passo é marcar.",
      "Crie uma partida para começar.",
      btn("Criar partida", "new-match"),
    ) + '<div class="empty">A agenda está livre para uma nova resenha.</div>'
  );
}
function teamAvg(ids) {
  return ids.length
    ? ids.reduce(
        (s, id) => s + (state.players.find((p) => p.id === id)?.rating || 0),
        0,
      ) / ids.length
    : 0;
}
function teams() {
  const m = match();
  if (!m) return noMatch();
  if (!m.teams.length)
    return (
      heading(
        "TIMES",
        "Futebol bom é <em>jogo parelho.</em>",
        "Confirme o elenco antes de fechar os times.",
      ) +
      matchTabs() +
      `<section class="panel"><div class="empty">A lista ainda está aberta. Confirme a galera e feche a lista para sortear.</div>${btn("Ir para presença", "go-attendance", "full")}</section>`
    );
  const avgs = m.teams.map(teamAvg),
    diff = Math.max(...avgs) - Math.min(...avgs),
    balance = Math.max(0, 100 - diff * 10);
  return (
    heading(
      "SORTEIO",
      "Rivais em campo. <em>Parceiros sempre.</em>",
      "Times distribuídos por nota, tamanho e goleiros.",
      btn(`${icon("share")} Compartilhar`, "share-teams", "secondary"),
    ) +
    matchTabs() +
    `<div class="balance"><div><strong>${balance.toFixed(0)}% de equilíbrio</strong><p>Diferença de ${diff.toFixed(2)} entre as médias. Troque jogadores para ajustar o jogo.</p></div>${btn(`${icon("shuffle")} Sortear de novo`, "redraw", "lime").replace("<button ", `<button ${m.runningSince || m.elapsed > 0 || m.score.some(Boolean) || m.finished ? "disabled " : ""}`)}</div><div class="team-grid">${m.teams
      .map(
        (ids, i) =>
          `<section class="panel team-${i}"><div class="team-header"><h2><i class="team-dot"></i>Time ${String.fromCharCode(65 + i)}</h2><span>Média ${teamAvg(ids).toFixed(1)} · ${ids.length} jogadores</span></div>${ids
            .map((id) => {
              const p = state.players.find((p) => p.id === id);
              if (!p) return "";
              return `<div class="player-row">${avatar(p)}<div class="player-detail"><strong>${esc(p.name)}</strong><small>${esc(p.position)}</small></div><span class="rating">${p.rating.toFixed(1)}</span>${btn("Trocar", "swap", "secondary", p.id).replace("<button ", `<button ${m.runningSince || m.elapsed > 0 || m.score.some(Boolean) || m.finished ? "disabled " : ""}`)}</div>`;
            })
            .join("")}</section>`,
      )
      .join(
        "",
      )}</div><div class="section-heading"><p class="subtitle">O compartilhamento leva apenas os nomes. As notas ficam por aqui.</p>${btn(`Bora pro campo ${icon("arrow")}`, "go-live")}</div>`
  );
}
function live() {
  const m = match();
  if (!m) return noMatch();
  if (!m.teams.length) return teams();
  return (
    heading(
      "DIA DE JOGO",
      "Agora é <em>bola no pé.</em>",
      "Placar e cronômetro para ninguém perder a conta.",
    ) +
    matchTabs() +
    `<section class="scoreboard"><p class="eyebrow">${m.finished ? "PARTIDA ENCERRADA" : `RODADA ${m.round} · GANHA FICA`}</p><div class="score"><div class="score-team"><h2>Time ${String.fromCharCode(65 + (m.sides?.[0] || 0))}</h2><div class="score-number">${m.score[0]}</div></div><span class="score-separator">×</span><div class="score-team"><h2>Time ${String.fromCharCode(65 + (m.sides?.[1] ?? 1))}</h2><div class="score-number">${m.score[1]}</div></div></div><div class="timer" id="timer">00:00</div><div class="live-actions">${!m.finished ? `${btn(`${icon("plus")} Gol time ${String.fromCharCode(65 + (m.sides?.[0] || 0))}`, "goal", "lime", 0)}${btn(`${icon("plus")} Gol time ${String.fromCharCode(65 + (m.sides?.[1] ?? 1))}`, "goal", "lime", 1)}` : ""}</div><div class="live-actions section-spacer">${!m.finished ? `${btn(m.runningSince ? "Pausar cronômetro" : "Iniciar cronômetro", "timer", "secondary")}${btn("Desfazer último gol", "undo-goal", "secondary").replace("<button ", `<button ${m.goalHistory?.length ? "" : "disabled "}`)}${m.teams.length > 2 ? btn("Próxima rodada", "next-round", "secondary") : ""}${btn("Encerrar partida", "finish", "secondary")}` : btn("Ver caixa da pelada", "go-finance", "lime")}</div></section><div class="notice section-spacer">${
      m.teams.length > 2
        ? `Descansando: ${m.teams
            .map((_, i) => i)
            .filter((i) => !(m.sides || [0, 1]).includes(i))
            .map((i) => "Time " + String.fromCharCode(65 + i))
            .join(
              ", ",
            )}. Vencedor fica; em empate, o time da esquerda descansa.`
        : "Dois times, uma resenha. O tempo é salvo mesmo quando você sai desta tela."
    }</div>`
  );
}
function filteredPlayers() {
  return state.players.filter(
    (p) =>
      (playerFilter === "all" ||
        (playerFilter === "keeper"
          ? p.position === "Goleiro"
          : p.position !== "Goleiro")) &&
      p.name
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
  );
}
function playerRows() {
  return (
    filteredPlayers()
      .map(
        (p) =>
          `<div class="player-row">${avatar(p)}<button class="player-detail player-open" data-action="profile" data-id="${p.id}"><strong>${esc(p.name)}</strong><small>${esc(p.position)} · ${p.paid ? "Contribuição em dia" : "Pagamento pendente"}</small></button><span class="rating">${p.rating.toFixed(1)}</span>${btn("Perfil", "profile", "secondary", p.id)}</div>`,
      )
      .join("") ||
    '<div class="empty">Nenhum jogador encontrado. Tente outro nome.</div>'
  );
}
function players() {
  return (
    heading(
      "O NOSSO ELENCO",
      `${state.players.length} jeitos de <em>jogar junto.</em>`,
      "Cada um com seu estilo. Todo mundo pela resenha.",
      btn(`${icon("plus")} Adicionar jogador`, "new-player"),
    ) +
    `<div class="toolbar"><div class="search">${icon("search")}<label for="player-search" class="visually-hidden">Buscar jogador</label><input id="player-search" placeholder="Quem você procura?" value="${esc(query)}" autocomplete="off"></div><div class="tabs">${[
      ["all", "Todos"],
      ["keeper", "Goleiros"],
      ["field", "Linha"],
    ]
      .map(
        ([k, l]) =>
          `<button data-action="player-filter" data-id="${k}" class="${playerFilter === k ? "active" : ""}">${l}</button>`,
      )
      .join(
        "",
      )}</div></div><section class="panel" id="player-list">${playerRows()}</section>`
  );
}
function finance() {
  const total = state.players.length * state.fee,
    paid = paidTotal();
  return (
    heading(
      "SEM CLIMÃO NO GRUPO",
      "Caixa em dia. <em>Cabeça no jogo.</em>",
      "Controle manual de contribuições. Nenhuma transação é feita pelo app.",
      btn(`${icon("share")} Copiar lembrete`, "payment-reminder", "secondary"),
    ) +
    `<div class="stats"><div class="stat"><div class="stat-top">Já recebido ${icon("wallet")}</div><div class="stat-value">${money(paid)}</div><div class="stat-foot">${state.players.filter((p) => p.paid).length} jogadores em dia</div></div><div class="stat"><div class="stat-top">Falta receber ${icon("clock")}</div><div class="stat-value">${money(total - paid)}</div><div class="stat-foot">${state.players.filter((p) => !p.paid).length} contribuições pendentes</div></div><div class="stat"><div class="stat-top">Contribuição por jogador</div><div class="stat-value">${money(state.fee)}</div><div class="stat-foot">Definida nas configurações</div></div><div class="stat"><div class="stat-top">Meta do período</div><div class="stat-value">${money(total)}</div>${progress(paid, total)}</div></div><section class="panel"><div class="panel-title"><h2>Uma resenha sem pendências</h2><span class="chip">Período atual</span></div>${state.players.map((p) => `<div class="player-row">${avatar(p)}<div class="player-detail"><strong>${esc(p.name)}</strong><small>${money(state.fee)} · Contribuição da pelada</small></div><span class="chip ${p.paid ? "green" : "orange"}">${p.paid ? "Pago" : "Pendente"}</span>${btn(p.paid ? "Desfazer" : "Marcar pago", "toggle-payment", p.paid ? "secondary" : "", p.id)}</div>`).join("")}</section>`
  );
}
function settings() {
  return (
    heading(
      "DO JEITO DA GALERA",
      "A pelada é sua. <em>As regras também.</em>",
      "Defina o padrão para as próximas partidas.",
    ) +
    `<form id="settings-form" class="panel"><div class="two-col"><div><div class="panel-title"><h2>A identidade da resenha</h2></div>${field("Nome da pelada", "group", state.group, "text", 'required maxlength="45"')}${field("Local padrão", "venue", state.venue, "text", 'required maxlength="80"')}<div class="fields">${field("Contribuição por jogador (R$)", "fee", state.fee, "number", 'required min="0" max="10000" step="1"')}${field("Quantidade de times", "teamCount", state.teamCount, "number", 'required min="2" max="6"')}</div>${field("Jogadores por time (incluindo goleiro)", "lineup", state.lineup, "number", 'required min="2" max="11"')}</div><div><div class="panel-title"><h2>Bom de saber</h2></div><div class="notice">As regras valem para novas partidas. Cada partida preserva sua capacidade e quantidade de times.</div><p class="subtitle">O sorteio equilibra as notas, mantém o tamanho dos times e distribui os goleiros disponíveis. É necessário pelo menos um goleiro por time para fechar a lista.</p><hr class="divider"><p class="subtitle">Estes dados estão neste navegador. Esta versão não tem login, sincronização ou pagamentos online.</p><div class="section-spacer">${btn(`${icon("share")} Exportar meus dados`, "export", "secondary")}</div></div></div><div class="modal-actions"><button class="button" type="submit">Salvar configurações</button></div></form>`
  );
}
function field(label, name, value, type = "text", attrs = "") {
  return `<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${attrs}></div>`;
}
function modal(title, body) {
  returnFocus = document.activeElement;
  $("#modal-root").innerHTML =
    `<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><h2 id="modal-title">${title}</h2><button class="modal-close" data-action="close-modal" aria-label="Fechar janela">×</button></div>${body}</section></div>`;
  document.body.style.overflow = "hidden";
  $(".workspace").inert = true;
  $(".sidebar").inert = true;
  setTimeout(() => $(".modal input, .modal select, .modal button")?.focus(), 0);
}
function closeModal() {
  $("#modal-root").innerHTML = "";
  document.body.style.overflow = "";
  $(".workspace").inert = false;
  $(".sidebar").inert = false;
  returnFocus?.focus();
}
function matchForm() {
  modal(
    "Marca aí: tem jogo!",
    `<p class="subtitle">Escolha o dia, separe a chuteira e deixe a lista com a gente.</p><form id="match-form"><div class="fields">${field("Data", "date", localDate(new Date()), "date", "required")}${field("Hora", "time", "19:30", "time", "required")}</div>${field("Local", "venue", state.venue, "text", 'required maxlength="80"')}<div class="field"><label for="f-notes">Recado para a galera</label><textarea name="notes" id="f-notes" maxlength="300" placeholder="Ex.: levar camisa clara e escura"></textarea></div><div class="notice">${state.teamCount} times · ${state.lineup} jogadores por time · ${state.teamCount * state.lineup} vagas. Ajuste o padrão em Configurações.</div><div class="modal-actions">${btn("Cancelar", "close-modal", "secondary")}<button type="submit" class="button">Criar partida ${icon("arrow")}</button></div></form>`,
  );
}
function playerForm(id) {
  const p = state.players.find((p) => p.id === Number(id));
  modal(
    p ? "Esse é o seu craque." : "Mais um pra resenha!",
    `<form id="player-form" data-id="${p?.id || ""}">${field("Nome do jogador", "name", p?.name || "", "text", 'required maxlength="60"')}<div class="field"><label for="f-position">Posição preferida</label><select name="position" id="f-position">${["Goleiro", "Defesa", "Meio", "Ataque"].map((pos) => `<option ${p?.position === pos ? "selected" : ""}>${pos}</option>`).join("")}</select></div>${field("Nota geral (0 a 10)", "rating", p?.rating ?? 7, "number", 'required min="0" max="10" step="0.1"')}<p class="subtitle">Essa nota ajuda a equilibrar os times. Ela fica fora do texto compartilhado.</p><div class="modal-actions">${btn("Cancelar", "close-modal", "secondary")}<button type="submit" class="button">${p ? "Salvar perfil" : "Adicionar jogador"}</button></div></form>`,
  );
}
function draw(m) {
  const ids = confirmed(m);
  const keepers = ids
    .filter((p) => p.position === "Goleiro")
    .sort(() => Math.random() - 0.5);
  const fieldPlayers = ids
    .filter((p) => p.position !== "Goleiro")
    .map((p) => ({ ...p, tie: Math.random() }))
    .sort((a, b) => b.rating - a.rating || a.tie - b.tie);
  const result = Array.from({ length: m.teamCount }, () => []);
  keepers
    .slice(0, m.teamCount)
    .sort((a, b) => b.rating - a.rating)
    .forEach((p, i) => result[i].push(p.id));
  for (const p of [...fieldPlayers, ...keepers.slice(m.teamCount)]) {
    const smallest = Math.min(...result.map((t) => t.length));
    const targets = result
      .map((t, i) => ({
        i,
        size: t.length,
        sum: t.reduce(
          (s, id) => s + state.players.find((p) => p.id === id).rating,
          0,
        ),
        tie: Math.random(),
      }))
      .filter((t) => t.size === smallest)
      .sort((a, b) => a.sum - b.sum || a.tie - b.tie);
    result[targets[0].i].push(p.id);
  }
  m.teams = result;
  m.sides = [0, 1];
  m.score = [0, 0];
  m.elapsed = 0;
  m.runningSince = null;
  m.goalHistory = [];
  m.round = 1;
  save();
}
function closeDraw() {
  const m = match(),
    people = confirmed(m);
  if (people.length < m.teamCount * 2) {
    toast(`Confirme pelo menos ${m.teamCount * 2} jogadores para sortear.`);
    return;
  }
  if (people.filter((p) => p.position === "Goleiro").length < m.teamCount) {
    toast(`Confirme pelo menos ${m.teamCount} goleiros, um para cada time.`);
    return;
  }
  m.status = "closed";
  draw(m);
  log("Lista fechada. Os times estão prontos para entrar em campo.");
  navigate("sorteio");
}
function elapsed(m) {
  return m.elapsed + (m.runningSince ? Date.now() - m.runningSince : 0);
}
function updateTimer() {
  const el = $("#timer"),
    m = match();
  if (el && m) {
    const sec = Math.floor(elapsed(m) / 1000);
    el.textContent = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  }
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copiado! Agora é só mandar no grupo.");
  } catch {
    modal(
      "Pronto para compartilhar",
      `<p class="subtitle">Selecione e copie o texto abaixo para enviar à galera.</p><label for="share-text" class="visually-hidden">Texto para compartilhar</label><textarea id="share-text" readonly style="min-height:230px">${esc(text)}</textarea>`,
    );
    $("#share-text").select();
  }
}
const actions = {
  "new-match": matchForm,
  "new-player": () => playerForm(),
  "close-modal": closeModal,
  "go-players": () => navigate("jogadores"),
  "go-finance": () => navigate("caixa"),
  "go-matches": () => navigate("partida"),
  "go-attendance": () => navigate("presenca"),
  "go-live": () => navigate("campo"),
  "open-match": (id) => {
    activeMatchId = Number(id);
    state.activeMatchId = activeMatchId;
    save();
    tab = "confirmed";
    navigate("presenca");
  },
  "match-tab": (id) => navigate(id),
  "attendance-tab": (id) => {
    tab = id;
    page();
  },
  "player-filter": (id) => {
    playerFilter = id;
    page();
  },
  "quick-draw": () => {
    const m = nextMatch();
    if (!m) {
      matchForm();
      return;
    }
    activeMatchId = m.id;
    navigate(m.teams.length ? "sorteio" : "presenca");
  },
  confirm: (id) => {
    const m = match();
    if (m.status === "closed") return;
    const p = state.players.find((p) => p.id === Number(id));
    m.attendance[id] = confirmed(m).length < m.capacity ? "confirmed" : "queue";
    if (m.attendance[id] === "queue") (m.queue ||= []).push(Number(id));
    log(
      `${p.name} ${m.attendance[id] === "queue" ? "entrou na fila." : "confirmou presença. Bora jogar!"}`,
    );
    page();
    toast(
      m.attendance[id] === "queue"
        ? "Lista cheia. Jogador adicionado à fila."
        : "Presença confirmada!",
    );
  },
  unconfirm: (id) => {
    const m = match();
    if (m.status === "closed") return;
    const wasConfirmed = m.attendance[id] === "confirmed";
    m.attendance[id] = "pending";
    m.queue = (m.queue || []).filter((k) => k !== Number(id));
    if (wasConfirmed) {
      const next =
        m.queue.shift() ??
        Object.keys(m.attendance).find((k) => m.attendance[k] === "queue");
      if (next) m.attendance[next] = "confirmed";
    }
    save();
    page();
    toast("Lista atualizada.");
  },
  "close-draw": closeDraw,
  reopen: () =>
    modal(
      "Reabrir a lista?",
      `<p class="subtitle">Os times e o placar desta partida serão apagados para permitir uma nova formação.</p><div class="modal-actions">${btn("Voltar", "close-modal", "secondary")}${btn("Reabrir lista", "confirm-reopen")}</div>`,
    ),
  "confirm-reopen": () => {
    const m = match();
    m.status = "open";
    m.teams = [];
    m.score = [0, 0];
    m.elapsed = 0;
    m.runningSince = null;
    m.finished = false;
    save();
    closeModal();
    navigate("presenca");
  },
  redraw: () => {
    const m = match();
    if (m.runningSince || m.elapsed > 0 || m.score.some(Boolean) || m.finished)
      return;
    draw(m);
    page();
    toast("Novos times, a mesma resenha!");
  },
  swap: (id) => {
    const m = match();
    if (m.runningSince || m.elapsed > 0 || m.score.some(Boolean) || m.finished)
      return;
    const team = m.teams.findIndex((t) => t.includes(Number(id)));
    const p = state.players.find((p) => p.id === Number(id));
    modal(
      `Trocar ${esc(p.name.split(" ")[0])}`,
      `<p class="subtitle">Escolha um jogador de outro time. Os dois trocam de lugar, mantendo o tamanho e os goleiros de cada equipe.</p>${m.teams
        .flatMap((ids, i) =>
          i === team
            ? []
            : ids.map((other) => {
                const q = state.players.find((p) => p.id === other);
                if ((p.position === "Goleiro") !== (q.position === "Goleiro"))
                  return "";
                return `<div class="player-row">${avatar(q)}<div class="player-detail"><strong>${esc(q.name)}</strong><small>Time ${String.fromCharCode(65 + i)} · ${q.rating.toFixed(1)}</small></div>${btn("Trocar", "do-swap", "secondary", `${id}:${other}`)}</div>`;
              }),
        )
        .join("")}`,
    );
  },
  "do-swap": (ids) => {
    const [a, b] = ids.split(":").map(Number),
      m = match();
    const ta = m.teams.find((t) => t.includes(a)),
      tb = m.teams.find((t) => t.includes(b));
    ta[ta.indexOf(a)] = b;
    tb[tb.indexOf(b)] = a;
    save();
    closeModal();
    page();
    toast("Troca feita. Equilíbrio atualizado.");
  },
  "share-teams": () => {
    const m = match();
    copyText(
      `⚽ ${state.group}\n${dateLabel(m)} · ${m.time}\n📍 ${m.venue}\n\n${m.teams.map((ids, i) => `TIME ${String.fromCharCode(65 + i)}\n${ids.map((id) => state.players.find((p) => p.id === id).name).join("\n")}`).join("\n\n")}\n\nBora pra resenha!`,
    );
  },
  timer: () => {
    const m = match();
    if (m.finished) return;
    if (m.runningSince) {
      m.elapsed = elapsed(m);
      m.runningSince = null;
    } else m.runningSince = Date.now();
    save();
    page();
  },
  goal: (side) => {
    const m = match();
    if (m.finished) return;
    m.score[Number(side)]++;
    (m.goalHistory ||= []).push(Number(side));
    save();
    page();
  },
  "undo-goal": () => {
    const m = match();
    if (m.finished || !m.goalHistory?.length) return;
    m.score[m.goalHistory.pop()]--;
    save();
    page();
  },
  "next-round": () => {
    const m = match();
    if (m.finished) return;
    const sides = m.sides || [0, 1],
      winner = m.score[0] > m.score[1] ? sides[0] : sides[1];
    const waiting = m.teams.map((_, i) => i).filter((i) => !sides.includes(i));
    const entry = waiting[(m.round - 1) % waiting.length];
    m.sides = [winner, entry];
    m.score = [0, 0];
    m.elapsed = 0;
    m.runningSince = null;
    m.goalHistory = [];
    m.round++;
    save();
    page();
    toast("Nova rodada. O vencedor fica!");
  },
  finish: () =>
    modal(
      "Apita o fim?",
      `<p class="subtitle">O placar será salvo e o cronômetro encerrado. Hora de fechar o caixa e combinar a próxima!</p><div class="modal-actions">${btn("Continuar jogando", "close-modal", "secondary")}${btn("Encerrar partida", "confirm-finish")}</div>`,
    ),
  "confirm-finish": () => {
    const m = match();
    m.elapsed = elapsed(m);
    m.runningSince = null;
    m.finished = true;
    log(`Partida encerrada! Placar final: ${m.score[0]} × ${m.score[1]}.`);
    closeModal();
    page();
  },
  profile: (id) => {
    const p = state.players.find((p) => p.id === Number(id));
    modal(
      "O craque da resenha",
      `<div class="profile-hero">${avatar(p)}<h3>${esc(p.name)}</h3><p class="subtitle">${esc(p.position)} · Nota geral ${p.rating.toFixed(1)}</p></div><div class="notice">A nota geral é usada para equilibrar o sorteio. Avalie com a galera e ajuste quando quiser.</div><div class="player-row"><span class="player-detail">Contribuição da pelada</span><span class="chip ${p.paid ? "green" : "orange"}">${p.paid ? "Em dia" : "Pendente"}</span></div><div class="modal-actions">${btn("Fechar", "close-modal", "secondary")}${btn("Editar perfil", "edit-player", "", p.id)}</div>`,
    );
  },
  "edit-player": (id) => {
    closeModal();
    playerForm(id);
  },
  "toggle-payment": (id) => {
    const p = state.players.find((p) => p.id === Number(id));
    p.paid = !p.paid;
    log(
      `${p.name}: contribuição ${p.paid ? "marcada como paga." : "marcada como pendente."}`,
    );
    page();
    toast(p.paid ? "Pagamento registrado!" : "Pagamento voltou para pendente.");
  },
  "payment-reminder": () => {
    const pending = state.players.filter((p) => !p.paid);
    copyText(
      `⚽ ${state.group}\nBora deixar a pelada em dia?\nContribuição: ${money(state.fee)} por jogador.\n\n${pending.length ? `Falta confirmar o pagamento de:\n${pending.map((p) => p.name).join("\n")}` : "Todo mundo em dia! Valeu, galera."}\n\nJá pagou? Avisa o organizador. Valeu!`,
    );
  },
  invite: () => {
    modal(
      "Chama a galera!",
      `<p class="subtitle">Copie um convite para mandar no grupo. Nesta versão, as presenças são registradas pelo organizador neste navegador.</p><div class="notice">O convite é um texto com data e local. Não cria um link público nem sincroniza dados entre celulares.</div>${btn(`${icon("share")} Copiar convite`, "copy-invite", "full")}`,
    );
  },
  "copy-invite": () => {
    const m = nextMatch();
    copyText(
      `⚽ Bora jogar na ${state.group}?\n${m ? `${dateLabel(m)} às ${m.time}\n📍 ${m.venue}\n${Math.max(0, m.capacity - confirmed(m).length)} vagas disponíveis.\n` : ""}Confirma com o organizador e vem pra resenha!`,
    );
  },
  "match-details": () => {
    const m = match();
    modal(
      "O compromisso da galera",
      `<p class="subtitle">${esc(dateLabel(m))} às ${esc(m.time)}<br>${esc(m.venue)}</p><div class="notice">${esc(m.notes || "Leve sua chuteira e a boa resenha.")}</div><p class="subtitle">${m.capacity} vagas · ${m.teamCount} times · contribuição prevista ${money(m.fee)} por jogador.</p><div class="modal-actions">${btn("Fechar", "close-modal", "secondary")}${btn("Copiar convite", "copy-match-invite")}</div>`,
    );
  },
  "copy-match-invite": () => {
    const m = match();
    copyText(
      `⚽ ${state.group}\n${dateLabel(m)} às ${m.time}\n📍 ${m.venue}\n${m.notes}\nConfirme com o organizador!`,
    );
  },
  help: () =>
    modal(
      "A resenha começa aqui.",
      `<p class="subtitle">Esta é uma versão interativa com dados de exemplo. Você é o organizador: crie partidas, confirme presenças, sorteie times e acompanhe o placar e o caixa.</p><div class="notice">Os dados ficam neste navegador. Ainda não há contas, backend, sincronização entre pessoas ou pagamentos online. O cronômetro usa o horário real e continua correto ao trocar de tela.</div><p class="subtitle">${storageWorks ? "Salvamento local disponível." : "Salvamento local indisponível; os dados duram apenas nesta sessão."} Exporte uma cópia em Configurações.</p>${btn("Bora jogar", "close-modal", "full")}`,
    ),
  export: () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resenha-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Backup exportado. Guarde com você.");
  },
};
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (b && !b.disabled) {
    actions[b.dataset.action]?.(b.dataset.id);
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "player-search") {
    query = e.target.value;
    $("#player-list").innerHTML = playerRows();
  }
});
document.addEventListener("submit", (e) => {
  if (!["match-form", "player-form", "settings-form"].includes(e.target.id))
    return;
  e.preventDefault();
  const form = e.target;
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  if (form.id === "match-form") {
    if (!data.venue.trim()) {
      toast("Informe um local para a partida.");
      return;
    }
    const id = Date.now();
    state.matches.unshift({
      id,
      date: data.date,
      time: data.time,
      venue: data.venue.trim(),
      notes: data.notes.trim(),
      capacity: state.teamCount * state.lineup,
      teamCount: state.teamCount,
      fee: state.fee,
      status: "open",
      attendance: Object.fromEntries(
        state.players.map((p) => [p.id, "pending"]),
      ),
      teams: [],
      score: [0, 0],
      elapsed: 0,
      runningSince: null,
      round: 1,
      finished: false,
    });
    activeMatchId = id;
    state.activeMatchId = id;
    log("Nova partida marcada. Chama a galera!");
    closeModal();
    tab = "pending";
    navigate("presenca");
    toast("Partida criada. Bora confirmar a galera!");
  } else if (form.id === "player-form") {
    if (!data.name.trim()) {
      toast("Informe o nome do jogador.");
      return;
    }
    const id = Number(form.dataset.id);
    const p = state.players.find((p) => p.id === id);
    const values = {
      name: data.name.trim(),
      position: data.position,
      rating: Number(data.rating),
    };
    if (p) Object.assign(p, values);
    else {
      const newId = Date.now();
      state.players.push({ id: newId, ...values, paid: false });
      for (const m of state.matches) m.attendance[newId] = "pending";
    }
    save();
    closeModal();
    page();
    toast(
      p
        ? "Perfil atualizado. Próximos sorteios usarão a nova nota."
        : "Mais um craque no elenco!",
    );
  } else {
    if (!data.group.trim() || !data.venue.trim()) {
      toast("Preencha o nome e o local da pelada.");
      return;
    }
    Object.assign(state, {
      group: data.group.trim(),
      venue: data.venue.trim(),
      fee: Number(data.fee),
      teamCount: Number(data.teamCount),
      lineup: Number(data.lineup),
      capacity: Number(data.teamCount) * Number(data.lineup),
    });
    save();
    page();
    toast("Padrões salvos para as próximas partidas.");
  }
});
document.addEventListener("keydown", (e) => {
  const modalEl = $(".modal");
  if (!modalEl) return;
  if (e.key === "Escape") {
    closeModal();
    return;
  }
  if (e.key === "Tab") {
    const focusable = [
      ...modalEl.querySelectorAll(
        "button:not(:disabled),input,select,textarea,a[href]",
      ),
    ];
    const first = focusable[0],
      last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
function route() {
  const allowed = [
    "inicio",
    "partida",
    "presenca",
    "sorteio",
    "campo",
    "jogadores",
    "caixa",
    "regras",
  ];
  const hash = location.hash.slice(1);
  view = allowed.includes(hash) ? hash : "inicio";
  page();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
setInterval(updateTimer, 500);
route();
