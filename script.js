"use strict";

const KEY = "davomat_v1";
const STATUS = { present: "Keldi", late: "Kechikdi", absent: "Kelmadi" };

// Holat: guruhlar, talabalar, davomat yozuvlari ("sana|talabaId" -> holat)
let state = JSON.parse(localStorage.getItem(KEY)) || {
  groups: ["101-guruh"],
  students: [],
  records: {}
};

const $ = (id) => document.getElementById(id);
const save = () => localStorage.setItem(KEY, JSON.stringify(state));

// Bugungi sanani o'rnatish
$("date").value = new Date().toISOString().slice(0, 10);

const currentGroup = () => $("groupSelect").value;
const currentDate = () => $("date").value;
const recKey = (studentId) => `${currentDate()}|${studentId}`;

function renderGroups() {
  const prev = currentGroup();
  const select = $("groupSelect");
  select.innerHTML = "";
  state.groups.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    select.appendChild(opt);
  });
  if (state.groups.includes(prev)) select.value = prev;
}

// Talabaning umumiy davomat foizi
function overallPercent(studentId) {
  const entries = Object.entries(state.records).filter(([k]) => k.endsWith("|" + studentId));
  if (!entries.length) return "—";
  const attended = entries.filter(([, v]) => v !== "absent").length;
  return Math.round((attended / entries.length) * 100) + "%";
}

function render() {
  const tbody = $("tbody");
  const q = $("search").value.trim().toLowerCase();
  const list = state.students.filter(
    (s) => s.group === currentGroup() && s.name.toLowerCase().includes(q)
  );

  tbody.innerHTML = "";
  $("empty").hidden = list.length > 0;

  list.forEach((s, i) => {
    const tr = document.createElement("tr");
    const status = state.records[recKey(s.id)];

    const tdNum = document.createElement("td");
    tdNum.textContent = i + 1;

    const tdName = document.createElement("td");
    tdName.textContent = s.name;

    const tdStatus = document.createElement("td");
    const grp = document.createElement("div");
    grp.className = "status-group";
    Object.entries(STATUS).forEach(([key, label]) => {
      const b = document.createElement("button");
      b.className = `status-btn ${key}` + (status === key ? " active" : "");
      b.textContent = label;
      b.onclick = () => setStatus(s.id, key);
      grp.appendChild(b);
    });
    tdStatus.appendChild(grp);

    const tdPct = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = overallPercent(s.id);
    tdPct.appendChild(badge);

    const tdDel = document.createElement("td");
    const del = document.createElement("button");
    del.className = "del-btn";
    del.title = "O'chirish";
    del.textContent = "🗑";
    del.onclick = () => deleteStudent(s.id);
    tdDel.appendChild(del);

    tr.append(tdNum, tdName, tdStatus, tdPct, tdDel);
    tbody.appendChild(tr);
  });

  renderStats();
}

function renderStats() {
  const students = state.students.filter((s) => s.group === currentGroup());
  let present = 0, late = 0, absent = 0;
  students.forEach((s) => {
    const st = state.records[recKey(s.id)];
    if (st === "present") present++;
    else if (st === "late") late++;
    else if (st === "absent") absent++;
  });
  const marked = present + late + absent;
  $("statPresent").textContent = present;
  $("statLate").textContent = late;
  $("statAbsent").textContent = absent;
  $("statPercent").textContent = marked ? Math.round(((present + late) / marked) * 100) + "%" : "0%";
}

function setStatus(studentId, status) {
  state.records[recKey(studentId)] = status;
  save();
  render();
}

function addGroup() {
  const name = $("newGroup").value.trim();
  if (!name) return alert("Guruh nomini kiriting!");
  if (state.groups.includes(name)) return alert("Bunday guruh mavjud!");
  state.groups.push(name);
  save();
  renderGroups();
  $("groupSelect").value = name;
  $("newGroup").value = "";
  render();
}

function addStudent() {
  const name = $("studentName").value.trim();
  if (!name) return alert("Talaba ismini kiriting!");
  state.students.push({ id: Date.now().toString(), name, group: currentGroup() });
  save();
  $("studentName").value = "";
  render();
}

function deleteStudent(id) {
  if (!confirm("Talabani o'chirishni tasdiqlaysizmi?")) return;
  state.students = state.students.filter((s) => s.id !== id);
  Object.keys(state.records).forEach((k) => {
    if (k.endsWith("|" + id)) delete state.records[k];
  });
  save();
  render();
}

function markAllPresent() {
  state.students
    .filter((s) => s.group === currentGroup())
    .forEach((s) => (state.records[recKey(s.id)] = "present"));
  save();
  render();
}

// CSV eksport (Excel ochadi, UTF-8 BOM bilan)
function exportCSV() {
  const rows = [["№", "F.I.Sh.", "Guruh", "Sana", "Holat"]];
  state.students
    .filter((s) => s.group === currentGroup())
    .forEach((s, i) => {
      const st = state.records[recKey(s.id)];
      rows.push([i + 1, s.name, s.group, currentDate(), st ? STATUS[st] : "Belgilanmagan"]);
    });
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `davomat_${currentGroup()}_${currentDate()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Hodisalar
$("addGroupBtn").onclick = addGroup;
$("addStudentBtn").onclick = addStudent;
$("markAllBtn").onclick = markAllPresent;
$("exportBtn").onclick = exportCSV;
$("groupSelect").onchange = render;
$("date").onchange = render;
$("search").oninput = render;
$("studentName").addEventListener("keydown", (e) => e.key === "Enter" && addStudent());
$("newGroup").addEventListener("keydown", (e) => e.key === "Enter" && addGroup());

renderGroups();
render();