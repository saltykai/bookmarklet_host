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

  // 自宅チェックを実行
  selectHomeLightweight();

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
    container.style.padding = "12px";
    container.style.border = "1px solid #ccc";
    container.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
    container.style.maxHeight = "80vh";
    container.style.overflowY = "auto";

    const title = document.createElement("div");
    title.textContent = "勤務時間自動入力";
    title.style.textAlign = "center";
    title.style.fontWeight = "bold";
    title.style.fontSize = "16px";
    title.style.marginBottom = "12px";
    container.appendChild(title);

    const credit = document.createElement("div");
    credit.textContent = "Developed by SHIOTA";
    credit.style.textAlign = "center";
    credit.style.fontSize = "10px";
    credit.style.color = "#666";
    credit.style.marginBottom = "6px";
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

      // 開始時刻を0900に設定
      const timeInputs = document.querySelectorAll('input[data-testid="time-picker-input-area"]');
      const startTimeInput = timeInputs[0], endTimeInput = timeInputs[1];
      if (startTimeInput) {
        startTimeInput.scrollIntoView({ block: "center" });
        startTimeInput.focus();
        SNV(startTimeInput, "0900");
        fire(startTimeInput, "input");
        fire(startTimeInput, "change");
        focusAway(startTimeInput);
      }

      // 終了時刻を計算（関与時間合計 + 休憩1時間）
      const startHour = 9, startMinute = 0;
      let endTotal = startHour * 60 + startMinute + totalMinutes + 60;
      let endHour = Math.floor(endTotal / 60), endMinute = endTotal % 60;
      const isNextDay = endHour >= 24;
      if (isNextDay) endHour -= 24;
      const endTimeStr = String(endHour).padStart(2, "0") + String(endMinute).padStart(2, "0");

      // 翌日チェックボックスをON
      const checkboxes = document.querySelectorAll("label.checkbox");
      const nextDayCheckboxLabel = checkboxes.length >= 2 ? checkboxes[1] : null;
      const nextDayCheckbox = nextDayCheckboxLabel?.querySelector("input[type='checkbox']");
      if (isNextDay && nextDayCheckbox && !nextDayCheckbox.checked) {
        nextDayCheckboxLabel.scrollIntoView({ block: "center" });
        nextDayCheckboxLabel.click();
        fire(nextDayCheckbox, "input");
        fire(nextDayCheckbox, "change");
        focusAway(nextDayCheckbox);
      }

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
    };

    // ポップアップを画面に表示
    document.body.appendChild(container);
  } catch (e) {
    alert("エラー: " + e.message);
  }
})();
