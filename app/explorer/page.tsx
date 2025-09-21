'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

// Generic type for any JSON object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonRecord = Record<string, any>;

export default function ExplorerPage() {
  const [rows, setRows] = useState<JsonRecord[]>([]);
  const [jsonData, setJsonData] = useState<JsonRecord[]>([]);
  const [jsonKeys, setJsonKeys] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [columnExactMatch, setColumnExactMatch] = useState<Record<string, boolean>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<JsonRecord>({});
  const [editedRows, setEditedRows] = useState<Set<string>>(new Set());
  const [editingEnabled, setEditingEnabled] = useState(false);

  // Helper function to get unique row ID
  const getRowId = (row: JsonRecord, index?: number): string => {
    // Create a unique identifier combining row data with index for uniqueness
    let baseId = '';
    
    if (row.unsd_code) {
      baseId = String(row.unsd_code);
    } else if (row.id) {
      baseId = String(row.id);
    } else if (row.indicator) {
      baseId = String(row.indicator);
    } else {
      const firstKey = jsonKeys[0];
      baseId = firstKey ? String(row[firstKey]) : 'unknown';
    }
    
    // Always include index to ensure uniqueness even with duplicate data
    return `${baseId}-${index !== undefined ? index : Math.random().toString().substring(2, 8)}`;
  };

  // Process imported JSON data
  const processJsonData = (data: JsonRecord[]) => {
    if (!data || data.length === 0) {
      setJsonData([]);
      setJsonKeys([]);
      setRows([]);
      setVisibleColumns({});
      return;
    }

    // Get all unique keys from all objects
    const allKeys = new Set<string>();
    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => allKeys.add(key));
      }
    });
    
    const keys = Array.from(allKeys);
    setJsonData(data);
    setJsonKeys(keys);
    setRows(data); // Keep compatibility with existing code
    
    // Set default visible columns (prioritize specific columns)
    const defaultVisible: Record<string, boolean> = {};
    const priorityColumns = ['indicator', 'title', 'tier', 'ladmLink', 'externalData'];
    
    keys.forEach(key => {
      // Show priority columns if they exist, otherwise show first few columns
      defaultVisible[key] = priorityColumns.includes(key);
    });
    
    // If priority columns don't exist (generic JSON), show first 6 columns
    const visibleCount = Object.values(defaultVisible).filter(Boolean).length;
    if (visibleCount === 0) {
      keys.forEach((key, index) => {
        defaultVisible[key] = index < 6;
      });
    }
    
    setVisibleColumns(defaultVisible);
  };

  // Export JSON functionality (with edits)
  const exportJsonData = () => {
    const dataToExport = jsonData.length > 0 ? jsonData : rows;
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `exported-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Edit functions
  const startEditing = (rowData: JsonRecord) => {
    const index = rows.findIndex(r => JSON.stringify(r) === JSON.stringify(rowData));
    setEditingRowId(getRowId(rowData, index));
    setEditingData({ ...rowData });
  };

  const saveEdit = () => {
    if (!editingRowId) return;

    setRows(prev => {
      const idx = prev.findIndex((r, i) => getRowId(r, i) === editingRowId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = editingData;
      setJsonData(next);
      return next;
    });

    setEditedRows(prev => {
      const s = new Set(prev);
      s.add(editingRowId);
      return s;
    });

    setEditingRowId(null);
    setEditingData({});
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditingData({});
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateEditingField = (key: string, value: any) => {
    setEditingData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Import JSON functionality
  const importJsonData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = JSON.parse(e.target?.result as string);
        const dataArray = Array.isArray(jsonContent) ? jsonContent : [jsonContent];
        processJsonData(dataArray);
      } catch (error) {
        alert('Invalid JSON file. Please check the format.');
        console.error('JSON parse error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  useEffect(() => {
    fetch('/data/crosswalk.v1.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(processJsonData)
      .catch(() => processJsonData([]));
  }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      // Global search filter
      const okQ = q
        ? jsonKeys.some(key => {
            const value = r[key];
            if (value === null || value === undefined) return false;
            
            if (Array.isArray(value)) {
              return value.join(' ').toLowerCase().includes(q.toLowerCase());
            } else if (typeof value === 'object') {
              return JSON.stringify(value).toLowerCase().includes(q.toLowerCase());
            } else {
              return String(value).toLowerCase().includes(q.toLowerCase());
            }
          })
        : true;

      // Column-specific filters
      const okColumnFilters = Object.entries(columnFilters).every(([filterKey, filterValue]) => {
        if (!filterValue) return true;
        
        const value = r[filterKey];
        if (value === null || value === undefined) return false;
        
        const filterValueLower = filterValue.toLowerCase();
        const isExactMatchForThisColumn = columnExactMatch[filterKey] || false;
        
        if (Array.isArray(value)) {
          const joinedValue = value.join(' ').toLowerCase();
          return isExactMatchForThisColumn 
            ? value.some(item => String(item).toLowerCase() === filterValueLower)
            : joinedValue.includes(filterValueLower);
        } else if (typeof value === 'object') {
          const jsonValue = JSON.stringify(value).toLowerCase();
          return isExactMatchForThisColumn 
            ? jsonValue === filterValueLower
            : jsonValue.includes(filterValueLower);
        } else {
          const stringValue = String(value).toLowerCase();
          return isExactMatchForThisColumn 
            ? stringValue === filterValueLower
            : stringValue.includes(filterValueLower);
        }
      });

      return okQ && okColumnFilters;
    });
  }, [rows, q, columnFilters, jsonKeys, columnExactMatch]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div className="text-sm text-gray-500">
                <Link href="/" className="hover:text-gray-700">Home</Link>
                <span className="mx-2">/</span>
                <span className="text-gray-900 font-medium">JSON Explorer / Default Data - SDG & LADM Crosswalk</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
                  placeholder="Search..."
                  className="w-64 pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setQ('');
                  setColumnFilters({});
                  setColumnExactMatch({});
                  setEditingRowId(null);
                  setEditingData({});
                }}
                className={`px-3 py-2 text-sm border rounded-md focus:ring-2 transition-colors ${
                  q || Object.keys(columnFilters).some(key => columnFilters[key]) || Object.values(columnExactMatch).some(Boolean)
                    ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-500' 
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-green-500'
                }`}
                title="Clear all filters and exit edit mode"
              >
                Clear Filters
              </button>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{filtered.length} of {rows.length} records</span>
                {editedRows.size > 0 && (
                  <>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                      {editedRows.size} edited
                    </span>
                    <button
                      onClick={() => {
                        if (confirm('Reset all edits? This will restore original data.')) {
                          // Reset to original data
                          fetch('/data/crosswalk.v1.json', { cache: 'no-store' })
                            .then(r => r.json())
                            .then(data => {
                              processJsonData(data);
                              setEditedRows(new Set());
                              setEditingRowId(null);
                              setEditingData({});
                            });
                        }
                      }}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 focus:ring-2 focus:ring-red-500"
                      title="Reset all edits to original data"
                    >
                      Reset Edits
                    </button>
                  </>
                )}
              </div>
              
              {/* Import JSON */}
              <label className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={importJsonData}
                  className="hidden"
                />
              </label>

              {/* Export JSON */}
              <button
                onClick={exportJsonData}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V8" />
                </svg>
                Export
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.5 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">JSON Explorer / Default Data - SDG & LADM Crosswalk</h1>
              <p className="text-lg text-gray-600">Generic JSON Data Viewer & Analyzer</p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              Import any JSON file to explore its structure and data. Use filters and search to find specific records.
              Default data: SDG-LADM crosswalk with {rows.length} indicators.
            </p>
          </div>
        </div>


        {/* Results Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Results</h2>
            <p className="text-sm text-gray-600">{filtered.length} records found</p>
      </div>

          <div className="relative">

            {/* Main Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {editingEnabled && (
                <th className="sticky left-0 z-20 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="space-y-2">
                    <div>Edit</div>
                    <div className="h-8"></div> {/* Spacer to match filter input height */}
                  </div>
                </th>
              )}
                    {jsonKeys.map((key) => {
                    if (!visibleColumns[key]) return null;
                    
                    // Convert camelCase/snake_case to readable labels
                    const label = key
                      .replace(/([A-Z])/g, ' $1') // camelCase to spaces
                      .replace(/_/g, ' ') // snake_case to spaces
                      .replace(/\b\w/g, l => l.toUpperCase()) // capitalize words
                      .trim();
                    
                    return (
                      <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="space-y-2">
                          <div>{label}</div>
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              placeholder={columnExactMatch[key] ? `Exact: ${label.toLowerCase()}` : `Filter ${label.toLowerCase()}...`}
                              value={columnFilters[key] || ''}
                              onChange={(e) => setColumnFilters(prev => ({ 
                                ...prev, 
                                [key]: e.target.value 
                              }))}
                              className={`flex-1 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 ${
                                columnExactMatch[key] ? 'border-green-300 bg-green-50' : 'border-gray-300'
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setColumnExactMatch(prev => ({
                                  ...prev,
                                  [key]: !prev[key]
                                }));
                              }}
                              className={`px-1 py-1 text-xs border rounded transition-colors ${
                                columnExactMatch[key]
                                  ? 'bg-green-100 text-green-800 border-green-300'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                              }`}
                              title={columnExactMatch[key] ? 'Exact match (click for contains)' : 'Contains (click for exact match)'}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                                  columnExactMatch[key] 
                                    ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                                    : "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                } />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </th>
                    );
                  })}
            </tr>
          </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((r, idx) => {
                  const originalIndex = rows.findIndex(row => JSON.stringify(row) === JSON.stringify(r));
                  const rowId = getRowId(r, originalIndex);
                  const isEditing = editingRowId === rowId;
                  const isEdited = editedRows.has(rowId);

                  // Satır zemin rengi (sticky hücreyle aynı olmalı)
                  const rowBg = isEditing
                    ? 'bg-blue-50'
                    : isEdited
                    ? 'bg-yellow-50'
                    : idx % 2 === 0
                    ? 'bg-white'
                    : 'bg-gray-50';

                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const renderCell = (key: string, value: any) => {
                    if (!visibleColumns[key as keyof typeof visibleColumns]) return null;

                    const baseClasses = "px-6 py-4 align-middle";
                    const textClasses = "text-sm text-gray-900";
                    const heightStyle = { minHeight: '73px' };

                    // Handle null/undefined
                    if (value === null || value === undefined) {
                      return (
                        <td key={key} className={baseClasses} style={heightStyle}>
                          <div className="text-gray-400">—</div>
                        </td>
                      );
                    }

                    // Handle arrays
                    if (Array.isArray(value)) {
                      return (
                        <td key={key} className={baseClasses} style={heightStyle}>
                          <div className={textClasses}>
                            {value.length > 0 ? (
                              <>
                                {value.slice(0, 3).map((item: unknown, i: number) => (
                                  <span key={i} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                                    {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                                  </span>
                                ))}
                                {value.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{value.length - 3} more
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                      );
                    }

                    // Handle objects
                    if (typeof value === 'object') {
                      const entries = Object.entries(value).filter(([, v]) => v !== null && v !== undefined);
                      return (
                        <td key={key} className={baseClasses} style={heightStyle}>
                          <div className={textClasses}>
                            {entries.length > 0 ? (
                              entries.slice(0, 2).map(([objKey, objValue], i) => (
                                <div key={i} className="mb-1">
                                  <span className="text-xs text-gray-500 font-medium">{objKey}:</span>
                                  <span className="inline-block bg-cyan-100 text-cyan-800 text-xs px-2 py-1 rounded ml-1">
                                    {Array.isArray(objValue) ? `[${objValue.length}]` : String(objValue)}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                            {entries.length > 2 && (
                              <span className="text-xs text-gray-500">+{entries.length - 2} more</span>
                            )}
                          </div>
                        </td>
                      );
                    }

                    // Handle strings
                    if (typeof value === 'string') {
                      return (
                        <td key={key} className={baseClasses} style={heightStyle}>
                          <div className={textClasses}>
                            {value.length > 100 ? (
                              <span title={value}>
                                {value.substring(0, 100)}...
                              </span>
                            ) : (
                              value || <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                      );
                    }

                    // Handle numbers
                    if (typeof value === 'number') {
                      return (
                        <td key={key} className={`${baseClasses} whitespace-nowrap`} style={heightStyle}>
                          <div className={`${textClasses} font-mono`}>{value}</div>
                        </td>
                      );
                    }

                    // Handle booleans
                    if (typeof value === 'boolean') {
                      return (
                        <td key={key} className={`${baseClasses} whitespace-nowrap`} style={heightStyle}>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            value 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {value ? 'true' : 'false'}
                          </span>
                        </td>
                      );
                    }

                    // Default fallback
                    return (
                      <td key={key} className={baseClasses} style={heightStyle}>
                        <div className={textClasses}>{String(value)}</div>
                      </td>
                    );
                  };
                  
                  return (
                    <tr key={rowId} className={rowBg}>
                      {editingEnabled && (
                        <td className={`sticky left-0 z-10 ${rowBg} px-6 py-4 align-middle`}>
                          {isEditing ? (
                            <div className="space-y-1 w-full">
                              <button
                                onClick={saveEdit}
                                className="w-full px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 focus:ring-1 focus:ring-green-500"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="w-full px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 focus:ring-1 focus:ring-gray-500"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="w-full text-center">
                              <button
                                onClick={() => startEditing(r)}
                                className="w-full px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-1 focus:ring-blue-500 mb-1"
                              >
                                Edit
                              </button>
                              {isEdited && <div className="text-xs text-yellow-600">✓</div>}
                            </div>
                          )}
                        </td>
                      )}
                      {jsonKeys.map((key) => {
                        if (!visibleColumns[key]) return null;
                        
                        if (isEditing && editingEnabled) {
                          // Render input for editing
                          const value = editingData[key];
                          
                          if (Array.isArray(value)) {
                            return (
                              <td key={key} className="px-6 py-4 align-middle" style={{ minHeight: '73px' }}>
                                <input
                                  type="text"
                                  value={Array.isArray(value) ? value.join(', ') : String(value || '')}
                                  onChange={(e) => updateEditingField(key, e.target.value.split(', ').filter(Boolean))}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Comma separated values"
                                />
                              </td>
                            );
                          } else if (typeof value === 'object' && value !== null) {
                            return (
                              <td key={key} className="px-6 py-4 align-middle" style={{ minHeight: '73px' }}>
                                <textarea
                                  value={JSON.stringify(value, null, 2)}
                                  onChange={(e) => {
                                    try {
                                      const parsedValue = JSON.parse(e.target.value);
                                      updateEditingField(key, parsedValue);
                                    } catch {
                                      // Keep the raw text for now
                                      updateEditingField(key, e.target.value);
                                    }
                                  }}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  rows={3}
                                />
                              </td>
                            );
                          } else {
                            return (
                              <td key={key} className="px-6 py-4 align-middle" style={{ minHeight: '73px' }}>
                                <input
                                  type="text"
                                  value={String(value || '')}
                                  onChange={(e) => updateEditingField(key, e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                            );
                          }
                        } else {
                          // Render normal cell
                          return renderCell(key, r[key]);
                        }
                      })}
              </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Column Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">Select which columns to display in the table:</p>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {/* Enable Editing Option */}
                  <div className="pb-3 border-b border-gray-200">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingEnabled}
                        onChange={(e) => {
                          setEditingEnabled(e.target.checked);
                          if (!e.target.checked) {
                            setEditingRowId(null);
                            setEditingData({});
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700 font-medium">Enable Editing</span>
                    </label>
                    <p className="ml-6 text-xs text-gray-500 mt-1">Allow inline editing of table data</p>
                  </div>

                  {/* Column Visibility Options */}
                  <div className="pt-3">
                    <p className="text-sm text-gray-600 mb-3 font-medium">Visible Columns:</p>
                    {jsonKeys.map((key) => {
                      // Convert camelCase/snake_case to readable labels
                      const label = key
                        .replace(/([A-Z])/g, ' $1') // camelCase to spaces
                        .replace(/_/g, ' ') // snake_case to spaces
                        .replace(/\b\w/g, l => l.toUpperCase()) // capitalize words
                        .trim();
                      
                      return (
                        <label key={key} className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns[key] || false}
                            onChange={(e) => setVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                            className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const allVisible: Record<string, boolean> = {};
                    jsonKeys.forEach(key => {
                      allVisible[key] = true;
                    });
                    setVisibleColumns(allVisible);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Show All
                </button>
                
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
