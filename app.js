let cfg, H, API, editingId = null;
const $ = id => document.getElementById(id);
const msg = t => $('status-message').textContent = t;

async function api(path, opts = {}) {
  const r = await fetch(API + path, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json().catch(() => null);
}

async function load() {
  try {
    const tasks = await api('?select=*&order=id');
    const list = $('task-list'); list.innerHTML = '';
    tasks.forEach(t => {
      const d = document.createElement('div');
      d.className = 'task-item'; d.dataset.id = t.id;
      d.innerHTML = `
        <strong class="task-title"></strong>
        <span class="task-description"></span>
        <em class="task-status">${t.completed ? 'Completed' : 'Incomplete'}</em>
        <button class="edit-task">Edit</button>
        <button class="delete-task">Delete</button>
        <button class="toggle-task">${t.completed ? 'Mark incomplete' : 'Mark complete'}</button>`;
      d.querySelector('.task-title').textContent = t.title;
      d.querySelector('.task-description').textContent = t.description || '';
      d.querySelector('.edit-task').onclick = () => {
        editingId = t.id;
        $('task-title').value = t.title;
        $('task-description').value = t.description || '';
        $('task-submit').textContent = 'Save';
      };
      d.querySelector('.delete-task').onclick = () => run(() => api(`?id=eq.${t.id}`, { method: 'DELETE' }));
      d.querySelector('.toggle-task').onclick = () => run(() => api(`?id=eq.${t.id}`, {
        method: 'PATCH', body: JSON.stringify({ completed: !t.completed }) }));
      list.appendChild(d);
    });
    msg('');
  } catch (e) { msg('Error: ' + e.message); }
}

async function run(fn) {
  try { await fn(); await load(); } catch (e) { msg('Error: ' + e.message); }
}

(async () => {
  cfg = await (await fetch('config.json')).json();
  API = `${cfg.supabaseUrl}/rest/v1/${cfg.tableName}`;
  H = { apikey: cfg.supabasePublishableKey, 'Content-Type': 'application/json' };

  $('task-form').onsubmit = e => {
    e.preventDefault();
    const body = JSON.stringify({ title: $('task-title').value, description: $('task-description').value });
    const wasEditing = editingId;
    run(async () => {
      if (wasEditing) await api(`?id=eq.${wasEditing}`, { method: 'PATCH', body });
      else await api('', { method: 'POST', body });
      editingId = null; $('task-form').reset(); $('task-submit').textContent = 'Add';
    });
  };
  load();
})();
