"use strict";

const SUPABASE_URL = "https://fiauyvcbdhgijxwvhvaz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpYXV5dmNiZGhnaWp4d3ZodmF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMjA1MTUsImV4cCI6MjExMDU5NjUxNX0.A6_d8ApufrLW8A28oPKR6v1M0AAjVStyP5eMxY-pC3I";
const DEFAULT_SPACE_ID = "00000000-0000-0000-0000-000000000001";

const IS_OAUTH_RETURN =
  typeof window !== "undefined" &&
  (window.location.hash.includes("access_token") ||
   window.location.hash.includes("refresh_token") ||
   window.location.search.includes("code="));

const HAS_SAVED_AUTH =
  typeof localStorage !== "undefined" &&
  Object.keys(localStorage).some(
    (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
  );

function getSavedUserFromStorage() {
  if (typeof localStorage === "undefined") return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.user || parsed.currentSession?.user)) {
            return parsed.user || parsed.currentSession?.user;
          }
        }
      }
    }
  } catch (e) {
    console.warn("Could not read stored user:", e);
  }
  return null;
}

let supabaseClient = null;

async function ensureSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  // 1. If window.supabase exists, instantiate immediately
  if (window.supabase && typeof window.supabase.createClient === "function") {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return supabaseClient;
    } catch (e) {
      console.error("Error creating Supabase client:", e);
    }
  }

  // 2. Wait up to 3 seconds in case script is still compiling
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (window.supabase && typeof window.supabase.createClient === "function") {
      try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
        return supabaseClient;
      } catch (e) {
        console.error("Error creating Supabase client:", e);
      }
    }
  }

  // 3. Fallback: dynamically inject script if needed
  if (!window.supabase) {
    await new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });
    if (window.supabase && typeof window.supabase.createClient === "function") {
      try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
        return supabaseClient;
      } catch (e) {}
    }
  }

  return supabaseClient;
}

const STORAGE_KEYS = {
  notes: "cozy-space-love-notes",
  photo: "cozy-space-daily-photo",
  plans: "cozy-space-plans",
  theme: "cozy-space-active-theme",
  gender: "cozy-space-gender",
  haptics: "cozy-space-haptics",
  spaceId: "cozy-space-space-id",
  photos: "cozy-space-shared-photos",
};

const savedGender = localStorage.getItem(STORAGE_KEYS.theme) || localStorage.getItem(STORAGE_KEYS.gender) || "rose-velvet";
const savedHaptics = localStorage.getItem(STORAGE_KEYS.haptics) !== "false";
const savedSpaceId = localStorage.getItem(STORAGE_KEYS.spaceId) || DEFAULT_SPACE_ID;

const state = {
  activeView: "signin",
  totalHugs: 0,
  lastActionBy: "Partner",
  dailyGiftUnlockedAt: null,
  partnerName: "Partner",
  gender: savedGender,
  hapticsEnabled: savedHaptics,
  activeTheme: savedGender,
  relationshipStart: new Date(2026, 4, 17, 12),
  notes: [],
  plans: [],
  editingNoteId: null,
  editingPlanId: null,
  selectedPlanDate: startOfDay(new Date()),
  schedulerMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12),
  dailyPhotoDataUrl: "",
  photos: [],
  pendingPhotos: [],
  activePhotoId: null,
  editingNotePhotos: [],
  isLive: false,
  user: null,
  profile: null,
  spaceId: savedSpaceId,
  space: null,
  realtimeChannel: null,
  authMode: "signin",
  authMethod: "oauth",
};

const els = {
  appShell: document.querySelector("#appShell"),
  bottomTabs: document.querySelector("#bottomTabs"),
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
  photoGalleryStrip: document.querySelector("#photoGalleryStrip"),
  notePhotoInput: document.querySelector("#notePhotoInput"),
  notePhotoCount: document.querySelector("#notePhotoCount"),
  notePhotosPreviewStrip: document.querySelector("#notePhotosPreviewStrip"),

  // Image Lightbox
  imageLightboxModal: document.querySelector("#imageLightboxModal"),
  imageLightboxImg: document.querySelector("#imageLightboxImg"),
  imageLightboxCloseButtons: document.querySelectorAll("[data-close-lightbox]"),
  imageLightboxAuthor: document.querySelector("#imageLightboxAuthor"),
  imageLightboxTime: document.querySelector("#imageLightboxTime"),
  imageLightboxDownload: document.querySelector("#imageLightboxDownload"),

  // Theme Banners & Quick Switchers
  authBannerDot: document.querySelector("#authBannerDot"),
  authBannerText: document.querySelector("#authBannerText"),
  quickThemeBar: document.querySelector("#quickThemeBar"),
  quickThemeScroll: document.querySelector("#quickThemeScroll"),
  settingsThemeGallery: document.querySelector("#settingsThemeGallery"),

  // 4-7-8 Breathing Widget
  breathingPanel: document.querySelector("#breathingPanel"),
  breathingCircle: document.querySelector("#breathingCircle"),
  breathingCircleLabel: document.querySelector("#breathingCircleLabel"),
  breathingCountdown: document.querySelector("#breathingCountdown"),
  breathingPhaseLabel: document.querySelector("#breathingPhaseLabel"),
  breathingCycleCount: document.querySelector("#breathingCycleCount"),
  breathingStartBtn: document.querySelector("#breathingStartBtn"),
  breathingResetBtn: document.querySelector("#breathingResetBtn"),

  // Profile Strip
  authProfileStrip: document.querySelector("#authProfileStrip"),
  openAuthModalButton: document.querySelector("#openAuthModalButton"),
  userThemeSwatch: document.querySelector("#userThemeSwatch"),
  authButtonLabel: document.querySelector("#authButtonLabel"),
  openInviteModalButton: document.querySelector("#openInviteModalButton"),
  partnerChipIcon: document.querySelector("#partnerChipIcon"),
  partnerStatusLabel: document.querySelector("#partnerStatusLabel"),
  openSettingsModalButton: document.querySelector("#openSettingsModalButton"),

  // Sign In / Profile Tab Sections
  authLoggedOutSection: document.querySelector("#authLoggedOutSection"),
  authLoggedInSection: document.querySelector("#authLoggedInSection"),
  authProfileAvatar: document.querySelector("#authProfileAvatar"),
  authProfileEmail: document.querySelector("#authProfileEmail"),
  authProfileThemeTag: document.querySelector("#authProfileThemeTag"),
  authProfilePartnerTag: document.querySelector("#authProfilePartnerTag"),
  authProfileSpaceTag: document.querySelector("#authProfileSpaceTag"),
  authProfileHugsTag: document.querySelector("#authProfileHugsTag"),
  authProfileProviderTag: document.querySelector("#authProfileProviderTag"),
  authGoToMainButton: document.querySelector("#authGoToMainButton"),
  authGoToSettingsButton: document.querySelector("#authGoToSettingsButton"),
  authSignOutButton: document.querySelector("#authSignOutButton"),
  signinTabButtonText: document.querySelector("#signinTabButtonText"),

  // Auth Mode and Method Elements
  authModal: document.querySelector("#authModal"),
  authModalCloseButtons: document.querySelectorAll("[data-close-auth-modal]"),
  genderFemaleButton: document.querySelector("#genderFemaleButton"),
  genderMaleButton: document.querySelector("#genderMaleButton"),
  signinEyebrow: document.querySelector("#signinEyebrow"),
  signinTitle: document.querySelector("#signinTitle"),
  signinSubtitle: document.querySelector("#signinSubtitle"),
  authPanelKicker: document.querySelector("#authPanelKicker"),
  authFormSectionTitle: document.querySelector("#authFormSectionTitle"),
  authFormSectionSubtitle: document.querySelector("#authFormSectionSubtitle"),
  googleAuthButton: document.querySelector("#googleAuthButton"),
  githubAuthButton: document.querySelector("#githubAuthButton"),
  oauthGoogleButtonLabel: document.querySelector("#oauthGoogleButtonLabel"),
  oauthGithubButtonLabel: document.querySelector("#oauthGithubButtonLabel"),
  emailAuthForm: document.querySelector("#emailAuthForm"),
  authEmailInput: document.querySelector("#authEmailInput"),
  authPasswordInput: document.querySelector("#authPasswordInput"),
  emailSubmitButton: document.querySelector("#emailSubmitButton"),
  authFooterPrompt: document.querySelector("#authFooterPrompt"),
  authFooterToggleBtn: document.querySelector("#authFooterToggleBtn"),
  authStatusHint: document.querySelector("#authStatusHint"),

  // Invite Modal
  inviteModal: document.querySelector("#inviteModal"),
  inviteModalCloseButtons: document.querySelectorAll("[data-close-invite-modal]"),
  spaceBadge: document.querySelector("#spaceBadge"),
  spaceNameTag: document.querySelector("#spaceNameTag"),
  spaceStatusDesc: document.querySelector("#spaceStatusDesc"),
  spaceMembersList: document.querySelector("#spaceMembersList"),
  inviteLinkInput: document.querySelector("#inviteLinkInput"),
  copyInviteLinkButton: document.querySelector("#copyInviteLinkButton"),
  shareInviteButton: document.querySelector("#shareInviteButton"),
  copyInviteCodeOnlyButton: document.querySelector("#copyInviteCodeOnlyButton"),
  inviteLockedNotice: document.querySelector("#inviteLockedNotice"),
  codeJoinForm: document.querySelector("#codeJoinForm"),
  manualInviteCodeInput: document.querySelector("#manualInviteCodeInput"),
  submitJoinCodeButton: document.querySelector("#submitJoinCodeButton"),
  inviteModalHint: document.querySelector("#inviteModalHint"),

  // Settings Modal
  settingsModal: document.querySelector("#settingsModal"),
  settingsModalCloseButtons: document.querySelectorAll("[data-close-settings-modal]"),
  hapticsToggle: document.querySelector("#hapticsToggle"),
  testHapticsButton: document.querySelector("#testHapticsButton"),
  settingsThemeFemaleButton: document.querySelector("#settingsThemeFemaleButton"),
  settingsThemeMaleButton: document.querySelector("#settingsThemeMaleButton"),
  settingsAccountSummary: document.querySelector("#settingsAccountSummary"),
  settingsManageInviteButton: document.querySelector("#settingsManageInviteButton"),
  settingsSignOutButton: document.querySelector("#settingsSignOutButton"),

  // Join Modal
  joinModal: document.querySelector("#joinModal"),
  joinModalCloseButtons: document.querySelectorAll("[data-close-join-modal]"),
  joinHostHeading: document.querySelector("#joinHostHeading"),
  joinHostMessage: document.querySelector("#joinHostMessage"),
  joinSpaceBadge: document.querySelector("#joinSpaceBadge"),
  joinActionSection: document.querySelector("#joinActionSection"),
  joinGenderFemaleButton: document.querySelector("#joinGenderFemaleButton"),
  joinGenderMaleButton: document.querySelector("#joinGenderMaleButton"),
  joinLoggedOutView: document.querySelector("#joinLoggedOutView"),
  joinLoggedInView: document.querySelector("#joinLoggedInView"),
  joinGoogleButton: document.querySelector("#joinGoogleButton"),
  joinGithubButton: document.querySelector("#joinGithubButton"),
  joinEmailForm: document.querySelector("#joinEmailForm"),
  joinEmailInput: document.querySelector("#joinEmailInput"),
  joinPasswordInput: document.querySelector("#joinPasswordInput"),
  joinSignUpButton: document.querySelector("#joinSignUpButton"),
  acceptJoinButton: document.querySelector("#acceptJoinButton"),
  joinFullNotice: document.querySelector("#joinFullNotice"),
  joinDeclineButton: document.querySelector("#joinDeclineButton"),
  joinModalHint: document.querySelector("#joinModalHint"),

  // Notes & Particles
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
  renderThemeGalleries();
  setPalette(state.gender);
  setConnectionStatus(true);
  updateHapticsUi();
  updatePartnerBadge();
  window.setInterval(renderRelationshipDates, 60 * 1000);

  // Check if user is returning from OAuth redirect or has an existing stored session
  if (HAS_SAVED_AUTH || IS_OAUTH_RETURN) {
    document.documentElement.classList.add("is-authenticated");
    setActiveView("dashboard");
  } else {
    // Visitor is not logged in: show Sign In page first with tabs hidden
    document.documentElement.classList.remove("is-authenticated");
    setActiveView("signin");
  }

  await initSupabase();
  await checkUrlForInvite();
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
  state.photos = readJson(STORAGE_KEYS.photos, []);
  state.dailyPhotoDataUrl = localStorage.getItem(STORAGE_KEYS.photo) || "";
  if (state.dailyPhotoDataUrl && state.photos.length === 0) {
    state.photos.push({
      id: "saved-initial-photo",
      url: state.dailyPhotoDataUrl,
      caption: "Daily Photo",
      uploaderName: "You",
      createdAt: new Date().toISOString(),
    });
  }

  const savedUser = getSavedUserFromStorage();
  if (savedUser) {
    state.user = savedUser;
  }
}

function wireUiEvents() {
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.targetView));
  });

  // Profile Strip navigation pills (Directly switch tabs)
  els.openAuthModalButton?.addEventListener("click", () => setActiveView("signin"));
  els.openInviteModalButton?.addEventListener("click", () => setActiveView("settings"));
  els.openSettingsModalButton?.addEventListener("click", () => setActiveView("settings"));

  // Breathing Guide Events
  els.breathingStartBtn?.addEventListener("click", startBreathingSession);
  els.breathingResetBtn?.addEventListener("click", resetBreathingSession);

  // Sign In Tab & Theme Palette Events
  els.genderFemaleButton?.addEventListener("click", () => setPalette("female"));
  els.genderMaleButton?.addEventListener("click", () => setPalette("male"));

  // Wire all extended palette cards by data-palette-id attribute
  document.querySelectorAll("[data-palette-id]").forEach((btn) => {
    btn.addEventListener("click", () => setPalette(btn.dataset.paletteId));
  });

  // Auth Mode Switcher (Sign In vs Create Account)
  els.authFooterToggleBtn?.addEventListener("click", () => {
    setAuthMode(state.authMode === "signin" ? "signup" : "signin");
  });

  // Submit and Action Events
  els.googleAuthButton?.addEventListener("click", () => handleOAuthFlow("google", state.authMode === "signup"));
  els.githubAuthButton?.addEventListener("click", () => handleOAuthFlow("github", state.authMode === "signup"));
  els.emailAuthForm?.addEventListener("submit", handleEmailFormSubmit);

  els.authGoToMainButton?.addEventListener("click", () => setActiveView("dashboard"));
  els.authGoToSettingsButton?.addEventListener("click", () => setActiveView("settings"));
  els.authSignOutButton?.addEventListener("click", handleSignOut);

  // Settings Tab & Partner Invite Events
  els.copyInviteLinkButton?.addEventListener("click", copyInviteLink);
  els.shareInviteButton?.addEventListener("click", shareInvite);
  els.copyInviteCodeOnlyButton?.addEventListener("click", copyInviteCodeOnly);
  els.codeJoinForm?.addEventListener("submit", handleManualCodeJoin);
  els.hapticsToggle?.addEventListener("change", (e) => setHaptics(e.target.checked));
  els.testHapticsButton?.addEventListener("click", testHapticVibration);
  els.settingsThemeFemaleButton?.addEventListener("click", () => setGender("female"));
  els.settingsThemeMaleButton?.addEventListener("click", () => setGender("male"));
  els.settingsSignOutButton?.addEventListener("click", handleSignOut);

  // Join Modal
  els.joinModalCloseButtons.forEach((btn) => btn.addEventListener("click", closeJoinModal));
  els.joinGenderFemaleButton?.addEventListener("click", () => setJoinGender("female"));
  els.joinGenderMaleButton?.addEventListener("click", () => setJoinGender("male"));
  els.joinGoogleButton?.addEventListener("click", handleGoogleSignIn);
  els.joinGithubButton?.addEventListener("click", handleGithubSignIn);
  els.joinEmailForm?.addEventListener("submit", handleJoinEmailSignIn);
  els.joinSignUpButton?.addEventListener("click", handleJoinEmailSignUp);
  els.acceptJoinButton?.addEventListener("click", handleAcceptJoinCurrentSpace);
  els.joinDeclineButton?.addEventListener("click", closeJoinModal);

  // Hug button
  els.hugButton.addEventListener("click", async (event) => {
    await handleHugInteraction(event.currentTarget);
  });

  // Photos
  els.photoChooseButton.addEventListener("click", () => {
    if (state.pendingPhotos && state.pendingPhotos.length > 0) {
      sendPendingPhotos();
    } else {
      els.photoInput.click();
    }
  });
  els.photoDeleteButton.addEventListener("click", deleteDailyPhoto);
  els.photoInput.addEventListener("change", handlePhotoSelected);
  els.photoPreview?.addEventListener("click", () => {
    if (state.dailyPhotoDataUrl && (!state.pendingPhotos || state.pendingPhotos.length === 0)) {
      const cur = state.photos.find((p) => p.url === state.dailyPhotoDataUrl) || {
        url: state.dailyPhotoDataUrl,
        caption: "Daily Photo",
        uploaderName: "Shared Memory",
        createdAt: new Date().toISOString(),
      };
      openLightbox(cur.url, cur.caption, cur.uploaderName, cur.createdAt);
    }
  });

  // Calendar
  els.calendarOpenButton.addEventListener("click", () => openCalendarModal(new Date()));
  els.calendarModalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeCalendarModal);
  });
  els.calendarPrevButton.addEventListener("click", () => shiftSchedulerMonth(-1));
  els.calendarNextButton.addEventListener("click", () => shiftSchedulerMonth(1));
  els.planForm.addEventListener("submit", saveCurrentPlan);
  els.deletePlanButton.addEventListener("click", deleteCurrentPlan);

  // Notes
  els.newNoteButton.addEventListener("click", () => startNewNote());
  els.noteModalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeNoteModal);
  });
  els.noteForm.addEventListener("submit", saveCurrentNote);
  els.deleteNoteButton.addEventListener("click", deleteCurrentNote);
  els.notePhotoInput?.addEventListener("change", handleNotePhotoSelected);

  // Lightbox
  els.imageLightboxCloseButtons?.forEach((button) => {
    button.addEventListener("click", closeLightbox);
  });

  // Escape key for all modals
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (els.authModal?.classList.contains("is-open")) closeAuthModal();
      if (els.inviteModal?.classList.contains("is-open")) closeInviteModal();
      if (els.settingsModal?.classList.contains("is-open")) closeSettingsModal();
      if (els.joinModal?.classList.contains("is-open")) closeJoinModal();
      if (els.noteModal?.classList.contains("is-open")) closeNoteModal();
      if (els.calendarModal?.classList.contains("is-open")) closeCalendarModal();
      if (els.imageLightboxModal?.classList.contains("is-open")) closeLightbox();
    }
  });
}

// -------------------------------------------------------------
// Theme Palette Data & Management (Pure Evocative Aesthetic Themes)
// -------------------------------------------------------------

const PALETTE_THEMES = [
  {
    id: "soft-linen",
    name: "Soft Linen",
    subtitle: "Soft Linen & Cherry Blossom",
    bg: "#F5F1E6",
    primary: "#F9A8BB",
    primaryDeep: "#d9778c",
    primarySoft: "rgba(249, 168, 187, 0.22)",
    ink: "#2b141d",
    muted: "#6d4955",
    cardBg: "rgba(255, 255, 255, 0.86)",
    cardBorder: "rgba(249, 168, 187, 0.4)",
    buttonText: "#2b141d",
    glow: "rgba(249, 168, 187, 0.45)",
    dark: false,
  },
  {
    id: "espresso-peony",
    name: "Espresso Peony",
    subtitle: "Espresso & Peony",
    bg: "#3E2723",
    primary: "#F4C9D6",
    primaryDeep: "#d99eb0",
    primarySoft: "rgba(244, 201, 214, 0.2)",
    ink: "#fbeeef",
    muted: "#c5a7b0",
    cardBg: "rgba(45, 28, 25, 0.88)",
    cardBorder: "rgba(244, 201, 214, 0.25)",
    buttonText: "#3E2723",
    glow: "rgba(244, 201, 214, 0.35)",
    dark: true,
  },
  {
    id: "lavender-blush",
    name: "Lavender Blush",
    subtitle: "Lavender Blush & Blush",
    bg: "#FFE6ED",
    primary: "#CF7486",
    primaryDeep: "#9e4b5c",
    primarySoft: "rgba(207, 116, 134, 0.2)",
    ink: "#36151e",
    muted: "#704852",
    cardBg: "rgba(255, 255, 255, 0.86)",
    cardBorder: "rgba(207, 116, 134, 0.35)",
    buttonText: "#ffffff",
    glow: "rgba(207, 116, 134, 0.35)",
    dark: false,
  },
  {
    id: "cherry-twilight",
    name: "Cherry Twilight",
    subtitle: "Cherry Blossom & Deep Twilight",
    bg: "#F9A8BB",
    primary: "#1A1265",
    primaryDeep: "#100a45",
    primarySoft: "rgba(26, 18, 101, 0.18)",
    ink: "#1A1265",
    muted: "#433878",
    cardBg: "rgba(255, 255, 255, 0.86)",
    cardBorder: "rgba(26, 18, 101, 0.3)",
    buttonText: "#ffffff",
    glow: "rgba(26, 18, 101, 0.35)",
    dark: false,
  },
  {
    id: "rich-mahogany",
    name: "Rich Mahogany",
    subtitle: "Parchment & Rich Mahogany",
    bg: "#EEEDE9",
    primary: "#371B17",
    primaryDeep: "#200f0d",
    primarySoft: "rgba(55, 27, 23, 0.16)",
    ink: "#371B17",
    muted: "#664945",
    cardBg: "rgba(255, 255, 255, 0.88)",
    cardBorder: "rgba(55, 27, 23, 0.25)",
    buttonText: "#ffffff",
    glow: "rgba(55, 27, 23, 0.3)",
    dark: false,
  },
  {
    id: "thistle-mocha",
    name: "Thistle Mocha",
    subtitle: "Thistle & Deep Mocha",
    bg: "#D6C8DF",
    primary: "#332927",
    primaryDeep: "#1f1817",
    primarySoft: "rgba(51, 41, 39, 0.18)",
    ink: "#332927",
    muted: "#5e4e54",
    cardBg: "rgba(255, 255, 255, 0.86)",
    cardBorder: "rgba(51, 41, 39, 0.25)",
    buttonText: "#ffffff",
    glow: "rgba(51, 41, 39, 0.3)",
    dark: false,
  },
  {
    id: "morning-butter",
    name: "Morning Butter",
    subtitle: "Blue Grey & Morning Butter",
    bg: "#F3D98F",
    primary: "#446B9E",
    primaryDeep: "#2b4b73",
    primarySoft: "rgba(68, 107, 158, 0.2)",
    ink: "#1a2e47",
    muted: "#4f6075",
    cardBg: "rgba(255, 255, 255, 0.88)",
    cardBorder: "rgba(68, 107, 158, 0.3)",
    buttonText: "#ffffff",
    glow: "rgba(68, 107, 158, 0.35)",
    dark: false,
  },
  {
    id: "hunter-green",
    name: "Hunter Green",
    subtitle: "Hunter Green & Sand Dune",
    bg: "#3E5F44",
    primary: "#DDD6B9",
    primaryDeep: "#c5bd9b",
    primarySoft: "rgba(221, 214, 185, 0.2)",
    ink: "#f5f1de",
    muted: "#cbd4bd",
    cardBg: "rgba(38, 62, 42, 0.88)",
    cardBorder: "rgba(221, 214, 185, 0.25)",
    buttonText: "#253d29",
    glow: "rgba(221, 214, 185, 0.35)",
    dark: true,
  },
  {
    id: "berry-blush",
    name: "Berry Blush",
    subtitle: "Berry Blush & Petal Frost",
    bg: "#974472",
    primary: "#FEDDE8",
    primaryDeep: "#e8b9cb",
    primarySoft: "rgba(254, 221, 232, 0.22)",
    ink: "#fff2f7",
    muted: "#f5c9dc",
    cardBg: "rgba(110, 44, 82, 0.88)",
    cardBorder: "rgba(254, 221, 232, 0.28)",
    buttonText: "#5e1e42",
    glow: "rgba(254, 221, 232, 0.35)",
    dark: true,
  },
  {
    id: "blue-slate",
    name: "Nordic Slate",
    subtitle: "Icy Blue & Blue Slate",
    bg: "#B3D1ED",
    primary: "#516171",
    primaryDeep: "#374552",
    primarySoft: "rgba(81, 97, 113, 0.2)",
    ink: "#1c2b38",
    muted: "#4a5c6e",
    cardBg: "rgba(255, 255, 255, 0.86)",
    cardBorder: "rgba(81, 97, 113, 0.3)",
    buttonText: "#ffffff",
    glow: "rgba(81, 97, 113, 0.35)",
    dark: false,
  },
  {
    id: "shadow-grey",
    name: "Shadow Grey",
    subtitle: "Shadow Grey & Sandy Clay",
    bg: "#272727",
    primary: "#D4AA7D",
    primaryDeep: "#b58c5f",
    primarySoft: "rgba(212, 170, 125, 0.2)",
    ink: "#faede0",
    muted: "#c7b39d",
    cardBg: "rgba(45, 45, 45, 0.9)",
    cardBorder: "rgba(212, 170, 125, 0.25)",
    buttonText: "#272727",
    glow: "rgba(212, 170, 125, 0.35)",
    dark: true,
  },
  {
    id: "twilight-indigo",
    name: "Twilight Indigo",
    subtitle: "Powder Petal & Twilight",
    bg: "#F9DEC9",
    primary: "#3A405A",
    primaryDeep: "#24283b",
    primarySoft: "rgba(58, 64, 90, 0.2)",
    ink: "#252b40",
    muted: "#5f667d",
    cardBg: "rgba(255, 255, 255, 0.86)",
    cardBorder: "rgba(58, 64, 90, 0.28)",
    buttonText: "#ffffff",
    glow: "rgba(58, 64, 90, 0.35)",
    dark: false,
  },
  {
    id: "burgundy",
    name: "Antique Burgundy",
    subtitle: "Antique White & Burgundy",
    bg: "#F7E6D2",
    primary: "#90202C",
    primaryDeep: "#66121b",
    primarySoft: "rgba(144, 32, 44, 0.18)",
    ink: "#3d080e",
    muted: "#7a3841",
    cardBg: "rgba(255, 255, 255, 0.88)",
    cardBorder: "rgba(144, 32, 44, 0.3)",
    buttonText: "#ffffff",
    glow: "rgba(144, 32, 44, 0.35)",
    dark: false,
  },
  {
    id: "burnt-peach",
    name: "Burnt Peach",
    subtitle: "Eggshell & Burnt Peach",
    bg: "#F4F1DE",
    primary: "#E07A5F",
    primaryDeep: "#b5563c",
    primarySoft: "rgba(224, 122, 95, 0.22)",
    ink: "#381a13",
    muted: "#7d4f44",
    cardBg: "rgba(255, 255, 255, 0.86)",
    cardBorder: "rgba(224, 122, 95, 0.3)",
    buttonText: "#ffffff",
    glow: "rgba(224, 122, 95, 0.35)",
    dark: false,
  },
  {
    id: "rose-velvet",
    name: "Rose Velvet",
    subtitle: "Dark Wine & Soft Rose",
    bg: "#2e1e1f",
    primary: "#e30b5c",
    primaryDeep: "#910a3d",
    primarySoft: "rgba(227, 11, 92, 0.2)",
    ink: "#fbf7f4",
    muted: "#dfc4c9",
    cardBg: "rgba(255, 255, 255, 0.08)",
    cardBorder: "rgba(227, 11, 92, 0.28)",
    buttonText: "#ffffff",
    glow: "rgba(227, 11, 92, 0.35)",
    dark: true,
  },
  {
    id: "nordic-frost",
    name: "Nordic Frost",
    subtitle: "Charcoal & Ice Blue",
    bg: "#35393C",
    primary: "#A4D8FF",
    primaryDeep: "#68b0e8",
    primarySoft: "rgba(164, 216, 255, 0.2)",
    ink: "#eaf4fc",
    muted: "#b2c5d4",
    cardBg: "rgba(255, 255, 255, 0.08)",
    cardBorder: "rgba(164, 216, 255, 0.28)",
    buttonText: "#1c2e3d",
    glow: "rgba(164, 216, 255, 0.35)",
    dark: true,
  },
];

const THEME_ALIASES = {
  female: "rose-velvet",
  me: "rose-velvet",
  male: "nordic-frost",
  his: "nordic-frost",
  "icy-blue": "blue-slate",
  "powder-petal": "twilight-indigo",
  "blue-grey": "morning-butter",
  thistle: "thistle-mocha",
  parchment: "rich-mahogany",
  "cherry-blossom": "cherry-twilight",
  "deep-twilight": "cherry-twilight",
  espresso: "espresso-peony",
  peony: "espresso-peony",
  "soft-linen": "soft-linen",
  "cherry-blossom-linen": "soft-linen",
  "lavender-blush": "lavender-blush",
  blush: "lavender-blush",
  "hunter-green": "hunter-green",
  "sand-dune": "hunter-green",
  "berry-blush": "berry-blush",
  "petal-frost": "berry-blush",
  "shadow-grey": "shadow-grey",
  "sandy-clay": "shadow-grey",
  burgundy: "burgundy",
  "antique-white": "burgundy",
  "burnt-peach": "burnt-peach",
  eggshell: "burnt-peach",
};

function resolvePaletteId(id) {
  if (!id) return "rose-velvet";
  return THEME_ALIASES[id] || id;
}

const ALL_THEME_CLASSES = [
  "theme-female", "theme-me", "theme-male", "theme-his",
  "theme-rose-velvet", "theme-nordic-frost",
  "theme-burnt-peach", "theme-burgundy", "theme-blue-slate", "theme-icy-blue",
  "theme-twilight-indigo", "theme-powder-petal",
  "theme-berry-blush", "theme-shadow-grey", "theme-hunter-green",
  "theme-morning-butter", "theme-blue-grey",
  "theme-thistle-mocha", "theme-thistle",
  "theme-rich-mahogany", "theme-parchment",
  "theme-cherry-twilight", "theme-cherry-blossom",
  "theme-lavender-blush",
  "theme-espresso-peony", "theme-espresso",
  "theme-soft-linen",
];

function setPalette(rawPaletteId) {
  const paletteId = resolvePaletteId(rawPaletteId);
  const palette = PALETTE_THEMES.find((p) => p.id === paletteId) || PALETTE_THEMES[0];
  state.gender = palette.id;
  state.activeTheme = palette.id;
  localStorage.setItem(STORAGE_KEYS.gender, palette.id);
  localStorage.setItem(STORAGE_KEYS.theme, palette.id);

  // Update all theme cards and radio buttons across views
  document.querySelectorAll("[data-palette-id]").forEach((btn) => {
    const btnPaletteId = resolvePaletteId(btn.dataset.paletteId);
    const isActive = btnPaletteId === palette.id;
    btn.classList.toggle("is-selected", isActive);
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
    if (btn.hasAttribute("aria-checked")) {
      btn.setAttribute("aria-checked", String(isActive));
    }
  });

  applyPaletteToBody(palette);
  updateThemeBanner(palette);
  updateUserBadge();

  if (supabaseClient && state.user) {
    supabaseClient
      .from("profiles")
      .update({
        gender: palette.id,
        theme_color: palette.primary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", state.user.id)
      .then(({ error }) => {
        if (error) console.error("Error saving theme palette to backend:", error);
      });
  }
}

function setGender(gender) {
  setPalette(gender);
}

function setJoinGender(gender) {
  setPalette(gender);
}

function updateThemeBanner(palette) {
  if (els.authBannerText) {
    els.authBannerText.textContent = `${palette.name} Aesthetic`;
  }
  if (els.authBannerDot) {
    els.authBannerDot.style.background = palette.primary;
  }
}

function applyPaletteToBody(palette) {
  document.body.classList.remove(...ALL_THEME_CLASSES);

  // Apply primary and alias classes
  document.body.classList.add("theme-" + palette.id);
  if (palette.id === "rose-velvet") {
    document.body.classList.add("theme-female", "theme-me");
  } else if (palette.id === "nordic-frost") {
    document.body.classList.add("theme-male", "theme-his");
  } else if (palette.id === "blue-slate") {
    document.body.classList.add("theme-icy-blue");
  } else if (palette.id === "twilight-indigo") {
    document.body.classList.add("theme-powder-petal");
  } else if (palette.id === "morning-butter") {
    document.body.classList.add("theme-blue-grey");
  } else if (palette.id === "thistle-mocha") {
    document.body.classList.add("theme-thistle");
  } else if (palette.id === "rich-mahogany") {
    document.body.classList.add("theme-parchment");
  } else if (palette.id === "cherry-twilight") {
    document.body.classList.add("theme-cherry-blossom");
  } else if (palette.id === "espresso-peony") {
    document.body.classList.add("theme-espresso");
  }

  // Set CSS custom properties directly on root for 100% reliable instant theme synchronization
  const root = document.documentElement;
  root.setAttribute("data-theme", palette.id);
  root.style.setProperty("--color-bg", palette.bg);
  root.style.setProperty("--color-primary", palette.primary);
  root.style.setProperty("--color-primary-deep", palette.primaryDeep);
  root.style.setProperty("--color-primary-soft", palette.primarySoft);
  root.style.setProperty("--color-ink", palette.ink);
  root.style.setProperty("--color-muted", palette.muted);
  root.style.setProperty("--color-card", palette.cardBg);
  root.style.setProperty("--color-card-border", palette.cardBorder);
  root.style.setProperty("--color-button-text", palette.buttonText);
  root.style.setProperty("--interactive-glow", palette.glow);
  root.style.setProperty("--surface-soft", palette.primarySoft);
  root.style.setProperty("--hero-card-accent", palette.primarySoft);

  if (palette.dark) {
    root.style.setProperty(
      "--body-background",
      `radial-gradient(circle at 18% 8%, ${palette.primarySoft}, transparent 22rem), linear-gradient(160deg, ${palette.bg}, #121214)`
    );
    root.style.setProperty("--hero-card-bg", "rgba(0, 0, 0, 0.24)");
    root.style.setProperty("--bottom-bar-bg", "rgba(22, 22, 24, 0.92)");
  } else {
    root.style.setProperty(
      "--body-background",
      `radial-gradient(circle at 18% 8%, ${palette.primarySoft}, transparent 22rem), linear-gradient(160deg, ${palette.bg}, #fdfbf7)`
    );
    root.style.setProperty("--hero-card-bg", palette.cardBg);
    root.style.setProperty("--bottom-bar-bg", "rgba(255, 255, 255, 0.92)");
  }

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", palette.bg);
  }

  if (els.userThemeSwatch) {
    els.userThemeSwatch.style.background =
      "linear-gradient(135deg, " + palette.bg + " 0%, " + palette.primary + " 100%)";
    els.userThemeSwatch.className = "profile-swatch";
    els.userThemeSwatch.style.opacity = "1";
  }
}

function setTheme(theme) {
  setPalette(theme);
}

function renderThemeGalleries() {
  const currentId = resolvePaletteId(state.activeTheme || state.gender || "rose-velvet");

  // Render Settings Theme Gallery (Theme labels only, no pictures allowed)
  if (els.settingsThemeGallery) {
    els.settingsThemeGallery.innerHTML = PALETTE_THEMES.map((p) => {
      const isActive = p.id === currentId;
      return `<button class="settings-theme-card${isActive ? " is-active is-selected" : ""}" type="button" data-palette-id="${p.id}" role="radio" aria-checked="${isActive}">
        <strong class="settings-theme-name">${p.name}</strong>
        <span class="settings-theme-sub">${p.subtitle}</span>
      </button>`;
    }).join("");

    els.settingsThemeGallery.querySelectorAll(".settings-theme-card").forEach((card) => {
      card.addEventListener("click", () => {
        soundEngine?.playTone?.(520, 0.25);
        setPalette(card.dataset.paletteId);
      });
    });
  }
}

// -------------------------------------------------------------
// Web Audio Resiliency & Sound Engine
// -------------------------------------------------------------

class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    try {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      // Guarded against browser audio restrictions
    }
  }

  playTone(freq = 528, duration = 0.5) {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Null-safety guard
    }
  }
}

const soundEngine = new SoundEngine();

// -------------------------------------------------------------
// Synchronized 4-7-8 Breathing Relaxation Controller (19s Cycle)
// -------------------------------------------------------------

const breathingState = {
  isRunning: false,
  timerId: null,
  secondInCycle: 0,
  cycleCount: 0,
  phase: "idle", // "inhale" (4s), "hold" (7s), "exhale" (8s)
};

function startBreathingSession() {
  soundEngine.init();
  if (breathingState.isRunning) {
    pauseBreathingSession();
    return;
  }

  breathingState.isRunning = true;
  if (els.breathingStartBtn) els.breathingStartBtn.textContent = "Pause";
  if (els.breathingResetBtn) els.breathingResetBtn.disabled = false;
  if (els.breathingCircle) els.breathingCircle.classList.add("is-animating");

  tickBreathingCycle();
  breathingState.timerId = window.setInterval(tickBreathingCycle, 1000);
}

function pauseBreathingSession() {
  breathingState.isRunning = false;
  if (breathingState.timerId) {
    clearInterval(breathingState.timerId);
    breathingState.timerId = null;
  }
  if (els.breathingStartBtn) els.breathingStartBtn.textContent = "Resume";
  if (els.breathingCircle) els.breathingCircle.classList.remove("is-animating");
  if (els.breathingPhaseLabel) els.breathingPhaseLabel.textContent = "Session paused";
}

function resetBreathingSession() {
  breathingState.isRunning = false;
  if (breathingState.timerId) {
    clearInterval(breathingState.timerId);
    breathingState.timerId = null;
  }
  breathingState.secondInCycle = 0;
  breathingState.cycleCount = 0;
  breathingState.phase = "idle";

  if (els.breathingStartBtn) els.breathingStartBtn.textContent = "Start";
  if (els.breathingResetBtn) els.breathingResetBtn.disabled = true;
  if (els.breathingCircle) {
    els.breathingCircle.classList.remove("is-animating");
    els.breathingCircle.style.transform = "scale(1)";
  }
  if (els.breathingCircleLabel) els.breathingCircleLabel.textContent = "Ready";
  if (els.breathingCountdown) els.breathingCountdown.textContent = "--";
  if (els.breathingPhaseLabel) els.breathingPhaseLabel.textContent = "Click Start to begin session";
  if (els.breathingCycleCount) els.breathingCycleCount.textContent = "Cycle: 0";
}

function tickBreathingCycle() {
  // 19s total: 0..3 (4s Inhale), 4..10 (7s Hold), 11..18 (8s Exhale)
  const sec = breathingState.secondInCycle % 19;

  if (sec === 0) {
    breathingState.phase = "inhale";
    soundEngine.playTone(432, 0.4);
  } else if (sec === 4) {
    breathingState.phase = "hold";
    soundEngine.playTone(528, 0.4);
  } else if (sec === 11) {
    breathingState.phase = "exhale";
    soundEngine.playTone(396, 0.5);
  }

  let labelText = "";
  let countdown = 0;
  let phaseText = "";

  if (sec < 4) {
    labelText = "Inhale";
    countdown = 4 - sec;
    phaseText = "Inhale gently through nose (" + countdown + "s)";
  } else if (sec < 11) {
    labelText = "Hold";
    countdown = 11 - sec;
    phaseText = "Hold your breath calmly (" + countdown + "s)";
  } else {
    labelText = "Exhale";
    countdown = 19 - sec;
    phaseText = "Exhale slowly through mouth (" + countdown + "s)";
  }

  if (els.breathingCircleLabel) els.breathingCircleLabel.textContent = labelText;
  if (els.breathingCountdown) els.breathingCountdown.textContent = String(countdown);
  if (els.breathingPhaseLabel) els.breathingPhaseLabel.textContent = phaseText;

  breathingState.secondInCycle++;
  if (breathingState.secondInCycle % 19 === 0) {
    breathingState.cycleCount++;
    if (els.breathingCycleCount) {
      els.breathingCycleCount.textContent = "Completed Cycles: " + breathingState.cycleCount;
    }
  }
}

function updateUserBadge() {
  if (!els.authButtonLabel) return;

  const currentPaletteId = state.gender || "female";
  const palette = PALETTE_THEMES.find((p) => p.id === currentPaletteId) || PALETTE_THEMES[0];

  if (state.user) {
    const name = state.profile?.display_name || state.user.email?.split("@")[0] || "User";
    els.authButtonLabel.textContent = `${name}`;
    if (els.settingsSignOutButton) els.settingsSignOutButton.hidden = false;
  } else {
    els.authButtonLabel.textContent = "Sign In";
    if (els.settingsSignOutButton) els.settingsSignOutButton.hidden = true;
  }
  updateAuthTabUi();
}

function updatePartnerBadge() {
  if (!els.partnerStatusLabel) return;

  if (state.space && state.space.member_count >= 2) {
    const partner = state.space.members?.find((m) => !m.is_me);
    const partnerName = partner?.display_name || "Partner";
    state.partnerName = partnerName;
    els.partnerStatusLabel.textContent = `Partner: ${partnerName}`;
  } else if (state.user) {
    els.partnerStatusLabel.textContent = "Invite Partner (1/2)";
  } else {
    els.partnerStatusLabel.textContent = "Invite Partner (1/2)";
  }
  updateAuthTabUi();
}

function updateAuthTabUi() {
  const currentPaletteId = resolvePaletteId(state.gender || "rose-velvet");
  const palette = PALETTE_THEMES.find((p) => p.id === currentPaletteId) || PALETTE_THEMES[0];

  // Update all theme card selections across views
  document.querySelectorAll("[data-palette-id]").forEach((btn) => {
    const btnPaletteId = resolvePaletteId(btn.dataset.paletteId);
    const isActive = btnPaletteId === palette.id;
    btn.classList.toggle("is-selected", isActive);
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
    if (btn.hasAttribute("aria-checked")) {
      btn.setAttribute("aria-checked", String(isActive));
    }
  });

  updateThemeBanner(palette);

  const isAuthenticated = !!state.user || HAS_SAVED_AUTH || document.documentElement.classList.contains("is-authenticated");

  if (isAuthenticated) {
    if (els.signinTabButtonText) els.signinTabButtonText.textContent = "Profile";
    if (els.signinEyebrow) els.signinEyebrow.textContent = "Your Sanctuary Profile";
    if (els.signinTitle) els.signinTitle.textContent = "Your Profile";
    if (els.signinSubtitle) els.signinSubtitle.textContent = "Personal account details, connected partner space, and active session.";
    if (els.authPanelKicker) els.authPanelKicker.textContent = "Profile Overview";

    if (els.authLoggedOutSection) {
      els.authLoggedOutSection.hidden = true;
      els.authLoggedOutSection.style.display = "none";
    }
    if (els.authLoggedInSection) {
      els.authLoggedInSection.hidden = false;
      els.authLoggedInSection.style.display = "block";
    }

    const email = state.user?.email || (state.user?.user_metadata?.email) || "Active User";
    if (els.authProfileEmail) els.authProfileEmail.textContent = email;
    if (els.authProfileAvatar) {
      const initial = (email !== "Active User" ? email.charAt(0) : palette.name.charAt(0)).toUpperCase();
      els.authProfileAvatar.textContent = initial;
      els.authProfileAvatar.style.background = "linear-gradient(135deg, " + palette.bg + " 0%, " + palette.primary + " 100%)";
      els.authProfileAvatar.style.color = palette.dark ? "#fff" : "#1a1218";
    }
    if (els.authProfileThemeTag) {
      els.authProfileThemeTag.textContent = palette.name + " Active";
    }
    if (els.authProfilePartnerTag) {
      els.authProfilePartnerTag.textContent = state.space?.member_count >= 2
        ? `Connected with ${state.partnerName}`
        : "Partner: Waiting for invite (1/2)";
    }
    if (els.authProfileSpaceTag) {
      els.authProfileSpaceTag.textContent = state.space?.name
        ? state.space.name
        : (state.space?.code ? `Space Code: ${state.space.code}` : "Personal Shared Sanctuary");
    }
    if (els.authProfileHugsTag) {
      els.authProfileHugsTag.textContent = `${state.totalHugs || 0} hugs sent`;
    }
    if (els.authProfileProviderTag) {
      const provider = state.user?.app_metadata?.provider || (email.includes("@gmail.com") ? "Google Account" : "Supabase Cloud");
      els.authProfileProviderTag.textContent = provider.charAt(0).toUpperCase() + provider.slice(1);
    }

    if (els.settingsAccountSummary) {
      els.settingsAccountSummary.textContent = `Signed in as ${email} (Supabase Cloud connected)`;
    }
    if (els.settingsSignOutButton) els.settingsSignOutButton.hidden = false;
  } else {
    if (els.signinTabButtonText) els.signinTabButtonText.textContent = "Sign In";
    if (els.authLoggedOutSection) {
      els.authLoggedOutSection.hidden = false;
      els.authLoggedOutSection.style.display = "block";
    }
    if (els.authLoggedInSection) {
      els.authLoggedInSection.hidden = true;
      els.authLoggedInSection.style.display = "none";
    }
    if (els.settingsAccountSummary) {
      els.settingsAccountSummary.textContent = "Not signed in (Local preview mode)";
    }
    if (els.settingsSignOutButton) els.settingsSignOutButton.hidden = true;
    renderAuthSections();
  }
}

function setAuthMode(mode) {
  state.authMode = mode === "signup" ? "signup" : "signin";
  renderAuthSections();
}

function renderAuthSections() {
  if (state.user || document.documentElement.classList.contains("is-authenticated")) return;
  const isSignIn = state.authMode === "signin";

  if (els.signinEyebrow) els.signinEyebrow.textContent = "Private Shared Sanctuary";
  if (els.authPanelKicker) els.authPanelKicker.textContent = "Account Access";

  if (isSignIn) {
    if (els.signinTitle) els.signinTitle.textContent = "Sign In to Cozy Space";
    if (els.signinSubtitle) els.signinSubtitle.textContent = "Access your shared space for milestones, memories, and real-time notes.";
    if (els.authFormSectionTitle) els.authFormSectionTitle.textContent = "Sign In";
    if (els.authFormSectionSubtitle) els.authFormSectionSubtitle.textContent = "Access your private shared sanctuary.";
    if (els.emailSubmitButton) els.emailSubmitButton.textContent = "Sign In";
    if (els.oauthGoogleButtonLabel) els.oauthGoogleButtonLabel.textContent = "Sign In with Google";
    if (els.oauthGithubButtonLabel) els.oauthGithubButtonLabel.textContent = "Sign In with GitHub";
    if (els.authFooterPrompt) els.authFooterPrompt.textContent = "Don't have an account yet?";
    if (els.authFooterToggleBtn) els.authFooterToggleBtn.textContent = "Create Account";
  } else {
    if (els.signinTitle) els.signinTitle.textContent = "Create an Account";
    if (els.signinSubtitle) els.signinSubtitle.textContent = "Join your private shared sanctuary for two.";
    if (els.authFormSectionTitle) els.authFormSectionTitle.textContent = "Create Account";
    if (els.authFormSectionSubtitle) els.authFormSectionSubtitle.textContent = "Join your private shared sanctuary.";
    if (els.emailSubmitButton) els.emailSubmitButton.textContent = "Create Account";
    if (els.oauthGoogleButtonLabel) els.oauthGoogleButtonLabel.textContent = "Create Account with Google";
    if (els.oauthGithubButtonLabel) els.oauthGithubButtonLabel.textContent = "Create Account with GitHub";
    if (els.authFooterPrompt) els.authFooterPrompt.textContent = "Already have an account?";
    if (els.authFooterToggleBtn) els.authFooterToggleBtn.textContent = "Sign In";
  }
}

function getActorName() {
  if (state.profile?.display_name) {
    return state.profile.display_name;
  }
  if (state.user?.email) {
    return state.user.email.split("@")[0];
  }
  return state.gender === "male" ? "Partner" : "You";
}

// -------------------------------------------------------------
// Haptics & Vibration Management
// -------------------------------------------------------------

function setHaptics(enabled) {
  state.hapticsEnabled = Boolean(enabled);
  localStorage.setItem(STORAGE_KEYS.haptics, String(state.hapticsEnabled));
  updateHapticsUi();

  if (state.hapticsEnabled) {
    triggerHapticFeedback(els.heroCard, 40);
  }

  if (supabaseClient && state.user) {
    supabaseClient
      .from("profiles")
      .update({ haptics_enabled: state.hapticsEnabled, updated_at: new Date().toISOString() })
      .eq("id", state.user.id)
      .then(() => {});
  }
}

function updateHapticsUi() {
  if (els.hapticsToggle) {
    els.hapticsToggle.checked = Boolean(state.hapticsEnabled);
  }
}

function testHapticVibration() {
  if (!state.hapticsEnabled) {
    setHaptics(true);
  }
  triggerHapticFeedback(els.heroCard, [60, 50, 80]);
  addActivity("Haptic vibration tested.");
}

function triggerHapticFeedback(fallbackTarget, pattern = [40, 50, 80]) {
  if (!state.hapticsEnabled) return;

  // 1. Web standard Vibration API for mobile devices
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignored
    }
  }

  // 2. Capacitor native runtime
  if (isNativeCapacitorRuntime()) {
    getCapacitorHaptics().then((haptics) => {
      haptics?.Haptics?.impact?.({ style: haptics.ImpactStyle.Medium });
    }).catch(() => {});
  }

  // 3. Subtle visual feedback
  if (fallbackTarget) {
    emulateHapticFeedback(fallbackTarget);
  }
}

function emulateHapticFeedback(target) {
  if (!target) return;
  target.classList.remove("haptic-pulse");
  void target.offsetWidth;
  target.classList.add("haptic-pulse");
}

// -------------------------------------------------------------
// Modals & Navigation
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

function openInviteModal() {
  els.inviteModal?.classList.add("is-open");
  els.inviteModal?.setAttribute("aria-hidden", "false");
  updateInviteModalUi();
}

function closeInviteModal() {
  els.inviteModal?.classList.remove("is-open");
  els.inviteModal?.setAttribute("aria-hidden", "true");
}

function openSettingsModal() {
  els.settingsModal?.classList.add("is-open");
  els.settingsModal?.setAttribute("aria-hidden", "false");
  updateSettingsModalUi();
}

function closeSettingsModal() {
  els.settingsModal?.classList.remove("is-open");
  els.settingsModal?.setAttribute("aria-hidden", "true");
}

function openJoinModal() {
  els.joinModal?.classList.add("is-open");
  els.joinModal?.setAttribute("aria-hidden", "false");
}

function closeJoinModal() {
  els.joinModal?.classList.remove("is-open");
  els.joinModal?.setAttribute("aria-hidden", "true");
}

function showAuthStatus(message, statusClass) {
  if (!els.authStatusHint) return;
  els.authStatusHint.textContent = message;
  els.authStatusHint.className = `auth-status-hint ${statusClass || ""}`;
}

function showAuthError(message) {
  showAuthStatus(message, "is-error");
}

function showJoinStatus(message, statusClass) {
  if (!els.joinModalHint) return;
  els.joinModalHint.textContent = message;
  els.joinModalHint.className = `auth-status-hint ${statusClass || ""}`;
}

// -------------------------------------------------------------
// Auth Logic (Google, GitHub, Email)
// -------------------------------------------------------------

async function handleOAuthFlow(provider, isSignUp = false) {
  const client = await ensureSupabaseClient();
  if (!client) {
    showAuthError("Database connection is initializing. Please verify your internet or reload the page.");
    return;
  }

  const providerName = provider === "google" ? "Google" : "GitHub";
  const actionText = isSignUp ? "Creating account with" : "Signing in with";
  showAuthStatus(`${actionText} ${providerName}...`, "is-info");

  // Pre-check if provider is enabled in Supabase to avoid raw 400 JSON browser screen
  try {
    const precheck = await fetch(`${SUPABASE_URL}/auth/v1/authorize?provider=${provider}`, {
      method: "GET",
      headers: { apikey: SUPABASE_KEY },
    });

    if (precheck.status === 400) {
      const errJson = await precheck.json();
      if (errJson.msg && errJson.msg.includes("provider is not enabled")) {
        showAuthError(
          `${providerName} is not enabled in Supabase yet. Please use Email & Password below.`
        );
        if (els.oauthWarningNotice) {
          els.oauthWarningNotice.hidden = false;
          if (els.oauthWarningText) {
            els.oauthWarningText.innerHTML = `<strong>${providerName} OAuth is not enabled in your Supabase project yet.</strong><br>To enable it, open your Supabase Dashboard &gt; <em>Authentication &gt; Providers &gt; ${providerName}</em> and enter OAuth credentials. In the meantime, you can create or sign in with an <strong>Email &amp; Password</strong> below.`;
          }
        }
        els.authEmailInput?.focus();
        return;
      }
    }
  } catch (fetchErr) {
    // If CORS or network prevents pre-check, continue to standard oauth flow
  }

  const pendingInvite = sessionStorage.getItem("cozy-space-pending-join") || undefined;
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: window.location.origin,
      queryParams: provider === "google" ? { access_type: "offline", prompt: "consent" } : undefined,
      data: {
        gender: state.gender,
        invite_code: pendingInvite,
        flow_type: isSignUp ? "signup" : "signin",
      },
    },
  });

  if (error) {
    console.error("OAuth error:", error);
    showAuthError(error.message);
  }
}

async function handleGoogleSignIn() {
  await handleOAuthFlow("google", state.authMode === "signup");
}

async function handleGithubSignIn() {
  await handleOAuthFlow("github", state.authMode === "signup");
}

function handleEmailFormSubmit(event) {
  event?.preventDefault();
  if (state.authMode === "signup") {
    handleEmailSignUp(event);
  } else {
    handleEmailSignIn(event);
  }
}

async function handleEmailSignIn(event) {
  event?.preventDefault();
  const client = await ensureSupabaseClient();
  if (!client) {
    showAuthError("Database connection is initializing. Please verify your internet or reload the page.");
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

  showAuthStatus("Signed in successfully.", "is-success");
  handleUserAuthenticated(data.user);
}

async function handleEmailSignUp(event) {
  event?.preventDefault();
  const client = await ensureSupabaseClient();
  if (!client) {
    showAuthError("Database connection is initializing. Please verify your internet or reload the page.");
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
  const pendingInvite = sessionStorage.getItem("cozy-space-pending-join") || undefined;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        gender: state.gender,
        display_name: email.split("@")[0],
        invite_code: pendingInvite,
      },
    },
  });

  if (error) {
    showAuthError(error.message);
    return;
  }

  if (data?.session && data?.user) {
    showAuthStatus("Account created & signed in.", "is-success");
    handleUserAuthenticated(data.user);
  } else if (data?.user) {
    showAuthStatus("Account created & signed in.", "is-success");
    handleUserAuthenticated(data.user);
    // Background credential verification if needed
    supabaseClient.auth.signInWithPassword({ email, password }).catch(() => {});
  }
}

async function handleJoinEmailSignIn(event) {
  event?.preventDefault();
  const email = els.joinEmailInput?.value.trim();
  const password = els.joinPasswordInput?.value;

  if (!email || !password) {
    showJoinStatus("Please enter your email and password.", "is-error");
    return;
  }

  showJoinStatus("Signing in & connecting...", "is-info");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    showJoinStatus(error.message, "is-error");
    return;
  }

  handleUserAuthenticated(data.user);
  const pendingCode = sessionStorage.getItem("cozy-space-pending-join");
  if (pendingCode) {
    await handleJoinSpace(pendingCode);
  } else {
    closeJoinModal();
  }
}

async function handleJoinEmailSignUp() {
  const email = els.joinEmailInput?.value.trim();
  const password = els.joinPasswordInput?.value;

  if (!email || !password || password.length < 6) {
    showJoinStatus("Enter email and a password of at least 6 characters.", "is-error");
    return;
  }

  showJoinStatus("Creating account & connecting...", "is-info");
  const pendingInvite = sessionStorage.getItem("cozy-space-pending-join") || undefined;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        gender: state.gender,
        display_name: email.split("@")[0],
        invite_code: pendingInvite,
      },
    },
  });

  if (error) {
    showJoinStatus(error.message, "is-error");
    return;
  }

  if (data?.session) {
    handleUserAuthenticated(data.user);
    if (pendingInvite) {
      await handleJoinSpace(pendingInvite);
    } else {
      closeJoinModal();
    }
  } else {
    showJoinStatus("Account created! Check your email to confirm.", "is-success");
  }
}

async function handleAcceptJoinCurrentSpace() {
  const pendingCode = sessionStorage.getItem("cozy-space-pending-join");
  if (pendingCode) {
    await handleJoinSpace(pendingCode);
  }
}

async function handleSignOut() {
  document.documentElement.classList.remove("is-authenticated");
  if (supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
    } catch (e) {
      console.warn("Sign out error:", e);
    }
  }

  state.user = null;
  state.profile = null;
  state.space = null;
  state.partnerName = "Partner";
  if (els.signinTabButtonText) els.signinTabButtonText.textContent = "Sign In";
  setActiveView("signin");
  updateUserBadge();
  updatePartnerBadge();
  updateAuthTabUi();
  addActivity("Signed out.");
}

let isSyncingUser = false;

function handleUserAuthenticated(user) {
  if (!user) return;
  state.user = user;
  document.documentElement.classList.add("is-authenticated");

  // 1. Immediately switch to Main dashboard view
  setActiveView("dashboard");

  // 2. Remove OAuth tokens, refresh token, or code query params from URL
  if (
    window.location.hash.includes("access_token") ||
    window.location.hash.includes("refresh_token") ||
    window.location.search.includes("code=")
  ) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // 3. Update badges and account view
  updateUserBadge();
  updatePartnerBadge();
  updateAuthTabUi();

  // 4. Non-blocking cloud space sync in background (never blocks or delays UI)
  syncAuthUser(user).catch((err) => {
    console.error("Non-blocking syncAuthUser error:", err);
  });
}

async function syncAuthUser(user) {
  if (!user || !supabaseClient) return;
  if (isSyncingUser) return;
  isSyncingUser = true;

  try {
    state.user = user;

    // Process pending join if present
    const pendingCode = sessionStorage.getItem("cozy-space-pending-join");
    if (pendingCode) {
      const { data: joinRes } = await supabaseClient.rpc("join_space_by_invite", {
        p_invite_code: pendingCode,
      });
      sessionStorage.removeItem("cozy-space-pending-join");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    await fetchMySpace();
    if (els.bottomTabs) els.bottomTabs.hidden = false;
    updateUserBadge();
    updatePartnerBadge();
    updateAuthTabUi();
  } catch (err) {
    console.error("Background sync error:", err);
  } finally {
    isSyncingUser = false;
  }
}

// -------------------------------------------------------------
// Partner & Shared Space Management
// -------------------------------------------------------------

async function fetchMySpace() {
  if (!supabaseClient || !state.user) return;

  const { data, error } = await supabaseClient.rpc("get_or_create_my_space");
  if (error || !data) {
    console.error("Failed to load user space:", error);
    return;
  }

  state.space = data;
  if (data.space_id) {
    const isSpaceChanged = state.spaceId !== data.space_id;
    state.spaceId = data.space_id;
    localStorage.setItem(STORAGE_KEYS.spaceId, state.spaceId);

    if (isSpaceChanged) {
      subscribeToRealtime();
      await syncAllCloudData();
    }
  }

  if (data.profile) {
    state.profile = data.profile;
    if (data.profile.gender) setPalette(data.profile.gender);
    if (typeof data.profile.haptics_enabled === "boolean") {
      state.hapticsEnabled = data.profile.haptics_enabled;
      localStorage.setItem(STORAGE_KEYS.haptics, String(state.hapticsEnabled));
      updateHapticsUi();
    }
  }

  updatePartnerBadge();
  updateInviteModalUi();
  updateSettingsModalUi();
}

function updateInviteModalUi() {
  if (!els.inviteModal) return;

  const isFull = state.space?.is_full || (state.space?.member_count >= 2);
  const code = state.space?.invite_code || "COZYLOVE";
  const inviteUrl = `${window.location.origin}/?join=${code}`;

  if (els.inviteLinkInput) els.inviteLinkInput.value = inviteUrl;
  if (els.spaceBadge) els.spaceBadge.textContent = isFull ? "2 / 2 Partners (Locked)" : "1 / 2 Partners";
  if (els.spaceNameTag) els.spaceNameTag.textContent = state.space?.space_name || "Our Cozy Space";

  if (els.inviteLockedNotice) els.inviteLockedNotice.hidden = !isFull;
  if (els.copyInviteLinkButton) els.copyInviteLinkButton.disabled = isFull;
  if (els.shareInviteButton) els.shareInviteButton.disabled = isFull;

  if (els.copyInviteCodeOnlyButton) {
    els.copyInviteCodeOnlyButton.textContent = `Copy Code: ${code}`;
  }

  // Render members list
  if (els.spaceMembersList) {
    els.spaceMembersList.innerHTML = "";
    if (state.space?.members && state.space.members.length > 0) {
      state.space.members.forEach((m) => {
        const pill = document.createElement("span");
        pill.className = "space-member-pill";
        const icon = m.gender === "male" ? "Male" : "Female";
        pill.innerHTML = `<span class="gender-swatch" style="background:${m.theme_color || '#e30b5c'}; width:10px; height:10px; border-radius:50%; display:inline-block;"></span>${m.display_name} (${icon})${m.is_me ? " (You)" : ""}`;
        els.spaceMembersList.appendChild(pill);
      });
    } else {
      const pill = document.createElement("span");
      pill.className = "space-member-pill";
      pill.textContent = `You (${state.gender === "male" ? "Male" : "Female"})`;
      els.spaceMembersList.appendChild(pill);
    }

    if (!isFull) {
      const emptyPill = document.createElement("span");
      emptyPill.className = "space-member-pill space-member-pill--empty";
      emptyPill.innerHTML = "Waiting for partner to join...";
      els.spaceMembersList.appendChild(emptyPill);
    }
  }
}

function updateSettingsModalUi() {
  if (!els.settingsModal) return;

  if (els.settingsAccountSummary) {
    if (state.user) {
      const code = state.space?.invite_code || "Active";
      els.settingsAccountSummary.textContent = `${state.user.email} | Space Code: ${code}`;
    } else {
      els.settingsAccountSummary.textContent = "Not signed in (Local preview mode)";
    }
  }

  if (els.settingsManageInviteButton) {
    const isFull = state.space?.is_full || (state.space?.member_count >= 2);
    els.settingsManageInviteButton.textContent = isFull ? "Paired & Connected (2/2)" : "Invite Partner (1/2)";
  }

  updateHapticsUi();
}

async function copyInviteLink() {
  const link = els.inviteLinkInput?.value;
  if (!link) return;

  try {
    await navigator.clipboard.writeText(link);
    triggerHapticFeedback(els.heroCard, 30);
    const origText = els.copyInviteLinkButton.textContent;
    els.copyInviteLinkButton.textContent = "Copied";
    setTimeout(() => {
      els.copyInviteLinkButton.textContent = origText;
    }, 2000);
  } catch (err) {
    els.inviteLinkInput?.select();
    document.execCommand("copy");
    els.copyInviteLinkButton.textContent = "Copied";
  }
}

async function shareInvite() {
  const link = els.inviteLinkInput?.value;
  if (!link) return;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Cozy Space - Private Space for Two",
        text: "Join our private Cozy Space: ",
        url: link,
      });
      triggerHapticFeedback(els.heroCard, 30);
    } catch (e) {
      // User cancelled
    }
  } else {
    await copyInviteLink();
  }
}

async function copyInviteCodeOnly() {
  const code = state.space?.invite_code;
  if (!code) return;

  try {
    await navigator.clipboard.writeText(code);
    triggerHapticFeedback(els.heroCard, 30);
    const orig = els.copyInviteCodeOnlyButton.textContent;
    els.copyInviteCodeOnlyButton.textContent = "Code Copied";
    setTimeout(() => {
      els.copyInviteCodeOnlyButton.textContent = orig;
    }, 2000);
  } catch (err) {
    // Fallback
  }
}

async function handleManualCodeJoin(event) {
  event?.preventDefault();
  const code = els.manualInviteCodeInput?.value.trim().toUpperCase();
  if (!code) return;

  await handleJoinSpace(code);
}

async function handleJoinSpace(inviteCode) {
  if (!supabaseClient) return;

  if (!state.user) {
    sessionStorage.setItem("cozy-space-pending-join", inviteCode);
    setActiveView("signin");
    showAuthStatus("Sign in with Google, GitHub, or Email to join your partner's space.", "is-info");
    return;
  }

  showJoinStatus("Connecting to partner space...", "is-info");

  const { data, error } = await supabaseClient.rpc("join_space_by_invite", {
    p_invite_code: inviteCode.trim().toUpperCase(),
  });

  if (error || !data?.success) {
    const msg = data?.error || error?.message || "Failed to join space.";
    showJoinStatus(msg, "is-error");
    if (els.inviteModalHint) {
      els.inviteModalHint.textContent = msg;
      els.inviteModalHint.className = "auth-status-hint is-error";
    }
    return;
  }

  state.spaceId = data.space_id;
  localStorage.setItem(STORAGE_KEYS.spaceId, state.spaceId);
  sessionStorage.removeItem("cozy-space-pending-join");
  window.history.replaceState({}, document.title, window.location.pathname);

  await fetchMySpace();
  subscribeToRealtime();
  await syncAllCloudData();

  triggerHapticFeedback(els.heroCard, [50, 60, 90]);
  closeJoinModal();
  closeInviteModal();
  addActivity("Connected to partner space.");
}

async function checkUrlForInvite() {
  const params = new URLSearchParams(window.location.search);
  const joinCode = params.get("join") || params.get("invite");
  if (!joinCode) return;

  const cleanCode = joinCode.trim().toUpperCase();
  sessionStorage.setItem("cozy-space-pending-join", cleanCode);

  if (els.manualInviteCodeInput) {
    els.manualInviteCodeInput.value = cleanCode;
  }

  if (!state.user && !IS_OAUTH_RETURN && !HAS_SAVED_AUTH) {
    setActiveView("signin");
    showAuthStatus(`Partner invite detected (${cleanCode}). Sign in or create an account to connect!`, "is-info");
  } else if (state.user) {
    setActiveView("settings");
  }

  if (!supabaseClient) return;

  const { data } = await supabaseClient.rpc("get_space_preview", {
    p_invite_code: cleanCode,
  });

  if (!data || !data.valid) {
    if (els.inviteModalHint) {
      els.inviteModalHint.textContent = data?.error || "This invite code was not found.";
      els.inviteModalHint.className = "auth-status-hint is-error";
    }
    return;
  }

  if (data.is_full) {
    if (els.inviteModalHint) {
      els.inviteModalHint.textContent = "This Cozy Space is already full (2/2 members).";
      els.inviteModalHint.className = "auth-status-hint is-error";
    }
  } else {
    if (els.inviteModalHint) {
      els.inviteModalHint.textContent = `Invite from ${data.host_name || "partner"} found! Click 'Join Space' to connect.`;
      els.inviteModalHint.className = "auth-status-hint is-success";
    }
  }
}

// -------------------------------------------------------------
// Supabase Cloud & Realtime Integration
// -------------------------------------------------------------

async function initSupabase() {
  const client = await ensureSupabaseClient();
  if (!client) {
    console.warn("Supabase SDK not loaded yet, will retry in 2 seconds...");
    setConnectionStatus(false);
    setTimeout(initSupabase, 2000);
    return;
  }

  try {
    // 1. Listen for auth changes first (captures SIGNED_IN event from OAuth hash)
    client.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth State]", event, session?.user?.email);

      if (session?.user) {
        handleUserAuthenticated(session.user);
      } else if (event === "SIGNED_OUT") {
        handleSignOut();
      }
    });

    // 2. Check existing auth session (for page refresh with active session)
    const { data: sessionData } = await client.auth.getSession();
    if (sessionData?.session?.user) {
      handleUserAuthenticated(sessionData.session.user);
    } else if (!IS_OAUTH_RETURN && !HAS_SAVED_AUTH && !state.user && !document.documentElement.classList.contains("is-authenticated")) {
      setActiveView("signin");
    }

    // 3. Initial load from cloud
    await syncAllCloudData();

    // 4. Setup live WebSockets subscriptions
    subscribeToRealtime();
    setConnectionStatus(true);
  } catch (err) {
    console.error("Supabase initialization error:", err);
    setConnectionStatus(false);
  }
}

function setConnectionStatus(isLive) {
  state.isLive = isLive;
  if (!els.connectionStatus) return;
  if (isLive) {
    els.connectionStatus.textContent = "Live connected";
    els.connectionStatus.classList.add("is-connected", "is-live");
    els.connectionStatus.classList.remove("is-offline");
  } else {
    els.connectionStatus.textContent = "Connected";
    els.connectionStatus.classList.add("is-connected");
    els.connectionStatus.classList.remove("is-live", "is-offline");
  }
}

async function syncAllCloudData() {
  await Promise.allSettled([
    syncHugsFromSupabase(),
    syncNotesFromSupabase(),
    syncPlansFromSupabase(),
    syncPhotosFromSupabase(),
    syncActivityFromSupabase(),
  ]);
}

async function syncHugsFromSupabase() {
  if (!supabaseClient || !state.spaceId) return;

  const { count, error } = await supabaseClient
    .from("hugs")
    .select("*", { count: "exact", head: true })
    .eq("space_id", state.spaceId);

  if (!error && count !== null) {
    state.totalHugs = count;
  }

  const { data: latestHug } = await supabaseClient
    .from("hugs")
    .select("sender_name, created_at")
    .eq("space_id", state.spaceId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (latestHug && latestHug.length > 0) {
    state.lastActionBy = latestHug[0].sender_name || "Partner";
  }

  renderStats();
}

async function syncNotesFromSupabase() {
  if (!supabaseClient || !state.spaceId) return;

  const { data: notes, error } = await supabaseClient
    .from("love_notes")
    .select("*")
    .eq("space_id", state.spaceId)
    .order("created_at", { ascending: false });

  if (!error && notes && notes.length > 0) {
    state.notes = notes.map((n) => ({
      id: String(n.id),
      title: n.title,
      body: n.body,
      savedAt: n.created_at,
      author: n.author_name || "Mine",
      photos: Array.isArray(n.photos) ? n.photos : [],
    }));
    persistNotes();
    renderNotes();
  }
}

async function syncPlansFromSupabase() {
  if (!supabaseClient || !state.spaceId) return;

  const { data: plans, error } = await supabaseClient
    .from("calendar_events")
    .select("*")
    .eq("space_id", state.spaceId);

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
  if (!supabaseClient || !state.spaceId) return;

  const { data: photos, error } = await supabaseClient
    .from("photos")
    .select("id, storage_path, caption, uploader_name, created_at, uploader_id")
    .eq("space_id", state.spaceId)
    .order("created_at", { ascending: false });

  if (!error && photos && photos.length > 0) {
    state.photos = photos.map((p) => ({
      id: String(p.id),
      url: p.storage_path,
      caption: p.caption || "Shared Memory",
      uploaderName: p.uploader_name || "Partner",
      uploaderId: p.uploader_id,
      createdAt: p.created_at,
    }));
    state.dailyPhotoDataUrl = state.photos[0].url;
    localStorage.setItem(STORAGE_KEYS.photos, JSON.stringify(state.photos));
    localStorage.setItem(STORAGE_KEYS.photo, state.dailyPhotoDataUrl);
    renderDailyPhoto();
  }
}

async function syncActivityFromSupabase() {
  if (!supabaseClient || !state.spaceId) return;

  const { data: logs, error } = await supabaseClient
    .from("activity_logs")
    .select("actor_name, details, created_at")
    .eq("space_id", state.spaceId)
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
  if (!supabaseClient || !state.spaceId) return;

  if (state.realtimeChannel) {
    supabaseClient.removeChannel(state.realtimeChannel);
    state.realtimeChannel = null;
  }

  const channel = supabaseClient
    .channel(`cozy-space-${state.spaceId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "hugs", filter: `space_id=eq.${state.spaceId}` },
      (payload) => {
        const sender = payload.new.sender_name || "Partner";
        state.totalHugs += 1;
        state.lastActionBy = sender;
        renderStats();

        // Trigger pulse + haptic vibration for partner
        if (sender !== getActorName()) {
          triggerHapticFeedback(els.heroCard, [40, 50, 80]);
          createHeartParticles(els.heroCard);
          addActivity(`${sender} sent a warm hug`);
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "love_notes", filter: `space_id=eq.${state.spaceId}` },
      async () => {
        await syncNotesFromSupabase();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "calendar_events", filter: `space_id=eq.${state.spaceId}` },
      async () => {
        await syncPlansFromSupabase();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "photos", filter: `space_id=eq.${state.spaceId}` },
      async () => {
        await syncPhotosFromSupabase();
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "activity_logs", filter: `space_id=eq.${state.spaceId}` },
      (payload) => {
        const log = payload.new;
        if (log.actor_name !== getActorName()) {
          addActivity(`${log.actor_name}: ${log.details}`);
        }
        if (log.action_type === "partner_connected") {
          fetchMySpace();
        }
      }
    )
    .subscribe();

  state.realtimeChannel = channel;
}

// -------------------------------------------------------------
// UI Navigation
// -------------------------------------------------------------

function setActiveView(viewName) {
  state.activeView = viewName;

  // Toggle view state classes on documentElement for precise CSS styling
  document.documentElement.classList.toggle("view-signin-active", viewName === "signin");
  document.documentElement.classList.toggle("view-settings-active", viewName === "settings");
  document.documentElement.classList.toggle("view-dashboard-active", viewName === "dashboard");

  const views = [
    { el: document.getElementById("signinView"), name: "signin" },
    { el: document.getElementById("dashboardView"), name: "dashboard" },
    { el: document.getElementById("settingsView"), name: "settings" },
  ];

  views.forEach(({ el, name }) => {
    if (!el) return;
    const match = name === viewName;
    el.classList.toggle("is-active", match);
    el.style.display = match ? "grid" : "none";
  });

  els.tabButtons?.forEach((button) => {
    const isActive = button.dataset.targetView === viewName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  const bottomTabs = document.querySelector("#bottomTabs");
  if (bottomTabs) {
    const showTabs = !!state.user || document.documentElement.classList.contains("is-authenticated");
    bottomTabs.hidden = !showTabs;
    if (showTabs) {
      bottomTabs.removeAttribute("hidden");
      bottomTabs.style.display = "grid";
    } else {
      bottomTabs.setAttribute("hidden", "");
      bottomTabs.style.display = "none";
    }
  }

  if (viewName === "signin") {
    updateAuthTabUi();
  } else if (viewName === "settings") {
    renderThemeGalleries();
    updateInviteModalUi();
    updateSettingsModalUi();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// -------------------------------------------------------------
// Virtual Hugs
// -------------------------------------------------------------

async function handleHugInteraction(sourceElement) {
  triggerHapticFeedback(els.heroCard, [40, 50, 80]);
  createHeartParticles(sourceElement || getActiveContainer());

  const actor = getActorName();
  state.totalHugs += 1;
  state.lastActionBy = actor;
  renderStats();
  addActivity("You sent a warm hug");

  if (supabaseClient && state.spaceId) {
    try {
      await supabaseClient.from("hugs").insert({
        space_id: state.spaceId,
        sender_id: state.user?.id || null,
        sender_name: actor,
      });

      await supabaseClient.from("activity_logs").insert({
        space_id: state.spaceId,
        actor_id: state.user?.id || null,
        actor_name: actor,
        action_type: "hug_sent",
        details: "Sent a warm hug",
      });
    } catch (e) {
      console.error("Failed to persist hug to cloud:", e);
    }
  }
}

function isNativeCapacitorRuntime() {
  const capacitor = window.Capacitor;
  if (!capacitor) return false;
  if (typeof capacitor.isNativePlatform === "function") {
    return capacitor.isNativePlatform();
  }
  return Boolean(capacitor.platform && capacitor.platform !== "web");
}

async function getCapacitorHaptics() {
  if (window.Capacitor?.Plugins?.Haptics) {
    return {
      Haptics: window.Capacitor.Plugins.Haptics,
      ImpactStyle: {
        Heavy: "HEAVY",
        Medium: "MEDIUM",
        Light: "LIGHT",
      },
    };
  }

  if (window.CapacitorCustomHaptics) {
    return window.CapacitorCustomHaptics;
  }

  return null;
}

function renderStats() {
  els.hugCount.textContent = new Intl.NumberFormat().format(state.totalHugs);
  els.lastAction.textContent = `Last action by ${state.lastActionBy || "someone cozy"}.`;
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

async function handlePhotoSelected(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  state.pendingPhotos = [];
  for (const file of files) {
    try {
      const previewUrl = await readFileAsDataUrl(file);
      state.pendingPhotos.push({ file, previewUrl });
    } catch (e) {
      console.error("Error reading photo file:", e);
    }
  }

  if (state.pendingPhotos.length === 0) return;

  const count = state.pendingPhotos.length;
  els.photoChooseButton.textContent = count > 1 ? `Send (${count})` : "Send";
  els.photoChooseButton.classList.add("is-send-ready");

  // Show preview of the first pending photo
  els.photoPreview.src = state.pendingPhotos[0].previewUrl;
  els.photoPreview.hidden = false;
  els.photoEmpty.hidden = true;
  els.photoDeleteButton.hidden = false;
  els.photoStatus.textContent = `${count} photo${count > 1 ? "s" : ""} selected. Click Send to share.`;
}

async function sendPendingPhotos() {
  if (!state.pendingPhotos || state.pendingPhotos.length === 0) return;

  const count = state.pendingPhotos.length;
  els.photoChooseButton.disabled = true;
  els.photoStatus.textContent = `Sending ${count} photo${count > 1 ? "s" : ""}...`;

  const actor = getActorName();
  const uploadedPhotos = [];

  for (const item of state.pendingPhotos) {
    let finalUrl = item.previewUrl;

    if (supabaseClient && state.spaceId && item.file) {
      try {
        const cleanName = item.file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${state.spaceId}/${Date.now()}-${cleanName}`;

        const { error: uploadError } = await supabaseClient.storage
          .from("photos")
          .upload(filePath, item.file, { upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabaseClient.storage
            .from("photos")
            .getPublicUrl(filePath);

          finalUrl = publicUrlData.publicUrl;

          await supabaseClient.from("photos").insert({
            space_id: state.spaceId,
            uploader_id: state.user?.id || null,
            storage_path: finalUrl,
            caption: item.file.name,
            uploader_name: actor,
          });
        } else {
          console.error("Storage upload error:", uploadError);
        }
      } catch (err) {
        console.error("Photo upload error:", err);
      }
    }

    uploadedPhotos.push({
      id: createId(),
      url: finalUrl,
      caption: item.file?.name || "Shared Memory",
      uploaderName: actor,
      uploaderId: state.user?.id || null,
      createdAt: new Date().toISOString(),
    });
  }

  // Prepend into state.photos
  state.photos = [...uploadedPhotos, ...state.photos];
  state.dailyPhotoDataUrl = state.photos[0].url;
  state.pendingPhotos = [];

  localStorage.setItem(STORAGE_KEYS.photos, JSON.stringify(state.photos));
  localStorage.setItem(STORAGE_KEYS.photo, state.dailyPhotoDataUrl);

  els.photoInput.value = "";
  els.photoChooseButton.disabled = false;
  els.photoChooseButton.textContent = "Choose";
  els.photoChooseButton.classList.remove("is-send-ready");

  if (supabaseClient && state.spaceId) {
    try {
      await supabaseClient.from("activity_logs").insert({
        space_id: state.spaceId,
        actor_id: state.user?.id || null,
        actor_name: actor,
        action_type: "photo_shared",
        details: `Shared ${count} memory photo${count > 1 ? "s" : ""}`,
      });
    } catch (e) {}
  }

  addActivity(`Shared ${count} new memory photo${count > 1 ? "s" : ""}.`);
  els.photoStatus.textContent = "Photos shared and synchronized!";
  renderDailyPhoto();
}

function renderDailyPhoto() {
  if (state.pendingPhotos && state.pendingPhotos.length > 0) {
    els.photoPreview.src = state.pendingPhotos[0].previewUrl;
    els.photoPreview.hidden = false;
    els.photoEmpty.hidden = true;
    els.photoDeleteButton.hidden = false;
    const count = state.pendingPhotos.length;
    els.photoChooseButton.textContent = count > 1 ? `Send (${count})` : "Send";
    els.photoChooseButton.classList.add("is-send-ready");
  } else if (state.dailyPhotoDataUrl) {
    els.photoPreview.src = state.dailyPhotoDataUrl;
    els.photoPreview.hidden = false;
    els.photoEmpty.hidden = true;
    els.photoDeleteButton.hidden = false;
    els.photoChooseButton.textContent = "Choose";
    els.photoChooseButton.classList.remove("is-send-ready");
  } else {
    els.photoPreview.removeAttribute("src");
    els.photoPreview.hidden = true;
    els.photoEmpty.hidden = false;
    els.photoDeleteButton.hidden = true;
    els.photoChooseButton.textContent = "Choose";
    els.photoChooseButton.classList.remove("is-send-ready");
  }

  // Render gallery strip of all past and newly sent photos
  if (els.photoGalleryStrip) {
    els.photoGalleryStrip.innerHTML = "";
    if (state.photos && state.photos.length > 0) {
      state.photos.forEach((photo) => {
        const card = document.createElement("div");
        card.className = "photo-gallery-card";
        if (photo.url === state.dailyPhotoDataUrl) {
          card.classList.add("is-active");
        }

        const img = document.createElement("img");
        img.src = photo.url;
        img.alt = photo.caption || "Shared memory";
        img.loading = "lazy";

        const pill = document.createElement("span");
        pill.className = "photo-sender-pill";
        const isMine = (state.user?.id && photo.uploaderId === state.user.id) || (photo.uploaderName === getActorName());
        pill.textContent = isMine ? "You" : (photo.uploaderName || "Partner");

        card.appendChild(img);
        card.appendChild(pill);

        card.addEventListener("click", () => {
          state.dailyPhotoDataUrl = photo.url;
          localStorage.setItem(STORAGE_KEYS.photo, photo.url);
          renderDailyPhoto();
          openLightbox(photo.url, photo.caption, photo.uploaderName, photo.createdAt);
        });

        els.photoGalleryStrip.appendChild(card);
      });
      els.photoGalleryStrip.hidden = false;
    } else {
      els.photoGalleryStrip.hidden = true;
    }
  }
}

async function deleteDailyPhoto() {
  // If there are pending photos, clicking delete cancels the selection
  if (state.pendingPhotos && state.pendingPhotos.length > 0) {
    state.pendingPhotos = [];
    els.photoInput.value = "";
    els.photoChooseButton.textContent = "Choose";
    els.photoChooseButton.classList.remove("is-send-ready");
    els.photoStatus.textContent = "Photo selection cancelled.";
    renderDailyPhoto();
    return;
  }

  const currentUrl = state.dailyPhotoDataUrl;
  if (!currentUrl) return;

  const targetPhoto = state.photos.find((p) => p.url === currentUrl);
  state.photos = state.photos.filter((p) => p.url !== currentUrl);
  state.dailyPhotoDataUrl = state.photos.length > 0 ? state.photos[0].url : "";

  localStorage.setItem(STORAGE_KEYS.photos, JSON.stringify(state.photos));
  if (state.dailyPhotoDataUrl) {
    localStorage.setItem(STORAGE_KEYS.photo, state.dailyPhotoDataUrl);
  } else {
    localStorage.removeItem(STORAGE_KEYS.photo);
  }

  els.photoInput.value = "";
  renderDailyPhoto();
  els.photoStatus.textContent = "Photo removed.";
  addActivity("Memory photo cleared.");

  if (supabaseClient && state.spaceId && targetPhoto) {
    try {
      await supabaseClient
        .from("photos")
        .delete()
        .eq("space_id", state.spaceId)
        .eq("storage_path", currentUrl);
    } catch (err) {
      console.error("Error deleting photo from cloud:", err);
    }
  }
}

// -------------------------------------------------------------
// Photo Lightbox
// -------------------------------------------------------------

function openLightbox(url, caption, author, time) {
  if (!els.imageLightboxModal) return;
  if (els.imageLightboxImg) {
    els.imageLightboxImg.src = url;
  }
  if (els.imageLightboxAuthor) {
    els.imageLightboxAuthor.textContent = author ? `By ${author}` : "Shared Memory";
  }
  if (els.imageLightboxTime) {
    const d = time ? new Date(time) : new Date();
    els.imageLightboxTime.textContent = isNaN(d.getTime()) ? "" : formatPreciseDateTime(d);
  }
  if (els.imageLightboxDownload) {
    els.imageLightboxDownload.href = url;
    els.imageLightboxDownload.setAttribute("download", `cozy-memory-${Date.now()}.jpg`);
  }
  els.imageLightboxModal.classList.add("is-open");
  els.imageLightboxModal.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  if (!els.imageLightboxModal) return;
  els.imageLightboxModal.classList.remove("is-open");
  els.imageLightboxModal.setAttribute("aria-hidden", "true");
}

// -------------------------------------------------------------
// Love Notes
// -------------------------------------------------------------

function startNewNote() {
  clearNoteForm();
  openNoteModal();
}

async function handleNotePhotoSelected(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  for (const file of files) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      state.editingNotePhotos.push({
        id: createId(),
        file,
        url: dataUrl,
        name: file.name,
      });
    } catch (e) {
      console.error("Error reading note photo:", e);
    }
  }

  els.notePhotoInput.value = "";
  renderNotePhotosPreview();
}

function renderNotePhotosPreview() {
  if (!els.notePhotosPreviewStrip) return;
  els.notePhotosPreviewStrip.innerHTML = "";
  const count = state.editingNotePhotos.length;
  if (els.notePhotoCount) {
    els.notePhotoCount.textContent = count > 0 ? `${count} photo${count > 1 ? "s" : ""} attached` : "";
  }

  state.editingNotePhotos.forEach((item, index) => {
    const chip = document.createElement("div");
    chip.className = "note-preview-chip";

    const img = document.createElement("img");
    img.src = item.url;
    img.alt = item.name || "Attached photo";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "note-chip-remove";
    removeBtn.innerHTML = "&times;";
    removeBtn.title = "Remove photo";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.editingNotePhotos.splice(index, 1);
      renderNotePhotosPreview();
    });

    chip.appendChild(img);
    chip.appendChild(removeBtn);
    els.notePhotosPreviewStrip.appendChild(chip);
  });
}

async function saveCurrentNote(event) {
  event.preventDefault();

  const title = els.noteTitleInput.value.trim();
  const body = els.noteBodyInput.value.trim();
  if (!title || !body) return;

  const savedAt = new Date().toISOString();
  const actor = getActorName();

  // Process attached photos
  const notePhotos = [];
  for (const item of state.editingNotePhotos) {
    let photoUrl = item.url;
    if (supabaseClient && state.spaceId && item.file) {
      try {
        const cleanName = item.file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${state.spaceId}/notes/${Date.now()}-${cleanName}`;
        const { error: uploadErr } = await supabaseClient.storage
          .from("photos")
          .upload(filePath, item.file, { upsert: true });

        if (!uploadErr) {
          const { data: publicUrlData } = supabaseClient.storage
            .from("photos")
            .getPublicUrl(filePath);
          photoUrl = publicUrlData.publicUrl;
        }
      } catch (err) {
        console.error("Error uploading note photo:", err);
      }
    }
    notePhotos.push({
      url: photoUrl,
      name: item.name || "Photo",
    });
  }

  if (state.editingNoteId) {
    state.notes = state.notes.map((note) => {
      if (note.id !== state.editingNoteId) return note;
      return { ...note, title, body, savedAt, author: actor, photos: notePhotos };
    });
    addActivity("Love note updated.");

    if (supabaseClient && !state.editingNoteId.startsWith("local-")) {
      await supabaseClient
        .from("love_notes")
        .update({ title, body, author_name: actor, photos: notePhotos })
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
      photos: notePhotos,
    });
    addActivity("New love note saved.");

    if (supabaseClient && state.spaceId) {
      const { data } = await supabaseClient
        .from("love_notes")
        .insert({
          space_id: state.spaceId,
          author_id: state.user?.id || null,
          title,
          body,
          author_name: actor,
          photos: notePhotos,
        })
        .select()
        .single();

      if (data) {
        state.editingNoteId = String(data.id);
      }

      await supabaseClient.from("activity_logs").insert({
        space_id: state.spaceId,
        actor_id: state.user?.id || null,
        actor_name: actor,
        action_type: "note_added",
        details: `Left a note: "${title}"`,
      });
    }
  }

  triggerHapticFeedback(els.heroCard, 30);
  persistNotes();
  renderNotes();
  els.deleteNoteButton.disabled = false;
  clearNoteForm();
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

  state.editingNotePhotos = (note.photos || []).map((p) => {
    if (typeof p === "string") return { url: p, name: "Photo" };
    return { url: p.url, name: p.name || "Photo" };
  });
  renderNotePhotosPreview();

  openNoteModal();
}

async function deleteCurrentNote() {
  if (!state.editingNoteId) return;

  const noteToDelete = state.editingNoteId;
  state.notes = state.notes.filter((note) => note.id !== noteToDelete);
  persistNotes();
  renderNotes();
  clearNoteForm();
  closeNoteModal();
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
  state.editingNotePhotos = [];
  renderNotePhotosPreview();
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
    time.textContent = `Saved ${formatPreciseDateTime(new Date(note.savedAt))}${note.author ? ` by ${note.author}` : ""}`;

    button.append(title, preview, time);
    item.appendChild(button);

    // If note has attached photos, render thumbnail grid with lightbox view and save triggers!
    if (note.photos && note.photos.length > 0) {
      const photosGrid = document.createElement("div");
      photosGrid.className = "note-photos-grid";

      note.photos.forEach((photo) => {
        const photoUrl = typeof photo === "string" ? photo : photo.url;
        if (!photoUrl) return;

        const thumb = document.createElement("button");
        thumb.type = "button";
        thumb.className = "note-photo-thumb";
        thumb.title = "View photo full screen";

        const img = document.createElement("img");
        img.src = photoUrl;
        img.alt = photo.name || "Attached photo";
        img.loading = "lazy";

        thumb.appendChild(img);
        thumb.addEventListener("click", (e) => {
          e.stopPropagation();
          openLightbox(photoUrl, note.title, note.author, note.savedAt);
        });

        photosGrid.appendChild(thumb);
      });

      item.appendChild(photosGrid);
    }

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
    const dot = document.createElement("span");
    dot.className = "hug-particle-dot";
    dot.style.left = `${originX}px`;
    dot.style.top = `${originY}px`;
    dot.style.setProperty("--drift", `${randomBetween(-90, 90)}px`);
    dot.style.animationDelay = `${index * 24}ms`;

    els.particleLayer.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove(), { once: true });
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
// Calendar, Relationship Countdown & Scheduler
// -------------------------------------------------------------

function renderRelationshipDates() {
  const now = new Date();
  const nextMonthsary = getNextMonthlyDate(now, 17);
  const nextAnniversary = getNextAnniversary(now, state.relationshipStart);
  const daysToMonthsary = getCountdownDays(now, nextMonthsary);
  const daysToAnniversary = getCountdownDays(now, nextAnniversary);
  const totalDaysTogether = getWholeDayDifference(now, state.relationshipStart);

  els.monthsaryDays.textContent = String(daysToMonthsary);
  els.monthsaryDate.textContent = formatShortDate(nextMonthsary);
  els.anniversaryDays.textContent = String(daysToAnniversary);
  els.anniversaryDate.textContent = formatShortDate(nextAnniversary);

  els.togetherSummary.textContent =
    totalDaysTogether <= 0
      ? "May 17, 2026 starts the story."
      : `${totalDaysTogether} days of warmth, small memories, and ordinary magic.`;

  renderDashboardCalendar(now);
}

function renderDashboardCalendar(activeDate) {
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  els.calendarTitle.textContent = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(activeDate);

  els.calendarGrid.innerHTML = "";

  for (let index = 0; index < 35; index += 1) {
    const dayElement = document.createElement("span");
    dayElement.className = "calendar-day";

    if (index < firstDay) {
      const prevDate = daysInPrevMonth - firstDay + index + 1;
      dayElement.textContent = String(prevDate);
      dayElement.classList.add("is-muted");
    } else if (index >= firstDay + daysInMonth) {
      const nextDate = index - (firstDay + daysInMonth) + 1;
      dayElement.textContent = String(nextDate);
      dayElement.classList.add("is-muted");
    } else {
      const currentDay = index - firstDay + 1;
      const thisDate = new Date(year, month, currentDay);
      dayElement.textContent = String(currentDay);

      if (currentDay === 17) {
        dayElement.classList.add("is-monthsary");
      }
      if (isSameDay(thisDate, new Date())) {
        dayElement.classList.add("is-today");
      }
    }

    els.calendarGrid.appendChild(dayElement);
  }
}

function openCalendarModal(initialDate) {
  state.schedulerMonth = new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12);
  state.selectedPlanDate = startOfDay(initialDate);
  els.calendarModal.classList.add("is-open");
  els.calendarModal.setAttribute("aria-hidden", "false");
  renderScheduler();
  renderSelectedPlanDate();
}

function closeCalendarModal() {
  els.calendarModal.classList.remove("is-open");
  els.calendarModal.setAttribute("aria-hidden", "true");
}

function shiftSchedulerMonth(offset) {
  state.schedulerMonth = new Date(
    state.schedulerMonth.getFullYear(),
    state.schedulerMonth.getMonth() + offset,
    1,
    12
  );
  renderScheduler();
}

function renderScheduler() {
  const year = state.schedulerMonth.getFullYear();
  const month = state.schedulerMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  els.schedulerMonthTitle.textContent = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(state.schedulerMonth);

  els.schedulerGrid.innerHTML = "";

  for (let index = 0; index < 42; index += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-cell";

    let cellDate;
    let isCurrentMonth = true;

    if (index < firstDay) {
      const prevDate = daysInPrevMonth - firstDay + index + 1;
      cellDate = new Date(year, month - 1, prevDate, 12);
      isCurrentMonth = false;
    } else if (index >= firstDay + daysInMonth) {
      const nextDate = index - (firstDay + daysInMonth) + 1;
      cellDate = new Date(year, month + 1, nextDate, 12);
      isCurrentMonth = false;
    } else {
      const day = index - firstDay + 1;
      cellDate = new Date(year, month, day, 12);
    }

    const dayNumber = cellDate.getDate();
    const isPast = isPastDate(cellDate);
    const isToday = isSameDay(cellDate, new Date());
    const isSelected = isSameDay(cellDate, state.selectedPlanDate);
    const plans = getPlansForDate(cellDate);

    button.innerHTML = `<span class="calendar-cell-date">${dayNumber}</span>`;

    if (!isCurrentMonth) button.classList.add("is-muted");
    if (isPast) button.classList.add("is-past");
    if (isToday) button.classList.add("is-today");
    if (isSelected) button.classList.add("is-selected");

    if (plans.length > 0) {
      const badge = document.createElement("span");
      badge.className = "calendar-cell-pill";
      badge.textContent = plans[0].title;
      button.appendChild(badge);
    }

    button.addEventListener("click", () => {
      state.selectedPlanDate = startOfDay(cellDate);
      renderScheduler();
      renderSelectedPlanDate();
    });

    els.schedulerGrid.appendChild(button);
  }
}

function renderSelectedPlanDate() {
  const dateStr = formatLongDate(state.selectedPlanDate);
  els.selectedPlanDate.textContent = dateStr;

  const isPast = isPastDate(state.selectedPlanDate);
  els.planLockMessage.hidden = !isPast;
  els.savePlanButton.disabled = isPast;
  els.planTitleInput.disabled = isPast;
  els.planBodyInput.disabled = isPast;

  const plans = getPlansForDate(state.selectedPlanDate);
  renderPlansList(plans);

  if (state.editingPlanId) {
    const activePlan = state.plans.find((p) => p.id === state.editingPlanId);
    if (activePlan) {
      els.planTitleInput.value = activePlan.title;
      els.planBodyInput.value = activePlan.body || "";
      els.deletePlanButton.disabled = isPast;
      return;
    }
  }

  clearPlanForm();
  els.deletePlanButton.disabled = true;
}

function renderPlansList(plans) {
  els.plansList.innerHTML = "";

  if (plans.length === 0) {
    const empty = document.createElement("li");
    empty.className = "plan-history-item plan-history-item--empty";
    empty.textContent = "No special plans recorded for this day yet.";
    els.plansList.appendChild(empty);
    return;
  }

  plans.forEach((plan) => {
    const item = document.createElement("li");
    item.className = "plan-history-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "plan-history-button";
    button.addEventListener("click", () => editPlan(plan.id));

    const title = document.createElement("strong");
    title.textContent = plan.title;

    const desc = document.createElement("span");
    desc.textContent = plan.body;

    button.append(title, desc);
    item.appendChild(button);
    els.plansList.appendChild(item);
  });
}

async function saveCurrentPlan(event) {
  event.preventDefault();
  if (isPastDate(state.selectedPlanDate)) return;

  const title = els.planTitleInput.value.trim();
  const body = els.planBodyInput.value.trim();
  if (!title) return;

  const dateStr = toDateKey(state.selectedPlanDate);

  if (state.editingPlanId) {
    state.plans = state.plans.map((p) => (p.id === state.editingPlanId ? { ...p, title, body } : p));
    addActivity("Calendar plan updated.");

    if (supabaseClient && !state.editingPlanId.startsWith("local-")) {
      await supabaseClient
        .from("calendar_events")
        .update({ title, description: body })
        .eq("id", state.editingPlanId);
    }
  } else {
    const localId = createId();
    state.editingPlanId = localId;
    state.plans.push({
      id: localId,
      date: dateStr,
      title,
      body,
      createdAt: new Date().toISOString(),
    });
    addActivity("Calendar plan added.");

    if (supabaseClient && state.spaceId) {
      const { data } = await supabaseClient
        .from("calendar_events")
        .insert({
          space_id: state.spaceId,
          creator_id: state.user?.id || null,
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
        space_id: state.spaceId,
        actor_id: state.user?.id || null,
        actor_name: getActorName(),
        action_type: "calendar_updated",
        details: `Added plan for ${dateStr}: "${title}"`,
      });
    }
  }

  triggerHapticFeedback(els.heroCard, 30);
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
