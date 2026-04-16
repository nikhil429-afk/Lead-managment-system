import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./user.module.css";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

type MenuItem = "dashboard" | "leads" | "New Leads";

interface DataItem { id: number; name: string; data: string; }

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

type Reply = {
  id: number;
  lead_id: number;
  reply_type: string;
  message: string;
  status: string;
  created_at: string;
};

type DropDownProps = {
  data: DataItem[];
  show: boolean;
  onSelect: (item: DataItem) => void;
  selectedId: number | null;
};

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};


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

const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/> <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const LeadsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4"/> <path d="M4 20c0-4 16-4 16 0"/>
  </svg>
);

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const REPLY_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; btnBg: string }> = {
  converted: { label: "Mark Converted", color: "#34d399", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)",  btnBg: "linear-gradient(135deg,#10b981,#059669)" },
  contacted: { label: "Mark Contacted", color: "#60a5fa", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.3)",  btnBg: "linear-gradient(135deg,#3b82f6,#2563eb)" },
  reply:     { label: "Add Reply",      color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", btnBg: "rgba(148,163,184,0.15)" },
};

function UserReplyPanel({
  lead, replies, replyMessage, onMessageChange, onSubmit, submitting, successMsg, }: { lead: Lead; replies: Reply[]; replyMessage: string;
  onMessageChange: (v: string) => void;
  onSubmit: (leadId: number, type: "converted" | "contacted" | "reply") => void; submitting: boolean; successMsg?: string;
}) {
  const typeConf = REPLY_TYPE_CONFIG;

  return (
    <div className={styles.replyPanelBody}>
      {replies.length > 0 && (
        <div className={styles.prevRepliesWrap}>
          <div className={styles.prevRepliesLabel}>Previous Replies</div>
          {replies.map(r => { const cfg = typeConf[r.reply_type] || typeConf.reply;

            return (
              <div key={r.id} className={styles.prevReplyItem} style={{ background: cfg.bg, borderColor: cfg.border }}>
                <span className={styles.prevReplyBadge} style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}>
                  {cfg.label.replace("Mark ", "").replace("Add ", "")}
                </span>
                <div className={styles.prevReplyContent}>
                  <div className={styles.prevReplyMsg}>{r.message || <div className={styles.prevReplyNoMsg}>No message</div>}</div>
                  <div className={styles.prevReplyDate}>{r.created_at}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.composeArea}>
        <div className={styles.composeLabel}>Add Reply for {lead.username}</div>
        <textarea value={replyMessage} onChange={e => onMessageChange(e.target.value)} placeholder="Optional message or notes…" rows={2} className={styles.replyTextarea}/>
        {successMsg && (
          <div className={styles.replySuccess}> ✓ {successMsg}</div>
        )}
        <div className={styles.replyBtnsRow}>
          {(["converted", "contacted", "reply"] as const).map(type => {
            const cfg = typeConf[type];
            return ( <button key={type} disabled={submitting} onClick={() => onSubmit(lead.id, type)}
                className={submitting ? styles.replyActionBtnDisabled : styles.replyActionBtn}
                style={{background: submitting ? "rgba(148,163,184,0.1)" : cfg.btnBg,
                color: submitting ? "#475569" : type === "reply" ? cfg.color : "#fff" }}> {cfg.label} </button>
                );
            })}
        </div>
      </div>
    </div>
  );
}


function User() {

  const navigate = useNavigate();
  const API = "http://127.0.0.1:8000/user";
  const LEADS_API = "http://127.0.0.1:8000/leads";
  const token = () => localStorage.getItem("user_token");

  const [activeMenu, setActiveMenu] = useState<MenuItem>("dashboard");
  const [isDark, setIsDark] = useState(true);
  const [data, setData] = useState<DataItem[]>([]);
  const [error, setError] = useState<string>("");
  const [leadsData, setLeadsData] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState("");
  const [totalLeads, setTotalLeads] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [converted, setConverted] = useState(0);
  const [pending, setPending] = useState(0);

  const [showDropDown, setShowDropDown] = useState<boolean>(false);
  const [selectedLead, setSelectedLead] = useState<DataItem | null>(null);
  const [showLeadsTable, setShowLeadsTable] = useState(false);

  const [expandedReplyLead, setExpandedReplyLead] = useState<number | null>(null);
  const [leadReplies, setLeadReplies] = useState<Record<number, Reply[]>>({});
  const [replyMessage, setReplyMessage] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replySuccess, setReplySuccess] = useState<Record<number, string>>({});

  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);

  useEffect(() => {
    loadLeadStats();
    fetchLeads();
  }, []);

  useEffect(() => {
    if (activeMenu === "New Leads") loadLeads();
  }, [activeMenu]);


  const loadLeadStats = async () => {
    try {
      const res = await fetch(`${LEADS_API}/stats`, { headers: { Authorization: "Bearer " + token() } });
      if (!res.ok) return;
      const data = await res.json();
      setTotalLeads(data.total || 0);
      setNewLeads(data.new || 0);
      setConverted(data.converted || 0);
      setPending(data.pending || 0);
    } catch {  }
  };

  const loadLeads = async () => {
    setLeadsLoading(true); setLeadsError("");
    try {
      const res = await fetch(LEADS_API, { headers: { Authorization: "Bearer " + token() } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLeadsData(data.leads || []);
    } catch { setLeadsError("Unable to load leads. Please try again."); }
    finally { setLeadsLoading(false); }
  };

  const fetchLeadReplies = async (leadId: number) => {
    try {
      const res = await fetch(`${LEADS_API}/${leadId}/replies`, { headers: { Authorization: "Bearer " + token() } });
      if (!res.ok) return;
      const data = await res.json();
      setLeadReplies(prev => ({ ...prev, [leadId]: data.replies || [] }));
    } catch {  }
  };

  const submitReply = async (leadId: number, replyType: "converted" | "contacted" | "reply") => {
    setReplySubmitting(true);
    try {
      const res = await fetch(`${LEADS_API}/${leadId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
        body: JSON.stringify({ reply_type: replyType, message: replyMessage }),
      });
      if (!res.ok) throw new Error();
      setReplyMessage("");
      setReplySuccess(prev => ({ ...prev, [leadId]: `Marked as ${replyType}` }));
      setTimeout(() => setReplySuccess(prev => { const n = { ...prev }; delete n[leadId]; return n; }), 2500);
      fetchLeadReplies(leadId);
      loadLeadStats();
      loadLeads();
    } catch {  }
    finally { setReplySubmitting(false); }
  };

  const toggleReplyPanel = (leadId: number) => {
    if (expandedReplyLead === leadId) {
      setExpandedReplyLead(null);
    } else {
      setExpandedReplyLead(leadId);
      if (!leadReplies[leadId]) fetchLeadReplies(leadId);
    }
  };


  const DropDown: React.FC<DropDownProps> = ({ data, show, onSelect, selectedId }) => {
    if (!show) return null;
    return (
      <ul className={styles.dropdown}>
        <li className={`${styles.dropdownItem} ${selectedId === -1 ? styles.dropdownItemActive : ""}`}
          onClick={() => onSelect({ id: -1, name: "New leads", data: "" })}>
          <svg className={styles.dropdownItemIcon} width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg> Show New Leads
          {data.length > 0 && <span className={styles.dropdownBadge}>{data.length}</span>}
        </li>
        {data.length === 0 ? (
          <li className={styles.dropdownEmpty}>No leads found</li>
        ) : (
          data.map((item) => (
            <li key={item.id} className={`${styles.dropdownItem} ${selectedId === item.id ? styles.dropdownItemActive : ""}`}
              onClick={() => onSelect(item)}>
              <span className={styles.dropdownDot} />
              {item.name}
            </li>
          ))
        )}
      </ul>
    );
  };

  const FileViewer: React.FC<{ lead: DataItem; onClose: () => void }> = ({ lead, onClose }) => {
    const fileUrl = `${API}/leads/${lead.id}/file`;
    const ext = (lead.name.split(".").pop() ?? "").toLowerCase();
    const [text, setText] = useState<string | null>(null);
    const [csvRows, setCsvRows] = useState<string[][]>([]);
    const [loading, setLoading] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const [editRows, setEditRows] = useState<string[][]>([]);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const docxRef = useRef<HTMLDivElement>(null);

    const isImage = ["png","jpg","jpeg","gif","webp","svg","bmp"].includes(ext);
    const isCsv = ext === "csv";
    const isPdf = ext === "pdf";
    const isExcel = ext === "xlsx";
    const isDocx = ["docx","doc"].includes(ext);
    const isText = ["txt","html","js","ts","py","css","java"].includes(ext);
    const isEditable = isText || isCsv || isExcel || isDocx || isPdf;

    useEffect(() => {
      const tok = localStorage.getItem("user_token");
      if (isPdf) {
        setLoading(true);
        fetch(`http://localhost:8000/user/leads/${lead.id}/file/pdf/text`, { headers: { Authorization: "Bearer " + tok } })
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(d => { setText(d.text ?? ""); setLoading(false); })
          .catch(() => { setText(""); setLoading(false); });
        return;
      }
      if (isDocx) {
        fetch(fileUrl, { headers: { Authorization: "Bearer " + tok } })
          .then(r => r.arrayBuffer())
          .then(buf => mammoth.convertToHtml({ arrayBuffer: buf }))
          .then(result => setText(result.value))
          .catch(err => console.error(err));
        return;
      }
      if (isExcel) {
        fetch(fileUrl, { headers: { Authorization: "Bearer " + tok } })
          .then(res => res.arrayBuffer())
          .then(data => {
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            setCsvRows(XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][]);
          });
        return;
      }
      if (!isText && !isCsv) return;
      setLoading(true);
      fetch(fileUrl, { headers: { Authorization: "Bearer " + tok } })
        .then(r => { if (!r.ok) throw new Error(); return r.text(); })
        .then(t => {
          if (isCsv) setCsvRows(t.split("\n").filter(Boolean).map(r => r.split(",")));
          else setText(t);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, [fileUrl]);

    const handleEdit = () => {
      setIsEditing(true);
      if (isText || isPdf) setEditText(text || "");
      if (isCsv || isExcel) setEditRows(csvRows.map(r => [...r]));
      setSaveStatus("idle");
    };
    const handleCancel = () => { setIsEditing(false); setSaveStatus("idle"); };
    const handleSave = async () => {
      setSaveStatus("saving");
      const tok = localStorage.getItem("user_token");
      try {
        if (isDocx) {
          const html = docxRef.current?.innerHTML || "";
          const res = await fetch(`http://localhost:8000/user/leads/${lead.id}/file/docx`, { method: "PUT", headers: { Authorization: "Bearer " + tok, "Content-Type": "text/html" }, body: html });
          if (!res.ok) throw new Error(); setText(html);
        } else if (isPdf) {
          const res = await fetch(`http://localhost:8000/user/leads/${lead.id}/file/pdf`, { method: "PUT", headers: { Authorization: "Bearer " + tok, "Content-Type": "text/plain" }, body: editText });
          if (!res.ok) throw new Error(); setText(editText);
        } else if (isCsv) {
          const res = await fetch(`http://localhost:8000/user/leads/${lead.id}/file/csv`, { method: "PUT", headers: { Authorization: "Bearer " + tok, "Content-Type": "text/plain" }, body: editRows.map(r => r.join(",")).join("\n") });
          if (!res.ok) throw new Error(); setCsvRows(editRows);
        } else if (isExcel) {
          const res = await fetch(`http://localhost:8000/user/leads/${lead.id}/file/xlsx`, { method: "PUT", headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify(editRows) });
          if (!res.ok) throw new Error(); setCsvRows(editRows);
        } else {
          const res = await fetch(`http://localhost:8000/user/leads/${lead.id}/file`, { method: "PUT", headers: { Authorization: "Bearer " + tok, "Content-Type": "text/plain" }, body: editText });
          if (!res.ok) throw new Error(); setText(editText);
        }
        setSaveStatus("saved"); setIsEditing(false);
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000); }
    };
    const handleCellChange = (ri: number, ci: number, val: string) => {
      setEditRows(prev => { const n = prev.map(r => [...r]); n[ri][ci] = val; return n; });
    };
    const body = () => {
      if (loading) return <p className={styles.previewLoading}>Loading...</p>;
      if (isImage) return <img src={fileUrl} alt={lead.name} className={styles.previewImg} />;
      if (isPdf) return (<textarea className={styles.editTextarea} value={isEditing ? editText : (text ?? "")} onChange={e => isEditing && setEditText(e.target.value)} readOnly={!isEditing} rows={15} cols={154} />);
      if (isText) return isEditing ? <textarea className={styles.editTextarea} value={editText} onChange={e => setEditText(e.target.value)} rows={15} cols={154} /> : <pre className={styles.previewText}>{text}</pre>;
      if (isDocx) return isEditing ? <div ref={docxRef} className={styles.editDocx} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: text || "" }} /> : <div className={styles.previewText} dangerouslySetInnerHTML={{ __html: text || "" }} />;
      if (isCsv || isExcel) {
        const rows = isEditing ? editRows : csvRows;
        if (isEditing) return (
          <div className={styles.csvTableWrap}>
            <table className={styles.csvTable}>
              <thead><tr>{(rows[0] || []).map((h, i) => <th key={i} className={styles.csvTh}><input className={styles.cellInput} value={h ?? ""} onChange={e => handleCellChange(0, i, e.target.value)} /></th>)}</tr></thead>
              <tbody>{rows.slice(1).map((row, ri) => (<tr key={ri}>{row.map((cell, ci) => <td key={ci} className={styles.csvTd}><input className={styles.cellInput} value={cell ?? ""} onChange={e => handleCellChange(ri + 1, ci, e.target.value)} /></td>)}</tr>))}</tbody>
            </table>
          </div>
        );
        return (
          <div className={styles.csvTableWrap}>
            <table className={styles.csvTable}>
              <thead><tr>{rows[0]?.map((h, i) => <th key={i} className={styles.csvTh}>{String(h ?? "").trim()}</th>)}</tr></thead>
              <tbody>{rows.slice(1).map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j} className={styles.csvTd}>{String(c ?? "").trim()}</td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      }
      return (
        <div className={styles.previewDownload}>
          <span className={styles.fileIconLarge}>📄</span>
          <p className={styles.previewUnsupported}>Preview not available for <strong>.{ext || "unknown"}</strong> files.</p>
          <a href={fileUrl} download className={styles.downloadBtn}>⬇ Download {lead.name}</a>
        </div>
      );
    };
    return (
      <section className={styles.previewSection}>
        <div className={styles.previewHeader}>
          <h2 className={styles.previewTitle}>{lead.name}</h2>
          <div className={styles.previewActions}>
            {saveStatus === "saved" && <span className={styles.savedBadge}>Saved</span>}
            {saveStatus === "error" && <span className={styles.errorBadge}>Save failed!</span>}
            {isEditable && !isEditing && <button className={styles.editBtn} onClick={handleEdit}>Edit</button>}
            {isEditing && (
              <div className={styles.editActions}>
                <button className={styles.saveBtn} onClick={handleSave} disabled={saveStatus === "saving"}>{saveStatus === "saving" ? "Saving…" : "Save"}</button>
                <button className={styles.cancelEditBtn} onClick={handleCancel}>Cancel</button>
              </div>
            )}
            <button className={styles.closeBtn} onClick={onClose}>×</button>
          </div>
        </div>
        <div className={styles.previewBody}>{body()}</div>
      </section>
    );
  };

  const LeadsTable: React.FC<{ data: DataItem[]; onClose: () => void; onView: (item: DataItem) => void }> = ({ data, onClose, onView }) => (
    <section className={styles.leadsTableSection}>
      <div className={styles.leadsTableHeader}>
        <div className={styles.leadsTableTitle}><span>New Leads Documents</span></div>
        <button className={styles.closeBtn} onClick={onClose} title="Close">×</button>
      </div>
      <div className={styles.leadsTableScroll}>
        <table className={styles.leadsTable}>
          <thead>
            <tr className={styles.leadsTableHead}>
              {["ID", "Lead Name", "Action"].map(col => <th key={col} className={styles.leadsTableTh}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={3} className={styles.leadsTableEmpty}>No leads available</td></tr>
            ) : data.map((item, idx) => (
              <tr key={item.id} className={styles.leadsTableRow}>
                <td className={styles.leadsTableTd}><span className={styles.rowIndex}>{String(idx + 1).padStart(1, "0")}</span></td>
                <td className={styles.leadsTableTd}><div className={styles.leadNameCell}><span className={styles.leadName}>{item.name}</span></div></td>
                <td className={styles.leadsTableTd}><button className={styles.viewBtn} onClick={() => onView(item)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const itemsPerPage = 10;
  const dropdown = useRef<HTMLLIElement>(null);

  const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1.5) return null;
    const handleClick = (page: number) => { if (page > 0 && page <= totalPages) onPageChange(page); };
    const getPages = (): (number | "...")[] => {
      if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
      const pages: (number | "...")[] = [];
      const delta = 1; const left = currentPage - delta; const right = currentPage + delta;
      pages.push(1);
      if (left > 2) pages.push("...");
      for (let i = Math.max(2, left); i <= Math.min(totalPages - 1, right); i++) pages.push(i);
      if (right < totalPages - 1) pages.push("...");
      pages.push(totalPages);
      return pages;
    };
    return (
      <div className={styles.pagination}>
        <button className={styles.pageNavBtn} onClick={() => handleClick(currentPage - 1)} disabled={currentPage === 1}>Prev.</button>
        {getPages().map((page, idx) => page === "..." ? (
          <span key={`sep-${idx}`} className={styles.pageSep}>···</span>
        ) : (
          <button key={page} className={`${styles.pageBtn} ${currentPage === page ? styles.pageBtnActive : ""}`} onClick={() => handleClick(page)} disabled={currentPage === page}>{page}</button>
        ))}
        <button className={styles.pageNavBtn} onClick={() => handleClick(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
      </div>
    );
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdown.current && !dropdown.current.contains(e.target as Node)) setShowDropDown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchLeads = async () => {
    try {
      setError("");
      const res = await fetch(`${API}/leads`, { headers: { Authorization: "Bearer " + localStorage.getItem("user_token") } });
      if (!res.ok) throw new Error("Server error");
      const result = await res.json();
      setData(result.leads);
      setTotalPages(Math.ceil(result.leads.length / itemsPerPage));
    } catch (err: any) { console.error(err); }
  };

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleLeadsClick = async (e: any) => {
    setActiveMenu("leads");
    if (data.length === 0) await fetchLeads();
    setShowDropDown(true);
    if (dropdown.current && !dropdown.current.contains(e.target as Node)) {
      setShowDropDown(false);
    }
  };

  const handleLeadSelect = (item: DataItem) => {
    setShowDropDown(false);
    if (item.id === -1) {
      setShowLeadsTable(true);
      setSelectedLead(null);
    } else {
      setSelectedLead(item);
      setShowLeadsTable(true);
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

  const handleLogout = () => setShowConfirm(true);

  return (
    <div>
      <div className={`${styles.container} ${isDark ? styles.dark : styles.light}`}>
        <aside className={styles.sidebar}>
          <div className={styles.logoWrap}>
            <div className={styles.logoIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className={styles.logoText}>Leads Panel</span>
          </div>

          <div className={styles.searchWrap}>
            <SearchIcon />
            <input className={styles.searchInput} placeholder="Search...." />
          </div>

          <nav className={styles.nav}>
            <p className={styles.navLabel}>MAIN MENU</p>
            <ul className={styles.navList}>
              <li className={`${styles.navItem} ${activeMenu === "dashboard" ? styles.active : ""}`} onClick={() => setActiveMenu("dashboard")}>
                <span className={styles.navIcon}><DashboardIcon /></span> Dashboard
                {activeMenu === "dashboard" && <span className={styles.activePill} />}
              </li>
              <li className={`${styles.navItem} ${activeMenu === "New Leads" ? styles.active : ""}`} onClick={() => setActiveMenu("New Leads")}>
                <span className={styles.navIcon}><LeadsIcon /></span> Leads
                {activeMenu === "New Leads" && <span className={styles.activePill} />}
              </li>
              <li ref={dropdown} className={`${styles.leadsNavItem} ${activeMenu === "leads" ? styles.leadsNavItemActive : ""}`}>
                <div className={`${styles.leadsRow} ${activeMenu === "leads" ? styles.leadsRowActive : ""}`} onClick={handleLeadsClick}>
                  <span className={styles.navIcon}><FolderIcon /></span>
                  <span className={styles.leadsRowLabel}> Leads Document</span>
                  {activeMenu === "leads" && <span className={styles.activePill} />}
                </div>
                {error && <div className={styles.leadsError}>{error}</div>}
                <DropDown data={data} show={showDropDown} onSelect={handleLeadSelect} selectedId={showLeadsTable ? -1 : (selectedLead?.id ?? null)}/>
              </li>
              <li className={styles.navItem} onClick={handleLogout} style={{ cursor: "pointer" }}>
                <span className={styles.navIcon}>🔙</span> Logout
              </li>
            </ul>
          </nav>

          <footer className={styles.sidebarFooter}>
            <div className={styles.userInfo}>
              <p className={styles.userName}></p>
              <p className={styles.userRole}></p>
            </div>
          </footer>
        </aside>

        <div className={styles.mainArea}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.headerTitle}>Leads Dashboard</h1>
              <p className={styles.headerSub}>Measure your Leads here.</p>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.themeToggle} onClick={() => setIsDark(!isDark)} title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                <span className={styles.themeTrack}>
                  <span className={`${styles.themeThumb} ${isDark ? styles.thumbRight : styles.thumbLeft}`} />
                </span>
                <span className={styles.themeIcon}>{isDark ? <SunIcon /> : <MoonIcon />}</span>
              </button>
            </div>
          </header>

          <main className={styles.main}>
            <section className={styles.statsGrid}>{[
                { label: "Total Leads", value: totalLeads, color: "purple" },
                { label: "New Leads",   value: newLeads,   color: "cyan" },
                { label: "Converted",  value: converted,  color: "green" },
                { label: "Pending",    value: pending,    color: "amber" },
              ].map(({ label, value }) => (
                <article key={label} className={styles.statCard}>
                  <div className={styles.statTop}>
                    <span className={styles.statLabel}>{label}</span>
                  </div>
                  <span className={styles.statMore}>{value}</span>
                </article>
              ))}
            </section>

            {activeMenu === "New Leads" && (
              <div className={styles.leadsSection}>
                <div className={styles.tablePanelHeader}>
                  <span className={styles.tablePanelTitle}>All Leads</span>
                  <div className={styles.tablePanelActions}>
                    <span className={styles.tableCount}>{leadsData.length} records</span>
                  </div>
                </div>

                {leadsError && (
                  <div className={styles.error}>{leadsError}
                    <button className={styles.retryBtn} onClick={loadLeads}> Retry </button>
                  </div>
                )}

                <div className={styles.tableContainer}>
                  {leadsLoading ? <p className={styles.loading}> Loading Leads... </p> : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Source</th><th>Time</th><th>Reply</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadsData.length === 0 ? (
                          <tr><td colSpan={9} className={styles.emptyTableCell}> No leads found! </td></tr>
                        ) : leadsData.map((lead, index) => (
                          <React.Fragment key={lead.id}>
                            <tr>
                              <td className={styles.indexCell}> {String(index + 1).padStart(2, "0")} </td>
                              <td><div className={styles.userCell}><span className={styles.table}>{lead.username}</span></div></td>
                              <td><span className={styles.emailText}>{lead.email}</span></td>
                              <td className={styles.phoneTd}>{lead.phone}</td>
                              <td className={styles.companyTd}>{lead.company}</td>
                              <td className={styles.sourceTd}>{lead.source}</td>
                              <td className={styles.dateTd}>{lead.created_at}</td>
                              <td>
                                <button onClick={() => toggleReplyPanel(lead.id)} className={expandedReplyLead === lead.id ? styles.replyBtnOpen : styles.replyBtn}>
                                   {expandedReplyLead === lead.id ? "Close" : "Reply"}
                                </button>
                              </td>
                            </tr>
                            {expandedReplyLead === lead.id && (
                              <tr>
                                <td colSpan={8} className={styles.replyPanelCell}>
                                  <UserReplyPanel lead={lead} replies={leadReplies[lead.id] || []} replyMessage={replyMessage} onMessageChange={setReplyMessage}
                                    onSubmit={submitReply} submitting={replySubmitting} successMsg={replySuccess[lead.id]} />
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

            <div className={styles.splitView}>
              {showLeadsTable &&
                <LeadsTable data={paginatedData} onClose={() => setShowLeadsTable(false)}
                  onView={(item) => { setShowDropDown(false); setSelectedLead(item); setShowLeadsTable(true); }} />
              }
              {selectedLead && <FileViewer key={selectedLead.id} lead={selectedLead} onClose={() => setSelectedLead(null)} />}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />

            {showConfirm && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalBox}>
                  <h3>Confirm Logout</h3><p>Are you sure? You Really Want To Logout?</p>
                  <div className={styles.modalActions}>
                    <button onClick={() => { localStorage.removeItem("user_token"); localStorage.removeItem("user_user"); navigate("/login"); }} className={styles.confirmBtn}>Yes, Logout</button>
                    <button onClick={() => setShowConfirm(false)} className={styles.cancelBtn}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}


export default User;
