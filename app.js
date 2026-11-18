"use strict";

const SUPABASE_URL = "https://fiauyvcbdhgijxwvhvaz.supabase.co";
const SUPABASE_KEY = "sb_publishable_90avx2PkIt7R5SoD71NwcA_MIx25IMy";
const DEFAULT_SPACE_ID = "00000000-0000-0000-0000-000000000001";

let supabaseClient = null;

const STORAGE_KEYS = {
  notes: "cozy-space-love-notes",
  photo: "cozy-space-daily-photo",
  plans: "cozy-space-plans",
  theme: "cozy-space-active-theme",
  gender: "cozy-space-gender",
};

const savedGender = localStorage.getItem(STORAGE_KEYS.gender) || "female";

const state = {
  activeView: "dashboard",
  totalHugs: 0,
  lastActionBy: savedGender === "male" ? "Him" : "Her",
  dailyGiftUnlockedAt: null,
  partnerName: "Partner",
  gender: savedGender,
  activeTheme: savedGender === "male" ? "male" : "female",
  relationshipStart: new Date(2026, 4, 17, 12),
  notes: [],
  plans: [],
  editingNoteId: null,
  editingPlanId: null,
  selectedPlanDate: startOfDay(new Date()),
  schedulerMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12),
  dailyPhotoDataUrl: "",
  isLive: false,
  user: null,
  profile: null,
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
  authProfileStrip: document.querySelector("#authProfileStrip"),
  openAuthModalButton: document.querySelector("#openAuthModalButton"),
  userThemeSwatch: document.querySelector("#userThemeSwatch"),
  authButtonLabel: document.querySelector("#authButtonLabel"),
  signOutButton: document.querySelector("#signOutButton"),
  authModal: document.querySelector("#authModal"),
  authModalCloseButtons: document.querySelectorAll("[data-close-auth-modal]"),
  genderFemaleButton: document.querySelector("#genderFemaleButton"),
  genderMaleButton: document.querySelector("#genderMaleButton"),
  googleSignInButton: document.querySelector("#googleSignInButton"),
  githubSignInButton: document.querySelector("#githubSignInButton"),
  emailAuthForm: document.querySelector("#emailAuthForm"),
  authEmailInput: document.querySelector("#authEmailInput"),
  authPasswordInput: document.querySelector("#authPasswordInput"),
  emailSignInButton: document.querySelector("#emailSignInButton"),
  emailSignUpButton: document.querySelector("#emailSignUpButton"),
  authStatusHint: document.querySelector("#authStatusHint"),
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

async function init() {
  loadLocalState();
  renderToday();
  renderStats();
  renderRelationshipDates();
  renderDailyPhoto();
  renderNotes();
  wireUiEvents();
  setGender(state.gender);
  window.setInterval(renderRelationshipDates, 60 * 1000);

  await initSupabase();
}

function loadLocalState() {
  state.notes = readJson(STORAGE_KEYS.notes, [
    {
      id: "local-first-note",
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

  els.openAuthModalButton?.addEventListener("click", openAuthModal);
  els.signOutButton?.addEventListener("click", handleSignOut);
  els.authModalCloseButtons.forEach((btn) => btn.addEventListener("click", closeAuthModal));

  els.genderFemaleButton?.addEventListener("click", () => setGender("female"));
  els.genderMaleButton?.addEventListener("click", () => setGender("male"));

  els.googleSignInButton?.addEventListener("click", handleGoogleSignIn);
  els.githubSignInButton?.addEventListener("click", handleGithubSignIn);
  els.emailAuthForm?.addEventListener("submit", handleEmailSignIn);
  els.emailSignUpButton?.addEventListener("click", handleEmailSignUp);

  els.hugButton.addEventListener("click", async (event) => {
    await handleHugInteraction(event.currentTarget);
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
    if (event.key === "Escape") {
      if (els.authModal?.classList.contains("is-open")) closeAuthModal();
      if (els.noteModal?.classList.contains("is-open")) closeNoteModal();
      if (els.calendarModal?.classList.contains("is-open")) closeCalendarModal();
    }
  });
}

// -------------------------------------------------------------
// Gender & Theme Management
// -------------------------------------------------------------

function setGender(gender) {
  state.gender = gender;
  localStorage.setItem(STORAGE_KEYS.gender, gender);

  const isFemale = gender === "female";
  els.genderFemaleButton?.classList.toggle("is-selected", isFemale);
  els.genderFemaleButton?.setAttribute("aria-pressed", String(isFemale));
  els.genderMaleButton?.classList.toggle("is-selected", !isFemale);
  els.genderMaleButton?.setAttribute("aria-pressed", String(!isFemale));

  setTheme(isFemale ? "female" : "male");
  updateUserBadge();

  if (supabaseClient && state.user) {
    supabaseClient
      .from("profiles")
      .update({
        gender: gender,
        theme_color: isFemale ? "#e30b5c" : "#A4D8FF",
        updated_at: new Date().toISOString(),
      })
      .eq("id", state.user.id)
      .then(({ error }) => {
        if (error) console.error("Error saving gender to backend:", error);
      });
  }
}

function setTheme(theme) {
  const isFemale = theme === "female" || theme === "me";
  state.activeTheme = isFemale ? "female" : "male";
  localStorage.setItem(STORAGE_KEYS.theme, state.activeTheme);

  document.body.classList.toggle("theme-female", isFemale);
  document.body.classList.toggle("theme-me", isFemale);
  document.body.classList.toggle("theme-male", !isFemale);
  document.body.classList.toggle("theme-his", !isFemale);

  if (els.userThemeSwatch) {
    els.userThemeSwatch.className = isFemale
      ? "profile-swatch profile-swatch--me"
      : "profile-swatch profile-swatch--his-preview";
    els.userThemeSwatch.style.background = isFemale
      ? "linear-gradient(135deg, #2e1e1f 0%, #e30b5c 100%)"
      : "linear-gradient(135deg, #35393C 0%, #A4D8FF 100%)";
    els.userThemeSwatch.style.opacity = "1";
  }
}

function updateUserBadge() {
  if (!els.authButtonLabel) return;

  const isFemale = state.gender === "female";
  const genderIcon = isFemale ? "♀" : "♂";

  if (state.user) {
    const name = state.profile?.display_name || state.user.email?.split("@")[0] || "Partner";
    els.authButtonLabel.textContent = `${name} (${genderIcon})`;
    if (els.signOutButton) els.signOutButton.hidden = false;
  } else {
    els.authButtonLabel.textContent = `${isFemale ? "Female ♀" : "Male ♂"} • Sign In`;
    if (els.signOutButton) els.signOutButton.hidden = true;
  }
}

function getActorName() {
  if (state.profile?.display_name) {
    return state.profile.display_name;
  }
  if (state.user?.email) {
    return state.user.email.split("@")[0];
  }
  return state.gender === "female" ? "Her" : "Him";
}

// -------------------------------------------------------------
// Auth Modal & Supabase Auth
// -------------------------------------------------------------

function openAuthModal() {
  els.authModal?.classList.add("is-open");
  els.authModal?.setAttribute("aria-hidden", "false");
  showAuthStatus("Select female or male to set your theme, then sign in to sync with your partner.", "");
}

function closeAuthModal() {
  els.authModal?.classList.remove("is-open");
  els.authModal?.setAttribute("aria-hidden", "true");
}

function showAuthStatus(message, statusClass) {
  if (!els.authStatusHint) return;
  els.authStatusHint.textContent = message;
  els.authStatusHint.className = `auth-status-hint ${statusClass || ""}`;
}

function showAuthError(message) {
  showAuthStatus(message, "is-error");
}

async function handleGoogleSignIn() {
  if (!supabaseClient) {
    showAuthError("Database connecting, please retry in a moment.");
    return;
  }

  showAuthStatus("Redirecting to Google sign in...", "is-info");
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      data: {
        gender: state.gender,
      },
    },
  });

  if (error) {
    showAuthError(error.message);
  }
}

async function handleGithubSignIn() {
  if (!supabaseClient) {
    showAuthError("Database connecting, please retry in a moment.");
    return;
  }

  showAuthStatus("Redirecting to GitHub sign in...", "is-info");
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: window.location.origin,
      data: {
        gender: state.gender,
      },
    },
  });

  if (error) {
    showAuthError(error.message);
  }
}

async function handleEmailSignIn(event) {
  event.preventDefault();
  if (!supabaseClient) {
    showAuthError("Database connecting, please retry in a moment.");
    return;
  }

  const email = els.authEmailInput?.value.trim();
  const password = els.authPasswordInput?.value;

  if (!email || !password) {
    showAuthError("Please enter your email and password.");
    return;
  }

  showAuthStatus("Signing in...", "is-info");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    showAuthError(error.message);
    return;
  }

  showAuthStatus("Signed in successfully!", "is-success");
  await syncAuthUser(data.user);
  setTimeout(closeAuthModal, 700);
}

async function handleEmailSignUp() {
  if (!supabaseClient) {
    showAuthError("Database connecting, please retry in a moment.");
    return;
  }

  const email = els.authEmailInput?.value.trim();
  const password = els.authPasswordInput?.value;

  if (!email || !password) {
    showAuthError("Enter email and password to create an account.");
    return;
  }

  if (password.length < 6) {
    showAuthError("Password must be at least 6 characters.");
    return;
  }

  showAuthStatus("Creating your account...", "is-info");

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        gender: state.gender,
        display_name: email.split("@")[0],
      },
    },
  });

  if (error) {
    showAuthError(error.message);
    return;
  }

  if (data?.session) {
    showAuthStatus("Account created & signed in!", "is-success");
    await syncAuthUser(data.user);
    setTimeout(closeAuthModal, 700);
  } else {
    showAuthStatus("Account created! Please check your email to confirm.", "is-success");
  }
}

async function handleSignOut() {
  if (!supabaseClient) return;

  await supabaseClient.auth.signOut();
  state.user = null;
  state.profile = null;
  updateUserBadge();
  addActivity("Signed out.");
}

async function syncAuthUser(user) {
  if (!user || !supabaseClient) return;

  state.user = user;

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    state.profile = profile;
    if (profile.gender && (profile.gender === "female" || profile.gender === "male")) {
      setGender(profile.gender);
    } else {
      await supabaseClient
        .from("profiles")
        .update({
          gender: state.gender,
          theme_color: state.gender === "female" ? "#e30b5c" : "#A4D8FF",
        })
        .eq("id", user.id);
    }
  } else {
    const { data: newProfile } = await supabaseClient
      .from("profiles")
      .insert({
        id: user.id,
        space_id: DEFAULT_SPACE_ID,
        display_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Cozy Partner",
        email: user.email,
        gender: state.gender,
        theme_color: state.gender === "female" ? "#e30b5c" : "#A4D8FF",
      })
      .select()
      .maybeSingle();

    if (newProfile) state.profile = newProfile;
  }

  updateUserBadge();
  addActivity(`${getActorName()} connected.`);
}

// -------------------------------------------------------------
// Supabase Cloud & Realtime Integration
// -------------------------------------------------------------

async function initSupabase() {
  if (!window.supabase) {
    console.warn("Supabase SDK not loaded yet, using offline fallback.");
    setConnectionStatus(false);
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Check existing auth session
    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (sessionData?.session?.user) {
      await syncAuthUser(sessionData.session.user);
    }

    // Listen for auth changes
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await syncAuthUser(session.user);
      } else {
        state.user = null;
        state.profile = null;
        updateUserBadge();
      }
    });

    // Initial load from cloud
    await Promise.allSettled([
      syncHugsFromSupabase(),
      syncNotesFromSupabase(),
      syncPlansFromSupabase(),
      syncPhotosFromSupabase(),
      syncActivityFromSupabase(),
    ]);

    // Setup live WebSockets subscriptions
    subscribeToRealtime();
    setConnectionStatus(true);
  } catch (err) {
    console.error("Supabase initialization error:", err);
    setConnectionStatus(false);
  }
}

function setConnectionStatus(isLive) {
  state.isLive = isLive;
  if (isLive) {
    els.connectionStatus.textContent = "Live connected";
    els.connectionStatus.classList.add("is-live");
  } else {
    els.connectionStatus.textContent = "Local offline";
    els.connectionStatus.classList.remove("is-live");
  }
}

async function syncHugsFromSupabase() {
  if (!supabaseClient) return;

  const { count, error } = await supabaseClient
    .from("hugs")
    .select("*", { count: "exact", head: true })
    .eq("space_id", DEFAULT_SPACE_ID);

  if (!error && count !== null) {
    state.totalHugs = count;
  }

  const { data: latestHug } = await supabaseClient
    .from("hugs")
    .select("sender_name, created_at")
    .eq("space_id", DEFAULT_SPACE_ID)
    .order("created_at", { ascending: false })
    .limit(1);

  if (latestHug && latestHug.length > 0) {
    state.lastActionBy = latestHug[0].sender_name || "Partner";
  }

  renderStats();
}

async function syncNotesFromSupabase() {
  if (!supabaseClient) return;

  const { data: notes, error } = await supabaseClient
    .from("love_notes")
    .select("*")
    .eq("space_id", DEFAULT_SPACE_ID)
    .order("created_at", { ascending: false });

  if (!error && notes && notes.length > 0) {
    state.notes = notes.map((n) => ({
      id: String(n.id),
      title: n.title,
      body: n.body,
      savedAt: n.created_at,
      author: n.author_name || "Mine",
    }));
    persistNotes();
    renderNotes();
  }
}

async function syncPlansFromSupabase() {
  if (!supabaseClient) return;

  const { data: plans, error } = await supabaseClient
    .from("calendar_events")
    .select("*")
    .eq("space_id", DEFAULT_SPACE_ID);

  if (!error && plans && plans.length > 0) {
    state.plans = plans.map((p) => ({
      id: String(p.id),
      date: p.event_date,
      title: p.title,
      body: p.description || "",
      createdAt: p.created_at,
    }));
    persistPlans();
    renderRelationshipDates();
    renderScheduler();
  }
}

async function syncPhotosFromSupabase() {
  if (!supabaseClient) return;

  const { data: photos, error } = await supabaseClient
    .from("photos")
    .select("storage_path, caption")
    .eq("space_id", DEFAULT_SPACE_ID)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!error && photos && photos.length > 0) {
    state.dailyPhotoDataUrl = photos[0].storage_path;
    localStorage.setItem(STORAGE_KEYS.photo, state.dailyPhotoDataUrl);
    renderDailyPhoto();
  }
}

async function syncActivityFromSupabase() {
  if (!supabaseClient) return;

  const { data: logs, error } = await supabaseClient
    .from("activity_logs")
    .select("actor_name, details, created_at")
    .eq("space_id", DEFAULT_SPACE_ID)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!error && logs && logs.length > 0) {
    els.activityList.innerHTML = "";
    logs.reverse().forEach((log) => {
      addActivity(`${log.actor_name}: ${log.details}`);
    });
  }
}

function subscribeToRealtime() {
  if (!supabaseClient) return;

  // Realtime Hugs
  supabaseClient
    .channel("public:hugs")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "hugs", filter: `space_id=eq.${DEFAULT_SPACE_ID}` },
      (payload) => {
        const sender = payload.new.sender_name || "Partner";
        state.totalHugs += 1;
        state.lastActionBy = sender;
        renderStats();

        // Trigger remote heart burst if from partner
        if (sender !== getActorName()) {
          triggerHapticFeedback(els.heroCard);
          createHeartParticles(els.heroCard);
          addActivity(`${sender} sent a warm hug \u2665`);
        }
      }
    )
    .subscribe();

  // Realtime Love Notes
  supabaseClient
    .channel("public:love_notes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "love_notes", filter: `space_id=eq.${DEFAULT_SPACE_ID}` },
      async () => {
        await syncNotesFromSupabase();
      }
    )
    .subscribe();

  // Realtime Calendar Events
  supabaseClient
    .channel("public:calendar_events")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "calendar_events", filter: `space_id=eq.${DEFAULT_SPACE_ID}` },
      async () => {
        await syncPlansFromSupabase();
      }
    )
    .subscribe();

  // Realtime Activity Logs
  supabaseClient
    .channel("public:activity_logs")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "activity_logs", filter: `space_id=eq.${DEFAULT_SPACE_ID}` },
      (payload) => {
        const log = payload.new;
        if (log.actor_name !== getActorName()) {
          addActivity(`${log.actor_name}: ${log.details}`);
        }
      }
    )
    .subscribe();
}

// -------------------------------------------------------------
// UI Navigation
// -------------------------------------------------------------

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

// -------------------------------------------------------------
// Virtual Hugs
// -------------------------------------------------------------

async function handleHugInteraction(sourceElement) {
  await triggerHapticFeedback(els.heroCard);
  createHeartParticles(sourceElement || getActiveContainer());

  const actor = getActorName();
  state.totalHugs += 1;
  state.lastActionBy = actor;
  renderStats();
  addActivity("You sent a warm hug \u2665");

  if (supabaseClient) {
    try {
      await supabaseClient.from("hugs").insert({
        space_id: DEFAULT_SPACE_ID,
        sender_name: actor,
      });

      await supabaseClient.from("activity_logs").insert({
        space_id: DEFAULT_SPACE_ID,
        actor_name: actor,
        action_type: "hug_sent",
        details: "Sent a warm hug \u2665",
      });
    } catch (e) {
      console.error("Failed to persist hug to cloud:", e);
    }
  }
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
      console.warn("Native haptics unavailable, using fallback.", error);
    }
  }

  emulateHapticFeedback(fallbackTarget);
}

function isNativeCapacitorRuntime() {
  const capacitor = window.Capacitor;
  if (!capacitor) return false;
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
  const shakeTarget = target || getActiveContainer();
  shakeTarget.classList.remove("visual-shake");

  requestAnimationFrame(() => {
    shakeTarget.classList.add("visual-shake");
    window.setTimeout(() => shakeTarget.classList.remove("visual-shake"), 430);
  });
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

// -------------------------------------------------------------
// Photos & Memories
// -------------------------------------------------------------

async function handlePhotoSelected(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    state.dailyPhotoDataUrl = String(reader.result);
    localStorage.setItem(STORAGE_KEYS.photo, state.dailyPhotoDataUrl);
    renderDailyPhoto();
    els.photoStatus.textContent = "Uploading to Supabase cloud...";
    addActivity("New memory photo selected.");

    if (supabaseClient) {
      try {
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${DEFAULT_SPACE_ID}/${Date.now()}-${cleanName}`;

        const { error: uploadError } = await supabaseClient.storage
          .from("photos")
          .upload(filePath, file, { upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabaseClient.storage
            .from("photos")
            .getPublicUrl(filePath);

          const cloudUrl = publicUrlData.publicUrl;
          state.dailyPhotoDataUrl = cloudUrl;
          localStorage.setItem(STORAGE_KEYS.photo, cloudUrl);
          renderDailyPhoto();

          await supabaseClient.from("photos").insert({
            space_id: DEFAULT_SPACE_ID,
            storage_path: cloudUrl,
            caption: file.name,
            uploader_name: getActorName(),
          });

          await supabaseClient.from("activity_logs").insert({
            space_id: DEFAULT_SPACE_ID,
            actor_name: getActorName(),
            action_type: "photo_shared",
            details: "Added a new memory photo",
          });

          els.photoStatus.textContent = "Synced to Supabase cloud!";
        } else {
          console.error("Storage upload error:", uploadError);
          els.photoStatus.textContent = "Saved locally (Cloud upload error).";
        }
      } catch (err) {
        console.error("Failed to upload photo:", err);
      }
    }
  });

  reader.readAsDataURL(file);
}

function renderDailyPhoto() {
  const hasPhoto = Boolean(state.dailyPhotoDataUrl);
  els.photoPreview.hidden = !hasPhoto;
  els.photoEmpty.hidden = hasPhoto;
  els.photoDeleteButton.hidden = !hasPhoto;
  els.photoStatus.textContent = hasPhoto
    ? "Synced with cloud memory scrapbook."
    : "Tap to upload a memory photo to Supabase cloud.";

  if (hasPhoto) {
    els.photoPreview.src = state.dailyPhotoDataUrl;
  }
}

async function deleteDailyPhoto() {
  state.dailyPhotoDataUrl = "";
  localStorage.removeItem(STORAGE_KEYS.photo);
  els.photoInput.value = "";
  els.photoPreview.removeAttribute("src");
  renderDailyPhoto();
  addActivity("Memory photo cleared.");
}

// -------------------------------------------------------------
// Love Notes
// -------------------------------------------------------------

function startNewNote() {
  state.editingNoteId = null;
  els.noteModalTitle.textContent = "New Note";
  els.noteTitleInput.value = "";
  els.noteBodyInput.value = "";
  els.deleteNoteButton.disabled = true;
  openNoteModal();
}

async function saveCurrentNote(event) {
  event.preventDefault();

  const title = els.noteTitleInput.value.trim() || "Untitled note";
  const body = els.noteBodyInput.value.trim();

  if (!body) {
    els.noteBodyInput.focus();
    return;
  }

  const savedAt = new Date().toISOString();
  const actor = getActorName();

  if (state.editingNoteId) {
    state.notes = state.notes.map((note) =>
      note.id === state.editingNoteId ? { ...note, title, body, savedAt } : note
    );
    addActivity("Love note updated.");

    if (supabaseClient && !state.editingNoteId.startsWith("local-")) {
      await supabaseClient
        .from("love_notes")
        .update({ title, body, author_name: actor })
        .eq("id", state.editingNoteId);
    }
  } else {
    const localId = createId();
    state.editingNoteId = localId;
    state.notes.unshift({
      id: localId,
      title,
      body,
      savedAt,
      author: actor,
    });
    addActivity("New love note saved.");

    if (supabaseClient) {
      const { data } = await supabaseClient
        .from("love_notes")
        .insert({
          space_id: DEFAULT_SPACE_ID,
          title,
          body,
          author_name: actor,
        })
        .select()
        .single();

      if (data) {
        state.editingNoteId = String(data.id);
      }

      await supabaseClient.from("activity_logs").insert({
        space_id: DEFAULT_SPACE_ID,
        actor_name: actor,
        action_type: "note_added",
        details: `Left a note: "${title}"`,
      });
    }
  }

  persistNotes();
  renderNotes();
  els.deleteNoteButton.disabled = false;
  closeNoteModal();
}

function editNote(noteId) {
  const note = state.notes.find((item) => item.id === noteId);
  if (!note) return;

  state.editingNoteId = note.id;
  els.noteModalTitle.textContent = "Edit Note";
  els.noteTitleInput.value = note.title;
  els.noteBodyInput.value = note.body;
  els.deleteNoteButton.disabled = false;
  openNoteModal();
}

async function deleteCurrentNote() {
  if (!state.editingNoteId) return;

  const noteToDelete = state.editingNoteId;
  state.notes = state.notes.filter((note) => note.id !== noteToDelete);
  persistNotes();
  renderNotes();
  closeNoteModal();
  clearNoteForm();
  addActivity("Love note deleted.");

  if (supabaseClient && !noteToDelete.startsWith("local-")) {
    await supabaseClient.from("love_notes").delete().eq("id", noteToDelete);
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
}

// -------------------------------------------------------------
// Visual Effects & Activity Feed
// -------------------------------------------------------------

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

function getActiveContainer() {
  return document.querySelector(".view.is-active") || els.appShell;
}

// -------------------------------------------------------------
// Relationship Countdown & Calendar
// -------------------------------------------------------------

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

    if (isToday) dayCell.classList.add("is-today");
    if (isMonthsary) dayCell.classList.add("is-monthsary");
    if (isStartDate) dayCell.classList.add("is-start-date");
    if (hasPlan) dayCell.classList.add("has-plan");
    if (isPast) dayCell.classList.add("is-past");

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
    12
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
    dayCell.setAttribute(
      "aria-label",
      getCalendarDayLabel(year, month, day, day === 17, isSameDay(dayDate, new Date()))
    );
    dayCell.addEventListener("click", () => selectPlanDate(dayDate));

    if (isSameDay(dayDate, new Date())) dayCell.classList.add("is-today");
    if (day === state.relationshipStart.getDate()) dayCell.classList.add("is-monthsary");
    if (hasPlan) dayCell.classList.add("has-plan");
    if (isPast) dayCell.classList.add("is-past", "is-disabled");
    if (isSameDay(dayDate, state.selectedPlanDate)) dayCell.classList.add("is-selected");

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

async function saveCurrentPlan(event) {
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

  const dateStr = toDateKey(state.selectedPlanDate);

  if (state.editingPlanId) {
    state.plans = state.plans.map((plan) =>
      plan.id === state.editingPlanId ? { ...plan, title, body, updatedAt: new Date().toISOString() } : plan
    );
    addActivity("Calendar plan updated.");

    if (supabaseClient && !state.editingPlanId.startsWith("local-")) {
      await supabaseClient
        .from("calendar_events")
        .update({ title, description: body })
        .eq("id", state.editingPlanId);
    }
  } else {
    const localId = createId();
    state.plans.push({
      id: localId,
      date: dateStr,
      title,
      body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    addActivity("Calendar plan added.");

    if (supabaseClient) {
      const { data } = await supabaseClient
        .from("calendar_events")
        .insert({
          space_id: DEFAULT_SPACE_ID,
          event_date: dateStr,
          title,
          description: body,
          event_type: "plan",
        })
        .select()
        .single();

      if (data) {
        state.plans = state.plans.map((p) => (p.id === localId ? { ...p, id: String(data.id) } : p));
      }

      await supabaseClient.from("activity_logs").insert({
        space_id: DEFAULT_SPACE_ID,
        actor_name: getActorName(),
        action_type: "calendar_updated",
        details: `Added plan for ${dateStr}: "${title}"`,
      });
    }
  }

  persistPlans();
  clearPlanForm();
  renderRelationshipDates();
  renderScheduler();
}

function editPlan(planId) {
  const plan = state.plans.find((item) => item.id === planId);
  if (!plan) return;

  state.editingPlanId = plan.id;
  els.planTitleInput.value = plan.title;
  els.planBodyInput.value = plan.body || "";
  renderSelectedPlanDate();
}

async function deleteCurrentPlan() {
  if (!state.editingPlanId || isPastDate(state.selectedPlanDate)) {
    return;
  }

  const planToDelete = state.editingPlanId;
  state.plans = state.plans.filter((plan) => plan.id !== planToDelete);
  persistPlans();
  clearPlanForm();
  renderRelationshipDates();
  renderScheduler();
  addActivity("Calendar plan deleted.");

  if (supabaseClient && !planToDelete.startsWith("local-")) {
    await supabaseClient.from("calendar_events").delete().eq("id", planToDelete);
  }
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
}

// -------------------------------------------------------------
// Utilities & Formatting
// -------------------------------------------------------------

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
  if (isToday) details.push("today");
  if (isMonthsary) details.push("monthsary date");
  return details.length ? `${dateLabel}, ${details.join(", ")}` : dateLabel;
}

function getOrdinalSuffix(value) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
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
