const STORAGE_KEY = "reglim-periods-v1";
const MOOD_KEY = "reglim-mood-v1";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#periodForm");
  const startInput = document.querySelector("#startDate");
  const endInput = document.querySelector("#endDate");
  const message = document.querySelector("#formMessage");
  const historyList = document.querySelector("#historyList");

  const calendarMonth = document.querySelector("#calendarMonth");
  const calendarDays = document.querySelector("#calendarDays");
  const calendarMessage = document.querySelector("#calendarMessage");

  let periods = loadPeriods();
  let displayedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let selectedDate = getTodayString();

  function loadPeriods() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  function savePeriods() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(periods));
    } catch (e) {
      console.error(e);
    }
  }

  function getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function dateToString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function parseLocalDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
  }

  function formatDate(dateString) {
    if (!dateString) return "Belirtilmedi";
    return parseLocalDate(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function getCycleInfo() {
    const starts = [...new Set(periods.map((p) => p.start))].sort();
    const differences = [];

    for (let i = 1; i < starts.length; i++) {
      const days = Math.round(
        (parseLocalDate(starts[i]) - parseLocalDate(starts[i - 1])) / 86400000
      );
      if (days >= 15 && days <= 60) differences.push(days);
    }

    const average = differences.length
      ? Math.round(differences.reduce((sum, days) => sum + days, 0) / differences.length)
      : 28;

    const latest = starts.length ? starts[starts.length - 1] : null;
    let nextDate = null;

    if (latest) {
      const next = parseLocalDate(latest);
      next.setDate(next.getDate() + average);
      nextDate = dateToString(next);
    }

    return { starts, average, latest, nextDate, hasHistory: differences.length > 0 };
  }

  function isRecordedPeriodDay(dateString) {
    return periods.some((period) => {
      if (dateString < period.start) return false;
      const end = period.end || period.start;
      return dateString <= end;
    });
  }

  function renderCalendar() {
    if (!calendarDays || !calendarMonth) return;

    const year = displayedMonth.getFullYear();
    const month = displayedMonth.getMonth();

    calendarMonth.textContent = displayedMonth.toLocaleDateString("tr-TR", {
      month: "long",
      year: "numeric"
    });

    calendarDays.replaceChildren();

    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - offset);

    const { nextDate } = getCycleInfo();

    for (let i = 0; i < 42; i++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);

      const dateString = dateToString(date);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-day";
      button.textContent = date.getDate();
      button.setAttribute("aria-label", formatDate(dateString));

      if (date.getMonth() !== month) button.classList.add("outside-month");
      if (isRecordedPeriodDay(dateString)) button.classList.add("period-day");
      if (nextDate === dateString && !isRecordedPeriodDay(dateString)) {
        button.classList.add("predicted-day");
      }
      if (dateString === getTodayString()) button.classList.add("today");
      if (dateString === selectedDate) button.classList.add("selected-day");

      button.addEventListener("click", () => {
        selectedDate = dateString;
        renderCalendar();
        showSelectedDate(dateString);
      });

      calendarDays.append(button);
    }

    showSelectedDate(selectedDate);
  }

  function showSelectedDate(dateString) {
    if (!calendarMessage) return;
    const { nextDate } = getCycleInfo();
    const notes = [];

    if (dateString === getTodayString()) notes.push("Bugün");
    if (isRecordedPeriodDay(dateString)) notes.push("Kayıtlı regl günü");
    if (nextDate === dateString) notes.push("Tahmini regl başlangıcı");

    calendarMessage.textContent = notes.length
      ? `${formatDate(dateString)} · ${notes.join(" · ")}`
      : `${formatDate(dateString)} · Bu gün için regl kaydı bulunmuyor.`;
  }

  const prevBtn = document.querySelector("#prevMonth");
  const nextBtn = document.querySelector("#nextMonth");

  if (prevBtn) {
    prevBtn.onclick = () => {
      displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1);
      renderCalendar();
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
      renderCalendar();
    };
  }

  function render() {
    const sorted = [...periods].sort((a, b) => b.start.localeCompare(a.start));

    if (historyList) {
      historyList.replaceChildren();

      if (sorted.length === 0) {
        historyList.textContent = "Henüz kayıt yok. İlk kaydını ekleyebilirsin. ♡";
        historyList.className = "subtitle";
      } else {
        historyList.className = "";

        sorted.forEach((period) => {
          const row = document.createElement("div");
          row.className = "history-item";

          const info = document.createElement("span");
          info.textContent = `${formatDate(period.start)} · Bitiş: ${formatDate(period.end)}`;

          const remove = document.createElement("button");
          remove.className = "delete-button";
          remove.textContent = "Sil";
          remove.type = "button";

          remove.addEventListener("click", () => {
            periods = periods.filter((p) => p.id !== period.id);
            savePeriods();
            render();
          });

          row.append(info, remove);
          historyList.append(row);
        });
      }
    }

    const { average, latest, nextDate, hasHistory } = getCycleInfo();

    const lastEl = document.querySelector("#lastPeriod");
    const cycleEl = document.querySelector("#cycleLength");
    const hintEl = document.querySelector(".card:nth-child(3) .hint");
    const nextEl = document.querySelector("#nextPeriod");

    if (lastEl) lastEl.textContent = latest ? formatDate(latest) : "Henüz girilmedi";
    if (cycleEl) cycleEl.textContent = hasHistory ? `${average} gün` : "28 gün";
    if (hintEl) {
      hintEl.textContent = hasHistory
        ? "Kayıtlı döngülerinin ortalaması."
        : "Yeterli geçmiş kayıt henüz yok.";
    }
    if (nextEl) nextEl.textContent = nextDate ? formatDate(nextDate) : "Hesaplanmadı";

    renderCalendar();
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const start = startInput.value;
      const end = endInput.value;

      if (end && end < start) {
        if (message) message.textContent = "Bitiş tarihi başlangıç tarihinden önce olamaz.";
        return;
      }

      const existing = periods.find((p) => p.start === start);

      if (existing) {
        existing.end = end;
      } else {
        periods.push({
          id: `${Date.now()}-${Math.random()}`,
          start,
          end
        });
      }

      savePeriods();
      render();

      selectedDate = start;
      displayedMonth = new Date(
        parseLocalDate(start).getFullYear(),
        parseLocalDate(start).getMonth(),
        1
      );
      renderCalendar();

      if (message) message.textContent = "Kaydın bu tarayıcıya eklendi. ♡";
      form.reset();
    });
  }

  function restoreTodayMood() {
    try {
      const moods = JSON.parse(localStorage.getItem(MOOD_KEY) || "{}");
      const todayMood = moods[getTodayString()];
      if (todayMood) {
        document.querySelectorAll(".mood").forEach((btn) => {
          if (btn.dataset.mood === todayMood) {
            btn.classList.add("selected");
            const moodMsg = document.querySelector("#moodMessage");
            if (moodMsg) {
              moodMsg.textContent = `Bugünkü ruh hâlin: ${todayMood}. Bu tarayıcıya kaydedildi. ♡`;
            }
          }
        });
      }
    } catch {}
  }

  document.querySelectorAll(".mood").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".mood").forEach((item) => {
        item.classList.remove("selected");
      });

      button.classList.add("selected");
      const mood = button.dataset.mood;
      const today = getTodayString();

      try {
        const moods = JSON.parse(localStorage.getItem(MOOD_KEY) || "{}");
        moods[today] = mood;
        localStorage.setItem(MOOD_KEY, JSON.stringify(moods));

        const moodMsg = document.querySelector("#moodMessage");
        if (moodMsg) {
          moodMsg.textContent = `Bugünkü ruh hâlin: ${mood}. Bu tarayıcıya kaydedildi. ♡`;
        }
      } catch {
        const moodMsg = document.querySelector("#moodMessage");
        if (moodMsg) moodMsg.textContent = "Kayıt yapılamadı.";
      }
    });
  });

  render();
  restoreTodayMood();
});