import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar, Users, FolderOpen, Grid, Plus, Search, Filter, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Edit2, Trash2, Save, Settings, X, Clock, Copy,
  Clipboard, MessageSquare, Download, FileText
} from 'lucide-react';

/*
  Multiproject Planner - Enhanced demo (addressing projektide_planeerimine.txt)
  - View presets: 1nädal / 2nädalat / 1kuu / 2kuud
  - Timezone visible in header
  - Compact left column / compact rows toggle to show many resources
  - Sorting for resources/projects, inline edit for tags
  - Active / Inactive toggle and filter
  - Ability to copy single project assignments and highlight where else used
  - Drag+drop to move an assignment or ALT+drop to span/extend to multiple days
  - Delete (Delete key) with confirmation for selected cells
  - Per-project / per-resource color picker (defaults to unique)
  - Projects page displays table (like resources page)
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

const MultiProjectPlannerEnhanced = () => {
  // UI states
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

  // Sample data with active flag and color editable
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

  // assignments are per-day items; we extend drag logic to allow ALT+drop to span (create multi-day)
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

  // Dates generation based on selected preset
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

  const [startAnchor] = useState(new Date()); // we can later allow shifting
  const dates = generateDates(startAnchor);

  // Helpers
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

  // Sort helpers
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

  // Multi-select handling
  const handleCellClick = (entityId, date, e) => {
    const cellId = getCellId(entityId, date);
    const newSelected = new Set(selectedCells);

    if (e.ctrlKey || e.metaKey) {
      if (newSelected.has(cellId)) newSelected.delete(cellId);
      else newSelected.add(cellId);
    } else if (e.shiftKey && selectedCells.size > 0) {
      // naive shift: add
      newSelected.add(cellId);
    } else {
      newSelected.clear();
      newSelected.add(cellId);
    }
    setSelectedCells(newSelected);
  };

  // Copy/Paste handling (works for multi cells)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Copy
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
        // small console feedback
        console.log('Copied', data.length, 'cells');
      }

      // Paste
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

      // Delete selected cells (with confirmation)
      if (e.key === 'Delete' && selectedCells.size > 0) {
        const confirmed = window.confirm(`Kustutada kõik määrangud valitud ${selectedCells.size} lahtrist?`);
        if (!confirmed) return;
        const cellIds = Array.from(selectedCells);
        const newAssignments = assignments.filter(a => {
          // keep assignment if it's not inside selected cells
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

  // Context menu
  const handleContextMenu = (e, entityId, date, assignment = null) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, entityId, date, assignment });
  };

  useEffect(() => {
    const onClick = () => setContextMenu(null);
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Drag & Drop: move or ALT+drop to create multi-day span
  const handleDragStart = (e, assignment) => {
    setDraggedItem(assignment);
    e.dataTransfer.effectAllowed = 'move';
    // add text for native drag
    e.dataTransfer.setData('text/plain', JSON.stringify(assignment));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const dateDiffDays = (a, b) => {
    const A = new Date(a); const B = new Date(b);
    return Math.round((B - A) / (1000 * 60 * 60 * 24));
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

    // If ALT key is pressed: create span from draggedItem.date to targetDate (inclusive)
    if (e.altKey) {
      const start = draggedItem.date;
      const end = targetDate;
      const minDate = new Date(start) <= new Date(end) ? start : end;
      const maxDate = new Date(start) <= new Date(end) ? end : start;

      // For objektid tab, dropping onto a project means move project context; for ressursid tab, drop onto resource
      const newAssignments = addAssignmentsForRange(
        activeTab === 'objektid' ? draggedItem.resourceId : parseInt(targetEntityId),
        activeTab === 'objektid' ? parseInt(targetEntityId) : draggedItem.projectId,
        minDate,
        maxDate,
        { ...draggedItem, history: draggedItem.history || [] }
      );

      // Remove original single-day (we created new ones)
      const filtered = newAssignments.filter(a => a.id !== draggedItem.id || a.date === draggedItem.date); // keep copy if same date
      setAssignments(filtered);
      setDraggedItem(null);
      return;
    }

    // Normal move: update the draggedItem's date and optionally change its entity (resource or project)
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

  // Add assignment via modal
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

  // Add project
  const addProject = () => {
    const newId = Math.max(0, ...projects.map(p => p.id)) + 1;
    const color = defaultColors[Math.floor(Math.random() * defaultColors.length)];
    const newProject = { id: newId, name: newProjectName || `Uus Projekt ${newId}`, color, priority: 'Keskmine', status: 'Aktiivne', startDate: nowIso(), endDate: nowIso() };
    setProjects([...projects, newProject]);
    setNewProjectName('');
    setShowProjectModal(false);
  };

  // Inline resource edit
  const handleResourceCellEdit = (resourceId, field, value) => {
    setResources(resources.map(r => r.id === resourceId ? { ...r, [field]: value } : r));
    setEditingCell(null);
  };

  // Inline tags editing: replace tags array when edited
  const updateResourceTags = (resourceId, newTagsStr) => {
    const tags = newTagsStr.split(',').map(t => t.trim()).filter(Boolean);
    setResources(resources.map(r => r.id === resourceId ? { ...r, tags } : r));
  };

  // Delete assignment
  const deleteAssignment = (assignmentId) => {
    const confirmed = window.confirm('Oled kindel, et soovid kustutada selle määrangu?');
    if (!confirmed) return;
    setAssignments(assignments.filter(a => a.id !== assignmentId));
    setContextMenu(null);
  };

  // Export PNG (simple wrapper, same as before)
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

  // Copy all assignments for a single project (used on projects page)
  const copyProjectAssignments = (projectId) => {
    const projectAssignments = assignments.filter(a => a.projectId === projectId);
    setCopiedData([{ cellId: `project-${projectId}`, assignments: projectAssignments }]);
    setHighlightedProjectId(projectId);
    // keep highlight for 6 seconds
    setTimeout(() => setHighlightedProjectId(null), 6000);
  };

  // Toggle active/inactive status for resource
  const toggleResourceActive = (resourceId) => {
    setResources(resources.map(r => r.id === resourceId ? { ...r, active: !r.active } : r));
  };

  // Update color for project/resource
  const updateProjectColor = (projectId, color) => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, color } : p));
  };
  const updateResourceColor = (resourceId, color) => {
    setResources(resources.map(r => r.id === resourceId ? { ...r, color } : r));
  };

  // Derived lists applying filters and sorting
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

  // Render timeline for projects
  const renderProjectsTimeline = () => {
    const projectsInRange = visibleProjects().filter(p => {
      const start = new Date(p.startDate); const end = new Date(p.endDate);
      const rangeStart = new Date(dates[0].date); const rangeEnd = new Date(dates[dates.length - 1].date);
      return start <= rangeEnd && end >= rangeStart;
    });

    const leftWidth = compactMode ? 220 : 320;
    const rowMinHeight = compactMode ? '38px' : '56px';
    const rowFont = compactMode ? 'text-xs' : 'text-sm';

    return (
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-2 bg-white border-b gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => handleScroll('left')} className="p-1.5 hover:bg-gray-100 rounded"><ChevronLeft size={18} /></button>
            <button onClick={() => handleScroll('right')} className="p-1.5 hover:bg-gray-100 rounded"><ChevronRight size={18} /></button>
            <div className="flex items-center gap-2 border-l pl-2 ml-2">
              <button onClick={() => handleZoom('out')} className="p-1.5 hover:bg-gray-100 rounded"><ZoomOut size={18} /></button>
              <span className="text-sm font-medium w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => handleZoom('in')} className="p-1.5 hover:bg-gray-100 rounded"><ZoomIn size={18} /></button>
            </div>

            <div className="flex items-center gap-1 ml-3">
              {Object.keys(VIEW_PRESETS).map(k => (
                <button
                  key={k}
                  onClick={() => setPreset(k)}
                  className={`px-2 py-1 text-xs rounded border ${preset === k ? 'bg-blue-100 border-blue-400' : 'hover:bg-gray-50'}`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-600 mr-2">Timezone: <span className="font-medium">{timezone}</span></div>
            {copiedData && <div className="text-xs text-green-600 flex items-center gap-1 px-2 py-1 bg-green-50 rounded"><Clipboard size={14} />{copiedData.length} kopeeritud</div>}
            <button onClick={() => setShowProjectModal(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"><Plus size={16} />Lisa projekt</button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><Plus size={16} />Lisa</button>
            <button onClick={() => { setShowProjectModal(true); }} className="px-2 py-1.5 text-sm border rounded hover:bg-gray-50">Seaded</button>
            <button onClick={() => { setCompactMode(!compactMode); }} className="px-2 py-1.5 text-sm border rounded hover:bg-gray-50">{compactMode ? 'Laadi' : 'Kompakt'}</button>
            <button onClick={() => { setHighlightedProjectId(null); setCopiedData(null); }} className="px-2 py-1.5 text-sm border rounded hover:bg-gray-50">Clear</button>
          </div>
        </div>

        {/* Timeline grid */}
        <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
          <div className="inline-block min-w-full" ref={timelineRef}>
            <div className="flex">
              {/* Left column */}
              <div className="flex-shrink-0 bg-white sticky left-0 z-20" style={{ width: leftWidth }}>
                <div className={`p-2 font-semibold border-r border-b bg-gray-50 flex items-center justify-between ${rowFont}`}>
                  <div>Projekt</div>
                  <div className="flex items-center gap-1">
                    <button title="Sorteri järgi" onClick={() => setSortProjectsBy(s => ({ key: 'name', dir: s.dir === 'asc' ? 'desc' : 'asc' }))} className="p-1 hover:bg-gray-100 rounded"><SortIcon /></button>
                    <button title="Kopeeri valitud projekti määrangud" onClick={() => {
                      // if one project selected in left column, copy it; else do nothing
                      const firstProject = projectsInRange[0];
                      if (firstProject) copyProjectAssignments(firstProject.id);
                    }} className="p-1 hover:bg-gray-100 rounded"><Copy size={16} /></button>
                  </div>
                </div>

                {projectsInRange.map(project => (
                  <div key={project.id} className={`p-2 border-r border-b flex items-center gap-2 hover:bg-gray-50 ${rowFont}`} style={{ minHeight: rowMinHeight }}>
                    <div style={{ width: 36, height: 36 }} className="rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0" >
                      <div style={{ backgroundColor: project.color, width: 36, height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>
                        {project.name.substring(0,2).toUpperCase()}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">{project.name}</div>
                        <div className="flex items-center gap-1">
                          <input type="color" value={project.color} onChange={(e) => updateProjectColor(project.id, e.target.value)} title="Muuda värvi" className="w-6 h-6 p-0 border-0" />
                          <button onClick={() => copyProjectAssignments(project.id)} title="Kopeeri ja esile too kõik kasutuskohad" className="p-1 hover:bg-gray-100 rounded"><Copy size={14} /></button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">{project.priority} • {project.status}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Scrollable timeline */}
              <div className="flex-1">
                {/* Header */}
                <div className="flex sticky top-0 bg-white z-10 border-b">
                  {dates.map((d, idx) => (
                    <div key={idx} className={`flex flex-col items-center justify-center border-r p-1 ${d.isToday ? 'bg-blue-100 border-blue-500 border-2' : d.isWeekend ? 'bg-gray-100' : 'bg-white'}`} style={{ minWidth: `${64 * zoomLevel}px` }}>
                      <div className="text-xs text-gray-500">{d.weekday}</div>
                      <div className={`font-semibold ${d.isToday ? 'text-blue-600' : ''}`}>{d.day}</div>
                      {d.isToday && <div className="text-xs text-blue-600 font-bold">HOY</div>}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {projectsInRange.map(project => (
                  <div key={project.id} className="flex border-b">
                    {dates.map((d, idx) => {
                      const cellId = getCellId(project.id, d.date);
                      const isSelected = selectedCells.has(cellId);
                      const cellAssignments = assignments.filter(a => a.projectId === project.id && a.date === d.date);
                      return (
                        <div key={idx}
                          className={`border-r p-0.5 cursor-pointer transition-colors relative ${d.isToday ? 'bg-blue-50' : d.isWeekend ? 'bg-gray-50' : 'bg-white'} ${isSelected ? 'ring-2 ring-blue-500 bg-blue-100' : ''}`}
                          style={{ minWidth: `${64 * zoomLevel}px`, minHeight: rowMinHeight }}
                          onClick={(e) => handleCellClick(project.id, d.date, e)}
                          onDoubleClick={() => handleDoubleClick(project.id, d.date)}
                          onContextMenu={(e) => handleContextMenu(e, project.id, d.date)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, project.id, d.date)}
                        >
                          <div className="flex flex-wrap gap-0.5 p-0.5">
                            {cellAssignments.map(assignment => {
                              const resource = resources.find(r => r.id === assignment.resourceId);
                              const highlighted = highlightedProjectId && highlightedProjectId === assignment.projectId;
                              return (
                                <div key={assignment.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, assignment)}
                                  onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, project.id, d.date, assignment); }}
                                  title={`${resource?.name || 'Res'} - ${assignment.type}${assignment.note ? '\n' + assignment.note : ''}`}
                                  className="text-xs px-1.5 py-0.5 rounded cursor-move hover:opacity-90 relative flex items-center gap-1 truncate"
                                  style={{
                                    backgroundColor: getTypeColor(assignment.type),
                                    border: highlighted ? '2px solid #2563EB' : 'none',
                                    boxShadow: highlighted ? '0 0 6px rgba(37,99,235,0.15)' : undefined,
                                    maxWidth: '100%'
                                  }}
                                >
                                  <span className="font-semibold truncate" style={{ maxWidth: 80 }}>{resource?.name.split(' ')[0].slice(0,8)}</span>
                                  {assignment.note && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" title={assignment.note}></div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render resources timeline (similar to projects timeline)
  const renderResourcesTimeline = () => {
    const visible = visibleResources();
    const leftWidth = compactMode ? 220 : 320;
    const rowMinHeight = compactMode ? '38px' : '56px';
    const rowFont = compactMode ? 'text-xs' : 'text-sm';

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-2 bg-white border-b">
          <div className="flex items-center gap-2">
            <button onClick={() => handleScroll('left')} className="p-1.5 hover:bg-gray-100 rounded"><ChevronLeft size={18} /></button>
            <button onClick={() => handleScroll('right')} className="p-1.5 hover:bg-gray-100 rounded"><ChevronRight size={18} /></button>
            <div className="flex items-center gap-2 border-l pl-2 ml-2">
              <button onClick={() => handleZoom('out')} className="p-1.5 hover:bg-gray-100 rounded"><ZoomOut size={18} /></button>
              <span className="text-sm font-medium w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => handleZoom('in')} className="p-1.5 hover:bg-gray-100 rounded"><ZoomIn size={18} /></button>
            </div>
            <div className="ml-3">
              <label className="text-xs mr-2">Näita:</label>
              <button onClick={() => setResourceFilterActiveOnly(true)} className={`px-2 py-1 text-xs rounded border ${resourceFilterActiveOnly ? 'bg-blue-100 border-blue-400' : 'hover:bg-gray-50'}`}>Aktiivsed</button>
              <button onClick={() => setResourceFilterActiveOnly(false)} className={`px-2 py-1 text-xs rounded border ${!resourceFilterActiveOnly ? 'bg-blue-100 border-blue-400' : 'hover:bg-gray-50'}`}>Kõik</button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {copiedData && <div className="text-xs text-green-600 flex items-center gap-1 px-2 py-1 bg-green-50 rounded"><Clipboard size={14} />{copiedData.length} kopeeritud</div>}
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><Plus size={16} />Lisa</button>
            <button onClick={() => setCompactMode(!compactMode)} className="px-2 py-1.5 text-sm border rounded hover:bg-gray-50">{compactMode ? 'Laadi' : 'Kompakt'}</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
          <div className="inline-block min-w-full" ref={timelineRef}>
            <div className="flex">
              <div className="flex-shrink-0 bg-white sticky left-0 z-20" style={{ width: leftWidth }}>
                <div className={`w-full p-2 font-semibold border-r border-b bg-gray-50 ${rowFont}`}>Ressurss</div>
                {visible.map(resource => (
                  <div key={resource.id} className={`w-full p-2 border-r border-b flex items-center gap-2 hover:bg-gray-50 ${rowFont}`} style={{ minHeight: rowMinHeight }}>
                    <div style={{ width: 36, height: 36, borderRadius: 36/2, backgroundColor: resource.color }} className="flex items-center justify-center text-white text-xs flex-shrink-0">
                      {resource.name.split(' ').map(n => n[0]).join('').substring(0,2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">{resource.name}</div>
                        <div className="flex items-center gap-1">
                          <input type="color" value={resource.color} onChange={(e) => updateResourceColor(resource.id, e.target.value)} title="Muuda ressurssi värvi" className="w-6 h-6 p-0 border-0" />
                          <button className={`px-2 py-0.5 text-xs rounded ${resource.active ? 'bg-green-100' : 'bg-gray-100'}`} onClick={() => toggleResourceActive(resource.id)}>{resource.active ? 'Aktiivne' : 'Deaktiveeritud'}</button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">{resource.type} • {resource.availability}%</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex-1">
                <div className="flex sticky top-0 bg-white z-10 border-b">
                  {dates.map((d, idx) => (
                    <div key={idx} className={`flex flex-col items-center justify-center border-r p-1 ${d.isToday ? 'bg-blue-100 border-blue-500 border-2' : d.isWeekend ? 'bg-gray-100' : 'bg-white'}`} style={{ minWidth: `${64 * zoomLevel}px` }}>
                      <div className="text-xs text-gray-500">{d.weekday}</div>
                      <div className={`font-semibold ${d.isToday ? 'text-blue-600' : ''}`}>{d.day}</div>
                    </div>
                  ))}
                </div>

                {visible.map(resource => (
                  <div key={resource.id} className="flex border-b">
                    {dates.map((d, idx) => {
                      const cellId = getCellId(resource.id, d.date);
                      const isSelected = selectedCells.has(cellId);
                      const cellAssignments = assignments.filter(a => a.resourceId === resource.id && a.date === d.date);
                      return (
                        <div key={idx}
                          className={`border-r p-0.5 cursor-pointer transition-colors ${d.isToday ? 'bg-blue-50' : d.isWeekend ? 'bg-gray-50' : 'bg-white'} ${isSelected ? 'ring-2 ring-blue-500 bg-blue-100' : ''}`}
                          style={{ minWidth: `${64 * zoomLevel}px`, minHeight: rowMinHeight }}
                          onClick={(e) => handleCellClick(resource.id, d.date, e)}
                          onDoubleClick={() => handleDoubleClick(resource.id, d.date)}
                          onContextMenu={(e) => handleContextMenu(e, resource.id, d.date)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, resource.id, d.date)}
                        >
                          <div className="flex flex-wrap gap-0.5 p-0.5">
                            {cellAssignments.map(assignment => {
                              const project = projects.find(p => p.id === assignment.projectId);
                              const highlighted = highlightedProjectId && highlightedProjectId === assignment.projectId;
                              return (
                                <div key={assignment.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, assignment)}
                                  onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, resource.id, d.date, assignment); }}
                                  title={`${project?.name || 'Proj'} - ${assignment.type}`}
                                  className="text-xs px-1.5 py-0.5 rounded cursor-move hover:opacity-90 relative flex items-center gap-1 truncate"
                                  style={{ backgroundColor: getTypeColor(assignment.type), border: highlighted ? '2px solid #2563EB' : 'none' }}
                                >
                                  <span className="font-semibold truncate" style={{ maxWidth: 80 }}>{assignment.type.substring(0,10)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  };

  // Resources table (Excel-like) with inline tag editing and sorting
  const renderResourcesPage = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 bg-white border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Ressursid</h2>
          <div className="flex gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50" onClick={() => exportToPNG()}>
              <Download size={16} />Ekspordi
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setShowProjectModal(true)}>
              <Plus size={16} />Lisa Ressurss
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2 text-gray-400" size={16} />
            <input type="text" placeholder="Otsi ressursse..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50" onClick={() => setSortResourcesBy(s => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}><Filter size={16} />Sort</button>
          <div className="flex items-center gap-2 ml-2">
            <label className="text-sm">Näita deaktiveeritud:</label>
            <input type="checkbox" checked={!resourceFilterActiveOnly} onChange={() => setResourceFilterActiveOnly(prev => !prev)} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="bg-white rounded border overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="border-b">
                <th className="text-left p-2 text-sm font-semibold border-r">Nimi</th>
                <th className="text-left p-2 text-sm font-semibold border-r">Tüüp</th>
                <th className="text-left p-2 text-sm font-semibold border-r">Email</th>
                <th className="text-left p-2 text-sm font-semibold border-r">Telefon</th>
                <th className="text-left p-2 text-sm font-semibold border-r">Kättesaadavus %</th>
                <th className="text-left p-2 text-sm font-semibold border-r">Planeeritud h</th>
                <th className="text-left p-2 text-sm font-semibold border-r">Viimati kasutatud</th>
                <th className="text-left p-2 text-sm font-semibold">Märksõnad</th>
              </tr>
            </thead>
            <tbody>
              {visibleResources().map((resource, idx) => (
                <tr key={resource.id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                  <td className="p-2 border-r">
                    {editingCell === `${resource.id}-name` ? (
                      <input autoFocus value={resource.name} onChange={(e) => handleResourceCellEdit(resource.id, 'name', e.target.value)} onBlur={() => setEditingCell(null)} className="w-full px-1 py-0.5 text-sm border rounded" />
                    ) : (
                      <div className="text-sm cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded" onClick={() => setEditingCell(`${resource.id}-name`)}>{resource.name}</div>
                    )}
                  </td>
                  <td className="p-2 border-r"><span className="text-sm px-2 py-0.5 bg-gray-100 rounded">{resource.type}</span></td>
                  <td className="p-2 border-r">
                    {editingCell === `${resource.id}-email` ? (
                      <input autoFocus value={resource.email} onChange={(e) => handleResourceCellEdit(resource.id, 'email', e.target.value)} onBlur={() => setEditingCell(null)} className="w-full px-1 py-0.5 text-sm border rounded" />
                    ) : (
                      <div className="text-sm cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded" onClick={() => setEditingCell(`${resource.id}-email`)}>{resource.email}</div>
                    )}
                  </td>
                  <td className="p-2 border-r">
                    {editingCell === `${resource.id}-phone` ? (
                      <input autoFocus value={resource.phone} onChange={(e) => handleResourceCellEdit(resource.id, 'phone', e.target.value)} onBlur={() => setEditingCell(null)} className="w-full px-1 py-0.5 text-sm border rounded" />
                    ) : (
                      <div className="text-sm cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded" onClick={() => setEditingCell(`${resource.id}-phone`)}>{resource.phone}</div>
                    )}
                  </td>
                  <td className="p-2 border-r">
                    <div className="flex items-center gap-1">
                      <div className="flex-1 max-w-[60px] h-1.5 bg-gray-200 rounded overflow-hidden">
                        <div className={`h-full ${resource.availability > 70 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${resource.availability}%` }} />
                      </div>
                      <span className="text-sm font-medium">{resource.availability}%</span>
                    </div>
                  </td>
                  <td className="p-2 border-r text-sm font-medium">{resource.plannedHours}</td>
                  <td className="p-2 border-r text-sm text-gray-600">{resource.lastUsed}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        {resource.tags.map(tag => (<span key={tag} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{tag}</span>))}
                      </div>
                      <button onClick={() => setEditingCell(`${resource.id}-tags`)} className="px-2 py-0.5 text-xs border rounded hover:bg-gray-50">Muuda</button>
                    </div>
                    {editingCell === `${resource.id}-tags` && (
                      <div className="mt-2">
                        <input autoFocus defaultValue={resource.tags.join(', ')} onBlur={(e) => { updateResourceTags(resource.id, e.target.value); setEditingCell(null); }} className="w-full px-2 py-1 text-sm border rounded" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-white p-3 rounded border"><div className="text-xs text-gray-600">Kokku ressursse</div><div className="text-xl font-bold mt-1">{resources.length}</div></div>
          <div className="bg-white p-3 rounded border"><div className="text-xs text-gray-600">Inimesed</div><div className="text-xl font-bold mt-1">{resources.filter(r => r.type === 'Inimene').length}</div></div>
          <div className="bg-white p-3 rounded border"><div className="text-xs text-gray-600">Sõidukid</div><div className="text-xl font-bold mt-1">{resources.filter(r => r.type === 'Sõiduk').length}</div></div>
          <div className="bg-white p-3 rounded border"><div className="text-xs text-gray-600">Keskm. kättesaadavus</div><div className="text-xl font-bold mt-1">{Math.round(resources.reduce((s,r) => s + r.availability, 0)/resources.length)}%</div></div>
        </div>
      </div>
    </div>
  );

  // Projects page table (mimic resources table)
  const renderProjectsPage = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 bg-white border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Projektid</h2>
          <div className="flex gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50" onClick={() => exportToPNG()}><Download size={16} />Ekspordi</button>
            <button onClick={() => setShowProjectModal(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"><Plus size={16} />Lisa Projekt</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="bg-white rounded border overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="border-b">
                <th className="text-left p-2 text-sm font-semibold border-r">Nimi</th>
                <th className="text-left p-2 text-sm font-semibold border-r">Staatus</th>
                <th className="text-left p-2 text-sm font-semibold border-r">Prioriteet</th>
                <th className="text-left p-2 text-sm font-semibold border-r">Algus</th>
                <th className="text-left p-2 text-sm font-semibold border-r">Lõpp</th>
                <th className="text-left p-2 text-sm font-semibold">Määrangud kokku</th>
              </tr>
            </thead>
            <tbody>
              {visibleProjects().map((project, idx) => (
                <tr key={project.id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                  <td className="p-2 border-r">
                    <div className="flex items-center gap-2">
                      <div style={{ width: 40, height: 40, backgroundColor: project.color }} className="rounded flex items-center justify-center text-white text-sm font-bold">{project.name.substring(0,2).toUpperCase()}</div>
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-xs text-gray-500">{project.priority}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 border-r"><span className={`text-xs px-2 py-0.5 rounded ${project.status === 'Aktiivne' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{project.status}</span></td>
                  <td className="p-2 border-r">{project.priority}</td>
                  <td className="p-2 border-r">{project.startDate}</td>
                  <td className="p-2 border-r">{project.endDate}</td>
                  <td className="p-2">{assignments.filter(a => a.projectId === project.id).length} määrangut <button onClick={() => copyProjectAssignments(project.id)} className="ml-2 px-2 py-0.5 text-xs border rounded">Kopeeri</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // small SortIcon (placeholder)
  function SortIcon() {
    return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6-6 6 6" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 15l-6 6-6-6" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Multiproject Timeline Planner — Enhanced demo</h1>
            <p className="text-xs text-gray-600">Parandatud näidis: vaaterežiimid, timezone, kompaktne vasak veerg, sort, tag edit, highlight, span drag jne.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-600">Timezone: <span className="font-medium">{timezone}</span></div>
            <button onClick={() => { /* placeholder save */ alert('Salvestatud (demo)'); }} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"><Save size={16} />Salvesta</button>
          </div>
        </div>
      </header>

      {/* Navigation */}
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

      {/* Main */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'objektid' && renderProjectsTimeline()}
        {activeTab === 'ressursid-timeline' && renderResourcesTimeline()}
        {activeTab === 'ressursid' && renderResourcesPage()}
        {activeTab === 'projektid' && renderProjectsPage()}
      </main>

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed bg-white rounded shadow-lg border py-1 z-50 min-w-[180px]" style={{ top: contextMenu.y, left: contextMenu.x }}>
          {contextMenu.assignment ? (
            <>
              <button onClick={() => { setCopiedData([{ cellId: '', assignments: [contextMenu.assignment] }]); setContextMenu(null); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"><Copy size={14} />Kopeeri</button>
              <button onClick={() => deleteAssignment(contextMenu.assignment.id)} className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"><Trash2 size={14} />Kustuta</button>
            </>
          ) : (
            <>
              <button onClick={() => { handleDoubleClick(contextMenu.entityId, contextMenu.date); setContextMenu(null); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"><Plus size={14} />Lisa määrang</button>
              {copiedData && <button onClick={() => setContextMenu(null)} className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"><Clipboard size={14} />Kleebi ({copiedData.reduce((s,c) => s + c.assignments.length, 0)})</button>}
            </>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded p-4 max-w-md w-full">
            <div className="flex items-center justify-between mb-3"><h3 className="text-lg font-bold">Lisa määrang</h3><button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button></div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Kuupäev</label><input type="date" value={addModalData.date} onChange={(e) => setAddModalData({...addModalData, date: e.target.value})} className="w-full p-2 border rounded" /></div>
              <div><label className="block text-sm font-medium mb-1">Tüüp</label><select value={addModalData.type} onChange={(e) => setAddModalData({...addModalData, type: e.target.value})} className="w-full p-2 border rounded"><option value="project">Projekt</option><option value="text">Vaba tekst</option></select></div>
              <div><label className="block text-sm font-medium mb-1">Tekst</label><input value={addModalData.text} onChange={(e) => setAddModalData({...addModalData, text: e.target.value})} className="w-full p-2 border rounded" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4"><button onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">Tühista</button><button onClick={addAssignmentFromModal} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Lisa</button></div>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded p-4 max-w-md w-full">
            <div className="flex items-center justify-between mb-3"><h3 className="text-lg font-bold">Lisa uus projekt</h3><button onClick={() => setShowProjectModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button></div>
            <div className="mb-3"><label className="block text-sm font-medium mb-1">Projekti nimi</label><input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="w-full p-2 text-sm border rounded" placeholder="Sisesta projekti nimi..." /></div>
            <div className="flex justify-end gap-2"><button onClick={() => setShowProjectModal(false)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">Tühista</button><button onClick={addProject} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Lisa</button></div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t px-3 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>Uuendatud: {new Date().toLocaleString('et-EE')}</div>
          <div className="flex items-center gap-3"><span>{resources.length} ressurssi</span><span>•</span><span>{projects.length} projekti</span><span>•</span><span>{assignments.length} määrangut</span></div>
        </div>
      </footer>
    </div>
  );
};

export default MultiProjectPlannerEnhanced;