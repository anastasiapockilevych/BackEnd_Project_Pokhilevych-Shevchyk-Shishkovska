const contentDiv = document.getElementById('content');

// --- Система сповіщень (Toast) ---
const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

function showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <span style="margin-left: 15px; font-size: 1.2rem; cursor: pointer; opacity: 0.7;">&times;</span>
    `;
    toastContainer.appendChild(toast);

    // Видаляємо через 4 секунди
    const timer = setTimeout(() => closeToast(toast), 4000);
    // Закриття по кліку
    toast.onclick = () => {
        clearTimeout(timer);
        closeToast(toast);
    };
}

function closeToast(toast) {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
}

// --- Маршрутизатор (перемикач сторінок) ---
function loadPage(page, data = null) {
    if (page === 'home') renderHome();
    else if (page === 'polls') renderPollsList();
    else if (page === 'create') renderCreatePoll();
    else if (page === 'view') renderPollDetails(data);
    else if (page === 'register') renderRegister();
}

// --- 0. Головна сторінка (Landing Page) ---
function renderHome() {
    contentDiv.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; background: linear-gradient(to bottom right, #ffffff, #f3f4f6); border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: 2rem; animation: fadeIn 0.5s ease-out;">
            <h1 style="font-size: 2.8rem; color: #1F2937; margin-bottom: 20px;">Вітаємо на Платформі Голосування</h1>
            <p style="font-size: 1.2rem; color: #4B5563; max-width: 650px; margin: 0 auto 40px; line-height: 1.6;">
                Це сучасна, прозора та безпечна система для проведення виборів. 
                Тут ви можете віддати свій голос за кандидатів на різних рівнях: від Президента до міського голови. 
                Ваш голос є вирішальним для формування нашого спільного майбутнього!
            </p>
            
            <div style="display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; margin-bottom: 40px;">
                <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); width: 220px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 2.5rem; margin-bottom: 10px;">📊</div>
                    <h3 style="margin: 0; color: #4F46E5;">Прозоро</h3>
                    <p style="margin: 10px 0 0; color: gray; font-size: 0.95rem;">Відкриті результати в реальному часі</p>
                </div>
                <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); width: 220px; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 2.5rem; margin-bottom: 10px;">🛡️</div>
                    <h3 style="margin: 0; color: #10B981;">Безпечно</h3>
                    <p style="margin: 10px 0 0; color: gray; font-size: 0.95rem;">Один студент — один голос</p>
                </div>
            </div>
            
            <button class="btn" style="font-size: 1.3rem; padding: 15px 40px; border-radius: 50px; box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3);" onclick="loadPage('polls')">
                Перейти до списку виборів ➡️
            </button>
        </div>
    `;
}

// --- 1. Сторінка: Список опитувань ---
async function renderPollsList() {
    contentDiv.innerHTML = '<h2>Завантаження опитувань...</h2>';
    try {
        const response = await fetch('/polls');
        const polls = await response.json();

        let html = '<h2>Активні опитування</h2>';
        if (polls.length === 0) {
            html += '<p>Наразі немає активних опитувань.</p>';
        } else {
            polls.forEach(poll => {
                html += `
                    <div class="poll-card">
                        <div>
                            <h3>${poll.title}</h3>
                        </div>
                        <div>
                            <button class="btn" onclick="loadPage('view', '${
                                poll._id || poll.id
                            }')">Відкрити</button>
                            <button class="btn btn-danger" onclick="deletePoll('${
                                poll._id || poll.id
                            }')">Видалити</button>
                        </div>
                    </div>
                `;
            });
        }
        contentDiv.innerHTML = html;
    } catch (error) {
        contentDiv.innerHTML = '<p>Помилка завантаження даних з сервера.</p>';
    }
}

// --- 2. Сторінка: Деталі опитування (Голосування та результати) ---
async function renderPollDetails(pollId) {
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
            contentDiv.innerHTML = `<p>Помилка: ${
                errData.error || 'Щось пішло не так'
            }</p><button class="btn" style="margin-top: 15px;" onclick="loadPage('polls')">Назад</button>`;
            return;
        }

        let html = `
            <h2>Результати опитування</h2>
            <p>Всього голосів: <strong style="font-size: 1.2em; color: #4F46E5;">${
                data.totalVotes || 0
            }</strong></p>

            <div style="background: #FFFFFF; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #E5E7EB;">
                <label for="voterIdInput" style="font-weight: 600; display: block; margin-bottom: 10px; color: #374151;">Ваш ID студента (обов'язково для голосування):</label>
                <input type="text" id="voterIdInput" placeholder="Наприклад: STUD-001" style="width: 100%; padding: 12px; border: 2px solid #E5E7EB; border-radius: 8px; font-size: 16px;">
            </div>

            <ul class="candidate-list">
        `;

        if (data.results && data.results.length > 0) {
            data.results.forEach(cand => {
                const rawPercent = cand.percentage ? cand.percentage.replace('%', '') : '0';

                html += `
                    <li class="candidate-item">
                        <div class="candidate-info">
                            <span style="font-size: 1.1em;"><strong>${
                                cand.name
                            }</strong> <span style="color: gray; font-size: 0.9em;">(${
                    cand.party || '—'
                })</span></span>
                            <button class="btn" onclick="castVote('${pollId}', '${
                    cand.id || cand.candidate_id || cand._id || cand.name
                }')">Голосувати</button>
                        </div>
                        <div style="margin-top: 5px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.9em; font-weight: bold; margin-bottom: 5px;">
                                <span>${cand.votes || cand.votesCount || 0} голосів</span>
                                <span style="color: #4F46E5;">${cand.percentage || '0.00%'}</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" data-width="${rawPercent}%"></div>
                            </div>
                        </div>
                    </li>
                `;
            });
        } else {
            html +=
                '<p style="text-align: center; color: gray; padding: 20px;">Кандидатів поки немає (або результати приховані).</p>';
        }

        html +=
            '</ul><button class="btn" style="margin-top: 20px;" onclick="loadPage(\'polls\')">⬅ Назад до списку</button>';
        contentDiv.innerHTML = html;

        setTimeout(() => {
            document.querySelectorAll('.progress-bar-fill').forEach(bar => {
                bar.style.width = bar.getAttribute('data-width');
            });
        }, 50);
    } catch (error) {
        contentDiv.innerHTML =
            '<p>Не вдалося зв\'язатися з сервером.</p><button class="btn" style="margin-top: 15px;" onclick="loadPage(\'polls\')">Назад</button>';
    }
}

// --- 3. Сторінка: Створення опитування ---
function renderCreatePoll() {
    contentDiv.innerHTML = `
        <h2>Створити нове опитування</h2>
        <form onsubmit="createPoll(event)">
            <label>Назва опитування:</label>
            <input type="text" id="pollTitle" required placeholder="Наприклад: Вибори старости">
            
            <label>Дата завершення:</label>
            <input type="date" id="pollDate" required>
            
            <button type="submit" class="btn">Створити</button>
        </form>
    `;
}

// --- 4. Сторінка: Реєстрація виборця ---
function renderRegister() {
    contentDiv.innerHTML = `
        <h2>Реєстрація нового виборця</h2>
        <form onsubmit="registerVoter(event)">
            <label>Повне ім'я (ПІБ):</label>
            <input type="text" id="voterName" required placeholder="Наприклад: Шевчук Анастасія">
            
            <label>ID студента (voterId):</label>
            <input type="text" id="newVoterId" required placeholder="Наприклад: STUD-001">
            
            <button type="submit" class="btn">Зареєструватися</button>
        </form>
    `;
}

// --- Функції взаємодії з бекендом ---

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
    } catch (err) {
        showNotification('Помилка сервера', 'error');
    }
}

async function deletePoll(pollId) {
    if (!confirm('Точно видалити це опитування?')) return;

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
    } catch (err) {
        showNotification('Помилка видалення', 'error');
    }
}

async function castVote(pollId, candidateId) {
    const voterIdInput = document.getElementById('voterIdInput');
    const voterId = voterIdInput ? voterIdInput.value.trim() : '';

    if (!voterId) {
        showNotification('Будь ласка, введіть свій ID студента у поле вище!', 'error');
        voterIdInput.style.border = '2px solid #EF4444';
        voterIdInput.focus();
        return;
    }

    try {
        const res = await fetch('/votes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pollId, candidateId, voterId }),
        });

        const result = await res.json();

        if (res.ok) {
            showNotification('Ваш голос успішно враховано! 🗳️', 'success');
            loadPage('view', pollId);
        } else {
            showNotification(`Помилка: ${result.error || result.message}`, 'error');
        }
    } catch (err) {
        showNotification('Помилка сервера при голосуванні', 'error');
    }
}

async function registerVoter(event) {
    event.preventDefault();
    const fullName = document.getElementById('voterName').value;
    const voterId = document.getElementById('newVoterId').value;

    try {
        const res = await fetch('/users/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, voterId }),
        });

        const data = await res.json();

        if (res.ok || res.status === 201) {
            showNotification(`Виборця зареєстровано! Вітаємо, ${fullName} 🤝`, 'success');
            loadPage('polls');
        } else {
            showNotification(
                `Помилка реєстрації: ${data.error || data.message || 'Не вдалося створити'}`,
                'error',
            );
        }
    } catch (err) {
        showNotification('Помилка сервера при реєстрації', 'error');
    }
}

// При відкритті сторінки одразу вантажимо Головну сторінку
window.onload = () => loadPage('home');
