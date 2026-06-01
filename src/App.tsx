/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  Building2, 
  MapPin, 
  Users, 
  Activity, 
  Layers, 
  X, 
  Info, 
  Globe, 
  RotateCcw,
  SlidersHorizontal,
  PlusCircle,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { City, CityFormData, CityListResponse, ApiResponse } from './types';

export default function App() {
  // Lists and query states
  const [cities, setCities] = useState<City[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(5);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  // Filtering & sorting states
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  
  // Loading & notification states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorInputMsg, setErrorInputMsg] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Stats calculation variables
  const [stats, setStats] = useState({
    totalCount: 0,
    activeCount: 0,
    totalPopulation: 0,
    mostPopulatedCity: 'N/A'
  });

  // Form states
  const [formData, setFormData] = useState<CityFormData>({
    name: '',
    country: '',
    stateProvince: '',
    population: 0,
    description: '',
    isActive: true
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingCityId, setEditingCityId] = useState<string | null>(null);

  // Debounce search input to avoid hitting database on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch cities list from the Backend
  const fetchCities = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search: debouncedSearch,
        sortBy,
        order,
        page: page.toString(),
        limit: limit.toString()
      });
      
      const response = await fetch(`/api/cities?${queryParams.toString()}`);
      const result: ApiResponse<CityListResponse> = await response.json();
      
      if (response.ok && result.data) {
        setCities(result.data.items);
        setTotal(result.data.total);
        setTotalPages(result.data.totalPages);
        setPage(result.data.page);
        
        // Also compute dynamic stats based on all records or current query
        // Let's perform a secondary query without filters to populate true database wide stats
        fetchOverallStats();
      } else {
        showNotification(result.message || 'Error loading cities', 'error');
      }
    } catch (err: any) {
      showNotification('Unable to contact the server api.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch full stats representing all cities
  const fetchOverallStats = async () => {
    try {
      // Query with high limit to get more raw city information for accurate dashboard stats
      const response = await fetch(`/api/cities?limit=100`);
      const result: ApiResponse<CityListResponse> = await response.json();
      if (response.ok && result.data) {
        const allCities = result.data.items;
        const activeCount = allCities.filter(c => c.isActive).length;
        const totalPopulation = allCities.reduce((sum, c) => sum + Number(c.population), 0);
        
        let largestCity = 'N/A';
        if (allCities.length > 0) {
          const sortedByPop = [...allCities].sort((a, b) => b.population - a.population);
          largestCity = sortedByPop[0].name;
        }

        setStats({
          totalCount: result.data.total,
          activeCount,
          totalPopulation,
          mostPopulatedCity: largestCity
        });
      }
    } catch (error) {
      console.error('Failed to update stats dynamically', error);
    }
  };

  // Trigger fetch when parameters or debounced search changes
  useEffect(() => {
    fetchCities();
  }, [debouncedSearch, sortBy, order, page, limit]);

  const showNotification = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Handle Form Change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setErrorInputMsg(null);
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'population') {
      const numValue = Math.max(0, parseInt(value) || 0);
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Form Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInputMsg(null);

    // Validation
    if (!formData.name.trim()) {
      setErrorInputMsg('City name is required.');
      return;
    }
    if (!formData.country.trim()) {
      setErrorInputMsg('Country name is required.');
      return;
    }

    try {
      if (isEditing && editingCityId) {
        // Edit flow
        const response = await fetch(`/api/cities/${editingCityId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        const result: ApiResponse<City> = await response.json();
        if (response.ok) {
          showNotification(`Successfully updated city '${formData.name}'!`, 'success');
          resetForm();
          fetchCities();
        } else {
          setErrorInputMsg(result.message || 'Failed to update city.');
        }
      } else {
        // Create flow
        // Check local duplicate first to act lightning-fast, and let server double check
        const isDuplicate = cities.some(c => c.name.toLowerCase().trim() === formData.name.toLowerCase().trim());
        if (isDuplicate) {
          setErrorInputMsg(`A city matching '${formData.name}' already exists in your current view (case-insensitive block).`);
          return;
        }

        const response = await fetch('/api/cities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const result: ApiResponse<City> = await response.json();
        if (response.status === 201 || response.ok) {
          showNotification(`Successfully created city '${formData.name}'!`, 'success');
          resetForm();
          fetchCities();
        } else {
          setErrorInputMsg(result.message || 'Duplicate name or database record issue found.');
        }
      }
    } catch (err) {
      showNotification('Problem connecting to backend to save city.', 'error');
    }
  };

  // Reset the Form
  const resetForm = () => {
    setFormData({
      name: '',
      country: '',
      stateProvince: '',
      population: 0,
      description: '',
      isActive: true
    });
    setIsEditing(false);
    setEditingCityId(null);
    setErrorInputMsg(null);
  };

  // Load city into editor
  const handleEditClick = (city: City) => {
    setErrorInputMsg(null);
    setFormData({
      name: city.name,
      country: city.country,
      stateProvince: city.stateProvince,
      population: city.population,
      description: city.description || '',
      isActive: city.isActive
    });
    setIsEditing(true);
    setEditingCityId(city.id);
  };

  // Delete a city
  const handleDeleteClick = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete '${name}' from the record list?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/cities/${id}`, {
        method: 'DELETE'
      });
      const result: ApiResponse = await response.json();

      if (response.ok) {
        showNotification(`Successfully removed '${name}' from the repository.`, 'success');
        if (editingCityId === id) {
          resetForm();
        }
        // Adjust pagination page if last row was deleted
        if (cities.length === 1 && page > 1) {
          setPage(prev => prev - 1);
        } else {
          fetchCities();
        }
      } else {
        showNotification(result.message || 'Unable to delete city.', 'error');
      }
    } catch (err) {
      showNotification('Failed to contact backend to complete deletion.', 'error');
    }
  };

  // Toggle sort order state
  const handleSortToggle = (field: string) => {
    if (sortBy === field) {
      setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setOrder('asc');
    }
    setPage(1);
  };

  // Format Helper for Numbers
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div id="city-master-root" className="min-h-screen bg-[#f0f2f5] p-3 md:p-6 lg:p-8 font-sans text-slate-800 flex flex-col justify-between">
      
      {/* Dynamic Toast Alerts */}
      {notification && (
        <div 
          id="toast-notification"
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl border transition-all duration-300 animate-bounce ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div className="text-sm font-semibold">{notification.text}</div>
          <button 
            id="close-toast-btn"
            onClick={() => setNotification(null)} 
            className="text-slate-400 hover:text-slate-600 transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col gap-6">
        
        {/* Top Header Section */}
        <header id="app-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-950 tracking-tight font-display">City Master Console</h1>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1">
              <span className="text-indigo-600 font-semibold">ICityRepository</span> • MVC Architecture Pattern • REST API
            </p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Active Service
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-1">ApiResponseDTO • camelCase</span>
            </div>
            <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md border-2 border-white shadow-indigo-100">
              CM
            </div>
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div id="bento-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Manage City Form (4 cols on lg and up) */}
          <section id="form-card" className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col min-h-[580px] hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isEditing ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {isEditing ? <Edit2 className="w-4.5 h-4.5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 leading-tight font-display text-base">
                    {isEditing ? 'Edit City Record' : 'Create City Record'}
                  </h2>
                  <p className="text-[11px] text-slate-400">Save details into Firestore DB</p>
                </div>
              </div>
              {isEditing && (
                <button 
                  id="cancel-edit-btn"
                  onClick={resetForm}
                  className="text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors px-2 py-1 rounded-lg flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>City Name *</span>
                  <span className="text-[10px] text-slate-400 capitalize font-mono">Case-insensitive check</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <input 
                    id="input-name"
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. San Francisco" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all text-slate-900 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Country / Code *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400">
                      <Globe className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      id="input-country"
                      type="text" 
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="e.g. United States" 
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all text-slate-900 text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">State / Province</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      id="input-state"
                      type="text" 
                      name="stateProvince"
                      value={formData.stateProvince}
                      onChange={handleInputChange}
                      placeholder="e.g. California" 
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all text-slate-900 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Population Count</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400">
                    <Users className="w-4 h-4" />
                  </span>
                  <input 
                    id="input-population"
                    type="number" 
                    name="population"
                    value={formData.population === 0 ? '' : formData.population}
                    onChange={handleInputChange}
                    placeholder="e.g. 883000" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all text-slate-900 font-mono text-xs"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Short Description</label>
                <textarea 
                  id="input-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Summarize key city details, landmarks or climate..." 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs transition-all text-slate-900 h-24 resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Record Status</span>
                  <span className="text-[10px] text-slate-400 block">Status controls public visibility</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    id="input-isactive"
                    type="checkbox" 
                    name="isActive" 
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ml-2 text-xs font-bold text-slate-600 w-12 text-right">
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>

              {errorInputMsg && (
                <div id="validation-error-box" className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-650 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error:</span> {errorInputMsg}
                  </div>
                </div>
              )}

              <button 
                id="save-record-btn"
                type="submit"
                className={`w-full text-white font-extrabold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  isEditing 
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' 
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                }`}
              >
                {isEditing ? (
                  <>
                    <Edit2 className="w-4 h-4" /> Save Changes
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" /> Add New Record
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3 text-indigo-800">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-[10px] sm:text-[11px] font-medium leading-relaxed">
                <span className="font-bold">Architecture Rule:</span> Save maps to <code>CreateCityDto</code> and <code>UpdateCityDto</code> parameters through <code>CityController</code>.
              </p>
            </div>
          </section>

          {/* RIGHT COLUMN: Bento Stats Grid + App Data Grid (8 cols on lg and up) */}
          <div className="lg:col-span-8 flex flex-col gap-6 w-full">
            
            {/* Bento Quick Stats Grid (4 Metrics Rows) */}
            <section id="stats-section" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Records</span>
                  <div className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center">
                    <DatabaseIcon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">{stats.totalCount}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Cities in repository</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active State</span>
                  <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-extrabold text-emerald-600 tracking-tight font-display">{stats.activeCount}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Cities searchable live</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Population</span>
                  <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-base font-bold text-slate-800 truncate block mt-1.5 font-mono">
                    {formatNumber(stats.totalPopulation)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Total estimated residents</span>
                </div>
              </div>

              <div className="bg-indigo-600 rounded-2xl p-4 border border-indigo-700 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform text-white">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Largest City</span>
                  <div className="w-6 h-6 rounded bg-indigo-500/50 text-indigo-100 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 animate-bounce" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-base font-extrabold text-white tracking-tight truncate block mt-1">
                    {stats.mostPopulatedCity}
                  </span>
                  <span className="text-[10px] text-indigo-200 block">Highest population in DB</span>
                </div>
              </div>

            </section>

            {/* City List Table (Bento Card) */}
            <section id="list-card" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col min-h-[500px] hover:border-slate-300 transition-all">
              
              {/* Filter Controls Row */}
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                {/* Search */}
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-3 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input 
                    id="search-input"
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, country or state..." 
                    className="w-full pl-10 pr-10 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 transition-all placeholder:text-slate-400 font-medium"
                  />
                  {search && (
                    <button 
                      id="clear-search-btn"
                      onClick={() => setSearch('')}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort, Refresh & Limit selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold bg-slate-100 px-3 py-2 rounded-full border border-slate-200">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Sort By:</span>
                    <select 
                      id="sort-select"
                      value={sortBy} 
                      onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                      className="bg-transparent border-none outline-none text-indigo-700 cursor-pointer font-extrabold focus:ring-0 py-0 pl-1 pr-4"
                    >
                      <option value="name">City Name</option>
                      <option value="country">Country</option>
                      <option value="stateProvince">State/Region</option>
                      <option value="population">Population</option>
                      <option value="createdAt">Date Created</option>
                    </select>
                  </div>

                  <button 
                    id="order-direction-btn"
                    onClick={() => setOrder(o => o === 'asc' ? 'desc' : 'asc')}
                    className="p-2 sm:px-3 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-full border border-slate-200 transition-colors flex items-center justify-center gap-1"
                    title={`Change sorting order. Currently ${order === 'asc' ? 'Ascending' : 'Descending'}`}
                  >
                    <span>{order === 'asc' ? '▲ ASC' : '▼ DESC'}</span>
                  </button>

                  <select 
                    id="limit-select"
                    value={limit} 
                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200 outline-none transition-colors cursor-pointer"
                    title="Items per page"
                  >
                    <option value="5">5 / Page</option>
                    <option value="10">10 / Page</option>
                    <option value="20">20 / Page</option>
                  </select>

                  <button 
                    id="refresh-btn"
                    onClick={fetchCities}
                    className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-full border border-slate-200 transition-all flex items-center justify-center absolute sm:static right-6"
                    title="Reload Data"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Data Table Area */}
              <div className="flex-1 overflow-x-auto">
                {isLoading ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Activity className="w-8 h-8 text-indigo-500 animate-pulse" />
                    <span className="text-xs font-semibold animate-pulse font-mono">Querying database via UnitOfWork...</span>
                  </div>
                ) : cities.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-405 text-center">
                    <DatabaseIcon className="w-10 h-10 text-slate-300" />
                    <h3 className="font-bold text-slate-800 text-sm font-display">No matching cities found</h3>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">There are no records representing your keyword filter criteria. Insert a new record to seed.</p>
                    {(search || debouncedSearch) && (
                      <button 
                        id="reset-search-btn"
                        onClick={() => { setSearch(''); setPage(1); }}
                        className="mt-3 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 transition-colors"
                      >
                        Reset Search Filter
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="pb-3 pl-4">ID</th>
                        <th className="pb-3 text-slate-700">City Name</th>
                        <th className="pb-3 text-slate-700">Country</th>
                        <th className="pb-3 text-slate-700">State / Province</th>
                        <th className="pb-3 text-slate-700">Population</th>
                        <th className="pb-3 text-slate-700 text-center">Status</th>
                        <th className="pb-3 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {cities.map((city) => (
                        <tr 
                          key={city.id} 
                          className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors group ${
                            editingCityId === city.id ? 'bg-amber-50/40 border-amber-100' : ''
                          }`}
                        >
                          <td className="py-3.5 pl-4 font-mono text-[10px] text-slate-400">
                            #{city.id.slice(-4)}
                          </td>
                          <td className="py-3.5">
                            <div className="font-extrabold text-slate-900 text-sm font-display flex items-center gap-1.5">
                              {city.name}
                              {editingCityId === city.id && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-mono font-bold uppercase scale-90">
                                  EDITING
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate group-hover:text-slate-650" title={city.description}>
                              {city.description || 'No description provided.'}
                            </div>
                          </td>
                          <td className="py-3.5 font-semibold text-slate-700">
                            {city.country}
                          </td>
                          <td className="py-3.5 text-slate-600">
                            {city.stateProvince || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-3.5 font-mono text-slate-700 font-medium">
                            {city.population > 0 ? formatNumber(city.population) : <span className="text-slate-300 font-sans">0</span>}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`px-2.5 py-1 text-[10px] rounded-full font-extrabold uppercase ${
                              city.isActive 
                                ? 'bg-emerald-55 bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-slate-100 text-slate-500 border border-slate-150'
                            }`}>
                              {city.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button 
                                id={`edit-city-btn-${city.id}`}
                                onClick={() => handleEditClick(city)}
                                className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all"
                                title="Edit Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                id={`delete-city-btn-${city.id}`}
                                onClick={() => handleDeleteClick(city.id, city.name)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Dynamic Pagination Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-center pt-5 mt-4 border-t border-slate-100 gap-4">
                <span className="text-xs text-slate-400 font-medium">
                  Showing <span className="font-bold text-slate-700">{cities.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
                  <span className="font-bold text-slate-700">{Math.min(page * limit, total)}</span> of{' '}
                  <span className="font-bold text-slate-700">{total}</span> total cities
                </span>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button 
                      id="prev-page-btn"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        id={`page-btn-${p}`}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                          page === p
                            ? 'bg-indigo-600 text-white shadow shadow-indigo-100'
                            : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button 
                      id="next-page-btn"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

            </section>

            {/* Architectural Flow Status Indicators Card (Bento Card in Dark Theme) */}
            <section id="architecture-card" className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400">
                    <Cpu className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-white font-extrabold text-sm tracking-tight font-display">MVC Layer Status</h2>
                    <p className="text-[10px] text-slate-400">Strict System Compliance Check</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold tracking-wider">
                  SYNCED
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="flex items-center gap-2.5 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800/60">
                  <div className="w-2 h-2 rounded-full referee bg-emerald-400 animate-pulse"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Core Interface</span>
                    <span className="text-xs font-mono text-slate-250 mt-0.5">ICityRepository</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800/60">
                  <div className="w-2 h-2 rounded-full referee bg-emerald-400"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Single Projection</span>
                    <span className="text-xs font-mono text-slate-250 mt-0.5">No duplicate queries</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800/60">
                  <div className="w-2 h-2 rounded-full referee bg-emerald-400"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Encapsulation</span>
                    <span className="text-xs font-mono text-slate-250 mt-0.5">ApiResponseDTO Wrapper</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800/60">
                  <div className="w-2 h-2 rounded-full referee bg-emerald-400"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Dependency Inject</span>
                    <span className="text-xs font-mono text-slate-250 mt-0.5">Via construction constructor</span>
                  </div>
                </div>
              </div>
            </section>

          </div>

        </div>

      </div>

      {/* Outer humble footer without cluttered tags */}
      <footer id="app-footer" className="mt-8 text-center text-[11px] text-slate-400 font-medium">
        <p>City Master Console &bull; Connected to database repository securely with transaction status monitoring.</p>
      </footer>
    </div>
  );
}

// Compact helper custom icons
function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
      <path d="M3 12A9 3 0 0 0 21 12"></path>
    </svg>
  );
}

