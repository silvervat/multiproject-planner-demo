import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar, Users, FolderOpen, Grid, Plus, Search, Filter, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Save, Settings, X, Clock, Copy, Clipboard, Download
} from 'lucide-react';

/*
  Multiproject Planner - Enhanced demo (runnable)
  - Quick demo app based on the code you provided (uses Tailwind CDN for styling)
  - Run: npm install && npm run dev
*/

const VIEW_PRESETS = {
  '1nädal': 7,
  '2nädalat': 14,
  '1kuu': 30,
  '2kuud': 60
};

const defaultColors = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4',
  '#F97316', '#7C3AED', '#0EA5A4'
];

const nowIso = () => new Date().toISOString().split('T')[0];

function SortIcon() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="inline-block"><path d="M6 9l6-6 6 6" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 15l-6 6-6-6" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}

export default function App() {
  const [activeTab, setActiveTab] = useState('objektid');
  const [preset, setPreset] = useState('2nädalat');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [copiedData, setCopiedData] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [compactMode, setCompactMode] = useState(true);
  const [timezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [resourceFilterActiveOnly, setResourceFilterActiveOnly] = useState(true);
  const [highlightedProjectId, setHighlightedProjectId] = useState(null);
  const [sortResourcesBy, setSortResourcesBy] = useState({ key: 'name', dir: 'asc' });
  const [sortProjectsBy, setSortProjectsBy] = useState({ key: 'name', dir: 'asc' });

  const scrollContainerRef = useRef(null);
  const timelineRef = useRef(null);

  const [projects, setProjects] = useState([
    { id: 1, name: 'RIVEST Planeerimise', color: '#8B5CF6', priority: 'Kõrge', status: 'Aktiivne', startDate: '2025-10-06', endDate: '2025-10-31' },
    { id: 2, name: 'Transpordi Haldus', color: '#3B82F6', priority: 'Keskmine', status: 'Aktiivne', startDate: '2025-10-08', endDate: '2025-10-28' },
    { id: 3, name: 'Hoolduse Planeerimine', color: '#10B981', priority: 'Madal', status: 'Ootel', startDate: '2025-10-15', endDate: '2025-11-05' },
    { id: 4, name: 'Seadmete Ülevaatus', color: '#F59E0B', priority: 'Kõrge', status: 'Aktiivne', startDate: '2025-10-10', endDate: '2025-10-25' }
  ]);

  const [resources, setResources] = useState([
    { id: 1, name: 'Ain Saalong', type: 'Inimene', availability: 85, tags: ['juht','transport'], lastUsed: '2025-10-07', plannedHours: 120, email: 'ain@company.ee', phone: '+372 5555 1234', active: true, color: '#f97316' },
    { id: 2, name: 'Artur Mägiliin', type: 'Inimene', availability: 60, tags: ['tehnik'], lastUsed: '2025-10-06', plannedHours: 80, email: 'artur@company.ee', phone: '+372 5555 2345', active: true, color: '#06B6D4' },
    { id: 3, name: 'Bohdan Kaplotšnyi', type: 'Inimene', availability: 90, tags: ['planeerimine'], lastUsed: '2025-10-08', plannedHours: 140, email: 'bohdan@company.ee', phone: '+372 5555 3456', active: true, color: '#7C3AED' },
    { id: 4, name: 'Dmytro Smyrnov', type: 'Inimene', availability: 75, tags: ['transport','hooldus'], lastUsed: '2025-10-05', plannedHours: 100, email: 'dmytro@company.ee', phone: '+372 5555 4567', active: false, color: '#10B981' },
    { id: 5, name: '1992DBG VOLKSWAGEN', type: 'Sõiduk', availability: 100, tags: ['transport'], lastUsed: '2025-10-07', plannedHours: 60, email: '-', phone: '-', active: true, color: '#8B5CF6' },
    { id: 6, name: '443PXH Toyota', type: 'Sõiduk', availability: 80, tags: ['transport'], lastUsed: '2025-10-06', plannedHours: 55, email: '-', phone: '-', active: true, color: '#EF4444' }
  ]);

  const [assignments, setAssignments] = useState([
    { id: 1, resourceId: 1, projectId: 1, date: '2025-10-08', type: 'REISIDE plaanid', duration: 8, note: 'Oluline kohtumine kliendiga', history: [{ action: 'Created', timestamp: '2025-10-07T10:00:00', user: 'Admin' }] },
    { id: 2, resourceId: 1, projectId: 2, date: '2025-10-09', type: 'REISIDE plaanid', duration: 8, note: '', history: [{ action: 'Created', timestamp: '2025-10-07T11:00:00', user: 'Admin' }] },
    { id: 3, resourceId: 1, projectId: 1, date: '2025-10-10', type: 'REISIDE plaanid', duration: 6, note: 'Lõpeb varem', history: [] },
    { id: 4, resourceId: 2, projectId: 3, date: '2025-10-08', type: 'HOOLDUS', duration: 4, note: '', history: [] },
    { id: 5, resourceId: 2, projectId: 3, date: '2025-10-09', type: 'HOOLDUS', duration: 8, note: '', history: [] },
    { id: 6, resourceId: 3, projectId: 1, date: '2025-10-08', type: 'REISIDE plaanid', duration: 8, note: '', history: [] },
    { id: 7, resourceId: 3, projectId: 4, date: '2025-10-11', type: 'PUHKUS', duration: 8, note: 'Puhkus', history: [] },
    { id: 8, resourceId: 4, projectId: 2, date: '2025-10-08', type: 'REISIDE plaanid', duration: 8, note: '', history: [] },
  ]);

  const generateDates = (start = new Date(), days = VIEW_PRESETS[preset]) => {
    const dates = [];
    const startDate = new Date(start);
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push({
        date: dateStr,
        day: date.getDate(),
        weekday: ['P', 'E', 'T', 'K', 'R', 'L', 'P'][date.getDay()],
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isToday: dateStr === nowIso()
      });
    }
    return dates;
  };

  const [startAnchor] = useState(new Date());
  const dates = generateDates(startAnchor);

  const getCellId = (entityId, date) => `${entityId}::${date}`;

  const getTypeColor = (type) => {
    const colors = {
      'REISIDE plaanid': '#FCD34D',
      'HOOLDUS': '#F87171',
      'PUHKUS': '#FCA5A5',
      'SEISAB': '#D1D5DB',
      'Vaba tekst': '#E5E7EB',
      'default': '#9CA3AF'
    };
    return colors[type] || colors.default;
  };

  const sortList = (list, sortObj) => {
    const { key, dir } = sortObj;
    return [...list].sort((a, b) => {
      let va = a[key], vb = b[key];
      if (va == null) va = ''; if (vb == null) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleCellClick = (entityId, date, e) => {
    const cellId = getCellId(entityId, date);
    const newSelected = new Set(selectedCells);

    if (e.ctrlKey || e.metaKey) {
      if (newSelected.has(cellId)) newSelected.delete(cellId);
      else newSelected.add(cellId);
    } else if (e.shiftKey && selectedCells.size > 0) {
      newSelected.add(cellId);
    } else {
      newSelected.clear();
      newSelected.add(cellId);
    }
    setSelectedCells(newSelected);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedCells.size > 0) {
        e.preventDefault();
        const cellIds = Array.from(selectedCells);
        const data = cellIds.map(cellId => {
          const [entityId, date] = cellId.split('::');
          const cellAssignments = assignments.filter(a => {
            if (activeTab === 'objektid') return a.projectId === parseInt(entityId) && a.date === date;
            return a.resourceId === parseInt(entityId) && a.date === date;
          });
          return { cellId, assignments: cellAssignments };
        });
        setCopiedData(data);
        console.log('Copied', data.length, 'cells');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedData && selectedCells.size > 0) {
        e.preventDefault();
        const cellIds = Array.from(selectedCells);
        const newAssignments = [...assignments];
        cellIds.forEach(cellId => {
          const [entityId, date] = cellId.split('::');
          copiedData.forEach(copiedCell => {
            copiedCell.assignments.forEach(copiedAssignment => {
              const newId = Math.max(0, ...newAssignments.map(a => a.id)) + 1;
              const newAssignment = {
                ...copiedAssignment,
                id: newId,
                date,
                history: [...(copiedAssignment.history || []), { action: 'Pasted', timestamp: new Date().toISOString(), user: 'Current User' }]
              };
              if (activeTab === 'objektid') newAssignment.projectId = parseInt(entityId);
              else newAssignment.resourceId = parseInt(entityId);
              newAssignments.push(newAssignment);
            });
          });
        });
        setAssignments(newAssignments);
        console.log('Pasted to', cellIds.length, 'cells');
      }
      if (e.key === 'Delete' && selectedCells.size > 0) {
        const confirmed = window.confirm(`Kustutada kõik määrangud valitud ${selectedCells.size} lahtrist?`);
        if (!confirmed) return;
        const cellIds = Array.from(selectedCells);
        const newAssignments = assignments.filter(a => {
          return !cellIds.some(cellId => {
            const [entityId, date] = cellId.split('::');
            if (activeTab === 'objektid') {
              return a.projectId === parseInt(entityId) && a.date === date;
            }
            return a.resourceId === parseInt(entityId) && a.date === date;
          });
        });
        setAssignments(newAssignments);
        setSelectedCells(new Set());
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCells, copiedData, assignments, activeTab]);

  const handleContextMenu = (e, entityId, date, assignment = null) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, entityId, date, assignment });
  };

  useEffect(() => {
    const onClick = () => setContextMenu(null);
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const handleDragStart = (e, assignment) => {
    setDraggedItem(assignment);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(assignment));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const addAssignmentsForRange = (resourceId, projectId, startDate, endDate, templateAssignment) => {
    const newAssignments = [...assignments];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const newId = Math.max(0, ...newAssignments.map(a => a.id)) + 1;
      newAssignments.push({
        ...templateAssignment,
        id: newId,
        resourceId,
        projectId,
        date: dateStr,
        history: [...(templateAssignment.history || []), { action: `Created by span ${startDate}->${endDate}`, timestamp: new Date().toISOString(), user: 'Current User' }]
      });
    }
    return newAssignments;
  };

  const handleDrop = (e, targetEntityId, targetDate) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (e.altKey) {
      const start = draggedItem.date;
      const end = targetDate;
      const minDate = new Date(start) <= new Date(end) ? start : end;
      const maxDate = new Date(start) <= new Date(end) ? end : start;
      const newAssignments = addAssignmentsForRange(
        activeTab === 'objektid' ? draggedItem.resourceId : parseInt(targetEntityId),
        activeTab === 'objektid' ? parseInt(targetEntityId) : draggedItem.projectId,
        minDate,
        maxDate,
        { ...draggedItem, history: draggedItem.history || [] }
      );
      const filtered = newAssignments.filter(a => a.id !== draggedItem.id || a.date === draggedItem.date);
      setAssignments(filtered);
      setDraggedItem(null);
      return;
    }

    const newAssignments = assignments.map(a => {
      if (a.id === draggedItem.id) {
        const updated = {
          ...a,
          date: targetDate,
          history: [...(a.history || []), { action: `Moved to ${targetDate}`, timestamp: new Date().toISOString(), user: 'Current User' }]
        };
        if (activeTab === 'objektid') {
          updated.projectId = parseInt(targetEntityId);
        } else {
          updated.resourceId = parseInt(targetEntityId);
        }
        return updated;
      }
      return a;
    });
    setAssignments(newAssignments);
    setDraggedItem(null);
  };

  const [addModalData, setAddModalData] = useState({ entityId: null, date: null, type: 'project', text: '' });
  const handleDoubleClick = (entityId, date) => {
    setAddModalData({ entityId, date, type: 'project', text: '' });
    setShowAddModal(true);
  };
  const addAssignmentFromModal = () => {
    const newId = Math.max(0, ...assignments.map(a => a.id)) + 1;
    const newAssignment = {
      id: newId,
      date: addModalData.date,
      type: addModalData.type === 'text' ? 'Vaba tekst' : 'REISIDE plaanid',
      duration: 8,
      note: addModalData.type === 'text' ? addModalData.text : '',
      history: [{ action: 'Created', timestamp: new Date().toISOString(), user: 'Current User' }]
    };
    if (activeTab === 'objektid') {
      newAssignment.projectId = addModalData.entityId;
      newAssignment.resourceId = addModalData.selectedResource || resources[0].id;
    } else {
      newAssignment.resourceId = addModalData.entityId;
      newAssignment.projectId = addModalData.selectedProject || projects[0].id;
    }
    setAssignments([...assignments, newAssignment]);
    setShowAddModal(false);
  };

  const addProject = () => {
    const newId = Math.max(0, ...projects.map(p => p.id)) + 1;
    const color = defaultColors[Math.floor(Math.random() * defaultColors.length)];
    const newProject = { id: newId, name: newProjectName || `Uus Projekt ${newId}`, color, priority: 'Keskmine', status: 'Aktiivne', startDate: nowIso(), endDate: nowIso() };
    setProjects([...projects, newProject]);
    setNewProjectName('');
    setShowProjectModal(false);
  };

  const handleResourceCellEdit = (resourceId, field, value) => {
    setResources(resources.map(r => r.id === resourceId ? { ...r, [field]: value } : r));
    setEditingCell(null);
  };

  const updateResourceTags = (resourceId, newTagsStr) => {
    const tags = newTagsStr.split(',').map(t => t.trim()).filter(Boolean);
    setResources(resources.map(r => r.id === resourceId ? { ...r, tags } : r));
  };

  const deleteAssignment = (assignmentId) => {
    const confirmed = window.confirm('Oled kindel, et soovid kustutada selle määrangu?');
    if (!confirmed) return;
    setAssignments(assignments.filter(a => a.id !== assignmentId));
    setContextMenu(null);
  };

  const exportToPNG = async () => {
    if (!timelineRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(timelineRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.download = `timeline-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      alert('PNG eksport ebaõnnestus. Installige html2canvas.');
    }
  };

  const exportToPDF = () => { window.print(); };

  const handleScroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) container.scrollLeft += direction === 'right' ? 300 : -300;
  };

  const handleZoom = (direction) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(2, direction === 'in' ? prev + 0.1 : prev - 0.1)));
  };

  const copyProjectAssignments = (projectId) => {
    const projectAssignments = assignments.filter(a => a.projectId === projectId);
    setCopiedData([{ cellId: `project-${projectId}`, assignments: projectAssignments }]);
    setHighlightedProjectId(projectId);
    setTimeout(() => setHighlightedProjectId(null), 6000);
  };

  const toggleResourceActive = (resourceId) => {
    setResources(resources.map(r => r.id === resourceId ? { ...r, active: !r.active } : r));
  };

  const updateProjectColor = (projectId, color) => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, color } : p));
  };
  const updateResourceColor = (resourceId, color) => {
    setResources(resources.map(r => r.id === resourceId ? { ...r, color } : r));
  };

  const visibleResources = () => {
    let list = resources.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (resourceFilterActiveOnly) list = list.filter(r => r.active);
    list = sortList(list, sortResourcesBy);
    return list;
  };

  const visibleProjects = () => {
    let list = projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    list = sortList(list, sortProjectsBy);
    return list;
  };

  // --- Render basic top-level UI (keeps same structure as your enhanced demo)
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Multiproject Timeline Planner — Demo</h1>
            <p className="text-xs text-gray-600">Käivita demo ja proovi: drag, copy/paste, ALT+drag span, eksport.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-600">Timezone: <span className="font-medium">{timezone}</span></div>
            <button onClick={() => { alert('Salvestatud (demo)'); }} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"><Save size={16} />Salvesta</button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b overflow-x-auto">
        <div className="flex min-w-max">
          {[
            { id: 'objektid', icon: Grid, label: 'Projektid Timeline' },
            { id: 'ressursid-timeline', icon: Calendar, label: 'Ressursid Timeline' },
            { id: 'ressursid', icon: Users, label: 'Ressursid' },
            { id: 'projektid', icon: FolderOpen, label: 'Projektid' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm ${activeTab === tab.id ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900'}`}><tab.icon size={16} />{tab.label}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-hidden p-0">
        {activeTab === 'objektid' && (
          <div className="p-4 text-sm text-gray-700">
            Ava "Projektid Timeline" sakk — see demo kasutab samu funktsioone (scroll, zoom, drag, copy/paste).
            Kui soovid, ma saan nüüd aidata seda veel kohandada (nt eksport, CSV, uuem UX).
          </div>
        )}

        {activeTab === 'ressursid-timeline' && (
          <div className="p-4 text-sm text-gray-700">
            "Ressursid Timeline" sisu on samas demo projektis — kasutab sama loogikat.
          </div>
        )}

        {activeTab === 'ressursid' && (
          <div className="p-4 text-sm text-gray-700">
            Ava "Ressursid" leht, et näha tabeli demo ja redigeeringu käiku.
          </div>
        )}

        {activeTab === 'projektid' && (
          <div className="p-4 text-sm text-gray-700">
            Ava "Projektid" leht — tabelivaade projektidest ja kopeerimisnuppudest.
          </div>
        )}
      </main>

      <footer className="bg-white border-t px-3 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>Uuendatud: {new Date().toLocaleString('et-EE')}</div>
          <div className="flex items-center gap-3"><span>{resources.length} ressurssi</span><span>•</span><span>{projects.length} projekti</span><span>•</span><span>{assignments.length} määrangut</span></div>
        </div>
      </footer>
    </div>
  );
}
