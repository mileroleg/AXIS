import { mockApi } from './mockApi.js';

const routes = {
  '/auth': { title: 'Авторизация', description: 'Вход по телефону (демо)', layout: 'plain' },
  '/role': { title: 'Выбор роли', description: 'Кто вы в системе AXIOS', layout: 'plain' },
  '/demo': { title: 'Demo Panel', description: 'Управление demo-данными и быстрые входы', layout: 'plain' },
  '/o/:token': { title: 'Заказ-наряд', description: 'Публичный просмотр заказ-наряда', layout: 'plain' },

  '/client': { title: 'Главная клиента', description: 'Сводка по клиентскому кабинету', layout: 'client' },
  '/client/search': { title: 'Поиск СТО', description: 'Поиск и фильтры сервисов', layout: 'client' },
  '/client/service/:id': { title: 'Карточка СТО', description: 'Информация о сервисе и окнах', layout: 'client' },
  '/client/request/:serviceId/:windowId': { title: 'Новая заявка', description: 'Форма запроса окна приёма', layout: 'client' },
  '/client/requests': { title: 'Мои заявки', description: 'Статусы отправленных заявок', layout: 'client' },

  '/sto': { title: 'Панель СТО', description: 'Краткая сводка СТО', layout: 'sto' },
  '/sto/windows': { title: 'Окна приёма', description: 'Управление окнами на день', layout: 'sto' },
  '/sto/requests': { title: 'Входящие заявки', description: 'Обработка запросов клиентов', layout: 'sto' },
  '/sto/profile': { title: 'Профиль СТО', description: 'Данные и настройки профиля', layout: 'sto' },
  '/sto/workorders': { title: 'Заказ-наряды', description: 'Список заказ-нарядов СТО', layout: 'sto' },
  '/sto/workorder/:id': { title: 'Заказ-наряд', description: 'Редактирование заказ-наряда', layout: 'sto' }
};

const clientNav = [
  { path: '/client/search', label: 'Поиск', icon: '🔎' },
  { path: '/client/requests', label: 'Заявки', icon: '📨' },
  { path: '/client', label: 'Профиль', icon: '👤' }
];

const stoNav = [
  { path: '/sto/windows', label: 'Окна', icon: '🗓️' },
  { path: '/sto/requests', label: 'Заявки', icon: '📥' },
  { path: '/sto/workorders', label: 'Наряды', icon: '🧾' },
  { path: '/sto/profile', label: 'Профиль', icon: '🏢' }
];

const STORAGE_KEYS = {
  users: 'axios_demo_users',
  authPhone: 'axios_demo_auth_phone',
  session: 'axios_demo_session',
  fixedDateEnabled: 'axios_demo_fixed_date_enabled',
  fixedDateValue: 'axios_demo_fixed_date_value',
  demoHint: 'axios_demo_demo_hint',
  events: 'axios_demo_events',
  clientSearchView: 'axios_demo_client_search_view'
};

const getNow = () => {
  const fixedEnabled = localStorage.getItem(STORAGE_KEYS.fixedDateEnabled) === '1';
  const fixedDateValue = localStorage.getItem(STORAGE_KEYS.fixedDateValue);
  if (fixedEnabled && fixedDateValue && /^\d{4}-\d{2}-\d{2}$/.test(fixedDateValue)) return new Date(`${fixedDateValue}T12:00:00`);
  return new Date();
};

const toDateKey = (date = getNow()) => date.toISOString().slice(0, 10);


const getClientSearchViewFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('view');
  if (fromQuery === 'map' || fromQuery === 'list') return fromQuery;
  const fromStorage = localStorage.getItem(STORAGE_KEYS.clientSearchView);
  return fromStorage === 'map' ? 'map' : 'list';
};

const setClientSearchView = (mode) => {
  const next = mode === 'map' ? 'map' : 'list';
  localStorage.setItem(STORAGE_KEYS.clientSearchView, next);
  const url = new URL(window.location.href);
  if (next === 'map') url.searchParams.set('view', 'map');
  else url.searchParams.delete('view');
  history.replaceState({}, '', `${url.pathname}${url.search}`);
  state.clientSearch.viewMode = next;
};

const state = {
  clientSearch: {
    loading: false,
    filters: {
      hasWindowsToday: false,
      hasWindows24h: false,
      cluster: 'podolsk',
      radiusKm: 10
    },
    viewMode: getClientSearchViewFromLocation(),
    mapCenter: SEARCH_CLUSTERS.podolsk.center,
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
  },
  stoWorkOrderEditor: {
    loading: false,
    orderId: null,
    order: null,
    center: null,
    error: '',
    success: ''
  },
  stoWorkOrders: {
    loading: false,
    serviceCenterId: null,
    filter: 'all',
    items: [],
    error: ''
  },
  publicWorkOrder: {
    loading: false,
    token: null,
    order: null,
    center: null
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

const getEvents = () => readJson(STORAGE_KEYS.events, []);
const logEvent = (type, payload = {}) => {
  const events = getEvents();
  events.push({ id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`, type, at: new Date().toISOString(), payload });
  writeJson(STORAGE_KEYS.events, events.slice(-1000));
};

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

const upsertUserByRole = async (role) => {
  const users = getUsers();
  const existing = users.find((item) => item.role === role);
  if (existing) return role === 'sto' ? ensureStoForUser(existing) : existing;

  const newUser = {
    id: uid(),
    role,
    phone: role === 'sto' ? '+7 (900) 000-00-99' : '+7 (900) 000-00-11',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);
  return role === 'sto' ? ensureStoForUser(newUser) : newUser;
};

const getScenarioCenter = async () => {
  const centers = await mockApi.getServiceCenters();
  return centers.find((item) => (item.name || '').toLowerCase().includes('шиномонтаж')) || centers[0] || null;
};

const ensureWindowForCenter = async (centerId) => {
  const today = toDateKey();
  const windows = await mockApi.getWindowsByServiceCenter(centerId, today);
  const available = windows.find((item) => item.capacityLeft > 0) || windows[0];
  if (available) return available;

  return mockApi.createWindow({
    serviceCenterId: centerId,
    date: today,
    startTime: '11:00',
    endTime: '12:00',
    capacityTotal: 2,
    note: 'Сценарий demo'
  });
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

const SEARCH_CLUSTERS = {
  podolsk: { label: 'Подольск', center: [37.5451, 55.4311] },
  vnukovo: { label: 'Солнцево / Внуково', center: [37.3811, 55.6372] }
};
const RADIUS_OPTIONS = [3, 5, 10, 20];

const distanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getReliabilityBadges = (metrics) => {
  const badges = [];
  if (!metrics) return badges;
  if (typeof metrics.avgResponseMin === 'number' && metrics.avgResponseMin <= 30) badges.push('Быстро отвечает');
  if (typeof metrics.confirmRate === 'number' && metrics.confirmRate >= 70) badges.push('Надежно подтверждает');
  return badges;
};

const getWaitingMinutes = (createdAt) => {
  if (!createdAt) return 0;
  return Math.max(0, Math.floor((getNow().getTime() - new Date(createdAt).getTime()) / 60000));
};

const navigate = (path, replace = false) => {
  if (replace) history.replaceState({}, '', path);
  else history.pushState({}, '', path);
  safeRender();
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
      <ul class="grid gap-2" style="grid-template-columns: repeat(${items.length}, minmax(0, 1fr));">
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

const demoPanelHtml = () => {
  const fixedEnabled = localStorage.getItem(STORAGE_KEYS.fixedDateEnabled) === '1';
  const fixedDateValue = localStorage.getItem(STORAGE_KEYS.fixedDateValue) || toDateKey();

  return `
    <section class="${cardClass}">
      <h2 class="text-lg font-semibold">Demo Panel</h2>
      <p class="mt-1 text-sm text-slate-600">Быстрое управление демо без ручной чистки localStorage.</p>

      <div class="mt-3 space-y-2">
        <button data-demo-action="reset" class="w-full min-h-12 rounded-xl border border-rose-300 text-sm text-rose-700">Reset demo data</button>
        <button data-demo-action="login-client" class="w-full min-h-12 rounded-xl bg-blue-600 text-sm font-semibold text-white">Login as Client</button>
        <button data-demo-action="login-sto" class="w-full min-h-12 rounded-xl bg-slate-900 text-sm font-semibold text-white">Login as STO</button>
        <button data-demo-action="export-events" class="w-full min-h-12 rounded-xl border border-slate-300 text-sm">Export events</button>
      </div>
    </section>

    <section class="${cardClass}">
      <h3 class="text-base font-semibold">Сценарии демо</h3>
      <div class="mt-3 space-y-2">
        <button data-demo-action="scenario-tire" class="w-full min-h-12 rounded-xl border border-slate-300 text-sm">Scenario: срочно шиномонтаж</button>
        <button data-demo-action="scenario-waiting" class="w-full min-h-12 rounded-xl border border-slate-300 text-sm">Scenario: заявка ждёт ответа</button>
        <button data-demo-action="scenario-needs-info" class="w-full min-h-12 rounded-xl border border-slate-300 text-sm">Scenario: needs_info</button>
      </div>
    </section>

    <section class="${cardClass}">
      <h3 class="text-base font-semibold">Use fixed date</h3>
      <p class="mt-1 text-xs text-slate-500">Фиксирует «сегодня/завтра» для стабильного демо.</p>
      <label class="mt-3 flex min-h-12 items-center justify-between rounded-xl border border-slate-200 px-3">
        <span class="text-sm">Включить фиксированную дату</span>
        <input id="demo-fixed-enabled" type="checkbox" ${fixedEnabled ? 'checked' : ''} />
      </label>
      <input id="demo-fixed-date" type="date" value="${fixedDateValue}" class="mt-2 w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" ${fixedEnabled ? '' : 'disabled'} />
      <button data-demo-action="save-fixed-date" class="mt-2 w-full min-h-12 rounded-xl border border-slate-300 text-sm">Сохранить fixed date</button>
      <p class="mt-2 text-xs text-slate-500">Текущий режим: ${fixedEnabled ? `фиксированная дата ${fixedDateValue}` : 'реальная текущая дата'}</p>
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
    return `<section class="${cardClass}"><p class="text-sm text-slate-600">Загружаем ${state.clientSearch.viewMode === 'map' ? 'карту' : 'список СТО'}…</p></section>`;
  }

  if (!state.clientSearch.items.length) {
    return `<section class="${cardClass}"><h2 class="text-lg font-semibold">СТО не найдены</h2><p class="mt-2 text-sm text-slate-600">Снимите фильтры или попробуйте позже.</p></section>`;
  }

  if (state.clientSearch.viewMode === 'map') {
    return `
      <section class="${cardClass}">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-lg font-semibold">Карта СТО</h2>
          <button data-open-list-view class="min-h-12 rounded-xl border border-slate-300 px-3 text-sm">Открыть список</button>
        </div>
        <p class="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">💡 Нажми на метку, чтобы открыть карточку СТО.</p>
        <p class="mt-2 text-xs text-slate-500">Центр: ${state.clientSearch.mapCenter[1].toFixed(4)}, ${state.clientSearch.mapCenter[0].toFixed(4)} • Точек: ${state.clientSearch.items.length}</p>
        <div class="mt-3 rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500">Здесь отображается карта с теми же фильтрами, что и в списке. Если ключ Яндекс Карт не задан, показывается fallback-режим.</div>
      </section>
    `;
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
                  <p class="mt-1 text-xs text-slate-500">Отвечает: ~${item.avgResponseText} • Подтверждает: ${item.confirmRateText}</p>
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
    <p class="mt-1 text-sm text-slate-600">Выберите фильтр и режим отображения.</p>
    <div class="mt-3 grid grid-cols-2 gap-2">
      <button data-view-mode="list" class="min-h-12 rounded-xl border px-2 text-sm ${state.clientSearch.viewMode === 'list' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}">Список</button>
      <button data-view-mode="map" class="min-h-12 rounded-xl border px-2 text-sm ${state.clientSearch.viewMode === 'map' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}">Карта</button>
    </div>
    <div class="mt-2 grid grid-cols-2 gap-2">
      <button data-filter="today" class="min-h-12 rounded-xl border px-2 text-sm ${state.clientSearch.filters.hasWindowsToday ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}">Есть окна сегодня</button>
      <button data-filter="24h" class="min-h-12 rounded-xl border px-2 text-sm ${state.clientSearch.filters.hasWindows24h ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}">Есть окна 24ч</button>
    </div>
    <div class="mt-2 grid grid-cols-2 gap-2">
      <select id="search-cluster" class="min-h-12 rounded-xl border border-slate-300 px-2 text-sm">
        ${Object.entries(SEARCH_CLUSTERS).map(([key, value]) => `<option value="${key}" ${state.clientSearch.filters.cluster === key ? 'selected' : ''}>${value.label}</option>`).join('')}
      </select>
      <select id="search-radius" class="min-h-12 rounded-xl border border-slate-300 px-2 text-sm">
        ${RADIUS_OPTIONS.map((item) => `<option value="${item}" ${Number(state.clientSearch.filters.radiusKm) === item ? 'selected' : ''}>${item} км</option>`).join('')}
      </select>
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

  const demoHint = localStorage.getItem(STORAGE_KEYS.demoHint) || '';

  const windowsList = (items) => {
    if (!items.length) return '<p class="text-sm text-slate-500">Свободных окон нет.</p>';
    return `<div class="space-y-2">${items
      .map((win) => `<div class="rounded-xl border border-slate-200 p-3"><div class="flex items-center justify-between gap-2"><p class="text-sm font-medium">${win.startTime}–${win.endTime}</p><span class="text-xs text-slate-500">Мест: ${win.capacityLeft}/${win.capacityTotal}</span></div><p class="mt-1 text-xs text-slate-500">${win.note || 'Без комментария'}</p><a href="/client/request/${details.center.id}/${win.id}" class="mt-2 flex min-h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white">Запросить это окно</a></div>`)
      .join('')}</div>`;
  };

  return `
    ${demoHint ? `<section class="${cardClass}"><p class="text-sm text-amber-700">💡 ${demoHint}</p></section>` : ''}
    <section class="${cardClass}">
      <img src="${details.center.photos?.[0] || 'https://picsum.photos/seed/sto-details/640/360'}" alt="${details.center.name}" class="h-40 w-full rounded-xl object-cover" />
      <h2 class="mt-3 text-lg font-semibold">${details.center.name}</h2>
      <p class="mt-1 text-sm text-slate-600">${details.center.addressText}</p>
      <p class="mt-1 text-xs text-slate-500">Средний ответ: ${typeof details.center.metrics?.avgResponseMin === 'number' ? `${details.center.metrics.avgResponseMin} мин` : 'нет данных'} • Confirm rate: ${typeof details.center.metrics?.confirmRate === 'number' ? `${details.center.metrics.confirmRate}%` : 'нет данных'} • Show-up: ${typeof details.center.metrics?.showUpRate === 'number' ? `${details.center.metrics.showUpRate}%` : 'нет данных'}</p>
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
    done: 'Завершено',
    no_show: 'Неявка'
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
      ${item.status === 'sent' ? `<p class="mt-2 text-xs text-amber-700">Ожидает ответа ${item.waitingMin} мин • обычно отвечают ~${item.avgResponseMinText}</p>` : ''}
      ${item.status === 'needs_info' ? `<div class="mt-2 space-y-2"><input data-reply-input="${item.id}" type="text" placeholder="Ответьте СТО..." class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" /><button data-reply-request="${item.id}" class="w-full min-h-12 rounded-xl border border-slate-300 text-sm">Отправить ответ</button></div>` : ''}
      ${item.status === 'confirmed' ? `<div class="mt-2 grid grid-cols-2 gap-2"><button data-call-phone="${item.serviceCenterPhone || ''}" class="min-h-12 rounded-xl border border-slate-300 text-sm">Позвонить</button><button data-message-phone="${item.serviceCenterPhone || ''}" class="min-h-12 rounded-xl border border-slate-300 text-sm">Написать</button></div>` : ''}
      ${(item.status !== 'done' && item.status !== 'cancelled' && item.status !== 'no_show') ? `<button data-cancel-request="${item.id}" class="mt-2 w-full min-h-12 rounded-xl border border-rose-300 text-sm text-rose-700">Отменить заявку</button>` : ''}
      ${item.workOrderToken ? `<a href="/o/${item.workOrderToken}" class="mt-2 flex min-h-12 items-center justify-center rounded-xl border border-slate-300 text-sm">Открыть заказ-наряд</a>` : ''}
      ${item.status === 'declined' && item.declineReason ? `<p class="mt-2 text-xs text-rose-600">Причина: ${item.declineReason}${item.declineComment ? ` — ${item.declineComment}` : ''}</p>` : ''}
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
    done: 'Завершено',
    no_show: 'Неявка'
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
            <p class="mt-1 text-xs ${item.overdue ? 'text-rose-700' : 'text-slate-500'}">Ожидает ${item.waitingMin} мин ${item.status === 'sent' && item.overdue ? '• Просрочено' : ''}</p>
            ${item.status === 'sent' && item.overdue ? '<p class="mt-1 text-xs text-rose-600">Напоминание: ответьте клиенту, чтобы не терять заявку.</p>' : ''}
            ${item.messages?.length ? `<div class="mt-2 rounded-xl bg-slate-50 p-2">${item.messages.slice(-2).map((message) => `<p class="text-xs text-slate-600">${message.from === 'sto' ? 'СТО' : 'Клиент'}: ${message.text}</p>`).join('')}</div>` : ''}
            ${(item.status === 'sent' || item.status === 'needs_info')
              ? `<div class="mt-3 space-y-2">
                  <button data-sto-action="confirm" data-request-id="${item.id}" class="w-full min-h-12 rounded-xl bg-emerald-600 text-sm font-semibold text-white">Подтвердить</button>
                  <input data-question-input="${item.id}" type="text" placeholder="Вопрос клиенту (для уточнения)" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" />
                  <button data-sto-action="needs_info" data-request-id="${item.id}" class="w-full min-h-12 rounded-xl border border-amber-300 text-sm">Уточнить</button>
                  <select data-decline-reason="${item.id}" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm">${declineOptions}</select>
                  <input data-decline-other="${item.id}" type="text" placeholder="Комментарий для причины «Другое»" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" />
                  <button data-sto-action="decline" data-request-id="${item.id}" class="w-full min-h-12 rounded-xl border border-rose-300 text-sm text-rose-700">Отклонить</button>
                </div>`
              : ''}
            ${item.status === 'confirmed' ? `<div class="mt-3 grid grid-cols-2 gap-2"><button data-sto-action="done" data-request-id="${item.id}" class="min-h-12 rounded-xl border border-emerald-300 text-sm text-emerald-700">Отметить: Состоялось</button><button data-sto-action="no_show" data-request-id="${item.id}" class="min-h-12 rounded-xl border border-amber-300 text-sm text-amber-700">Отметить: Неявка</button></div>` : ''}
            ${(item.status === 'confirmed' || item.status === 'done') ? `<button data-workorder-action="${item.workOrderId ? 'open' : 'create'}" data-request-id="${item.id}" class="mt-3 w-full min-h-12 rounded-xl ${item.workOrderId ? 'border border-slate-300 text-sm' : 'bg-blue-600 text-sm font-semibold text-white'}">${item.workOrderId ? 'Открыть заказ-наряд' : 'Создать заказ-наряд'}</button>` : ''}
            ${item.status === 'declined' && item.declineReason ? `<p class="mt-2 text-xs text-rose-600">Причина: ${item.declineReason}${item.declineComment ? ` — ${item.declineComment}` : ''}</p>` : ''}
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


const clientDashboardHtml = () => `
  <section class="${cardClass}">
    <h2 class="text-lg font-semibold">Кабинет автовладельца</h2>
    <p class="mt-1 text-sm text-slate-600">Начните с поиска СТО или проверьте статусы своих заявок.</p>
    <div class="mt-3 grid grid-cols-2 gap-2">
      <a href="/client/search" class="flex min-h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white">Запросить окно</a>
      <a href="/client/requests" class="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 text-sm">Мои заявки</a>
    </div>
  </section>
`;

const stoDashboardHtml = () => `
  <section class="${cardClass}">
    <h2 class="text-lg font-semibold">Панель СТО</h2>
    <p class="mt-1 text-sm text-slate-600">Проверьте окна приёма и входящие заявки, чтобы не терять клиентов.</p>
    <div class="mt-3 grid grid-cols-2 gap-2">
      <a href="/sto/windows" class="flex min-h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white">Управлять окнами</a>
      <a href="/sto/requests" class="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 text-sm">Ответить на заявки</a>
      <a href="/sto/workorders" class="col-span-2 flex min-h-12 items-center justify-center rounded-xl border border-slate-300 text-sm">Список заказ-нарядов</a>
    </div>
  </section>
`;


const moneyFormat = (amount) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(Number(amount) || 0);

const stoWorkOrdersHtml = () => {
  const data = state.stoWorkOrders;
  if (data.loading) return `<section class="${cardClass}"><p class="text-sm text-slate-600">Загружаем заказ-наряды…</p></section>`;

  const filtered = data.filter === 'all' ? data.items : data.items.filter((item) => item.status === data.filter);

  return `
    <section class="${cardClass}">
      <h2 class="text-lg font-semibold">Заказ-наряды СТО</h2>
      <p class="mt-1 text-sm text-slate-600">Откройте наряд, чтобы изменить позиции или отправить ссылку клиенту.</p>
      <label class="mt-3 block text-sm font-medium text-slate-700">Фильтр</label>
      <select id="workorders-filter" class="mt-1 w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm">
        <option value="all" ${data.filter === 'all' ? 'selected' : ''}>Все</option>
        <option value="draft" ${data.filter === 'draft' ? 'selected' : ''}>Только draft</option>
        <option value="sent" ${data.filter === 'sent' ? 'selected' : ''}>Только sent</option>
      </select>
      ${data.error ? `<p class="mt-2 text-sm text-rose-600">${data.error}</p>` : ''}
    </section>
    ${!filtered.length ? `<section class="${cardClass}"><p class="text-sm text-slate-600">Нарядов пока нет.</p></section>` : `<section class="space-y-2">${filtered.map((item) => `<a href="/sto/workorder/${item.id}" class="block ${cardClass}"><div class="flex items-center justify-between gap-2"><h3 class="text-sm font-semibold">${item.orderNumber}</h3><span class="rounded-full bg-slate-100 px-2 py-1 text-xs">${item.status}</span></div><p class="mt-1 text-xs text-slate-500">${new Date(item.createdAt).toLocaleString('ru-RU')}</p><p class="mt-1 text-sm text-slate-700">Клиент: ${item.clientPhone || item.clientId}</p><p class="mt-1 text-sm font-medium text-slate-800">Сумма: ${moneyFormat(item.totals?.grandTotal || 0)}</p></a>`).join('')}</section>`}
  `;
};

const stoWorkOrderEditorHtml = () => {
  const editor = state.stoWorkOrderEditor;
  if (editor.loading) return `<section class="${cardClass}"><p class="text-sm text-slate-600">Загружаем заказ-наряд…</p></section>`;
  if (!editor.order) return `<section class="${cardClass}"><h2 class="text-lg font-semibold">Заказ-наряд не найден</h2><p class="mt-2 text-sm text-slate-600">Проверьте ссылку на наряд.</p></section>`;

  const labor = (editor.order.items || []).filter((item) => item.type === 'labor');
  const parts = (editor.order.items || []).filter((item) => item.type === 'part');
  const row = (item) => `<div class="rounded-xl border border-slate-200 p-3"><p class="text-sm font-medium">${item.name}</p><div class="mt-2 grid grid-cols-3 gap-2"><input data-item-qty="${item.id}" type="number" min="0.01" step="0.01" value="${item.qty}" class="min-h-12 rounded-xl border border-slate-300 px-2 text-sm" /><input data-item-price="${item.id}" type="number" min="0" step="0.01" value="${item.unitPrice}" class="min-h-12 rounded-xl border border-slate-300 px-2 text-sm" /><button data-item-delete="${item.id}" class="min-h-12 rounded-xl border border-rose-300 text-sm text-rose-700">Удалить</button></div><p class="mt-1 text-xs text-slate-500">Сумма: ${moneyFormat(item.lineTotal)}</p></div>`;

  return `
    <section class="${cardClass}">
      <h2 class="text-lg font-semibold">${editor.order.title || 'Заказ-наряд'}</h2>
      <p class="mt-1 text-sm text-slate-600">№ ${editor.order.orderNumber}</p>
      <p class="mt-1 text-xs text-slate-500">СТО: ${editor.center?.name || 'Не указано'}</p>
    </section>

    <section class="${cardClass}">
      <h3 class="text-base font-semibold">Работы</h3>
      <div class="mt-2 space-y-2">${labor.length ? labor.map(row).join('') : '<p class="text-sm text-slate-500">Работы не добавлены.</p>'}</div>
      <form id="add-labor-form" class="mt-3 space-y-2"><input id="labor-name" type="text" placeholder="Название работы" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" required /><div class="grid grid-cols-2 gap-2"><input id="labor-qty" type="number" min="0.01" step="0.01" value="1" class="min-h-12 rounded-xl border border-slate-300 px-3 text-sm" required /><input id="labor-price" type="number" min="0" step="0.01" placeholder="Цена" class="min-h-12 rounded-xl border border-slate-300 px-3 text-sm" required /></div><p class="text-xs text-slate-500">Проверка: qty > 0, unitPrice ≥ 0</p><button class="w-full min-h-12 rounded-xl border border-slate-300 text-sm">Добавить работу</button></form>
    </section>

    <section class="${cardClass}">
      <h3 class="text-base font-semibold">Запчасти</h3>
      <div class="mt-2 space-y-2">${parts.length ? parts.map(row).join('') : '<p class="text-sm text-slate-500">Запчасти не добавлены.</p>'}</div>
      <form id="add-part-form" class="mt-3 space-y-2"><input id="part-name" type="text" placeholder="Название запчасти" class="w-full min-h-12 rounded-xl border border-slate-300 px-3 text-sm" required /><div class="grid grid-cols-2 gap-2"><input id="part-qty" type="number" min="0.01" step="0.01" value="1" class="min-h-12 rounded-xl border border-slate-300 px-3 text-sm" required /><input id="part-price" type="number" min="0" step="0.01" placeholder="Цена" class="min-h-12 rounded-xl border border-slate-300 px-3 text-sm" required /></div><p class="text-xs text-slate-500">Проверка: qty > 0, unitPrice ≥ 0</p><button class="w-full min-h-12 rounded-xl border border-slate-300 text-sm">Добавить запчасть</button></form>
    </section>

    <section class="${cardClass}">
      <h3 class="text-base font-semibold">Итоги</h3>
      <p class="mt-1 text-sm text-slate-700">Работы: ${moneyFormat(editor.order.totals?.laborTotal || 0)}</p>
      <p class="mt-1 text-sm text-slate-700">Запчасти: ${moneyFormat(editor.order.totals?.partsTotal || 0)}</p>
      <p class="mt-1 text-base font-semibold text-slate-800">Итого: ${moneyFormat(editor.order.totals?.grandTotal || 0)}</p>
      <textarea id="workorder-notes" rows="3" class="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Примечание (опц)">${editor.order.notes || ''}</textarea>
      <button data-workorder-save-notes class="mt-2 w-full min-h-12 rounded-xl bg-blue-600 text-sm font-semibold text-white">Сохранить примечание</button>
      <p class="mt-2 text-sm text-rose-600">${editor.error || ''}</p>
      <p class="mt-1 text-sm text-emerald-600">${editor.success || ''}</p>
    </section>

    <section class="${cardClass}">
      <h3 class="text-base font-semibold">Отправка клиенту</h3>
      <p class="mt-1 text-xs text-slate-500">Статус: ${editor.order.status === 'sent' ? 'Отправлено' : 'Черновик'}${editor.order.sentAt ? ` · ${new Date(editor.order.sentAt).toLocaleString('ru-RU')}` : ''}</p>
      <input id="workorder-share-url" type="text" readonly value="${window.location.origin}/o/${editor.order.shareToken}" class="mt-2 w-full min-h-12 rounded-xl border border-slate-300 px-3 text-xs text-slate-700" />
      <div class="mt-2 grid grid-cols-2 gap-2">
        <button data-share-action="copy" class="min-h-12 rounded-xl border border-slate-300 text-sm">Скопировать ссылку</button>
        <button data-share-action="native" class="min-h-12 rounded-xl border border-slate-300 text-sm">Поделиться</button>
        <a data-share-action="telegram" href="#" class="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 text-sm">Telegram</a>
        <a data-share-action="whatsapp" href="#" class="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 text-sm">WhatsApp</a>
        <a data-share-action="email" href="#" class="col-span-2 flex min-h-12 items-center justify-center rounded-xl border border-slate-300 text-sm">Email</a>
      </div>
    </section>
  `;
};


const publicWorkOrderHtml = () => {
  const view = state.publicWorkOrder;
  if (view.loading) {
    return `<section class="${cardClass}"><p class="text-sm text-slate-600">Загружаем заказ-наряд…</p></section>`;
  }

  if (!view.order) {
    return `<section class="${cardClass}"><h2 class="text-lg font-semibold">Заказ-наряд не найден</h2><p class="mt-2 text-sm text-slate-600">Проверьте ссылку или попросите СТО отправить её повторно.</p></section>`;
  }

  const itemsHtml = view.order.items?.length
    ? view.order.items
        .map(
          (item) => `<li class="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p class="text-sm font-medium">${item.name}</p><p class="mt-1 text-xs text-slate-500">${item.type === 'labor' ? 'Работы' : 'Запчасти'} · ${item.qty} × ${moneyFormat(item.unitPrice)}</p></div><p class="text-sm font-semibold">${moneyFormat(item.lineTotal)}</p></li>`
        )
        .join('')
    : '<p class="text-sm text-slate-500">Позиции пока не добавлены.</p>';

  return `
    <section class="${cardClass}">
      <h2 class="text-lg font-semibold">${view.order.title || 'Заказ-наряд'}</h2>
      <p class="mt-1 text-sm text-slate-600">№ ${view.order.orderNumber} · ${new Date(view.order.createdAt).toLocaleString('ru-RU')}</p>
      <p class="mt-2 text-sm text-slate-600">СТО: <span class="font-medium text-slate-800">${view.center?.name || 'Не указано'}</span></p>
      <p class="mt-1 text-sm text-slate-600">Телефон: ${view.center?.phone || 'Не указан'}</p>
      ${view.order.notes ? `<p class="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Примечание: ${view.order.notes}</p>` : ''}
    </section>

    <section class="${cardClass}">
      <h3 class="text-base font-semibold">Позиции</h3>
      <ul class="mt-2 space-y-2">${itemsHtml}</ul>
    </section>

    <section class="${cardClass}">
      <h3 class="text-base font-semibold">Итоги</h3>
      <div class="mt-2 space-y-1 text-sm text-slate-700">
        <p>Работы: <span class="font-medium">${moneyFormat(view.order.totals?.laborTotal || 0)}</span></p>
        <p>Запчасти: <span class="font-medium">${moneyFormat(view.order.totals?.partsTotal || 0)}</span></p>
        <p class="text-base">Итого: <span class="font-semibold">${moneyFormat(view.order.totals?.grandTotal || 0)}</span></p>
      </div>
      <button data-workorder-print class="mt-3 w-full min-h-12 rounded-xl border border-slate-300 text-sm">Печать / PDF</button>
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
      : path === '/demo'
        ? `${demoPanelHtml()}${routeButtonsHtml(path)}`
        : path.startsWith('/o/')
          ? publicWorkOrderHtml()
      : path === '/client'
        ? `${clientDashboardHtml()}${routeButtonsHtml(path)}`
      : path === '/client/search'
        ? `${clientSearchSectionHtml()}${clientSearchHtml()}`
        : path.startsWith('/client/service/')
          ? serviceDetailsHtml(path)
          : path.startsWith('/client/request/')
            ? requestFormHtml()
            : path === '/client/requests'
              ? clientRequestsHtml()
              : path === '/sto'
                ? `${stoDashboardHtml()}${routeButtonsHtml(path)}`
              : path === '/sto/windows'
                ? stoWindowsHtml()
              : path === '/sto/requests'
                ? stoRequestsHtml()
              : path === '/sto/profile'
                ? stoProfileHtml()
                : path === '/sto/workorders'
                  ? stoWorkOrdersHtml()
                : path.startsWith('/sto/workorder/')
                  ? stoWorkOrderEditorHtml()
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
  safeRender();

  const centers = await mockApi.searchServiceCenters(state.clientSearch.filters);
  const cluster = SEARCH_CLUSTERS[state.clientSearch.filters.cluster] || SEARCH_CLUSTERS.podolsk;
  const [clusterLng, clusterLat] = cluster.center;
  const radiusKm = Number(state.clientSearch.filters.radiusKm || 10);

  const enriched = await Promise.all(
    centers.map(async (center) => {
      const dist = center?.geo ? distanceKm(clusterLat, clusterLng, center.geo.lat, center.geo.lng) : 999;
      return {
        ...center,
        _distanceValue: dist,
        photo: center.photos?.[0] || 'https://picsum.photos/seed/fallback/640/360',
        distanceKm: dist.toFixed(1),
        nearestWindow: await formatNearestWindow(center),
        reliabilityBadges: getReliabilityBadges(center.metrics),
        avgResponseText: typeof center.metrics?.avgResponseMin === 'number' ? `${center.metrics.avgResponseMin} мин` : 'нет данных',
        confirmRateText: typeof center.metrics?.confirmRate === 'number' ? `${center.metrics.confirmRate}%` : 'нет данных'
      };
    })
  );

  const filtered = enriched
    .filter((item) => item._distanceValue <= radiusKm)
    .sort((a, b) => a._distanceValue - b._distanceValue);

  state.clientSearch.items = filtered;
  state.clientSearch.mapCenter = filtered[0]?.geo ? [filtered[0].geo.lng, filtered[0].geo.lat] : cluster.center;
  state.clientSearch.loading = false;
  safeRender();
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
  safeRender();

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
  safeRender();
};


const loadRequestForm = async (path) => {
  const [, , , serviceId, windowId] = path.split('/');
  if (!serviceId || !windowId) return;

  state.requestForm = { loading: true, serviceId, windowId, center: null, window: null, error: '' };
  safeRender();

  const center = await mockApi.getServiceCenter(serviceId);
  const windows = await mockApi.getWindowsByServiceCenter(serviceId);
  const window = windows.find((item) => item.id === windowId) ?? null;

  state.requestForm = { loading: false, serviceId, windowId, center, window, error: '' };
  safeRender();
};

const loadClientRequests = async () => {
  const user = getCurrentUser();
  if (!user) return;

  state.clientRequests.loading = true;
  safeRender();

  const [requests, centers] = await Promise.all([mockApi.listClientRequests(user.id), mockApi.getServiceCenters()]);
  const centerById = Object.fromEntries(centers.map((item) => [item.id, item]));

  const items = await Promise.all(
    requests.map(async (request) => {
      const windows = await mockApi.getWindowsByServiceCenter(request.serviceCenterId);
      const selected = windows.find((win) => win.id === request.windowId);
      const center = centerById[request.serviceCenterId];
      const workOrder = await mockApi.getWorkOrderByRequestId(request.id);
      return {
        ...request,
        serviceCenterName: center?.name,
        serviceCenterPhone: center?.phone,
        windowLabel: selected ? `${selected.date}, ${selected.startTime}–${selected.endTime}` : '—',
        waitingMin: getWaitingMinutes(request.createdAt),
        avgResponseMinText: typeof center?.metrics?.avgResponseMin === 'number' ? `${center.metrics.avgResponseMin} мин` : 'нет данных',
        workOrderToken: workOrder?.shareToken || null
      };
    })
  );

  state.clientRequests.items = items;
  state.clientRequests.loading = false;
  safeRender();
};


const loadStoProfile = async () => {
  const user = getCurrentUser();
  if (!user) return;
  const ensured = await ensureStoForUser(user);
  if (!ensured.serviceCenterId) return;

  state.stoProfile.loading = true;
  state.stoProfile.error = '';
  state.stoProfile.success = '';
  safeRender();

  const center = await mockApi.getServiceCenter(ensured.serviceCenterId);
  state.stoProfile = {
    loading: false,
    serviceCenterId: ensured.serviceCenterId,
    center,
    error: '',
    success: ''
  };
  safeRender();
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
  safeRender();

  const windows = await mockApi.getWindowsByServiceCenter(ensured.serviceCenterId, state.stoWindows.date);
  state.stoWindows.items = windows.sort((a, b) => `${a.startTime}`.localeCompare(`${b.startTime}`));
  state.stoWindows.loading = false;
  safeRender();
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
  safeRender();

  const [requests, windows] = await Promise.all([
    mockApi.listStoRequests(ensured.serviceCenterId),
    mockApi.getWindowsByServiceCenter(ensured.serviceCenterId)
  ]);
  const usersById = Object.fromEntries(getUsers().map((item) => [item.id, item]));
  const windowsById = Object.fromEntries(windows.map((item) => [item.id, item]));

  state.stoRequests.items = await Promise.all(requests.map(async (request) => {
    const win = windowsById[request.windowId];
    const waitingMin = getWaitingMinutes(request.createdAt);
    const workOrder = await mockApi.getWorkOrderByRequestId(request.id);
    return {
      ...request,
      clientPhone: usersById[request.clientId]?.phone || '',
      windowLabel: win ? `${win.date}, ${win.startTime}–${win.endTime}` : '—',
      waitingMin,
      overdue: request.status === 'sent' && waitingMin > 15,
      workOrderId: workOrder?.id || null
    };
  }));
  state.stoRequests.loading = false;
  safeRender();
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
        logEvent('request_confirmed', { requestId });
        state.stoRequests.success = 'Заявка подтверждена.';
      }

      if (action == 'needs_info') {
        const input = app.querySelector(`[data-question-input="${requestId}"]`);
        const text = input?.value?.trim() || 'Пожалуйста, уточните детали проблемы.';
        await mockApi.updateRequestStatus(requestId, { status: 'needs_info', messageText: text, messageFrom: 'sto' });
        logEvent('request_needs_info', { requestId });
        state.stoRequests.success = 'Запрошено уточнение у клиента.';
      }

      if (action == 'done') {
        await mockApi.updateRequestStatus(requestId, { status: 'done' });
        logEvent('request_done', { requestId });
        state.stoRequests.success = 'Заявка отмечена как состоявшаяся.';
      }

      if (action == 'no_show') {
        await mockApi.updateRequestStatus(requestId, { status: 'no_show' });
        state.stoRequests.success = 'Отмечена неявка клиента.';
      }

      if (action == 'decline') {
        const select = app.querySelector(`[data-decline-reason="${requestId}"]`);
        const otherInput = app.querySelector(`[data-decline-other="${requestId}"]`);
        const reason = select?.value || '';
        const declineComment = otherInput?.value?.trim() || '';

        if (!reason) {
          state.stoRequests.error = 'Выберите причину отказа.';
          return safeRender();
        }

        if (reason === 'Другое' && !declineComment) {
          state.stoRequests.error = 'Для причины «Другое» добавьте комментарий.';
          return safeRender();
        }

        await mockApi.updateRequestStatus(requestId, {
          status: 'declined',
          declineReason: reason,
          declineComment
        });
        logEvent('request_declined', { requestId, reason });
        state.stoRequests.success = 'Заявка отклонена.';
      }

      loadStoRequests();
    });
  });

  app.querySelectorAll('[data-workorder-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const requestId = button.getAttribute('data-request-id');
      const action = button.getAttribute('data-workorder-action');
      if (!requestId || !action) return;

      const request = state.stoRequests.items.find((item) => item.id === requestId);
      if (!request) return;

      if (action === 'open' && request.workOrderId) {
        navigate(`/sto/workorder/${request.workOrderId}`);
        return;
      }

      if (action === 'create') {
        const order = await mockApi.createWorkOrderFromRequest(requestId);
        if (!order) {
          state.stoRequests.error = 'Не удалось создать заказ-наряд.';
          safeRender();
          return;
        }
        navigate(`/sto/workorder/${order.id}`);
      }
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
      safeRender();
      return;
    }

    const updated = await mockApi.updateServiceCenter(centerId, payload);
    state.stoProfile.center = updated;
    state.stoProfile.error = '';
    state.stoProfile.success = 'Профиль сохранён.';
    safeRender();
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
      return safeRender();
    }
    if (startTime >= endTime) {
      state.stoWindows.error = 'Время окончания должно быть позже начала.';
      state.stoWindows.success = '';
      return safeRender();
    }
    if (!Number.isInteger(capacityTotal) || capacityTotal < 1 || capacityTotal > 10) {
      state.stoWindows.error = 'Емкость должна быть целым числом от 1 до 10.';
      state.stoWindows.success = '';
      return safeRender();
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
    safeRender();
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
    logEvent('auth_success', { userId: user.id, phone: user.phone });
    navigate('/role');
  });
};

const bindDemoActions = () => {
  const fixedEnabled = app.querySelector('#demo-fixed-enabled');
  const fixedDate = app.querySelector('#demo-fixed-date');

  fixedEnabled?.addEventListener('change', () => {
    if (fixedDate) fixedDate.disabled = !fixedEnabled.checked;
  });

  app.querySelectorAll('[data-demo-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.getAttribute('data-demo-action');
      if (!action) return;

      if (action === 'reset') {
        const fixedEnabledValue = localStorage.getItem(STORAGE_KEYS.fixedDateEnabled);
        const fixedDateValue = localStorage.getItem(STORAGE_KEYS.fixedDateValue);
        localStorage.clear();
        if (fixedEnabledValue) localStorage.setItem(STORAGE_KEYS.fixedDateEnabled, fixedEnabledValue);
        if (fixedDateValue) localStorage.setItem(STORAGE_KEYS.fixedDateValue, fixedDateValue);
        await mockApi.ensureSeed();
        navigate('/demo', true);
        return;
      }

      if (action === 'login-client') {
        const user = await upsertUserByRole('client');
        writeJson(STORAGE_KEYS.session, { userId: user.id });
        navigate('/client/search');
        return;
      }

      if (action === 'login-sto') {
        const user = await upsertUserByRole('sto');
        writeJson(STORAGE_KEYS.session, { userId: user.id });
        navigate('/sto/windows');
        return;
      }

if (action === 'export-events') {
        const data = JSON.stringify(getEvents(), null, 2);
        try {
          await navigator.clipboard.writeText(data);
          alert('События скопированы в буфер обмена.');
        } catch {
          alert(data);
        }
        return;
      }

      if (action === 'scenario-tire') {
        const client = await upsertUserByRole('client');
        writeJson(STORAGE_KEYS.session, { userId: client.id });
        const center = await getScenarioCenter();
        if (!center) return;
        await ensureWindowForCenter(center.id);
        localStorage.setItem(STORAGE_KEYS.demoHint, 'Сценарий: клиенту срочно нужен шиномонтаж. Покажите окна и отправьте запрос.');
        navigate(`/client/service/${center.id}`);
        return;
      }

      if (action === 'scenario-waiting') {
        const client = await upsertUserByRole('client');
        const center = await getScenarioCenter();
        if (!center) return;
        const win = await ensureWindowForCenter(center.id);
        const createdRequest = await mockApi.createRequest({
          serviceCenterId: center.id,
          clientId: client.id,
          windowId: win.id,
          category: 'Шины',
          description: 'Срочно нужен шиномонтаж сегодня',
          media: []
        });
        logEvent('request_created', { requestId: createdRequest.id, serviceCenterId: createdRequest.serviceCenterId });

        const sto = await upsertUserByRole('sto');
        const bound = { ...sto, role: 'sto', serviceCenterId: center.id };
        updateUser(bound);
        writeJson(STORAGE_KEYS.session, { userId: bound.id });
        navigate('/sto/requests');
        return;
      }

      if (action === 'scenario-needs-info') {
        const client = await upsertUserByRole('client');
        const center = await getScenarioCenter();
        if (!center) return;
        const win = await ensureWindowForCenter(center.id);
        const request = await mockApi.createRequest({
          serviceCenterId: center.id,
          clientId: client.id,
          windowId: win.id,
          category: 'Диагностика',
          description: 'Мигает check engine, нужна диагностика',
          media: []
        });
        await mockApi.updateRequestStatus(request.id, {
          status: 'needs_info',
          messageText: 'Уточните модель авто и год выпуска.',
          messageFrom: 'sto'
        });

        logEvent('request_created', { requestId: request.id, serviceCenterId: request.serviceCenterId });
        writeJson(STORAGE_KEYS.session, { userId: client.id });
        navigate('/client/requests');
        return;
      }

      if (action === 'save-fixed-date') {
        const enabled = fixedEnabled?.checked;
        const dateValue = fixedDate?.value || toDateKey();
        if (enabled) {
          localStorage.setItem(STORAGE_KEYS.fixedDateEnabled, '1');
          localStorage.setItem(STORAGE_KEYS.fixedDateValue, dateValue);
        } else {
          localStorage.removeItem(STORAGE_KEYS.fixedDateEnabled);
        }
        await mockApi.ensureSeed();
        navigate('/demo', true);
      }
    });
  });
};


const loadPublicWorkOrder = async (path) => {
  const token = path.split('/')[2] || null;
  if (!token) return;
  if (state.publicWorkOrder.token === token && state.publicWorkOrder.order && !state.publicWorkOrder.loading) return;

  state.publicWorkOrder = { loading: true, token, order: null, center: null };
  safeRender();

  const order = await mockApi.getWorkOrderByToken(token);
  let center = null;
  if (order) center = await mockApi.getServiceCenter(order.serviceCenterId);

  state.publicWorkOrder = { loading: false, token, order, center };
  safeRender();
};

const bindPublicWorkOrderActions = () => {
  app.querySelector('[data-workorder-print]')?.addEventListener('click', () => {
    window.print();
  });
};


const loadStoWorkOrders = async () => {
  const user = getCurrentUser();
  if (!user) return;
  const ensured = await ensureStoForUser(user);
  if (!ensured.serviceCenterId) return;

  state.stoWorkOrders.loading = true;
  state.stoWorkOrders.error = '';
  state.stoWorkOrders.serviceCenterId = ensured.serviceCenterId;
  safeRender();

  const [orders, users] = await Promise.all([
    mockApi.listWorkOrdersByServiceCenter(ensured.serviceCenterId),
    Promise.resolve(getUsers())
  ]);
  const usersById = Object.fromEntries(users.map((item) => [item.id, item]));

  state.stoWorkOrders.items = orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((item) => ({
    ...item,
    clientPhone: usersById[item.clientId]?.phone || ''
  }));
  state.stoWorkOrders.loading = false;
  safeRender();
};

const bindStoWorkOrdersActions = () => {
  app.querySelector('#workorders-filter')?.addEventListener('change', (event) => {
    state.stoWorkOrders.filter = event.target.value || 'all';
    safeRender();
  });
};

const loadStoWorkOrderEditor = async (path) => {
  const orderId = path.split('/')[3] || null;
  if (!orderId) return;
  if (state.stoWorkOrderEditor.orderId === orderId && state.stoWorkOrderEditor.order && !state.stoWorkOrderEditor.loading) return;

  state.stoWorkOrderEditor = { loading: true, orderId, order: null, center: null, error: '', success: '' };
  safeRender();

  const order = await mockApi.getWorkOrderById(orderId);
  const center = order ? await mockApi.getServiceCenter(order.serviceCenterId) : null;
  state.stoWorkOrderEditor = { loading: false, orderId, order, center, error: '', success: '' };
  safeRender();
};

const buildShareLinks = (order) => {
  const url = `${window.location.origin}/o/${order.shareToken}`;
  const text = `Заказ-наряд ${order.orderNumber}`;
  return {
    url,
    text,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    email: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}
${url}`)}`
  };
};

const bindStoWorkOrderEditorActions = () => {
  const editor = state.stoWorkOrderEditor;
  if (!editor.orderId) return;

  app.querySelector('#add-labor-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = app.querySelector('#labor-name')?.value?.trim() || '';
    const qty = Number(app.querySelector('#labor-qty')?.value || 0);
    const unitPrice = Number(app.querySelector('#labor-price')?.value || 0);
    if (!name || qty <= 0 || unitPrice < 0) {
      state.stoWorkOrderEditor.error = 'Проверьте позицию: количество должно быть больше 0, цена — не меньше 0.';
      state.stoWorkOrderEditor.success = '';
      return safeRender();
    }
    const updated = await mockApi.addWorkOrderItem(editor.orderId, { type: 'labor', name, qty, unitPrice });
    state.stoWorkOrderEditor.order = updated;
    state.stoWorkOrderEditor.success = 'Работа добавлена.';
    state.stoWorkOrderEditor.error = '';
    safeRender();
  });

  app.querySelector('#add-part-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = app.querySelector('#part-name')?.value?.trim() || '';
    const qty = Number(app.querySelector('#part-qty')?.value || 0);
    const unitPrice = Number(app.querySelector('#part-price')?.value || 0);
    if (!name || qty <= 0 || unitPrice < 0) {
      state.stoWorkOrderEditor.error = 'Проверьте позицию: количество должно быть больше 0, цена — не меньше 0.';
      state.stoWorkOrderEditor.success = '';
      return safeRender();
    }
    const updated = await mockApi.addWorkOrderItem(editor.orderId, { type: 'part', name, qty, unitPrice });
    state.stoWorkOrderEditor.order = updated;
    state.stoWorkOrderEditor.success = 'Запчасть добавлена.';
    state.stoWorkOrderEditor.error = '';
    safeRender();
  });

  app.querySelectorAll('[data-item-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      const itemId = button.getAttribute('data-item-delete');
      if (!itemId) return;
      const updated = await mockApi.deleteWorkOrderItem(editor.orderId, itemId);
      if (!updated) return;
      state.stoWorkOrderEditor.order = updated;
      state.stoWorkOrderEditor.success = 'Позиция удалена.';
      state.stoWorkOrderEditor.error = '';
      safeRender();
    });
  });

  app.querySelectorAll('[data-item-qty]').forEach((input) => {
    input.addEventListener('change', async () => {
      const itemId = input.getAttribute('data-item-qty');
      const qty = Number(input.value || 0);
      if (!itemId || qty <= 0) {
        state.stoWorkOrderEditor.error = 'Количество должно быть больше 0.';
        state.stoWorkOrderEditor.success = '';
        return safeRender();
      }
      const updated = await mockApi.updateWorkOrderItem(editor.orderId, itemId, { qty });
      if (!updated) return;
      state.stoWorkOrderEditor.order = updated;
      state.stoWorkOrderEditor.success = 'Количество обновлено.';
      state.stoWorkOrderEditor.error = '';
      safeRender();
    });
  });

  app.querySelectorAll('[data-item-price]').forEach((input) => {
    input.addEventListener('change', async () => {
      const itemId = input.getAttribute('data-item-price');
      const unitPrice = Number(input.value || 0);
      if (!itemId || unitPrice < 0) {
        state.stoWorkOrderEditor.error = 'Цена не может быть отрицательной.';
        state.stoWorkOrderEditor.success = '';
        return safeRender();
      }
      const updated = await mockApi.updateWorkOrderItem(editor.orderId, itemId, { unitPrice });
      if (!updated) return;
      state.stoWorkOrderEditor.order = updated;
      state.stoWorkOrderEditor.success = 'Цена обновлена.';
      state.stoWorkOrderEditor.error = '';
      safeRender();
    });
  });

  app.querySelector('[data-workorder-save-notes]')?.addEventListener('click', async () => {
    const notes = app.querySelector('#workorder-notes')?.value || '';
    const updated = await mockApi.updateWorkOrder(editor.orderId, { notes });
    if (!updated) return;
    state.stoWorkOrderEditor.order = updated;
    state.stoWorkOrderEditor.success = 'Примечание сохранено.';
    state.stoWorkOrderEditor.error = '';
    safeRender();
  });

  const runSendMark = async () => {
    const sent = await mockApi.markWorkOrderSent(editor.orderId);
    if (sent) state.stoWorkOrderEditor.order = sent;
    return sent;
  };

  app.querySelector('[data-share-action="copy"]')?.addEventListener('click', async () => {
    const links = buildShareLinks(state.stoWorkOrderEditor.order);
    await runSendMark();
    try {
      await navigator.clipboard.writeText(links.url);
      state.stoWorkOrderEditor.success = 'Ссылка скопирована и наряд отмечен как отправленный.';
      state.stoWorkOrderEditor.error = '';
    } catch {
      state.stoWorkOrderEditor.error = 'Не удалось скопировать ссылку.';
    }
    safeRender();
  });

  app.querySelector('[data-share-action="native"]')?.addEventListener('click', async () => {
    const links = buildShareLinks(state.stoWorkOrderEditor.order);
    await runSendMark();
    if (navigator.share) {
      try {
        await navigator.share({ title: links.text, text: links.text, url: links.url });
        state.stoWorkOrderEditor.success = 'Ссылка отправлена через системный share.';
        state.stoWorkOrderEditor.error = '';
      } catch {
        state.stoWorkOrderEditor.error = 'Share отменён или недоступен.';
      }
    } else {
      try {
        await navigator.clipboard.writeText(links.url);
        state.stoWorkOrderEditor.success = 'Web Share недоступен. Ссылка скопирована.';
        state.stoWorkOrderEditor.error = '';
      } catch {
        state.stoWorkOrderEditor.error = 'Web Share недоступен и не удалось скопировать ссылку.';
      }
    }
    safeRender();
  });

  app.querySelector('[data-share-action="telegram"]')?.addEventListener('click', async (event) => {
    event.preventDefault();
    const links = buildShareLinks(state.stoWorkOrderEditor.order);
    await runSendMark();
    window.open(links.telegram, '_blank', 'noopener');
    state.stoWorkOrderEditor.success = 'Открыт Telegram share-link.';
    state.stoWorkOrderEditor.error = '';
    safeRender();
  });

  app.querySelector('[data-share-action="whatsapp"]')?.addEventListener('click', async (event) => {
    event.preventDefault();
    const links = buildShareLinks(state.stoWorkOrderEditor.order);
    await runSendMark();
    window.open(links.whatsapp, '_blank', 'noopener');
    state.stoWorkOrderEditor.success = 'Открыт WhatsApp share-link.';
    state.stoWorkOrderEditor.error = '';
    safeRender();
  });

  app.querySelector('[data-share-action="email"]')?.addEventListener('click', async (event) => {
    event.preventDefault();
    const links = buildShareLinks(state.stoWorkOrderEditor.order);
    await runSendMark();
    window.location.href = links.email;
    state.stoWorkOrderEditor.success = 'Открыт email-шаблон с ссылкой.';
    state.stoWorkOrderEditor.error = '';
    safeRender();
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
      logEvent('role_set', { userId: user.id, role: targetRole });
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

    const createdRequest = await mockApi.createRequest({
      serviceCenterId: state.requestForm.serviceId,
      clientId: user.id,
      windowId: state.requestForm.windowId,
      category,
      description,
      media: media ? [media] : []
    });

    logEvent('request_created', { requestId: createdRequest.id, serviceCenterId: createdRequest.serviceCenterId });
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

      await mockApi.updateRequestStatus(requestId, { status: 'sent', messageText: text, messageFrom: 'client' });
      loadClientRequests();
    });
  });

  app.querySelectorAll('[data-cancel-request]').forEach((button) => {
    button.addEventListener('click', async () => {
      const requestId = button.getAttribute('data-cancel-request');
      if (!requestId) return;
      await mockApi.updateRequestStatus(requestId, { status: 'cancelled' });
      logEvent('request_cancelled', { requestId });
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
  app.querySelectorAll('[data-view-mode]').forEach((button) => {
    button.addEventListener('click', async () => {
      const mode = button.getAttribute('data-view-mode') || 'list';
      setClientSearchView(mode);
      safeRender();
    });
  });

  app.querySelector('[data-open-list-view]')?.addEventListener('click', () => {
    setClientSearchView('list');
    safeRender();
  });

  app.querySelector('#search-cluster')?.addEventListener('change', (event) => {
    state.clientSearch.filters.cluster = event.target.value || 'podolsk';
    loadClientSearch();
  });

  app.querySelector('#search-radius')?.addEventListener('change', (event) => {
    state.clientSearch.filters.radiusKm = Number(event.target.value || 10);
    loadClientSearch();
  });

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
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        window.open(href, '_blank', 'noopener');
        return;
      }
      navigate(href);
    });
  });
};

const applyRouteGuards = (path) => {
  const session = getSession();
  const user = getCurrentUser();

  if (!session && !['/auth', '/demo'].includes(path) && !path.startsWith('/o/')) return '/auth';
  if (session && !user?.role && !['/auth', '/role'].includes(path)) return '/role';
  if (user?.role === 'client' && path.startsWith('/sto')) return '/client/search';
  if (user?.role === 'sto' && path.startsWith('/client')) return '/sto/windows';
  return path;
};

const showAppError = (error) => {
  console.error('AXIOS render error', error);
  app.innerHTML = `
    <main class="mx-auto min-h-screen max-w-md bg-slate-100 px-4 py-6">
      <section class="${cardClass}">
        <h1 class="text-lg font-bold text-rose-700">Что-то пошло не так</h1>
        <p class="mt-2 text-sm text-slate-600">Произошла ошибка рендера demo-приложения. Можно попробовать перезапустить экран или сбросить demo-данные.</p>
        <div class="mt-4 space-y-2">
          <button data-action="retry-render" class="w-full min-h-12 rounded-xl bg-blue-600 text-sm font-semibold text-white">Перезагрузить экран</button>
          <button data-action="reset-demo-error" class="w-full min-h-12 rounded-xl border border-slate-300 text-sm">Сбросить demo-данные</button>
          <a href="/auth" class="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 text-sm">На авторизацию</a>
        </div>
        <details class="mt-3 text-xs text-slate-500">
          <summary>Технические детали</summary>
          <pre class="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-2">${(error?.stack || error?.message || String(error)).replace(/</g, '&lt;')}</pre>
        </details>
      </section>
    </main>
  `;

  app.querySelector('[data-action="retry-render"]')?.addEventListener('click', () => {
    safeRender();
  });

  app.querySelector('[data-action="reset-demo-error"]')?.addEventListener('click', async () => {
    localStorage.clear();
    await mockApi.ensureSeed();
    navigate('/auth', true);
  });

  attachNavigation();
};

let lastTrackedPath = '';

const trackViewEvents = (path) => {
  if (path === lastTrackedPath) return;
  lastTrackedPath = path;
  if (path === '/client/search') logEvent('view_search');
  if (path.startsWith('/client/service/')) logEvent('view_service', { path });
};

const unsafeRender = () => {
  const current = window.location.pathname === '/' ? '/auth' : window.location.pathname;
  const guardedPath = applyRouteGuards(current);
  if (guardedPath !== current) return navigate(guardedPath, true);

  if (guardedPath === '/client/search') state.clientSearch.viewMode = getClientSearchViewFromLocation();
  trackViewEvents(guardedPath);
  const matchedRoutePath = getMatchedRoute(guardedPath);
  app.innerHTML = layoutHtml(routes[matchedRoutePath], guardedPath);
  attachNavigation();

  if (guardedPath === '/auth') bindAuthActions();
  if (guardedPath === '/role') bindRoleActions();
  if (guardedPath === '/demo') bindDemoActions();
  if (guardedPath.startsWith('/o/')) {
    bindPublicWorkOrderActions();
    loadPublicWorkOrder(guardedPath);
  }
  if (guardedPath === '/client/search') {
    bindClientSearchActions();
    if (!state.clientSearch.items.length && !state.clientSearch.loading) loadClientSearch();
  }

  if (guardedPath.startsWith('/client/service/')) {
    loadServiceDetails(guardedPath);
  } else {
    if (state.serviceDetails.serviceId) {
      state.serviceDetails = { loading: false, serviceId: null, center: null, windowsToday: [], windowsTomorrow: [] };
    }
    if (localStorage.getItem(STORAGE_KEYS.demoHint)) localStorage.removeItem(STORAGE_KEYS.demoHint);
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

  if (guardedPath === '/sto/workorders') {
    bindStoWorkOrdersActions();
    if (!state.stoWorkOrders.items.length && !state.stoWorkOrders.loading) loadStoWorkOrders();
  }

  if (guardedPath.startsWith('/sto/workorder/')) {
    bindStoWorkOrderEditorActions();
    if (!state.stoWorkOrderEditor.order || state.stoWorkOrderEditor.orderId !== guardedPath.split('/')[3]) loadStoWorkOrderEditor(guardedPath);
  }
};

const safeRender = () => {
  try {
    unsafeRender();
  } catch (error) {
    showAppError(error);
  }
};

let slaTicker = null;
const startSlaTicker = () => {
  if (slaTicker) return;
  slaTicker = setInterval(() => {
    const path = window.location.pathname;
    if (path === '/sto/requests' || path === '/client/requests') safeRender();
  }, 30000);
};

window.addEventListener('error', (event) => {
  showAppError(event.error || new Error(event.message || 'Unknown app error'));
});

window.addEventListener('unhandledrejection', (event) => {
  showAppError(event.reason || new Error('Unhandled promise rejection'));
});

window.addEventListener('popstate', safeRender);
startSlaTicker();
mockApi.ensureSeed().then(safeRender).catch(showAppError);
