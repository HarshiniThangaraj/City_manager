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
  Cpu,
  Shield,
  Lock,
  Unlock,
  LogIn,
  LogOut,
  Key,
  UserPlus
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

  // Authentication states (separate Admin and User)
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(() => {
    return (localStorage.getItem('city_master_role') as 'admin' | 'user' | null) || null;
  });
  const [authUsername, setAuthUsername] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Registration & User Storage States
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [regUsername, setRegUsername] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regRole, setRegRole] = useState<'admin' | 'user'>('user');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Load and store registered users locally (pre-filled with default preset credentials)
  const [registeredUsers, setRegisteredUsers] = useState<{username: string; password: string; role: 'admin' | 'user'}[]>(() => {
    const saved = localStorage.getItem('city_master_registered_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading registered users', e);
      }
    }
    return [
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'user', password: 'user123', role: 'user' }
    ];
  });

  const handleQuickLogin = (role: 'admin' | 'user') => {
    if (role === 'admin') {
      setAuthUsername('admin');
      setAuthPassword('admin123');
    } else {
      setAuthUsername('user');
      setAuthPassword('user123');
    }
    setAuthError(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const u = authUsername.trim().toLowerCase();
    const p = authPassword;

    // Direct check against state-registered list (case-insensitive username matches)
    const foundUser = registeredUsers.find(
      user => user.username.trim().toLowerCase() === u && user.password === p
    );

    if (foundUser) {
      setUserRole(foundUser.role);
      localStorage.setItem('city_master_role', foundUser.role);
      const roleDisplayName = foundUser.role === 'admin' ? 'Administrator (Read/Write access)' : 'Standard User (Read Only access)';
      showNotification(`Signed in successfully as '${foundUser.username}' with ${roleDisplayName}!`, 'success');
      setAuthUsername('');
      setAuthPassword('');
    } else {
      setAuthError('Invalid credentials. Check spelling, register a new account, or use preset options.');
    }
  };

  const handleRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    const u = regUsername.trim();
    const p = regPassword;
    const cp = regConfirmPassword;

    if (!u) {
      setRegError('Username is required.');
      return;
    }
    if (u.length < 3) {
      setRegError('Username must be at least 3 characters.');
      return;
    }
    if (p.length < 4) {
      setRegError('Password must be at least 4 characters.');
      return;
    }
    if (p !== cp) {
      setRegError('Passwords do not match.');
      return;
    }

    // Check if user already exists
    const userExists = registeredUsers.some(
      user => user.username.trim().toLowerCase() === u.toLowerCase()
    );

    if (userExists) {
      setRegError('This username is already registered. Please login or try another.');
      return;
    }

    // Append new user to registered list and save to localStorage
    const newUser = {
      username: u,
      password: p,
      role: regRole
    };
    const updatedUsers = [...registeredUsers, newUser];
    setRegisteredUsers(updatedUsers);
    localStorage.setItem('city_master_registered_users', JSON.stringify(updatedUsers));

    setRegSuccess(`Registration successful! You can now log in with '${u}'.`);
    
    // Clear registration fields
    setRegUsername('');
    setRegPassword('');
    setRegConfirmPassword('');

    // Stagger transition back to Login to let users read success state
    setTimeout(() => {
      setIsRegistering(false);
      setAuthUsername(u); // Prefill registered username for convenience
      setRegSuccess(null);
    }, 1500);
  };

  const handleLogout = () => {
    setUserRole(null);
    localStorage.removeItem('city_master_role');
    showNotification('Logged out successfully. Read/write access restricted.', 'success');
    resetForm();
  };

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

      {userRole === null ? (
        /* GORGEOUS LOGIN / REGISTRATION SCREEN - SHOWN ONLY ON WORKSPACE START */
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl transition-all duration-300">
            
            {!isRegistering ? (
              /* LOGIN FORM */
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm animate-pulse">
                    <Lock className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-950 font-display tracking-tight">
                    City Master Console
                  </h2>
                  <p className="text-xs text-slate-500 mt-2">
                    Sign in using standard user or administrator credentials
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Username
                      </label>
                      <input
                        id="login-username"
                        name="username"
                        type="text"
                        required
                        value={authUsername}
                        onChange={(e) => { setAuthUsername(e.target.value); setAuthError(null); }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all text-slate-900 font-medium placeholder:text-slate-400"
                        placeholder="Enter username"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Password
                      </label>
                      <input
                        id="login-password"
                        name="password"
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => { setAuthPassword(e.target.value); setAuthError(null); }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all text-slate-900 font-medium font-mono placeholder:text-slate-400"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {authError && (
                    <div id="login-error-box" className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-medium flex items-start gap-2.5 animate-shake">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Error:</span> {authError}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign in to Console</span>
                  </button>
                </form>

                {/* Trigger to swap to Registration */}
                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(true);
                        setAuthError(null);
                      }}
                      className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline transition-all cursor-pointer bg-transparent border-none"
                    >
                      Register New User
                    </button>
                  </p>
                </div>


              </div>
            ) : (
              /* REGISTRATION FORM */
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                    <UserPlus className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-950 font-display tracking-tight">
                    Create Console User
                  </h2>
                  <p className="text-xs text-slate-500 mt-2">
                    Register a new account to manage the city repository
                  </p>
                </div>

                <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Desired Username
                    </label>
                    <input
                      id="reg-username"
                      name="regUsername"
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => { setRegUsername(e.target.value); setRegError(null); }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all text-slate-900 font-medium placeholder:text-slate-400"
                      placeholder="e.g. janesmith32"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Password
                      </label>
                      <input
                        id="reg-password"
                        name="regPassword"
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => { setRegPassword(e.target.value); setRegError(null); }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all text-slate-900 font-medium font-mono placeholder:text-slate-400"
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Confirm
                      </label>
                      <input
                        id="reg-confirm-password"
                        name="regConfirmPassword"
                        type="password"
                        required
                        value={regConfirmPassword}
                        onChange={(e) => { setRegConfirmPassword(e.target.value); setRegError(null); }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all text-slate-900 font-medium font-mono placeholder:text-slate-400"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {/* Role selection tab/radio list */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Assign Console Role
                    </label>
                    <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setRegRole('user')}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          regRole === 'user' 
                            ? 'bg-indigo-600 text-white shadow' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Standard User (R-O)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegRole('admin')}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          regRole === 'admin' 
                            ? 'bg-indigo-600 text-white shadow' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Administrator (R/W)</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 px-1">
                      {regRole === 'admin' 
                        ? 'Full clearance to create, update, and delete repository entries.' 
                        : 'Access restricted to querying, searching, and sorting records.'}
                    </span>
                  </div>

                  {regError && (
                    <div id="reg-error-box" className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-medium flex items-start gap-2.5 animate-shake">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Error:</span> {regError}
                      </div>
                    </div>
                  )}

                  {regSuccess && (
                    <div id="reg-success-box" className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-medium flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        {regSuccess}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create User Account</span>
                  </button>
                </form>

                {/* Back to Login toggler */}
                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(false);
                        setRegError(null);
                        setRegSuccess(null);
                      }}
                      className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline transition-all cursor-pointer bg-transparent border-none"
                    >
                      Back to Sign In
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CORE APPLICATION - RENDERED ONLY WHEN LOGGED IN */
        <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col gap-6 animate-fade-in">
          
          {/* Top Header Section with Sign Out */}
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
                <span className="text-[10px] text-slate-400 font-mono mt-1">
                  {userRole === 'admin' ? 'Role: Administrator (R/W)' : 'Role: Standard User (R-O)'}
                </span>
              </div>
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md border-2 border-white transition-all duration-300 ${
                userRole === 'admin' ? 'bg-amber-600 shadow-amber-100 animate-pulse' : 'bg-indigo-600 shadow-indigo-100'
              }`}>
                {userRole === 'admin' ? 'ADM' : 'USR'}
              </div>
              
              <button
                id="header-sign-out-btn"
                onClick={handleLogout}
                className="px-3.5 py-2 hover:bg-rose-50 text-slate-650 hover:text-rose-605 text-slate-600 hover:text-rose-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 hover:border-rose-200 cursor-pointer shadow-sm hover:shadow"
                title="Sign out of Console"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </header>

          {/* Bento Grid Layout */}
          <div id="bento-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Manage City Form or User Role Details */}
            <section id="form-card" className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col min-h-[580px] hover:border-slate-300 transition-all">
              {userRole === 'admin' ? (
                <>
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        isEditing ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {isEditing ? <Edit2 className="w-4.5 h-4.5" /> : <Plus className="w-5 h-5" />}
                      </div>
                      <div>
                        <h2 className="font-extrabold text-slate-900 leading-tight font-display text-base col-heading">
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
                        <AlertCircle className="w-4 h-4 text-rose-655 text-rose-600 shrink-0 mt-0.5" />
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

                  <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3 text-indigo-805 text-indigo-800">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-[10px] sm:text-[11px] font-medium leading-relaxed">
                      <span className="font-bold">Architecture Rule:</span> Save maps to <code>CreateCityDto</code> and <code>UpdateCityDto</code> parameters through <code>CityController</code>.
                    </p>
                  </div>
                </>
              ) : (
                /* Standard User Mode - Read Only Panel */
                <div className="flex flex-col h-full justify-between flex-1">
                  <div>
                    <div className="text-center py-6 border-b border-slate-100">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-sm">
                        <Shield className="w-7 h-7 text-indigo-600" />
                      </div>
                      <h2 className="font-extrabold text-slate-900 font-display text-base tracking-tight">Standard User Mode</h2>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                        Logged in as read-only. Search, query, and paginated actions are fully authorized.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 my-4 text-slate-700">
                      <h3 className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider">Separate Role Privileges</h3>
                      <ul className="space-y-2 text-xs">
                        <li className="flex items-center gap-2 text-emerald-805 text-emerald-800 font-medium">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Search city index entries</span>
                        </li>
                        <li className="flex items-center gap-2 text-emerald-805 text-emerald-800 font-medium">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Perform sorting & pagination</span>
                        </li>
                        <li className="flex items-center gap-2 text-slate-400">
                          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="line-through">Create city parameters</span>
                        </li>
                        <li className="flex items-center gap-2 text-slate-400">
                          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="line-through">Modify/delete repository records</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="text-[11px] text-slate-600 bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex gap-2 mb-3 leading-relaxed">
                      <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-850 text-amber-800">Admin Clearance Needed:</span> Login as administrator to add, tweak, or drop cities from the record list.
                      </div>
                    </div>
                    
                    <button
                      id="elevate-role-btn"
                      onClick={() => {
                        setUserRole('admin');
                        localStorage.setItem('city_master_role', 'admin');
                        showNotification('Elevated successfully as Administrator (R/W)!', 'success');
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Unlock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Elevate Session to Admin</span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* RIGHT COLUMN: Bento Stats Grid + App Data Grid */}
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
                        className="bg-transparent border-none outline-none text-indigo-700 cursor-pointer font-extrabold focus:ring-0 py-0 pl-1 pr-4 text-xs"
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
                      className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-full border border-slate-200 transition-all flex items-center justify-center"
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
                    <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400 text-center">
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
                            className={`border-b border-slate-50 hover:bg-slate-50/85 transition-colors group ${
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
                              <div className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate group-hover:text-slate-600" title={city.description}>
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
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-slate-100 text-slate-500 border border-slate-150'
                              }`}>
                                {city.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3.5 pr-4 text-right">
                              {userRole === 'admin' ? (
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
                                    className="p-1.5 text-slate-500 hover:text-rose-605 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                    title="Delete Record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 text-slate-400 bg-slate-50/60 px-2.5 py-1 rounded-lg border border-slate-200/50 text-[10px] font-mono select-none" title="Admin permissions required to modify entries.">
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span>Locked</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Dynamic Pagination Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-center pt-5 mt-4 border-t border-slate-100 gap-4">
                  <span className="text-xs text-slate-400 font-medium font-mono">
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
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          id={`page-btn-${p}`}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

              </section>

            </div>

          </div>

        </div>
      )}

      {/* Outer elegant footer without cluttered tags */}
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

