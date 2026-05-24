/* eslint-env browser */
/* eslint-disable no-use-before-define, no-unused-vars, no-alert */

// ─── Стан сесії ─────────────────────────────────────────────────────────────
let currentUser = null; // { id, email, fullName, voterId, token }

function getToken() {
    return sessionStorage.getItem('vp_token');
}

function saveSession(data) {
    currentUser = data.user;
    currentUser.token = data.token;
    sessionStorage.setItem('vp_token', data.token);
    sessionStorage.setItem('vp_user', JSON.stringify(data.user));
}

function clearSession() {
    currentUser = null;
    sessionStorage.removeItem('vp_token');
    sessionStorage.removeItem('vp_user');
}

function loadSession() {
    const token = sessionStorage.getItem('vp_token');
    const user = sessionStorage.getItem('vp_user');
    if (token && user) {
        currentUser = JSON.parse(user);
        currentUser.token = token;
    }
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
    };
}

// ─── Toast ───────────────────────────────────────────────────────────────────
const contentDiv = document.getElementById('content');
const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

function closeToast(toast) {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
}

function showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span><span style="margin-left:15px;font-size:1.2rem;cursor:pointer;opacity:0.7;">&times;</span>`;
    toastContainer.appendChild(toast);
    const timer = setTimeout(() => closeToast(toast), 4000);
    toast.onclick = () => {
        clearTimeout(timer);
        closeToast(toast);
    };
}

// ─── Navbar (оновлюється залежно від авторизації) ────────────────────────────
function updateNavbar() {
    const nav = document.querySelector('.nav-links');
    if (!nav) return;

    if (currentUser) {
        nav.innerHTML = `
            <li><a href="#" onclick="loadPage('home')">Головна</a></li>
            <li><a href="#" onclick="loadPage('polls')">Всі опитування</a></li>
            <li><a href="#" onclick="loadPage('create')">Створити опитування</a></li>
            <li><a href="#" onclick="logout()" style="color:#fca5a5;">Вийти (${
                currentUser.fullName.split(' ')[0]
            })</a></li>
        `;
    } else {
        nav.innerHTML = `
            <li><a href="#" onclick="loadPage('home')">Головна</a></li>
            <li><a href="#" onclick="loadPage('login')">Увійти</a></li>
            <li><a href="#" onclick="loadPage('register')">Реєстрація</a></li>
        `;
    }
}

function logout() {
    clearSession();
    updateNavbar();
    showNotification('Ви вийшли з системи.', 'success');
    loadPage('home');
}

// ─── Головна ─────────────────────────────────────────────────────────────────
function renderHome() {
    if (currentUser) {
        contentDiv.innerHTML = `
            <div style="text-align:center;padding:40px 20px;background:linear-gradient(to bottom right,#ffffff,#f3f4f6);border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.05);margin-bottom:2rem;">
                <h1 style="font-size:2.4rem;color:#1F2937;margin-bottom:10px;">Вітаємо, ${currentUser.fullName}! 👋</h1>
                <p style="font-size:1.1rem;color:#4B5563;margin-bottom:30px;">Ваш ID виборця: <strong style="color:#4F46E5;">${currentUser.voterId}</strong></p>
                <button class="btn" style="font-size:1.2rem;padding:14px 36px;border-radius:50px;" onclick="loadPage('polls')">Перейти до голосувань ➡️</button>
            </div>`;
    } else {
        contentDiv.innerHTML = `
            <div style="text-align:center;padding:40px 20px;background:linear-gradient(to bottom right,#ffffff,#f3f4f6);border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.05);margin-bottom:2rem;">
                <h1 style="font-size:2.8rem;color:#1F2937;margin-bottom:20px;">Вітаємо на Платформі Голосування</h1>
                <p style="font-size:1.1rem;color:#4B5563;max-width:600px;margin:0 auto 30px;">
                    Для участі у голосуванні необхідно увійти або зареєструватися.
                </p>
                <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
                    <button class="btn" style="font-size:1.1rem;padding:13px 32px;border-radius:50px;" onclick="loadPage('login')">🔑 Увійти</button>
                    <button class="btn" style="font-size:1.1rem;padding:13px 32px;border-radius:50px;background:#10B981;" onclick="loadPage('register')">📝 Реєстрація</button>
                </div>
            </div>`;
    }
}

// ─── Логін ───────────────────────────────────────────────────────────────────
function renderLogin() {
    contentDiv.innerHTML = `
        <div style="max-width:440px;margin:0 auto;background:#fff;padding:36px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            <h2 style="margin-bottom:24px;text-align:center;">🔑 Вхід у систему</h2>
            <label style="font-weight:600;display:block;margin-bottom:6px;">Email:</label>
            <input type="email" id="loginEmail" placeholder="voter@example.com" style="width:100%;padding:12px;border:2px solid #E5E7EB;border-radius:8px;font-size:16px;margin-bottom:16px;box-sizing:border-box;">
            <label style="font-weight:600;display:block;margin-bottom:6px;">Пароль:</label>
            <input type="password" id="loginPassword" placeholder="••••••" style="width:100%;padding:12px;border:2px solid #E5E7EB;border-radius:8px;font-size:16px;margin-bottom:24px;box-sizing:border-box;">
            <button class="btn" style="width:100%;padding:14px;font-size:1rem;" onclick="doLogin()">Увійти</button>
            <p style="text-align:center;margin-top:16px;color:#6B7280;">Немає акаунту? <a href="#" onclick="loadPage('register')" style="color:#4F46E5;font-weight:600;">Зареєструватись</a></p>
        </div>`;
}

async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Заповніть всі поля.', 'error');
        return;
    }

    try {
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (res.ok) {
            saveSession(data);
            updateNavbar();
            showNotification(`Вітаємо, ${data.user.fullName}! 🎉`, 'success');
            loadPage('polls');
        } else {
            showNotification(data.error || 'Помилка входу.', 'error');
        }
    } catch {
        showNotification('Помилка сервера.', 'error');
    }
}

// ─── Реєстрація ──────────────────────────────────────────────────────────────
function renderRegister() {
    contentDiv.innerHTML = `
        <div style="max-width:440px;margin:0 auto;background:#fff;padding:36px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            <h2 style="margin-bottom:24px;text-align:center;">📝 Реєстрація виборця</h2>
            <label style="font-weight:600;display:block;margin-bottom:6px;">Повне ім'я (ПІБ):</label>
            <input type="text" id="regName" placeholder="Іван Іваненко" style="width:100%;padding:12px;border:2px solid #E5E7EB;border-radius:8px;font-size:16px;margin-bottom:16px;box-sizing:border-box;">
            <label style="font-weight:600;display:block;margin-bottom:6px;">Email:</label>
            <input type="email" id="regEmail" placeholder="voter@example.com" style="width:100%;padding:12px;border:2px solid #E5E7EB;border-radius:8px;font-size:16px;margin-bottom:16px;box-sizing:border-box;">
            <label style="font-weight:600;display:block;margin-bottom:6px;">Пароль (мін. 6 символів):</label>
            <input type="password" id="regPassword" placeholder="••••••" style="width:100%;padding:12px;border:2px solid #E5E7EB;border-radius:8px;font-size:16px;margin-bottom:24px;box-sizing:border-box;">
            <button class="btn" style="width:100%;padding:14px;font-size:1rem;" onclick="doRegister()">Зареєструватись</button>
            <p style="text-align:center;margin-top:16px;color:#6B7280;">Вже є акаунт? <a href="#" onclick="loadPage('login')" style="color:#4F46E5;font-weight:600;">Увійти</a></p>
        </div>`;
}

async function doRegister() {
    const fullName = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!fullName || !email || !password) {
        showNotification('Заповніть всі поля.', 'error');
        return;
    }

    try {
        const res = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password }),
        });
        const data = await res.json();

        if (res.ok) {
            saveSession(data);
            updateNavbar();
            showNotification(`Реєстрація успішна! Вітаємо, ${data.user.fullName} 🤝`, 'success');
            loadPage('polls');
        } else {
            showNotification(data.error || 'Помилка реєстрації.', 'error');
        }
    } catch {
        showNotification('Помилка сервера.', 'error');
    }
}

// ─── Список опитувань (тільки для авторизованих) ─────────────────────────────
async function renderPollsList() {
    if (!currentUser) {
        contentDiv.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <h2>🔒 Потрібна авторизація</h2>
                <p style="color:#6B7280;margin-bottom:20px;">Для перегляду та участі у голосуваннях необхідно увійти або зареєструватись.</p>
                <div style="display:flex;justify-content:center;gap:12px;">
                    <button class="btn" onclick="loadPage('login')">Увійти</button>
                    <button class="btn" style="background:#10B981;" onclick="loadPage('register')">Реєстрація</button>
                </div>
            </div>`;
        return;
    }

    contentDiv.innerHTML = '<h2>Завантаження опитувань...</h2>';
    try {
        const response = await fetch('/polls');
        const polls = await response.json();

        let html = '<h2>Активні опитування</h2>';
        if (!polls.length) {
            html += '<p>Наразі немає активних опитувань.</p>';
        } else {
            polls.forEach(poll => {
                html += `
                    <div class="poll-card">
                        <div><h3>${poll.title}</h3></div>
                        <div>
                            <button class="btn" onclick="loadPage('view', '${
                                poll._id || poll.id
                            }')">Відкрити</button>
                            <button class="btn btn-danger" onclick="deletePoll('${
                                poll._id || poll.id
                            }')">Видалити</button>
                        </div>
                    </div>`;
            });
        }
        contentDiv.innerHTML = html;
    } catch {
        contentDiv.innerHTML = '<p>Помилка завантаження даних з сервера.</p>';
    }
}

// ─── Деталі опитування + Голосування ─────────────────────────────────────────
async function renderPollDetails(pollId) {
    if (!currentUser) {
        contentDiv.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <h2>🔒 Потрібна авторизація</h2>
                <p style="color:#6B7280;margin-bottom:20px;">Увійдіть, щоб проголосувати.</p>
                <button class="btn" onclick="loadPage('login')">Увійти</button>
            </div>`;
        return;
    }

    contentDiv.innerHTML = '<h2>Завантаження даних опитування...</h2>';
    try {
        const response = await fetch(`/votes/results/${pollId}`);
        let data = {};

        if (response.ok) {
            data = await response.json();
        } else if (response.status === 404) {
            data = { totalVotes: 0, results: [] };
        } else {
            const errData = await response.json();
            contentDiv.innerHTML = `<p>Помилка: ${errData.error || 'Щось пішло не так'}</p>
                <button class="btn" style="margin-top:15px;" onclick="loadPage('polls')">Назад</button>`;
            return;
        }

        // Перевірка чи вже голосував
        let hasVoted = false;
        try {
            const checkRes = await fetch(
                `/votes/check?voterId=${currentUser.voterId}&pollId=${pollId}`,
            );
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                hasVoted = checkData.hasVoted;
            }
        } catch {
            /* ігнорувати */
        }

        let html = `
            <h2>${data.poll ? data.poll.title : 'Результати опитування'}</h2>
            <p>Всього голосів: <strong style="font-size:1.2em;color:#4F46E5;">${
                data.totalVotes || 0
            }</strong></p>`;

        if (hasVoted) {
            html += `<div style="background:#D1FAE5;border:1px solid #6EE7B7;border-radius:10px;padding:14px 20px;margin-bottom:20px;color:#065F46;font-weight:600;">
                ✅ Ви вже проголосували в цьому опитуванні.
            </div>`;
        }

        html += '<ul class="candidate-list">';

        if (data.results && data.results.length > 0) {
            data.results.forEach(cand => {
                const rawPercent = cand.percentage ? cand.percentage.replace('%', '') : '0';
                html += `
                    <li class="candidate-item">
                        <div class="candidate-info">
                            <span style="font-size:1.1em;"><strong>${
                                cand.name
                            }</strong> <span style="color:gray;font-size:0.9em;">(${
                    cand.party || '—'
                })</span></span>
                            ${
                                !hasVoted
                                    ? `<button class="btn" onclick="castVote('${pollId}', '${cand.id}')">Голосувати</button>`
                                    : ''
                            }
                        </div>
                        <div style="margin-top:5px;">
                            <div style="display:flex;justify-content:space-between;font-size:0.9em;font-weight:bold;margin-bottom:5px;">
                                <span>${cand.votes || 0} голосів</span>
                                <span style="color:#4F46E5;">${cand.percentage || '0.00%'}</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" data-width="${rawPercent}%"></div>
                            </div>
                        </div>
                    </li>`;
            });
        } else {
            html +=
                '<p style="text-align:center;color:gray;padding:20px;">Кандидатів поки немає.</p>';
        }

        html +=
            '</ul><button class="btn" style="margin-top:20px;" onclick="loadPage(\'polls\')">⬅ Назад до списку</button>';
        contentDiv.innerHTML = html;

        setTimeout(() => {
            document.querySelectorAll('.progress-bar-fill').forEach(bar => {
                // eslint-disable-next-line no-param-reassign
                bar.style.width = bar.getAttribute('data-width');
            });
        }, 50);
    } catch {
        contentDiv.innerHTML =
            '<p>Не вдалося зв\'язатися з сервером.</p><button class="btn" style="margin-top:15px;" onclick="loadPage(\'polls\')">Назад</button>';
    }
}

// ─── Створення опитування ────────────────────────────────────────────────────
function renderCreatePoll() {
    if (!currentUser) {
        loadPage('login');
        return;
    }
    contentDiv.innerHTML = `
        <h2>Створити нове опитування</h2>
        <form onsubmit="createPoll(event)">
            <label>Назва опитування:</label>
            <input type="text" id="pollTitle" required placeholder="Наприклад: Вибори старости">
            <label>Дата завершення:</label>
            <input type="date" id="pollDate" required>
            <button type="submit" class="btn">Створити</button>
        </form>`;
}

// ─── API-функції ─────────────────────────────────────────────────────────────
async function createPoll(event) {
    event.preventDefault();
    const title = document.getElementById('pollTitle').value;
    const expiresAt = document.getElementById('pollDate').value;
    try {
        const res = await fetch('/polls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, expires_at: expiresAt }),
        });
        if (res.ok) {
            showNotification('Опитування успішно створено! 🎉', 'success');
            loadPage('polls');
        } else {
            showNotification('Помилка при створенні опитування', 'error');
        }
    } catch {
        showNotification('Помилка сервера', 'error');
    }
}

async function deletePoll(pollId) {
    if (!window.confirm('Точно видалити це опитування?')) return;
    try {
        const res = await fetch(`/polls/${pollId}`, {
            method: 'DELETE',
            headers: { 'x-admin-key': 'secret123' },
        });
        if (res.ok) {
            showNotification('Опитування успішно видалено! 🗑️', 'success');
            loadPage('polls');
        } else {
            const data = await res.json();
            showNotification(`Помилка: ${data.error || 'Не вдалося видалити'}`, 'error');
        }
    } catch {
        showNotification('Помилка видалення', 'error');
    }
}

async function castVote(pollId, candidateId) {
    if (!currentUser) {
        loadPage('login');
        return;
    }

    try {
        const res = await fetch('/votes', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ pollId, candidateId }),
        });
        const result = await res.json();

        if (res.ok) {
            showNotification('Ваш голос успішно враховано! 🗳️', 'success');
            loadPage('view', pollId);
        } else {
            showNotification(`Помилка: ${result.error || result.message}`, 'error');
        }
    } catch {
        showNotification('Помилка сервера при голосуванні', 'error');
    }
}

// ─── Маршрутизатор ───────────────────────────────────────────────────────────
function loadPage(page, data = null) {
    if (page === 'home') renderHome();
    else if (page === 'polls') renderPollsList();
    else if (page === 'create') renderCreatePoll();
    else if (page === 'view') renderPollDetails(data);
    else if (page === 'login') renderLogin();
    else if (page === 'register') renderRegister();
}

// ─── Ініціалізація ───────────────────────────────────────────────────────────
window.onload = () => {
    loadSession();
    updateNavbar();
    loadPage('home');
};
