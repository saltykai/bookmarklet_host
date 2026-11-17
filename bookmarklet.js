(async function () {
  // 指定時間待機するユーティリティ関数
  function s(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // input要素の値をネイティブに設定する関数
  function SNV(el, val) {
    const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    d?.set ? d.set.call(el, val) : el.value = val;
  }

  // イベントを発火させる関数
  function fire(el, t, i) {
    el.dispatchEvent(new Event(t, Object.assign({ bubbles: true }, i || {})));
  }

  // フォーカスを外すための補助関数
  function focusAway(f) {
    const b = document.createElement("button");
    b.type = "button";
    b.style = "position:fixed;left:-9999px;top:-9999px";
    b.tabIndex = 0;
    b.textContent = ".";
    document.body.appendChild(b);
    try { b.focus(); } catch {}
    try { f.blur(); } catch {}
    try { f.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); } catch {
      const e = document.createEvent("Event");
      e.initEvent("focusout", true, false);
      f.dispatchEvent(e);
    }
    setTimeout(() => {
      try { document.body.removeChild(b); } catch {}
    }, 80);
  }

  // 自宅チェックボックスを軽量に選択する関数
  function selectHomeLightweight() {
    const labels = document.querySelectorAll("footer label.checkbox");
    for (const label of labels) {
      const span = label.querySelector(".checkbox__label");
      if (span && span.textContent.trim() === "自宅") {
        const cb = label.querySelector("input[type='checkbox']");
        if (cb && !cb.checked) {
          label.scrollIntoView({ block: "center" });
          label.click();
          fire(cb, "input");
          fire(cb, "change");
          focusAway(cb);
        }
        break;
      }
    }
  }

  // 小数時間をHHMM形式に変換する関数
  function toHHMM(val) {
    val = Number(val);
    if (isNaN(val) || val <= 0) return "";
    let h = Math.floor(val), m = Math.round((val - h) * 60);
    if (m === 60) { h += 1; m = 0; }
    return String(h).padStart(2, "0") + String(m).padStart(2, "0");
  }

  // ===== 乖離理由の自動選択 =====
  const REASON_KEY = "tsBookmarklet.divergenceReason";
  function getSavedReason() { try { return localStorage.getItem(REASON_KEY) || ""; } catch { return ""; } }
  function saveReason(v) { try { v ? localStorage.setItem(REASON_KEY, v) : localStorage.removeItem(REASON_KEY); } catch {} }

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  }

  // 「乖離理由」欄のプルダウンボタンを探す（乖離がないときは null）
  function findReasonDropdown() {
    for (const set of document.querySelectorAll('[data-testid="form-set"]')) {
      const label = set.querySelector(".label__main");
      if (label && label.textContent.trim().startsWith("乖離理由")) {
        const btn = set.querySelector("button.dropdown-button");
        if (btn && isVisible(btn)) return btn;
      }
    }
    return null;
  }

  // プルダウンを開いたときに表示された選択肢を集める
  function collectOptions(dropdownBtn, before) {
    // 勤務時間入力ページのプルダウン選択肢（menu-list-item）を優先して読み取る
    const items = [];
    document.querySelectorAll('[data-testid="popup-menu"] [data-testid="menu-list-item"], ul.menulist > li.menulist-item').forEach(li => {
      if (!isVisible(li)) return;
      const lbl = li.querySelector(".menulist-item__label") || li;
      const text = lbl.textContent.trim();
      if (text && !items.some(o => o.text === text)) items.push({ el: li, text });
    });
    if (items.length) return items;

    // 見つからない場合の予備（一般的なプルダウンの作り）
    const sel = '[role="option"],[role="menuitem"],[role="listbox"] > *,li,[class*="dropdown-item"],[class*="dropdown__item"],[class*="dropdown-list"] > *,[class*="dropdown-menu"] > *,[class*="option"],[class*="menu-item"]';
    const popup = document.getElementById("chargeCodeTable");
    const found = [];
    const seen = new Set();
    document.querySelectorAll(sel).forEach(el => {
      if (before.has(el) && !isVisible(el)) return;
      if (dropdownBtn.contains(el) || (popup && popup.contains(el)) || !isVisible(el)) return;
      const text = el.textContent.trim();
      if (!text || text.length > 80 || seen.has(text)) return;
      if (el.querySelector(sel)) return; // 一番内側の要素だけ
      seen.add(text);
      found.push({ el, text });
    });
    return found;
  }

  function clickOption(el) {
    el.scrollIntoView({ block: "center" });
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(t =>
      el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })));
  }

  // 選択肢の中から乖離理由を選ばせる小さなポップアップ（選んだ理由は次回から自動選択）
  function askReason(options) {
    return new Promise(resolve => {
      const box = document.createElement("div");
      box.id = "divergenceReasonPicker";
      box.style = "position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:10000;background:#fff;padding:12px;border:1px solid #ccc;box-shadow:0 2px 6px rgba(0,0,0,.2);max-height:80vh;overflow-y:auto;font-size:14px;min-width:280px";
      const head = document.createElement("div");
      head.textContent = "乖離理由を選んでください（次回から自動で選択します）";
      head.style = "font-weight:bold;margin-bottom:8px;text-align:center";
      box.appendChild(head);
      options.forEach(o => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = o.text;
        b.style = "display:block;width:100%;margin:4px 0;padding:6px 10px;background:#fff;color:#007BFF;border:1px solid #007BFF;border-radius:4px;cursor:pointer;text-align:left";
        b.onclick = () => { box.remove(); resolve(o); };
        box.appendChild(b);
      });
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "自動選択しない";
      cancel.style = "display:block;width:100%;margin-top:8px;padding:6px 10px;background:#fff;color:#666;border:1px solid #ccc;border-radius:4px;cursor:pointer";
      cancel.onclick = () => { box.remove(); resolve(null); };
      box.appendChild(cancel);
      document.body.appendChild(box);
    });
  }

  // 実際のマウス操作に近いイベントを順に送る
  function realClick(el) {
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
    try { el.dispatchEvent(new PointerEvent("pointerdown", o)); } catch {}
    el.dispatchEvent(new MouseEvent("mousedown", o));
    try { el.focus(); } catch {}
    try { el.dispatchEvent(new PointerEvent("pointerup", o)); } catch {}
    el.dispatchEvent(new MouseEvent("mouseup", o));
    el.dispatchEvent(new MouseEvent("click", o));
  }

  // 指定条件を満たすまで待つ（最大 timeout ミリ秒）
  async function waitFor(fn, timeout) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const v = fn();
      if (v) return v;
      await s(100);
    }
    return fn();
  }

  function menuItems() {
    return [...document.querySelectorAll('[data-testid="menu-list-item"], li.menulist-item')].filter(isVisible);
  }

  // 乖離理由のプルダウンを開き、選択肢を返す（開けなければ空配列）
  async function openReasonMenu() {
    const btn = findReasonDropdown();
    if (!btn) return [];
    if (menuItems().length) return collectOptions(btn, new Set());
    const before = new Set(document.querySelectorAll("*"));
    // 1回目：通常のクリック → 2回目：マウス操作を再現したクリック
    btn.click();
    if (await waitFor(() => menuItems().length, 1500)) return collectOptions(btn, before);
    realClick(btn);
    if (await waitFor(() => menuItems().length, 1500)) return collectOptions(btn, before);
    return collectOptions(btn, before);
  }

  function reasonValue() {
    const b = findReasonDropdown();
    const inner = b && b.querySelector(".dropdown-button__inner");
    return inner ? inner.textContent.trim() : "";
  }

  async function autoSelectDivergenceReason() {
    // 乖離理由欄が表示されるまで待つ（最大約5秒）
    const btn = await waitFor(findReasonDropdown, 5000);
    if (!btn) { console.log("[TS] 乖離理由欄なし（乖離なし）"); return; }
    if (reasonValue()) { console.log("[TS] 乖離理由は選択済み"); return; }

    let options = await openReasonMenu();
    console.log("[TS] 乖離理由の選択肢", options.map(o => o.text));
    if (!options.length) {
      alert("乖離理由のプルダウンを開けませんでした。手動で選択してください。");
      return;
    }

    const saved = getSavedReason();
    let target = saved ? (options.find(o => o.text === saved) || options.find(o => o.text.includes(saved))) : null;
    if (!target) {
      const picked = await askReason(options);
      if (!picked) return;
      if (!picked.text.startsWith("その他")) saveReason(picked.text);
      // 選択ポップアップの操作でメニューが閉じた場合は開き直す
      options = await openReasonMenu();
      target = options.find(o => o.text === picked.text);
      if (!target) { alert("乖離理由「" + picked.text + "」を選択できませんでした。手動で選択してください。"); return; }
    }

    const label = target.el.querySelector(".menulist-item__label") || target.el;
    realClick(label);
    let ok = await waitFor(() => reasonValue(), 1000);
    if (!ok && target.el.isConnected) { realClick(target.el); ok = await waitFor(() => reasonValue(), 1000); }

    if (!ok) {
      alert("乖離理由「" + target.text + "」の選択を確認できませんでした。画面を確認してください。");
    } else if (target.text.startsWith("その他")) {
      alert("「その他」を選択しました。理由の内容は手動で入力してください。");
    }
  }

  // 指定した時刻入力欄のすぐ横にある「翌日」チェックボックスを探す
  function findNextDayLabel(timeInput) {
    let node = timeInput;
    for (let i = 0; node && i < 8; i++) {
      node = node.parentElement;
      if (!node) break;
      for (const label of node.querySelectorAll("label.checkbox")) {
        const span = label.querySelector(".checkbox__label");
        if (span && span.textContent.trim() === "翌日") return label;
      }
    }
    return null;
  }

  // 「翌日」チェックを指定の状態（true=ON / false=OFF）にする
  async function setNextDay(timeInput, on) {
    if (!timeInput) return true;
    const label = findNextDayLabel(timeInput);
    const cb = label?.querySelector("input[type='checkbox']");
    if (!label || !cb) return true; // 翌日チェックがない欄
    for (let i = 0; i < 2 && cb.checked !== on; i++) {
      label.scrollIntoView({ block: "center" });
      i === 0 ? label.click() : cb.click();
      await s(250);
    }
    focusAway(cb);
    console.log("[TS] 翌日チェック", on ? "ON" : "OFF", "→", cb.checked === on ? "成功" : "失敗");
    return cb.checked === on;
  }

  // 自宅チェックを実行
  selectHomeLightweight();

  // 開始時刻・終了時刻の入力欄を取得（開始時刻はポップアップで選択した値を入力実行時に設定）
  const timeInputs = document.querySelectorAll('input[data-testid="time-picker-input-area"]');
  const startTimeInput = timeInputs[0], endTimeInput = timeInputs[1];
  const DEFAULT_START = "09:00";

  // 開始時刻を設定する関数（"HH:MM" → "HHMM"）
  function setStartTime(hhmm) {
    if (!startTimeInput) return;
    startTimeInput.scrollIntoView({ block: "center" });
    startTimeInput.focus();
    SNV(startTimeInput, hhmm.replace(":", ""));
    fire(startTimeInput, "input");
    fire(startTimeInput, "change");
    focusAway(startTimeInput);
  }

  try {
    // チャージコードを抽出
    const spans = document.querySelectorAll("span");
    const codes = [];
    spans.forEach(span => {
      const text = span.textContent.trim();
      if (/^[A-Z0-9]{4,12}$/.test(text)) {
        codes.push(text);
      }
    });

    if (codes.length <= 1) {
      alert("チャージコードが見つかりませんでした。");
      return;
    }

    const filteredCodes = codes.slice(1);

    // 既存のポップアップを削除
    const existing = document.getElementById("chargeCodeTable");
    if (existing) existing.remove();

    // 入力ポップアップを作成
    const container = document.createElement("div");
    container.id = "chargeCodeTable";
    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.left = "50%";
    container.style.transform = "translateX(-50%)";
    container.style.zIndex = "9999";
    container.style.backgroundColor = "#fff";
    container.style.padding = "8px 10px";
    container.style.width = "300px";
    container.style.boxSizing = "border-box";
    container.style.border = "1px solid #ccc";
    container.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
    container.style.maxHeight = "80vh";
    container.style.overflowY = "auto";

    const title = document.createElement("div");
    title.textContent = "勤務時間自動入力 v1.2.5";
    title.style.textAlign = "center";
    title.style.fontWeight = "bold";
    title.style.fontSize = "15px";
    title.style.marginBottom = "4px";
    container.appendChild(title);

    // バグ修正メッセージを追加
    const updateNotice = document.createElement("div");
    updateNotice.textContent = "新機能：乖離理由の自動選択など (11/17)";
    updateNotice.style.textAlign = "center";
    updateNotice.style.backgroundColor = "#fffae6";
    updateNotice.style.color = "#333";
    updateNotice.style.border = "1px solid #f0c36d";
    updateNotice.style.borderRadius = "8px";
    updateNotice.style.padding = "3px 8px";
    updateNotice.style.fontSize = "12px";
    updateNotice.style.marginBottom = "4px";
    updateNotice.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
    updateNotice.style.animation = "fadeIn 0.8s ease";
    container.appendChild(updateNotice);

    // アニメーション定義
    const styleTag = document.createElement("style");
    styleTag.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }`;
    document.head.appendChild(styleTag);

    const credit = document.createElement("div");
    credit.textContent = "Developed by SHIOTA";
    credit.style.textAlign = "center";
    credit.style.fontSize = "10px";
    credit.style.color = "#666";
    credit.style.marginBottom = "6px";
    credit.style.lineHeight = "1.2";
    container.appendChild(credit);

     // スタイル
    const style = document.createElement("style");
    style.textContent = `
      #chargeCodeTable button {
        background:#fff;
        color:#007BFF;
        font-weight:bold;
        border:1px solid #007BFF;
        border-radius:4px;
        padding:8px 16px;
        font-size:14px;
        cursor:pointer
      }
      #chargeCodeTable button:hover {
        background:#007BFF;
        color:#fff
      }
      #chargeCodeTable input::placeholder {
        color:#aaa
      }
    `;
    document.head.appendChild(style);

    // 開始時刻（初期値 9:00、15分刻み）と乖離理由の自動選択を1行に表示
    const optRow = document.createElement("div");
    optRow.style = "display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;font-size:12px;white-space:nowrap";

    const startLabel = document.createElement("label");
    startLabel.textContent = "開始 ";
    startLabel.style.fontWeight = "bold";
    const startPicker = document.createElement("input");
    startPicker.type = "time";
    startPicker.step = "900";
    startPicker.value = DEFAULT_START;
    startPicker.style.fontSize = "13px";
    startPicker.style.padding = "1px 2px";
    startLabel.appendChild(startPicker);
    optRow.appendChild(startLabel);

    // 乖離理由の設定表示（長い理由は省略表示、マウスを乗せると全文。保存済みの理由は「変更」でクリア）
    const reasonWrap = document.createElement("div");
    reasonWrap.style = "display:flex;align-items:center;gap:3px;min-width:0;color:#555";
    const renderReason = () => {
      reasonWrap.textContent = "";
      const r = getSavedReason();
      const head = document.createElement("span");
      head.textContent = "乖離理由:";
      head.style.fontWeight = "bold";
      const val = document.createElement("span");
      val.textContent = r || "未設定";
      val.title = r ? r : "乖離時に選択肢を表示します";
      val.style = "overflow:hidden;text-overflow:ellipsis;max-width:100px;display:inline-block;vertical-align:bottom";
      reasonWrap.appendChild(head);
      reasonWrap.appendChild(val);
      if (r) {
        const clr = document.createElement("a");
        clr.href = "#";
        clr.textContent = "変更";
        clr.onclick = e => { e.preventDefault(); saveReason(""); renderReason(); };
        reasonWrap.appendChild(clr);
      }
    };
    renderReason();
    optRow.appendChild(reasonWrap);
    container.appendChild(optRow);

    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";
    table.style.fontSize = "14px";
    table.style.textAlign = "center";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["チャージコード", "関与時間"].forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      th.style.border = "1px solid #ccc";
      th.style.padding = "6px";
      th.style.backgroundColor = "#006400";
      th.style.color = "#fff";
      th.style.fontWeight = "bold";
      th.style.textAlign = "center";
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const inputs = {};
    filteredCodes.forEach((code, i) => {
      const row = document.createElement("tr");
      const tdCode = document.createElement("td");
      tdCode.textContent = code;
      tdCode.style.border = "1px solid #ccc";
      tdCode.style.padding = "6px";
      tdCode.style.textAlign = "center";

      const tdInput = document.createElement("td");
      tdInput.style.border = "1px solid #ccc";
      tdInput.style.padding = "6px";
      tdInput.style.textAlign = "center";

      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.25";
      input.min = "0";
      input.style.width = "60px";
      input.placeholder = [3, 4.5, 6.25][i] || "";
      inputs[code] = input;

      tdInput.appendChild(input);
      row.appendChild(tdCode);
      row.appendChild(tdInput);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    const btnWrap = document.createElement("div");
    btnWrap.style.textAlign = "center";
    btnWrap.style.marginTop = "12px";

    const btn = document.createElement("button");
    btn.textContent = "入力実行";
    btnWrap.appendChild(btn);
    container.appendChild(btnWrap);

    // 入力実行ボタンの処理
    btn.onclick = async () => {
      let totalMinutes = 0;

      // 「翌日」チェックが入っているとエラーになるため、最初に外す
      const okStart = await setNextDay(startTimeInput, false);
      const okEnd = await setNextDay(endTimeInput, false);
      if (!okStart || !okEnd) {
        alert("「翌日」のチェックを外せませんでした。手動で外してから再度実行してください。");
        return;
      }

      // 選択した開始時刻を取得（未入力・不正値なら9:00）
      const startVal = /^\d{2}:\d{2}$/.test(startPicker.value) ? startPicker.value : DEFAULT_START;
      const [startHour, startMinute] = startVal.split(":").map(Number);

      // 開始時刻を入力
      setStartTime(startVal);
      await s(160);

      // 各チャージコードに関与時間を入力
      for (const code of filteredCodes) {
        const val = toHHMM(Number(inputs[code].value));
        if (!val) continue;
        const mins = Number(inputs[code].value) * 60;
        if (!isNaN(mins)) totalMinutes += Math.round(mins);

        try {
          const inp = document.evaluate(
            `(//span[normalize-space(.)='${code}']/ancestor::div[@data-testid='slot'][1]/following::div[@data-testid='time-picker'][1])//input[@data-testid='time-picker-input-area']`,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue;
          if (!inp) throw "input not found for code: " + code;
          inp.scrollIntoView({ block: "center" });
          inp.focus();
          SNV(inp, val);
          fire(inp, "input");
          fire(inp, "change");
          focusAway(inp);
          await s(160);
        } catch (e) {
          console.warn(e);
          alert("入力失敗: " + code + "\n" + e);
        }
      }

            // 終了時刻を計算（開始時刻 + 関与時間合計 + 休憩1時間）
      let endTotal = startHour * 60 + startMinute + totalMinutes + 60;
      let endHour = Math.floor(endTotal / 60), endMinute = endTotal % 60;
      const isNextDay = endHour >= 24;
      if (isNextDay) endHour -= 24;
      const endTimeStr = String(endHour).padStart(2, "0") + String(endMinute).padStart(2, "0");

      // 日付をまたぐ場合は「翌日」チェックをON
      if (isNextDay) await setNextDay(endTimeInput, true);

      // 終了時刻を入力
      if (endTimeInput) {
        endTimeInput.scrollIntoView({ block: "center" });
        endTimeInput.focus();
        SNV(endTimeInput, endTimeStr);
        fire(endTimeInput, "input");
        fire(endTimeInput, "change");
        focusAway(endTimeInput);
      } else {
        alert("終了時刻の入力フィールドが見つかりませんでした。");
      }

      // 入力完了後にポップアップを削除
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }

      // 乖離が発生していれば乖離理由を自動選択
      try { await autoSelectDivergenceReason(); } catch (e) { console.warn(e); }
    };

    // ポップアップを画面に表示
    document.body.appendChild(container);
  } catch (e) {
    alert("エラー: " + e.message);
  }
})();
