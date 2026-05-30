(function () {
  const MUSIC_KEY = "birthday-surprise-music";
  const TIME_KEY = "birthday-surprise-music-time";
  const STARTED_KEY = "birthday-surprise-started";
  const isPage = document.body.dataset.page;
  const basePath = window.location.pathname.includes("/pages/") ? "../" : "";

  let audioContext;
  let padGain;
  let padOscillators = [];
  let fileMusic;
  let musicTimer;
  let musicMuted = localStorage.getItem(MUSIC_KEY) === "muted";

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("page-ready");
    setupRevealAnimations();
    setupNavigation();
    setupMusic();
    setupHearts();
    setupLightbox();
    setupTyping();

    if (isPage === "final") {
      setupFinalSurprise();
    }
  });

  function setupNavigation() {
    document.querySelectorAll("[data-next]").forEach((button) => {
      button.addEventListener("click", () => {
        playClickSound();
        localStorage.setItem(STARTED_KEY, "yes");
        rememberMusicTime();
        document.body.classList.add("page-leaving");
        window.setTimeout(() => {
          window.location.href = button.dataset.next;
        }, 430);
      });
    });
  }

  function setupRevealAnimations() {
    const revealItems = document.querySelectorAll(".reveal, .reveal-group > *");
    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });

    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index * 70, 360)}ms`;
      observer.observe(item);
    });
  }

  function setupMusic() {
    fileMusic = new Audio(`${basePath}assets/music/music.mp3`);
    fileMusic.loop = true;
    fileMusic.volume = musicMuted ? 0 : 0.45;

    const savedTime = Number(localStorage.getItem(TIME_KEY) || 0);
    if (savedTime > 0) {
      fileMusic.currentTime = savedTime;
    }

    fileMusic.addEventListener("timeupdate", rememberMusicTime);
    fileMusic.addEventListener("error", () => {
      if (localStorage.getItem(STARTED_KEY) === "yes") {
        startSynthPad();
      }
    });

    updateMusicIcon();

    const shouldAutoStart = localStorage.getItem(STARTED_KEY) === "yes" || isPage === "home";
    if (shouldAutoStart && !musicMuted) {
      tryStartMusic();
    }

    window.addEventListener("pointerdown", unlockAudioOnce, { once: true });
    window.addEventListener("keydown", unlockAudioOnce, { once: true });

    const toggle = document.querySelector("[data-music-toggle]");
    if (toggle) {
      toggle.addEventListener("click", () => {
        musicMuted = !musicMuted;
        localStorage.setItem(MUSIC_KEY, musicMuted ? "muted" : "playing");
        updateMusicIcon();

        if (musicMuted) {
          fileMusic.pause();
          setPadVolume(0);
        } else {
          localStorage.setItem(STARTED_KEY, "yes");
          tryStartMusic();
          setPadVolume(0.035);
        }
      });
    }

    musicTimer = window.setInterval(rememberMusicTime, 1200);
    window.addEventListener("beforeunload", () => {
      rememberMusicTime();
      window.clearInterval(musicTimer);
    });
  }

  function unlockAudioOnce() {
    if (!musicMuted) {
      localStorage.setItem(STARTED_KEY, "yes");
      tryStartMusic();
    }
  }

  function tryStartMusic() {
    fileMusic.play().catch(() => {
      startSynthPad();
    });
  }

  function startSynthPad() {
    if (musicMuted || padOscillators.length) {
      return;
    }

    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    padGain = audioContext.createGain();
    padGain.gain.value = 0.032;
    padGain.connect(audioContext.destination);

    [261.63, 329.63, 392.00, 523.25].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = index % 2 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.24;
      oscillator.connect(gain);
      gain.connect(padGain);
      oscillator.start();
      padOscillators.push(oscillator);
    });
  }

  function setPadVolume(volume) {
    if (padGain) {
      padGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.08);
    }
  }

  function rememberMusicTime() {
    if (fileMusic && Number.isFinite(fileMusic.currentTime)) {
      localStorage.setItem(TIME_KEY, String(fileMusic.currentTime));
    }
  }

  function updateMusicIcon() {
    const icon = document.querySelector("[data-music-icon]");
    if (icon) {
      icon.textContent = musicMuted ? "♪" : "♫";
    }
  }

  function playClickSound() {
    playOptionalAudio(`${basePath}assets/sounds/click.wav`, () => {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(620, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(940, context.currentTime + 0.07);
      gain.gain.setValueAtTime(0.001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.13);
    });
  }

  function playCelebrationSound() {
    playOptionalAudio(`${basePath}assets/sounds/celebration.wav`, () => {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.001, context.currentTime + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + index * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + index * 0.08 + 0.28);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(context.currentTime + index * 0.08);
        oscillator.stop(context.currentTime + index * 0.08 + 0.3);
      });
    });
  }

  function playOptionalAudio(src, fallback) {
    const sound = new Audio(src);
    sound.volume = 0.55;
    sound.play().catch(fallback);
  }

  function setupHearts() {
    document.querySelectorAll(".hearts").forEach((field) => {
      for (let index = 0; index < 18; index += 1) {
        const heart = document.createElement("span");
        heart.className = "heart";
        heart.style.left = `${Math.random() * 100}%`;
        heart.style.bottom = `${-20 - Math.random() * 70}px`;
        heart.style.animationDelay = `${Math.random() * 8}s`;
        heart.style.setProperty("--duration", `${9 + Math.random() * 9}s`);
        heart.style.opacity = `${0.42 + Math.random() * 0.4}`;
        field.appendChild(heart);
      }
    });
  }

  function setupLightbox() {
    const modal = document.querySelector("[data-lightbox-modal]");
    if (!modal) {
      return;
    }

    const image = modal.querySelector("[data-lightbox-img]");
    const caption = modal.querySelector("[data-lightbox-caption]");
    const close = modal.querySelector("[data-lightbox-close]");

    document.querySelectorAll("[data-lightbox]").forEach((button) => {
      button.addEventListener("click", () => {
        playClickSound();
        image.src = button.dataset.lightbox;
        caption.textContent = button.dataset.caption || "";
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
      });
    });

    const closeModal = () => {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    };

    close.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    });
  }

  function setupTyping() {
    const target = document.querySelector("[data-typed-text]");
    if (!target) {
      return;
    }

    const text = target.dataset.typedText;
    let index = 0;
    const type = () => {
      target.textContent = text.slice(0, index);
      index += 1;
      if (index <= text.length) {
        window.setTimeout(type, 34);
      } else {
        target.classList.add("done");
      }
    };

    window.setTimeout(type, 500);
  }

  function setupFinalSurprise() {
    const countdown = document.querySelector("[data-countdown]");
    const title = document.querySelector("[data-final-title]");
    const note = document.querySelector(".final-note");
    let number = 5;

    const tick = window.setInterval(() => {
      number -= 1;
      if (number > 0) {
        countdown.textContent = number;
      } else {
        window.clearInterval(tick);
        countdown.textContent = "♥";
        title.classList.add("show");
        note.classList.add("show");
        launchConfetti();
        createBalloons();
        playCelebrationSound();
      }
    }, 1000);
  }

  function launchConfetti() {
    if (window.confetti) {
      const end = Date.now() + 4200;
      const colors = ["#ff3f79", "#ffc86b", "#7fd8ff", "#9be8c9", "#fff7f9"];
      (function frame() {
        window.confetti({ particleCount: 5, angle: 60, spread: 62, origin: { x: 0 }, colors });
        window.confetti({ particleCount: 5, angle: 120, spread: 62, origin: { x: 1 }, colors });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
      return;
    }

    document.body.classList.add("confetti-fallback");
  }

  function createBalloons() {
    const field = document.querySelector("[data-balloons]");
    if (!field) {
      return;
    }

    const colors = ["#ff5f88", "#ffc86b", "#7fd8ff", "#9be8c9", "#ffffff"];
    for (let index = 0; index < 22; index += 1) {
      const balloon = document.createElement("span");
      balloon.className = "balloon";
      balloon.style.left = `${Math.random() * 100}%`;
      balloon.style.setProperty("--balloon-color", colors[index % colors.length]);
      balloon.style.setProperty("--duration", `${7 + Math.random() * 6}s`);
      balloon.style.animationDelay = `${Math.random() * 2.2}s`;
      field.appendChild(balloon);
    }
  }
})();
