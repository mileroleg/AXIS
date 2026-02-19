import { mockApi } from './mockApi.js';

const routes = {
  '/auth': { title: 'Авторизация', description: 'Вход по телефону (демо)', layout: 'plain' },
  '/role': { title: 'Выбор роли', description: 'Кто вы в системе AXIOS', layout: 'plain' },

  '/client': { title: 'Главная клиента', description: 'Сводка по клиентскому кабинету', layout: 'client' },
  '/client/search': { title: 'Поиск СТО', description: 'Поиск и фильтры сервисов', layout: 'client' },
  '/client/service/:id': { title: 'Карточка СТО', description: 'Информация о сервисе и окнах', layout: 'client' },
  '/client/request/:serviceId/:windowId': { title: 'Новая заявка', description: 'Форма запроса окна приёма', layout: 'client' },
  '/client/requests': { title: 'Мои заявки', description: 'Статусы отправленных заявок', layout: 'client' },

  '/sto': { title: 'Панель СТО', description: 'Краткая сводка СТО', layout: 'sto' },
  '/sto/windows': { title: 'Окна приёма', description: 'Управление окнами на день', layout: 'sto' },
  '/sto/requests': { title: 'Входящие заявки', description: 'Обработка запросов клиентов', layout: 'sto' },
  '/sto/profile': { title: 'Профиль СТО', description: 'Данные и настройки профиля', layout: 'sto' }
};

const clientNav = [
  { path: '/client/search', label: 'Поиск', icon: '🔎' },
  { path: '/client/requests', label: 'Заявки', icon: '📨' },
  { path: '/client', label: 'Профиль', icon: '👤' }
];

const stoNav = [
  { path: '/sto/windows', label: 'Окна', icon: '🗓️' },
  { path: '/sto/requests', label: 'Заявки', icon: '📥' },
  { path: '/sto/profile', label: 'Профиль', icon: '🏢' }
];

const STORAGE_KEYS = {
  users: 'axios_demo_users',
  authPhone: 'axios_demo_auth_phone',
  session: 'axios_demo_session'
};

const toDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const state = {
  clientSearch: {
    loading: false,
    filters: {
      hasWindowsToday: false,
      hasWindows24h: false
    },
    items: []
  },
  serviceDetails: {
    loading: false,
    serviceId: null,
    center: null,
    windowsToday: [],
    windowsTomorrow: []
  },
  requestForm: {
    loading: false,
    serviceId: null,
    windowId: null,
    center: null,
    window: null,
    error: ''
  },
  clientRequests: {
    loading: false,
    items: []
  },
  stoProfile: {
    loading: false,
    serviceCenterId: null,
    center: null,
    error: '',
    success: ''
  },
  stoWindows: {
    loading: false,
    serviceCenterId: null,
    date: toDateKey(),
    items: [],
    error: '',
    success: ''
  },
  stoRequests: {
    loading: false,
    serviceCenterId: null,
    items: [],
    error: '',
    success: ''
  }
};

const allPaths = Object.keys(routes);
const app = document.querySelector('#app');
if (!app) throw new Error('Не найден корневой контейнер приложения.');

const uid = () => `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const getUsers = () => readJson(STORAGE_KEYS.users, []);
const saveUsers = (users) => writeJson(STORAGE_KEYS.users, users);
const getSession = () => readJson(STORAGE_KEYS.session, null);

const getCurrentUser = () => {
  const session = getSession();
  if (!session?.userId) return null;
  return getUsers().find((item) => item.id === session.userId) ?? null;
};

const ensureStoForUser = async (user) => {
  if (!user || user.role !== 'sto') return user;
  if (user.serviceCenterId) return user;
  const centers = await mockApi.getServiceCenters();
  const fallback = centers[0];
  if (!fallback) return user;
  const nextUser = { ...user, serviceCenterId: fallback.id };
  updateUser(nextUser);
  return nextUser;
};

const updateUser = (updatedUser) => {
  const users = getUsers();
  saveUsers(users.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
};

const isRouteMatch = (routePath, currentPath) => {
  const routeParts = routePath.split('/').filter(Boolean);
  const pathParts = currentPath.split('/').filter(Boolean);
  if (routeParts.length !== pathParts.length) return false;
  return routeParts.every((part, index) => part.startsWith(':') || part === pathParts[index]);
};

const getMatchedRoute = (path) => allPaths.find((routePath) => isRouteMatch(routePath, path)) ?? '/auth';
const getActiveBottomItem = (path, items) => {
  const exact = items.find((item) => item.path === path);
  if (exact) return exact.path;
  if (path.startsWith('/client/service') || path.startsWith('/client/request')) return '/client/search';
  return items[0].path;
};
const cardClass = 'rounded-2xl bg-white p-4 shadow-sm';
const REQUEST_CATEGORIES = ['ТО/обслуживание', 'Диагностика', 'Слесарный ремонт', 'Электрика', 'Шины', 'Кузов', 'Другое'];

const getReliabilityBadges = (metrics) => {
  const badges = [];
  if (!metrics) return badges;
  if (typeof metrics.avgResponseMin === 'number' && metrics.avgResponseMin <= 30) badges.push('Быстро отвечает');
  if (typeof metrics.confirmRate === 'number' && metrics.confirmRate >= 70) badges.push('Надежно подтверждает');
  return badges;
};

const navigate = (path, replace = false) => {
  if (replace) history.replaceState({}, '', path);
  else history.pushState({}, '', path);
  render();
};

const routeButtonsHtml = (currentPath) => `
  <section class="${cardClass}">
    <h3 class="mb-2 text-sm font-semibold uppercase text-slate-500">Быстрые переходы (demo)</h3>
    <div class="grid grid-cols-2 gap-2">
      ${allPaths
        .map((path) => {
          const active = isRouteMatch(path, currentPath);
          return `<a href="${path}" class="min-h-12 rounded-xl border px-2 py-3 text-xs ${active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}">${path}</a>`;
        })
        .join('')}
    </div>
  </section>
`;

const bottomNavHtml = (items, currentPath) => {
  const activePath = getActiveBottomItem(currentPath, items);
  return `
    <nav class="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-slate-200 bg-white px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
      <ul class="grid grid-cols-3 gap-2">
        ${items
          .map((item) => {
            const active = item.path === activePath;
            return `<li><a href="${item.path}" class="flex min-h-12 flex-col items-center justify-center rounded-xl text-xs ${active ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600'}"><span>${item.icon}</span><span>${item.label}</span></a></li>`;
          })
          .join('')}
      </ul>
    </nav>
  `;
};

const authFormHtml = () => {
  const session = getSession();
  const savedPhone = localStorage.getItem(STORAGE_KEYS.authPhone) ?? '';

  if (session) {
    const user = getCurrentUser();
    return `
      <section class="${cardClass}">
        <h2 class="text-lg font-semibold">Вы уже вошли</h2>
        <p class="mt-1 text-sm text-slate-600">Телефон: ${user?.phone ?? 'не найден'}</p>
        <div class="mt-3 space-y-2">
          <a href="/role" class="flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white">Перейти к выбору роли</a>
          <button data-action="logout" class="w-full min-h-12 rounded-xl border border-slate-200 text-sm">Выйти из demo-сессии</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="${cardClass}">
      <h2 class="text-lg font-semibold">Демо-вход по телефону</h2>
      <p class="mt-1 text-sm text-slate-600">Реальных SMS нет. Введите телефон и любой 4-значный код.</p>
      <form id="phone-form" class="mt-4 space-y-3">
        <label class="block text-sm font-medium text-slate-700">Телефон</label>
        <input id="phone-input" type="tel" placeholder="+7 (999) 123-45-67" value="${savedPhone}" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-base outline-none focus:border-blue-500" />
        <button class="w-full min-h-12 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white">Получить код</button>
      </form>
      <form id="code-form" class="mt-4 space-y-3 ${savedPhone ? '' : 'hidden'}">
        <label class="block text-sm font-medium text-slate-700">Код из SMS (demo)</label>
        <input id="code-input" type="text" inputmode="numeric" maxlength="4" placeholder="1234" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-base outline-none focus:border-blue-500" />
        <button class="w-full min-h-12 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">Войти</button>
      </form>
      <p id="auth-error" class="mt-3 text-sm text-rose-600"></p>
    </section>
  `;
};

const roleSelectionHtml = () => {
  const user = getCurrentUser();
  if (!user) {
    return `<section class="${cardClass}"><h2 class="text-lg font-semibold">Сессия не найдена</h2><a href="/auth" class="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white">Перейти к авторизации</a></section>`;
  }

  return `
    <section class="${cardClass}">
      <h2 class="text-lg font-semibold">Выберите вашу роль</h2>
      <p class="mt-1 text-sm text-slate-600">Это можно будет изменить позже.</p>
      <div class="mt-4 grid gap-3">
        <button data-role="client" class="w-full rounded-2xl border border-slate-200 p-4 text-left"><p class="text-base font-semibold">Я автовладелец</p><p class="mt-1 text-sm text-slate-600">Хочу найти СТО и отправить запрос окна.</p></button>
        <button data-role="sto" class="w-full rounded-2xl border border-slate-200 p-4 text-left"><p class="text-base font-semibold">Я СТО</p><p class="mt-1 text-sm text-slate-600">Хочу управлять окнами и заявками.</p></button>
      </div>
      <p class="mt-3 text-xs text-slate-500">Текущий телефон: ${user.phone}</p>
    </section>
  `;
};

const formatNearestWindow = async (center) => {
  const windows = await mockApi.getWindowsByServiceCenter(center.id);
  const available = windows
    .filter((item) => item.capacityLeft > 0)
    .sort((a, b) => new Date(`${a.date}T${a.startTime}:00`) - new Date(`${b.date}T${b.startTime}:00`));
  const first = available[0];
  return first ? `${first.date}, ${first.startTime}–${first.endTime}` : 'Нет свободных окон';
};

const clientSearchHtml = () => {
  if (state.clientSearch.loading) {
    return `<section class="${cardClass}"><p class="text-sm text-slate-600">Загружаем список СТО…</p></section>`;
  }

  if (!state.clientSearch.items.length) {
    return `<section class="${cardClass}"><h2 class="text-lg font-semibold">СТО не найдены</h2><p class="mt-2 text-sm text-slate-600">Снимите фильтры или попробуйте позже.</p></section>`;
  }

  return `
    <section class="space-y-3">
      ${state.clientSearch.items
        .map(
          (item) => `
            <a href="/client/service/${item.id}" class="block ${cardClass}">
              <img src="${item.photo}" alt="${item.name}" class="h-32 w-full rounded-xl object-cover" />
              <div class="mt-3 flex items-start justify-between gap-3">
                <div>
                  <h3 class="text-base font-semibold">${item.name}</h3>
                  <p class="mt-1 text-sm text-slate-600">${item.addressText}</p>
                  <p class="mt-1 text-xs text-slate-500">~${item.distanceKm} км • ${item.nearestWindow}</p>
                  ${item.reliabilityBadges?.length ? `<div class="mt-2 flex flex-wrap gap-1">${item.reliabilityBadges.map((badge) => `<span class="rounded-full bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">${badge}</span>`).join('')}</div>` : ''}
                </div>
                <span class="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">Открыть</span>
              </div>
            </a>
          `
        )
        .join('')}
    </section>
  `;
};

const clientSearchSectionHtml = () => `
  <section class="${cardClass}">
    <h2 class="text-lg font-semibold">Поиск СТО</h2>
    <p class="mt-1 text-sm text-slate-600">Выберите фильтр и откройте карточку сервиса.</p>
    <div class="mt-3 grid grid-cols-2 gap-2">
      <button data-filter="today" class="min-h-12 rounded-xl border px-2 text-sm ${state.clientSearch.filters.hasWindowsToday ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}">Есть окна сегодня</button>
      <button data-filter="24h" class="min-h-12 rounded-xl border px-2 text-sm ${state.clientSearch.filters.hasWindows24h ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}">Есть окна 24ч</button>
    </div>
  </section>
`;


const serviceDetailsHtml = (path) => {
  const details = state.serviceDetails;
  if (details.loading) {
    return `<section class="${cardClass}"><p class="text-sm text-slate-600">Загружаем карточку СТО…</p></section>`;
  }

  if (!details.center) {
    return `<section class="${cardClass}"><h2 class="text-lg font-semibold">СТО не найдено</h2><p class="mt-2 text-sm text-slate-600">Вернитесь к поиску и выберите сервис из списка.</p><a href="/client/search" class="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white">К поиску СТО</a></section>`;
  }

  const windowsList = (items) => {
    if (!items.length) return '<p class="text-sm text-slate-500">Свободных окон нет.</p>';
    return `<div class="space-y-2">${items
      .map((win) => `<div class="rounded-xl border border-slate-200 p-3"><div class="flex items-center justify-between gap-2"><p class="text-sm font-medium">${win.startTime}–${win.endTime}</p><span class="text-xs text-slate-500">Мест: ${win.capacityLeft}/${win.capacityTotal}</span></div><p class="mt-1 text-xs text-slate-500">${win.note || 'Без комментария'}</p><a href="/client/request/${details.center.id}/${win.id}" class="mt-2 flex min-h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white">Запросить это окно</a></div>`)
      .join('')}</div>`;
  };

  return `
    <section class="${cardClass}">
      <img src="${details.center.photos?.[0] || 'https://picsum.photos/seed/sto-details/640/360'}" alt="${details.center.name}" class="h-40 w-full rounded-xl object-cover" />
      <h2 class="mt-3 text-lg font-semibold">${details.center.name}</h2>
      <p class="mt-1 text-sm text-slate-600">${details.center.addressText}</p>
      <p class="mt-1 text-xs text-slate-500">Средний ответ: ${typeof details.center.metrics?.avgResponseMin === 'number' ? `${details.center.metrics.avgResponseMin} мин` : 'нет данных'} • Подтверждения: ${typeof details.center.metrics?.confirmRate === 'number' ? `${details.center.metrics.confirmRate}%` : 'нет данных'}</p>
      ${getReliabilityBadges(details.center.metrics).length ? `<div class="mt-2 flex flex-wrap gap-1">${getReliabilityBadges(details.center.metrics).map((badge) => `<span class="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">${badge}</span>`).join('')}</div>` : ''}
      <p class="mt-1 text-sm text-slate-600">Часы: ${details.center.workingHours}</p>
      <p class="mt-1 text-sm text-slate-600">Оплата: ${(details.center.paymentMethods || []).join(', ') || 'Не указано'}</p>
      <p class="mt-2 text-sm text-slate-500">${details.center.description || 'Описание пока не добавлено.'}</p>
    </section>

    <section class="${cardClass}">
      <h3 class="text-base font-semibold">Окна приёма сегодня</h3>
      <div class="mt-2">${windowsList(details.windowsToday)}</div>
    </section>

    <section class="${cardClass}">
      <h3 class="text-base font-semibold">Окна приёма завтра</h3>
      <div class="mt-2">${windowsList(details.windowsTomorrow)}</div>
    </section>

    ${routeButtonsHtml(path)}
  `;
};


const requestFormHtml = () => {
  const data = state.requestForm;
  if (data.loading) return `<section class="${cardClass}"><p class="text-sm text-slate-600">Загружаем данные окна…</p></section>`;
  if (!data.center || !data.window) return `<section class="${cardClass}"><h2 class="text-lg font-semibold">Окно не найдено</h2><a href="/client/search" class="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white">К поиску СТО</a></section>`;

  return `
    <section class="${cardClass}">
      <h2 class="text-lg font-semibold">Запрос окна приёма</h2>
      <p class="mt-1 text-sm text-slate-600">${data.center.name}</p>
      <p class="mt-1 text-xs text-slate-500">${data.window.date} • ${data.window.startTime}–${data.window.endTime}</p>
      <form id="request-form" class="mt-3 space-y-3">
        <label class="block text-sm">Категория</label>
        <select id="request-category" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm">
          ${REQUEST_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}
        </select>

        <label class="block text-sm">Описание проблемы</label>
        <textarea id="request-description" rows="4" placeholder="Например: стук в подвеске на кочках" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"></textarea>

        <label class="block text-sm">Фото (опц., URL/текст)</label>
        <input id="request-media" type="text" placeholder="https://..." class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" />

        <button class="w-full min-h-12 rounded-xl bg-blue-600 text-sm font-semibold text-white">Отправить заявку</button>
      </form>
      <p id="request-error" class="mt-2 text-sm text-rose-600">${data.error || ''}</p>
    </section>
  `;
};

const clientRequestsHtml = () => {
  if (state.clientRequests.loading) return `<section class="${cardClass}"><p class="text-sm text-slate-600">Загружаем заявки…</p></section>`;
  if (!state.clientRequests.items.length) return `<section class="${cardClass}"><h2 class="text-lg font-semibold">Пока нет заявок</h2><p class="mt-1 text-sm text-slate-600">Создайте первую заявку из карточки СТО.</p><a href="/client/search" class="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white">Найти СТО</a></section>`;

  const statusMap = {
    sent: 'Отправлено',
    confirmed: 'Подтверждено',
    needs_info: 'Нужно уточнение',
    declined: 'Отклонено',
    cancelled: 'Отменено',
    done: 'Завершено'
  };

  return `<section class="space-y-3">${state.clientRequests.items.map((item) => `
    <article class="${cardClass}">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold">${item.serviceCenterName || 'СТО'}</h3>
        <span class="rounded-full bg-slate-100 px-2 py-1 text-xs">${statusMap[item.status] || item.status}</span>
      </div>
      <p class="mt-1 text-xs text-slate-500">${item.category}</p>
      <p class="mt-1 text-sm text-slate-700">${item.description}</p>
      <p class="mt-1 text-xs text-slate-500">Окно: ${item.windowLabel || '—'}</p>
      ${item.status === 'needs_info' ? `<div class="mt-2 space-y-2"><input data-reply-input="${item.id}" type="text" placeholder="Ответьте СТО..." class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" /><button data-reply-request="${item.id}" class="w-full min-h-12 rounded-xl border border-slate-300 text-sm">Отправить ответ</button></div>` : ''}
      ${item.status === 'confirmed' ? `<div class="mt-2 grid grid-cols-2 gap-2"><button data-call-phone="${item.serviceCenterPhone || ''}" class="min-h-12 rounded-xl border border-slate-300 text-sm">Позвонить</button><button data-message-phone="${item.serviceCenterPhone || ''}" class="min-h-12 rounded-xl border border-slate-300 text-sm">Написать</button></div>` : ''}
      ${item.status === 'declined' && item.declineReason ? `<p class="mt-2 text-xs text-rose-600">Причина: ${item.declineReason}</p>` : ''}
    </article>
  `).join('')}</section>`;
};



const stoRequestsHtml = () => {
  const { loading, items, error, success } = state.stoRequests;
  if (loading) return `<section class="${cardClass}"><p class="text-sm text-slate-600">Загружаем входящие заявки…</p></section>`;
  if (!items.length) return `<section class="${cardClass}"><h2 class="text-lg font-semibold">Входящих заявок нет</h2><p class="mt-1 text-sm text-slate-600">Когда клиенты отправят запросы, они появятся здесь.</p></section>`;

  const statusMap = {
    sent: 'Отправлено',
    confirmed: 'Подтверждено',
    needs_info: 'Нужно уточнение',
    declined: 'Отклонено',
    cancelled: 'Отменено',
    done: 'Завершено'
  };

  const declineOptions = mockApi.constants.DECLINE_REASONS.map((reason) => `<option value="${reason}">${reason}</option>`).join('');

  return `
    <section class="space-y-3">
      ${items
        .map(
          (item) => `<article class="${cardClass}">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-sm font-semibold">${item.category}</h3>
              <span class="rounded-full bg-slate-100 px-2 py-1 text-xs">${statusMap[item.status] || item.status}</span>
            </div>
            <p class="mt-1 text-sm text-slate-700">${item.description}</p>
            <p class="mt-2 text-xs text-slate-500">Клиент: ${item.clientPhone || 'не указан'}</p>
            <p class="mt-1 text-xs text-slate-500">Окно: ${item.windowLabel || '—'}</p>
            ${item.messages?.length ? `<div class="mt-2 rounded-xl bg-slate-50 p-2">${item.messages.slice(-2).map((message) => `<p class="text-xs text-slate-600">${message.from === 'sto' ? 'СТО' : 'Клиент'}: ${message.text}</p>`).join('')}</div>` : ''}
            ${(item.status === 'sent' || item.status === 'needs_info')
              ? `<div class="mt-3 space-y-2">
                  <button data-sto-action="confirm" data-request-id="${item.id}" class="w-full min-h-12 rounded-xl bg-emerald-600 text-sm font-semibold text-white">Подтвердить</button>
                  <input data-question-input="${item.id}" type="text" placeholder="Вопрос клиенту (для уточнения)" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" />
                  <button data-sto-action="needs_info" data-request-id="${item.id}" class="w-full min-h-12 rounded-xl border border-amber-300 text-sm">Уточнить</button>
                  <select data-decline-reason="${item.id}" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm">${declineOptions}</select>
                  <button data-sto-action="decline" data-request-id="${item.id}" class="w-full min-h-12 rounded-xl border border-rose-300 text-sm text-rose-700">Отклонить</button>
                </div>`
              : ''}
            ${item.status === 'declined' && item.declineReason ? `<p class="mt-2 text-xs text-rose-600">Причина: ${item.declineReason}</p>` : ''}
          </article>`
        )
        .join('')}
      <p class="text-sm text-rose-600">${error || ''}</p>
      <p class="text-sm text-emerald-600">${success || ''}</p>
    </section>
  `;
};

const stoProfileHtml = () => {
  const { loading, center, error, success } = state.stoProfile;
  if (loading) return `<section class="${cardClass}"><p class="text-sm text-slate-600">Загружаем профиль СТО…</p></section>`;
  if (!center) return `<section class="${cardClass}"><h2 class="text-lg font-semibold">Профиль СТО не найден</h2><p class="mt-1 text-sm text-slate-600">Проверьте роль и привязку СТО к аккаунту.</p></section>`;

  return `
    <section class="${cardClass}">
      <h2 class="text-lg font-semibold">Профиль СТО</h2>
      <p class="mt-1 text-sm text-slate-600">Минимальные поля для demo режима.</p>
      <form id="sto-profile-form" class="mt-3 space-y-3">
        <input id="sto-name" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" value="${center.name || ''}" placeholder="Название" />
        <input id="sto-phone" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" value="${center.phone || ''}" placeholder="Телефон" />
        <input id="sto-address" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" value="${center.addressText || ''}" placeholder="Адрес" />
        <input id="sto-hours" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" value="${center.workingHours || ''}" placeholder="Часы работы" />
        <input id="sto-payments" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" value="${(center.paymentMethods || []).join(', ')}" placeholder="Наличные, Карта" />
        <textarea id="sto-description" rows="3" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Описание">${center.description || ''}</textarea>
        <input id="sto-photos" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" value="${(center.photos || []).join(', ')}" placeholder="URL фото через запятую" />
        <button class="w-full min-h-12 rounded-xl bg-blue-600 text-sm font-semibold text-white">Сохранить профиль</button>
      </form>
      <p id="sto-profile-error" class="mt-2 text-sm text-rose-600">${error || ''}</p>
      <p id="sto-profile-success" class="mt-1 text-sm text-emerald-600">${success || ''}</p>
    </section>
  `;
};

const stoWindowsHtml = () => {
  const { loading, date, items, error, success } = state.stoWindows;

  return `
    <section class="${cardClass}">
      <h2 class="text-lg font-semibold">Окна приёма на день</h2>
      <p class="mt-1 text-sm text-slate-600">Добавляйте и удаляйте окна приёма для выбранной даты.</p>

      <label class="mt-3 block text-sm font-medium text-slate-700">Дата</label>
      <input id="sto-windows-date" type="date" value="${date}" class="mt-1 w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" />

      ${loading ? '<p class="mt-3 text-sm text-slate-600">Загружаем окна…</p>' : ''}
      ${!loading && !items.length ? '<p class="mt-3 text-sm text-slate-500">На выбранную дату окон пока нет.</p>' : ''}
      ${!loading && items.length
        ? `<div class="mt-3 space-y-2">${items
            .map(
              (item) => `<article class="rounded-xl border border-slate-200 p-3"><div class="flex items-start justify-between gap-2"><div><p class="text-sm font-semibold">${item.startTime}–${item.endTime}</p><p class="mt-1 text-xs text-slate-500">Мест: ${item.capacityLeft}/${item.capacityTotal}</p><p class="mt-1 text-xs text-slate-500">${item.note || 'Без комментария'}</p></div><button data-delete-window="${item.id}" class="min-h-12 rounded-xl border border-rose-200 px-3 text-xs text-rose-700">Удалить</button></div></article>`
            )
            .join('')}</div>`
        : ''}
    </section>

    <section class="${cardClass}">
      <h3 class="text-base font-semibold">Добавить окно</h3>
      <form id="sto-window-form" class="mt-3 space-y-3">
        <div class="grid grid-cols-2 gap-2">
          <input id="sto-window-start" type="time" class="min-h-12 rounded-xl border border-slate-300 px-3 text-sm" required />
          <input id="sto-window-end" type="time" class="min-h-12 rounded-xl border border-slate-300 px-3 text-sm" required />
        </div>
        <input id="sto-window-capacity" type="number" min="1" max="10" placeholder="Емкость (1-10)" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" required />
        <input id="sto-window-note" type="text" placeholder="Комментарий (опц.)" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" />
        <button class="w-full min-h-12 rounded-xl bg-blue-600 text-sm font-semibold text-white">Добавить окно</button>
      </form>
      <p class="mt-2 text-sm text-rose-600">${error || ''}</p>
      <p class="mt-1 text-sm text-emerald-600">${success || ''}</p>
    </section>
  `;
};

const layoutHtml = (route, path) => {
  const defaultBody = `
    <section class="${cardClass}">
      <h2 class="text-lg font-semibold">${route.title}</h2>
      <p class="mt-1 text-sm text-slate-600">${route.description}</p>
      <p class="mt-3 text-sm text-slate-500">Текущий путь: <span class="font-medium text-slate-700">${path}</span></p>
    </section>
    ${routeButtonsHtml(path)}
  `;

  const mainBody = path === '/auth'
    ? `${authFormHtml()}${routeButtonsHtml(path)}`
    : path === '/role'
      ? `${roleSelectionHtml()}${routeButtonsHtml(path)}`
      : path === '/client/search'
        ? `${clientSearchSectionHtml()}${clientSearchHtml()}`
        : path.startsWith('/client/service/')
          ? serviceDetailsHtml(path)
          : path.startsWith('/client/request/')
            ? requestFormHtml()
            : path === '/client/requests'
              ? clientRequestsHtml()
              : path === '/sto/windows'
                ? stoWindowsHtml()
              : path === '/sto/requests'
                ? stoRequestsHtml()
              : path === '/sto/profile'
                ? stoProfileHtml()
                : defaultBody;

  if (route.layout === 'client') {
    return `<main class="mx-auto min-h-screen max-w-md bg-slate-100 px-4 pb-28 pt-4"><header class="mb-3 ${cardClass}"><h1 class="text-xl font-bold">AXIOS · Клиент</h1><p class="mt-1 text-sm text-slate-600">ClientLayout + нижняя навигация</p></header><div class="space-y-3">${mainBody}</div></main>${bottomNavHtml(clientNav, path)}`;
  }
  if (route.layout === 'sto') {
    return `<main class="mx-auto min-h-screen max-w-md bg-slate-100 px-4 pb-28 pt-4"><header class="mb-3 ${cardClass}"><h1 class="text-xl font-bold">AXIOS · СТО</h1><p class="mt-1 text-sm text-slate-600">StoLayout + нижняя навигация</p></header><div class="space-y-3">${mainBody}</div></main>${bottomNavHtml(stoNav, path)}`;
  }
  return `<main class="mx-auto min-h-screen max-w-md bg-slate-100 px-4 py-4"><header class="mb-3 ${cardClass}"><h1 class="text-xl font-bold">AXIOS Demo</h1><p class="mt-1 text-sm text-slate-600">Прототип в demo-режиме</p></header><div class="space-y-3">${mainBody}</div></main>`;
};

const loadClientSearch = async () => {
  state.clientSearch.loading = true;
  render();

  const centers = await mockApi.searchServiceCenters(state.clientSearch.filters);
  const enriched = await Promise.all(
    centers.map(async (center, index) => ({
      ...center,
      photo: center.photos?.[0] || 'https://picsum.photos/seed/fallback/640/360',
      distanceKm: (1.2 + index * 0.8).toFixed(1),
      nearestWindow: await formatNearestWindow(center),
      reliabilityBadges: getReliabilityBadges(center.metrics)
    }))
  );

  state.clientSearch.items = enriched;
  state.clientSearch.loading = false;
  render();
};


const loadServiceDetails = async (path) => {
  const serviceId = path.split('/')[3] || null;
  if (!serviceId) return;
  if (state.serviceDetails.serviceId === serviceId && state.serviceDetails.center) return;

  state.serviceDetails = {
    loading: true,
    serviceId,
    center: null,
    windowsToday: [],
    windowsTomorrow: []
  };
  render();

  const center = await mockApi.getServiceCenter(serviceId);
  const today = toDateKey();
  const tomorrow = toDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const windowsToday = await mockApi.getWindowsByServiceCenter(serviceId, today);
  const windowsTomorrow = await mockApi.getWindowsByServiceCenter(serviceId, tomorrow);

  state.serviceDetails = {
    loading: false,
    serviceId,
    center,
    windowsToday,
    windowsTomorrow
  };
  render();
};


const loadRequestForm = async (path) => {
  const [, , , serviceId, windowId] = path.split('/');
  if (!serviceId || !windowId) return;

  state.requestForm = { loading: true, serviceId, windowId, center: null, window: null, error: '' };
  render();

  const center = await mockApi.getServiceCenter(serviceId);
  const windows = await mockApi.getWindowsByServiceCenter(serviceId);
  const window = windows.find((item) => item.id === windowId) ?? null;

  state.requestForm = { loading: false, serviceId, windowId, center, window, error: '' };
  render();
};

const loadClientRequests = async () => {
  const user = getCurrentUser();
  if (!user) return;

  state.clientRequests.loading = true;
  render();

  const [requests, centers] = await Promise.all([mockApi.listClientRequests(user.id), mockApi.getServiceCenters()]);
  const centerById = Object.fromEntries(centers.map((item) => [item.id, item]));

  const items = await Promise.all(
    requests.map(async (request) => {
      const windows = await mockApi.getWindowsByServiceCenter(request.serviceCenterId);
      const selected = windows.find((win) => win.id === request.windowId);
      const center = centerById[request.serviceCenterId];
      return {
        ...request,
        serviceCenterName: center?.name,
        serviceCenterPhone: center?.phone,
        windowLabel: selected ? `${selected.date}, ${selected.startTime}–${selected.endTime}` : '—'
      };
    })
  );

  state.clientRequests.items = items;
  state.clientRequests.loading = false;
  render();
};


const loadStoProfile = async () => {
  const user = getCurrentUser();
  if (!user) return;
  const ensured = await ensureStoForUser(user);
  if (!ensured.serviceCenterId) return;

  state.stoProfile.loading = true;
  state.stoProfile.error = '';
  state.stoProfile.success = '';
  render();

  const center = await mockApi.getServiceCenter(ensured.serviceCenterId);
  state.stoProfile = {
    loading: false,
    serviceCenterId: ensured.serviceCenterId,
    center,
    error: '',
    success: ''
  };
  render();
};

const loadStoWindows = async () => {
  const user = getCurrentUser();
  if (!user) return;
  const ensured = await ensureStoForUser(user);
  if (!ensured.serviceCenterId) return;

  state.stoWindows.loading = true;
  state.stoWindows.error = '';
  state.stoWindows.success = '';
  state.stoWindows.serviceCenterId = ensured.serviceCenterId;
  render();

  const windows = await mockApi.getWindowsByServiceCenter(ensured.serviceCenterId, state.stoWindows.date);
  state.stoWindows.items = windows.sort((a, b) => `${a.startTime}`.localeCompare(`${b.startTime}`));
  state.stoWindows.loading = false;
  render();
};


const loadStoRequests = async () => {
  const user = getCurrentUser();
  if (!user) return;
  const ensured = await ensureStoForUser(user);
  if (!ensured.serviceCenterId) return;

  state.stoRequests.loading = true;
  state.stoRequests.error = '';
  state.stoRequests.success = '';
  state.stoRequests.serviceCenterId = ensured.serviceCenterId;
  render();

  const [requests, windows] = await Promise.all([
    mockApi.listStoRequests(ensured.serviceCenterId),
    mockApi.getWindowsByServiceCenter(ensured.serviceCenterId)
  ]);
  const usersById = Object.fromEntries(getUsers().map((item) => [item.id, item]));
  const windowsById = Object.fromEntries(windows.map((item) => [item.id, item]));

  state.stoRequests.items = requests.map((request) => {
    const win = windowsById[request.windowId];
    return {
      ...request,
      clientPhone: usersById[request.clientId]?.phone || '',
      windowLabel: win ? `${win.date}, ${win.startTime}–${win.endTime}` : '—'
    };
  });
  state.stoRequests.loading = false;
  render();
};

const bindStoRequestsActions = () => {
  app.querySelectorAll('[data-sto-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const requestId = button.getAttribute('data-request-id');
      const action = button.getAttribute('data-sto-action');
      if (!requestId || !action) return;

      state.stoRequests.error = '';
      state.stoRequests.success = '';

      if (action == 'confirm') {
        await mockApi.updateRequestStatus(requestId, { status: 'confirmed' });
        state.stoRequests.success = 'Заявка подтверждена.';
      }

      if (action == 'needs_info') {
        const input = app.querySelector(`[data-question-input="${requestId}"]`);
        const text = input?.value?.trim() || 'Пожалуйста, уточните детали проблемы.';
        await mockApi.updateRequestStatus(requestId, { status: 'needs_info', messageText: text, messageFrom: 'sto' });
        state.stoRequests.success = 'Запрошено уточнение у клиента.';
      }

      if (action == 'decline') {
        const select = app.querySelector(`[data-decline-reason="${requestId}"]`);
        const reason = select?.value || 'Другое';
        await mockApi.updateRequestStatus(requestId, { status: 'declined', declineReason: reason });
        state.stoRequests.success = 'Заявка отклонена.';
      }

      loadStoRequests();
    });
  });
};

const bindStoProfileActions = () => {
  const form = app.querySelector('#sto-profile-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const centerId = state.stoProfile.serviceCenterId;
    if (!centerId) return;

    const payload = {
      name: app.querySelector('#sto-name')?.value?.trim() || '',
      phone: app.querySelector('#sto-phone')?.value?.trim() || '',
      addressText: app.querySelector('#sto-address')?.value?.trim() || '',
      workingHours: app.querySelector('#sto-hours')?.value?.trim() || '',
      paymentMethods: (app.querySelector('#sto-payments')?.value || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 4),
      description: app.querySelector('#sto-description')?.value?.trim() || '',
      photos: (app.querySelector('#sto-photos')?.value || '').split(',').map((x) => x.trim()).filter(Boolean)
    };

    if (!payload.name || !payload.phone || !payload.addressText) {
      state.stoProfile.error = 'Заполните название, телефон и адрес.';
      state.stoProfile.success = '';
      render();
      return;
    }

    const updated = await mockApi.updateServiceCenter(centerId, payload);
    state.stoProfile.center = updated;
    state.stoProfile.error = '';
    state.stoProfile.success = 'Профиль сохранён.';
    render();
  });
};

const bindStoWindowsActions = () => {
  const dateInput = app.querySelector('#sto-windows-date');
  const form = app.querySelector('#sto-window-form');

  if (dateInput) {
    dateInput.addEventListener('change', () => {
      state.stoWindows.date = dateInput.value || toDateKey();
      loadStoWindows();
    });
  }

  app.querySelectorAll('[data-delete-window]').forEach((button) => {
    button.addEventListener('click', async () => {
      const windowId = button.getAttribute('data-delete-window');
      if (!windowId) return;
      await mockApi.deleteWindow(windowId);
      state.stoWindows.success = 'Окно удалено.';
      state.stoWindows.error = '';
      loadStoWindows();
    });
  });

  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const serviceCenterId = state.stoWindows.serviceCenterId;
    if (!serviceCenterId) return;

    const startTime = app.querySelector('#sto-window-start')?.value || '';
    const endTime = app.querySelector('#sto-window-end')?.value || '';
    const capacityTotal = Number(app.querySelector('#sto-window-capacity')?.value || 0);
    const note = app.querySelector('#sto-window-note')?.value?.trim() || '';

    if (!startTime || !endTime) {
      state.stoWindows.error = 'Укажите время начала и окончания.';
      state.stoWindows.success = '';
      return render();
    }
    if (startTime >= endTime) {
      state.stoWindows.error = 'Время окончания должно быть позже начала.';
      state.stoWindows.success = '';
      return render();
    }
    if (!Number.isInteger(capacityTotal) || capacityTotal < 1 || capacityTotal > 10) {
      state.stoWindows.error = 'Емкость должна быть целым числом от 1 до 10.';
      state.stoWindows.success = '';
      return render();
    }

    await mockApi.createWindow({
      serviceCenterId,
      date: state.stoWindows.date,
      startTime,
      endTime,
      capacityTotal,
      note
    });

    state.stoWindows.error = '';
    state.stoWindows.success = 'Окно добавлено.';
    form.reset();
    loadStoWindows();
  });
};

const bindAuthActions = () => {
  const phoneForm = app.querySelector('#phone-form');
  const codeForm = app.querySelector('#code-form');
  const errorBox = app.querySelector('#auth-error');
  const logoutBtn = app.querySelector('[data-action="logout"]');

  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.session);
    localStorage.removeItem(STORAGE_KEYS.authPhone);
    render();
  });

  if (!phoneForm || !codeForm || !errorBox) return;

  phoneForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const phone = app.querySelector('#phone-input')?.value?.trim() ?? '';
    if (phone.length < 10) return (errorBox.textContent = 'Введите корректный номер телефона (минимум 10 символов).');
    localStorage.setItem(STORAGE_KEYS.authPhone, phone);
    codeForm.classList.remove('hidden');
    errorBox.textContent = 'Код отправлен (демо). Введите любой 4-значный код.';
  });

  codeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const phone = localStorage.getItem(STORAGE_KEYS.authPhone) ?? '';
    const code = app.querySelector('#code-input')?.value?.trim() ?? '';
    if (!/^\d{4}$/.test(code)) return (errorBox.textContent = 'Код должен содержать 4 цифры.');

    const users = getUsers();
    let user = users.find((item) => item.phone === phone);
    if (!user) {
      user = { id: uid(), role: null, phone, createdAt: new Date().toISOString() };
      users.push(user);
      saveUsers(users);
    }

    writeJson(STORAGE_KEYS.session, { userId: user.id });
    navigate('/role');
  });
};

const bindRoleActions = () => {
  app.querySelectorAll('[data-role]').forEach((button) => {
    button.addEventListener('click', async () => {
      const targetRole = button.getAttribute('data-role');
      if (!targetRole) return;
      const user = getCurrentUser();
      if (!user) return navigate('/auth');

      const updated = { ...user, role: targetRole };
      updateUser(updated);
      const nextUser = await ensureStoForUser(updated);
      navigate(nextUser.role === 'sto' ? '/sto/windows' : '/client/search');
    });
  });
};


const bindRequestFormActions = () => {
  const form = app.querySelector('#request-form');
  const errorBox = app.querySelector('#request-error');
  if (!form || !errorBox) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const user = getCurrentUser();
    if (!user) return navigate('/auth');

    const category = app.querySelector('#request-category')?.value || '';
    const description = app.querySelector('#request-description')?.value?.trim() || '';
    const media = app.querySelector('#request-media')?.value?.trim() || '';

    if (!category || !description) {
      errorBox.textContent = 'Заполните категорию и описание.';
      return;
    }

    await mockApi.createRequest({
      serviceCenterId: state.requestForm.serviceId,
      clientId: user.id,
      windowId: state.requestForm.windowId,
      category,
      description,
      media: media ? [media] : []
    });

    navigate('/client/requests');
  });
};

const bindClientRequestsActions = () => {
  app.querySelectorAll('[data-reply-request]').forEach((button) => {
    button.addEventListener('click', async () => {
      const requestId = button.getAttribute('data-reply-request');
      const input = app.querySelector(`[data-reply-input="${requestId}"]`);
      const text = input?.value?.trim() || '';
      if (!requestId || !text) return;

      await mockApi.updateRequestStatus(requestId, { messageText: text, messageFrom: 'client' });
      loadClientRequests();
    });
  });

  app.querySelectorAll('[data-call-phone]').forEach((button) => {
    button.addEventListener('click', async () => {
      const phone = button.getAttribute('data-call-phone') || 'Номер недоступен';
      alert(`Позвонить: ${phone}`);
    });
  });

  app.querySelectorAll('[data-message-phone]').forEach((button) => {
    button.addEventListener('click', async () => {
      const phone = button.getAttribute('data-message-phone') || 'Номер недоступен';
      alert(`Написать в мессенджер: ${phone}`);
    });
  });
};

const bindClientSearchActions = () => {
  app.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', async () => {
      const filter = button.getAttribute('data-filter');
      if (filter === 'today') {
        state.clientSearch.filters.hasWindowsToday = !state.clientSearch.filters.hasWindowsToday;
        if (state.clientSearch.filters.hasWindowsToday) state.clientSearch.filters.hasWindows24h = false;
      }
      if (filter === '24h') {
        state.clientSearch.filters.hasWindows24h = !state.clientSearch.filters.hasWindows24h;
        if (state.clientSearch.filters.hasWindows24h) state.clientSearch.filters.hasWindowsToday = false;
      }
      loadClientSearch();
    });
  });
};

const attachNavigation = () => {
  app.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const href = event.currentTarget?.getAttribute?.('href');
      if (!href) return;
      navigate(href);
    });
  });
};

const applyRouteGuards = (path) => {
  const session = getSession();
  const user = getCurrentUser();

  if (!session && path !== '/auth') return '/auth';
  if (session && !user?.role && !['/auth', '/role'].includes(path)) return '/role';
  if (user?.role === 'client' && path.startsWith('/sto')) return '/client/search';
  if (user?.role === 'sto' && path.startsWith('/client')) return '/sto/windows';
  return path;
};

const render = () => {
  const current = window.location.pathname === '/' ? '/auth' : window.location.pathname;
  const guardedPath = applyRouteGuards(current);
  if (guardedPath !== current) return navigate(guardedPath, true);

  const matchedRoutePath = getMatchedRoute(guardedPath);
  app.innerHTML = layoutHtml(routes[matchedRoutePath], guardedPath);
  attachNavigation();

  if (guardedPath === '/auth') bindAuthActions();
  if (guardedPath === '/role') bindRoleActions();
  if (guardedPath === '/client/search') {
    bindClientSearchActions();
    if (!state.clientSearch.items.length && !state.clientSearch.loading) loadClientSearch();
  }

  if (guardedPath.startsWith('/client/service/')) {
    loadServiceDetails(guardedPath);
  } else if (state.serviceDetails.serviceId) {
    state.serviceDetails = { loading: false, serviceId: null, center: null, windowsToday: [], windowsTomorrow: [] };
  }

  if (guardedPath.startsWith('/client/request/')) {
    bindRequestFormActions();
    if (!state.requestForm.window || state.requestForm.windowId !== guardedPath.split('/')[4]) loadRequestForm(guardedPath);
  }

  if (guardedPath === '/client/requests') {
    bindClientRequestsActions();
    if (!state.clientRequests.items.length && !state.clientRequests.loading) loadClientRequests();
  }

  if (guardedPath === '/sto/profile') {
    bindStoProfileActions();
    if (!state.stoProfile.center && !state.stoProfile.loading) loadStoProfile();
  }

  if (guardedPath === '/sto/windows') {
    bindStoWindowsActions();
    if (!state.stoWindows.items.length && !state.stoWindows.loading) loadStoWindows();
  }

  if (guardedPath === '/sto/requests') {
    bindStoRequestsActions();
    if (!state.stoRequests.items.length && !state.stoRequests.loading) loadStoRequests();
  }
};

window.addEventListener('popstate', render);
mockApi.ensureSeed().finally(render);
