(() => {
  "use strict";

  const STORAGE_KEY = "personal-budget-dashboard-v1";
  const WEEKLY_TO_MONTHLY = 52 / 12;
  const VALID_TYPES = ["essential", "variable", "debt", "savings", "discretionary", "other"];
  const TYPE_LABELS = {
    essential: "Core Systems",
    variable: "Variable Intel",
    debt: "Debt Target",
    savings: "Shield Reserve",
    discretionary: "Rec Time",
    other: "Custom Module"
  };

  const DEFAULT_BUCKETS = [
    { id: "rent", name: "Rent", budgeted: 0, actual: 0, type: "essential", custom: false },
    { id: "electric", name: "Electric", budgeted: 0, actual: 0, type: "variable", custom: false },
    { id: "internet", name: "Internet", budgeted: 0, actual: 0, type: "essential", custom: false },
    { id: "phone", name: "Phone", budgeted: 0, actual: 0, type: "essential", custom: false },
    { id: "subscriptions", name: "Subscriptions", budgeted: 0, actual: 0, type: "discretionary", custom: false },
    { id: "car-insurance", name: "Car Insurance", budgeted: 0, actual: 0, type: "essential", custom: false },
    { id: "gas", name: "Gas", budgeted: 0, actual: 0, type: "variable", custom: false },
    { id: "groceries", name: "Groceries", budgeted: 0, actual: 0, type: "variable", custom: false },
    { id: "truck-payment", name: "Truck Payment", budgeted: 0, actual: 0, type: "debt", custom: false },
    { id: "student-loan", name: "Student Loan", budgeted: 0, actual: 0, type: "debt", custom: false },
    { id: "snap-on-loan", name: "Snap-on Loan", budgeted: 0, actual: 0, type: "debt", custom: false },
    { id: "other-debt", name: "Other Debt", budgeted: 0, actual: 0, type: "debt", custom: false },
    { id: "fun-money", name: "Fun Money", budgeted: 0, actual: 0, type: "discretionary", custom: false },
    { id: "emergency-savings", name: "Emergency Savings", budgeted: 0, actual: 0, type: "savings", custom: false },
    { id: "house-down-payment-savings", name: "House Down Payment Savings", budgeted: 0, actual: 0, type: "savings", custom: false }
  ];

  const DEFAULT_BUCKET_IDS = new Set(DEFAULT_BUCKETS.map((bucket) => bucket.id));

  let state = createDefaultState();
  let toastTimer = 0;

  const elements = {};

  document.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    state = loadState();
    renderIncomeFields();
    renderBuckets();
    renderTransactionBucketOptions();
    renderTransactions();
    wireEvents();
    updateDerivedViews();
  });

  function cacheElements() {
    elements.saveStatus = document.getElementById("saveStatus");
    elements.toast = document.getElementById("toast");
    elements.monthlyIncome = document.getElementById("monthlyIncome");
    elements.weeklyIncome = document.getElementById("weeklyIncome");
    elements.extraIncome = document.getElementById("extraIncome");
    elements.totalIncome = document.getElementById("totalIncome");
    elements.summaryIncome = document.getElementById("summaryIncome");
    elements.summaryBudgeted = document.getElementById("summaryBudgeted");
    elements.summaryActual = document.getElementById("summaryActual");
    elements.summaryToday = document.getElementById("summaryToday");
    elements.summaryRemaining = document.getElementById("summaryRemaining");
    elements.summaryOver = document.getElementById("summaryOver");
    elements.summaryDebt = document.getElementById("summaryDebt");
    elements.summarySavings = document.getElementById("summarySavings");
    elements.moneyRemainingCard = document.getElementById("moneyRemainingCard");
    elements.overBudgetCard = document.getElementById("overBudgetCard");
    elements.bucketCount = document.getElementById("bucketCount");
    elements.bucketList = document.getElementById("bucketList");
    elements.addBucket = document.getElementById("addBucket");
    elements.exportData = document.getElementById("exportData");
    elements.copyData = document.getElementById("copyData");
    elements.resetDefaults = document.getElementById("resetDefaults");
    elements.importJson = document.getElementById("importJson");
    elements.importData = document.getElementById("importData");
    elements.clearImport = document.getElementById("clearImport");
    elements.transactionForm = document.getElementById("transactionForm");
    elements.transactionDate = document.getElementById("transactionDate");
    elements.transactionBucket = document.getElementById("transactionBucket");
    elements.transactionAmount = document.getElementById("transactionAmount");
    elements.transactionNote = document.getElementById("transactionNote");
    elements.transactionTodayTotal = document.getElementById("transactionTodayTotal");
    elements.transactionCount = document.getElementById("transactionCount");
    elements.transactionList = document.getElementById("transactionList");
    elements.transactionDate.value = localDateString();
  }

  function wireEvents() {
    elements.monthlyIncome.addEventListener("input", () => updateIncome("monthly", elements.monthlyIncome.value));
    elements.weeklyIncome.addEventListener("input", () => updateIncome("weekly", elements.weeklyIncome.value));
    elements.extraIncome.addEventListener("input", () => updateIncome("extra", elements.extraIncome.value));

    elements.bucketList.addEventListener("input", handleBucketFieldChange);
    elements.bucketList.addEventListener("change", handleBucketFieldChange);
    elements.bucketList.addEventListener("click", handleBucketClick);
    elements.transactionForm.addEventListener("submit", addTransaction);
    elements.transactionList.addEventListener("click", handleTransactionClick);

    elements.addBucket.addEventListener("click", addBucket);
    elements.exportData.addEventListener("click", exportData);
    elements.copyData.addEventListener("click", copyData);
    elements.resetDefaults.addEventListener("click", resetDefaults);
    elements.importData.addEventListener("click", importData);
    elements.clearImport.addEventListener("click", () => {
      elements.importJson.value = "";
      showToast("Restore bay cleared");
    });
  }

  function updateIncome(field, value) {
    state.income[field] = moneyValue(value);
    persist();
    updateDerivedViews();
  }

  function handleBucketFieldChange(event) {
    const field = event.target.dataset.field;
    if (!field) {
      return;
    }

    const card = event.target.closest(".bucket-card");
    if (!card) {
      return;
    }

    const bucket = state.buckets.find((item) => item.id === card.dataset.id);
    if (!bucket) {
      return;
    }

    if (field === "name") {
      bucket.name = event.target.value;
      renderTransactionBucketOptions();
    } else if (field === "type") {
      bucket.type = VALID_TYPES.includes(event.target.value) ? event.target.value : "other";
      const chip = card.querySelector("[data-role='typeChip']");
      if (chip) {
        chip.textContent = TYPE_LABELS[bucket.type];
      }
    } else if (field === "budgeted" || field === "actual") {
      bucket[field] = moneyValue(event.target.value);
    }

    persist();
    updateDerivedViews();
  }

  function handleBucketClick(event) {
    const deleteButton = event.target.closest("[data-action='delete']");
    if (!deleteButton) {
      return;
    }

    const card = deleteButton.closest(".bucket-card");
    const bucket = state.buckets.find((item) => item.id === card.dataset.id);

    if (!bucket) {
      return;
    }

    const name = bucket.name.trim() || "this module";
    if (!window.confirm(`Delete ${name}?`)) {
      return;
    }

    const removedTransactions = state.transactions.filter((transaction) => transaction.bucketId === bucket.id).length;
    state.buckets = state.buckets.filter((item) => item.id !== bucket.id);
    state.transactions = state.transactions.filter((transaction) => transaction.bucketId !== bucket.id);
    persist(removedTransactions ? "Module and logs deleted" : "Module deleted");
    renderBuckets();
    renderTransactionBucketOptions();
    renderTransactions();
    updateDerivedViews();
  }

  function addBucket() {
    const bucket = {
      id: makeId(),
      name: "New Module",
      budgeted: 0,
      actual: 0,
      type: "other",
      custom: true
    };

    state.buckets.push(bucket);
    persist("Module added");
    renderBuckets();
    renderTransactionBucketOptions(bucket.id);
    updateDerivedViews();

    const newCard = elements.bucketList.querySelector(`[data-id="${bucket.id}"]`);
    const nameInput = newCard ? newCard.querySelector("[data-field='name']") : null;
    if (nameInput) {
      nameInput.focus();
      nameInput.select();
    }
  }

  function resetDefaults() {
    if (!window.confirm("Reset credits and modules to defaults?")) {
      return;
    }

    state = createDefaultState();
    persist("Defaults restored");
    renderIncomeFields();
    renderBuckets();
    renderTransactionBucketOptions();
    renderTransactions();
    updateDerivedViews();
  }

  function exportData() {
    const json = buildExportJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spartan-budget-command-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    copyText(json).then(
      () => showToast("Backup downloaded and copied"),
      () => showToast("Backup downloaded")
    );
  }

  function copyData() {
    copyText(buildExportJson()).then(
      () => showToast("Backup copied"),
      () => showToast("Copy blocked by browser")
    );
  }

  function importData() {
    const text = elements.importJson.value.trim();
    if (!text) {
      showToast("Paste backup JSON before restoring");
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      showToast("That backup could not be read");
      return;
    }

    const imported = normalizeState(parsed.state || parsed);
    if (!imported.buckets.length) {
      showToast("No budget modules found");
      return;
    }

    if (!window.confirm("Replace current budget with restored data?")) {
      return;
    }

    state = imported;
    persist("Budget restored");
    renderIncomeFields();
    renderBuckets();
    renderTransactionBucketOptions();
    renderTransactions();
    updateDerivedViews();
    elements.importJson.value = "";
  }

  function renderIncomeFields() {
    elements.monthlyIncome.value = inputNumber(state.income.monthly);
    elements.weeklyIncome.value = inputNumber(state.income.weekly);
    elements.extraIncome.value = inputNumber(state.income.extra);
  }

  function renderBuckets() {
    const fragment = document.createDocumentFragment();
    elements.bucketList.textContent = "";

    state.buckets.forEach((bucket) => {
      fragment.appendChild(createBucketCard(bucket));
    });

    elements.bucketList.appendChild(fragment);
  }

  function renderTransactionBucketOptions(preferredId) {
    const currentValue = preferredId || elements.transactionBucket.value;
    elements.transactionBucket.textContent = "";

    if (!state.buckets.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No modules available";
      elements.transactionBucket.appendChild(option);
      elements.transactionBucket.disabled = true;
      return;
    }

    elements.transactionBucket.disabled = false;
    state.buckets.forEach((bucket) => {
      const option = document.createElement("option");
      option.value = bucket.id;
      option.textContent = bucket.name.trim() || "Untitled Module";
      option.selected = bucket.id === currentValue;
      elements.transactionBucket.appendChild(option);
    });

    if (!state.buckets.some((bucket) => bucket.id === currentValue)) {
      elements.transactionBucket.value = state.buckets[0].id;
    }
  }

  function renderTransactions() {
    const fragment = document.createDocumentFragment();
    const transactions = [...state.transactions].sort(sortTransactions);

    elements.transactionList.textContent = "";
    setText(elements.transactionCount, `${state.transactions.length} ${state.transactions.length === 1 ? "transaction" : "transactions"}`);
    setText(elements.transactionTodayTotal, formatMoney(calculateTodayTransactions()));

    if (!transactions.length) {
      const empty = document.createElement("p");
      empty.className = "empty-log";
      empty.textContent = "No transactions logged yet.";
      elements.transactionList.appendChild(empty);
      return;
    }

    transactions.slice(0, 30).forEach((transaction) => {
      fragment.appendChild(createTransactionRow(transaction));
    });

    elements.transactionList.appendChild(fragment);
  }

  function createTransactionRow(transaction) {
    const row = document.createElement("article");
    row.className = "transaction-row";
    row.dataset.id = transaction.id;

    const main = document.createElement("div");
    main.className = "transaction-main";

    const title = document.createElement("strong");
    title.textContent = transaction.note || "Logged transaction";

    const meta = document.createElement("span");
    meta.textContent = `${formatDateLabel(transaction.date)} // ${getTransactionBucketName(transaction)}`;

    main.append(title, meta);

    const amount = document.createElement("strong");
    amount.className = "transaction-amount";
    amount.textContent = formatMoney(transaction.amount);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button delete-button transaction-delete";
    deleteButton.dataset.action = "delete-transaction";
    deleteButton.textContent = "Delete";

    row.append(main, amount, deleteButton);
    return row;
  }

  function addTransaction(event) {
    event.preventDefault();

    const bucket = state.buckets.find((item) => item.id === elements.transactionBucket.value);
    const amount = moneyValue(elements.transactionAmount.value);
    const date = elements.transactionDate.value || localDateString();
    const note = elements.transactionNote.value.trim();

    if (!bucket) {
      showToast("Add a module before logging");
      return;
    }

    if (!amount) {
      showToast("Enter a transaction amount");
      return;
    }

    if (!isDateString(date)) {
      showToast("Choose a valid date");
      return;
    }

    const transaction = {
      id: makeId("transaction"),
      date,
      bucketId: bucket.id,
      bucketName: bucket.name,
      amount,
      note,
      createdAt: new Date().toISOString()
    };

    bucket.actual = moneyValue(bucket.actual) + amount;
    state.transactions.push(transaction);
    persist("Transaction logged");
    renderBuckets();
    renderTransactionBucketOptions(bucket.id);
    renderTransactions();
    updateDerivedViews();
    elements.transactionAmount.value = "";
    elements.transactionNote.value = "";
    elements.transactionAmount.focus();
  }

  function handleTransactionClick(event) {
    const button = event.target.closest("[data-action='delete-transaction']");
    if (!button) {
      return;
    }

    const row = button.closest(".transaction-row");
    const transaction = state.transactions.find((item) => item.id === row.dataset.id);
    if (!transaction) {
      return;
    }

    if (!window.confirm("Delete this transaction log?")) {
      return;
    }

    const bucket = state.buckets.find((item) => item.id === transaction.bucketId);
    if (bucket) {
      bucket.actual = Math.max(0, moneyValue(bucket.actual) - moneyValue(transaction.amount));
    }

    state.transactions = state.transactions.filter((item) => item.id !== transaction.id);
    persist("Transaction deleted");
    renderBuckets();
    renderTransactionBucketOptions(bucket ? bucket.id : undefined);
    renderTransactions();
    updateDerivedViews();
  }

  function createBucketCard(bucket) {
    const card = document.createElement("article");
    card.className = "bucket-card";
    card.dataset.id = bucket.id;
    card.dataset.tone = "neutral";

    const header = document.createElement("div");
    header.className = "bucket-header";

    const dot = document.createElement("span");
    dot.className = "status-dot";
    dot.setAttribute("aria-hidden", "true");

    const nameLabel = document.createElement("label");
    nameLabel.className = "bucket-name-field";

    const hiddenName = document.createElement("span");
    hiddenName.className = "sr-only";
    hiddenName.textContent = "Module name";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = bucket.name;
    nameInput.dataset.field = "name";
    nameInput.setAttribute("aria-label", "Module name");

    nameLabel.append(hiddenName, nameInput);
    header.append(dot, nameLabel);

    const actions = document.createElement("div");
    actions.className = "bucket-actions";

    const typeChip = document.createElement("span");
    typeChip.className = "bucket-type";
    typeChip.dataset.role = "typeChip";
    typeChip.textContent = TYPE_LABELS[bucket.type] || TYPE_LABELS.other;
    actions.appendChild(typeChip);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button delete-button";
    deleteButton.dataset.action = "delete";
    deleteButton.textContent = "Delete";
    actions.appendChild(deleteButton);

    const grid = document.createElement("div");
    grid.className = "bucket-grid";
    grid.append(
      createMoneyField("Planned credits", "budgeted", bucket.budgeted),
      createMoneyField("Spent credits", "actual", bucket.actual),
      createTypeField(bucket.type)
    );

    const stats = document.createElement("div");
    stats.className = "bucket-stats";
    stats.append(
      createMiniStat("Credits remaining", "remaining", "remaining-value"),
      createMiniStat("HUD status", "statusLabel", "status-value"),
      createMiniStat("Spent / planned", "plannedSpent", "")
    );

    const track = document.createElement("div");
    track.className = "progress-track";
    track.setAttribute("aria-hidden", "true");

    const fill = document.createElement("span");
    fill.className = "progress-fill";
    fill.dataset.role = "progressFill";
    track.appendChild(fill);

    const message = document.createElement("p");
    message.className = "bucket-message";
    message.dataset.role = "statusText";

    card.append(header, actions, grid, stats, track, message);
    return card;
  }

  function createMoneyField(label, field, value) {
    const wrapper = document.createElement("label");
    wrapper.className = "money-field";

    const text = document.createElement("span");
    text.textContent = label;

    const inputWrap = document.createElement("span");
    inputWrap.className = "input-wrap";

    const dollar = document.createElement("span");
    dollar.setAttribute("aria-hidden", "true");
    dollar.textContent = "$";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "0.01";
    input.inputMode = "decimal";
    input.placeholder = "0.00";
    input.value = inputNumber(value);
    input.dataset.field = field;

    inputWrap.append(dollar, input);
    wrapper.append(text, inputWrap);
    return wrapper;
  }

  function createTypeField(type) {
    const label = document.createElement("label");
    label.className = "select-field";

    const text = document.createElement("span");
    text.textContent = "Module class";

    const select = document.createElement("select");
    select.dataset.field = "type";

    VALID_TYPES.forEach((typeName) => {
      const option = document.createElement("option");
      option.value = typeName;
      option.textContent = TYPE_LABELS[typeName];
      option.selected = typeName === type;
      select.appendChild(option);
    });

    label.append(text, select);
    return label;
  }

  function createMiniStat(label, role, valueClass) {
    const stat = document.createElement("div");
    stat.className = "mini-stat";

    const text = document.createElement("span");
    text.textContent = label;

    const value = document.createElement("strong");
    value.dataset.role = role;
    if (valueClass) {
      value.className = valueClass;
    }
    value.textContent = "$0.00";

    stat.append(text, value);
    return stat;
  }

  function updateDerivedViews() {
    const totals = calculateTotals();

    setText(elements.totalIncome, formatMoney(totals.income));
    setText(elements.summaryIncome, formatMoney(totals.income));
    setText(elements.summaryBudgeted, formatMoney(totals.budgeted));
    setText(elements.summaryActual, formatMoney(totals.actual));
    setText(elements.summaryToday, formatMoney(totals.today));
    setText(elements.summaryRemaining, formatMoney(totals.remaining));
    setText(elements.summaryOver, formatMoney(totals.over));
    setText(elements.summaryDebt, formatMoney(totals.debt));
    setText(elements.summarySavings, formatMoney(totals.savings));
    setText(elements.bucketCount, `${state.buckets.length} ${state.buckets.length === 1 ? "module" : "modules"}`);

    setTone(elements.moneyRemainingCard, totals.remaining < 0 ? "danger" : "good");
    setTone(elements.overBudgetCard, totals.over > 0 ? "danger" : "good");

    const cards = elements.bucketList.querySelectorAll(".bucket-card");
    cards.forEach((card) => {
      const bucket = state.buckets.find((item) => item.id === card.dataset.id);
      if (!bucket) {
        return;
      }
      updateBucketCard(card, bucket);
    });
  }

  function updateBucketCard(card, bucket) {
    const status = getBucketStatus(bucket);
    card.dataset.tone = status.tone;

    setText(card.querySelector("[data-role='remaining']"), formatMoney(status.remaining));
    setText(card.querySelector("[data-role='statusLabel']"), status.label);
    setText(card.querySelector("[data-role='plannedSpent']"), `${formatMoney(bucket.actual)} / ${formatMoney(bucket.budgeted)}`);
    setText(card.querySelector("[data-role='statusText']"), status.message);

    const fill = card.querySelector("[data-role='progressFill']");
    if (fill) {
      fill.style.width = `${status.progress}%`;
    }
  }

  function calculateTotals() {
    const income = moneyValue(state.income.monthly) + (moneyValue(state.income.weekly) * WEEKLY_TO_MONTHLY) + moneyValue(state.income.extra);
    const totals = state.buckets.reduce((sum, bucket) => {
      const budgeted = moneyValue(bucket.budgeted);
      const actual = moneyValue(bucket.actual);
      sum.budgeted += budgeted;
      sum.actual += actual;
      sum.over += Math.max(actual - budgeted, 0);
      if (bucket.type === "debt") {
        sum.debt += budgeted;
      }
      if (bucket.type === "savings") {
        sum.savings += budgeted;
      }
      return sum;
    }, { budgeted: 0, actual: 0, over: 0, debt: 0, savings: 0 });

    return {
      income,
      budgeted: totals.budgeted,
      actual: totals.actual,
      remaining: income - totals.actual,
      today: calculateTodayTransactions(),
      over: totals.over,
      debt: totals.debt,
      savings: totals.savings
    };
  }

  function getBucketStatus(bucket) {
    const budgeted = moneyValue(bucket.budgeted);
    const actual = moneyValue(bucket.actual);
    const remaining = budgeted - actual;
    const ratio = budgeted > 0 ? actual / budgeted : actual > 0 ? 1 : 0;
    const progress = budgeted > 0 ? Math.min(ratio * 100, 100) : actual > 0 ? 100 : 0;

    if (actual > budgeted) {
      const overage = actual - budgeted;
      return {
        tone: "danger",
        label: "Critical",
        message: `Critical: over by ${formatMoney(overage)}`,
        remaining,
        progress
      };
    }

    if (budgeted === 0 && actual === 0) {
      return {
        tone: "neutral",
        label: "Standby",
        message: "No credits assigned",
        remaining,
        progress
      };
    }

    if (ratio >= 0.85) {
      return {
        tone: "warning",
        label: actual === budgeted ? "At limit" : "Caution",
        message: `${formatMoney(remaining)} in reserve`,
        remaining,
        progress
      };
    }

    return {
      tone: "good",
      label: "Optimal",
      message: `${formatMoney(remaining)} in reserve`,
      remaining,
      progress
    };
  }

  function createDefaultState() {
    return {
      income: { monthly: 0, weekly: 0, extra: 0 },
      buckets: DEFAULT_BUCKETS.map((bucket) => ({ ...bucket })),
      transactions: []
    };
  }

  function loadState() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return createDefaultState();
      }
      return normalizeState(JSON.parse(saved));
    } catch (error) {
      showToast("Saved data could not be loaded");
      return createDefaultState();
    }
  }

  function normalizeState(raw) {
    const base = createDefaultState();
    const income = raw && raw.income ? raw.income : {};
    base.income = {
      monthly: moneyValue(income.monthly),
      weekly: moneyValue(income.weekly),
      extra: moneyValue(income.extra)
    };

    if (!Array.isArray(raw && raw.buckets)) {
      return base;
    }

    base.buckets = raw.buckets
      .map((bucket) => normalizeBucket(bucket))
      .filter(Boolean)
      .map((bucket) => ({
        ...bucket,
        custom: !DEFAULT_BUCKET_IDS.has(bucket.id)
      }));

    base.transactions = Array.isArray(raw.transactions)
      ? raw.transactions.map((transaction) => normalizeTransaction(transaction)).filter(Boolean)
      : [];
    return base;
  }

  function normalizeBucket(bucket) {
    if (!bucket || typeof bucket !== "object") {
      return null;
    }

    const id = typeof bucket.id === "string" && bucket.id.trim() ? bucket.id.trim() : makeId();
    const type = VALID_TYPES.includes(bucket.type) ? bucket.type : "other";

    return {
      id,
      name: typeof bucket.name === "string" && bucket.name.trim() ? bucket.name : "Untitled Module",
      budgeted: moneyValue(bucket.budgeted),
      actual: moneyValue(bucket.actual),
      type,
      custom: Boolean(bucket.custom)
    };
  }

  function normalizeTransaction(transaction) {
    if (!transaction || typeof transaction !== "object") {
      return null;
    }

    const amount = moneyValue(transaction.amount);
    if (!amount) {
      return null;
    }

    const date = isDateString(transaction.date) ? transaction.date : localDateString();
    const bucketId = typeof transaction.bucketId === "string" ? transaction.bucketId : "";

    return {
      id: typeof transaction.id === "string" && transaction.id.trim() ? transaction.id : makeId("transaction"),
      date,
      bucketId,
      bucketName: typeof transaction.bucketName === "string" ? transaction.bucketName : "",
      amount,
      note: typeof transaction.note === "string" ? transaction.note : "",
      createdAt: typeof transaction.createdAt === "string" ? transaction.createdAt : new Date().toISOString()
    };
  }

  function persist(toastMessage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      elements.saveStatus.textContent = `Saved ${time}`;
      if (toastMessage) {
        showToast(toastMessage);
      }
    } catch (error) {
      elements.saveStatus.textContent = "Storage unavailable";
      showToast("Browser storage is unavailable");
    }
  }

  function buildExportJson() {
    return JSON.stringify({
      app: "Spartan Budget Command",
      version: 2,
      exportedAt: new Date().toISOString(),
      state
    }, null, 2);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.top = "-1000px";
      document.body.appendChild(textArea);
      textArea.select();

      try {
        const successful = document.execCommand("copy");
        textArea.remove();
        successful ? resolve() : reject(new Error("Copy failed"));
      } catch (error) {
        textArea.remove();
        reject(error);
      }
    });
  }

  function showToast(message) {
    if (!elements.toast) {
      return;
    }

    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("show");
    }, 2400);
  }

  function setText(element, text) {
    if (element) {
      element.textContent = text;
    }
  }

  function setTone(element, tone) {
    if (element) {
      element.dataset.tone = tone;
    }
  }

  function moneyValue(value) {
    const number = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function inputNumber(value) {
    const number = moneyValue(value);
    return number === 0 ? "" : String(Number(number.toFixed(2)));
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  function calculateTodayTransactions() {
    const today = localDateString();
    return state.transactions.reduce((total, transaction) => {
      return transaction.date === today ? total + moneyValue(transaction.amount) : total;
    }, 0);
  }

  function sortTransactions(a, b) {
    const dateCompare = String(b.date).localeCompare(String(a.date));
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return String(b.createdAt).localeCompare(String(a.createdAt));
  }

  function getTransactionBucketName(transaction) {
    const bucket = state.buckets.find((item) => item.id === transaction.bucketId);
    return bucket ? bucket.name : transaction.bucketName || "Deleted module";
  }

  function formatDateLabel(date) {
    if (!isDateString(date)) {
      return "No date";
    }

    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date(year, month - 1, day));
  }

  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isDateString(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function makeId(prefix = "custom") {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
})();
