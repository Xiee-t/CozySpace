"use strict";

const STORAGE_KEYS = {
  notes: "cozy-space-love-notes",
  photo: "cozy-space-daily-photo",
  plans: "cozy-space-plans",
};

const state = {
  activeView: "dashboard",
  totalHugs: 0,
  lastActionBy: "Mine",
  dailyGiftUnlockedAt: null,
  partnerName: "Love",
  activeTheme: "me",
  relationshipStart: new Date(2026, 4, 17, 12),
  notes: [],
  plans: [],
  editingNoteId: null,
  editingPlanId: null,
  selectedPlanDate: startOfDay(new Date()),
  schedulerMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12),
  dailyPhotoDataUrl: "",
};

const els = {
  appShell: document.querySelector("#appShell"),
  heroCard: document.querySelector("#heroCard"),
  views: document.querySelectorAll(".view"),
  tabButtons: document.querySelectorAll(".tab-button"),
  hugButton: document.querySelector("#hugButton"),
  hugCount: document.querySelector("#hugCount"),
  lastAction: document.querySelector("#lastAction"),
  activityList: document.querySelector("#activityList"),
  connectionStatus: document.querySelector("#connectionStatus"),
  todayLabel: document.querySelector("#todayLabel"),
  monthsaryDays: document.querySelector("#monthsaryDays"),
  monthsaryDate: document.querySelector("#monthsaryDate"),
  anniversaryDays: document.querySelector("#anniversaryDays"),
  anniversaryDate: document.querySelector("#anniversaryDate"),
  togetherSummary: document.querySelector("#togetherSummary"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarOpenButton: document.querySelector("#calendarOpenButton"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarModal: document.querySelector("#calendarModal"),
  calendarModalCloseButtons: document.querySelectorAll("[data-close-calendar-modal]"),
  calendarPrevButton: document.querySelector("#calendarPrevButton"),
  calendarNextButton: document.querySelector("#calendarNextButton"),
  schedulerMonthTitle: document.querySelector("#schedulerMonthTitle"),
  schedulerGrid: document.querySelector("#schedulerGrid"),
  planForm: document.querySelector("#planForm"),
  selectedPlanDate: document.querySelector("#selectedPlanDate"),
  planTitleInput: document.querySelector("#planTitleInput"),
  planBodyInput: document.querySelector("#planBodyInput"),
  planLockMessage: document.querySelector("#planLockMessage"),
  deletePlanButton: document.querySelector("#deletePlanButton"),
  savePlanButton: document.querySelector("#savePlanButton"),
  plansList: document.querySelector("#plansList"),
  photoChooseButton: document.querySelector("#photoChooseButton"),
  photoDeleteButton: document.querySelector("#photoDeleteButton"),
  photoInput: document.querySelector("#photoInput"),
  photoPreview: document.querySelector("#photoPreview"),
  photoEmpty: document.querySelector("#photoEmpty"),
  photoStatus: document.querySelector("#photoStatus"),
  profileMeButton: document.querySelector("#profileMeButton"),
  profileHisButton: document.querySelector("#profileHisButton"),
  newNoteButton: document.querySelector("#newNoteButton"),
  noteModal: document.querySelector("#noteModal"),
  noteModalTitle: document.querySelector("#noteModalTitle"),
  noteModalCloseButtons: document.querySelectorAll("[data-close-modal]"),
  noteForm: document.querySelector("#noteForm"),
  noteTitleInput: document.querySelector("#noteTitleInput"),
  noteBodyInput: document.querySelector("#noteBodyInput"),
  deleteNoteButton: document.querySelector("#deleteNoteButton"),
  notesList: document.querySelector("#notesList"),
  particleLayer: document.querySelector("#particleLayer"),
};

init();

function init() {
  loadClientState();
  renderToday();
  renderStats();
  renderRelationshipDates();
  renderDailyPhoto();
  renderNotes();
  wireUiEvents();
  setTheme(state.activeTheme);
  setupRealtimePreviewListeners();
  setConnectionStatus(false);
  window.setInterval(renderRelationshipDates, 60 * 1000);
}

function loadClientState() {
  state.notes = readJson(STORAGE_KEYS.notes, [
    {
      id: createId(),
      title: "First tiny note",
      body: "You make ordinary days feel like tiny celebrations.",
      savedAt: new Date().toISOString(),
    },
  ]);
  state.plans = readJson(STORAGE_KEYS.plans, []);
  state.dailyPhotoDataUrl = localStorage.getItem(STORAGE_KEYS.photo) || "";
}

function wireUiEvents() {
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.targetView));
  });

  els.profileMeButton?.addEventListener("click", () => setTheme("me"));
  els.profileHisButton?.addEventListener("click", () => setTheme("his"));

  els.hugButton.addEventListener("click", async (event) => {
    await handleHugInteraction(event.currentTarget, "You sent a warm hug from your color.");
  });

  els.photoChooseButton.addEventListener("click", () => els.photoInput.click());
  els.photoDeleteButton.addEventListener("click", deleteDailyPhoto);
  els.photoInput.addEventListener("change", handlePhotoSelected);

  els.calendarOpenButton.addEventListener("click", () => openCalendarModal(new Date()));
  els.calendarModalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeCalendarModal);
  });
  els.calendarPrevButton.addEventListener("click", () => shiftSchedulerMonth(-1));
  els.calendarNextButton.addEventListener("click", () => shiftSchedulerMonth(1));
  els.planForm.addEventListener("submit", saveCurrentPlan);
  els.deletePlanButton.addEventListener("click", deleteCurrentPlan);

  els.newNoteButton.addEventListener("click", () => startNewNote());
  els.noteModalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeNoteModal);
  });
  els.noteForm.addEventListener("submit", saveCurrentNote);
  els.deleteNoteButton.addEventListener("click", deleteCurrentNote);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.noteModal.classList.contains("is-open")) {
      closeNoteModal();
    }

    if (event.key === "Escape" && els.calendarModal.classList.contains("is-open")) {
      closeCalendarModal();
    }
  });
}

function setActiveView(viewName) {
  state.activeView = viewName;

  els.views.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === viewName);
  });

  els.tabButtons.forEach((button) => {
    const isActive = button.dataset.targetView === viewName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function setTheme(theme) {
  state.activeTheme = theme;

  document.body.classList.toggle("theme-me", theme === "me");
  document.body.classList.toggle("theme-his", theme === "his");

  els.profileMeButton?.classList.toggle("profile-chip--active", theme === "me");
  els.profileHisButton?.classList.toggle("profile-chip--active", theme === "his");
  els.profileHisButton?.classList.toggle("is-preview-active", theme === "his");
}

async function handleHugInteraction(sourceElement, activityMessage) {
  await triggerHapticFeedback(els.heroCard);
  createHeartParticles(sourceElement || getActiveContainer());

  // Optimistic UI update. Replace this with POST /api/hugs/increment once
  // Laravel is ready, then let the broadcast reconcile the final value.
  applyRelationshipStats({
    total_hugs: state.totalHugs + 1,
    last_action_by: "Mine",
  });

  addActivity(activityMessage);
}

async function triggerHapticFeedback(fallbackTarget) {
  const isNative = isNativeCapacitorRuntime();

  if (isNative) {
    try {
      const haptics = await getCapacitorHaptics();

      if (haptics?.Haptics && haptics?.ImpactStyle) {
        await haptics.Haptics.impact({ style: haptics.ImpactStyle.Medium });
        return;
      }
    } catch (error) {
      console.warn("Native haptics unavailable, using browser fallback.", error);
    }
  }

  emulateHapticFeedback(fallbackTarget);
}

function isNativeCapacitorRuntime() {
  const capacitor = window.Capacitor;

  if (!capacitor) {
    return false;
  }

  if (typeof capacitor.isNativePlatform === "function") {
    return capacitor.isNativePlatform();
  }

  return Boolean(capacitor.Plugins);
}

async function getCapacitorHaptics() {
  if (window.Capacitor?.Plugins?.Haptics) {
    return {
      Haptics: window.Capacitor.Plugins.Haptics,
      ImpactStyle: { Medium: "MEDIUM" },
    };
  }

  return import("@capacitor/haptics");
}

function emulateHapticFeedback(target) {
  console.log("\uD83D\uDCF3 [Haptic Emulation]: Phone would vibrate now!");

  const shakeTarget = target || getActiveContainer();
  shakeTarget.classList.remove("visual-shake");

  requestAnimationFrame(() => {
    shakeTarget.classList.add("visual-shake");
    window.setTimeout(() => shakeTarget.classList.remove("visual-shake"), 430);
  });
}

function applyRelationshipStats(payload) {
  state.totalHugs = Number(payload.total_hugs ?? state.totalHugs);
  state.lastActionBy = payload.last_action_by ?? state.lastActionBy;
  state.dailyGiftUnlockedAt = payload.daily_gift_unlocked_at ?? state.dailyGiftUnlockedAt;
  renderStats();
}

function renderStats() {
  els.hugCount.textContent = state.totalHugs.toLocaleString();
  els.lastAction.textContent = `Last action by ${state.lastActionBy}.`;
}

function renderToday() {
  els.todayLabel.textContent = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date());
}

function handlePhotoSelected(event) {
  const [file] = event.target.files;

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.dailyPhotoDataUrl = String(reader.result);
    localStorage.setItem(STORAGE_KEYS.photo, state.dailyPhotoDataUrl);
    renderDailyPhoto();
    addActivity("Daily gift photo selected.");
    // Backend later: POST FormData to /api/daily-gifts/photo and replace
    // localStorage with the returned public asset URL.
  });
  reader.readAsDataURL(file);
}

function renderDailyPhoto() {
  const hasPhoto = Boolean(state.dailyPhotoDataUrl);
  els.photoPreview.hidden = !hasPhoto;
  els.photoEmpty.hidden = hasPhoto;
  els.photoDeleteButton.hidden = !hasPhoto;
  els.photoStatus.textContent = hasPhoto
    ? "Photo preview saved locally for PC testing."
    : "Photo will preview here, then later upload to Laravel storage.";

  if (hasPhoto) {
    els.photoPreview.src = state.dailyPhotoDataUrl;
  }
}

function deleteDailyPhoto() {
  state.dailyPhotoDataUrl = "";
  localStorage.removeItem(STORAGE_KEYS.photo);
  els.photoInput.value = "";
  els.photoPreview.removeAttribute("src");
  renderDailyPhoto();
  addActivity("Daily gift photo cleared.");
}

function startNewNote() {
  state.editingNoteId = null;
  els.noteModalTitle.textContent = "New Note";
  els.noteTitleInput.value = "";
  els.noteBodyInput.value = "";
  els.deleteNoteButton.disabled = true;
  openNoteModal();
}

function saveCurrentNote(event) {
  event.preventDefault();

  const title = els.noteTitleInput.value.trim() || "Untitled note";
  const body = els.noteBodyInput.value.trim();

  if (!body) {
    els.noteBodyInput.focus();
    return;
  }

  const savedAt = new Date().toISOString();

  if (state.editingNoteId) {
    state.notes = state.notes.map((note) =>
      note.id === state.editingNoteId ? { ...note, title, body, savedAt } : note,
    );
    addActivity("Love note updated.");
  } else {
    state.editingNoteId = createId();
    state.notes.unshift({
      id: state.editingNoteId,
      title,
      body,
      savedAt,
    });
    addActivity("New love note saved.");
  }

  persistNotes();
  renderNotes();
  els.deleteNoteButton.disabled = false;
  closeNoteModal();
}

function editNote(noteId) {
  const note = state.notes.find((item) => item.id === noteId);

  if (!note) {
    return;
  }

  state.editingNoteId = note.id;
  els.noteModalTitle.textContent = "Edit Note";
  els.noteTitleInput.value = note.title;
  els.noteBodyInput.value = note.body;
  els.deleteNoteButton.disabled = false;
  openNoteModal();
}

function deleteCurrentNote() {
  if (!state.editingNoteId) {
    return;
  }

  state.notes = state.notes.filter((note) => note.id !== state.editingNoteId);
  persistNotes();
  renderNotes();
  closeNoteModal();
  clearNoteForm();
  addActivity("Love note deleted.");
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

function clearNoteForm() {
  state.editingNoteId = null;
  els.noteModalTitle.textContent = "New Note";
  els.noteTitleInput.value = "";
  els.noteBodyInput.value = "";
  els.deleteNoteButton.disabled = true;
}

function renderNotes() {
  els.notesList.innerHTML = "";

  if (state.notes.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "note-history-item";
    emptyItem.textContent = "No notes yet. Start with one tiny sentence.";
    els.notesList.appendChild(emptyItem);
    return;
  }

  state.notes.forEach((note) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const title = document.createElement("span");
    const preview = document.createElement("span");
    const time = document.createElement("span");

    item.className = "note-history-item";
    button.className = "note-history-button";
    button.type = "button";
    button.addEventListener("click", () => editNote(note.id));

    title.className = "note-history-title";
    title.textContent = note.title;

    preview.className = "note-history-preview";
    preview.textContent = note.body;

    time.className = "note-history-time";
    time.textContent = `Saved ${formatPreciseDateTime(new Date(note.savedAt))}`;

    button.append(title, preview, time);
    item.appendChild(button);
    els.notesList.appendChild(item);
  });
}

function persistNotes() {
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(state.notes));
  // Backend later: sync this array through /api/love-notes CRUD endpoints.
}

function createHeartParticles(sourceElement) {
  const rect = sourceElement.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  for (let index = 0; index < 12; index += 1) {
    const heart = document.createElement("span");
    heart.className = "heart-particle";
    heart.textContent = "\u2665";
    heart.style.left = `${originX}px`;
    heart.style.top = `${originY}px`;
    heart.style.setProperty("--drift", `${randomBetween(-110, 110)}px`);
    heart.style.setProperty("--spin", `${randomBetween(-28, 28)}deg`);
    heart.style.animationDelay = `${index * 24}ms`;

    els.particleLayer.appendChild(heart);
    heart.addEventListener("animationend", () => heart.remove(), { once: true });
  }
}

function addActivity(message) {
  const item = document.createElement("li");
  item.textContent = message;
  els.activityList.prepend(item);

  while (els.activityList.children.length > 6) {
    els.activityList.lastElementChild.remove();
  }
}

function setConnectionStatus(isLive) {
  els.connectionStatus.textContent = isLive ? "Realtime live" : "Offline preview";
  els.connectionStatus.classList.toggle("is-live", isLive);
}

function renderRelationshipDates() {
  const now = new Date();
  const nextMonthsary = getNextMonthlyDate(now, state.relationshipStart.getDate());
  const nextAnniversary = getNextAnniversary(now, state.relationshipStart);
  const completedMonths = getCompletedMonths(now, state.relationshipStart);
  const daysTogether = getWholeDayDifference(now, state.relationshipStart);

  els.monthsaryDays.textContent = getCountdownDays(now, nextMonthsary).toString();
  els.monthsaryDate.textContent = `${formatShortDate(nextMonthsary)} - ${getMonthsaryLabel(nextMonthsary)}`;

  els.anniversaryDays.textContent = getCountdownDays(now, nextAnniversary).toString();
  els.anniversaryDate.textContent = `${formatShortDate(nextAnniversary)} - ${nextAnniversary.getFullYear()}`;

  els.togetherSummary.textContent = `${daysTogether} days together and ${completedMonths} month${completedMonths === 1 ? "" : "s"} official.`;

  renderCalendar(now);
}

function renderCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1, 12);
  const totalDays = new Date(year, month + 1, 0, 12).getDate();
  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(firstDay);

  els.calendarTitle.textContent = monthLabel;
  els.calendarGrid.innerHTML = "";

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    const emptyCell = document.createElement("span");
    emptyCell.className = "calendar-day is-empty";
    els.calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const dayCell = document.createElement("span");
    const isToday = day === date.getDate();
    const isMonthsary = day === state.relationshipStart.getDate();
    const dayDate = new Date(year, month, day, 12);
    const hasPlan = getPlansForDate(dayDate).length > 0;
    const isPast = isPastDate(dayDate);
    const isStartDate =
      year === state.relationshipStart.getFullYear() &&
      month === state.relationshipStart.getMonth() &&
      day === state.relationshipStart.getDate();

    dayCell.className = "calendar-day";
    dayCell.textContent = day.toString();
    dayCell.setAttribute("aria-label", getCalendarDayLabel(year, month, day, isMonthsary, isToday));

    if (isToday) {
      dayCell.classList.add("is-today");
    }

    if (isMonthsary) {
      dayCell.classList.add("is-monthsary");
    }

    if (isStartDate) {
      dayCell.classList.add("is-start-date");
    }

    if (hasPlan) {
      dayCell.classList.add("has-plan");
    }

    if (isPast) {
      dayCell.classList.add("is-past");
    }

    els.calendarGrid.appendChild(dayCell);
  }
}

function openCalendarModal(date) {
  state.selectedPlanDate = startOfDay(date);
  state.schedulerMonth = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  clearPlanForm();
  renderScheduler();
  els.calendarModal.classList.add("is-open");
  els.calendarModal.setAttribute("aria-hidden", "false");
}

function closeCalendarModal() {
  els.calendarModal.classList.remove("is-open");
  els.calendarModal.setAttribute("aria-hidden", "true");
}

function shiftSchedulerMonth(direction) {
  state.schedulerMonth = new Date(
    state.schedulerMonth.getFullYear(),
    state.schedulerMonth.getMonth() + direction,
    1,
    12,
  );
  renderScheduler();
}

function renderScheduler() {
  const year = state.schedulerMonth.getFullYear();
  const month = state.schedulerMonth.getMonth();
  const firstDay = new Date(year, month, 1, 12);
  const totalDays = new Date(year, month + 1, 0, 12).getDate();

  els.schedulerMonthTitle.textContent = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(firstDay);
  els.schedulerGrid.innerHTML = "";

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    const emptyCell = document.createElement("span");
    emptyCell.className = "calendar-day is-empty";
    els.schedulerGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const dayDate = new Date(year, month, day, 12);
    const dayCell = document.createElement("button");
    const hasPlan = getPlansForDate(dayDate).length > 0;
    const isPast = isPastDate(dayDate);

    dayCell.className = "calendar-day";
    dayCell.type = "button";
    dayCell.textContent = day.toString();
    dayCell.setAttribute("aria-label", getCalendarDayLabel(year, month, day, day === 17, isSameDay(dayDate, new Date())));
    dayCell.addEventListener("click", () => selectPlanDate(dayDate));

    if (isSameDay(dayDate, new Date())) {
      dayCell.classList.add("is-today");
    }

    if (day === state.relationshipStart.getDate()) {
      dayCell.classList.add("is-monthsary");
    }

    if (hasPlan) {
      dayCell.classList.add("has-plan");
    }

    if (isPast) {
      dayCell.classList.add("is-past", "is-disabled");
    }

    if (isSameDay(dayDate, state.selectedPlanDate)) {
      dayCell.classList.add("is-selected");
    }

    els.schedulerGrid.appendChild(dayCell);
  }

  renderSelectedPlanDate();
}

function selectPlanDate(date) {
  state.selectedPlanDate = startOfDay(date);
  clearPlanForm();
  renderScheduler();
}

function renderSelectedPlanDate() {
  const locked = isPastDate(state.selectedPlanDate);
  const plans = getPlansForDate(state.selectedPlanDate);
  els.selectedPlanDate.textContent = formatLongDate(state.selectedPlanDate);
  els.planForm.classList.toggle("is-locked", locked);
  els.planTitleInput.disabled = locked;
  els.planBodyInput.disabled = locked;
  els.savePlanButton.disabled = locked;
  els.deletePlanButton.disabled = locked || !state.editingPlanId;
  els.planLockMessage.textContent = locked
    ? "This date has passed. Existing plans are view-only."
    : "Add or edit plans for this day.";
  renderPlansList(plans, locked);
}

function renderPlansList(plans, locked) {
  els.plansList.innerHTML = "";

  if (plans.length === 0) {
    const empty = document.createElement("p");
    empty.className = "plan-item";
    empty.textContent = locked ? "No saved plans for this past date." : "No plans yet for this day.";
    els.plansList.appendChild(empty);
    return;
  }

  plans.forEach((plan) => {
    const item = document.createElement("button");
    item.className = "plan-item";
    item.type = "button";
    item.innerHTML = `<strong>${escapeHtml(plan.title)}</strong>${escapeHtml(plan.body || "No extra details.")}`;
    item.addEventListener("click", () => editPlan(plan.id));
    els.plansList.appendChild(item);
  });
}

function saveCurrentPlan(event) {
  event.preventDefault();

  if (isPastDate(state.selectedPlanDate)) {
    els.planLockMessage.textContent = "Past dates are locked, so this plan cannot be saved.";
    return;
  }

  const title = els.planTitleInput.value.trim();
  const body = els.planBodyInput.value.trim();

  if (!title) {
    els.planTitleInput.focus();
    return;
  }

  if (state.editingPlanId) {
    state.plans = state.plans.map((plan) =>
      plan.id === state.editingPlanId ? { ...plan, title, body, updatedAt: new Date().toISOString() } : plan,
    );
    addActivity("Calendar plan updated.");
  } else {
    state.plans.push({
      id: createId(),
      date: toDateKey(state.selectedPlanDate),
      title,
      body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    addActivity("Calendar plan added.");
  }

  persistPlans();
  clearPlanForm();
  renderRelationshipDates();
  renderScheduler();
}

function editPlan(planId) {
  const plan = state.plans.find((item) => item.id === planId);

  if (!plan) {
    return;
  }

  state.editingPlanId = plan.id;
  els.planTitleInput.value = plan.title;
  els.planBodyInput.value = plan.body || "";
  renderSelectedPlanDate();
}

function deleteCurrentPlan() {
  if (!state.editingPlanId || isPastDate(state.selectedPlanDate)) {
    return;
  }

  state.plans = state.plans.filter((plan) => plan.id !== state.editingPlanId);
  persistPlans();
  clearPlanForm();
  renderRelationshipDates();
  renderScheduler();
  addActivity("Calendar plan deleted.");
}

function clearPlanForm() {
  state.editingPlanId = null;
  els.planTitleInput.value = "";
  els.planBodyInput.value = "";
}

function getPlansForDate(date) {
  const key = toDateKey(date);
  return state.plans.filter((plan) => plan.date === key);
}

function persistPlans() {
  localStorage.setItem(STORAGE_KEYS.plans, JSON.stringify(state.plans));
  // Backend later: sync this array through /api/calendar-plans CRUD endpoints.
}

function setupRealtimePreviewListeners() {
  // Laravel Echo / Reverb placeholder:
  // window.Echo.channel("relationship.stats")
  //   .listen(".RelationshipStatsUpdated", async (event) => {
  //     applyRelationshipStats(event.stats);
  //     await triggerHapticFeedback(els.heroCard);
  //     addActivity(`${event.stats.last_action_by} sent an update.`);
  //   });

  window.addEventListener("cozy-space:stats-updated", async (event) => {
    applyRelationshipStats(event.detail);
    await triggerHapticFeedback(els.heroCard);
    addActivity(`${event.detail.last_action_by || state.partnerName} updated Cozy Space.`);
  });

  window.setTimeout(() => {
    setConnectionStatus(true);
    window.dispatchEvent(
      new CustomEvent("cozy-space:stats-updated", {
        detail: {
          total_hugs: state.totalHugs,
          last_action_by: "Realtime preview",
        },
      }),
    );
  }, 900);
}

function getActiveContainer() {
  return document.querySelector(".view.is-active") || els.appShell;
}

function getNextMonthlyDate(fromDate, dayOfMonth) {
  const candidate = new Date(fromDate.getFullYear(), fromDate.getMonth(), dayOfMonth, 12);

  if (isSameDay(fromDate, candidate) || fromDate < candidate) {
    return candidate;
  }

  return new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, dayOfMonth, 12);
}

function getNextAnniversary(fromDate, startDate) {
  const candidate = new Date(fromDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12);

  if (isSameDay(fromDate, candidate) || fromDate < candidate) {
    return candidate;
  }

  return new Date(fromDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate(), 12);
}

function getCompletedMonths(fromDate, startDate) {
  let months = (fromDate.getFullYear() - startDate.getFullYear()) * 12;
  months += fromDate.getMonth() - startDate.getMonth();

  if (fromDate.getDate() < startDate.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

function getCountdownDays(fromDate, targetDate) {
  return Math.max(0, Math.ceil((startOfDay(targetDate) - startOfDay(fromDate)) / 86400000));
}

function getWholeDayDifference(fromDate, startDate) {
  return Math.max(0, Math.floor((startOfDay(fromDate) - startOfDay(startDate)) / 86400000));
}

function getMonthsaryLabel(date) {
  const months = getCompletedMonths(date, state.relationshipStart);
  return `${months}${getOrdinalSuffix(months)} monthsary`;
}

function getCalendarDayLabel(year, month, day, isMonthsary, isToday) {
  const dateLabel = formatShortDate(new Date(year, month, day, 12));
  const details = [];

  if (isToday) {
    details.push("today");
  }

  if (isMonthsary) {
    details.push("monthsary date");
  }

  return details.length ? `${dateLabel}, ${details.join(", ")}` : dateLabel;
}

function getOrdinalSuffix(value) {
  const mod100 = value % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return "th";
  }

  switch (value % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
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

function formatLongDate(date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isPastDate(date) {
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}

function isSameDay(firstDate, secondDate) {
  return startOfDay(firstDate).getTime() === startOfDay(secondDate).getTime();
}

function randomBetween(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${randomBetween(1000, 9999)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
