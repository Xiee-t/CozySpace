"use strict";

const cozy = {
  relationshipStart: new Date(`${window.CozySpace.relationshipStart}T12:00:00`),
  editingNoteId: null,
  latestPhotoId: document.querySelector("#photoPanel")?.dataset.photoId || "",
};

const els = {
  heroCard: document.querySelector("#heroCard"),
  hugButton: document.querySelector("#hugButton"),
  hugCount: document.querySelector("#hugCount"),
  lastAction: document.querySelector("#lastAction"),
  activityList: document.querySelector("#activityList"),
  calendarGrid: document.querySelector("#calendarGrid"),
  tabButtons: document.querySelectorAll(".tab-button"),
  views: document.querySelectorAll(".view"),
  anniversaryDays: document.querySelector("#anniversaryDays"),
  anniversaryHours: document.querySelector("#anniversaryHours"),
  anniversaryDate: document.querySelector("#anniversaryDate"),
  photoPanel: document.querySelector("#photoPanel"),
  photoForm: document.querySelector("#photoForm"),
  photoInput: document.querySelector("#photoInput"),
  photoPreview: document.querySelector("#photoPreview"),
  photoEmpty: document.querySelector("#photoEmpty"),
  photoChooseButton: document.querySelector("#photoChooseButton"),
  photoDeleteButton: document.querySelector("#photoDeleteButton"),
  photoStatus: document.querySelector("#photoStatus"),
  newNoteButton: document.querySelector("#newNoteButton"),
  notesList: document.querySelector("#notesList"),
  noteModal: document.querySelector("#noteModal"),
  noteModalTitle: document.querySelector("#noteModalTitle"),
  noteForm: document.querySelector("#noteForm"),
  noteTitleInput: document.querySelector("#noteTitleInput"),
  noteBodyInput: document.querySelector("#noteBodyInput"),
  deleteNoteButton: document.querySelector("#deleteNoteButton"),
  closeModalButtons: document.querySelectorAll("[data-close-modal]"),
};

init();

function init() {
  renderCalendar();
  renderCountdowns();
  window.setInterval(renderCountdowns, 60 * 1000);
  wireTabs();
  wireHugs();
  wirePhotos();
  wireNotes();
  wireRealtime();
}

function wireTabs() {
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      els.views.forEach((view) => view.classList.toggle("is-active", view.id === button.dataset.targetView));
      els.tabButtons.forEach((tab) => tab.classList.toggle("is-active", tab === button));
    });
  });
}

function wireHugs() {
  els.hugButton?.addEventListener("click", async () => {
    await triggerHapticFeedback();

    const response = await fetchJson(window.CozySpace.routes.hugs, {
      method: "POST",
      body: JSON.stringify({}),
    });

    if (!response) {
      return;
    }

    applyStats(response.stats);
    prependActivity(response.activity.message);
  });
}

function wirePhotos() {
  els.photoChooseButton?.addEventListener("click", () => els.photoInput.click());
  els.photoInput?.addEventListener("change", uploadPhoto);
  els.photoDeleteButton?.addEventListener("click", deletePhoto);
}

function wireNotes() {
  els.newNoteButton?.addEventListener("click", startNewNote);
  els.noteForm?.addEventListener("submit", saveNote);
  els.deleteNoteButton?.addEventListener("click", deleteNote);
  els.closeModalButtons.forEach((button) => button.addEventListener("click", closeNoteModal));
  els.notesList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-note]");

    if (!button) {
      return;
    }

    editNote(JSON.parse(button.dataset.note));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.noteModal?.classList.contains("is-open")) {
      closeNoteModal();
    }
  });
}

function wireRealtime() {
  if (!window.Echo) {
    return;
  }

  window.Echo.private("cozy-space")
    .listen(".relationship.stats.updated", async (event) => {
      applyStats(event.stats);
      await triggerHapticFeedback();
    })
    .listen(".relationship.activity.created", (event) => {
      prependActivity(event.activity.message);
    })
    .listen(".love-note.saved", (event) => {
      upsertNote(event.note);
    })
    .listen(".love-note.deleted", (event) => {
      removeNoteFromList(event.note_id);
    })
    .listen(".photo.uploaded", (event) => {
      renderPhoto(event.photo);
    })
    .listen(".photo.deleted", () => {
      clearPhotoUi();
    });
}

async function uploadPhoto() {
  const [file] = els.photoInput.files;

  if (!file) {
    return;
  }

  previewLocalPhoto(file);

  const formData = new FormData();
  formData.append("photo", file);

  const response = await fetch(window.CozySpace.routes.photos, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "X-CSRF-TOKEN": csrfToken(),
    },
    body: formData,
  });

  if (!response.ok) {
    els.photoStatus.textContent = "Upload failed. Try another image.";
    return;
  }

  const payload = await response.json();
  renderPhoto(payload.photo);
  prependActivity(payload.activity.message);
}

function previewLocalPhoto(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    els.photoPreview.src = String(reader.result);
    els.photoPreview.hidden = false;
    els.photoEmpty.hidden = true;
    els.photoDeleteButton.hidden = false;
    els.photoStatus.textContent = "Previewing photo while Laravel stores it.";
  });
  reader.readAsDataURL(file);
}

async function deletePhoto() {
  if (!cozy.latestPhotoId) {
    clearPhotoUi();
    return;
  }

  const response = await fetch(`${window.CozySpace.routes.photos}/${cozy.latestPhotoId}`, {
    method: "DELETE",
    headers: {
      "Accept": "application/json",
      "X-CSRF-TOKEN": csrfToken(),
    },
  });

  if (!response.ok && response.status !== 204) {
    els.photoStatus.textContent = "Could not delete the photo yet.";
    return;
  }

  clearPhotoUi();
  prependActivity("Daily gift photo deleted.");
}

function renderPhoto(photo) {
  cozy.latestPhotoId = String(photo.id);
  els.photoPanel.dataset.photoId = cozy.latestPhotoId;
  els.photoPreview.src = photo.url;
  els.photoPreview.hidden = false;
  els.photoEmpty.hidden = true;
  els.photoDeleteButton.hidden = false;
  els.photoStatus.textContent = "Daily gift photo is saved.";
}

function clearPhotoUi() {
  cozy.latestPhotoId = "";
  els.photoPanel.dataset.photoId = "";
  els.photoInput.value = "";
  els.photoPreview.removeAttribute("src");
  els.photoPreview.hidden = true;
  els.photoEmpty.hidden = false;
  els.photoDeleteButton.hidden = true;
  els.photoStatus.textContent = "Upload a photo to Laravel Storage.";
}

function startNewNote() {
  cozy.editingNoteId = null;
  els.noteModalTitle.textContent = "New Note";
  els.noteTitleInput.value = "";
  els.noteBodyInput.value = "";
  els.deleteNoteButton.disabled = true;
  openNoteModal();
}

function editNote(note) {
  cozy.editingNoteId = note.id;
  els.noteModalTitle.textContent = "Edit Note";
  els.noteTitleInput.value = note.title;
  els.noteBodyInput.value = note.body;
  els.deleteNoteButton.disabled = false;
  openNoteModal();
}

async function saveNote(event) {
  event.preventDefault();

  const payload = {
    title: els.noteTitleInput.value.trim() || "Untitled note",
    body: els.noteBodyInput.value.trim(),
  };

  if (!payload.body) {
    els.noteBodyInput.focus();
    return;
  }

  const url = cozy.editingNoteId
    ? `${window.CozySpace.routes.notes}/${cozy.editingNoteId}`
    : window.CozySpace.routes.notes;
  const method = cozy.editingNoteId ? "PUT" : "POST";
  const response = await fetchJson(url, {
    method,
    body: JSON.stringify(payload),
  });

  if (!response) {
    return;
  }

  upsertNote(response.note);
  prependActivity(response.activity.message);
  closeNoteModal();
}

async function deleteNote() {
  if (!cozy.editingNoteId) {
    return;
  }

  const response = await fetch(`${window.CozySpace.routes.notes}/${cozy.editingNoteId}`, {
    method: "DELETE",
    headers: {
      "Accept": "application/json",
      "X-CSRF-TOKEN": csrfToken(),
    },
  });

  if (!response.ok && response.status !== 204) {
    return;
  }

  removeNoteFromList(cozy.editingNoteId);
  prependActivity("Love note deleted.");
  closeNoteModal();
}

function upsertNote(note) {
  removeNoteFromList(note.id);
  els.notesList.querySelector("[data-empty-notes]")?.remove();

  const item = document.createElement("li");
  item.className = "note-history-item";
  item.innerHTML = `
    <button class="note-history-button" type="button"></button>
  `;

  const button = item.querySelector("button");
  button.dataset.note = JSON.stringify(note);
  button.append(
    createSpan("note-history-title", note.title),
    createSpan("note-history-preview", note.body),
    createSpan("note-history-time", `Saved ${formatPreciseDateTime(new Date(note.updated_at))}`),
  );

  els.notesList.prepend(item);
}

function removeNoteFromList(noteId) {
  els.notesList.querySelectorAll("[data-note]").forEach((button) => {
    const note = JSON.parse(button.dataset.note);

    if (String(note.id) === String(noteId)) {
      button.closest("li").remove();
    }
  });

  if (els.notesList.children.length === 0) {
    const empty = document.createElement("li");
    empty.className = "note-history-item";
    empty.dataset.emptyNotes = "";
    empty.textContent = "No notes yet. Start with one tiny sentence.";
    els.notesList.appendChild(empty);
  }
}

function openNoteModal() {
  els.noteModal.classList.add("is-open");
  els.noteModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => els.noteTitleInput.focus(), 120);
}

function closeNoteModal() {
  els.noteModal.classList.remove("is-open");
  els.noteModal.setAttribute("aria-hidden", "true");
}

async function triggerHapticFeedback() {
  if (window.Capacitor?.isNativePlatform?.()) {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Medium });
    return;
  }

  console.log("\uD83D\uDCF3 [Haptic Emulation]: Phone would vibrate now!");
  els.heroCard.classList.remove("visual-shake");
  requestAnimationFrame(() => {
    els.heroCard.classList.add("visual-shake");
    window.setTimeout(() => els.heroCard.classList.remove("visual-shake"), 430);
  });
}

function applyStats(stats) {
  els.hugCount.textContent = Number(stats.total_hugs).toLocaleString();
  els.lastAction.textContent = `Last action by ${stats.last_action_by}.`;
}

function prependActivity(message) {
  const item = document.createElement("li");
  item.textContent = message;
  els.activityList.prepend(item);
}

function renderCalendar() {
  if (!els.calendarGrid) {
    return;
  }

  const today = new Date();
  const events = JSON.parse(els.calendarGrid.dataset.events || "[]");
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();

  els.calendarGrid.innerHTML = "";

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    const empty = document.createElement("span");
    empty.className = "calendar-day is-empty";
    els.calendarGrid.appendChild(empty);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const cell = document.createElement("span");
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const hasEvent = events.some((calendarEvent) => calendarEvent.event_date === dateKey);
    const isMonthlyMilestone = day === cozy.relationshipStart.getDate();

    cell.className = "calendar-day";
    cell.textContent = day;

    if (hasEvent || isMonthlyMilestone) {
      cell.classList.add("is-milestone");
    }

    els.calendarGrid.appendChild(cell);
  }
}

function renderCountdowns() {
  const now = new Date();
  const anniversary = nextAnniversary(now);
  const diff = Math.max(0, anniversary - now);
  const totalHours = Math.floor(diff / 3600000);

  els.anniversaryDays.textContent = Math.floor(totalHours / 24).toString();
  els.anniversaryHours.textContent = (totalHours % 24).toString();
  els.anniversaryDate.textContent = `Next anniversary: ${formatLongDate(anniversary)}`;
}

function nextAnniversary(fromDate) {
  const candidate = new Date(
    fromDate.getFullYear(),
    cozy.relationshipStart.getMonth(),
    cozy.relationshipStart.getDate(),
    0,
    0,
    0,
  );

  return candidate >= fromDate
    ? candidate
    : new Date(fromDate.getFullYear() + 1, cozy.relationshipStart.getMonth(), cozy.relationshipStart.getDate());
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": csrfToken(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function csrfToken() {
  return document.querySelector('meta[name="csrf-token"]').content;
}

function createSpan(className, textContent) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = textContent;
  return span;
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatPreciseDateTime(date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
