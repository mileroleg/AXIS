const STORAGE_KEYS = {
  serviceCenters: 'axios_demo_service_centers',
  windows: 'axios_demo_windows',
  requests: 'axios_demo_requests',
  seeded: 'axios_demo_seeded_v1',
  fixedDateEnabled: 'axios_demo_fixed_date_enabled',
  fixedDateValue: 'axios_demo_fixed_date_value'
};

const PAYMENT_METHODS = ['Наличные', 'Карта', 'Перевод', 'QR'];
const DECLINE_REASONS = ['Нет времени', 'Нужно уточнение', 'Не берём эту работу', 'Не дозвонились', 'Другое'];

const delay = () => new Promise((resolve) => setTimeout(resolve, 150 + Math.floor(Math.random() * 151)));
const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const getNow = () => {
  const fixedEnabled = localStorage.getItem(STORAGE_KEYS.fixedDateEnabled) === '1';
  const fixedDateValue = localStorage.getItem(STORAGE_KEYS.fixedDateValue);
  if (fixedEnabled && fixedDateValue && /^\d{4}-\d{2}-\d{2}$/.test(fixedDateValue)) return new Date(`${fixedDateValue}T12:00:00`);
  return new Date();
};

const toDateKey = (date = getNow()) => date.toISOString().slice(0, 10);

const getState = () => ({
  serviceCenters: readJson(STORAGE_KEYS.serviceCenters, []),
  windows: readJson(STORAGE_KEYS.windows, []),
  requests: readJson(STORAGE_KEYS.requests, [])
});

const saveState = (state) => {
  writeJson(STORAGE_KEYS.serviceCenters, state.serviceCenters);
  writeJson(STORAGE_KEYS.windows, state.windows);
  writeJson(STORAGE_KEYS.requests, state.requests);
};

const withMetrics = (serviceCenter, requests) => {
  const related = requests.filter((item) => item.serviceCenterId === serviceCenter.id);
  const responded = related.filter((item) => Boolean(item.respondedAt));

  const avgResponseMin = responded.length
    ? Math.round(
        responded.reduce((acc, item) => acc + (new Date(item.respondedAt).getTime() - new Date(item.createdAt).getTime()) / 60000, 0) /
          responded.length
      )
    : null;

  const confirmed = related.filter((item) => item.status === 'confirmed');
  const declined = related.filter((item) => item.status === 'declined');
  const done = related.filter((item) => item.status === 'done');
  const noShow = related.filter((item) => item.status === 'no_show');

  const confirmBase = confirmed.length + declined.length;
  const showUpBase = done.length + noShow.length;

  const confirmRate = confirmBase ? Math.round((confirmed.length / confirmBase) * 100) : null;
  const showUpRate = showUpBase ? Math.round((done.length / showUpBase) * 100) : null;

  return {
    ...serviceCenter,
    metrics: {
      avgResponseMin,
      confirmRate,
      showUpRate
    }
  };
};

const buildSeedData = () => {
  const today = new Date();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  const serviceCenters = [
    ['sto-1', 'Подольск Моторс', 'Подольск, ул. Кирова, 15'],
    ['sto-2', 'Подольск Сервис+ ', 'Подольск, ул. Большая Серпуховская, 42'],
    ['sto-3', 'Авто-Пахра', 'Подольск, Ревпроспект, 31'],
    ['sto-4', 'Солнцево Автоцентр', 'Москва, ул. Богданова, 50'],
    ['sto-5', 'Переделкино Гараж', 'Москва, ул. Лукинская, 9'],
    ['sto-6', 'Внуково Автопомощь', 'Москва, пос. Внуково, ул. Центральная, 8'],
    ['sto-7', 'Солнцево Диагностика', 'Москва, Боровское ш., 2к7'],
    ['sto-8', 'Подольск 24 Часа', 'Подольск, ул. Машиностроителей, 17'],
    ['sto-9', 'Переделкино Шиномонтаж', 'Москва, Чоботовская аллея, 1'],
    ['sto-10', 'Внуково Техцентр', 'Москва, ул. Аэрофлотская, 12']
  ].map(([id, name, addressText], index) => ({
    id,
    name,
    phone: `+7 (9${index}9) 100-0${index}-0${index}`,
    addressText,
    geo: { lat: 55.4 + index * 0.02, lng: 37.2 + index * 0.03 },
    workingHours: index % 3 === 0 ? 'Круглосуточно' : '09:00–21:00',
    paymentMethods: PAYMENT_METHODS.slice(0, 2 + (index % 3)),
    photos: [`https://picsum.photos/seed/${id}/640/360`],
    description: 'Демо-описание СТО: приём запросов окон, первичная диагностика и обслуживание.'
  }));

  const windows = [];
  let counter = 1;
  serviceCenters.forEach((center, idx) => {
    const baseCapacity = 2 + (idx % 3);
    windows.push(
      {
        id: `win-${counter++}`,
        serviceCenterId: center.id,
        date: toDateKey(today),
        startTime: '10:00',
        endTime: '11:30',
        capacityTotal: baseCapacity,
        capacityLeft: baseCapacity,
        note: 'Быстрый приём'
      },
      {
        id: `win-${counter++}`,
        serviceCenterId: center.id,
        date: toDateKey(tomorrow),
        startTime: '14:00',
        endTime: '16:00',
        capacityTotal: baseCapacity + 1,
        capacityLeft: baseCapacity + 1,
        note: 'Окно на завтра'
      }
    );

    if (idx % 2 === 0) {
      windows.push({
        id: `win-${counter++}`,
        serviceCenterId: center.id,
        date: toDateKey(dayAfter),
        startTime: '18:00',
        endTime: '19:00',
        capacityTotal: 1,
        capacityLeft: 1,
        note: 'Вечерний приём'
      });
    }
  });

  return { serviceCenters, windows, requests: [] };
};

const ensureSeed = async () => {
  await delay();
  if (localStorage.getItem(STORAGE_KEYS.seeded)) return;
  saveState(buildSeedData());
  localStorage.setItem(STORAGE_KEYS.seeded, '1');
};

const getServiceCenters = async () => {
  await delay();
  const state = getState();
  return state.serviceCenters.map((item) => withMetrics(item, state.requests));
};

const getServiceCenter = async (id) => {
  await delay();
  const state = getState();
  const found = state.serviceCenters.find((item) => item.id === id);
  return found ? withMetrics(found, state.requests) : null;
};

const getWindowsByServiceCenter = async (serviceCenterId, date) => {
  await delay();
  const { windows } = getState();
  return windows.filter((item) => item.serviceCenterId === serviceCenterId && (!date || item.date === date));
};

const searchServiceCenters = async (filters = {}) => {
  await delay();
  const state = getState();
  const nowDate = getNow();
  const now = nowDate.getTime();
  const in24h = new Date(now + 24 * 60 * 60 * 1000);

  return state.serviceCenters
    .map((item) => withMetrics(item, state.requests))
    .filter((center) => {
      if (!filters.hasWindowsToday && !filters.hasWindows24h) return true;

      const centerWindows = state.windows.filter((win) => win.serviceCenterId === center.id && win.capacityLeft > 0);

      if (filters.hasWindowsToday) {
        const todayKey = toDateKey();
        return centerWindows.some((win) => win.date === todayKey);
      }

      if (filters.hasWindows24h) {
        return centerWindows.some((win) => {
          const winDate = new Date(`${win.date}T${win.startTime}:00`);
          return winDate >= nowDate && winDate <= in24h;
        });
      }

      return true;
    });
};

const createRequest = async (payload) => {
  await delay();
  const state = getState();
  const now = new Date().toISOString();

  const request = {
    id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    serviceCenterId: payload.serviceCenterId,
    clientId: payload.clientId,
    windowId: payload.windowId,
    category: payload.category,
    description: payload.description,
    media: payload.media ?? [],
    status: 'sent',
    messages: [],
    createdAt: now,
    updatedAt: now,
    respondedAt: null,
    declineReason: null,
    declineComment: ''
  };

  state.requests.unshift(request);
  saveState(state);
  return request;
};

const listClientRequests = async (clientId) => {
  await delay();
  const state = getState();
  return state.requests.filter((item) => item.clientId === clientId);
};

const listStoRequests = async (serviceCenterId) => {
  await delay();
  const state = getState();
  return state.requests.filter((item) => item.serviceCenterId === serviceCenterId);
};

const updateRequestStatus = async (requestId, patch = {}) => {
  await delay();
  const state = getState();
  const request = state.requests.find((item) => item.id === requestId);
  if (!request) return null;

  const prevStatus = request.status;
  const nextStatus = patch.status ?? request.status;
  if (nextStatus === 'declined' && !(patch.declineReason && DECLINE_REASONS.includes(patch.declineReason))) return null;
  request.status = nextStatus;
  request.updatedAt = new Date().toISOString();
  request.respondedAt = ['confirmed', 'needs_info', 'declined'].includes(request.status) ? request.updatedAt : request.respondedAt;

  if (patch.declineReason && DECLINE_REASONS.includes(patch.declineReason)) {
    request.declineReason = patch.declineReason;
  }

  if (typeof patch.declineComment === 'string') {
    request.declineComment = patch.declineComment.trim();
  }

  if (patch.messageText) {
    request.messages = request.messages ?? [];
    request.messages.push({
      from: patch.messageFrom ?? 'sto',
      text: patch.messageText,
      at: request.updatedAt
    });
  }

  const window = state.windows.find((item) => item.id === request.windowId);

  if (request.status === 'confirmed' && prevStatus !== 'confirmed') {
    if (window && window.capacityLeft > 0) {
      window.capacityLeft -= 1;
    }
  }

  if (prevStatus === 'confirmed' && request.status === 'cancelled') {
    if (window && window.capacityLeft < window.capacityTotal) {
      window.capacityLeft += 1;
    }
  }

  saveState(state);
  return request;
};


const updateServiceCenter = async (serviceCenterId, patch = {}) => {
  await delay();
  const state = getState();
  const center = state.serviceCenters.find((item) => item.id === serviceCenterId);
  if (!center) return null;

  const allowed = ['name', 'phone', 'addressText', 'workingHours', 'paymentMethods', 'description', 'photos'];
  allowed.forEach((key) => {
    if (patch[key] !== undefined) center[key] = patch[key];
  });

  saveState(state);
  return withMetrics(center, state.requests);
};

const createWindow = async (payload) => {
  await delay();
  const state = getState();
  const window = {
    id: `win-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    serviceCenterId: payload.serviceCenterId,
    date: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime,
    capacityTotal: Number(payload.capacityTotal),
    capacityLeft: Number(payload.capacityTotal),
    note: payload.note ?? ''
  };

  state.windows.unshift(window);
  saveState(state);
  return window;
};

const deleteWindow = async (windowId) => {
  await delay();
  const state = getState();
  const before = state.windows.length;
  state.windows = state.windows.filter((item) => item.id !== windowId);
  saveState(state);
  return before !== state.windows.length;
};

export const mockApi = {
  ensureSeed,
  getServiceCenters,
  getServiceCenter,
  getWindowsByServiceCenter,
  searchServiceCenters,
  createRequest,
  listClientRequests,
  listStoRequests,
  updateRequestStatus,
  updateServiceCenter,
  createWindow,
  deleteWindow,
  constants: {
    PAYMENT_METHODS,
    DECLINE_REASONS
  }
};
