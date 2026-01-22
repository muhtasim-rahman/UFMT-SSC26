/* ==========================================================================
   FMT TRACKER PRO - ULTIMATE VERSION (V19.0)
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
let subjectBranchChart = null;
let subjectCentralChart = null;
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
const LS_AUTO_REFRESH = 'autoRefreshEnabled';
const LS_AUTO_LOCK = 'autoLockEnabled';

// ---- ( User Preferences ) ----
let notifTimes = JSON.parse(localStorage.getItem(LS_NOTIFS)) || [];
let notifEnabled = JSON.parse(localStorage.getItem(LS_NOTIF_STATUS)) === true;
let autoPinVerify = JSON.parse(localStorage.getItem(LS_PIN_AUTO)) !== false; 
let autoRefreshEnabled = JSON.parse(localStorage.getItem(LS_AUTO_REFRESH)) !== false;
let autoLockEnabled = JSON.parse(localStorage.getItem(LS_AUTO_LOCK)) !== false;
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

// ---- ( V19 New Variables ) ----
let inactivityTimer = null;
let refreshTimer = null;
let currentEditRow = null;
let currentEditType = null; // 'course' or 'subject'
let lastActivityTime = Date.now();

/* ==========================
🔐 Section: 03 Security System - IMPROVED
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
            startInactivityTimer();
            startAutoRefresh();
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
📡 Section: 04 Data Handling - IMPROVED
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
                obtained_marks: subject.obtained !== null && subject.obtained !== '' ? parseFloat(subject.obtained) : null,
                branch_merit: subject.branch !== null && subject.branch !== '' ? parseInt(subject.branch) : null,
                central_merit: subject.central !== null && subject.central !== '' ? parseInt(subject.central) : null
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
    
    if (!select.value) {
        card.classList.add('hidden');
        return;
    }
    
    const option = select.options[select.selectedIndex];
    card.classList.remove('hidden');
    
    const subjectName = option.dataset.subject;
    const date = option.dataset.date;
    const syllabus = option.dataset.syllabus;
    const totalMarks = option.dataset.total || 'N/A';
    const obtainedMarks = option.dataset.obtained || 'N/A';
    const branchMerit = option.dataset.branch || 'N/A';
    const centralMerit = option.dataset.central || 'N/A';
    
    // Calculate percentage
    let percentage = 'N/A';
    if (obtainedMarks !== 'N/A' && totalMarks !== 'N/A' && totalMarks > 0) {
        percentage = ((parseFloat(obtainedMarks) / parseFloat(totalMarks)) * 100).toFixed(1) + '%';
    }
    
    // Update card
    $('#selectedSubjectName').textContent = subjectName;
    $('#selectedDate').textContent = formatDate(date);
    $('#selectedSyllabus').textContent = syllabus || "সিলেবাস নেই";
    $('#selectedTotalMarks').textContent = totalMarks;
    $('#selectedObtainedMarks').textContent = obtainedMarks;
    $('#selectedBranchMerit').textContent = branchMerit;
    $('#selectedCentralMerit').textContent = centralMerit;
    $('#selectedPercentage').textContent = percentage;
    
    // Update status badge
    const statusBadge = $('#subjectStatusBadge');
    if (obtainedMarks !== 'N/A') {
        statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> সম্পূর্ণ';
        statusBadge.style.background = 'rgba(16, 185, 129, 0.1)';
        statusBadge.style.color = '#10b981';
    } else {
        statusBadge.innerHTML = '<i class="fas fa-clock"></i> অপেক্ষমান';
        statusBadge.style.background = 'rgba(245, 158, 11, 0.1)';
        statusBadge.style.color = '#f59e0b';
    }
}

/* ==========================
📝 Section: 05 Data Submission - IMPROVED
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
    const originalBtnText = submitBtn.querySelector('.btn-text').innerHTML;
    
    submitBtn.classList.add('loading');
    submitBtn.querySelector('.btn-text').style.visibility = 'hidden';
    submitBtn.querySelector('.btn-loading-spinner').classList.remove('hidden');

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
        submitBtn.classList.remove('loading');
        submitBtn.querySelector('.btn-text').style.visibility = 'visible';
        submitBtn.querySelector('.btn-loading-spinner').classList.add('hidden');
        submitBtn.querySelector('.btn-text').innerHTML = originalBtnText;
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
        my_marks: parseFloat(marks),
        branch: branch || "",
        central: central || ""
    };
    
    const submitBtn = $('#btnSaveSubject');
    const originalBtnText = submitBtn.querySelector('.btn-text').innerHTML;
    
    submitBtn.classList.add('loading');
    submitBtn.querySelector('.btn-text').style.visibility = 'hidden';
    submitBtn.querySelector('.btn-loading-spinner').classList.remove('hidden');
    
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
        submitBtn.classList.remove('loading');
        submitBtn.querySelector('.btn-text').style.visibility = 'visible';
        submitBtn.querySelector('.btn-loading-spinner').classList.add('hidden');
        submitBtn.querySelector('.btn-text').innerHTML = originalBtnText;
    }
}

/* ==========================
🔄 Section: 06 Mode Management - IMPROVED
========================== */

// ১. পেজ লোড হওয়ার সময় মোড ডিটেক্ট করা
if (!localStorage.getItem('appMode')) {
    localStorage.setItem('appMode', 'course');
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
    
    // Update mode indicator
    $('#currentModeText').textContent = mode === 'course' ? 'কোর্স ভিত্তিক' : 'বিষয় ভিত্তিক';
    
    // Reset inactivity timer
    resetInactivityTimer();
}

// ৩. UI এলিমেন্টগুলো হাইড/শো করা
function updateModeUI(mode) {
    const courseBtn = $('#btnModeCourse');
    const subjectBtn = $('#btnModeSubject');
    const courseHeaderBtn = $('#btnModeCourseHeader');
    const subjectHeaderBtn = $('#btnModeSubjectHeader');
    
    // Update main mode switcher
    if (courseBtn) courseBtn.classList.toggle('active', mode === 'course');
    if (subjectBtn) subjectBtn.classList.toggle('active', mode === 'subject');
    
    // Update header mode switcher
    if (courseHeaderBtn) courseHeaderBtn.classList.toggle('active', mode === 'course');
    if (subjectHeaderBtn) subjectHeaderBtn.classList.toggle('active', mode === 'subject');
    
    // Show/hide mode sections
    $$('.course-mode').forEach(el => {
        if (el.id !== 'modeSwitcher') el.classList.toggle('hidden', mode !== 'course');
    });
    
    $$('.subject-mode').forEach(el => {
        el.classList.toggle('hidden', mode !== 'subject');
    });
    
    // Show/hide filter bars based on current tab
    const activeTab = $$('.tab-item:not(.hidden)')[0]?.id || 'tabInput';
    const showFilter = (activeTab === 'tabTable' || activeTab === 'tabGraph');
    
    if ($('#filterBar')) $('#filterBar').classList.toggle('hidden', !showFilter || mode !== 'course');
    if ($('#subjectFilterBar')) $('#subjectFilterBar').classList.toggle('hidden', !showFilter || mode !== 'subject');
}

// ৪. ভিউ অনুযায়ী টাইটেল পরিবর্তন
function updateViewTitle() {
    const titleMap = {
        'course': { 
            tabInput: "ডাটা এন্ট্রি", 
            tabTable: "রিপোর্ট শিট", 
            tabGraph: "বিশ্লেষণ", 
            tabPin: "সেটিংস" 
        },
        'subject': { 
            tabInput: "বিষয়ভিত্তিক এন্ট্রি", 
            tabTable: "বিষয়ভিত্তিক রিপোর্ট", 
            tabGraph: "বিষয়ভিত্তিক বিশ্লেষণ", 
            tabPin: "সেটিংস" 
        }
    };
    
    const activeTab = $$('.tab-item:not(.hidden)')[0]?.id || 'tabInput';
    if (titleMap[appMode] && titleMap[appMode][activeTab]) {
        $('#viewTitle').textContent = titleMap[appMode][activeTab];
    }
}

/* ==========================
📊 Section: 07 Dashboard & Charts - ENHANCED
========================== */

// ---- ( Course Dashboard ) ----
function renderDashboard() {
    let data = [...allEntries];
    const year = $('#yearSelect')?.value;
    const month = $('#monthSelect')?.value;
    const start = $('#startDate')?.value;
    const end = $('#endDate')?.value;
    const maxBranch = $('#maxBranch')?.value;
    const maxCentral = $('#maxCentral')?.value;

    if (year) data = data.filter(d => String(d.date).startsWith(year));
    if (month) data = data.filter(d => String(d.date).split('-')[1] === month);
    if (start) data = data.filter(d => new Date(d.date) >= new Date(start));
    if (end) data = data.filter(d => new Date(d.date) <= new Date(end));
    if (maxBranch) data = data.filter(d => d.branch <= parseInt(maxBranch));
    if (maxCentral) data = data.filter(d => d.central <= parseInt(maxCentral));

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
        if($('#bestBranchDetail')) $('#bestBranchDetail').textContent = "";
        if($('#bestCentralDetail')) $('#bestCentralDetail').textContent = "";
        return;
    }

    const last = data[data.length - 1]; 
    const bValues = allEntries.map(d => parseInt(d.branch)).filter(Boolean); 
    const cValues = allEntries.map(d => parseInt(d.central)).filter(Boolean);
    const bestBranch = bValues.length ? Math.min(...bValues) : "-";
    const bestCentral = cValues.length ? Math.min(...cValues) : "-";

    const setVal = (id, val) => { if ($(id)) $(id).textContent = val; };
    setVal('#sumLastDate', formatDate(last.date));
    setVal('#sumBranch', last.branch);
    setVal('#sumCentral', last.central);
    setVal('#sumBestBranch', bestBranch);
    setVal('#sumBestCentral', bestCentral);
    setVal('#sumTotal', data.length);
    
    // Update best details
    if (bestBranch !== "-") {
        const bestBranchEntry = allEntries.find(d => d.branch === bestBranch);
        if (bestBranchEntry) {
            $('#bestBranchDetail').textContent = `R-${bestBranchEntry.serial}, ${formatDate(bestBranchEntry.date)}`;
        }
    }
    
    if (bestCentral !== "-") {
        const bestCentralEntry = allEntries.find(d => d.central === bestCentral);
        if (bestCentralEntry) {
            $('#bestCentralDetail').textContent = `R-${bestCentralEntry.serial}, ${formatDate(bestCentralEntry.date)}`;
        }
    }
}

function updateCourseCharts(data) {
    if (!window.Chart) return;
    
    // Prepare data
    const chartData = [...data]; 
    const labels = chartData.map(d => `R-${d.serial}`);
    const branchData = chartData.map(d => d.branch);
    const centralData = chartData.map(d => d.central);
    const dates = chartData.map(d => d.date);

    // Common options
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 10 },
        interaction: {
            mode: "index",
            intersect: false
        },
        scales: {
            y: { 
                grid: { color: "rgba(0,0,0,0.05)", drawBorder: false }, 
                ticks: { font: { family: "Inter", size: 11 } },
                beginAtZero: false,
                reverse: true
            },
            x: { 
                grid: { display: false }, 
                ticks: { 
                    autoSkip: true, 
                    maxTicksLimit: 12, 
                    font: { family: "Inter", size: 10 } 
                }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'var(--card-bg)',
                titleColor: 'var(--primary)',
                bodyColor: 'var(--text-main)',
                borderColor: 'var(--border)',
                borderWidth: 1,
                callbacks: {
                    title: function(context) {
                        return `R-${chartData[context[0].dataIndex].serial}`;
                    },
                    label: function(context) {
                        const index = context.dataIndex;
                        const dataPoint = chartData[index];
                        if (context.datasetIndex === 0) {
                            return `ব্রাঞ্চ মেরিট: ${dataPoint.branch}`;
                        } else {
                            return `সেন্ট্রাল মেরিট: ${dataPoint.central}`;
                        }
                    },
                    afterLabel: function(context) {
                        const index = context.dataIndex;
                        return `আপডেট তারিখ: ${formatDate(dates[index])}`;
                    }
                }
            }
        }
    };

    // Branch Chart
    if (branchChart) branchChart.destroy();
    branchChart = new Chart($("#branchChart"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "ব্রাঞ্চ মেরিট",
                data: branchData,
                borderColor: "#6366f1", 
                borderWidth: 2, 
                pointRadius: 4, 
                pointBackgroundColor: "#6366f1",
                tension: 0.2, 
                fill: true, 
                backgroundColor: "rgba(99, 102, 241, 0.1)"
            }]
        },
        options: commonOptions
    });

    // Central Chart
    if (centralChart) centralChart.destroy();
    centralChart = new Chart($("#centralChart"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "সেন্ট্রাল মেরিট",
                data: centralData,
                borderColor: "#10b981", 
                borderWidth: 2, 
                pointRadius: 4,
                pointBackgroundColor: "#10b981",
                tension: 0.2, 
                fill: true, 
                backgroundColor: "rgba(16, 185, 129, 0.1)"
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
        case 'need_improvement':
            data = data.filter(d => d.obtained_marks !== null && (d.obtained_marks / d.total_marks) < 0.33);
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
    
    const minMarks = $('#minMarks').value;
    if (minMarks) {
        data = data.filter(d => d.obtained_marks !== null && d.obtained_marks >= parseFloat(minMarks));
    }
    
    const maxBranch = $('#subjectMaxBranch').value;
    if (maxBranch) {
        data = data.filter(d => d.branch_merit !== null && d.branch_merit <= parseInt(maxBranch));
    }
    
    return data;
}

function updateSubjectSummary(data) {
    const totalExams = subjectData.length;
    const attemptedExams = subjectData.filter(d => d.obtained_marks !== null).length;
    const passedExams = subjectData.filter(d => d.obtained_marks !== null && (d.obtained_marks / d.total_marks) >= 0.33).length;
    
    const withMarks = data.filter(d => d.obtained_marks !== null);
    const totalMarks = withMarks.reduce((sum, d) => sum + d.obtained_marks, 0);
    const totalPossible = withMarks.reduce((sum, d) => sum + d.total_marks, 0);
    const average = totalPossible > 0 ? ((totalMarks / totalPossible) * 100).toFixed(1) : 0;
    
    // Calculate GPA with and without 4th subject
    const gpaWith4th = calculateGPA(withMarks, true);
    const gpaWithout4th = calculateGPA(withMarks, false);
    
    // Find best performance
    const withRanks = withMarks.filter(d => d.branch_merit !== null && d.central_merit !== null);
    const bestBranch = withRanks.length > 0 ? 
        withRanks.reduce((best, current) => current.branch_merit < best.branch_merit ? current : best) : null;
    const bestCentral = withRanks.length > 0 ? 
        withRanks.reduce((best, current) => current.central_merit < best.central_merit ? current : best) : null;
    const bestMarks = withMarks.length > 0 ? 
        withMarks.reduce((best, current) => (current.obtained_marks / current.total_marks) > (best.obtained_marks / best.total_marks) ? current : best) : null;
    
    // Update summary cards
    $('#sumSubjectExams').textContent = totalExams;
    $('#sumSubjectAttempted').textContent = attemptedExams;
    $('#sumSubjectAverage').textContent = `${average}%`;
    $('#sumSubjectGPAWith4th').textContent = gpaWith4th.toFixed(2);
    $('#sumSubjectGPAWithout4th').textContent = gpaWithout4th.toFixed(2);
    $('#sumSubjectPassed').textContent = passedExams;
    
    // Update average detail
    $('#averageDetail').textContent = `${withMarks.length}টি পরীক্ষার গড়`;
    
    // Update best performance cards
    $('#bestBranchSubject').textContent = bestBranch ? bestBranch.subject : '-';
    $('#bestBranchPosition').textContent = bestBranch ? bestBranch.branch_merit : '-';
    $('#bestBranchMarks').textContent = bestBranch ? `${bestBranch.obtained_marks}/${bestBranch.total_marks}` : '-/-';
    
    $('#bestCentralSubject').textContent = bestCentral ? bestCentral.subject : '-';
    $('#bestCentralPosition').textContent = bestCentral ? bestCentral.central_merit : '-';
    $('#bestCentralMarks').textContent = bestCentral ? `${bestCentral.obtained_marks}/${bestCentral.total_marks}` : '-/-';
    
    $('#bestMarksSubject').textContent = bestMarks ? bestMarks.subject : '-';
    $('#bestMarksPercentage').textContent = bestMarks ? `${((bestMarks.obtained_marks / bestMarks.total_marks) * 100).toFixed(1)}%` : '-';
    $('#bestMarksValue').textContent = bestMarks ? `${bestMarks.obtained_marks}/${bestMarks.total_marks}` : '-/-';
}

function calculateGPA(subjects, includeFourth = true) {
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
            
            if (includeFourth || !isFourthSubject) {
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
        if (subjectBranchChart) subjectBranchChart.destroy();
        if (subjectCentralChart) subjectCentralChart.destroy();
        return;
    }
    
    withMarks.sort((a, b) => new Date(a.date) - new Date(b.date));
    updateSubjectMarksChart(withMarks);
    updateSubjectMeritCharts(withMarks);
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
                    backgroundColor: 'var(--card-bg)',
                    titleColor: 'var(--primary)',
                    bodyColor: 'var(--text-main)',
                    borderColor: 'var(--border)',
                    borderWidth: 1,
                    callbacks: {
                        title: (context) => data[context[0].dataIndex].subject,
                        label: (context) => {
                            const item = data[context.dataIndex];
                            if (context.datasetIndex === 0) {
                                return `প্রাপ্ত: ${item.obtained_marks}/${item.total_marks}`;
                            } else {
                                return `মোট: ${item.total_marks}`;
                            }
                        },
                        afterLabel: (context) => {
                            const item = data[context.dataIndex];
                            const percentage = ((item.obtained_marks / item.total_marks) * 100).toFixed(1);
                            return `শতকরা: ${percentage}%\nতারিখ: ${formatDate(item.date)}`;
                        }
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

function updateSubjectMeritCharts(data) {
    // Branch Merit Chart
    const branchCanvas = $('#subjectBranchChart');
    if (branchCanvas) {
        if (subjectBranchChart) subjectBranchChart.destroy();
        
        const branchCtx = branchCanvas.getContext('2d');
        subjectBranchChart = new Chart(branchCtx, {
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
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        backgroundColor: 'var(--card-bg)',
                        titleColor: 'var(--primary)',
                        bodyColor: 'var(--text-main)',
                        borderColor: 'var(--border)',
                        borderWidth: 1,
                        callbacks: {
                            title: (context) => data[context[0].dataIndex].subject,
                            label: (context) => `ব্রাঞ্চ মেরিট: ${context.raw}`,
                            afterLabel: (context) => {
                                const item = data[context.dataIndex];
                                const percentage = ((item.obtained_marks / item.total_marks) * 100).toFixed(1);
                                return `নম্বর: ${item.obtained_marks}/${item.total_marks} (${percentage}%)\nতারিখ: ${formatDate(item.date)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: { reverse: true },
                    x: {}
                }
            }
        });
    }
    
    // Central Merit Chart
    const centralCanvas = $('#subjectCentralChart');
    if (centralCanvas) {
        if (subjectCentralChart) subjectCentralChart.destroy();
        
        const centralCtx = centralCanvas.getContext('2d');
        subjectCentralChart = new Chart(centralCtx, {
            type: 'line',
            data: {
                labels: data.map(d => d.subject.length > 8 ? d.subject.substring(0, 8) + '...' : d.subject),
                datasets: [{
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
                        backgroundColor: 'var(--card-bg)',
                        titleColor: 'var(--primary)',
                        bodyColor: 'var(--text-main)',
                        borderColor: 'var(--border)',
                        borderWidth: 1,
                        callbacks: {
                            title: (context) => data[context[0].dataIndex].subject,
                            label: (context) => `কেন্দ্রীয় মেরিট: ${context.raw}`,
                            afterLabel: (context) => {
                                const item = data[context.dataIndex];
                                const percentage = ((item.obtained_marks / item.total_marks) * 100).toFixed(1);
                                return `নম্বর: ${item.obtained_marks}/${item.total_marks} (${percentage}%)\nতারিখ: ${formatDate(item.date)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: { reverse: true },
                    x: {}
                }
            }
        });
    }
}

/* ==========================
📋 Section: 08 Tables & Pagination - FIXED
========================== */

// ---- ( Course Table ) ----
function updateTable(data) {
    pCurrentData = [...data].reverse(); // Keep reversed for display
    
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
    const totalPages = Math.ceil(pCurrentData.length / pRowsPerPage);
    
    if (totalPages === 0) {
        $("#tableRows").innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">কোন রিপোর্ট পাওয়া যায়নি</td></tr>';
        $("#paginationControls").classList.add("hidden");
        $("#endMessage")?.classList.remove("hidden");
        return;
    }
    
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">কোন রিপোর্ট পাওয়া যায়নি</td></tr>';
        return;
    }
    
    const html = data.map((d, index) => {
        const displayIndex = pDisplayedCount - data.length + index + 1;
        return `
        <tr class="fade-in" data-serial="${d.serial}">
            <td><span class="sn-badge">${d.serial}</span></td>
            <td>
                <div class="table-date-cell">
                    <span>${formatDate(d.date)}</span>
                    <div class="table-time-row">
                        <i class="far fa-clock"></i><span class="time-text">${format12hr(d.time)}</span>
                    </div>
                </div>
            </td>
            <td class="fw-800">${d.branch}</td>
            <td class="fw-800">${d.central}</td>
            <td>
                <button class="table-action-btn action-menu-trigger" data-serial="${d.serial}" data-type="course">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </td>
        </tr>`;
    }).join("");
    
    append ? tbody.insertAdjacentHTML("beforeend", html) : tbody.innerHTML = html;
    
    // Add event listeners for action buttons
    tbody.querySelectorAll('.action-menu-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showActionMenu(e.target.closest('button'), 'course');
        });
    });
}

function renderPaginationControls() {
    const container = $("#paginationControls");
    if (!container) return;
    
    const totalPages = Math.ceil(pCurrentData.length / pRowsPerPage);
    if (totalPages <= 1) { 
        container.innerHTML = ""; 
        container.classList.add("hidden");
        return; 
    }
    
    container.classList.remove("hidden");
    
    let html = `<button class="page-num-btn" onclick="renderPage(${pCurrentPage - 1})" ${pCurrentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    for (let i = 1; i <= totalPages; i++) {
         if (i === 1 || i === totalPages || (i >= pCurrentPage - 1 && i <= pCurrentPage + 1)) {
            html += `<button class="page-num-btn ${i === pCurrentPage ? 'active' : ''}" onclick="renderPage(${i})">${i}</button>`;
        } else if ((i === pCurrentPage - 2 && pCurrentPage > 3) || (i === pCurrentPage + 2 && pCurrentPage < totalPages - 2)) {
            if (!html.endsWith('...')) html += `<span class="pagination-dots">...</span>`;
        }
    }
    
    html += `<button class="page-num-btn" onclick="renderPage(${pCurrentPage + 1})" ${pCurrentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
    </button>`;
    container.innerHTML = html;
}

window.setPaginationMode = (mode) => {
    if (pMode === mode) return;
    pMode = mode;
    localStorage.setItem("pMode", mode);
    updateTable(pCurrentData);
    
    $$(".p-btn").forEach(b => {
        const isClickedMode = b.getAttribute("onclick").includes(mode);
        b.classList.toggle("active", isClickedMode);
    });
};

window.handleRowsChange = (val) => {
    pRowsPerPage = parseInt(val);
    localStorage.setItem("pRowsPerPage", pRowsPerPage);
    pDisplayedCount = 0;
    updateTable(pCurrentData);
};

// ---- ( Subject Table ) ----
function updateSubjectTable(data) {
    subjectPCurrentData = [...data]; // Don't reverse for subject table
    
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
    const totalPages = Math.ceil(subjectPCurrentData.length / subjectPRowsPerPage);
    
    if (totalPages === 0) {
        $("#subjectTableRows").innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">কোন রিপোর্ট পাওয়া যায়নি</td></tr>';
        $("#subjectPaginationControls").classList.add("hidden");
        $("#subjectEndMessage")?.classList.remove("hidden");
        return;
    }
    
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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">কোন রিপোর্ট পাওয়া যায়নি</td></tr>';
        return;
    }
    
    const html = data.map((d, index) => {
        const displayIndex = subjectPDisplayedCount - data.length + index + 1;
        const percentage = d.obtained_marks !== null ? ((d.obtained_marks / d.total_marks) * 100).toFixed(1) : null;
        const gpa = d.obtained_marks !== null ? calculateSubjectGPA(d.obtained_marks, d.total_marks) : null;
        
        return `
        <tr class="fade-in" data-serial="${d.serial}">
            <td><span class="sn-badge">${displayIndex}</span></td>
            <td class="subject-table-cell">
                <div class="subject-name">${d.subject}</div>
                <div class="subject-syllabus" title="${d.syllabus}">${d.syllabus || 'সিলেবাস নেই'}</div>
            </td>
            <td>${formatDate(d.date)}</td>
            <td>
                <div class="marks-with-gpa">
                    <div class="marks-value">
                        ${d.obtained_marks !== null ? d.obtained_marks : '-'} / ${d.total_marks}
                    </div>
                    ${percentage !== null ? `
                    <div class="gpa-value">
                        ${percentage}% <span class="gpa-dot">•</span> GPA: ${gpa}
                    </div>` : ''}
                </div>
            </td>
            <td>${d.branch_merit !== null ? d.branch_merit : '-'}</td>
            <td>${d.central_merit !== null ? d.central_merit : '-'}</td>
            <td>
                <button class="table-action-btn action-menu-trigger" data-serial="${d.serial}" data-type="subject">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </td>
        </tr>`;
    }).join("");
    
    if (append) {
        tbody.insertAdjacentHTML("beforeend", html);
    } else {
        tbody.innerHTML = html;
    }
    
    // Add event listeners for action buttons
    tbody.querySelectorAll('.action-menu-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showActionMenu(e.target.closest('button'), 'subject');
        });
    });
}

function calculateSubjectGPA(obtained, total) {
    if (obtained === null || total === 0) return 0;
    const percentage = (obtained / total) * 100;
    
    if (percentage >= 80) return '5.0';
    else if (percentage >= 70) return '4.0';
    else if (percentage >= 60) return '3.5';
    else if (percentage >= 50) return '3.0';
    else if (percentage >= 40) return '2.0';
    else if (percentage >= 33) return '1.0';
    else return '0.0';
}

function renderSubjectPaginationControls() {
    const container = $("#subjectPaginationControls");
    if (!container) return;
    
    const totalPages = Math.ceil(subjectPCurrentData.length / subjectPRowsPerPage);
    if (totalPages <= 1) { 
        container.innerHTML = ""; 
        container.classList.add("hidden");
        return; 
    }
    
    container.classList.remove("hidden");
    
    let html = `<button class="page-num-btn" onclick="renderSubjectPage(${subjectPCurrentPage - 1})" ${subjectPCurrentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= subjectPCurrentPage - 1 && i <= subjectPCurrentPage + 1)) {
            html += `<button class="page-num-btn ${i === subjectPCurrentPage ? 'active' : ''}" onclick="renderSubjectPage(${i})">${i}</button>`;
        } else if ((i === subjectPCurrentPage - 2 && subjectPCurrentPage > 3) || (i === subjectPCurrentPage + 2 && subjectPCurrentPage < totalPages - 2)) {
            if (!html.endsWith('...')) html += `<span class="pagination-dots">...</span>`;
        }
    }
    
    html += `<button class="page-num-btn" onclick="renderSubjectPage(${subjectPCurrentPage + 1})" ${subjectPCurrentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
    </button>`;
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
    
    subjectPDisplayedCount = 0;
    updateSubjectTable(subjectPCurrentData);
};

window.handleSubjectRowsChange = (val) => {
    subjectPRowsPerPage = parseInt(val);
    localStorage.setItem("subjectPRowsPerPage", subjectPRowsPerPage);
    subjectPDisplayedCount = 0;
    updateSubjectTable(subjectPCurrentData);
};

/* ==========================
🔔 Section: 09 Notifications - ENHANCED
========================== */

async function requestNotifPermission() {
    if ("Notification" in window && Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            showToast("নোটিফিকেশন অন করা হয়েছে", "success");
        }
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
        sendNotification(currentTime);
    }
}

function sendNotification(time) {
    const time12hr = format12hr(time);
    const title = "আজকের কোর্স মেরিট যোগ করুন";
    const body = `${time12hr} সময় হয়ে গেছে, আপনার আজকের ডাটাগুলো দ্রুত আপডেট করুন!`;
    const icon = "./images/UFMT.png";
    
    if (Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: icon,
            tag: 'fmt-reminder',
            requireInteraction: true
        });
    } else {
        // Fallback to toast notification
        showToast(`⏰ রিমাইন্ডার: ${body}`);
    }
}

function renderReminders() {
    const list = $('#notifList');
    if (!list) return;
    
    if (notifTimes.length === 0) {
        list.innerHTML = '<p class="empty-msg">কোন রিমাইন্ডার সেট করা নেই</p>';
        return;
    }
    
    list.innerHTML = notifTimes.sort().map((t, i) => `
        <div class="rem-item"> 
            <span class="rem-time"><i class="far fa-clock"></i> ${format12hr(t)}</span> 
            <button onclick="confirmDelRem(${i})" class="del-rem"><i class="fas fa-trash-can"></i></button> 
        </div>`).join('');
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
🛠️ Section: 10 Modals & Reset - ENHANCED
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
                <label>নিশ্চিত করতে বড় হাতের অক্ষরে "RESET" লিখন</label>
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
📤 Section: 11 Export Functions - ENHANCED
========================== */

function initExportFunctions() {
    // Safe null checks before adding event listeners
    const exportExcelBtn = $('#exportExcel');
    const exportPDFBtn = $('#exportPDF');
    const exportPrintBtn = $('#exportPrint');
    
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportToPDF);
    if (exportPrintBtn) exportPrintBtn.addEventListener('click', printData);
    
    // Chart download buttons
    $$('.download-chart-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const chartId = this.getAttribute('data-chart');
            downloadChart(chartId);
        });
    });
    
    // Settings toggles
    const showMarksCheckbox = $('#showOnlyWithMarks');
    const fourthSubjectCheckbox = $('#includeFourthSubject');
    const fourthSubjectSelect = $('#fourthSubjectSelect');
    const autoRefreshToggle = $('#autoRefreshToggle');
    const autoLockToggle = $('#autoLockToggle');
    
    if (showMarksCheckbox) {
        showMarksCheckbox.checked = showOnlyWithMarks;
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
            fourthSubject = e.target.value;
            localStorage.setItem(LS_FOURTH_SUBJECT, fourthSubject);
            renderSubjectDashboard();
            showToast('৪র্থ বিষয় সেভ করা হয়েছে');
        });
    }
    
    if (autoRefreshToggle) {
        autoRefreshToggle.checked = autoRefreshEnabled;
        autoRefreshToggle.addEventListener('change', function(e) {
            autoRefreshEnabled = e.target.checked;
            localStorage.setItem(LS_AUTO_REFRESH, autoRefreshEnabled);
            if (autoRefreshEnabled) {
                startAutoRefresh();
                showToast('অটো রিফ্রেশ চালু করা হয়েছে');
            } else {
                stopAutoRefresh();
                showToast('অটো রিফ্রেশ বন্ধ করা হয়েছে');
            }
        });
    }
    
    if (autoLockToggle) {
        autoLockToggle.checked = autoLockEnabled;
        autoLockToggle.addEventListener('change', function(e) {
            autoLockEnabled = e.target.checked;
            localStorage.setItem(LS_AUTO_LOCK, autoLockEnabled);
            if (autoLockEnabled) {
                startInactivityTimer();
                showToast('অটো লক চালু করা হয়েছে');
            } else {
                stopInactivityTimer();
                showToast('অটো লক বন্ধ করা হয়েছে');
            }
        });
    }
    
    updateFourthSubjectContainer();
    
    const userManualBtn = $('#userManualBtn');
    if (userManualBtn) userManualBtn.addEventListener('click', showUserManual);
}

function updateFourthSubjectContainer() {
    const container = $('#fourthSubjectContainer');
    if (container) {
        container.style.display = includeFourthSubject ? 'flex' : 'none';
    }
}

async function exportToExcel() {
    const dataType = $('#exportDataType').value;
    let data, headers, filename;
    
    if (dataType === 'course' || dataType === 'all') {
        data = allEntries || [];
        headers = ['ক্রমিক', 'তারিখ', 'সময়', 'ব্রাঞ্চ মেরিট', 'কেন্দ্রীয় মেরিট'];
        const rows = data.map(d => [d.serial, formatDate(d.date), format12hr(d.time), d.branch, d.central]);
        
        if (dataType === 'course') {
            exportCSV(headers, rows, 'course_data.csv');
            return;
        }
    }
    
    if (dataType === 'subject' || dataType === 'all') {
        data = subjectData || [];
        headers = ['ক্রমিক', 'তারিখ', 'বিষয়', 'সিলেবাস', 'মোট নম্বর', 'প্রাপ্ত নম্বর', 'শতকরা', 'ব্রাঞ্চ মেরিট', 'কেন্দ্রীয় মেরিট'];
        const rows = data.map(d => [
            d.serial, 
            formatDate(d.date), 
            d.subject, 
            d.syllabus, 
            d.total_marks, 
            d.obtained_marks || '', 
            d.obtained_marks !== null ? ((d.obtained_marks / d.total_marks) * 100).toFixed(1) + '%' : '',
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
        // Export both
        exportCSV(headers, rows, 'fmt_tracker_all_data.csv');
    }
}

function exportCSV(headers, rows, filename) {
    // Add BOM for UTF-8
    const BOM = "\uFEFF";
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
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
    const doc = new jsPDF('p', 'mm', 'a4');
    const dataType = $('#exportDataType').value;
    
    // Set font for Bangla support
    doc.setFont('helvetica');
    doc.setFontSize(16);
    
    // Title
    doc.text('Udvash FMT Tracker - Report', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`রিপোর্ট তারিখ: ${new Date().toLocaleDateString('bn-BD')}`, 105, 28, { align: 'center' });
    doc.text(`ডাটা টাইপ: ${dataType === 'course' ? 'কোর্স মেরিট' : dataType === 'subject' ? 'বিষয়ভিত্তিক' : 'সব ডাটা'}`, 105, 34, { align: 'center' });
    
    if (dataType === 'course') {
        const data = allEntries || [];
        const headers = [['ক্রমিক', 'তারিখ', 'সময়', 'ব্রাঞ্চ', 'কেন্দ্রীয়']];
        const rows = data.map(d => [d.serial, formatDate(d.date), format12hr(d.time), d.branch, d.central]);
        
        doc.autoTable({
            head: headers,
            body: rows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241], textColor: 255 },
            styles: { font: 'helvetica', fontSize: 9 },
            margin: { left: 10, right: 10 }
        });
    } else if (dataType === 'subject') {
        const data = subjectData || [];
        const headers = [['ক্রমিক', 'তারিখ', 'বিষয়', 'নম্বর', 'ব্রাঞ্চ', 'কেন্দ্রীয়']];
        const rows = data.map(d => [
            d.serial, 
            formatDate(d.date), 
            d.subject.substring(0, 15),
            d.obtained_marks !== null ? `${d.obtained_marks}/${d.total_marks}` : '-/-',
            d.branch_merit || '-',
            d.central_merit || '-'
        ]);
        
        doc.autoTable({
            head: headers,
            body: rows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241], textColor: 255 },
            styles: { font: 'helvetica', fontSize: 8 },
            margin: { left: 10, right: 10 }
        });
    }
    
    // Footer with developer info and page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`পৃষ্ঠা ${i}/${pageCount}`, 105, doc.internal.pageSize.height - 15, { align: 'center' });
        doc.text('ডেভেলপার: Muhtasim Rahman (Turzo) - https://mdturzo.odoo.com', 105, doc.internal.pageSize.height - 10, { align: 'center' });
    }
    
    doc.save(`fmt_tracker_${dataType}_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('পিডিএফ ডাউনলোড করা হয়েছে', 'success');
}

function printData() {
    const dataType = $('#exportDataType').value;
    let printContent = '';
    
    printContent += `
        <!DOCTYPE html>
        <html lang="bn">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Udvash FMT Tracker - Print</title>
            <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                @media print {
                    @page { margin: 15mm; }
                    body { margin: 0; font-family: 'Hind Siliguri', sans-serif; }
                    .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
                    .print-header h1 { color: #6366f1; margin: 0 0 5px 0; font-size: 24px; }
                    .print-meta { color: #666; font-size: 14px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #6366f1; color: white; padding: 10px; text-align: left; font-weight: 600; }
                    td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .print-footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666; }
                    .developer-info { display: flex; justify-content: space-between; margin-top: 5px; }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>Udvash FMT Tracker</h1>
                <div class="print-meta">
                    রিপোর্ট তারিখ: ${new Date().toLocaleDateString('bn-BD')}<br>
                    ডাটা টাইপ: ${dataType === 'course' ? 'কোর্স মেরিট' : dataType === 'subject' ? 'বিষয়ভিত্তিক' : 'সব ডাটা'}
                </div>
            </div>
    `;
    
    if (dataType === 'course') {
        const data = allEntries || [];
        printContent += `
            <table>
                <thead>
                    <tr>
                        <th>ক্রমিক</th>
                        <th>তারিখ</th>
                        <th>সময়</th>
                        <th>ব্রাঞ্চ</th>
                        <th>কেন্দ্রীয়</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(d => {
            printContent += `
                <tr>
                    <td style="text-align: center;">${d.serial}</td>
                    <td>${formatDate(d.date)}</td>
                    <td>${format12hr(d.time)}</td>
                    <td style="text-align: center;">${d.branch}</td>
                    <td style="text-align: center;">${d.central}</td>
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
            <table>
                <thead>
                    <tr>
                        <th>ক্রমিক</th>
                        <th>তারিখ</th>
                        <th>বিষয়</th>
                        <th>নম্বর</th>
                        <th>ব্রাঞ্চ</th>
                        <th>কেন্দ্রীয়</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(d => {
            printContent += `
                <tr>
                    <td style="text-align: center;">${d.serial}</td>
                    <td>${formatDate(d.date)}</td>
                    <td>${d.subject}</td>
                    <td style="text-align: center;">${d.obtained_marks !== null ? `${d.obtained_marks}/${d.total_marks}` : '-/-'}</td>
                    <td style="text-align: center;">${d.branch_merit || '-'}</td>
                    <td style="text-align: center;">${d.central_merit || '-'}</td>
                </tr>
            `;
        });
        
        printContent += `
                </tbody>
            </table>
        `;
    }
    
    printContent += `
            <div class="print-footer">
                <div>Udvash FMT Tracker Pro V19.0</div>
                <div class="developer-info">
                    <div>ডেভেলপার: Muhtasim Rahman (Turzo)</div>
                    <div>ওয়েবসাইট: https://mdturzo.odoo.com</div>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

function downloadChart(chartId) {
    const chartMap = {
        'branchChart': branchChart,
        'centralChart': centralChart,
        'subjectMarksChart': subjectChart,
        'subjectBranchChart': subjectBranchChart,
        'subjectCentralChart': subjectCentralChart
    };
    
    const chart = chartMap[chartId];
    if (!chart) return;
    
    const canvas = chart.canvas;
    const link = document.createElement('a');
    link.download = `chart_${chartId}_${new Date().getTime()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    showToast('চার্ট ডাউনলোড করা হয়েছে', 'success');
}

function showUserManual() {
    openModal(`
        <div class="reset-top-banner">
            <div class="reset-icon-anim"><i class="fas fa-book"></i></div>
            <h3>ব্যবহার নির্দেশিকা</h3>
        </div>
        <div class="reset-body">
            <div class="manual-content">
                <h4>🌐 FMT Tracker Pro V19 - ব্যবহার নির্দেশিকা</h4>
                
                <div class="manual-section">
                    <h5><i class="fas fa-lock"></i> সিকিউরিটি সিস্টেম</h5>
                    <ul>
                        <li>ডিফল্ট পিন: <strong>000000</strong></li>
                        <li>৬ ডিজিটের পিন ব্যবহার করুন</li>
                        <li>অটো ভেরিফাই চালু থাকলে পিন পূর্ণ হলে অটো লগইন হবে</li>
                    </ul>
                </div>
                
                <div class="manual-section">
                    <h5><i class="fas fa-layer-group"></i> দুটি মোড</h5>
                    <ul>
                        <li><strong>কোর্স মেরিট:</strong> পরীক্ষার মেরিট পজিশন ট্র্যাকিং</li>
                        <li><strong>বিষয়ভিত্তিক:</strong> প্রতিটি বিষয়ের নম্বর ও মেরিট ট্র্যাকিং</li>
                    </ul>
                </div>
                
                <div class="manual-section">
                    <h5><i class="fas fa-pen-to-square"></i> ডাটা এন্ট্রি</h5>
                    <ul>
                        <li>কোর্স মেরিট: ব্রাঞ্চ ও সেন্ট্রাল মেরিট ইনপুট দিন</li>
                        <li>বিষয়ভিত্তিক: বিষয় সিলেক্ট করে নম্বর ও মেরিট দিন</li>
                        <li>দশমিক সংখ্যা ব্যবহার করতে পারেন (বিষয় নম্বরের জন্য)</li>
                    </ul>
                </div>
                
                <div class="manual-section">
                    <h5><i class="fas fa-filter"></i> ফিল্টার সিস্টেম</h5>
                    <ul>
                        <li>বছর, মাস, তারিখ রেঞ্জ দিয়ে ফিল্টার করুন</li>
                        <li>স্মার্ট ফিল্টার: সর্বোচ্চ নম্বর, সেরা র‍্যাংক ইত্যাদি</li>
                        <li>বিষয় অনুযায়ী আলাদা ফিল্টার</li>
                    </ul>
                </div>
                
                <div class="manual-section">
                    <h5><i class="fas fa-chart-line"></i> বিশ্লেষণ</h5>
                    <ul>
                        <li>গ্রাফে সময়ের সাথে মেরিটের পরিবর্তন দেখুন</li>
                        <li>বিষয়ভিত্তিক নম্বর ও মেরিটের গ্রাফ</li>
                        <li>সারসংক্ষেপ: সেরা পারফরম্যান্স, গড় নম্বর, GPA</li>
                    </ul>
                </div>
                
                <div class="manual-section">
                    <h5><i class="fas fa-cog"></i> সেটিংস</h5>
                    <ul>
                        <li>থিম পরিবর্তন: লাইট/ডার্ক মোড</li>
                        <li>রিমাইন্ডার: নির্দিষ্ট সময়ে নোটিফিকেশন</li>
                        <li>এক্সপোর্ট: PDF, Excel, Print</li>
                        <li>৪র্থ বিষয় সেটিং: GPA গণনায় অন্তর্ভুক্ত করুন</li>
                    </ul>
                </div>
                
                <div class="manual-section">
                    <h5><i class="fas fa-mobile-alt"></i> মোবাইল অ্যাপ</h5>
                    <ul>
                        <li>PWA সমর্থিত - হোম স্ক্রিনে অ্যাপ যোগ করুন</li>
                        <li>অফলাইন কাজ করে (ক্যাশে ডাটা)</li>
                        <li>নোটিফিকেশন সমর্থিত</li>
                    </ul>
                </div>
                
                <div class="manual-tips">
                    <h5><i class="fas fa-lightbulb"></i> গুরুত্বপূর্ণ টিপস</h5>
                    <ul>
                        <li>নিয়মিত ডাটা আপডেট করুন</li>
                        <li>ফিল্টার ব্যবহার করে নির্দিষ্ট ডাটা দেখুন</li>
                        <li>গ্রাফ ডাউনলোড করে সংরক্ষণ করুন</li>
                        <li>অটো লক: ২ মিনিট ইনঅ্যাকটিভ থাকলে লক হবে</li>
                        <li>অটো রিফ্রেশ: ১০ মিনিট পর পর ডাটা আপডেট</li>
                    </ul>
                </div>
                
                <div class="manual-contact">
                    <p><strong>ডেভেলপার:</strong> Muhtasim Rahman (Turzo)</p>
                    <p><strong>ওয়েবসাইট:</strong> <a href="https://mdturzo.odoo.com" target="_blank">https://mdturzo.odoo.com</a></p>
                    <p><strong>GitHub:</strong> <a href="https://github.com/muhtasim-rahman/UFMT-SSC26" target="_blank">প্রোজেক্ট রিপোজিটরি</a></p>
                </div>
            </div>
            
            <div class="reset-footer">
                <button class="btn-reset-cancel" onclick="closeModal()">ঠিক আছে</button>
            </div>
        </div>
    `);
}

/* ==========================
⚙️ Section: 12 V19 New Features
========================== */

// ---- ( Auto-refresh System ) ----
function startAutoRefresh() {
    if (!autoRefreshEnabled) return;
    
    // Clear existing timer
    if (refreshTimer) clearInterval(refreshTimer);
    
    // Refresh every 10 minutes (600000 ms)
    refreshTimer = setInterval(() => {
        if (navigator.onLine) {
            fetchAllData();
            updateDateDisplay();
            showToast('ডাটা অটো রিফ্রেশ করা হয়েছে', 'success');
        }
    }, 600000); // 10 minutes
    
    // Also refresh at midnight
    scheduleMidnightRefresh();
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

function scheduleMidnightRefresh() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timeToMidnight = midnight - now;
    
    setTimeout(() => {
        fetchAllData();
        updateDateDisplay();
        scheduleMidnightRefresh(); // Schedule next midnight
    }, timeToMidnight);
}

// ---- ( Inactivity Timer ) ----
function startInactivityTimer() {
    if (!autoLockEnabled) return;
    
    // Clear existing timer
    if (inactivityTimer) clearInterval(inactivityTimer);
    
    // Reset activity time on user interaction
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('scroll', resetInactivityTimer);
    document.addEventListener('touchstart', resetInactivityTimer);
    
    // Check every minute
    inactivityTimer = setInterval(() => {
        const now = Date.now();
        const inactiveTime = now - lastActivityTime;
        
        if (inactiveTime > 120000) { // 2 minutes
            triggerAutoLock();
        }
    }, 60000); // Check every minute
}

function stopInactivityTimer() {
    if (inactivityTimer) {
        clearInterval(inactivityTimer);
        inactivityTimer = null;
    }
}

function resetInactivityTimer() {
    lastActivityTime = Date.now();
}

function triggerAutoLock() {
    if (!$('#app').classList.contains('hidden')) {
        showToast('২ মিনিট ইনঅ্যাকটিভ থাকায় লক করা হয়েছে', 'warning');
        $('#app').classList.add('hidden');
        $('#pinGate').classList.remove('hidden');
        $('#pinInput').value = '';
        renderPinDots('');
        stopInactivityTimer();
    }
}

// ---- ( Table Row Actions ) ----
function showActionMenu(button, type) {
    // Hide any existing menu
    $('#actionMenu').classList.add('hidden');
    
    // Set current edit data
    currentEditType = type;
    currentEditRow = parseInt(button.getAttribute('data-serial'));
    
    // Position the menu
    const rect = button.getBoundingClientRect();
    const menu = $('#actionMenu');
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left}px`;
    menu.classList.remove('hidden');
    
    // Close menu when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', closeActionMenu);
    }, 100);
}

function closeActionMenu(e) {
    if (e && e.target.closest('#actionMenu')) return;
    
    $('#actionMenu').classList.add('hidden');
    document.removeEventListener('click', closeActionMenu);
}

// Handle action menu clicks
document.addEventListener('click', function(e) {
    if (e.target.closest('.action-menu-item')) {
        const action = e.target.closest('.action-menu-item').getAttribute('data-action');
        handleTableAction(action);
        closeActionMenu();
    }
});

function handleTableAction(action) {
    if (!currentEditRow || !currentEditType) return;
    
    switch(action) {
        case 'edit':
            showEditModal(currentEditType, currentEditRow);
            break;
        case 'delete':
            showDeleteConfirm(currentEditType, currentEditRow);
            break;
        case 'cancel':
            // Do nothing
            break;
    }
}

function showEditModal(type, serial) {
    if (type === 'course') {
        const entry = allEntries.find(e => e.serial === serial);
        if (!entry) return;
        
        const modalContent = `
            <h4>কোর্স ডাটা সম্পাদনা</h4>
            <p style="margin-bottom: 15px; color: var(--text-muted);">R-${serial}: ${formatDate(entry.date)} ${format12hr(entry.time)}</p>
            
            <div class="form-row">
                <div class="input-container">
                    <label>ব্রাঞ্চ মেরিট</label>
                    <input type="number" id="editBranch" value="${entry.branch}" min="1">
                </div>
                <div class="input-container">
                    <label>সেন্ট্রাল মেরিট</label>
                    <input type="number" id="editCentral" value="${entry.central}" min="1">
                </div>
            </div>
            
            <div class="form-row">
                <div class="input-container">
                    <label>তারিখ</label>
                    <input type="date" id="editDate" value="${entry.date}">
                </div>
                <div class="input-container">
                    <label>সময়</label>
                    <input type="time" id="editTime" value="${entry.time}">
                </div>
            </div>
        `;
        
        $('#editModalTitle').textContent = 'কোর্স ডাটা সম্পাদনা';
        $('#editModalBody').innerHTML = modalContent;
        $('#editModal').classList.remove('hidden');
        
        // Set up save handler
        $('.save-edit').onclick = () => saveCourseEdit(serial);
        
    } else if (type === 'subject') {
        const subject = subjectData.find(s => s.serial === serial);
        if (!subject) return;
        
        const modalContent = `
            <h4>বিষয় ডাটা সম্পাদনা</h4>
            <p style="margin-bottom: 15px; color: var(--text-muted);">${subject.subject} (${formatDate(subject.date)})</p>
            
            <div class="form-row">
                <div class="input-container">
                    <label>প্রাপ্ত নম্বর</label>
                    <input type="number" id="editObtained" value="${subject.obtained_marks || ''}" step="0.01" min="0">
                </div>
                <div class="input-container">
                    <label>মোট নম্বর</label>
                    <input type="number" id="editTotal" value="${subject.total_marks}" min="1">
                </div>
            </div>
            
            <div class="form-row">
                <div class="input-container">
                    <label>ব্রাঞ্চ মেরিট</label>
                    <input type="number" id="editSubjectBranch" value="${subject.branch_merit || ''}" min="1">
                </div>
                <div class="input-container">
                    <label>কেন্দ্রীয় মেরিট</label>
                    <input type="number" id="editSubjectCentral" value="${subject.central_merit || ''}" min="1">
                </div>
            </div>
        `;
        
        $('#editModalTitle').textContent = 'বিষয় ডাটা সম্পাদনা';
        $('#editModalBody').innerHTML = modalContent;
        $('#editModal').classList.remove('hidden');
        
        // Set up save handler
        $('.save-edit').onclick = () => saveSubjectEdit(serial);
    }
}

async function saveCourseEdit(serial) {
    const branch = $('#editBranch').value;
    const central = $('#editCentral').value;
    const date = $('#editDate').value;
    const time = $('#editTime').value;
    
    if (!branch || !central || !date || !time) {
        showToast('সমস্ত তথ্য পূরণ করুন', 'error');
        return;
    }
    
    const payload = {
        type: 'update_course',
        serial: serial,
        branch: branch,
        central: central,
        date: date,
        time: time
    };
    
    try {
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast('ডাটা সফলভাবে আপডেট হয়েছে', 'success');
            $('#editModal').classList.add('hidden');
            await fetchAllData();
            
            // Show confirmation
            openModal(`
                <div style="padding:25px; text-align:center;">
                    <i class="fas fa-check-circle" style="font-size:30px; color:#10b981; margin-bottom:15px;"></i>
                    <h3 style="margin:0 0 10px;">আপডেট সফল!</h3>
                    <p style="font-size:13px; color:#64748b; margin-bottom:20px;">
                        R-${serial} এর ডাটা সফলভাবে আপডেট করা হয়েছে।<br>
                        ব্রাঞ্চ: ${branch}, সেন্ট্রাল: ${central}<br>
                        তারিখ: ${formatDate(date)}, সময়: ${format12hr(time)}
                    </p>
                    <button class="btn-reset-confirm" onclick="closeModal()">ঠিক আছে</button>
                </div>
            `);
        } else {
            showToast('আপডেট ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('নেটওয়ার্ক ত্রুটি', 'error');
    }
}

async function saveSubjectEdit(serial) {
    const obtained = $('#editObtained').value;
    const total = $('#editTotal').value;
    const branch = $('#editSubjectBranch').value;
    const central = $('#editSubjectCentral').value;
    
    if (!total) {
        showToast('মোট নম্বর পূরণ করুন', 'error');
        return;
    }
    
    const payload = {
        type: 'update_subject',
        serial: serial,
        my_marks: obtained || "",
        total: total,
        branch: branch || "",
        central: central || ""
    };
    
    try {
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast('বিষয় ডাটা সফলভাবে আপডেট হয়েছে', 'success');
            $('#editModal').classList.add('hidden');
            await fetchAllData();
            
            // Show confirmation
            openModal(`
                <div style="padding:25px; text-align:center;">
                    <i class="fas fa-check-circle" style="font-size:30px; color:#10b981; margin-bottom:15px;"></i>
                    <h3 style="margin:0 0 10px;">আপডেট সফল!</h3>
                    <p style="font-size:13px; color:#64748b; margin-bottom:20px;">
                        সিরিয়াল ${serial} এর ডাটা সফলভাবে আপডেট করা হয়েছে।<br>
                        প্রাপ্ত নম্বর: ${obtained || 'N/A'}, মোট নম্বর: ${total}<br>
                        ব্রাঞ্চ: ${branch || 'N/A'}, সেন্ট্রাল: ${central || 'N/A'}
                    </p>
                    <button class="btn-reset-confirm" onclick="closeModal()">ঠিক আছে</button>
                </div>
            `);
        } else {
            showToast('আপডেট ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('নেটওয়ার্ক ত্রুটি', 'error');
    }
}

function showDeleteConfirm(type, serial) {
    if (type === 'course') {
        openModal(`
            <div style="padding:25px; text-align:center;">
                <i class="fas fa-trash-alt" style="font-size:30px; color:#ef4444; margin-bottom:15px;"></i>
                <h3 style="margin:0 0 10px;">ডিলিট নিশ্চিত করুন</h3>
                <p style="font-size:13px; color:#64748b; margin-bottom:20px;">
                    আপনি কি R-${serial} এর সম্পূর্ণ রোড ডিলিট করতে চান?<br>
                    এই কাজটি রিভার্স করা যাবে না।
                </p>
                <div class="reset-footer">
                    <button class="btn-reset-cancel" onclick="closeModal()">না</button>
                    <button class="btn-reset-confirm" style="background:#ef4444;" onclick="deleteCourseEntry(${serial})">হ্যাঁ, ডিলিট করুন</button>
                </div>
            </div>
        `);
    } else if (type === 'subject') {
        openModal(`
            <div style="padding:25px; text-align:center;">
                <i class="fas fa-trash-alt" style="font-size:30px; color:#ef4444; margin-bottom:15px;"></i>
                <h3 style="margin:0 0 10px;">ডাটা ক্লিয়ার করুন</h3>
                <p style="font-size:13px; color:#64748b; margin-bottom:20px;">
                    আপনি কি সিরিয়াল ${serial} এর নম্বর ও মেরিট ডাটা ক্লিয়ার করতে চান?<br>
                    শুধুমাত্র প্রাপ্ত নম্বর, ব্রাঞ্চ ও সেন্ট্রাল মেরিট ক্লিয়ার হবে।
                </p>
                <div class="reset-footer">
                    <button class="btn-reset-cancel" onclick="closeModal()">না</button>
                    <button class="btn-reset-confirm" style="background:#ef4444;" onclick="clearSubjectData(${serial})">হ্যাঁ, ক্লিয়ার করুন</button>
                </div>
            </div>
        `);
    }
}

async function deleteCourseEntry(serial) {
    try {
        const payload = {
            type: 'delete_course',
            serial: serial
        };
        
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast('রোড সফলভাবে ডিলিট হয়েছে', 'success');
            closeModal();
            await fetchAllData();
        } else {
            showToast('ডিলিট ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('নেটওয়ার্ক ত্রুটি', 'error');
    }
}

async function clearSubjectData(serial) {
    try {
        const payload = {
            type: 'update_subject',
            serial: serial,
            my_marks: "",
            branch: "",
            central: ""
        };
        
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast('ডাটা সফলভাবে ক্লিয়ার হয়েছে', 'success');
            closeModal();
            await fetchAllData();
        } else {
            showToast('ক্লিয়ার ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('নেটওয়ার্ক ত্রুটি', 'error');
    }
}

// Close edit modal handlers
$('.close-edit-modal').addEventListener('click', () => {
    $('#editModal').classList.add('hidden');
});

$('.cancel-edit').addEventListener('click', () => {
    $('#editModal').classList.add('hidden');
});

/* ==========================
⚙️ Section: 13 Events & Init - ENHANCED
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
        resetInactivityTimer();
    });
    
    const pinInput = $("#pinInput");
    if (pinInput) pinInput.addEventListener("input", e => handlePinInput(e.target.value));
    
    // 2. Global Keyboard
    document.addEventListener("keydown", (e) => {
        resetInactivityTimer();
        
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
        resetInactivityTimer();
    };
    
    if ($("#pinViewToggle")) $("#pinViewToggle").onchange = toggleLockPinView;

    const handleTheme = isDark => {
        document.body.classList.toggle("dark-theme", isDark);
        if ($("#darkToggleSet")) $("#darkToggleSet").checked = isDark;
        localStorage.setItem(LS_THEME, isDark ? "dark" : "light");
        resetInactivityTimer();
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
            
            updateViewTitle();
            resetInactivityTimer();
            
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
    if ($("#btnModeCourseHeader")) $("#btnModeCourseHeader").onclick = () => switchMode('course');
    if ($("#btnModeSubjectHeader")) $("#btnModeSubjectHeader").onclick = () => switchMode('subject');

    // 6. Filters
    if ($("#applyFilters")) $("#applyFilters").onclick = renderDashboard;
    if ($("#resetFilters")) $("#resetFilters").onclick = () => {
        $("#yearSelect").value = "";
        $("#monthSelect").value = "";
        $("#startDate").value = "";
        $("#endDate").value = "";
        $("#maxBranch").value = "";
        $("#maxCentral").value = "";
        renderDashboard();
        showToast("ফিল্টার রিসেট");
        resetInactivityTimer();
    };
    
    $("#refreshDataBtn").onclick = async () => { 
        await fetchAllData(); 
        showToast("ডাটা রিফ্রেশ করা হয়েছে", "success"); 
        resetInactivityTimer();
    };
    
    $("#saveEntry").onclick = submitEntry;

    // 7. Subject Events
    if ($("#subjectSelect")) $("#subjectSelect").addEventListener('change', updateSubjectInfoCard);
    if ($("#btnSaveSubject")) $("#btnSaveSubject").addEventListener('click', submitSubjectEntry);
    
    // Subject Filters
    if ($("#applySubjectFilters")) $("#applySubjectFilters").addEventListener('click', () => {
        renderSubjectDashboard();
        resetInactivityTimer();
    });
    
    if ($("#resetSubjectFilters")) $("#resetSubjectFilters").addEventListener('click', () => {
        $("#subjectFilter").value = "";
        $("#smartFilter").value = "";
        $("#subjectYearSelect").value = "";
        $("#subjectMonthSelect").value = "";
        $("#minMarks").value = "";
        $("#subjectMaxBranch").value = "";
        renderSubjectDashboard();
        showToast('ফিল্টার রিসেট করা হয়েছে');
        resetInactivityTimer();
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
        resetInactivityTimer();
    };
    
    const nToggle = $('#notifEnableToggle');
    if (nToggle) {
        nToggle.checked = notifEnabled;
        nToggle.onchange = (e) => {
            notifEnabled = e.target.checked;
            localStorage.setItem(LS_NOTIF_STATUS, notifEnabled);
            showToast(notifEnabled ? "নোটিফিকেশন চালু" : "নোটিফিকেশন বন্ধ");
            if(notifEnabled) requestNotifPermission();
            resetInactivityTimer();
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
        resetInactivityTimer();
        
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

    // 12. Click anywhere to reset inactivity timer
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('touchstart', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
    document.addEventListener('scroll', resetInactivityTimer);
    document.addEventListener('mousemove', resetInactivityTimer);
}

// ---- ( App Entry Point ) ----
document.addEventListener("DOMContentLoaded", () => {
    // 1. Load Theme based on device preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem(LS_THEME);
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-theme');
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
    $('#currentModeText').textContent = appMode === 'course' ? 'কোর্স ভিত্তিক' : 'বিষয় ভিত্তিক';
    
    // 4. Initial Focus
    if (window.innerWidth > 992) $("#pinInput")?.focus();
    
    // 5. Init Pagination UI
    const rowSelector = $("#rowsPerPage");
    if (rowSelector) rowSelector.value = pRowsPerPage;
    $$(".p-btn").forEach(b => b.classList.toggle("active", b.getAttribute("onclick").includes(pMode)));
    
    // 6. Start notification checks
    setInterval(checkNotifications, 60000); // Check every minute
    
    // 7. Start auto-refresh and inactivity timer
    if (autoRefreshEnabled) startAutoRefresh();
    if (autoLockEnabled) startInactivityTimer();
    
    // 8. Update mode switcher in header
    const headerCourseBtn = $('#btnModeCourseHeader');
    const headerSubjectBtn = $('#btnModeSubjectHeader');
    if (headerCourseBtn && headerSubjectBtn) {
        headerCourseBtn.classList.toggle('active', appMode === 'course');
        headerSubjectBtn.classList.toggle('active', appMode === 'subject');
    }
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
🔧 Section: 14 Utility Functions
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
    const isStandalone = window.matchMedia('(display-mode: standalone').matches || window.navigator.standalone === true;

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