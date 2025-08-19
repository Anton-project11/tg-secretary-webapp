(function () {
  const tg = window.Telegram?.WebApp;
  if (tg) tg.expand();

  // элементы
  const $tabPlan = document.getElementById("tab-plan");
  const $tabAgenda = document.getElementById("tab-agenda");
  const $pagePlan = document.getElementById("page-plan");
  const $pageAgenda = document.getElementById("page-agenda");

  const $date = document.getElementById("date");
  const $time = document.getElementById("time");
  const $duration = document.getElementById("duration");
  const $durLabel = document.getElementById("durLabel");
  const $category = document.getElementById("category");
  const $title = document.getElementById("title");
  const $participants = document.getElementById("participants");
  const $allowOverlap = document.getElementById("allowOverlap");

  const $agendaDate = document.getElementById("agendaDate");
  const $eventId = document.getElementById("eventId");
  const $moveDate = document.getElementById("moveDate");
  const $moveTime = document.getElementById("moveTime");
  const $moveDur = document.getElementById("moveDur");

  const $save = document.getElementById("save");
  const $cancel = document.getElementById("cancel");
  const $showAgenda = document.getElementById("showAgenda");
  const $moveEvent = document.getElementById("moveEvent");
  const $deleteEvent = document.getElementById("deleteEvent");

  // UI helpers
  const toast = (m) => tg?.showPopup?.({message: m}) || alert(m);
  const setLoading = (el, ok) => { el.disabled = ok; el.textContent = ok ? "Подождите…" : el.dataset.label || el.textContent; };

  // вкладки
  const switchTab = (toPlan) => {
    $tabPlan.classList.toggle("active", toPlan);
    $tabAgenda.classList.toggle("active", !toPlan);
    $pagePlan.classList.toggle("active", toPlan);
    $pageAgenda.classList.toggle("active", !toPlan);
  };
  $tabPlan.onclick = () => switchTab(true);
  $tabAgenda.onclick = () => switchTab(false);

  // даты по умолчанию
  const now = new Date();
  const yyyy = now.getFullYear(), mm = String(now.getMonth()+1).padStart(2,"0"), dd = String(now.getDate()).padStart(2,"0");
  const round5 = (n)=>Math.round(n/5)*5;
  const hh = String(now.getHours()).padStart(2,"0"), mn = String(round5(now.getMinutes()+5)%60).padStart(2,"0");
  const today = `${yyyy}-${mm}-${dd}`;
  $date.value = today; $date.min = today;
  $time.value = `${hh}:${mn}`;
  $agendaDate.value = today;

  // длительность
  const labelDur = (m)=> m<60 ? `${m} мин` : `${(m/60|0)} ч${m%60?` ${(m%60)} мин`:``}`;
  $durLabel.textContent = labelDur($duration.value);
  $duration.oninput = ()=> $durLabel.textContent = labelDur($duration.value);
  document.querySelectorAll("[data-dur]").forEach(b=>b.onclick=()=>{ $duration.value=b.dataset.dur; $durLabel.textContent=labelDur(b.dataset.dur); });

  // парс участников
  const parseParticipants = (s="") =>
    s.split(",").map(x=>x.trim()).filter(Boolean);

  // отправка в бота
  const send = (payload) => tg?.sendData?.(JSON.stringify(payload));

  // PLAN -> save
  $save.dataset.label = "Сохранить";
  $save.onclick = () => {
    if (!$date.value || !$time.value || !$title.value.trim()) return toast("Заполни дату, время и название");
    const payload = {
      kind: "create_event",
      date: $date.value,
      time: $time.value,
      duration: Number($duration.value),
      category: $category.value,
      title: $title.value.trim(),
      participants: parseParticipants($participants.value), // @user или chat_id
      allow_overlap: $allowOverlap.checked
    };
    setLoading($save, true);
    send(payload);
    setTimeout(()=>{ setLoading($save,false); toast("Отправлено боту. Результат в чате."); tg?.close?.(); }, 400);
  };

  $cancel.onclick = ()=> tg?.close?.();

  // AGENDA -> показать
  $showAgenda.dataset.label = "Показать в чате";
  $showAgenda.onclick = ()=>{
    if (!$agendaDate.value) return toast("Выбери дату");
    send({kind:"list_day", date:$agendaDate.value});
    toast("Запрос отправлен. Смотри список в чате.");
  };

  // перенос
  $moveEvent.dataset.label = "Перенести";
  $moveEvent.onclick = ()=>{
    const id = Number($eventId.value);
    if (!id || !$moveDate.value || !$moveTime.value) return toast("Укажи ID, новую дату и время");
    const dur = Number($moveDur.value)||60;
    send({kind:"move_event", id, date:$moveDate.value, time:$moveTime.value, duration:dur});
    toast("Запрос отправлен. Результат в чате.");
  };

  // отмена
  $deleteEvent.dataset.label = "Отменить";
  $deleteEvent.onclick = ()=>{
    const id = Number($eventId.value);
    if (!id) return toast("Укажи ID встречи");
    send({kind:"delete_event", id});
    toast("Запрос отправлен. Результат в чате.");
  };
})();
