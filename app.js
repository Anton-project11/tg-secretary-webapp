(function () {
  const tg = window.Telegram.WebApp;
  tg.expand();
  tg.MainButton.hide();

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('date').value =
    `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  document.getElementById('time').value =
    `${pad(now.getHours())}:${pad(Math.round(now.getMinutes()/5)*5 % 60)}`;

  const dur = document.getElementById('duration');
  const durLabel = document.getElementById('durLabel');
  const setDurLabel = v => {
    v = Number(v);
    const h = Math.floor(v/60), m = v%60;
    durLabel.textContent = h ? `${h} ч ${pad(m)} мин` : `${m} мин`;
  };
  setDurLabel(dur.value);
  dur.addEventListener('input', e => setDurLabel(e.target.value));
  document.querySelectorAll('.chips button').forEach(b => {
    b.addEventListener('click', () => { dur.value = b.dataset.dur; setDurLabel(dur.value); });
  });

  document.getElementById('cancel').onclick = () => tg.close();

  document.getElementById('save').onclick = () => {
    const payload = {
      kind: "create_event",
      date: document.getElementById('date').value,     // YYYY-MM-DD
      time: document.getElementById('time').value,     // HH:MM
      duration: Number(document.getElementById('duration').value),
      category: document.getElementById('category').value,
      title: (document.getElementById('title').value || "").trim()
    };
    if (!payload.title) {
      tg.showPopup({title:"Название", message:"Введите название встречи", buttons:[{type:'close'}]});
      return;
    }
    tg.sendData(JSON.stringify(payload)); // отправляем данные боту
    tg.close();
  };
})();
