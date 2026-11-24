/* МОЯ КОЖА PRO. Только локальная работа: никаких сетевых запросов. */
(() => {
  'use strict';
  const STORAGE_KEY = 'moya-kozha-pro-v1';
  const QUESTIONS = [
    { text: 'Как обычно ощущается кожа после умывания?', options: ['Комфортно', 'Стянутость', 'По-разному'] },
    { text: 'Какие ощущения возникают в течение дня?', options: ['Комфорт', 'Сухость', 'Блеск', 'По-разному'] },
    { text: 'Как кожа обычно реагирует на новые косметические средства?', options: ['Комфортно', 'Иногда возникает дискомфорт', 'Не знаю'] },
    { text: 'Как часто ты используешь увлажняющее средство?', options: ['Ежедневно', 'Иногда', 'Пока не использую'] },
    { text: 'Используешь ли ты солнцезащитное средство?', options: ['Регулярно', 'Иногда', 'Пока нет'] },
    { text: 'Сколько времени удобно уделять уходу?', options: ['2–3 минуты', '5 минут', '10 минут'] },
    { text: 'Что для тебя важнее в ежедневном уходе?', options: ['Простота', 'Комфорт', 'Регулярность'] }
  ];
  const STEPS = {
    morning: [
      ['Деликатное очищение', 'По потребности, без интенсивного трения.'],
      ['Увлажнение', 'Если средство приятно коже и не вызывает дискомфорта.'],
      ['SPF 30+', 'Перед выходом на улицу; следуй инструкции средства.']
    ],
    evening: [
      ['Бережное очищение', 'Смой загрязнения и средства, нанесённые в течение дня.'],
      ['Увлажнение', 'Выбирай привычное комфортное средство.']
    ]
  };
  const MOODS = ['Комфортно', 'Суховато', 'Стянутость', 'Блеск', 'По-разному', 'Не знаю'];
  const emptyState = () => ({ theme: 'quartz', answers: Array(7).fill(null), rituals: {}, diary: {} });
  const $ = id => document.getElementById(id);
  let storageAvailable = true;
  let state = loadState();
  let view = 'home';
  let questionIndex = 0;
  let selectedDate = todayKey();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return emptyState();
      const safe = emptyState();
      safe.theme = data.theme === 'champagne' ? 'champagne' : 'quartz';
      if (Array.isArray(data.answers)) safe.answers = QUESTIONS.map((q, i) => q.options.includes(data.answers[i]) ? data.answers[i] : null);
      if (data.rituals && typeof data.rituals === 'object' && !Array.isArray(data.rituals)) safe.rituals = data.rituals;
      if (data.diary && typeof data.diary === 'object' && !Array.isArray(data.diary)) safe.diary = data.diary;
      return safe;
    } catch (error) {
      storageAvailable = false;
      return emptyState();
    }
  }
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageAvailable = true;
      $('storage-status').textContent = '';
      return true;
    } catch (error) {
      storageAvailable = false;
      $('storage-status').textContent = 'Не удалось сохранить данные в браузере. Изменения могут исчезнуть после закрытия страницы. Проверь настройки хранилища.';
      return false;
    }
  }
  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  function todayKey() { return localDateKey(new Date()); }
  function dateFromKey(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }
  function formattedDate(key) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(dateFromKey(key)); }
  function last30Keys() {
    const now = new Date(); now.setHours(12, 0, 0, 0);
    return Array.from({length:30}, (_, i) => { const d = new Date(now); d.setDate(now.getDate() - 29 + i); return localDateKey(d); });
  }
  function hasFullAnswers() { return QUESTIONS.every((q, i) => q.options.includes(state.answers[i])); }
  function navigate(next) {
    if (!['home', 'quiz', 'result', 'ritual', 'diary'].includes(next)) return;
    view = next;
    document.querySelectorAll('.page').forEach(el => { el.hidden = el.id !== `view-${next}`; });
    document.querySelectorAll('[data-nav]').forEach(el => {
      if (el.dataset.nav === next) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
    if (next === 'quiz') renderQuestion();
    if (next === 'result') renderResult();
    if (next === 'ritual') renderRitual();
    if (next === 'diary') renderDiary();
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('main').focus({ preventScroll: true });
  }
  function renderTheme() {
    document.body.dataset.theme = state.theme;
    $('theme-select').value = state.theme;
  }
  function renderQuestion() {
    const question = QUESTIONS[questionIndex];
    $('quiz-counter').textContent = `Вопрос ${questionIndex + 1} из ${QUESTIONS.length}`;
    $('quiz-percent').textContent = `${Math.round((questionIndex + 1) / QUESTIONS.length * 100)}%`;
    $('quiz-progress-fill').style.width = `${(questionIndex + 1) / QUESTIONS.length * 100}%`;
    $('quiz-progress').setAttribute('aria-valuenow', String(questionIndex + 1));
    $('question-title').textContent = question.text;
    $('quiz-options').replaceChildren();
    question.options.forEach((option, index) => {
      const label = document.createElement('label'); label.className = 'option-item';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'question-choice'; input.value = option;
      input.checked = state.answers[questionIndex] === option;
      input.id = `answer-${questionIndex}-${index}`;
      input.addEventListener('change', () => { state.answers[questionIndex] = option; saveState(); $('quiz-feedback').textContent = ''; });
      const text = document.createElement('span'); text.textContent = option;
      label.append(input, text); $('quiz-options').append(label);
    });
    $('quiz-back').disabled = questionIndex === 0;
    $('quiz-next').textContent = questionIndex === QUESTIONS.length - 1 ? 'Показать мой уход →' : 'Далее →';
    $('quiz-feedback').textContent = '';
  }
  function scenario() {
    const a = state.answers;
    if (a[0] === 'Стянутость' || a[1] === 'Сухость' || a[2] === 'Иногда возникает дискомфорт' || a[6] === 'Комфорт') {
      return { title: 'Нежность и комфорт', description: 'Подойдёт спокойный базовый ритуал с вниманием к собственным ощущениям.', tip: 'Не нужно очищать кожу до ощущения «скрипа». При неприятных ощущениях от нового средства прекрати его использование; при стойком дискомфорте обсуди это с дерматологом.' };
    }
    if (a[5] === '2–3 минуты' || a[6] === 'Простота') {
      return { title: 'Красота простоты', description: 'Минимум действий и понятная последовательность без перегруженных этапов.', tip: 'Пусть ритуал будет коротким: мягкое очищение по необходимости, увлажнение и SPF 30+ утром перед выходом на улицу.' };
    }
    if (a[4] === 'Пока нет' || a[4] === 'Иногда') {
      return { title: 'Забота и защита', description: 'Создадим привычку регулярно вспоминать про базовые шаги, включая защиту от солнца.', tip: 'Держи солнцезащитное средство рядом с привычными утренними средствами. Используй SPF 30+ согласно инструкции, когда выходишь на улицу.' };
    }
    return { title: 'Ритм заботы', description: 'Тебе близок последовательный уход. Достаточно поддерживать комфортные ежедневные привычки.', tip: 'Не обязательно добавлять новые средства. Регулярность простых шагов важнее сложности ритуала.' };
  }
  function renderResult() {
    const complete = hasFullAnswers();
    $('result-empty').hidden = complete;
    $('result-filled').hidden = !complete;
    if (!complete) return;
    const result = scenario();
    $('scenario-title').textContent = result.title;
    $('scenario-description').textContent = result.description;
    $('scenario-tip').textContent = result.tip;
  }
  function renderRitual() {
    const day = todayKey();
    $('ritual-date').textContent = `Сегодня, ${formattedDate(day)}`;
    if (!state.rituals[day] || typeof state.rituals[day] !== 'object') state.rituals[day] = {};
    for (const period of ['morning', 'evening']) {
      const parent = $(`${period}-steps`);
      parent.replaceChildren();
      const existing = Array.isArray(state.rituals[day][period]) ? state.rituals[day][period] : [];
      STEPS[period].forEach(([title, detail], i) => {
        const label = document.createElement('label'); label.className = 'check-item';
        const input = document.createElement('input'); input.type = 'checkbox'; input.checked = existing.includes(i);
        const wrapper = document.createElement('span');
        const bold = document.createElement('strong'); bold.textContent = title;
        const small = document.createElement('small'); small.textContent = detail;
        wrapper.append(bold, small); label.append(input, wrapper); parent.append(label);
        input.addEventListener('change', () => {
          const values = Array.isArray(state.rituals[day][period]) ? [...state.rituals[day][period]] : [];
          state.rituals[day][period] = input.checked ? [...new Set([...values, i])] : values.filter(x => x !== i);
          saveState(); updateRitualCounts();
        });
      });
    }
    updateRitualCounts();
  }
  function updateRitualCounts() {
    const day = state.rituals[todayKey()] || {};
    for (const period of ['morning', 'evening']) {
      const marked = Array.isArray(day[period]) ? day[period].filter(i => Number.isInteger(i) && i >= 0 && i < STEPS[period].length).length : 0;
      $(`${period}-count`).textContent = `${marked}/${STEPS[period].length}`;
    }
  }
  function diaryRecord(key) {
    const value = state.diary[key];
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }
  function hasEntry(key) {
    const entry = diaryRecord(key);
    return MOODS.includes(entry.mood) || (typeof entry.note === 'string' && entry.note.trim().length > 0);
  }
  function renderDiary() {
    const days = last30Keys();
    if (!days.includes(selectedDate)) selectedDate = todayKey();
    const filled = days.filter(hasEntry).length;
    $('diary-progress-caption').textContent = `${filled} из 30 дней`;
    $('diary-progress-fill').style.width = `${filled / 30 * 100}%`;
    const calendar = $('calendar'); calendar.replaceChildren();
    days.forEach(key => {
      const date = dateFromKey(key);
      const button = document.createElement('button'); button.type = 'button';
      button.className = `calendar-day${hasEntry(key) ? ' has-entry' : ''}`;
      button.setAttribute('aria-pressed', String(selectedDate === key));
      button.setAttribute('aria-label', `${formattedDate(key)}${hasEntry(key) ? ', есть запись' : ', без записи'}`);
      const day = document.createElement('span'); day.textContent = date.getDate();
      const month = document.createElement('small'); month.textContent = new Intl.DateTimeFormat('ru-RU', {month:'short'}).format(date);
      button.append(day, month);
      button.addEventListener('click', () => { selectedDate = key; renderDiary(); $('entry-date').focus?.(); });
      calendar.append(button);
    });
    const record = diaryRecord(selectedDate);
    $('entry-date').textContent = formattedDate(selectedDate);
    $('mood-options').replaceChildren();
    MOODS.forEach((mood, i) => {
      const label = document.createElement('label'); label.className = 'mood-item';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'mood'; input.value = mood;
      input.id = `mood-${i}`; input.checked = record.mood === mood;
      const span = document.createElement('span'); span.textContent = mood;
      label.append(input, span); $('mood-options').append(label);
    });
    $('diary-note').value = typeof record.note === 'string' ? record.note.slice(0, 500) : '';
    updateNoteLength(); $('diary-feedback').textContent = '';
    $('delete-entry').disabled = !hasEntry(selectedDate);
  }
  function updateNoteLength() { $('note-length').textContent = `${$('diary-note').value.length}/500`; }
  function exportData() {
    try {
      const json = JSON.stringify({ app: 'МОЯ КОЖА PRO', version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `moya-kozha-pro-${todayKey()}.json`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      $('storage-status').textContent = 'Экспорт подготовлен. Проверь папку загрузок браузера.';
    } catch (error) { $('storage-status').textContent = 'Не удалось подготовить файл JSON в этом браузере.'; }
  }
  // Импорт принимает только экспорт МОЯ КОЖА PRO версии 1. Никаких сетевых запросов.
  function validateImport(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
        parsed.app !== 'МОЯ КОЖА PRO' || parsed.version !== 1) {
      throw new Error('Это не файл экспорта МОЯ КОЖА PRO версии 1.');
    }
    const data = parsed.data;
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        !['quartz', 'champagne'].includes(data.theme) ||
        !Array.isArray(data.answers) || data.answers.length !== QUESTIONS.length ||
        !data.answers.every((a, i) => a === null || QUESTIONS[i].options.includes(a)) ||
        !data.rituals || typeof data.rituals !== 'object' || Array.isArray(data.rituals) ||
        !data.diary || typeof data.diary !== 'object' || Array.isArray(data.diary)) {
      throw new Error('Структура сохранённых данных не соответствует приложению.');
    }
    const isDate = key => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
      const date = dateFromKey(key);
      return !Number.isNaN(date.getTime()) && localDateKey(date) === key;
    };
    const rituals = {};
    for (const [day, periods] of Object.entries(data.rituals)) {
      if (!isDate(day) || !periods || typeof periods !== 'object' || Array.isArray(periods)) {
        throw new Error('В файле есть некорректные даты или отметки ритуалов.');
      }
      const checked = {};
      for (const period of ['morning', 'evening']) {
        if (!Object.hasOwn(periods, period)) continue;
        const indices = periods[period];
        if (!Array.isArray(indices) || !indices.every(i => Number.isInteger(i) && i >= 0 && i < STEPS[period].length)) {
          throw new Error('В файле есть некорректные отметки ритуалов.');
        }
        checked[period] = [...new Set(indices)];
      }
      rituals[day] = checked;
    }
    const diary = {};
    for (const [day, record] of Object.entries(data.diary)) {
      if (!isDate(day) || !record || typeof record !== 'object' || Array.isArray(record) ||
          typeof record.note !== 'string' || record.note.length > 500 ||
          typeof record.mood !== 'string' || (record.mood !== '' && !MOODS.includes(record.mood))) {
        throw new Error('В файле есть некорректные записи дневника.');
      }
      diary[day] = { mood: record.mood, note: record.note };
    }
    return { theme: data.theme, answers: [...data.answers], rituals, diary };
  }
  async function importData(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      $('storage-status').textContent = 'Файл слишком большой (максимум 2 МБ). Данные не изменены.';
      return;
    }
    let restored;
    try {
      restored = validateImport(JSON.parse(await file.text()));
    } catch (error) {
      $('storage-status').textContent = `${error instanceof SyntaxError ? 'Не удалось прочитать JSON.' : error.message} Данные не изменены.`;
      return;
    }
    if (!window.confirm('Восстановить данные из JSON? Текущие ответы, ритуалы, дневник и тема будут заменены. Сначала экспортируй текущие данные, если они нужны.')) {
      $('storage-status').textContent = 'Импорт отменён. Данные не изменены.';
      return;
    }
    try {
      // Сначала атомарно записываем в localStorage и только затем меняем состояние экрана.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
      storageAvailable = true;
    } catch (error) {
      storageAvailable = false;
      $('storage-status').textContent = 'Не удалось сохранить импорт в браузере. Текущие данные не изменены.';
      return;
    }
    state = restored;
    questionIndex = 0;
    selectedDate = todayKey();
    renderTheme();
    navigate('home');
    $('storage-status').textContent = 'Данные восстановлены из JSON и сохранены на этом устройстве.';
  }
  function clearData() {
    if (!window.confirm('Удалить все ответы анкеты, отметки ритуалов, заметки дневника и выбранную тему из этого браузера? Это действие нельзя отменить.')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) {
      $('storage-status').textContent = 'Браузер не позволил удалить сохранённые данные. Проверь его настройки.';
      return;
    }
    state = emptyState(); questionIndex = 0; selectedDate = todayKey();
    renderTheme(); navigate('home');
    $('storage-status').textContent = 'Локальные данные приложения удалены.';
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-go]');
    if (target) navigate(target.dataset.go);
  });
  $('theme-select').addEventListener('change', event => {
    state.theme = event.target.value === 'champagne' ? 'champagne' : 'quartz';
    renderTheme(); saveState();
  });
  $('quiz-back').addEventListener('click', () => { if (questionIndex > 0) { questionIndex--; renderQuestion(); } });
  $('quiz-next').addEventListener('click', () => {
    if (!state.answers[questionIndex]) { $('quiz-feedback').textContent = 'Выбери один вариант, чтобы продолжить.'; return; }
    if (questionIndex < QUESTIONS.length - 1) { questionIndex++; renderQuestion(); }
    else { saveState(); navigate('result'); }
  });
  $('quiz-restart').addEventListener('click', () => {
    state.answers = Array(7).fill(null); questionIndex = 0; saveState(); navigate('quiz');
  });
  $('diary-note').addEventListener('input', updateNoteLength);
  $('diary-form').addEventListener('submit', event => {
    event.preventDefault();
    const mood = document.querySelector('input[name="mood"]:checked')?.value || '';
    const note = $('diary-note').value.trim().slice(0, 500);
    if (!mood && !note) { $('diary-feedback').textContent = 'Выбери ощущение или добавь заметку.'; return; }
    state.diary[selectedDate] = { mood, note };
    const saved = saveState(); renderDiary();
    $('diary-feedback').textContent = saved ? 'Запись сохранена.' : 'Не удалось сохранить запись.';
  });
  $('delete-entry').addEventListener('click', () => {
    if (!window.confirm(`Очистить запись за ${formattedDate(selectedDate)}?`)) return;
    delete state.diary[selectedDate]; saveState(); renderDiary();
    $('diary-feedback').textContent = 'Запись очищена.';
  });
  $('export-data').addEventListener('click', exportData);
  $('import-data').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    try { await importData(file); } finally { event.target.value = ''; }
  });
  $('clear-data').addEventListener('click', clearData);
  renderTheme();
  if (!storageAvailable) $('storage-status').textContent = 'Локальное хранилище недоступно. Записи могут не сохраниться.';
  navigate('home');
})();
