(function () {
  const tg = window.Telegram?.WebApp;
  if (tg) tg.expand();
  const INIT_DATA = tg?.initData || "";         // строка initData (для подписи)
  const API = "http://81.19.135.85:8080";       // <-- поставь IP сервера (или домен, если есть https)

  // UI элементы (как в твоём HTML)
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
  const $save = document.getElementById("save");
  const $cancel = document.getElementById("cancel");

  const $agendaDate = document.getElementById("agendaDate");
  const $showAgenda = document.getElementById("showAgenda");

  // в блоке «быстрый перенос/отмена»
  const $eventId = document.getElementById("eventId");
  const $moveDate = document.getElementById("moveDate");
  const $moveTime = document.getElementById("moveTime");
  const $moveDur = document.getElementById("moveDur");
  const $moveEvent = document.getElementById("moveEvent");
  const $deleteEvent = document.getElementById("deleteEvent");

  // контейнер для списка
  const agendaListCard = document.createElement("div");
  agendaListCard.className = "card";
  $pageAgenda.appendChild(agendaListCard);

  const toast = (m) => tg?.showPopup?.({message:m}) || alert(m);
  const setLoading = (el, st) => { el.disabled=st; el.dataset.label ??= el.textContent; el.textContent = st? "Подождите…" : el.dataset.label; };

  // вкладки
  function switchTab(plan) {
    $tabPlan.classList.toggle("active", plan);
    $tabAgenda.classList.toggle("active", !plan);
    $pagePlan.classList.toggle("active", plan);
    $pageAgenda.classList.toggle("active", !plan);
  }
  $tabPlan.onclick = ()=>switchTab(true);
  $tabAgenda.onclick = ()=>switchTab(false);

  // Дата/время по умолчанию
  const now = new Date();
  const yyyy = now.getFullYear(), mm = String(now.getMonth()+1).padStart(2,"0"), dd = String(now.getDate()).padStart(2,"0");
  const round5 = (n)=>Math.round(n/5)*5;
  const hh = String(now.getHours()).padStart(2,"0"), mn = String(round5(now.getMinutes()+5)%60).padStart(2,"0");
  const today = `${yyyy}-${mm}-${dd}`;
  $date.value = today; $date.min = today; $time.value = `${hh}:${mn}`;
  $agendaDate.value = today;

  // длительность
  const labelDur = (m)=> m<60 ? `${m} мин` : `${(m/60|0)} ч${m%60?` ${(m%60)} мин`:``}`;
  $durLabel.textContent = labelDur($duration.value);
  $duration.oninput = ()=> $durLabel.textContent = labelDur($duration.value);
  document.querySelectorAll("[data-dur]").forEach(b=>b.onclick=()=>{ $duration.value=b.dataset.dur; $durLabel.textContent=labelDur(b.dataset.dur); });

  // API helper
  async function api(path, opts={}){
    const url = new URL(API + path);
    url.searchParams.set("initData", INIT_DATA);
    const res = await fetch(url, {
      method: opts.method || "GET",
      headers: {"content-type":"application/json"},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(()=>({ok:false}));
    if (!res.ok || !data.ok) throw {status:res.status, ...data};
    return data;
  }

  // Рендер списка дня
  async function loadAgenda() {
    agendaListCard.innerHTML = "<h3>Встречи</h3><div class='muted'>Загружаю…</div>";
    try{
      const d = $agendaDate.value;
      const {items} = (await api(`/api/day?date=${encodeURIComponent(d)}`));
      if (!items || !items.length) {
        agendaListCard.innerHTML = "<h3>Встречи</h3><div class='muted'>На выбранный день ничего</div>";
        return;
      }
      const wrap = document.createElement("div");
      wrap.className = "list";
      items.forEach(ev=>{
        const s = new Date(ev.start), e = new Date(ev.end);
        const row = document.createElement("div");
        row.className = "card"; row.style.marginTop="10px";
        row.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <div>
              <div style="font-weight:700">${ev.title}</div>
              <div class="muted small">${s.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}–${e.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} · ${ev.category} · #${ev.id}</div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="button" data-act="move" data-id="${ev.id}">Перенести</button>
              <button class="button danger" data-act="del" data-id="${ev.id}">Удалить</button>
            </div>
          </div>`;
        wrap.appendChild(row);
      });
      agendaListCard.innerHTML = "<h3>Встречи</h3>";
      agendaListCard.appendChild(wrap);

      wrap.addEventListener("click", async (e)=>{
        const btn = e.target.closest("button"); if(!btn) return;
        const id = Number(btn.dataset.id);
        if (btn.dataset.act==="del"){
          if (!confirm(`Удалить встречу #${id}?`)) return;
          try{ await api("/api/delete",{method:"POST", body:{id}}); toast("Удалено"); loadAgenda(); }
          catch(err){ toast(err.error||"Ошибка"); }
        } else if (btn.dataset.act==="move"){
          // берём поля из блока «быстрый перенос»; можно сделать всплывающее окно — тут попроще
          const d = $moveDate.value, t = $moveTime.value, dur = Number($moveDur.value||60);
          if (!d || !t) return toast("Укажи новую дату и время (в блоке ниже)");
          try{ await api("/api/move",{method:"POST", body:{id, date:d, time:t, duration:dur}}); toast("Перенесено"); loadAgenda(); }
          catch(err){ toast(err.error==="conflict"?"Слот занят":"Ошибка"); }
        }
      });

    } catch(err){
      agendaListCard.innerHTML = "<h3>Встречи</h3><div class='muted'>Ошибка загрузки</div>";
      console.error(err);
      toast(err.error || "Ошибка");
    }
  }

  // Слушатели
  $showAgenda.onclick = loadAgenda;

  $save.onclick = async ()=>{
    if (!$date.value || !$time.value || !$title.value.trim()) return toast("Заполни дату, время и название");
    const body = {
      date:$date.value, time:$time.value, duration:Number($duration.value),
      category:$category.value, title:$title.value.trim(),
      participants: ($participants.value||"").split(",").map(s=>s.trim()).filter(Boolean),
      allow_overlap: $allowOverlap.checked
    };
    setLoading($save,true);
    try{
      const r = await api("/api/create",{method:"POST", body});
      if (r.unresolved?.length) toast("Некоторых участников уведомить не удалось: " + r.unresolved.join(", "));
      toast("Создано");
      // обновим расписание, если открыта вкладка
      if ($tabAgenda.classList.contains("active")) loadAgenda();
      tg?.close?.();
    } catch(err){
      if (err.status===409 && err.error==="conflict") {
        if (confirm("Этот слот занят. Создать всё равно?")){
          try{
            body.allow_overlap = true;
            await api("/api/create",{method:"POST", body});
            toast("Создано (с пересечением)");
            if ($tabAgenda.classList.contains("active")) loadAgenda();
            tg?.close?.();
          }catch(e){ toast(e.error||"Ошибка"); }
        }
      } else {
        toast(err.error||"Ошибка");
      }
    } finally {
      setLoading($save,false);
    }
  };

  $cancel.onclick = ()=> tg?.close?.();

  $moveEvent.onclick = async ()=>{
    const id = Number($eventId.value), d=$moveDate.value, t=$moveTime.value, dur=Number($moveDur.value||60);
    if (!id || !d || !t) return toast("Укажи ID, новую дату и время");
    try{ await api("/api/move",{method:"POST", body:{id,date:d,time:t,duration:dur}}); toast("Перенесено"); loadAgenda(); }
    catch(err){ toast(err.error==="conflict"?"Слот занят":"Ошибка"); }
  };

  $deleteEvent.onclick = async ()=>{
    const id = Number($eventId.value); if(!id) return toast("Укажи ID");
    if (!confirm(`Удалить встречу #${id}?`)) return;
    try{ await api("/api/delete",{method:"POST", body:{id}}); toast("Удалено"); loadAgenda(); }
    catch(err){ toast(err.error||"Ошибка"); }
  };

  // Первый рендер списка
  switchTab(false);
  loadAgenda();
})();
