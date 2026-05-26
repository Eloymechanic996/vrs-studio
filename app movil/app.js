const TRACK_STATES = [
  "Green Flag",
  "Yellow Flag",
  "Red Flag",
  "Safety Car",
  "Virtual Safety Car",
  "Pit Lane",
];

const EVENT_TYPES = [
  "Incidencia",
  "Pit In",
  "Pit Out",
  "Safety Car Sale",
  "Safety Car Entra",
  "Bandera",
  "Cambio de clima",
];

const SESSION_TYPES = ["Race", "Test", "Free Practice", "Qualifying"];
const MODALITIES = ["Karting", "Monoplazas", "Rally", "Turismos", "Endurance", "Off-Road"];
const WEATHER_CONDITIONS = ["Dry", "Cloudy", "Light Rain", "Rain", "Heavy Rain", "Windy", "Cold", "Hot"];
const STORAGE_KEY = "vrs-studio-mobile-session";

const state = {
  timerRunning: false,
  startTime: null,
  elapsedBeforeStart: 0,
  lastLapElapsed: 0,
  lapNumber: 1,
  pendingLapStatus: null,
  rows: [],
};

const form = {
  modalidad: document.getElementById("modalidad"),
  categoria: document.getElementById("categoria"),
  tipoSesion: document.getElementById("tipoSesion"),
  campeonato: document.getElementById("campeonato"),
  equipo: document.getElementById("equipo"),
  evento: document.getElementById("evento"),
  circuito: document.getElementById("circuito"),
  fecha: document.getElementById("fecha"),
  piloto: document.getElementById("piloto"),
  dorsal: document.getElementById("dorsal"),
  mecanico: document.getElementById("mecanico"),
  chasis: document.getElementById("chasis"),
  motorNombre: document.getElementById("motorNombre"),
  clima: document.getElementById("clima"),
  estadoPista: document.getElementById("estadoPista"),
  tipoEvento: document.getElementById("tipoEvento"),
  climaPista: document.getElementById("climaPista"),
  sessionNotes: document.getElementById("sessionNotes"),
  timingNotes: document.getElementById("timingNotes"),
  distanciaDelante: document.getElementById("distanciaDelante"),
  distanciaDetras: document.getElementById("distanciaDetras"),
  caidaIzq: document.getElementById("caidaIzq"),
  caidaDer: document.getElementById("caidaDer"),
  casterIzq: document.getElementById("casterIzq"),
  casterDer: document.getElementById("casterDer"),
  reactividad: document.getElementById("reactividad"),
  avance: document.getElementById("avance"),
  neumatico: document.getElementById("neumatico"),
  llanta: document.getElementById("llanta"),
  buje: document.getElementById("buje"),
  anchoTrasero: document.getElementById("anchoTrasero"),
  alturaEje: document.getElementById("alturaEje"),
  pinon: document.getElementById("pinon"),
  corona: document.getElementById("corona"),
  relacion: document.getElementById("relacion"),
  tipoEje: document.getElementById("tipoEje"),
  presionDelIzq: document.getElementById("presionDelIzq"),
  presionDelDer: document.getElementById("presionDelDer"),
  presionTrasIzq: document.getElementById("presionTrasIzq"),
  presionTrasDer: document.getElementById("presionTrasDer"),
  bujia: document.getElementById("bujia"),
  carburacion: document.getElementById("carburacion"),
  desarrollo: document.getElementById("desarrollo"),
  temperaturaMotor: document.getElementById("temperaturaMotor"),
  agujaAltas: document.getElementById("agujaAltas"),
  agujaBajas: document.getElementById("agujaBajas"),
};

const timerDisplay = document.getElementById("timerDisplay");
const timingList = document.getElementById("timingList");

function fillSelect(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function initSelects() {
  fillSelect(form.modalidad, MODALITIES);
  fillSelect(form.tipoSesion, SESSION_TYPES);
  fillSelect(form.clima, WEATHER_CONDITIONS);
  fillSelect(form.estadoPista, TRACK_STATES);
  fillSelect(form.tipoEvento, EVENT_TYPES);
  fillSelect(form.climaPista, WEATHER_CONDITIONS);
}

function defaultFormValues() {
  const today = new Date().toISOString().slice(0, 10);
  form.modalidad.value = "Karting";
  form.tipoSesion.value = "Test";
  form.fecha.value = today;
  form.mecanico.value = "Jose";
  form.clima.value = "Dry";
  form.climaPista.value = "Dry";
  form.estadoPista.value = "Green Flag";
  form.tipoEvento.value = "Incidencia";
}

function elapsedSeconds() {
  if (!state.timerRunning || state.startTime === null) {
    return state.elapsedBeforeStart;
  }
  return state.elapsedBeforeStart + (Date.now() - state.startTime) / 1000;
}

function formatDuration(seconds) {
  const safe = Math.max(seconds, 0);
  const minutes = Math.floor(safe / 60);
  const sec = Math.floor(safe % 60);
  const ms = Math.floor((safe - Math.floor(safe)) * 1000);
  return `${String(minutes).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatDuration(elapsedSeconds());
  window.requestAnimationFrame(updateTimerDisplay);
}

function startTimer() {
  if (state.timerRunning) return;
  state.startTime = Date.now();
  state.timerRunning = true;
  saveLocal();
}

function stopTimer() {
  if (!state.timerRunning) return;
  state.elapsedBeforeStart = elapsedSeconds();
  state.timerRunning = false;
  state.startTime = null;
  saveLocal();
}

function resetTimer() {
  state.timerRunning = false;
  state.startTime = null;
  state.elapsedBeforeStart = 0;
  state.lastLapElapsed = 0;
  state.lapNumber = 1;
  state.pendingLapStatus = null;
  saveLocal();
}

function currentTimingNotes() {
  return form.timingNotes.value.trim();
}

function clearTimingNotes() {
  form.timingNotes.value = "";
}

function insertTimingRow(row) {
  state.rows.push(row);
  renderTimingRows();
  saveLocal();
}

function registerLap() {
  if (state.pendingLapStatus === "Pit In") {
    stopTimer();
  }
  const totalElapsed = elapsedSeconds();
  const lapElapsed = totalElapsed - state.lastLapElapsed;
  const lapStatus = state.pendingLapStatus || form.estadoPista.value;
  const lapEvent = state.pendingLapStatus || "Vuelta";

  insertTimingRow({
    lap: state.lapNumber,
    hora: new Date().toLocaleTimeString("es-ES", { hour12: false }),
    acumulado: formatDuration(totalElapsed),
    vuelta: formatDuration(lapElapsed),
    estado: lapStatus,
    clima: form.climaPista.value,
    evento: lapEvent,
    notas: currentTimingNotes(),
  });

  state.lastLapElapsed = totalElapsed;
  state.lapNumber += 1;
  state.pendingLapStatus = null;
  clearTimingNotes();
}

function addManualEvent() {
  insertTimingRow({
    lap: "-",
    hora: new Date().toLocaleTimeString("es-ES", { hour12: false }),
    acumulado: formatDuration(elapsedSeconds()),
    vuelta: "-",
    estado: form.estadoPista.value,
    clima: form.climaPista.value,
    evento: form.tipoEvento.value,
    notas: currentTimingNotes(),
  });
  clearTimingNotes();
}

function addWeatherChange() {
  const note = currentTimingNotes();
  insertTimingRow({
    lap: "-",
    hora: new Date().toLocaleTimeString("es-ES", { hour12: false }),
    acumulado: formatDuration(elapsedSeconds()),
    vuelta: "-",
    estado: form.estadoPista.value,
    clima: form.climaPista.value,
    evento: "Cambio de clima",
    notas: note ? `Nuevo clima: ${form.climaPista.value} | ${note}` : `Nuevo clima: ${form.climaPista.value}`,
  });
  form.clima.value = form.climaPista.value;
  clearTimingNotes();
}

function quickEvent(eventType, trackState) {
  form.tipoEvento.value = eventType;
  form.estadoPista.value = trackState;
  addManualEvent();
}

function markPitOut() {
  form.tipoEvento.value = "Pit Out";
  form.estadoPista.value = "Green Flag";
  state.pendingLapStatus = "Pit Out";
  startTimer();
  saveLocal();
}

function markPitIn() {
  form.tipoEvento.value = "Pit In";
  form.estadoPista.value = "Pit Lane";
  state.pendingLapStatus = "Pit In";
  saveLocal();
}

function updateRatio() {
  const pinon = parseFloat(String(form.pinon.value).replace(",", "."));
  const corona = parseFloat(String(form.corona.value).replace(",", "."));
  if (!Number.isFinite(pinon) || !Number.isFinite(corona) || pinon === 0) {
    form.relacion.value = "-";
    return;
  }
  form.relacion.value = (corona / pinon).toFixed(3);
}

function renderTimingRows() {
  timingList.innerHTML = "";
  if (!state.rows.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Todavia no hay vueltas ni eventos registrados.";
    timingList.append(empty);
    return;
  }

  state.rows.forEach((row) => {
    const item = document.createElement("article");
    item.className = "timing-item";
    item.innerHTML = `
      <strong>${row.evento} · ${row.lap === "-" ? "Evento" : `Vuelta ${row.lap}`}</strong>
      <div class="timing-meta">
        <span>Hora: ${row.hora}</span>
        <span>Total: ${row.acumulado}</span>
        <span>Vuelta: ${row.vuelta}</span>
        <span>Estado: ${row.estado}</span>
        <span>Clima: ${row.clima}</span>
        <span>Notas: ${row.notas || "-"}</span>
      </div>
    `;
    timingList.prepend(item);
  });
}

function collectData() {
  return {
    session: {
      modalidad: form.modalidad.value,
      categoria: form.categoria.value,
      tipoSesion: form.tipoSesion.value,
      campeonato: form.campeonato.value,
      equipo: form.equipo.value,
      evento: form.evento.value,
      circuito: form.circuito.value,
      fecha: form.fecha.value,
      piloto: form.piloto.value,
      dorsal: form.dorsal.value,
      mecanico: form.mecanico.value,
      chasis: form.chasis.value,
      motorNombre: form.motorNombre.value,
      clima: form.clima.value,
      observaciones: form.sessionNotes.value,
    },
    timing: {
      estadoPista: form.estadoPista.value,
      tipoEvento: form.tipoEvento.value,
      climaPista: form.climaPista.value,
      rows: state.rows,
      timerRunning: state.timerRunning,
      elapsedBeforeStart: state.elapsedBeforeStart,
      lastLapElapsed: state.lastLapElapsed,
      lapNumber: state.lapNumber,
      pendingLapStatus: state.pendingLapStatus,
    },
    setup: {
      direccion: {
        distanciaDelante: form.distanciaDelante.value,
        distanciaDetras: form.distanciaDetras.value,
        caidaIzq: form.caidaIzq.value,
        caidaDer: form.caidaDer.value,
        casterIzq: form.casterIzq.value,
        casterDer: form.casterDer.value,
        reactividad: form.reactividad.value,
        avance: form.avance.value,
      },
      ejeTrasero: {
        neumatico: form.neumatico.value,
        llanta: form.llanta.value,
        buje: form.buje.value,
        anchoTrasero: form.anchoTrasero.value,
        alturaEje: form.alturaEje.value,
        pinon: form.pinon.value,
        corona: form.corona.value,
        relacion: form.relacion.value,
        tipoEje: form.tipoEje.value,
        presionDelIzq: form.presionDelIzq.value,
        presionDelDer: form.presionDelDer.value,
        presionTrasIzq: form.presionTrasIzq.value,
        presionTrasDer: form.presionTrasDer.value,
      },
      motor: {
        bujia: form.bujia.value,
        carburacion: form.carburacion.value,
        desarrollo: form.desarrollo.value,
        temperaturaMotor: form.temperaturaMotor.value,
        agujaAltas: form.agujaAltas.value,
        agujaBajas: form.agujaBajas.value,
      },
    },
  };
}

function applyData(data) {
  if (!data) return;
  const session = data.session || {};
  const timing = data.timing || {};
  const setup = data.setup || {};
  const direccion = setup.direccion || {};
  const eje = setup.ejeTrasero || {};
  const motor = setup.motor || {};

  Object.entries({
    modalidad: session.modalidad,
    categoria: session.categoria,
    tipoSesion: session.tipoSesion,
    campeonato: session.campeonato,
    equipo: session.equipo,
    evento: session.evento,
    circuito: session.circuito,
    fecha: session.fecha,
    piloto: session.piloto,
    dorsal: session.dorsal,
    mecanico: session.mecanico,
    chasis: session.chasis,
    motorNombre: session.motorNombre,
    clima: session.clima,
    sessionNotes: session.observaciones,
    estadoPista: timing.estadoPista,
    tipoEvento: timing.tipoEvento,
    climaPista: timing.climaPista,
    distanciaDelante: direccion.distanciaDelante,
    distanciaDetras: direccion.distanciaDetras,
    caidaIzq: direccion.caidaIzq,
    caidaDer: direccion.caidaDer,
    casterIzq: direccion.casterIzq,
    casterDer: direccion.casterDer,
    reactividad: direccion.reactividad,
    avance: direccion.avance,
    neumatico: eje.neumatico,
    llanta: eje.llanta,
    buje: eje.buje,
    anchoTrasero: eje.anchoTrasero,
    alturaEje: eje.alturaEje,
    pinon: eje.pinon,
    corona: eje.corona,
    relacion: eje.relacion,
    tipoEje: eje.tipoEje,
    presionDelIzq: eje.presionDelIzq,
    presionDelDer: eje.presionDelDer,
    presionTrasIzq: eje.presionTrasIzq,
    presionTrasDer: eje.presionTrasDer,
    bujia: motor.bujia,
    carburacion: motor.carburacion,
    desarrollo: motor.desarrollo,
    temperaturaMotor: motor.temperaturaMotor,
    agujaAltas: motor.agujaAltas,
    agujaBajas: motor.agujaBajas,
  }).forEach(([key, value]) => {
    if (form[key] && value !== undefined) {
      form[key].value = value;
    }
  });

  state.rows = Array.isArray(timing.rows) ? timing.rows : [];
  state.timerRunning = Boolean(timing.timerRunning);
  state.elapsedBeforeStart = Number(timing.elapsedBeforeStart || 0);
  state.lastLapElapsed = Number(timing.lastLapElapsed || 0);
  state.lapNumber = Number(timing.lapNumber || 1);
  state.pendingLapStatus = timing.pendingLapStatus || null;
  state.startTime = state.timerRunning ? Date.now() : null;

  updateRatio();
  renderTimingRows();
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    applyData(JSON.parse(raw));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function exportSession() {
  const blob = new Blob([JSON.stringify(collectData(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const category = form.categoria.value.trim().toLowerCase() || "sesion";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = url;
  link.download = `vrs_mobile_${category}_${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`panel-${button.dataset.tab}`).classList.add("active");
    });
  });
}

function bindEvents() {
  document.getElementById("startBtn").addEventListener("click", startTimer);
  document.getElementById("stopBtn").addEventListener("click", stopTimer);
  document.getElementById("resetBtn").addEventListener("click", resetTimer);
  document.getElementById("registerLapBtn").addEventListener("click", registerLap);
  document.getElementById("addEventBtn").addEventListener("click", addManualEvent);
  document.getElementById("pitOutBtn").addEventListener("click", markPitOut);
  document.getElementById("pitInBtn").addEventListener("click", markPitIn);
  document.getElementById("scOutBtn").addEventListener("click", () => quickEvent("Safety Car Sale", "Safety Car"));
  document.getElementById("scInBtn").addEventListener("click", () => quickEvent("Safety Car Entra", "Green Flag"));
  document.getElementById("weatherBtn").addEventListener("click", addWeatherChange);
  document.getElementById("exportBtn").addEventListener("click", exportSession);
  document.getElementById("saveLocalBtn").addEventListener("click", saveLocal);
  document.getElementById("clearBtn").addEventListener("click", clearAllData);
  document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click());
  document.getElementById("importFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    applyData(JSON.parse(text));
    saveLocal();
    event.target.value = "";
  });

  Object.values(form).forEach((field) => {
    if (!field) return;
    field.addEventListener("input", () => {
      updateRatio();
      saveLocal();
    });
    field.addEventListener("change", () => {
      updateRatio();
      saveLocal();
    });
  });
}

initSelects();
defaultFormValues();
loadLocal();
setupTabs();
bindEvents();
renderTimingRows();
updateRatio();
updateTimerDisplay();
