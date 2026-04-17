const DEFAULT_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" fill="none">
  <defs>
    <linearGradient id="background" x1="54" y1="24" x2="268" y2="300" gradientUnits="userSpaceOnUse">
      <stop stop-color="#D8F0FF" />
      <stop offset="0.48" stop-color="#89B7E5" />
      <stop offset="1" stop-color="#314C7A" />
    </linearGradient>
  </defs>
  <rect width="320" height="320" rx="48" fill="url(#background)" />
  <circle cx="160" cy="119" r="66" fill="#F2D0BE" />
  <path d="M90 287C105 223 138 188 160 188C181 188 215 223 230 287" fill="#203557" />
  <path d="M94 115C96 78 121 49 160 49C201 49 224 80 226 116C220 96 205 78 183 73C160 68 126 76 94 115Z" fill="#7B452E" />
  <path d="M126 111C132 111 137 116 137 122C137 128 132 133 126 133C120 133 115 128 115 122C115 116 120 111 126 111Z" fill="#22304B" />
  <path d="M194 111C200 111 205 116 205 122C205 128 200 133 194 133C188 133 183 128 183 122C183 116 188 111 194 111Z" fill="#22304B" />
  <path d="M134 155C150 168 170 168 186 155" stroke="#22304B" stroke-linecap="round" stroke-width="8" />
  <path d="M108 208C124 194 143 188 160 188C177 188 196 194 212 208L230 287H90L108 208Z" fill="#2C4E83" />
</svg>
`.trim();

const PROFILE_CARD_CONFIG = Object.freeze({
  timeUpdateIntervalMs: 1000,
  avatar: {
    source: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(DEFAULT_AVATAR_SVG)}`,
    alt: "Portrait of Olunlade Abdulmuiz wearing a blue shirt and looking at the camera",
  },
});

class ProfileCardManager {
  constructor(root) {
    this.root = root;
    this.timeIntervalId = null;
    this.avatarObjectUrl = null;
    this.elements = {};
  }

  init() {
    this.cacheElements();
    this.assertRequiredElements();
    
    // Use existing avatar source from HTML if available, otherwise use default SVG
    const existingAvatarSrc = this.elements.avatar.src;
    const avatarSource = existingAvatarSrc ? existingAvatarSrc : PROFILE_CARD_CONFIG.avatar.source;
    
    this.setAvatarSource(avatarSource, PROFILE_CARD_CONFIG.avatar.alt);
    this.normalizeExternalLinks();
    this.updateTime();
    this.timeIntervalId = window.setInterval(
      () => this.updateTime(),
      PROFILE_CARD_CONFIG.timeUpdateIntervalMs
    );
  }

  cacheElements() {
    this.elements = {
      time: this.root.querySelector('[data-testid="test-user-time"]'),
      avatar: this.root.querySelector('[data-testid="test-user-avatar"]'),
      socialLinks: this.root.querySelector('[data-testid="test-user-social-links"]'),
      required: [
        this.root,
        this.root.querySelector('[data-testid="test-user-name"]'),
        this.root.querySelector('[data-testid="test-user-bio"]'),
        this.root.querySelector('[data-testid="test-user-time"]'),
        this.root.querySelector('[data-testid="test-user-avatar"]'),
        this.root.querySelector('[data-testid="test-user-social-links"]'),
        this.root.querySelector('[data-testid="test-user-hobbies"]'),
        this.root.querySelector('[data-testid="test-user-dislikes"]'),
      ],
    };
  }

  assertRequiredElements() {
    const hasMissingElement = this.elements.required.some((element) => !element);

    if (hasMissingElement) {
      throw new Error("The profile card is missing one or more required test targets.");
    }
  }

  normalizeExternalLinks() {
    const links = this.elements.socialLinks.querySelectorAll("a");

    links.forEach((link) => {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
  }

  // Accept a URL string or a File so the avatar can be swapped without changing the markup.
  setAvatarSource(source, altText) {
    if (this.avatarObjectUrl) {
      URL.revokeObjectURL(this.avatarObjectUrl);
      this.avatarObjectUrl = null;
    }

    if (source instanceof File) {
      this.avatarObjectUrl = URL.createObjectURL(source);
      this.elements.avatar.src = this.avatarObjectUrl;
    } else {
      this.elements.avatar.src = String(source);
    }

    this.elements.avatar.alt = altText;
  }

  updateTime() {
    const now = Date.now();
    const epochTime = String(now);

    this.elements.time.textContent = epochTime;
    this.elements.time.dateTime = new Date(now).toISOString();
    this.elements.time.setAttribute(
      "aria-label",
      `Current epoch time ${epochTime} milliseconds`
    );
  }

  getCurrentTime() {
    return this.elements.time.textContent;
  }

  destroy() {
    if (this.timeIntervalId !== null) {
      window.clearInterval(this.timeIntervalId);
      this.timeIntervalId = null;
    }

    if (this.avatarObjectUrl) {
      URL.revokeObjectURL(this.avatarObjectUrl);
      this.avatarObjectUrl = null;
    }
  }
}

function initProfileCard() {
  const root = document.querySelector('[data-testid="test-profile-card"]');

  if (!root) {
    throw new Error('Missing element with data-testid="test-profile-card".');
  }

  const manager = new ProfileCardManager(root);
  manager.init();

  window.profileCardApi = {
    getCurrentTime: () => manager.getCurrentTime(),
    setAvatarSource: (source, altText = PROFILE_CARD_CONFIG.avatar.alt) =>
      manager.setAvatarSource(source, altText),
  };

  window.addEventListener("beforeunload", () => manager.destroy(), { once: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProfileCard);
} else {
  initProfileCard();
}
