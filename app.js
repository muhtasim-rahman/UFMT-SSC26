/* ==========================================================================
   FMT TRACKER PRO - ULTIMATE VERSION (V18.0)
   ========================================================================== */

/* ==========================
🌐 Section: 01 Configuration
========================== */

// ---- ( Configuration ) ----
const RAW_URL = "https://script.google.com/macros/s/AKfycbxR-RPo1ubaPVubGZ5ZEN_cuTucD4MJCLBCcBzqFVARLryI72O1tilYrvsA_0LBrr3E/exec";

// ---- ( DOM Helpers ) ----
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ---- ( Encryption & Formatting ) ----
function decrypt(text) { return atob(text).split('').reverse().join(''); }
const getApiUrl = () => RAW_URL + "?mode=all";

function format12hr(time24) {
    if (!time24) return "N/A";
    let [hrs, mins] = time24.split(':');
    hrs = parseInt(hrs);
    const period = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    mins = String(mins).padStart(2, '0');
    return `${hrs}:${mins} ${period}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '--/--/----';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
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
========================== */

// ---- ( State Variables ) ----
let allEntries = [];
let branchChart = null;
let centralChart = null;
let subjectChart = null;
let subjectMeritChart = null;
let deferredPrompt; 
let isOfflineBannerDismissed = false;
let appMode = localStorage.getItem('appMode') || 'course';

// ---- ( Local Storage Keys ) ----
const LS_PIN = 'fmt_pin';
const LS_THEME = 'fmt_theme';
const LS_NOTIFS = 'fmt_notifs';
const LS_NOTIF_STATUS = 'fmt_notif_status';
const LS_PIN_AUTO = 'fmt_pin_auto';
const LS_DATA_CACHE = "fmt_data_cache";
const LS_SUBJECT_CACHE = "subject_data_cache";
const LS_SHOW_ONLY_MARKS = 'showOnlyWithMarks';
const LS_INCLUDE_FOURTH = 'includeFourthSubject';
const LS_FOURTH_SUBJECT = 'fourthSubject';

// ---- ( User Preferences ) ----
let notifTimes = JSON.parse(localStorage.getItem(LS_NOTIFS)) || [];
let notifEnabled = JSON.parse(localStorage.getItem(LS_NOTIF_STATUS)) === true;
let autoPinVerify = JSON.parse(localStorage.getItem(LS_PIN_AUTO)) !== false; 
let lastCheckedMinute = -1;
let showOnlyWithMarks = JSON.parse(localStorage.getItem(LS_SHOW_ONLY_MARKS)) === true;
let includeFourthSubject = JSON.parse(localStorage.getItem(LS_INCLUDE_FOURTH)) !== false;
let fourthSubject = localStorage.getItem(LS_FOURTH_SUBJECT) || 'জীববিজ্ঞান';

const getSavedPin = () => localStorage.getItem(LS_PIN) || "000000";

// ---- ( Pagination State ) ----
let pMode = localStorage.getItem("pMode") || "infinite";
let pRowsPerPage = parseInt(localStorage.getItem("pRowsPerPage")) || 10;
let pCurrentPage = 1;
let pIsLoading = false;
let pCurrentData = [];
let pDisplayedCount = 0;

// ---- ( Subject Data ) ----
let subjectData = [];
let subjectResults = [];
let subjectPMode = localStorage.getItem("subjectPMode") || "infinite";
let subjectPRowsPerPage = parseInt(localStorage.getItem("subjectPRowsPerPage")) || 10;
let subjectPCurrentPage = 1;
let subjectPIsLoading = false;
let subjectPCurrentData = [];
let subjectPDisplayedCount = 0;

/* ==========================
🔐 Section: 03 Security System
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
            fetchAllData();
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
========================== */

// ---- ( Smart Data Fetching ) ----
async function fetchAllData() {
    const offlineAlert = $("#offlineAlert");
    const refreshIcon = $('#refreshDataBtn i');
    
    if(refreshIcon) refreshIcon.classList.add('spinning'); 

    // Step 1: Load from Cache Immediately
    const cachedCourse = localStorage.getItem(LS_DATA_CACHE);
    const cachedSubject = localStorage.getItem(LS_SUBJECT_CACHE);

    if (cachedCourse) {
        allEntries = JSON.parse(cachedCourse);
        if (appMode === 'course') renderDashboard();
    }
    if (cachedSubject) {
        subjectData = JSON.parse(cachedSubject);
        processSubjectData();
    }

    try {
        // Step 2: Try Network Request
        const res = await fetch(getApiUrl());
        if (!res.ok) throw new Error("Network response was not ok");
        
        const rawData = await res.json();
        
        // Step 3: Process Course Data
        if (rawData.results || Array.isArray(rawData)) {
             const cData = Array.isArray(rawData) ? rawData : (rawData.results || []);
             allEntries = cData
                .filter(d => d.date)
                .map((entry, index) => ({
                    ...entry,
                    serial: Number(entry.serial) || (index + 1), 
                    branch: Number(entry.branch),
                    central: Number(entry.central)
                }))
                .sort((a, b) => a.serial - b.serial);
             localStorage.setItem(LS_DATA_CACHE, JSON.stringify(allEntries));
        }

        // Step 4: Process Subject Data
        if (rawData.subjects) {
            subjectData = rawData.subjects.map(subject => ({
                serial: subject.serial,
                date: subject.date,
                subject: subject.subject,
                syllabus: subject.syllabus,
                total_marks: parseInt(subject.total) || 0,
                obtained_marks: parseInt(subject.obtained) || null,
                branch_merit: parseInt(subject.branch) || null,
                central_merit: parseInt(subject.central) || null
            }));
            localStorage.setItem(LS_SUBJECT_CACHE, JSON.stringify(subjectData));
            processSubjectData();
        }
            
        // Step 5: Update UI & Hide Banner
        if (appMode === 'course') {
            renderDashboard();
            updateYearDropdown();
        } else {
            renderSubjectDashboard();
            updateSubjectYearDropdown();
        }
        
        if (offlineAlert) offlineAlert.classList.add("hidden");

    } catch (e) {
        console.log("Offline Mode Active:", e);
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

function processSubjectData() {
    if (showOnlyWithMarks) {
        subjectResults = subjectData.filter(item => item.obtained_marks !== null);
    } else {
        subjectResults = [...subjectData];
    }
    populateSubjectDropdown();
}

function populateSubjectDropdown() {
    const select = $('#subjectSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">বিষয় নির্বাচন করুন...</option>';
    
    subjectData.forEach(item => {
        const option = document.createElement('option');
        option.value = item.serial;
        option.textContent = `${item.subject} (${item.date})`;
        option.dataset.subject = item.subject;
        option.dataset.syllabus = item.syllabus;
        option.dataset.date = item.date;
        option.dataset.total = item.total_marks;
        option.dataset.obtained = item.obtained_marks || '';
        option.dataset.branch = item.branch_merit || '';
        option.dataset.central = item.central_merit || '';
        
        select.appendChild(option);
    });
}

function updateSubjectYearDropdown() {
    const years = [...new Set(subjectData.map(d => d.date.split('-')[0]))].filter(y => y && y.length === 4);
    const yearSel = $('#subjectYearSelect');
    if (yearSel) {
        yearSel.innerHTML = '<option value="">সব বছর</option>' + 
            years.sort().map(y => `<option value="${y}">${y}</option>`).join('');
    }
}

function updateSubjectInfoCard() {
    const select = $('#subjectSelect');
    const card = $('#subjectInfoCard');
    const option = select.options[select.selectedIndex];
    
    if (!select.value) {
        card.classList.add('hidden');
        return;
    }
    
    card.classList.remove('hidden');
    $('#selectedSubjectName').textContent = option.dataset.subject;
    $('#selectedDate').textContent = formatDate(option.dataset.date);
    $('#selectedSyllabus').textContent = option.dataset.syllabus || "সিলেবাস নেই";
    
    $('#inpSubObtained').value = option.dataset.obtained;
    $('#inpSubBranch').value = option.dataset.branch;
    $('#inpSubCentral').value = option.dataset.central;
}

/* ==========================
📝 Section: 05 Data Submission
========================== */

// ---- ( Course Entry ) ----
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
        
        await fetchAllData();
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

// ---- ( Subject Entry ) ----
async function submitSubjectEntry() {
    const serial = $('#subjectSelect').value;
    const marks = $('#inpSubObtained').value;
    const branch = $('#inpSubBranch').value;
    const central = $('#inpSubCentral').value;
    
    if (!serial || !marks) {
        showToast("বিষয় ও নম্বর আবশ্যক", "error");
        return;
    }
    
    const payload = {
        type: 'update_subject',
        serial: serial,
        my_marks: marks,
        branch: branch || "",
        central: central || ""
    };
    
    const submitBtn = $('#btnSaveSubject');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.classList.add('btn-loading');
    submitBtn.innerHTML = '';
    
    try {
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            $('#inpSubObtained').value = '';
            $('#inpSubBranch').value = '';
            $('#inpSubCentral').value = '';
            $('#subjectSelect').value = '';
            $('#subjectInfoCard').classList.add('hidden');
            
            await fetchAllData();
            showToast("বিষয়ের তথ্য সফলভাবে আপডেট হয়েছে!", "success");
        } else {
            showToast("ডাটা পাঠাতে ব্যর্থ হয়েছে", "error");
        }
    } catch (error) {
        console.error('Error:', error);
        showToast("নেটওয়ার্ক ত্রুটি", "error");
    } finally {
        submitBtn.classList.remove('btn-loading');
        submitBtn.innerHTML = originalText;
    }
}

/* ==========================
🔄 Section: 06 Mode Management
========================== */

// ১. পেজ লোড হওয়ার সময় মোড ডিটেক্ট করা
if (!localStorage.getItem('appMode')) {
    localStorage.setItem('appMode', 'subject');
}
appMode = localStorage.getItem('appMode');

// ২. মোড পরিবর্তন করার মূল ফাংশন
function switchMode(mode) {
    appMode = mode;
    localStorage.setItem('appMode', mode);
    
    // UI এবং টাইটেল আপডেট
    updateModeUI(mode);
    updateViewTitle();
    
    // সঠিক ড্যাশবোর্ড ডাটা রেন্ডার করা
    if (mode === 'course') {
        if (allEntries.length > 0) renderDashboard();
    } else {
        if (subjectData.length > 0) {
            processSubjectData();
            renderSubjectDashboard();
        }
    }
}

// ৩. UI এলিমেন্টগুলো হাইড/শো করা
function updateModeUI(mode) {
    const courseBtn = $('#btnModeCourse');
    const subjectBtn = $('#btnModeSubject');
    
    if (courseBtn) courseBtn.classList.toggle('active', mode === 'course');
    if (subjectBtn) subjectBtn.classList.toggle('active', mode === 'subject');
    
    $$('.course-mode').forEach(el => {
        if (el.id !== 'modeSwitcher') el.classList.toggle('hidden', mode !== 'course');
    });
    
    $$('.subject-mode').forEach(el => {
        el.classList.toggle('hidden', mode !== 'subject');
    });
    
    if ($('#filterBar')) $('#filterBar').classList.toggle('hidden', mode !== 'course');
    if ($('#subjectFilterBar')) $('#subjectFilterBar').classList.toggle('hidden', mode !== 'subject');
}

// ৪. ভিউ অনুযায়ী টাইটেল পরিবর্তন
function updateViewTitle() {
    const titleMap = {
        'course': { tabInput: "ডাটা এন্ট্রি", tabTable: "রিপোর্ট শিট", tabGraph: "বিশ্লেষণ", tabPin: "সেটিংস" },
        'subject': { tabInput: "বিষয়ভিত্তিক এন্ট্রি", tabTable: "বিষয়ভিত্তিক রিপোর্ট", tabGraph: "বিষয়ভিত্তিক বিশ্লেষণ", tabPin: "সেটিংস" }
    };
    
    const activeTab = $$('.tab-item:not(.hidden)')[0]?.id || 'tabInput';
    if (titleMap[appMode] && titleMap[appMode][activeTab]) {
        $('#viewTitle').textContent = titleMap[appMode][activeTab];
    }
}

// ৫. পেজ লোডের সময় অটো-রেন্ডার নিশ্চিত করা (এটি সেকশন ১২ এর সাথেও সম্পৃক্ত)
function initializeAppMode() {
    initializeAppMode(appMode);
    updateViewTitle();
    // ডাটা ক্যাশে থাকলে সাথে সাথে রেন্ডার করবে
    if (appMode === 'course' && allEntries.length > 0) renderDashboard();
    if (appMode === 'subject' && subjectData.length > 0) {
        processSubjectData();
        renderSubjectDashboard();
    }
}


/* ==========================
📊 Section: 07 Dashboard & Charts
========================== */

// ---- ( Course Dashboard ) ----
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
    updateCourseCharts(data);
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

function updateCourseCharts(data) {
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
        plugins: { legend: { display: false } }
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

// ---- ( Subject Dashboard ) ----
function renderSubjectDashboard() {
    let filteredData = applySubjectFilters();
    updateSubjectSummary(filteredData);
    updateSubjectTable(filteredData);
    updateSubjectCharts(filteredData);
}

function applySubjectFilters() {
    let data = [...subjectResults];
    
    const subjectFilter = $('#subjectFilter').value;
    if (subjectFilter) {
        data = data.filter(d => d.subject.includes(subjectFilter));
    }
    
    const smartFilter = $('#smartFilter').value;
    switch (smartFilter) {
        case 'with_marks':
            data = data.filter(d => d.obtained_marks !== null);
            break;
        case 'without_marks':
            data = data.filter(d => d.obtained_marks === null);
            break;
        case 'best_marks':
            data = data.filter(d => d.obtained_marks !== null)
                       .sort((a, b) => (b.obtained_marks / b.total_marks) - (a.obtained_marks / a.total_marks));
            break;
        case 'best_rank':
            data = data.filter(d => d.branch_merit !== null)
                       .sort((a, b) => a.branch_merit - b.branch_merit);
            break;
    }
    
    const year = $('#subjectYearSelect').value;
    if (year) {
        data = data.filter(d => d.date.startsWith(year));
    }
    
    const month = $('#subjectMonthSelect').value;
    if (month) {
        data = data.filter(d => d.date.split('-')[1] === month);
    }
    
    return data;
}

function updateSubjectSummary(data) {
    const totalExams = subjectData.length;
    const attemptedExams = subjectData.filter(d => d.obtained_marks !== null).length;
    
    const withMarks = data.filter(d => d.obtained_marks !== null);
    const totalMarks = withMarks.reduce((sum, d) => sum + d.obtained_marks, 0);
    const totalPossible = withMarks.reduce((sum, d) => sum + d.total_marks, 0);
    const average = totalPossible > 0 ? Math.round((totalMarks / totalPossible) * 100) : 0;
    
    const gpa = calculateGPA(withMarks);
    
    const withRanks = withMarks.filter(d => d.branch_merit !== null && d.central_merit !== null);
    const bestBranch = withRanks.length > 0 ? 
        Math.min(...withRanks.map(d => d.branch_merit)) : '-';
    const bestCentral = withRanks.length > 0 ? 
        Math.min(...withRanks.map(d => d.central_merit)) : '-';
    
    const bestBranchSubject = withRanks.find(d => d.branch_merit === bestBranch);
    const bestCentralSubject = withRanks.find(d => d.central_merit === bestCentral);
    
    $('#sumSubjectExams').textContent = totalExams;
    $('#sumSubjectAttempted').textContent = attemptedExams;
    $('#sumSubjectAverage').textContent = `${average}%`;
    $('#sumSubjectBestBranch').textContent = bestBranchSubject ? 
        `${bestBranchSubject.subject} (${bestBranch})` : '-';
    $('#sumSubjectBestCentral').textContent = bestCentralSubject ? 
        `${bestCentralSubject.subject} (${bestCentral})` : '-';
    $('#sumSubjectGPA').textContent = gpa.toFixed(2);
}

function calculateGPA(subjects) {
    if (subjects.length === 0) return 0;
    
    let totalPoints = 0;
    let count = 0;
    
    subjects.forEach(subject => {
        if (subject.obtained_marks !== null && subject.total_marks > 0) {
            const percentage = (subject.obtained_marks / subject.total_marks) * 100;
            
            let gpa = 0;
            if (percentage >= 80) gpa = 5.0;
            else if (percentage >= 70) gpa = 4.0;
            else if (percentage >= 60) gpa = 3.5;
            else if (percentage >= 50) gpa = 3.0;
            else if (percentage >= 40) gpa = 2.0;
            else if (percentage >= 33) gpa = 1.0;
            
            const isFourthSubject = includeFourthSubject && 
                (subject.subject.includes(fourthSubject) || 
                 subject.subject.includes('উচ্চতর গণিত') && fourthSubject === 'উচ্চতর গণিত');
            
            if (!isFourthSubject || includeFourthSubject) {
                totalPoints += gpa;
                count++;
            }
        }
    });
    
    return count > 0 ? totalPoints / count : 0;
}

function updateSubjectCharts(data) {
    const withMarks = data.filter(d => d.obtained_marks !== null);
    if (withMarks.length === 0) {
        if (subjectChart) subjectChart.destroy();
        if (subjectMeritChart) subjectMeritChart.destroy();
        return;
    }
    
    withMarks.sort((a, b) => new Date(a.date) - new Date(b.date));
    updateSubjectMarksChart(withMarks);
    updateSubjectMeritChart(withMarks);
}

function updateSubjectMarksChart(data) {
    const canvas = $('#subjectMarksChart');
    if (!canvas) return;
    
    if (subjectChart) subjectChart.destroy();
    
    const ctx = canvas.getContext('2d');
    subjectChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.subject.length > 10 ? d.subject.substring(0, 10) + '...' : d.subject),
            datasets: [{
                label: 'প্রাপ্ত নম্বর',
                data: data.map(d => d.obtained_marks),
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1
            }, {
                label: 'মোট নম্বর',
                data: data.map(d => d.total_marks),
                backgroundColor: 'rgba(148, 163, 184, 0.3)',
                borderColor: 'rgba(148, 163, 184, 0.5)',
                borderWidth: 1,
                type: 'line',
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        title: (context) => data[context[0].dataIndex].subject,
                        label: (context) => {
                            const item = data[context.dataIndex];
                            if (context.datasetIndex === 0) {
                                return `প্রাপ্ত: ${item.obtained_marks}/${item.total_marks} (${Math.round((item.obtained_marks/item.total_marks)*100)}%)`;
                            } else {
                                return `মোট: ${item.total_marks}`;
                            }
                        },
                        afterLabel: (context) => `তারিখ: ${formatDate(data[context.dataIndex].date)}`
                    }
                }
            },
            scales: {
                y: { beginAtZero: true },
                x: {}
            }
        }
    });
}

function updateSubjectMeritChart(data) {
    const canvas = $('#subjectMeritChart');
    if (!canvas) return;
    
    if (subjectMeritChart) subjectMeritChart.destroy();
    
    const ctx = canvas.getContext('2d');
    subjectMeritChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.subject.length > 8 ? d.subject.substring(0, 8) + '...' : d.subject),
            datasets: [{
                label: 'ব্রাঞ্চ মেরিট',
                data: data.map(d => d.branch_merit),
                borderColor: 'rgba(99, 102, 241, 1)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }, {
                label: 'কেন্দ্রীয় মেরিট',
                data: data.map(d => d.central_merit),
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        title: (context) => data[context[0].dataIndex].subject,
                        label: (context) => {
                            const item = data[context.dataIndex];
                            return `${context.dataset.label}: ${context.raw}`;
                        },
                        afterLabel: (context) => {
                            const item = data[context.dataIndex];
                            return `তারিখ: ${formatDate(item.date)}\nনম্বর: ${item.obtained_marks}/${item.total_marks}`;
                        }
                    }
                }
            },
            scales: {
                y: { },
                x: {}
            }
        }
    });
}

/* ==========================
📋 Section: 08 Tables & Pagination
========================== */

// ---- ( Course Table ) ----
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

// ---- ( Subject Table ) ----
function updateSubjectTable(data) {
    subjectPCurrentData = [...data].reverse();
    
    const endMsg = $("#subjectEndMessage");
    const loader = $("#subjectInfiniteLoader");
    const pagControls = $("#subjectPaginationControls");
    const tbody = $("#subjectTableRows");
    
    if (endMsg) endMsg.classList.add("hidden");
    if (loader) loader.classList.add("hidden");
    
    if (subjectPMode === "infinite") {
        subjectPDisplayedCount = 0;
        if (tbody) tbody.innerHTML = "";
        if (pagControls) pagControls.classList.add("hidden");
        loadMoreSubjectInfinite();
    } else {
        if (pagControls) pagControls.classList.remove("hidden");
        renderSubjectPage(1);
    }
}

function loadMoreSubjectInfinite() {
    if (subjectPIsLoading || subjectPDisplayedCount >= subjectPCurrentData.length) return;
    subjectPIsLoading = true;
    const loader = $("#subjectInfiniteLoader");
    if (loader) loader.classList.remove("hidden");
    
    setTimeout(() => {
        const nextBatch = subjectPCurrentData.slice(subjectPDisplayedCount, subjectPDisplayedCount + subjectPRowsPerPage);
        renderSubjectRows(nextBatch, true);
        subjectPDisplayedCount += nextBatch.length;
        subjectPIsLoading = false;
        
        if (loader) loader.classList.add("hidden");
        if (subjectPDisplayedCount >= subjectPCurrentData.length && subjectPCurrentData.length > 0) {
            $("#subjectEndMessage")?.classList.remove("hidden");
        }
    }, 500);
}

function renderSubjectPage(page) {
    subjectPCurrentPage = page;
    const start = (page - 1) * subjectPRowsPerPage;
    const pageData = subjectPCurrentData.slice(start, start + subjectPRowsPerPage);
    $("#subjectTableRows").innerHTML = "";
    renderSubjectRows(pageData, false);
    renderSubjectPaginationControls();
}

function renderSubjectRows(data, append) {
    const tbody = $("#subjectTableRows");
    if (!tbody) return;
    
    if (!data.length && !append) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">কোন রিপোর্ট পাওয়া যায়নি</td></tr>';
        return;
    }
    
    const html = data.map((d, index) => {
        const serial = subjectPDisplayedCount - data.length + index + 1;
        const percentage = d.obtained_marks !== null ? Math.round((d.obtained_marks / d.total_marks) * 100) : '-';
        
        return `
        <tr class="fade-in">
            <td><span class="sn-badge">${serial}</span></td>
            <td class="subject-table-cell">
                <div class="subject-name">${d.subject}</div>
                <div class="subject-syllabus" title="${d.syllabus}">${d.syllabus || 'সিলেবাস নেই'}</div>
            </td>
            <td>${formatDate(d.date)}</td>
            <td>
                <b>${d.obtained_marks !== null ? d.obtained_marks : '-'}</b> / ${d.total_marks}
                ${d.obtained_marks !== null ? `<div style="font-size:11px; color:var(--text-muted);">${percentage}%</div>` : ''}
            </td>
            <td>${d.branch_merit !== null ? d.branch_merit : '-'}</td>
            <td>${d.central_merit !== null ? d.central_merit : '-'}</td>
        </tr>`;
    }).join("");
    
    if (append) {
        tbody.insertAdjacentHTML("beforeend", html);
    } else {
        tbody.innerHTML = html;
    }
}

function renderSubjectPaginationControls() {
    const container = $("#subjectPaginationControls");
    if (!container) return;
    const totalPages = Math.ceil(subjectPCurrentData.length / subjectPRowsPerPage);
    if (totalPages <= 1) { container.innerHTML = ""; return; }
    
    let html = `<button class="page-num-btn" onclick="renderSubjectPage(${subjectPCurrentPage - 1})" ${subjectPCurrentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= subjectPCurrentPage - 1 && i <= subjectPCurrentPage + 1)) {
            html += `<button class="page-num-btn ${i === subjectPCurrentPage ? 'active' : ''}" onclick="renderSubjectPage(${i})">${i}</button>`;
        } else if ((i === subjectPCurrentPage - 2 && subjectPCurrentPage > 3) || (i === subjectPCurrentPage + 2 && subjectPCurrentPage < totalPages - 2)) {
            if (!html.endsWith('...')) html += `<span class="pagination-dots">...</span>`;
        }
    }
    
    html += `<button class="page-num-btn" onclick="renderSubjectPage(${subjectPCurrentPage + 1})" ${subjectPCurrentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

window.setSubjectPaginationMode = (mode) => {
    if (subjectPMode === mode) return;
    subjectPMode = mode;
    localStorage.setItem("subjectPMode", mode);
    
    $$("#subjectTableSection .p-btn").forEach(b => {
        const isClickedMode = b.getAttribute("onclick")?.includes(mode);
        b.classList.toggle("active", isClickedMode);
    });
    
    updateSubjectTable(subjectPCurrentData);
};

window.handleSubjectRowsChange = (val) => {
    subjectPRowsPerPage = parseInt(val);
    localStorage.setItem("subjectPRowsPerPage", subjectPRowsPerPage);
    updateSubjectTable(subjectPCurrentData);
};

/* ==========================
🔔 Section: 09 Notifications
========================== */

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
                icon: "./images/favicon.ico"
            });
        } else {
            showToast(`⏰ রিমাইন্ডার: রিপোর্ট চেক করুন (${format12hr(currentTime)})`);
        }
    }
}

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

/* ==========================
🛠️ Section: 10 Modals & Reset
========================== */

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

/* ==========================
📤 Section: 11 Export Functions
========================== */

function initExportFunctions() {
    // Safe null checks before adding event listeners
    const exportExcelBtn = $('#exportExcel');
    const exportPDFBtn = $('#exportPDF');
    const exportPrintBtn = $('#exportPrint');
    
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportToPDF);
    if (exportPrintBtn) exportPrintBtn.addEventListener('click', printData);
    
    // Fixed: Safe checks before setting . checked property
    const showMarksCheckbox = $('#showOnlyWithMarks');
    const fourthSubjectCheckbox = $('#includeFourthSubject');
    const fourthSubjectSelect = $('#fourthSubjectSelect');
    
    if (showMarksCheckbox) {
        showMarksCheckbox. checked = showOnlyWithMarks;
        showMarksCheckbox.addEventListener('change', function(e) {
            showOnlyWithMarks = e.target.checked;
            localStorage.setItem(LS_SHOW_ONLY_MARKS, showOnlyWithMarks);
            processSubjectData();
            renderSubjectDashboard();
            showToast('সেটিংস সেভ করা হয়েছে');
        });
    }
    
    if (fourthSubjectCheckbox) {
        fourthSubjectCheckbox.checked = includeFourthSubject;
        fourthSubjectCheckbox.addEventListener('change', function(e) {
            includeFourthSubject = e.target.checked;
            localStorage.setItem(LS_INCLUDE_FOURTH, includeFourthSubject);
            updateFourthSubjectContainer();
            renderSubjectDashboard();
            showToast('সেটিংস সেভ করা হয়েছে');
        });
    }
    
    if (fourthSubjectSelect) {
        fourthSubjectSelect.value = fourthSubject;
        fourthSubjectSelect.addEventListener('change', function(e) {
            fourthSubject = e.target. value;
            localStorage.setItem(LS_FOURTH_SUBJECT, fourthSubject);
            renderSubjectDashboard();
            showToast('৪র্থ বিষয় সেভ করা হয়েছে');
        });
    }
    
    updateFourthSubjectContainer();
    
    const userManualBtn = $('#userManualBtn');
    if (userManualBtn) userManualBtn.addEventListener('click', showUserManual);
}

function updateFourthSubjectContainer() {
    const container = $('#fourthSubjectContainer');
    container.style.display = includeFourthSubject ? 'flex' : 'none';
}

async function exportToExcel() {
    const dataType = $('#exportDataType').value;
    let data, headers, filename;
    
    if (dataType === 'course' || dataType === 'all') {
        data = allEntries || [];
        headers = ['ক্রমিক', 'তারিখ', 'সময়', 'ব্রাঞ্চ মেরিট', 'কেন্দ্রীয় মেরিট'];
        const rows = data.map(d => [d.serial, d.date, d.time, d.branch, d.central]);
        
        if (dataType === 'course') {
            exportCSV(headers, rows, 'course_data.csv');
            return;
        }
    }
    
    if (dataType === 'subject' || dataType === 'all') {
        data = subjectData || [];
        headers = ['ক্রমিক', 'তারিখ', 'বিষয়', 'সিলেবাস', 'মোট নম্বর', 'প্রাপ্ত নম্বর', 'ব্রাঞ্চ মেরিট', 'কেন্দ্রীয় মেরিট'];
        const rows = data.map(d => [
            d.serial, 
            d.date, 
            d.subject, 
            d.syllabus, 
            d.total_marks, 
            d.obtained_marks || '', 
            d.branch_merit || '', 
            d.central_merit || ''
        ]);
        
        if (dataType === 'subject') {
            exportCSV(headers, rows, 'subject_data.csv');
            return;
        }
    }
    
    if (dataType === 'all') {
        showToast('দুই ধরনের ডাটাই প্রস্তুত করা হচ্ছে...');
        exportCSV(headers, rows, 'fmt_tracker_all_data.csv');
    }
}

function exportCSV(headers, rows, filename) {
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`${filename} ডাউনলোড করা হয়েছে`, 'success');
}

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const dataType = $('#exportDataType').value;
    
    doc.setFontSize(16);
    doc.text('Udvash FMT Tracker - Report', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`রিপোর্ট তারিখ: ${new Date().toLocaleDateString('bn-BD')}`, 105, 22, { align: 'center' });
    doc.text(`ডাটা টাইপ: ${dataType === 'course' ? 'কোর্স মেরিট' : dataType === 'subject' ? 'বিষয়ভিত্তিক' : 'সব ডাটা'}`, 105, 28, { align: 'center' });
    
    if (dataType === 'course') {
        const data = allEntries || [];
        const headers = [['ক্রমিক', 'তারিখ', 'সময়', 'ব্রাঞ্চ', 'কেন্দ্রীয়']];
        const rows = data.map(d => [d.serial, d.date, d.time, d.branch, d.central]);
        
        doc.autoTable({
            head: headers,
            body: rows,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] },
            styles: { font: 'helvetica', fontSize: 9 }
        });
    } else if (dataType === 'subject') {
        const data = subjectData || [];
        const headers = [['ক্রমিক', 'তারিখ', 'বিষয়', 'নম্বর', 'ব্রাঞ্চ', 'কেন্দ্রীয়']];
        const rows = data.map(d => [
            d.serial, 
            d.date, 
            d.subject.substring(0, 15),
            d.obtained_marks !== null ? `${d.obtained_marks}/${d.total_marks}` : '-/-',
            d.branch_merit || '-',
            d.central_merit || '-'
        ]);
        
        doc.autoTable({
            head: headers,
            body: rows,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] },
            styles: { font: 'helvetica', fontSize: 8 }
        });
    }
    
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`পৃষ্ঠা ${i}/${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
        doc.text('ডেভেলপার: MD Turzo - https://mdturzo.odoo.com', 105, doc.internal.pageSize.height - 5, { align: 'center' });
    }
    
    doc.save(`fmt_tracker_${dataType}_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('পিডিএফ ডাউনলোড করা হয়েছে', 'success');
}

function printData() {
    const dataType = $('#exportDataType').value;
    let printContent = '';
    
    printContent += `
        <div style="font-family: 'Hind Siliguri', 'Inter', sans-serif; padding: 20px;">
            <h1 style="text-align: center; color: #6366f1; margin-bottom: 5px;">Udvash FMT Tracker</h1>
            <p style="text-align: center; color: #666; margin-bottom: 20px;">
                রিপোর্ট তারিখ: ${new Date().toLocaleDateString('bn-BD')}<br>
                ডাটা টাইপ: ${dataType === 'course' ? 'কোর্স মেরিট' : dataType === 'subject' ? 'বিষয়ভিত্তিক' : 'সব ডাটা'}
            </p>
    `;
    
    if (dataType === 'course') {
        const data = allEntries || [];
        printContent += `
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #6366f1; color: white;">
                        <th style="padding: 10px; border: 1px solid #ddd;">ক্রমিক</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">তারিখ</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">সময়</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">ব্রাঞ্চ</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">কেন্দ্রীয়</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(d => {
            printContent += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${d.serial}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${d.date}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${d.time}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${d.branch}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${d.central}</td>
                </tr>
            `;
        });
        
        printContent += `
                </tbody>
            </table>
        `;
    } else if (dataType === 'subject') {
        const data = subjectData || [];
        printContent += `
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px;">
                <thead>
                    <tr style="background-color: #6366f1; color: white;">
                        <th style="padding: 8px; border: 1px solid #ddd;">ক্রমিক</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">তারিখ</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">বিষয়</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">নম্বর</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">ব্রাঞ্চ</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">কেন্দ্রীয়</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(d => {
            printContent += `
                <tr>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${d.serial}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${d.date}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${d.subject}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${d.obtained_marks !== null ? `${d.obtained_marks}/${d.total_marks}` : '-/-'}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${d.branch_merit || '-'}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${d.central_merit || '-'}</td>
                </tr>
            `;
        });
        
        printContent += `
                </tbody>
            </table>
        `;
    }
    
    printContent += `
            <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #666;">
                <p>ডেভেলপার: MD Turzo</p>
                <p>ওয়েবসাইট: https://mdturzo.odoo.com</p>
                <p>Udvash FMT Tracker Pro V18.0</p>
            </div>
        </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Udvash FMT Tracker - Print</title>
                <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    @media print {
                        @page { margin: 20px; }
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>${printContent}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

function showUserManual() {
    openModal(`
        <div class="reset-top-banner">
            <div class="reset-icon-anim"><i class="fas fa-book"></i></div>
            <h3>ব্যবহার নির্দেশিকা</h3>
        </div>
        <div class="reset-body">
            <p style="text-align: center; color: var(--text-muted); margin-bottom: 20px;">
                এই ফিচারটি ডেভেলপমেন্ট চলছে। শীঘ্রই আসছে...
            </p>
            <div class="reset-footer">
                <button class="btn-reset-cancel" onclick="closeModal()">ঠিক আছে</button>
            </div>
        </div>
    `);
}

/* ==========================
⚙️ Section: 12 Events & Init
========================== */

function initOfflineAndPWA() {
    if($("#closeOfflineAlert")) {
        $("#closeOfflineAlert").onclick = () => {
            isOfflineBannerDismissed = true;
            $("#offlineAlert").classList.add("hidden");
        };
    }

    window.addEventListener('online', () => {
        isOfflineBannerDismissed = false; 
        $("#offlineAlert")?.classList.add("hidden"); 
        fetchAllData(); 
        showToast("ইন্টারনেট ফিরে এসেছে। ডাটা আপডেট হচ্ছে...", "success");
    });

    window.addEventListener('offline', () => {
        if(!isOfflineBannerDismissed) $("#offlineAlert")?.classList.remove("hidden");
        showToast("ইন্টারনেট সংযোগ বিচ্ছিন্ন", "error");
    });

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); 
        deferredPrompt = e;
        
        const installCards = $$('.install-section');
        installCards.forEach(installCard => {
            if(installCard) {
                installCard.classList.remove("hidden");
                const btn = installCard.querySelector("button");
                if(btn) btn.onclick = async () => {
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
    });
}

function setupEvents() {
    // 1. PIN Inputs
    $$(".key-btn").forEach(btn => btn.onclick = () => {
        if(navigator.vibrate) navigator.vibrate(20);
        handleKeyPress(btn.dataset.key);
    });
    
    const pinInput = $("#pinInput");
    if (pinInput) pinInput.addEventListener("input", e => handlePinInput(e.target.value));
    
    // 2. Global Keyboard
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
            
            const showFilter = (target === "tabTable" || target === "tabGraph");
            if ($("#filterBar")) $("#filterBar").classList.toggle("hidden", !showFilter || appMode !== 'course');
            if ($("#subjectFilterBar")) $("#subjectFilterBar").classList.toggle("hidden", !showFilter || appMode !== 'subject');
            
            updateViewTitle();
            
            if (window.innerWidth < 768) $("#sidebar").classList.add("collapsed");
            if (target === "tabGraph") {
                if (appMode === 'course') renderDashboard();
                else renderSubjectDashboard();
            }
        };
    });

    // 5. Mode Switcher
    if ($("#btnModeCourse")) $("#btnModeCourse").onclick = () => switchMode('course');
    if ($("#btnModeSubject")) $("#btnModeSubject").onclick = () => switchMode('subject');

    // 6. Filters
    ["yearSelect", "monthSelect", "startDate", "endDate"].forEach(id => $(`#${id}`) && ($(`#${id}`).onchange = renderDashboard));
    $("#resetFilters").onclick = () => {
        ["yearSelect", "monthSelect", "startDate", "endDate"].forEach(id => $(`#${id}`) && ($(`#${id}`).value = ""));
        renderDashboard();
        showToast("ফিল্টার রিসেট");
    };
    
    $("#refreshDataBtn").onclick = async () => { 
        await fetchAllData(); 
        showToast("ডাটা রিফ্রেশ করা হয়েছে", "success"); 
    };
    $("#saveEntry").onclick = submitEntry;

    // 7. Subject Events
    if ($("#subjectSelect")) $("#subjectSelect").addEventListener('change', updateSubjectInfoCard);
    if ($("#btnSaveSubject")) $("#btnSaveSubject").addEventListener('click', submitSubjectEntry);
    
    // Subject Filters
    ['subjectFilter', 'smartFilter', 'subjectYearSelect', 'subjectMonthSelect'].forEach(id => {
        const element = $(`#${id}`);
        if (element) element.addEventListener('change', () => renderSubjectDashboard());
    });
    
    if ($("#resetSubjectFilters")) $("#resetSubjectFilters").addEventListener('click', () => {
        ['subjectFilter', 'smartFilter', 'subjectYearSelect', 'subjectMonthSelect'].forEach(id => {
            const element = $(`#${id}`);
            if (element) element.value = '';
        });
        renderSubjectDashboard();
        showToast('ফিল্টার রিসেট করা হয়েছে');
    });

    // 8. Notifications
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

    // 9. Misc
    $("#useCurrentTimeToggle").onchange = e => $("#manualInputArea").classList.toggle("hidden", e.target.checked);
    $("#changePinBtn").onclick = changePin;
    $('#factoryResetBtn').onclick = showResetStep1;
    if ($("#closeSidebar")) $("#closeSidebar").onclick = () => $("#sidebar").classList.add("collapsed");
    if ($("#mainLogo")) $("#mainLogo").onclick = () => $("#sidebar").classList.toggle("collapsed");

    // 10. Export Functions
    initExportFunctions();

    // 11. Infinite Scroll
    window.addEventListener("scroll", () => {
        if (appMode === 'course' && pMode === "infinite" && !$("#endMessage").classList.contains("hidden")) return;
        if (appMode === 'course' && pMode === "infinite") {
            if (document.documentElement.scrollTop + document.documentElement.clientHeight >= document.documentElement.scrollHeight - 50) {
                loadMoreInfinite();
            }
        }
        if (appMode === 'subject' && subjectPMode === "infinite" && !$("#subjectEndMessage").classList.contains("hidden")) return;
        if (appMode === 'subject' && subjectPMode === "infinite") {
            if (document.documentElement.scrollTop + document.documentElement.clientHeight >= document.documentElement.scrollHeight - 50) {
                loadMoreSubjectInfinite();
            }
        }
    });
}

// ---- ( App Entry Point ) ----
document.addEventListener("DOMContentLoaded", () => {
    // 1. Load Theme
    if (localStorage.getItem(LS_THEME) === "dark") {
        document.body.classList.add("dark-theme");
        if ($("#darkToggleSet")) $("#darkToggleSet").checked = true;
    }

    // 2. Setup All Events
    initOfflineAndPWA();
    if ($("#pinAutoToggleSet")) $("#pinAutoToggleSet").checked = autoPinVerify;
    setupEvents();
    renderReminders();
    updateDateDisplay();
    
    // 3. Set initial mode UI
    updateModeUI(appMode);
    updateViewTitle();
    
    // 4. Initial Focus
    if (window.innerWidth > 992) $("#pinInput")?.focus();
    
    // 5. Init Pagination UI
    const rowSelector = $("#rowsPerPage");
    if (rowSelector) rowSelector.value = pRowsPerPage;
    $$(".p-btn").forEach(b => b.classList.toggle("active", b.getAttribute("onclick").includes(pMode)));
    
    // 6. Start notification checks
    setInterval(checkNotifications, 5000);
});

// ---- ( Service Worker ) ----
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('SW Ready'))
            .catch(err => console.log('SW Fail', err));
    });
}

/* ==========================
🔧 Section: 13 Utility Functions
========================== */

// টগল পাসওয়ার্ড ভিজিবিলিটি
window.togglePass = (id) => {
    const input = $(`#${id}`);
    const toggle = input.nextElementSibling;
    if (input.type === "password") {
        input.type = "text";
        toggle.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        input.type = "password";
        toggle.innerHTML = '<i class="fas fa-eye"></i>';
    }
};

// PWA ইনস্টল স্টেট চেক
function checkInstallState() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (isStandalone) {
        const homeCard = document.getElementById('homeInstallCard');
        if (homeCard) homeCard.classList.add('hidden');

        const settingsCard = document.getElementById('pwaInstallBtn');
        if (settingsCard) {
            const title = settingsCard.querySelector('.install-text h3');
            const desc = settingsCard.querySelector('.install-text p');
            const icon = settingsCard.querySelector('.install-icon i');
            const btn = settingsCard.querySelector('.install-btn');

            if (title) title.innerText = "অ্যাপ সক্রিয় আছে";
            if (desc) desc.innerText = "আপনি অ্যাপ ভার্সন ব্যবহার করছেন।";
            if (icon) {
                icon.className = "fas fa-check-circle";
                icon.parentElement.style.background = "rgba(16, 185, 129, 0.2)";
                icon.style.color = "#10b981";
            }
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-check"></i> Installed';
                btn.classList.add('btn-installed-disabled');
            }
        }
    }
}

// অ্যাপ লোড হলে চেক করুন
setTimeout(checkInstallState, 1000);