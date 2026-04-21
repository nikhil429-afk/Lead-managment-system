import React, { useEffect, useRef, useState } from "react";
import styles from './admin.module.css'
import { useNavigate } from "react-router-dom";
import { LineChart, BarChart, Bar, CartesianGrid, Cell, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { LocalizationProvider } from '@mui/x-date-pickers-pro/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs';
import { DateRangePicker } from '@mui/x-date-pickers-pro/DateRangePicker';
import dayjs from "dayjs";


type User = {
  id: number;
  username: string;
  email: string;
  role: "Admin" | "Manager" | "User";
};

type CreateUserForm = {
  username: string;
  email: string;
  password: string;
  role: string;
};

type Lead = {
  id: number;
  username: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  created_at: string;
};

type LeadForm = {
  username: string;
  email: string;
  phone: string;
  company: string;
  source: string;
};

type Reply = {
  id: number;
  lead_id: number;
  user_id: number;
  reply_type: string;
  message: string;
  created_at: string;
  lead_name?: string;
  lead_email?: string;
};

type LeadStats = {
  total: number;
  new: number;
  converted: number;
  contacted: number;
  pending: number;
}; 

type ChartPoint = { label: string; value: number };

const API = "http://127.0.0.1:8000/admin";
const LEADS_API = "http://127.0.0.1:8000/leads";
const token = () => localStorage.getItem("admin_token");

const EMPTY_LEAD: LeadForm = { username: "", email: "", phone: "", company: "", source: "" };

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const LeadsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="6" cy="6" r="2.5"/> <circle cx="12" cy="5.5" r="2.5"/> <circle cx="18" cy="6" r="2.5"/>
    <path d="M3.5 12c0-2.5 5-2.5 5 0M9.5 11c0-2.5 5-2.5 5 0M15.5 12c0-2.5 5-2.5 5 0"/> <path d="M12 13v5M9.5 15.5l2.5 2.5 2.5-2.5"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="8" r="3"/> <circle cx="17" cy="8" r="3"/>
    <path d="M2 20c0-3 5-3 7 0"/> <path d="M13 20c0-3 5-3 7 0"/>
  </svg>
);

const REPLY_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  converted: { label: "Converted", color: "#34d399", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
  contacted: { label: "Contacted", color: "#2578de", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" },
  reply:     { label: "Reply",     color: "#9a9b9b", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.15)" },
};

function RepliesPanel({ leadId, allReplies, loading }: { leadId: number; allReplies: Reply[]; loading: boolean }) {
  const filtered = allReplies.filter(r => r.lead_id === leadId);
  const typeConf = REPLY_TYPE_CONFIG;

  if (loading) return <div className={styles.repliesPanelLoading}> Loading Replies... </div>;
  if (filtered.length === 0) return <div className={styles.repliesPanelEmpty}>No Replies Yet For This Lead. </div>;

  return (
    <div className={styles.repliesPanelBody}>
      <div className={styles.repliesPanelCount}> User Replies ({filtered.length})</div>
      {filtered.map(r => {
        const cfg = typeConf[r.reply_type] || typeConf.reply;
        return (
          <div key={r.id} className={styles.replyItem}
            style={{ background: cfg.bg, borderColor: cfg.border }}>
            <span className={styles.replyTypeBadge}
              style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>{cfg.label}
            </span>
            <div className={styles.replyContent}>
              <div className={styles.replyMessage}>{r.message || <div className={styles.replyNoMsg}> No Messages </div>}</div>
              <div className={styles.replyDate}>{r.created_at}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

function Admin() {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<"dashboard" | "users" | "leads">("dashboard");
  const [isDark, setIsDark] = useState(true);
  const [usersData, setUsersData] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [search, setSearch] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [showConfirm, setShowConfirm] = useState(false);
  const [modalFading, setModalFading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [leadsData, setLeadsData] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadForm, setLeadForm] = useState<LeadForm>(EMPTY_LEAD);
  const [leadFormErrors, setLeadFormErrors] = useState<Partial<LeadForm>>({});
  const [leadFormSubmitting, setLeadFormSubmitting] = useState(false);
  const [leadFormSuccess, setLeadFormSuccess] = useState("");
  const [leadFormApiError, setLeadFormApiError] = useState("");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editLeadForm, setEditLeadForm] = useState<LeadForm>(EMPTY_LEAD);
  const [editLeadErrors, setEditLeadErrors] = useState<Partial<LeadForm>>({});
  const [editLeadSubmitting, setEditLeadSubmitting] = useState(false);
  const [editLeadApiError, setEditLeadApiError] = useState("");

  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [dateRangeError, setDateRangeError] = useState<string>("")
  const [leadStats, setLeadStats] = useState<LeadStats>({ total: 0, new: 0, converted: 0, contacted: 0, pending: 0 });
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [conversionData, setConversionData] = useState<{ label: string; total: number; converted: number; ratio: number }[]>([]);
  const [activeChart, setActiveChart] = useState<"daily" | "conversion" | "status">("daily");
  const [statusChartData, setStatusChartData] = useState<ChartPoint[]>([]);

  const [allReplies, setAllReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [expandedLeadReplies, setExpandedLeadReplies] = useState<number | null>(null);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({ username: "", email: "", password: "", role: "User" });
  const [createUserErrors, setCreateUserErrors] = useState<Partial<CreateUserForm>>({});
  const [createUserSubmitting, setCreateUserSubmitting] = useState(false);
  const [createUserSuccess, setCreateUserSuccess] = useState("");
  const [createUserApiError, setCreateUserApiError] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") setIsDark(false);
  }, []);

  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      loadChartData(dateRange[0], dateRange[1]);
    }}, [dateRange]);

  useEffect(() => {
    const t = localStorage.getItem("admin_token");
    const u = JSON.parse(localStorage.getItem("admin_user") || "{}");
    if (!t || u?.role !== "Admin") { navigate('/login'); return; }
    loadUsers();
    loadLeads();
    loadLeadStats();
    const defaultEnd = dayjs();
    const defaultStart = defaultEnd.subtract(19, "day");
    setDateRange([defaultStart, defaultEnd]);
    loadChartData(defaultStart, defaultEnd);
  }, [navigate]);

  useEffect(() => {
    if (activeSection === "leads") {
      loadLeads();
      loadLeadStats();
      loadAllReplies();
    }
  }, [activeSection]);


  const loadUsers = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/users`, { headers: { Authorization: "Bearer " + token() } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsersData(data.users || []); setFilteredUsers(data.users || []);
    } catch { setError("Unable to Load Users. Please Try Again ↻."); }
    finally { setLoading(false); }
  };

  const loadLeads = async () => {
    setLeadsLoading(true); setLeadsError("");
    try {
      const res = await fetch(LEADS_API, { headers: { Authorization: "Bearer " + token() } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLeadsData(data.leads || []);
    } catch { setLeadsError("Unable to Load Leads. Please Try Again ↻."); }
    finally { setLeadsLoading(false); }
  };

  const loadLeadStats = async () => {
    try {
      const res = await fetch(`${LEADS_API}/stats`, { headers: { Authorization: "Bearer " + token() } });
      if (!res.ok) return;
      const data = await res.json();
      setLeadStats(data);
    } catch {  }
  };

  const loadChartData = async (startDate: any, endDate: any) => {
    const start = startDate.toDate ? startDate.toDate().toISOString() : startDate.toISOString();
    const end = endDate.toDate ? endDate.toDate().toISOString() : endDate.toISOString();
    try {
      const [dailyRes, convRes, statusRes] = await Promise.all([
        fetch(`${LEADS_API}/chart/daily?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { headers: { Authorization: "Bearer " + token() } }),

        fetch(`${LEADS_API}/chart/conversion?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { headers: { Authorization: "Bearer " + token() } }),

        fetch(`${LEADS_API}/chart/status?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { headers: { Authorization: "Bearer " + token() } }),

      ]);
      if (dailyRes.ok) { const daily = await dailyRes.json(); setChartData(daily.chart || []); }
      if (convRes.ok) { const conv = await convRes.json(); setConversionData(conv.chart || []); }
      if (statusRes.ok) { const st = await statusRes.json(); setStatusChartData(st.chart || []); }
    } catch { }
  };

  const loadAllReplies = async () => {
    setRepliesLoading(true);
    try {
      const res = await fetch(`${LEADS_API}/replies/all`, { headers: { Authorization: "Bearer " + token() } });
      if (!res.ok) return;
      const data = await res.json();
      setAllReplies(data.replies || []);
    } catch {  }
    finally { setRepliesLoading(false); }
  };


  const handleSearch = (value: string) => {
    setSearch(value);
    setFilteredUsers(usersData.filter(u =>
      u.username.toLowerCase().includes(value.toLowerCase()) ||
      u.email.toLowerCase().includes(value.toLowerCase()) ||
      u.role.toLowerCase().includes(value.toLowerCase())
    ));
  };

  const openEdit = (user: User) => { setSelectedUser(user); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setSelectedUser(null); };

  const saveEdit = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      const res = await fetch(`${API}/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
        body: JSON.stringify({ username: selectedUser.username, role: selectedUser.role }),
      });
      if (!res.ok) throw new Error();
      closeModal(); loadUsers();
    } catch { setError("Failed to update user."); }
    finally { setLoading(false); }
  };

  const deleteUser = async (user: User) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      setLoading(true);
      const res = await fetch(`${API}/users/${user.id}`, {
        method: "DELETE", headers: { Authorization: "Bearer " + token() },
      });
      if (!res.ok) throw new Error();
      loadUsers();
    } catch { setError("Failed to delete user."); }
    finally { setLoading(false); }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => { e.preventDefault();
    setLeadFormErrors({}); setLeadFormApiError(""); setLeadFormSuccess("");
    const errs: Partial<LeadForm> = {};
    if (!leadForm.username.trim()) errs.username = "Name is required!";
    if (!leadForm.email.trim()) errs.email = "Email is required!";
    if (!leadForm.phone.trim()) errs.phone = "Phone is required!";
    if (!leadForm.company.trim()) errs.company = "Company is required!";
    if (Object.keys(errs).length) { setLeadFormErrors(errs); return; }
    setLeadFormSubmitting(true);
    try {
      const res = await fetch(LEADS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
        body: JSON.stringify(leadForm),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.detail === "object") setLeadFormErrors(data.detail);
        else setLeadFormApiError(data.detail || "Failed to post lead.");
        return;
      }
      setLeadFormSuccess("Lead Posted Successfully!");
      setLeadForm(EMPTY_LEAD);
      loadLeads(); loadLeadStats();
    } catch { setLeadFormApiError("Network Error. Please Try Again ↻."); }
    finally { setLeadFormSubmitting(false); }
  };

  const openEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setEditLeadForm({ username: lead.username, email: lead.email, phone: lead.phone, company: lead.company, source: lead.source });
    setEditLeadErrors({}); setEditLeadApiError("");
  };

  const handleLeadUpdate = async () => {
    setEditLeadErrors({}); setEditLeadApiError("");
    const errs: Partial<LeadForm> = {};
    if (!editLeadForm.username.trim()) errs.username = "Name is required!";
    if (!editLeadForm.email.trim()) errs.email = "Email is required!";
    if (!editLeadForm.phone.trim()) errs.phone = "Phone is required!";
    if (!editLeadForm.company.trim()) errs.company = "Company is required!";
    if (!editLeadForm.source.trim()) errs.source = "Source is required!";
    if (Object.keys(errs).length) { setEditLeadErrors(errs); return; }
    if (!editingLead) return;
    setEditLeadSubmitting(true);
    try {
      const res = await fetch(`${LEADS_API}/${editingLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
        body: JSON.stringify(editLeadForm),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.detail === "object") setEditLeadErrors(data.detail);
        else setEditLeadApiError(data.detail || "Failed to update lead.");
        return;
      }
      setEditingLead(null);
      loadLeads(); loadLeadStats();
    } catch { setEditLeadApiError("Network Error. Please Try Again ↻."); }
    finally { setEditLeadSubmitting(false); }
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (!window.confirm(`Delete lead "${lead.username}"?`)) return;
    try {
      const res = await fetch(`${LEADS_API}/${lead.id}`, {
        method: "DELETE", headers: { Authorization: "Bearer " + token() },
      });
      if (!res.ok) throw new Error();
      loadLeads(); loadLeadStats();
    } catch { setLeadsError("Failed to delete lead."); }
  };

  const handleCreateUserSubmit = async () => {
    setCreateUserErrors({}); setCreateUserApiError(""); setCreateUserSuccess("");
    const errs: Partial<CreateUserForm> = {};
    if (!createUserForm.username.trim()) errs.username = "Username is required!";
    if (!createUserForm.email.trim()) errs.email = "Email is required!";
    if (!createUserForm.password.trim()) errs.password = "Password is required!";
    if (Object.keys(errs).length) { setCreateUserErrors(errs); return; }
    setCreateUserSubmitting(true);
    try {
      const res = await fetch(`${API}/users`, { method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
        body: JSON.stringify(createUserForm),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.detail === "object") setCreateUserErrors(data.detail);
        else setCreateUserApiError(data.detail || "Failed to create user.");
        return;
      }
      setCreateUserSuccess("User created successfully!");
      setCreateUserForm({ username: "", email: "", password: "", role: "User" });
      loadUsers();
    } catch { setCreateUserApiError("Network Error. Please Try Again ↻."); }
    finally { setCreateUserSubmitting(false); }
  };

  const closeCreateUserModal = () => {
    setShowCreateUser(false);
    setCreateUserForm({ username: "", email: "", password: "", role: "User" });
    setCreateUserErrors({}); setCreateUserApiError(""); setCreateUserSuccess("");
  };

  const openUploadModal = () => { setUploadFile(null); setUploadProgress(0); setUploadStatus("idle"); setShowUploadModal(true); };
  const closeUploadModal = () => { setShowUploadModal(false); setUploadFile(null); setUploadProgress(0); setUploadStatus("idle"); };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setUploadFile(file); setUploadStatus("idle"); }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setUploadFile(file); setUploadStatus("idle"); }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setUploadStatus("uploading"); setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(p => { if (p >= 90) { clearInterval(interval); return p; } return p + Math.floor(Math.random() * 12) + 4; });
    }, 160);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await fetch(`${API}/upload`, { method: "POST", headers: { Authorization: "Bearer " + token() }, body: formData });
      clearInterval(interval);
      if (!res.ok) throw new Error();
      setUploadProgress(100); setUploadStatus("done");
    } catch { clearInterval(interval); setUploadStatus("error"); }
  };

  const smoothCloseUploadModal = () => {
    setModalFading(true);
    setTimeout(() => { setModalFading(false); closeUploadModal(); }, 300);
  };
  
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const handleLogout = () => setShowConfirm(true);

  const chartTotal = chartData.reduce((s, d) => s + d.value, 0);
  const lastMo = chartData.slice(-4).reduce((s, d) => s + d.value, 0);
  const prevMo = chartData.slice(-8, -4).reduce((s, d) => s + d.value, 0);
  const growth = prevMo > 0 ? (((lastMo - prevMo) / prevMo) * 100).toFixed(1) : "0";

  return (
    <div className={`${styles.dashboard} ${isDark ? styles.dark : styles.light}`}>
      <aside className={styles.sidebar}>
        <h2 className={styles.logo}> Admin </h2>
        <ul>
          <li className={activeSection === "dashboard" ? styles.active : ""} onClick={() => setActiveSection("dashboard")}>
            <span className={styles.navIcon}>⊞</span> Dashboard
          </li>
          <li className={activeSection === "leads" ? styles.active : ""} onClick={() => setActiveSection("leads")}>
            <span className={styles.navIcon}><LeadsIcon /></span> Leads
          </li>
          <li className={activeSection === "users" ? styles.active : ""} onClick={() => setActiveSection("users")}>
            <span className={styles.navIcon}><UsersIcon /></span> Users
          </li>
          <li onClick={handleLogout} className={styles.logoutItem}><span className={styles.navIcon}> 🔙 </span> Logout </li>
        </ul>
      </aside>

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1> Admin Dashboard </h1><p> Manage Users, Roles & Permissions. </p>
          </div>
          <div className={styles.headerRight}>
            <center> <input className={styles.search} type="text" placeholder="Search users..."
              value={search} onChange={e => handleSearch(e.target.value)} /> </center>
              <button className={styles.refreshBtn} onClick={loadUsers}> ↻ Refresh </button>
              <div className={styles.headerActions}>
                <button className={styles.themeToggle} onClick={() => setIsDark(prev => { const newTheme = !prev;
                localStorage.setItem("theme", newTheme ? "dark" : "light"); return newTheme; })} title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                  <span className={styles.themeTrack}><span className={`${styles.themeThumb} ${isDark ? styles.thumbRight : styles.thumbLeft}`} /></span>
                  <span className={styles.themeIcon}>{isDark ? <SunIcon /> : <MoonIcon />}</span>
                </button>
              </div>
          </div>
        </div>

        {error && (
          <div className={styles.error}>{error}
            <button className={styles.retryBtn} onClick={loadUsers}> Retry </button>
          </div>
        )}

        {activeSection === "dashboard" && (
            <div className={styles.statsGrid}>{[
                { label: "Total Leads", value: leadStats.total },
                { label: "New Leads", value: leadStats.new },
                { label: "Converted", value: leadStats.converted },
                { label: "Pending", value: leadStats.pending },
              ].map(({ label, value }) => (
                <div key={label} className={styles.statCard}>
                  <div className={styles.statLabel}>{label}</div>
                  <div className={styles.statValue}>{value}</div>
                </div>
              ))}
            </div>
        )}

        {activeSection === "users" && (
          <>
            <div className={styles.tablePanelHeader}>
              <span className={styles.tablePanelTitle}> All Users </span>
              <div className={styles.tablePanelActions}>
                <span className={styles.tableCount}>{filteredUsers.length} Records </span>
                <button onClick={() => setShowCreateUser(true)} className={styles.createUserBtn}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement)} onMouseLeave={e => (e.currentTarget as HTMLButtonElement)}>
                  <span className={styles.btnPlusIcon}> + </span> Create User 
                </button>
              </div>
            </div>
            <div className={styles.tableContainer}>
              {loading ? <p className={styles.loading}> Loading users... </p> : (
                <table className={styles.table}>
                  <thead>
                    <tr><th>Id</th><th>Username</th><th>Email</th><th>Role</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr key={user.id}>
                        <td className={styles.indexCell}>
                          {String(index + 1).padStart(2, "0")}
                        </td>
                        <td>
                          <div className={styles.userCell}>
                            <span className={styles.userName}>{user.username}</span>
                          </div>
                        </td>
                        <td><span className={styles.emailText}>{user.email}</span></td>
                        <td><span className={`${styles.role} ${styles[user.role]}`}>{user.role}</span></td>
                        <td>
                          <div className={styles.actions}>
                            <button className={styles.editBtn} onClick={() => openEdit(user)}
                              disabled={user.role === "Admin" }> Edit </button>
                            <button className={styles.deleteBtn} onClick={() => deleteUser(user)}
                              disabled={user.role === "Admin"}> Delete </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeSection === "leads" && (
          <div className={styles.leadsSection}>
            <div className={styles.statsGrid}>{[
                { label: "Total Leads", value: leadStats.total },
                { label: "New Leads", value: leadStats.new },
                { label: "Converted", value: leadStats.converted },
                { label: "Pending", value: leadStats.pending },
              ].map(({ label, value }) => (
                <div key={label} className={styles.statCard}>
                  <div className={styles.statLabelSm}>{label}</div>
                  <div className={styles.statValueLg}>{value}</div>
                </div>
              ))}
            </div>

            <div className={styles.tablePanelHeader}>
              <span className={styles.tablePanelTitle}> All Leads </span>
              <div className={styles.tablePanelActions}>
                <span className={styles.tableCount}>{leadsData.length} records</span>
                <button onClick={() => { setShowLeadForm(v => !v); setLeadFormSuccess(""); setLeadFormErrors({}); setLeadFormApiError(""); }}
                  className={showLeadForm ? styles.postLeadBtnActive : styles.postLeadBtn}>
                  <span className={styles.btnPlusIcon}>{showLeadForm ? " ✕ " : " + "}</span>
                  {showLeadForm ? "Cancel" : "Post Lead"}
                </button>
              </div>
            </div>

            {showLeadForm && (
              <div className={styles.leadFormBox}>
                <p className={styles.leadFormTitle}> New Lead </p>
                {leadFormSuccess && ( <div className={styles.successAlert}> ✓ {leadFormSuccess} </div> )}
                {leadFormApiError && ( <div className={styles.errorAlert}> ✕ {leadFormApiError} </div> )}
                <form onSubmit={handleLeadSubmit}>
                  <div className={styles.leadFormGrid}>
                    {(["username", "email", "phone", "company", "source"] as (keyof LeadForm)[]).map(field => (
                      <div key={field}>
                        <label className={styles.fieldLabel}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                        <input className={styles.fieldInput} type={field === "email" ? "email" : "text"}
                          placeholder={field === "phone" ? "e.g. 9876543210" : `Enter ${field}`}
                          value={leadForm[field]} onChange={e => setLeadForm({ ...leadForm, [field]: e.target.value })}/>
                        {leadFormErrors[field] && <span className={styles.fieldError}>{leadFormErrors[field]}</span>}
                      </div>
                    ))}
                  </div>
                  <button type="submit" disabled={leadFormSubmitting}
                    className={leadFormSubmitting ? styles.submitBtnDisabled : styles.submitBtn}>
                    {leadFormSubmitting ? "Posting…" : "Post Lead"}
                  </button>
                </form>
              </div>
            )}

            {leadsError && (
              <div className={styles.error}>{leadsError}
                <button className={styles.retryBtn} onClick={loadLeads}> Retry </button>
              </div>
            )}

            <div className={styles.tableContainer}>
              {leadsLoading ? <p className={styles.loading}> Loading leads... </p> : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th><th>Name</th><th>Email</th><th>Contact No.</th><th>Company</th><th>Source</th><th>Status</th><th>Time</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadsData.length === 0 ? (
                      <tr><td colSpan={9} className={styles.emptyCell}> No Leads Found. Post Your First Lead! </td></tr>
                    ) : leadsData.map((lead, index) => (
                      <React.Fragment key={lead.id}>
                        <tr>
                          <td className={styles.indexCell}> {String(index + 1).padStart(2, "0")}</td>
                          <td><div className={styles.userCell}><span className={styles.userName}> {lead.username} </span></div></td>
                          <td><span className={styles.emailText}>{lead.email}</span></td>
                          <td className={styles.mutedCell}>{lead.phone}</td>
                          <td className={styles.lightCell}>{lead.company}</td>
                          <td className={styles.lightCell}>{lead.source}</td>
                          <td className={styles.statusCell}> <span className={styles.replies} style={{
                              background: lead.status === "converted" ? "rgba(16,185,129,0.12)" : lead.status === "contacted" ? "rgba(59,130,246,0.12)" : "rgba(99,102,241,0.1)",
                              color: lead.status === "converted" ? "#34d399" : lead.status === "contacted" ? "#60a5fa" : "#818cf8",
                              border: `1px solid ${lead.status === "converted" ? "rgba(16,185,129,0.3)" : lead.status === "contacted" ? "rgba(59,130,246,0.3)" : "rgba(99,102,241,0.2)"}`,
                            }}>{lead.status || "new"}</span>
                          </td>
                          <td className={styles.lightCell}>{lead.created_at}</td>
                          <td><div className={styles.actions}>
                            <button className={styles.editBtn} onClick={() => openEditLead(lead)}> Edit </button>
                            <button className={styles.deleteBtn} onClick={() => handleDeleteLead(lead)}> Delete </button>
                            <button onClick={() => setExpandedLeadReplies(expandedLeadReplies === lead.id ? null : lead.id)}
                              className={expandedLeadReplies === lead.id ? styles.repliesBtnActive : styles.repliesBtn }> Replies 
                            </button></div>
                          </td>
                        </tr>
                        {expandedLeadReplies === lead.id && (
                          <tr>
                            <td colSpan={9} className={styles.repliesPanelCell}>
                              <RepliesPanel leadId={lead.id} allReplies={allReplies} loading={repliesLoading} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        <div className={styles.rightPanel}>
          <div className={styles.card}>
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
              {(["daily","conversion","status"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveChart(tab)} style={{
                  padding: "5px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid",
                  background: activeChart === tab ? "linear-gradient(135deg,#6366f1,#818cf8)" : "transparent",
                  color: activeChart === tab ? "#fff" : "#94a3b8",
                  borderColor: activeChart === tab ? "#6366f1" : "rgba(148,163,184,0.2)",}}> 
                  {tab === "daily" ? "Leads / Day" : tab === "conversion" ? "Conversion Rate" : "Leads By Status"}
                </button>
              ))}
              <LocalizationProvider dateAdapter={AdapterDayjs}> <DemoContainer components={['DateRangePicker']}><DateRangePicker className={styles.card}
               value={dateRange} disableFuture onChange={(newValue: [any, any]) => { const [start, end] = newValue; setDateRangeError("");
                
              if (start && end) {
                const today = dayjs().endOf("day");

                if (end.isAfter(today)) { setDateRangeError("End Date Cannot Exceed Today's Date!"); return }

                const diff = end.diff(start, "day");
                
                if (diff >= 20) { setDateRangeError("Date Range Cannot Exceed More Than 20 Days!") }
              }
              setDateRange(newValue); if (start && end) loadChartData(start, end); }} /> </DemoContainer> </LocalizationProvider>
              
              {dateRangeError && ( <div className={styles.dateRangeError}> ⚠ {dateRangeError} </div> )}
            </div>

            {activeChart === "daily" && (<>
              <div className={styles.cardSub}> Newly Added Leads In Past 20 Days </div>
              <div className={styles.chartWrap}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs><linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="purple"/><stop offset="100%" stopColor="cyan"/></linearGradient></defs>
                      <CartesianGrid stroke="rgba(0,0,0,0.04)" />
                      <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="url(#lineGrad)" strokeWidth={2.5} dot={{ fill: "#6366f1", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#25b6f9", strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className={styles.chartEmpty}> Loading Chart. . . . </div>}
              </div>
              <div className={styles.barFooter}>
                <div><div className={styles.barTotal}>{chartTotal}</div><div className={styles.barTotalLabel}>Total Leads In Past 20 Days</div></div>
                <div className={styles.barGrowth}>+{growth}%</div>
              </div>
            </>)}

            {activeChart === "conversion" && (<>
              <div className={styles.cardSub}> % Of Leads Converted In Past 20 Days </div>
              <div className={styles.chartWrap}>
                {conversionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={conversionData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <defs><linearGradient id="convGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#6e14ec"/></linearGradient></defs>
                      <CartesianGrid stroke="rgba(0,0,0,0.04)" />
                      <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
                      <Tooltip  />
                      <Line type="monotone" dataKey="ratio" stroke="url(#convGrad)" strokeWidth={2.5} dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className={styles.chartEmpty}> Loading Chart. . . . </div>}
              </div>
              <div className={styles.barFooter}>
                <div><div className={styles.barTotal}>{conversionData.length > 0 ? `${conversionData[conversionData.length - 1].ratio}%` : "0%"}</div>
                <div className={styles.barTotalLabel}> Current Ratio Of 20 Days </div></div>
                <div className={styles.barGrowth}>{conversionData.length > 0 ? `${conversionData[conversionData.length - 1].converted}/${conversionData[conversionData.length - 1].total} Converted` : ""}</div>
              </div>
            </>)}

            {activeChart === "status" && (<>
              <div className={styles.cardSub}> Lead Distribution By Current Status </div>
              <div className={styles.chartWrap}>
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="90%" height="100%">
                    <BarChart data={statusChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(0,0,0,0.04)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {statusChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.label === "Total" ? "#00fbff" : entry.label === "Converted" ? "#34d399" : entry.label === "Contacted" ? "#60a5fa" : entry.label === "New" ? "#818cf8" : "#f59e0b" } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className={styles.chartEmpty}> Loading Chart. . . . </div>}
              </div>
              <div className={styles.barFooter}>
                <div><div className={styles.barTotal}>{leadStats.total}</div><div className={styles.barTotalLabel}> Total Leads </div></div>
                <div className={styles.barGrowth}>{leadStats.converted} Converted </div>
              </div>
            </>)}
          </div>
        </div>
        
        <div className={styles.card}>
          <div className={styles.cardTitle}> File Management </div>
          <div className={styles.cardSub}> Upload Attchments & Reports </div>
          <button onClick={openUploadModal} className={styles.uploadBtn}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 28px rgba(99,102,241,0.48)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 18px rgba(99,102,241,0.35)"; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg> Upload Something
          </button>
        </div>

        {showUploadModal && (
          <div onClick={e => e.target === e.currentTarget && smoothCloseUploadModal()}
            className={styles.uploadModalOverlay}
            style={{ opacity: modalFading ? 0 : 1 }}>
            <div className={styles.uploadModalBox}
              style={{ transform: modalFading ? "scale(0.96) translateY(8px)" : "scale(1) translateY(0)" }}>
              <div className={styles.uploadModalHeader}>
                <div>
                  <h3 className={styles.uploadModalTitle}> Upload File </h3>
                  <p className={styles.uploadModalSub}> Drag & Drop or Browse To Upload </p>
                </div>
                <button onClick={smoothCloseUploadModal} className={styles.modalCloseBtn}> ✕ </button>
              </div>
              <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={styles.dropZone}
                style={{
                  borderColor: dragOver ? "#6366f1" : uploadFile ? "#10b981" : "rgba(255,255,255,0.12)",
                  background: dragOver ? "rgba(99,102,241,0.06)" : uploadFile ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)",
                }}>
                <input ref={fileInputRef} type="file" name="file_upload" style={{ display: "none" }} onChange={handleFileInput} />
                {uploadFile ? (
                  <div>
                    <div className={styles.fileEmoji}>📄</div> <div className={styles.fileName}>{uploadFile.name}</div>
                    <div className={styles.fileSize}> {formatBytes(uploadFile.size)} </div>
                    <div className={styles.fileReady}> ✓ Upload Now — Click To Replace </div>
                  </div>
                ) : (
                  <div>
                    <div className={styles.dropIconWrap}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className={styles.dropTitle} >Drop Your File Here </div>
                    <div className={styles.dropSub}>or <span className={styles.dropBrowse}> Browse Files </span></div>
                  </div>
                )}
              </div>
              {uploadStatus === "uploading" && (
                <div className={styles.progressWrap}>
                  <div className={styles.progressHeader}>
                    <span className={styles.progressLabel}> Uploading... </span><span className={styles.progressPct}>{uploadProgress} % </span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
              {uploadStatus === "done" && <div className={styles.uploadSuccess}> ✓ File Uploaded Successfully! </div>}
              {uploadStatus === "error" && <div className={styles.uploadError}> ✕ Upload Failed! Please Try Again ↻. </div>}
              <div className={styles.uploadModalFooter}>
                {uploadStatus === "done" ? (
                  <button onClick={smoothCloseUploadModal} className={styles.doneBtnGreen}>Done</button>
                ) : (
                  <button onClick={handleUploadSubmit} disabled={!uploadFile || uploadStatus === "uploading"}
                    className={(!uploadFile || uploadStatus === "uploading") ? styles.uploadSubmitDisabled : styles.uploadSubmit}>
                    {uploadStatus === "uploading" ? "Uploading…" : "Upload File"}
                  </button>
                )}
                <button onClick={smoothCloseUploadModal} className={styles.uploadCancelBtn}> Cancel </button>
              </div>
            </div>
          </div>
        )}

        {showModal && selectedUser && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h3> Edit User </h3>
              <div className={styles.formGroup}>
                <label> Username </label>
                <input value={selectedUser.username} onChange={e => setSelectedUser({ ...selectedUser, username: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label> Role </label>
                <select value={selectedUser.role} onChange={e => setSelectedUser({ ...selectedUser, role: e.target.value as User["role"] })}>
                  <option> User </option>
                  <option> Manager </option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveEdit}> Save Changes </button>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}> Cancel </button>
              </div>
            </div>
          </div>
        )}

        {editingLead && (
          <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setEditingLead(null)}>
            <div className={styles.leadModalBox}>
              <div className={styles.leadModalHeader}>
                <div>
                  <h3 className={styles.leadModalTitle}> Edit Lead </h3>
                  <p className={styles.leadModalSub}> Update Lead Information </p>
                </div>
                <button onClick={() => setEditingLead(null)} className={styles.modalCloseBtn}> ✕ </button>
              </div>
              {editLeadApiError && <div className={styles.errorAlert}> ✕ {editLeadApiError}</div>}
              <div className={styles.leadModalFields}>
                {(["username", "email", "phone", "company", "source"] as (keyof LeadForm)[]).map(field => (
                  <div key={field}>
                    <label className={styles.fieldLabel}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                    <input className={styles.fieldInput} type={field === "email" ? "email" : "text"}
                      value={editLeadForm[field]}
                      onChange={e => setEditLeadForm({ ...editLeadForm, [field]: e.target.value })}
                    />
                    {editLeadErrors[field] && <span className={styles.fieldError}>{editLeadErrors[field]}</span>}
                  </div>
                ))}
              </div>
              <div className={styles.leadModalFooter}>
                <button onClick={handleLeadUpdate} disabled={editLeadSubmitting}
                  className={editLeadSubmitting ? styles.submitBtnDisabled : styles.submitBtn}>
                  {editLeadSubmitting ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={() => setEditingLead(null)} className={styles.uploadCancelBtn}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showCreateUser && (
          <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && closeCreateUserModal()}>
            <div className={styles.createUserModalBox}>
              <div className={styles.leadModalHeader}>
                <div>
                  <h3 className={styles.leadModalTitle}> Create User </h3>
                  <p className={styles.leadModalSub}> Add a New User </p>
                </div>
                <button onClick={closeCreateUserModal} className={styles.modalCloseBtn}> ✕ </button>
              </div>
              {createUserSuccess && <div className={styles.successAlert}> ✓ {createUserSuccess}</div>}
              {createUserApiError && <div className={styles.errorAlert}> ✕ {createUserApiError}</div>}
              <div className={styles.leadModalFields}>
                {([["username","text","e.g. johnsmith"],["email","email","e.g. john@example.com"],["password","password","Enter password"]] as [keyof CreateUserForm, string, string][]).map(([field, type, ph]) => (
                  <div key={field}>
                    <label className={styles.fieldLabel}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                    <input className={styles.fieldInput} type={type} placeholder={ph} value={createUserForm[field]}
                      onChange={e => setCreateUserForm({ ...createUserForm, [field]: e.target.value })} />
                    {createUserErrors[field] && <span className={styles.fieldError}>{createUserErrors[field]}</span>}
                  </div>
                ))}
                <div>
                  <label className={styles.fieldLabel}>Role</label>
                  <select className={styles.fieldSelect} value={createUserForm.role}
                    onChange={e => setCreateUserForm({ ...createUserForm, role: e.target.value })}>
                    <option value="User"> User </option>
                    <option value="Manager"> Manager </option>
                    <option value="Admin"> Admin </option>
                  </select>
                  {createUserErrors.role && <span className={styles.fieldError}>{createUserErrors.role}</span>}
                </div>
              </div>
              <div className={styles.leadModalFooter}>
                <button onClick={handleCreateUserSubmit} disabled={createUserSubmitting}
                  className={createUserSubmitting ? styles.createUserSubmitDisabled : styles.createUserSubmit}>
                  {createUserSubmitting ? "Creating…" : "Create User"}
                </button>
                <button onClick={closeCreateUserModal} className={styles.uploadCancelBtn}> Cancel </button>
              </div>
            </div>
          </div>
        )}

        {showConfirm && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalBox}>
              <h3> Confirm Logout </h3><p> Are you sure? You Really Want To Logout? </p>
              <div className={styles.modalActions}>
                <button onClick={() => { localStorage.removeItem("admin_token"); localStorage.removeItem("admin_user"); navigate("/login"); }} className={styles.confirmBtn}> Yes, Logout </button>
                <button onClick={() => setShowConfirm(false)} className={styles.cancelBtn}> Cancel </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


export default Admin;
