/* ==========================
🌐 Section: 01 Configuration
   - API, Utils & Encryption
========================== */

// ---- ( Configuration ) ----
const RAW_URL = "Y2V4ZS9tMjMtbV82V0otYmJrVzgxblNtUDljOV9HNHAtVnU0ZEV5VGFjZzMzV0ZiY1ZEVHhZaGo3MWRwaGQ2X3RiV3FKbnpiY3lmS0Evcy9zb3JjYW0vbW9jLmVsZ29vZy50cGlyY3MvLzpzcHR0aA==";

// ---- ( DOM Helpers ) ----
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ---- ( Encryption & Formatting ) ----
function decrypt(text) { return atob(text).split('').reverse().join(''); }
const getApiUrl = () => RAW_URL.includes("http") ? RAW_URL : decrypt(RAW_URL);

function format12hr(time24) {
    if (!time24) return "N/A";
    let [hrs, mins] = time24.split(':');
    hrs = parseInt(hrs);
    const period = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    mins = String(mins).padStart(2, '0');
    return `${hrs}:${mins} ${period}`;
}

function updateDateDisplay() {
    const now = new Date();
    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const dayOptions = { weekday: 'long' };
    if ($('#dateSub')) $('#dateSub').textContent = `${now.toLocaleDateString('bn-BD', dateOptions)} (${now.toLocaleDateString('bn-BD', dayOptions)})`;
}

function showToast(msg, type = "default") {
    const t = $('#statusToast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show';
    if (type === "success") t.classList.add('success');
    else if (type === "error") t.classList.add('error');
    else t.classList.add('default');
    setTimeout(() => t.classList.remove('show'), 3000);
}


/* ==========================
📦 Section: 02 Global State
   - Storage Keys & Variables
========================== */

// ---- ( State Variables ) ----
let allEntries = [];
let branchChart = null;
let centralChart = null;
let deferredPrompt; 
let isOfflineBannerDismissed = false;

// ---- ( Local Storage Keys ) ----
const LS_PIN = 'fmt_pin';
const LS_THEME = 'fmt_theme';
const LS_NOTIFS = 'fmt_notifs';
const LS_NOTIF_STATUS = 'fmt_notif_status';
const LS_PIN_AUTO = 'fmt_pin_auto';
const LS_DATA_CACHE = "fmt_data_cache"; 

// ---- ( User Preferences ) ----
let notifTimes = JSON.parse(localStorage.getItem(LS_NOTIFS)) || [];
let notifEnabled = JSON.parse(localStorage.getItem(LS_NOTIF_STATUS)) === true;
let autoPinVerify = JSON.parse(localStorage.getItem(LS_PIN_AUTO)) !== false; 
let lastCheckedMinute = -1;

const getSavedPin = () => localStorage.getItem(LS_PIN) || "000000";

// ---- ( Pagination State ) ----
let pMode = localStorage.getItem("pMode") || "infinite";
let pRowsPerPage = parseInt(localStorage.getItem("pRowsPerPage")) || 10;
let pCurrentPage = 1;
let pIsLoading = false;
let pCurrentData = [];
let pDisplayedCount = 0;


/* ==========================
🔐 Section: 03 Security System
   - PIN Logic & Animations
========================== */

// ---- ( UI Render Logic ) ----
function renderPinDots(val) {
    const dots = $$('.v-dot');
    const isVisible = $('#pinViewToggle') ? $('#pinViewToggle').checked : false;
    
    dots.forEach((dot, i) => {
        dot.innerHTML = ""; 
        if (i < val.length) {
            dot.classList.add('has-val');
            dot.textContent = isVisible ? val[i] : "●"; 
        } else {
            dot.classList.remove('has-val');
            dot.textContent = "";
        }
        dot.classList.toggle('current', i === val.length); 
    });
}

function triggerParticles(container) {
    const existingParticles = container.querySelector('.particles');
    if (existingParticles) existingParticles.remove();

    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    container.appendChild(particlesContainer);

    for (let i = 0; i < 15; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        const angle = Math.random() * Math.PI * 2;
        const distance = 60 + Math.random() * 80; 
        const x = Math.cos(angle) * distance + "px";
        const y = Math.sin(angle) * distance + "px";
        p.style.setProperty('--p-x', x);
        p.style.setProperty('--p-y', y);
        const size = 6 + Math.random() * 8 + "px";
        p.style.width = size;
        p.style.height = size;
        particlesContainer.appendChild(p);
    }
}

// ---- ( Input Handlers ) ----
function handlePinInput(val) {
    renderPinDots(val);
    if (autoPinVerify && val.length === 6) {
        setTimeout(() => processPin(val), 50); 
    }
}

function handleKeyPress(key) {
    const input = $('#pinInput');
    let currentVal = input.value;

    if (key === 'BACK' || key === 'Backspace') {
        currentVal = currentVal.slice(0, -1);
    } else if (key === 'ENTER' || key === 'Enter') {
        processPin(currentVal);
        return;
    } else if (/^[0-9]$/.test(key)) {
        if (currentVal.length < 6) {
            currentVal += key;
        }
    }
    input.value = currentVal;
    handlePinInput(currentVal);
}

// ---- ( Verification Logic ) ----
function processPin(val) {
    const lockBtn = document.querySelector('.btn-lock');
    if (val.length < 6) {
        showToast("দয়া করে ৬ ডিজিট পূর্ণ করুন", "error");
        return;
    }
    
    if (val === getSavedPin()) {
        triggerParticles(lockBtn); 
        lockBtn.classList.add('unlocked');
        showToast("সফলভাবে লগইন হয়েছে", "success");

        setTimeout(() => {
            $('#pinGate').classList.add('hidden');
            $('#app').classList.remove('hidden');
            fetchData(); 
            requestNotifPermission();
        }, 1000); 
    } else {
        showToast("ভুল পিন! আবার চেষ্টা করুন", "error");
        lockBtn.classList.add('error-shake');
        if(navigator.vibrate) navigator.vibrate([80, 50, 80]); 
        setTimeout(() => {
            lockBtn.classList.remove('error-shake');
            $('#pinInput').value = "";
            renderPinDots("");
        }, 500); 
    }
}

function changePin() {
    const oldPin = $('#oldPinSet').value;
    const newPin = $('#newPinSet').value;
    const confirmPin = $('#confirmPinSet').value;

    if (oldPin !== getSavedPin()) return showToast("বর্তমান পিন সঠিক নয়", "error");
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) return showToast("নতুন পিন শুধুমাত্র ৬ ডিজিটের সংখ্যা হতে হবে", "error");
    if (newPin !== confirmPin) return showToast("নতুন পিন দুটি মেলেনি", "error");

    localStorage.setItem(LS_PIN, newPin);
    showToast("পিন সফলভাবে পরিবর্তন হয়েছে", "success");
    $('#oldPinSet').value = ""; $('#newPinSet').value = ""; $('#confirmPinSet').value = "";
}

window.toggleLockPinView = () => renderPinDots($('#pinInput').value);


/* ==========================
📡 Section: 04 Data Handling
   - Fetching, Caching & Offline
========================== */

// ---- ( Smart Data Fetching ) ----
async function fetchData() {
    const offlineAlert = $("#offlineAlert");
    const refreshIcon = $('#refreshDataBtn i');
    
    if(refreshIcon) refreshIcon.classList.add('spinning'); 

    // Step 1: Load from Cache Immediately
    const cachedData = localStorage.getItem(LS_DATA_CACHE);
    if (cachedData) {
        allEntries = JSON.parse(cachedData);
        renderDashboard();
    }

    try {
        // Step 2: Try Network Request
        const res = await fetch(getApiUrl());
        if (!res.ok) throw new Error("Network response was not ok");
        
        const rawData = await res.json();
        const dataArray = Array.isArray(rawData) ? rawData : (rawData.results || []);

        // Step 3: Process & Sort Data
        allEntries = dataArray
            .filter(d => d.date)
            .map((entry, index) => ({
                ...entry,
                serial: Number(entry.serial) || (index + 1), 
                branch: Number(entry.branch),
                central: Number(entry.central)
            }))
            .sort((a, b) => a.serial - b.serial); 
            
        // Step 4: Update Cache & UI
        localStorage.setItem(LS_DATA_CACHE, JSON.stringify(allEntries));
        renderDashboard();
        
        // Step 5: Update Dropdowns & Hide Banner
        updateYearDropdown();
        if (offlineAlert) offlineAlert.classList.add("hidden");

    } catch (e) {
        console.log("Offline Mode Active:", e);
        // Show offline banner only if not dismissed
        if (!isOfflineBannerDismissed) {
            offlineAlert?.classList.remove("hidden");
        }
    } finally {
        if(refreshIcon) refreshIcon.classList.remove('spinning');
    }
}

// ---- ( Helpers ) ----
function updateYearDropdown() {
    const years = [...new Set(allEntries.map(d => String(d.date).split('-')[0]))].filter(y => y && y.length === 4);
    const yearSel = $('#yearSelect');
    if (yearSel) {
         const currentVal = yearSel.value;
         yearSel.innerHTML = '<option value="">সব বছর</option>' + 
             years.sort().map(y => `<option value="${y}" ${y === currentVal ? 'selected' : ''}>${y}</option>`).join('');
    }
}

// ---- ( Data Submission ) ----
async function submitEntry() {
    if (!navigator.onLine) {
        return showToast("ইন্টারনেট সংযোগ নেই! অফলাইনে এন্ট্রি দেওয়া যাবে না।", "error");
    }

    const branch = $('#branchVal').value;
    const central = $('#centralVal').value;
    const useCurrent = $('#useCurrentTimeToggle').checked;
    
    if (!branch || !central) return showToast("উভয় মেরিট ইনপুট দিন", "error");

    let datePayload, timePayload;

    if (useCurrent) {
        const now = new Date();
        datePayload = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        timePayload = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    } else {
        datePayload = $('#manualDate').value; 
        timePayload = $('#manualTime').value; 
        if (!datePayload || !timePayload) return showToast("তারিখ ও সময় নির্বাচন করুন", "error");
    }

    const payload = {
        type: 'entry',
        branch: branch,
        central: central,
        date: datePayload,
        time: timePayload
    };

    const submitBtn = $('#saveEntry');
    const refreshIcon = $('#refreshDataBtn i');
    const originalBtnText = submitBtn.textContent;
    
    submitBtn.classList.add('btn-loading');
    submitBtn.textContent = ""; 
    refreshIcon.classList.add('spinning');

    try {
        await fetch(getApiUrl(), {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        $('#branchVal').value = "";
        $('#centralVal').value = "";
        if(!useCurrent) { 
            $('#manualDate').value = ""; 
            $('#manualTime').value = "";
        }
        
        await fetchData();
        showToast("তথ্য সফলভাবে জমা হয়েছে!", "success");

    } catch (e) {
        console.error(e);
        showToast("ডাটা পাঠাতে ব্যর্থ হয়েছে", "error");
    } finally {
        submitBtn.classList.remove('btn-loading');
        submitBtn.textContent = originalBtnText;
        refreshIcon.classList.remove('spinning');
    }
}


/* ==========================
📊 Section: 05 Dashboard & Charts
   - Analysis, Summary & Graphs
========================== */

// ---- ( Dashboard Renderer ) ----
function renderDashboard() {
    let data = [...allEntries];
    const year = $('#yearSelect')?.value;
    const month = $('#monthSelect')?.value;
    const start = $('#startDate')?.value;
    const end = $('#endDate')?.value;

    if (year) data = data.filter(d => String(d.date).startsWith(year));
    if (month) data = data.filter(d => String(d.date).split('-')[1] === month);
    if (start) data = data.filter(d => new Date(d.date) >= new Date(start));
    if (end) data = data.filter(d => new Date(d.date) <= new Date(end));

    updateTable(data);
    updateSummary(data);
    updateCharts(data);
}

function updateSummary(data) {
    if (!data.length) {
        ['#sumLastDate', '#sumBranch', '#sumCentral', '#sumBestBranch', '#sumBestCentral'].forEach(id => {
            if($(id)) $(id).textContent = "-";
        });
        if($('#sumTotal')) $('#sumTotal').textContent = "0";
        return;
    }

    const last = data[data.length - 1]; 
    const bValues = allEntries.map(d => parseInt(d.branch)).filter(Boolean); 
    const cValues = allEntries.map(d => parseInt(d.central)).filter(Boolean);

    const setVal = (id, val) => { if ($(id)) $(id).textContent = val; };
    setVal('#sumLastDate', last.date);
    setVal('#sumBranch', last.branch);
    setVal('#sumCentral', last.central);
    setVal('#sumBestBranch', bValues.length ? Math.min(...bValues) : "-");
    setVal('#sumBestCentral', cValues.length ? Math.min(...cValues) : "-");
    setVal('#sumTotal', data.length);
}

// ---- ( Chart.js Implementation ) ----
function updateCharts(data) {
    if (!window.Chart) return;
    const chartData = [...data]; 
    const labels = chartData.map(d => `R-${d.serial}`);

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 10 },
        interaction: { mode: "index", intersect: false },
        scales: {
            y: { grid: { color: "rgba(0,0,0,0.05)", drawBorder: false }, ticks: { font: { family: "Inter", size: 11 } } },
            x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 12, font: { family: "Inter", size: 10 } } }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#e2e8f0',
                bodyColor: '#cbd5e1',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                titleFont: { family: 'Hind Siliguri', size: 14, weight: '600' },
                bodyFont: { family: 'Hind Siliguri', size: 13 },
                callbacks: {
                    title: (ctx) => `রিপোর্ট নং: ${ctx[0].label.replace("R-", "")}`,
                    label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`,
                    afterBody: (ctx) => {
                        const serial = ctx[0].label.replace("R-", "");
                        const entry = chartData.find(d => String(d.serial) === serial);
                        if(entry && entry.date) {
                             const dObj = new Date(entry.date);
                             const dateStr = dObj.toLocaleDateString('bn-BD', {day:'numeric', month:'long', year:'numeric'});
                             const timeStr = format12hr(entry.time);
                             return `${dateStr} (${timeStr})`;
                        }
                        return "";
                    }
                }
            }
        }
    };

    if (branchChart) branchChart.destroy();
    branchChart = new Chart($("#branchChart"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "ব্রাঞ্চ মেরিট",
                data: chartData.map(d => d.branch),
                borderColor: "#6366f1", borderWidth: 2, pointRadius: 3, tension: 0.2, fill: true, backgroundColor: "rgba(99, 102, 241, 0.1)"
            }]
        },
        options: commonOptions
    });

    if (centralChart) centralChart.destroy();
    centralChart = new Chart($("#centralChart"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "সেন্ট্রাল মেরিট",
                data: chartData.map(d => d.central),
                borderColor: "#10b981", borderWidth: 2, pointRadius: 3, tension: 0.2, fill: true, backgroundColor: "rgba(16, 185, 129, 0.1)"
            }]
        },
        options: commonOptions
    });
}


/* =========================
🛠️ Section: 06 UI Interactions
    - Modals, Pagination, Logic
========================= */

// ---- ( Modals ) ----
function openModal(html) {
    const modal = $('#standardModal');
    const content = $('#modalContent');
    content.className = "reset-popup-premium"; 
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

function closeModal() { 
    $('#standardModal').classList.add('hidden'); 
}

function showResetStep1() {
    openModal(`
        <div class="reset-top-banner">
            <div class="reset-icon-anim"><i class="fas fa-trash-alt"></i></div>
            <h3>সতর্কবার্তা</h3>
        </div>
        <div class="reset-body">
            <ul class="warning-points">
                <li>অ্যাপের সকল সেটিংস ও পারমিশন স্থায়ীভাবে মুছে যাবে। (সীটে সেভ করা ডাটা মুছে যাবে না)</li>
                <li>আপনার সিকিউরিটি পিন রিসেট হয়ে ডিফল্ট পিন সেট হয়ে যাবে।</li>
            </ul>
            <div class="divider-line"></div>
            <div class="input-reset-wrapper">
                <label>নিশ্চিত করতে বড় হাতের অক্ষরে "RESET" লিখুন</label>
                <input type="text" id="confirmText" placeholder="RESET" autocomplete="off">
            </div>
            <div class="reset-footer">
                <button class="btn-reset-cancel" onclick="closeModal()">বাতিল</button>
                <button class="btn-reset-confirm" onclick="showResetStep2()">পরবর্তী ধাপ</button>
            </div>
        </div>
    `);
}

function showResetStep2() {
    if ($('#confirmText')?.value !== 'RESET') return showToast("সঠিকভাবে RESET শব্দটি লিখুন", "error");
    openModal(`
        <div class="reset-top-banner">
            <div class="reset-icon-anim" style="color:#6366f1; background:#eef2ff;"><i class="fas fa-shield-alt"></i></div>
            <h3 style="color:#6366f1;">নিরাপত্তা যাচাই</h3>
        </div>
        <div class="reset-body">
            <p style="text-align:center; font-size:13px; color:var(--text-muted); margin-bottom:20px;">
                চূড়ান্ত অনুমোদনের জন্য আপনার বর্তমান পিন কোডটি দিন।
            </p>
            <div class="input-reset-wrapper">
                <input type="password" id="confirmPin" placeholder="••••••" maxlength="6" style="letter-spacing:5px; font-size:18px;">
            </div>
            <div class="reset-footer">
                <button class="btn-reset-cancel" onclick="showResetStep1()">পিছনে</button>
                <button class="btn-reset-confirm" style="background:#1f2937;" onclick="finalReset()">মুছে ফেলুন</button>
            </div>
        </div>
    `);
}

function finalReset() {
    if ($('#confirmPin')?.value === getSavedPin()) {
        localStorage.clear();
        showToast("সিস্টেম রিসেট করা হয়েছে", "success");
        setTimeout(() => location.reload(), 1500);
    } else {
        showToast("ভুল পিন কোড!", "error");
    }
}

// ---- ( Pagination & Table Logic ) ----
function updateTable(data) {
    pCurrentData = [...data].reverse();
    
    const endMsg = $("#endMessage");
    const infLoader = $("#infiniteLoader");
    const pagControls = $("#paginationControls");
    const tbody = $("#tableRows");

    if (endMsg) endMsg.classList.add("hidden");
    if (infLoader) infLoader.classList.add("hidden");

    if (pMode === "infinite") {
        pDisplayedCount = 0;
        if (tbody) tbody.innerHTML = "";
        if (pagControls) pagControls.classList.add("hidden");
        loadMoreInfinite();
    } else {
        if (pagControls) pagControls.classList.remove("hidden");
        renderPage(1);
    }
}

function loadMoreInfinite() {
    if (pIsLoading || pDisplayedCount >= pCurrentData.length) return;
    pIsLoading = true;
    const loader = $("#infiniteLoader");
    if (loader) loader.classList.remove("hidden");

    setTimeout(() => {
        const nextBatch = pCurrentData.slice(pDisplayedCount, pDisplayedCount + pRowsPerPage);
        renderRows(nextBatch, true);
        pDisplayedCount += nextBatch.length;
        pIsLoading = false;
        
        if (loader) loader.classList.add("hidden");
        if (pDisplayedCount >= pCurrentData.length && pCurrentData.length > 0) {
            $("#endMessage")?.classList.remove("hidden");
        }
    }, 500);
}

function renderPage(page) {
    pCurrentPage = page;
    const start = (page - 1) * pRowsPerPage;
    const pageData = pCurrentData.slice(start, start + pRowsPerPage);
    $("#tableRows").innerHTML = "";
    renderRows(pageData, false);
    renderPaginationControls();
}

function renderRows(data, append) {
    const tbody = $("#tableRows");
    if (!tbody) return;
    if (!data.length && !append) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">কোন রিপোর্ট পাওয়া যায়নি</td></tr>';
        return;
    }
    const html = data.map(d => `
        <tr class="fade-in">
            <td><span class="sn-badge">${d.serial}</span></td>
            <td>
                <div class="table-date-cell">
                    <span>${d.date}</span>
                    <div class="table-time-row">
                        <i class="far fa-clock"></i><span class="time-text">${format12hr(d.time)}</span>
                    </div>
                </div>
            </td>
            <td class="fw-800">${d.branch}</td>
            <td class="fw-800">${d.central}</td>
        </tr>`).join("");
    append ? tbody.insertAdjacentHTML("beforeend", html) : tbody.innerHTML = html;
}

function renderPaginationControls() {
    const container = $("#paginationControls");
    if (!container) return;
    const totalPages = Math.ceil(pCurrentData.length / pRowsPerPage);
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = `<button class="page-num-btn" onclick="renderPage(${pCurrentPage - 1})" ${pCurrentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    
    for (let i = 1; i <= totalPages; i++) {
         if (i === 1 || i === totalPages || (i >= pCurrentPage - 1 && i <= pCurrentPage + 1)) {
            html += `<button class="page-num-btn ${i === pCurrentPage ? 'active' : ''}" onclick="renderPage(${i})">${i}</button>`;
        } else if ((i === pCurrentPage - 2 && pCurrentPage > 3) || (i === pCurrentPage + 2 && pCurrentPage < totalPages - 2)) {
            if (!html.endsWith('...')) html += `<span class="pagination-dots">...</span>`;
        }
    }
    html += `<button class="page-num-btn" onclick="renderPage(${pCurrentPage + 1})" ${pCurrentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

window.setPaginationMode = (mode) => {
    if (pMode === mode) return;
    pMode = mode;
    localStorage.setItem("pMode", mode);
    updateTable([...pCurrentData].reverse());
    
    // Update Active Button UI
    $$(".p-btn").forEach(b => {
        const isClickedMode = b.getAttribute("onclick").includes(mode);
        b.classList.toggle("active", isClickedMode);
    });
};

window.handleRowsChange = (val) => {
    pRowsPerPage = parseInt(val);
    localStorage.setItem("pRowsPerPage", pRowsPerPage);
    updateTable([...pCurrentData].reverse());
};



/* ==========================
🔔 Section: 07 Notifications & PWA
   - Service Worker & Reminders
========================== */

// ---- ( Notifications ) ----
async function requestNotifPermission() {
    if ("Notification" in window && Notification.permission !== "granted") {
        await Notification.requestPermission();
    }
}

function checkNotifications() {
    if (!notifEnabled || notifTimes.length === 0) return;
    
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${mins}`; 
    
    const currentMinuteVal = now.getHours() * 60 + now.getMinutes();
    if (currentMinuteVal === lastCheckedMinute) return;
    lastCheckedMinute = currentMinuteVal;

    if (notifTimes.includes(currentTime)) {
        if (Notification.permission === "granted") {
            new Notification("FMT Tracker Pro", {
                body: `আপনার রিপোর্ট চেক করার সময় হয়েছে (${format12hr(currentTime)})।`,
                icon: "https://cdn-icons-png.flaticon.com/512/3119/3119338.png"
            });
        } else {
            showToast(`⏰ রিমাইন্ডার: রিপোর্ট চেক করুন (${format12hr(currentTime)})`);
        }
    }
}
setInterval(checkNotifications, 5000); 

function renderReminders() {
    const list = $('#notifList');
    if (!list) return;
    list.innerHTML = notifTimes.length ? notifTimes.sort().map((t, i) => `
        <div class="rem-item"> 
            <span class="rem-time"><i class="far fa-clock"></i> ${format12hr(t)}</span> 
            <button onclick="confirmDelRem(${i})" class="del-rem"><i class="fas fa-trash-can"></i></button> 
        </div>`).join('') : '<p class="empty-msg">কোন রিমাইন্ডার সেট করা নেই</p>';
}

window.confirmDelRem = (i) => {
    const timeRaw = notifTimes[i]; 
    const timeDisplay = format12hr(timeRaw); 
    openModal(`
        <div style="padding:25px; text-align:center;"> 
            <i class="fas fa-bell-slash" style="font-size:30px; color:#f59e0b; margin-bottom:15px;"></i> 
            <h3 style="margin:0 0 10px;">রিমাইন্ডার মুছুন?</h3> 
            <p style="font-size:13px; color:#64748b; margin-bottom:20px;">আপনি কি (${timeDisplay}) এর রিমাইন্ডারটি মুছে ফেলতে চান?</p> 
            <div class="reset-footer"> 
                <button class="btn-reset-cancel" onclick="closeModal()">না</button> 
                <button class="btn-reset-confirm" style="background:#f59e0b;" onclick="deleteReminder(${i})">হ্যাঁ</button> 
            </div>
        </div>`);
};

function deleteReminder(i) {
    notifTimes.splice(i, 1);
    localStorage.setItem(LS_NOTIFS, JSON.stringify(notifTimes));
    renderReminders();
    closeModal();
    showToast("রিমাইন্ডার মুছে ফেলা হয়েছে", "success");
}

// ---- ( PWA Installer Logic ) ----
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('SW Ready'))
            .catch(err => console.log('SW Fail', err));
    });
}


// ---- ( PWA Install UI Manager ) ----
function checkInstallState() {
    // অ্যাপটি ইন্সটলড (Standalone) মোডে আছে কি না চেক করা
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (isStandalone) {
        console.log("App is running in Installed Mode");

        // ১. Home/Add Tab এর কার্ডটি পুরোপুরি গায়েব করা
        const homeCard = document.getElementById('homeInstallCard');
        if (homeCard) {
            homeCard.classList.add('hidden');
        }

        // ২. Settings Tab এর কার্ডটি মডিফাই করা
        const settingsCard = document.getElementById('pwaInstallBtn');
        
        if (settingsCard) {
            // আইকন এবং টেক্সট চেঞ্জ করা
            const title = settingsCard.querySelector('.install-text h3');
            const desc = settingsCard.querySelector('.install-text p');
            const icon = settingsCard.querySelector('.install-icon i');

            if (title) title.innerText = "অ্যাপ সক্রিয় আছে";
            if (desc) desc.innerText = "আপনি অ্যাপ ভার্সন ব্যবহার করছেন।";
            if (icon) {
                icon.className = "fas fa-check-circle"; // ডাউনলোড আইকন বদলে চেক আইকন
                icon.parentElement.style.background = "rgba(16, 185, 129, 0.2)"; // সবুজ আভা
                icon.style.color = "#10b981"; // সবুজ রং
            }

            // বাটনটি ডিসেবল এবং ডিজাইন চেঞ্জ করা
            const btn = settingsCard.querySelector('.install-btn');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-check"></i> Installed';
                btn.classList.add('btn-installed-disabled');
            }
        }
    }
}

// অ্যাপ লোড হলে ফাংশনটি কল হবে
document.addEventListener('DOMContentLoaded', () => {
    checkInstallState();
    
    // তোমার অন্যান্য init ফাংশনগুলো এখানে থাকবে...
});


/* ==========================
⚙️ Section: 08 Events & Init
   - Initial Setup & Listeners
========================== */

function initOfflineAndPWA() {
    // 1. Offline Banner Logic
    if($("#closeOfflineAlert")) {
        $("#closeOfflineAlert").onclick = () => {
            isOfflineBannerDismissed = true;
            $("#offlineAlert").classList.add("hidden");
        };
    }

    // 2. Online Event
    window.addEventListener('online', () => {
        isOfflineBannerDismissed = false; 
        $("#offlineAlert")?.classList.add("hidden"); 
        fetchData(); 
        showToast("ইন্টারনেট ফিরে এসেছে। ডাটা আপডেট হচ্ছে...", "success");
    });

    // 3. Offline Event
    window.addEventListener('offline', () => {
        if(!isOfflineBannerDismissed) $("#offlineAlert")?.classList.remove("hidden");
        showToast("ইন্টারনেট সংযোগ বিচ্ছিন্ন", "error");
    });

    // 4. Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); 
        deferredPrompt = e;
        
        const installCard = $("#pwaInstallBtn");
        if(installCard) {
            installCard.classList.remove("hidden");
            installCard.querySelector("button").onclick = async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        installCard.classList.add("hidden");
                    }
                    deferredPrompt = null;
                }
            };
        }
    });
}

function setupEvents() {
    // 1. Inputs
    $$(".key-btn").forEach(btn => btn.onclick = () => {
        if(navigator.vibrate) navigator.vibrate(20);
        handleKeyPress(btn.dataset.key);
    });
    
    const pinInput = $("#pinInput");
    if (pinInput) pinInput.addEventListener("input", e => handlePinInput(e.target.value));
    
    // 2. Global Keyboard (PC)
    document.addEventListener("keydown", (e) => {
        if ($("#pinGate").classList.contains("hidden")) return;
        if (e.ctrlKey || e.altKey || e.metaKey || (e.key.length > 1 && e.key !== "Backspace" && e.key !== "Enter")) return;

        if (/^[0-9]$/.test(e.key)) {
            handleKeyPress(e.key);
            e.preventDefault();
        } else if (e.key === "Backspace" || e.key === "Enter") {
            handleKeyPress(e.key);
            e.preventDefault();
        }
        $("#pinInput")?.focus();
    });

    // 3. Settings Toggles
    if ($("#pinAutoToggleSet")) $("#pinAutoToggleSet").onchange = e => {
        autoPinVerify = e.target.checked;
        localStorage.setItem(LS_PIN_AUTO, autoPinVerify);
        showToast(autoPinVerify ? "অটো পিন চালু" : "ম্যানুয়াল পিন চালু");
    };
    if ($("#pinViewToggle")) $("#pinViewToggle").onchange = toggleLockPinView;

    const handleTheme = isDark => {
        document.body.classList.toggle("dark-theme", isDark);
        if ($("#darkToggleSet")) $("#darkToggleSet").checked = isDark;
        localStorage.setItem(LS_THEME, isDark ? "dark" : "light");
    };
    if ($("#pinThemeToggle")) $("#pinThemeToggle").onclick = () => handleTheme(!document.body.classList.contains("dark-theme"));
    $("#themeToggle").onclick = () => handleTheme(!document.body.classList.contains("dark-theme"));
    if ($("#darkToggleSet")) $("#darkToggleSet").onchange = e => handleTheme(e.target.checked);

    // 4. Navigation
    $$(".tabBtn, .m-nav-link").forEach(btn => {
        btn.onclick = () => {
            const target = btn.dataset.target;
            $$(".tab-item").forEach(t => t.classList.toggle("hidden", t.id !== target));
            $$(".tabBtn").forEach(b => b.classList.toggle("active", b.dataset.target === target));
            $$(".m-nav-link").forEach(b => b.classList.toggle("active", b.dataset.target === target));
            $("#filterBar").classList.toggle("hidden", target !== "tabTable" && target !== "tabGraph");
            
            const titleMap = { tabInput: "ডাটা এন্ট্রি", tabTable: "রিপোর্ট শিট", tabGraph: "বিশ্লেষণ", tabPin: "সেটিংস" };
            $("#viewTitle").textContent = titleMap[target] || "ড্যাশবোর্ড";
            
            if (window.innerWidth < 768) $("#sidebar").classList.add("collapsed");
            if (target === "tabGraph") renderDashboard();
        };
    });

    // 5. Filters
    ["yearSelect", "monthSelect", "startDate", "endDate"].forEach(id => $(`#${id}`) && ($(`#${id}`).onchange = renderDashboard));
    $("#resetFilters").onclick = () => {
        ["yearSelect", "monthSelect", "startDate", "endDate"].forEach(id => $(`#${id}`) && ($(`#${id}`).value = ""));
        renderDashboard();
        showToast("ফিল্টার রিসেট");
    };
    $("#refreshDataBtn").onclick = async () => { await fetchData(); showToast("ডাটা রিফ্রেশ করা হয়েছে", "success"); };
    $("#saveEntry").onclick = submitEntry;

    // 6. Notifications
    $('#addTimeBtn').onclick = () => {
        const t = $('#notifTime').value;
        if (!t) return showToast("সময় নির্বাচন করুন", "error");
        if (notifTimes.includes(t)) return showToast("এই সময়টি আগে থেকেই আছে", "error");
        notifTimes.push(t);
        localStorage.setItem(LS_NOTIFS, JSON.stringify(notifTimes));
        renderReminders();
        showToast(`নতুন রিমাইন্ডার যোগ হয়েছে (${format12hr(t)})`, "success");
    };
    const nToggle = $('#notifEnableToggle');
    if (nToggle) {
        nToggle.checked = notifEnabled;
        nToggle.onchange = (e) => {
            notifEnabled = e.target.checked;
            localStorage.setItem(LS_NOTIF_STATUS, notifEnabled);
            showToast(notifEnabled ? "নোটিফিকেশন চালু" : "নোটিফিকেশন বন্ধ");
            if(notifEnabled) requestNotifPermission();
        };
    }

    // 7. Misc
    $("#useCurrentTimeToggle").onchange = e => $("#manualInputArea").classList.toggle("hidden", e.target.checked);
    $("#changePinBtn").onclick = changePin;
    $('#factoryResetBtn').onclick = showResetStep1;
    if ($("#closeSidebar")) $("#closeSidebar").onclick = () => $("#sidebar").classList.add("collapsed");
    if ($("#mainLogo")) $("#mainLogo").onclick = () => $("#sidebar").classList.toggle("collapsed");

    // 8. Infinite Scroll
    window.addEventListener("scroll", () => {
        if (pMode !== "infinite" || !$("#endMessage").classList.contains("hidden")) return;
        if (document.documentElement.scrollTop + document.documentElement.clientHeight >= document.documentElement.scrollHeight - 50) loadMoreInfinite();
    });
}

// ---- ( App Entry Point ) ----
document.addEventListener("DOMContentLoaded", () => {
    // 1. Init System
    initOfflineAndPWA();
    if ($("#pinAutoToggleSet")) $("#pinAutoToggleSet").checked = autoPinVerify;
    setupEvents();
    renderReminders();
    updateDateDisplay();
    
    // 2. Load Theme
    if (localStorage.getItem(LS_THEME) === "dark") {
        document.body.classList.add("dark-theme");
        if ($("#darkToggleSet")) $("#darkToggleSet").checked = true;
    }

    // 3. Initial Focus
    if (window.innerWidth > 992) $("#pinInput")?.focus();
    
    // 4. Init Pagination UI
    const rowSelector = $("#rowsPerPage");
    if (rowSelector) rowSelector.value = pRowsPerPage;
    $$(".p-btn").forEach(b => b.classList.toggle("active", b.getAttribute("onclick").includes(pMode)));
});