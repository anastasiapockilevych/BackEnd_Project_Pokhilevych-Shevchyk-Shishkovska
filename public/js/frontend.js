const contentDiv = document.getElementById('content');

// --- Маршрутизатор (перемикач сторінок) ---
function loadPage(page, data = null) {
    if (page === 'polls') renderPollsList();
    else if (page === 'create') renderCreatePoll();
    else if (page === 'view') renderPollDetails(data);
    else if (page === 'register') renderRegister();
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
                            <button class="btn" onclick="loadPage('view', '${poll._id || poll.id}')">Відкрити</button>
                            <button class="btn btn-danger" onclick="deletePoll('${poll._id || poll.id}')">Видалити</button>
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
            contentDiv.innerHTML = `<p>Помилка: ${errData.error || 'Щось пішло не так'}</p><button class="btn" style="margin-top: 15px;" onclick="loadPage('polls')">Назад</button>`;
            return;
        }

        let html = `
            <h2>Результати опитування</h2>
            <p>Всього голосів: <strong>${data.totalVotes || 0}</strong></p>

            <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #E5E7EB;">
                <label for="voterIdInput" style="font-weight: 600; display: block; margin-bottom: 5px;">Ваш ID студента (обов'язково для голосування):</label>
                <input type="text" id="voterIdInput" placeholder="Наприклад: STUD-001" style="width: 100%; padding: 10px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 16px;">
            </div>

            <ul class="candidate-list">
        `;

        if (data.results && data.results.length > 0) {
            data.results.forEach(cand => {
                html += `
                    <li class="candidate-item">
                        <span><strong>${cand.name}</strong> (${cand.party || '—'})</span>
                        <span>${cand.votes || cand.votesCount || 0} голосів (${cand.percentage || '0.00%'})</span>
                        <button class="btn" onclick="castVote('${pollId}', '${cand.id || cand.candidate_id || cand._id || cand.name}')">Голосувати</button>
                    </li>
                `;
            });
        } else {
            html += '<p>Кандидатів поки немає (або результати приховані).</p>';
        }

        html += `</ul><button class="btn" style="margin-top: 15px;" onclick="loadPage('polls')">⬅ Назад до списку</button>`;
        contentDiv.innerHTML = html;
        
    } catch (error) {
        contentDiv.innerHTML = `<p>Не вдалося зв'язатися з сервером.</p><button class="btn" style="margin-top: 15px;" onclick="loadPage('polls')">Назад</button>`;
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
            body: JSON.stringify({ title, expires_at: expiresAt })
        });
        
        if (res.ok) {
            alert('Опитування створено!');
            loadPage('polls');
        } else {
            alert('Помилка при створенні');
        }
    } catch (err) {
        alert('Помилка сервера');
    }
}

async function deletePoll(pollId) {
    if (!confirm('Точно видалити це опитування?')) return;
    
    try {
        const res = await fetch(`/polls/${pollId}`, { 
            method: 'DELETE',
            headers: { 'x-admin-key': 'secret123' } 
        });
        
        if (res.ok) {
            alert('Видалено!');
            loadPage('polls');
        } else {
            const data = await res.json();
            alert('Помилка: ' + (data.error || 'Не вдалося видалити'));
        }
    } catch (err) {
        alert('Помилка видалення');
    }
}

async function castVote(pollId, candidateId) {
    // Жодних prompt()! Беремо дані ТІЛЬКИ з поля на сторінці
    const voterIdInput = document.getElementById('voterIdInput');
    const voterId = voterIdInput ? voterIdInput.value.trim() : '';

    if (!voterId) {
        alert('Будь ласка, введіть свій ID студента у поле вище!');
        voterIdInput.style.border = '2px solid #EF4444'; // Червона рамка
        voterIdInput.focus();
        return;
    }

    try {
        const res = await fetch('/votes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pollId, candidateId, voterId })
        });
        
        const result = await res.json();
        
        if (res.ok) {
            alert('Ваш голос успішно враховано!');
            loadPage('view', pollId); // Оновлюємо сторінку результатів
        } else {
            alert('Помилка: ' + (result.error || result.message));
        }
    } catch (err) {
        alert('Помилка сервера при голосуванні');
    }
}

async function registerVoter(event) {
    event.preventDefault();
    const fullName = document.getElementById('voterName').value;
    const voterId = document.getElementById('newVoterId').value;

    try {
        // Робимо запит на створення користувача (згідно з твоїми тестами це /users/new)
        const res = await fetch('/users/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, voterId }) // Передаємо ПІБ та ID
        });
        
        const data = await res.json();
        
        if (res.ok || res.status === 201) {
            alert(`Виборця успішно зареєстровано! Ваш ID: ${voterId}. Тепер ви можете голосувати.`);
            loadPage('polls'); // Повертаємось на головну
        } else {
            alert('Помилка реєстрації: ' + (data.error || data.message || 'Не вдалося створити'));
        }
    } catch (err) {
        alert('Помилка сервера при реєстрації');
    }
}

// При відкритті сторінки одразу вантажимо список
window.onload = () => loadPage('polls');