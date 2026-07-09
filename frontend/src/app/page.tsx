'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Zap, Users, MessageSquare, UserCheck, 
  Database, Phone, Settings, Search, RefreshCw, Upload, 
  Trash2, ChevronRight, TrendingUp, Key, Sun, Moon,
  FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2,
  Menu, X, Bell, MoreVertical, FileText, Download
} from 'lucide-react';
import Papa from 'papaparse';
import VirtualizedTable from '../components/VirtualizedTable';

interface Lead {
  id: string;
  import_session_id: string;
  created_at: string;
  name: string;
  email: string | null;
  country_code: string | null;
  mobile_without_country_code: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lead_owner: string | null;
  crm_status: string;
  crm_note: string | null;
  data_source: string;
  possession_time: string | null;
  description: string | null;
  is_skipped: boolean;
  skip_reason: string | null;
  db_created_at: string;
}

interface ImportSession {
  id: string;
  timestamp: string;
  total: number;
  imported: number;
  skipped: number;
}

export default function AppDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sources' | 'leads' | 'api-settings'>('dashboard');
  const [theme, setTheme] = useState<'corporate' | 'business'>('corporate');
  
  // Settings State
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'heuristic' | 'gemini'>('heuristic');

  // Leads List States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [sessions, setSessions] = useState<ImportSession[]>([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // CSV Preview
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  
  // SSE Importing
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusText, setImportStatusText] = useState('');
  const [importStats, setImportStats] = useState({ total: 0, imported: 0, skipped: 0 });
  const [errorText, setErrorText] = useState('');
  
  // Import Completed
  const [importResultSessionId, setImportResultSessionId] = useState('');
  const [importedLeadsResult, setImportedLeadsResult] = useState<Lead[]>([]);

  // Backend API URL (Direct connection to Cloudflare tunnel to stream SSE properly)
  const API_BASE = 'https://transparency-world-festival-fragrance.trycloudflare.com/api';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'leads') {
        fetchLeads(true);
      } else if (activeTab === 'dashboard') {
        fetchDashboardData();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTab, search, filterStatus, filterSource]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${API_BASE}/leads?limit=5`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
      }
      const sessRes = await fetch(`${API_BASE}/leads/sessions`);
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSessions(sessData);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchLeads = async (reset = false) => {
    setLoadingLeads(true);
    try {
      const currentOffset = reset ? 0 : offset;
      if (reset) setOffset(0);
      
      const query = new URLSearchParams({
        search,
        status: filterStatus,
        source: filterSource,
        limit: limit.toString(),
        offset: currentOffset.toString(),
      });
      const res = await fetch(`${API_BASE}/leads?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (reset) {
          setLeads(data.leads);
        } else {
          setLeads(prev => [...prev, ...data.leads]);
        }
        setLeadsCount(data.totalCount);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleLoadMore = () => {
    setOffset(offset + limit);
    setTimeout(() => fetchLeads(false), 50);
  };

  const handleResetDatabase = async () => {
    if (confirm('Are you sure you want to delete all leads in the database? This cannot be undone.')) {
      try {
        const res = await fetch(`${API_BASE}/leads/reset`, { method: 'DELETE' });
        if (res.ok) {
          fetchLeads(true);
          fetchDashboardData();
        }
      } catch (err) {
        console.error('Reset database failed:', err);
      }
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      try {
        const res = await fetch(`${API_BASE}/leads/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchLeads(true);
          fetchDashboardData();
        }
      } catch (err) {
        console.error('Failed to delete lead', err);
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/leads/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLeads(leads.map(lead => lead.id === id ? { ...lead, crm_status: newStatus } : lead));
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) setSelectedFile(file);
      else alert('Please drop a valid .csv file.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    if (!selectedFile) return;
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      preview: 50,
      complete: (results) => {
        setPreviewData(results.data);
        if (results.meta.fields) setPreviewHeaders(results.meta.fields);
        setModalStep(2);
      },
      error: (err) => alert(`Error parsing CSV: ${err.message}`)
    });
  };

  const handleConfirmImport = () => {
    if (!selectedFile) return;
    setModalStep(3);
    setImportProgress(0);
    setErrorText('');
    setImportStats({ total: 0, imported: 0, skipped: 0 });

    const formData = new FormData();
    formData.append('file', selectedFile);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/import`, true);
    if (apiKey) xhr.setRequestHeader('X-Api-Key', apiKey);
    xhr.setRequestHeader('X-Provider', provider);

    let lastIndex = 0;
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        const newText = xhr.responseText.substring(lastIndex);
        lastIndex = xhr.responseText.length;
        const lines = newText.split('\n\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          const eventMatch = line.match(/^event:\s*(\w+)/m);
          const dataMatch = line.match(/^data:\s*(.+)/m);
          if (eventMatch && dataMatch) {
            const event = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);
            if (event === 'status') {
              setImportStatusText(data.message);
              if (data.totalRecords) setImportStats(prev => ({ ...prev, total: data.totalRecords }));
            } else if (event === 'progress') {
              setImportProgress(data.percent);
              setImportStats({ total: data.total, imported: data.imported, skipped: data.skipped });
            } else if (event === 'complete') {
              setImportResultSessionId(data.importSessionId);
              setImportedLeadsResult(data.leads);
              setModalStep(4);
              fetchLeads(true);
              fetchDashboardData();
            } else if (event === 'error') {
              setErrorText(data.message);
              setModalStep(3);
            }
          }
        }
      }
    };
    xhr.onerror = () => setErrorText('Network error connecting to backend API.');
    xhr.send(formData);
  };

  const handleDownloadTemplate = () => {
    const csvContent = 
      "Lead Date,Lead Name,Contact Email,Mobile Number,Company,City,State,Country,Source,Lead Status,Notes,Description\n" +
      "2026-07-09 10:00:00,John Doe,john.doe@example.com,+91 9876543210,GrowEasy,Mumbai,Maharashtra,India,leads_on_demand,GOOD_LEAD_FOLLOW_UP,Client is asking to reschedule demo,Interested in CRM\n" +
      "2026-07-08 14:30:00,Emily Smith,emily.smith@techcorp.com,+1 415-555-0198,TechCorp,San Francisco,CA,USA,meridian_tower,SALE_DONE,Contract signed today,Enterprise tier upgrade\n" +
      "2026-07-07 09:15:00,Raj Patel,raj.patel@startup.in,9811223344,Startup Inc,Bangalore,Karnataka,India,eden_park,DID_NOT_CONNECT,Left voicemail,Needs real estate software\n" +
      "2026-07-06 16:45:00,Sarah Connor,sarah@skynet.com,555-010-9999,Cyberdyne,Los Angeles,CA,USA,leads_on_demand,BAD_LEAD,Not interested in our services,Remove from list\n" +
      "2026-07-05 11:20:00,Michael Chang,mike.c@agency.co.uk,+44 7911 123456,Creative Agency,London,ENG,UK,varah_swamy,GOOD_LEAD_FOLLOW_UP,Sent pricing PDF,Follow up next Tuesday\n" +
      "2026-07-04 13:00:00,Anita Desai,adesai@buildco.com,+91 9000000001,BuildCo,Pune,Maharashtra,India,sarjapur_plots,GOOD_LEAD_FOLLOW_UP,Wants a product demo,Looking for integration\n" +
      "2026-07-03 15:55:00,David Kim,dkim@logistics.net,+82 10-1234-5678,Logistics Net,Seoul,Seoul,South Korea,meridian_tower,DID_NOT_CONNECT,Email bounced,Check if phone works\n" +
      "2026-07-02 08:30:00,Laura Martinez,l.martinez@retail.es,+34 600 11 22 33,Retail SL,Madrid,Madrid,Spain,eden_park,SALE_DONE,Payment received,Onboarding tomorrow\n" +
      "2026-07-01 17:10:00,Omar Hassan,omar.hassan@finance.ae,+971 50 123 4567,Finance Group,Dubai,Dubai,UAE,leads_on_demand,GOOD_LEAD_FOLLOW_UP,Needs approval from boss,High value prospect\n" +
      "2026-06-30 10:45:00,Chloe Dubois,chloe.d@design.fr,+33 6 12 34 56 78,Design FR,Paris,IDF,France,varah_swamy,BAD_LEAD,Budget too small,Disqualified\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "groweasy_leads_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setPreviewData([]);
    setImportProgress(0);
    setModalStep(1);
  };

  return (
    <div className="drawer lg:drawer-open bg-base-200 min-h-screen text-base-content font-sans">
      <input id="main-drawer" type="checkbox" className="drawer-toggle" />
      
      {/* MAIN CONTENT AREA */}
      <div className="drawer-content flex flex-col h-screen overflow-hidden">
        
        {/* HEADER NAVBAR */}
        <div className="navbar bg-base-100 border-b border-base-200 sticky top-0 z-30 shadow-sm h-16 px-4">
          <div className="flex-none lg:hidden">
            <label htmlFor="main-drawer" aria-label="open sidebar" className="btn btn-square btn-ghost">
              <Menu size={24} />
            </label>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold ml-2">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'leads' && 'Lead Management'}
              {activeTab === 'sources' && 'Lead Sources Integration'}
              {activeTab === 'api-settings' && 'Platform Settings'}
            </h1>
          </div>
          <div className="flex-none gap-4">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              {apiKey ? (
                <div className="badge badge-success gap-1 badge-outline font-medium"><Key size={12}/> Custom API Key</div>
              ) : (
                <div className="badge badge-warning gap-1 badge-outline font-medium"><Settings size={12}/> Heuristics Active</div>
              )}
            </div>
            
            {/* Theme Controller */}
            <label className="swap swap-rotate btn btn-ghost btn-circle">
              <input type="checkbox" onChange={(e) => setTheme(e.target.checked ? 'business' : 'corporate')} checked={theme === 'business'} />
              <Sun className="swap-off fill-current w-5 h-5" />
              <Moon className="swap-on fill-current w-5 h-5" />
            </label>

            <button className="btn btn-ghost btn-circle">
              <div className="indicator">
                <Bell size={20} />
                <span className="badge badge-xs badge-primary indicator-item"></span>
              </div>
            </button>
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full border border-base-300">
                  <img src="/profile.jpeg" alt="Divyansh Joshi" />
                </div>
              </div>
              <ul tabIndex={0} className="mt-3 z-50 p-2 shadow-2xl menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-base-300">
                <li><a>Profile</a></li>
                <li><a>Settings</a></li>
                <li><a>Logout</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* SCROLLABLE MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-base-200">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="stats shadow w-full bg-base-100 border border-base-200">
                <div className="stat">
                  <div className="stat-figure text-primary"><Users size={32} /></div>
                  <div className="stat-title font-medium">Total Mapped Leads</div>
                  <div className="stat-value text-primary">1,248</div>
                  <div className="stat-desc font-medium text-success flex items-center gap-1 mt-1"><TrendingUp size={14}/> 12% more than last week</div>
                </div>
                
                <div className="stat">
                  <div className="stat-figure text-secondary"><Zap size={32} /></div>
                  <div className="stat-title font-medium">Integration Mode</div>
                  <div className="stat-value text-secondary capitalize">{provider}</div>
                  <div className="stat-desc mt-1"><a className="link link-hover text-secondary" onClick={() => setActiveTab('api-settings')}>Configure Settings</a></div>
                </div>
                
                <div className="stat">
                  <div className="stat-figure text-accent"><FileText size={32} /></div>
                  <div className="stat-title font-medium">Recent Uploads</div>
                  <div className="stat-value text-accent">{sessions.length}</div>
                  <div className="stat-desc mt-1"><a className="link link-hover text-accent" onClick={() => setActiveTab('sources')}>Import New CSV</a></div>
                </div>
              </div>

              <div className="card bg-base-100 shadow-sm border border-base-200">
                <div className="card-body p-6">
                  <h2 className="card-title text-lg mb-4">Recent Import History</h2>
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead>
                        <tr className="bg-base-200 text-base-content/70">
                          <th>Session ID</th>
                          <th>Import Date</th>
                          <th>Total Rows</th>
                          <th className="text-success">Imported</th>
                          <th className="text-error">Skipped</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.length === 0 ? (
                          <tr><td colSpan={6} className="text-center py-8 text-base-content/50">No import sessions found. Upload a CSV to begin.</td></tr>
                        ) : (
                          sessions.map(sess => (
                            <tr key={sess.id}>
                              <td className="font-mono text-xs max-w-[120px] truncate opacity-80">{sess.id}</td>
                              <td>{sess.timestamp ? new Date(sess.timestamp).toLocaleString() : 'Just now'}</td>
                              <td className="font-semibold">{sess.total}</td>
                              <td className="font-bold text-success">{sess.imported}</td>
                              <td className="font-bold text-error">{sess.skipped}</td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-outline btn-primary"
                                  onClick={() => {
                                    setFilterSource(''); setFilterStatus(''); setSearch('');
                                    const url = new URLSearchParams({ sessionId: sess.id });
                                    setActiveTab('leads');
                                    setTimeout(() => {
                                      fetch(`${API_BASE}/leads?${url.toString()}`).then(res => res.json()).then(data => { setLeads(data.leads); setLeadsCount(data.totalCount); });
                                    }, 100);
                                  }}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LEAD SOURCES */}
          {activeTab === 'sources' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="prose prose-sm max-w-none mb-8">
                <h2 className="text-2xl font-bold mb-1">Lead Channels</h2>
                <p className="text-base-content/70">Connect and map your external lead sources securely into the CRM.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="card bg-base-100 shadow-md border-t-4 border-t-primary hover:shadow-lg transition-all duration-300">
                  <div className="card-body">
                    <div className="bg-primary/10 text-primary w-12 h-12 rounded-xl flex items-center justify-center mb-2">
                      <Upload size={24} />
                    </div>
                    <h3 className="card-title">CSV Lead Import</h3>
                    <p className="text-sm text-base-content/70 mt-1 mb-4">Upload raw CSV files from any source. Our AI engine instantly parses and maps columns automatically.</p>
                    <div className="card-actions justify-start mt-auto">
                      <button onClick={() => setIsModalOpen(true)} className="btn btn-primary shadow-sm">Start Import</button>
                    </div>
                  </div>
                </div>

                <div className="card bg-base-100 border border-base-200 opacity-70 hover:opacity-100 transition-opacity">
                  <div className="card-body">
                    <div className="bg-info/10 text-info w-12 h-12 rounded-xl flex items-center justify-center mb-2">
                      <Database size={24} />
                    </div>
                    <h3 className="card-title">Google Ads</h3>
                    <p className="text-sm text-base-content/70 mt-1 mb-4">Sync leads directly via Google AdWords webhook integrations.</p>
                    <div className="card-actions justify-start mt-auto">
                      <div className="badge badge-neutral">Coming Soon</div>
                    </div>
                  </div>
                </div>

                <div className="card bg-base-100 border border-base-200 opacity-70 hover:opacity-100 transition-opacity">
                  <div className="card-body">
                    <div className="bg-success/10 text-success w-12 h-12 rounded-xl flex items-center justify-center mb-2">
                      <Zap size={24} />
                    </div>
                    <h3 className="card-title">Meta Lead Ads</h3>
                    <p className="text-sm text-base-content/70 mt-1 mb-4">Direct mapping from Facebook and Instagram lead generation campaigns.</p>
                    <div className="card-actions justify-start mt-auto">
                      <div className="badge badge-neutral">Coming Soon</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANAGE LEADS */}
          {activeTab === 'generate' && (
            <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto h-full animate-fade-in pb-12">
              <div className="bg-base-100 p-8 rounded-xl border border-base-200 shadow-sm text-center">
                <Zap size={48} className="mx-auto text-primary mb-4" />
                <h2 className="text-2xl font-bold mb-2">Lead Generation Studio</h2>
                <p className="text-base-content/70 max-w-lg mx-auto mb-6">Create AI-powered lead magnets and ad campaigns directly from your CRM. Leads captured will automatically flow into your database.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <div className="p-6 border border-base-300 rounded-lg hover:border-primary cursor-pointer transition-colors">
                    <h3 className="font-semibold text-lg">Facebook Lead Ads</h3>
                    <p className="text-sm text-base-content/60 mt-1">Connect your Meta account</p>
                    <button className="btn btn-primary btn-sm mt-4 w-full">Connect</button>
                  </div>
                  <div className="p-6 border border-base-300 rounded-lg hover:border-primary cursor-pointer transition-colors">
                    <h3 className="font-semibold text-lg">Website Form Builder</h3>
                    <p className="text-sm text-base-content/60 mt-1">Generate an embeddable form</p>
                    <button className="btn btn-primary btn-sm mt-4 w-full">Create Form</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'engage' && (
            <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto h-full animate-fade-in pb-12">
              <div className="bg-base-100 p-8 rounded-xl border border-base-200 shadow-sm text-center">
                <MessageSquare size={48} className="mx-auto text-info mb-4" />
                <h2 className="text-2xl font-bold mb-2">Automated Engagement</h2>
                <p className="text-base-content/70 max-w-lg mx-auto mb-6">Set up email drip campaigns and automated WhatsApp follow-ups for your fresh leads.</p>
                <div className="bg-base-200 rounded-lg p-4 max-w-2xl mx-auto text-left flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-base-content">Welcome Series (Real Estate)</h4>
                    <p className="text-xs text-base-content/60">3 emails over 7 days</p>
                  </div>
                  <button className="btn btn-info btn-sm">Edit Sequence</button>
                </div>
                <div className="bg-base-200 rounded-lg p-4 max-w-2xl mx-auto text-left flex justify-between items-center mt-3">
                  <div>
                    <h4 className="font-semibold text-base-content">WhatsApp Follow-up Bot</h4>
                    <p className="text-xs text-base-content/60">Triggers immediately on import</p>
                  </div>
                  <button className="btn btn-info btn-sm">Configure</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="max-w-[1400px] mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
              
              <div className="bg-base-100 p-4 rounded-xl shadow-sm border border-base-200 flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="relative w-full lg:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by name, email, phone..." 
                    className="input input-bordered w-full pl-10 bg-base-200/50"
                    value={search} onChange={(e) => setSearch(e.target.value)} 
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  <select className="select select-bordered bg-base-200/50" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="GOOD_LEAD_FOLLOW_UP">Good Lead</option>
                    <option value="DID_NOT_CONNECT">Did Not Connect</option>
                    <option value="BAD_LEAD">Bad Lead</option>
                    <option value="SALE_DONE">Sale Done</option>
                  </select>

                  <select className="select select-bordered bg-base-200/50" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
                    <option value="">All Sources</option>
                    <option value="leads_on_demand">Leads On Demand</option>
                    <option value="meridian_tower">Meridian Tower</option>
                    <option value="eden_park">Eden Park</option>
                    <option value="varah_swamy">Varah Swamy</option>
                    <option value="sarjapur_plots">Sarjapur Plots</option>
                  </select>

                  <button className="btn btn-square btn-outline btn-neutral" onClick={() => fetchLeads(true)} title="Refresh">
                    <RefreshCw size={18} className={loadingLeads ? 'animate-spin' : ''} />
                  </button>

                  <div className="flex gap-2">
                  <button 
                    className="btn btn-outline btn-info gap-2"
                    onClick={() => {
                      if (leads.length === 0) return alert('No leads to export.');
                      const headers = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Source', 'Notes'];
                      const csvContent = [
                        headers.join(','),
                        ...leads.map(l => [
                          `"${l.name || ''}"`,
                          `"${l.email || ''}"`,
                          `"${l.mobile_without_country_code || ''}"`,
                          `"${l.company || ''}"`,
                          `"${l.crm_status || ''}"`,
                          `"${l.data_source || ''}"`,
                          `"${l.crm_note || ''}"`
                        ].join(','))
                      ].join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download size={16} /> Export CSV
                  </button>
                  <button className="btn btn-outline btn-error gap-2" onClick={handleResetDatabase}>
                    <Trash2 size={16} /> Reset DB
                  </button>
                </div>
                </div>
              </div>

              <div className="flex-1 bg-base-100 rounded-xl shadow-sm border border-base-200 p-4 flex flex-col min-h-[500px]">
                <div className="flex justify-between items-center mb-4 px-2">
                  <div className="text-sm font-medium">
                    Showing <span className="font-bold text-primary">{leads.length}</span> of <span className="font-bold">{leadsCount}</span> records
                  </div>
                  <div className="text-xs text-base-content/50 hidden md:block">Scroll to view all columns</div>
                </div>

                <div className="flex-1 border border-base-200 rounded-lg overflow-hidden bg-base-100">
                  <VirtualizedTable
                    height="100%"
                    rowHeight={56}
                    data={leads}
                    columns={[
                      { key: 'name', header: 'Lead Name', width: '200px', render: (val) => <div className="font-semibold">{val || 'Unknown'}</div> },
                      { key: 'email', header: 'Email Address', width: '220px' },
                      { key: 'mobile_without_country_code', header: 'Contact', width: '180px', render: (val, row) => <span>{row.country_code ? `${row.country_code} ` : ''}{val || '—'}</span> },
                      { key: 'company', header: 'Company', width: '160px' },
                      { key: 'crm_status', header: 'Status', width: '200px', render: (val, row) => (
                          <select 
                            className={`select select-xs w-full max-w-xs ${
                              val === 'SALE_DONE' ? 'select-success' : 
                              val === 'GOOD_LEAD_FOLLOW_UP' ? 'select-info' : 
                              val === 'DID_NOT_CONNECT' ? 'select-warning' : 
                              val === 'BAD_LEAD' ? 'select-error' : ''
                            }`}
                            value={val || ''}
                            onChange={(e) => handleStatusChange(row.id, e.target.value)}
                          >
                            <option value="GOOD_LEAD_FOLLOW_UP">Good Lead</option>
                            <option value="DID_NOT_CONNECT">Not Connected</option>
                            <option value="BAD_LEAD">Bad Lead</option>
                            <option value="SALE_DONE">Sale Done</option>
                          </select>
                        )
                      },
                      { key: 'data_source', header: 'Source', width: '160px', render: (val) => <span className="badge badge-neutral font-mono text-[10px]">{val || '—'}</span> },
                      { key: 'crm_note', header: 'Notes', width: '300px', render: (val) => <span className="text-sm truncate block max-w-[280px]" title={val}>{val || '—'}</span> },
                      { key: 'actions', header: 'Actions', width: '100px', render: (_, row) => (
                        <button onClick={() => handleDeleteLead(row.id)} className="btn btn-ghost btn-xs text-error" title="Delete Lead">
                          <Trash2 size={14} />
                        </button>
                      )}
                    ]}
                  />
                </div>

                {leads.length < leadsCount && (
                  <div className="flex justify-center mt-4">
                    <button onClick={handleLoadMore} disabled={loadingLeads} className="btn btn-neutral btn-wide">
                      {loadingLeads ? <><span className="loading loading-spinner"></span> Loading</> : 'Load More Records'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* SIDEBAR DRAWER */}
      <div className="drawer-side z-40">
        <label htmlFor="main-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
        <aside className="bg-base-100 text-base-content min-h-screen w-72 flex flex-col border-r border-base-200">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-content text-xl shadow-lg shadow-primary/30">
              G
            </div>
            <div>
              <h2 className="font-bold text-xl tracking-tight leading-none">GrowEasy</h2>
              <span className="text-xs text-base-content/60 font-semibold tracking-widest uppercase">CRM Platform</span>
            </div>
          </div>
          
          <ul className="menu p-4 w-full flex-1 gap-1">
            <li className="menu-title text-base-content/50 font-semibold tracking-wider text-[10px] uppercase mt-2 mb-1">Overview</li>
            <li><a className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}><LayoutDashboard size={18} /> Dashboard</a></li>
            <li><a className={activeTab === 'leads' ? 'active' : ''} onClick={() => setActiveTab('leads')}><Users size={18} /> Manage Leads</a></li>
            <li><a className={activeTab === 'generate' ? 'active font-semibold' : ''} onClick={() => setActiveTab('generate')}><Zap size={18} /> Generate Leads</a></li>
            <li><a className={activeTab === 'engage' ? 'active font-semibold' : ''} onClick={() => setActiveTab('engage')}><MessageSquare size={18} /> Engage Leads</a></li>
            
            <div className="divider my-2"></div>
            
            <li className="menu-title text-base-content/50 font-semibold tracking-wider text-[10px] uppercase mt-2 mb-1">Integration</li>
            <li><a className={activeTab === 'sources' ? 'active' : ''} onClick={() => setActiveTab('sources')}><Database size={18} /> Lead Sources</a></li>
            <li><a className={activeTab === 'api-settings' ? 'active' : ''} onClick={() => setActiveTab('api-settings')}><Settings size={18} /> API Settings</a></li>
          </ul>

          <div className="p-4 m-4 bg-base-200 rounded-xl border border-base-300">
            <div className="flex items-center gap-3">
              <div className="avatar">
                <div className="w-10 rounded-full border border-base-300">
                  <img src="/profile.jpeg" alt="Divyansh Joshi" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold">Divyansh Joshi</h4>
                <p className="text-xs text-base-content/60">Admin User</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* IMPORT MODAL */}
      <dialog className={`modal ${isModalOpen ? 'modal-open' : ''} modal-bottom sm:modal-middle`}>
        <div className="modal-box w-11/12 max-w-4xl bg-base-100 shadow-2xl p-0 overflow-hidden rounded-2xl flex flex-col h-[85vh] sm:h-auto max-h-[800px]">
          
          <div className="px-6 py-4 border-b border-base-200 flex justify-between items-center bg-base-200/30">
            <div>
              <h3 className="font-bold text-xl">Import Leads</h3>
              <p className="text-xs text-base-content/60 mt-1">Upload your CSV and let our AI handle the mapping.</p>
            </div>
            <button onClick={handleCloseModal} className="btn btn-circle btn-ghost btn-sm"><X size={20} /></button>
          </div>

          <div className="px-6 py-6 bg-base-100">
            <ul className="steps steps-horizontal w-full text-xs font-semibold">
              <li className={`step ${modalStep >= 1 ? 'step-primary' : ''}`}>Upload CSV</li>
              <li className={`step ${modalStep >= 2 ? 'step-primary' : ''}`}>Preview Data</li>
              <li className={`step ${modalStep >= 3 ? 'step-primary' : ''}`}>AI Extraction</li>
              <li className={`step ${modalStep >= 4 ? 'step-primary' : ''}`}>Complete</li>
            </ul>
          </div>

          <div className="p-8 flex-1 overflow-y-auto bg-base-100 relative">
            
            {modalStep === 1 && (
              <div className="animate-in fade-in duration-300 h-full flex flex-col justify-center">
                <div 
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-base-300 hover:border-primary/50'}`}
                >
                  <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 transition-colors ${isDragging ? 'bg-primary text-primary-content shadow-lg shadow-primary/30' : 'bg-base-200 text-base-content/50'}`}>
                    <FileSpreadsheet size={36} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Drag & Drop your CSV file here</h3>
                  <p className="text-base-content/60 mb-6 text-sm">or click to browse from your computer</p>
                  
                  <div className="flex flex-col items-center gap-4">
                    <input type="file" id="csvUpload" accept=".csv" className="hidden" onChange={handleFileSelect} />
                    <label htmlFor="csvUpload" className="btn btn-primary px-8 shadow-md">Browse Files</label>
                    
                    {selectedFile && (
                      <div className="p-4 bg-success/10 text-success rounded-xl border border-success/20 inline-flex items-center gap-3">
                        <CheckCircle2 size={20} />
                        <span className="font-medium">{selectedFile.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-8 flex justify-between items-center bg-base-200/50 p-4 rounded-xl">
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-sm font-semibold opacity-70">Need a sample file?</span>
                    <button onClick={handleDownloadTemplate} className="btn btn-outline btn-sm btn-primary">
                      Download Sample Template
                    </button>
                  </div>
                  <button onClick={handleUploadClick} disabled={!selectedFile} className="btn btn-neutral px-8 h-12">
                    Next Step <ChevronRight size={18}/>
                  </button>
                </div>
              </div>
            )}

            {modalStep === 2 && (
              <div className="animate-in slide-in-from-right-8 duration-300 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-lg">Data Preview</h4>
                  <div className="badge badge-neutral gap-1"><Database size={14}/> {previewData.length} rows detected</div>
                </div>
                
                <div className="flex-1 overflow-auto border border-base-200 rounded-xl bg-base-200/30">
                  <table className="table table-xs table-pin-rows table-zebra">
                    <thead>
                      <tr>{previewHeaders.map((h, i) => <th key={i} className="bg-base-200 font-semibold">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((row, idx) => (
                        <tr key={idx}>{previewHeaders.map((h, i) => <td key={i} className="whitespace-nowrap max-w-[200px] truncate">{row[h] || '—'}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 text-xs text-base-content/50 italic text-center mb-6">Previewing first 10 rows. AI will map these columns automatically.</div>
                
                <div className="flex justify-between mt-auto">
                  <button onClick={() => setModalStep(1)} className="btn btn-outline btn-neutral">Back</button>
                  <button onClick={handleConfirmImport} className="btn btn-primary shadow-lg shadow-primary/30">Start AI Import Pipeline</button>
                </div>
              </div>
            )}

            {modalStep === 3 && (
              <div className="animate-in fade-in duration-500 h-full flex flex-col items-center justify-center max-w-md mx-auto text-center py-12">
                {errorText ? (
                  <div className="text-error flex flex-col items-center">
                    <AlertTriangle size={64} className="mb-4" />
                    <h4 className="text-xl font-bold mb-2">Import Failed</h4>
                    <p className="bg-error/10 p-4 rounded-xl border border-error/20 text-sm">{errorText}</p>
                    <button onClick={() => setModalStep(1)} className="btn btn-outline mt-6">Try Again</button>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-8">
                      <div className="radial-progress text-primary transition-all duration-300" style={{"--value": importProgress, "--size": "8rem", "--thickness": "8px"} as any}>
                        <span className="font-bold text-xl text-base-content">{importProgress}%</span>
                      </div>
                    </div>
                    
                    <h4 className="text-lg font-bold mb-2">{importStatusText || 'Initializing AI Engine...'}</h4>
                    <p className="text-base-content/60 text-sm mb-8">Please don't close this window while we process the records.</p>
                    
                    {importStats.total > 0 && (
                      <div className="stats shadow bg-base-200 border border-base-300 w-full">
                        <div className="stat place-items-center p-3">
                          <div className="stat-title text-[10px] uppercase">Processed</div>
                          <div className="stat-value text-lg">{importStats.imported + importStats.skipped} / {importStats.total}</div>
                        </div>
                        <div className="stat place-items-center p-3 text-success">
                          <div className="stat-title text-[10px] uppercase">Valid</div>
                          <div className="stat-value text-lg">{importStats.imported}</div>
                        </div>
                        <div className="stat place-items-center p-3 text-error">
                          <div className="stat-title text-[10px] uppercase">Skipped</div>
                          <div className="stat-value text-lg">{importStats.skipped}</div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {modalStep === 4 && (
              <div className="animate-in zoom-in-95 duration-500 h-full flex flex-col items-center justify-center text-center py-8">
                <div className="w-24 h-24 bg-success/20 text-success rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-3xl font-bold mb-2">Import Complete!</h3>
                <p className="text-base-content/60 mb-8 max-w-md">The AI successfully mapped and imported your leads into the database.</p>
                
                <div className="stats shadow border border-base-200 w-full max-w-lg mb-8 bg-base-200">
                  <div className="stat place-items-center">
                    <div className="stat-title text-success font-bold">Successfully Imported</div>
                    <div className="stat-value text-success text-4xl">{importedLeadsResult.filter(l => !l.is_skipped).length}</div>
                  </div>
                  <div className="stat place-items-center border-l border-base-300">
                    <div className="stat-title text-error font-bold">Skipped (Invalid)</div>
                    <div className="stat-value text-error text-4xl">{importedLeadsResult.filter(l => l.is_skipped).length}</div>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    handleCloseModal();
                    setFilterSource(''); setFilterStatus(''); setSearch('');
                    setActiveTab('leads');
                  }} 
                  className="btn btn-primary px-12 shadow-lg shadow-primary/30"
                >
                  View Imported Leads
                </button>
              </div>
            )}
          </div>
        </div>
        <form method="dialog" className="modal-backdrop bg-black/40 backdrop-blur-sm">
          <button onClick={handleCloseModal}>close</button>
        </form>
      </dialog>
    </div>
  );
}
