import React, { useState, useEffect } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CategoryList } from './components/CategoryList';
import { CategoryDetail } from './components/CategoryDetail';
import { Category } from './types';
import { generateId } from './utils';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { Sun, Moon, Laptop, Layers } from 'lucide-react';

// --- Local Storage Key ---
const STORAGE_KEY = 'options-categorizer-data';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
      <button 
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        title="Light Mode"
      >
        <Sun size={16} />
      </button>
      <button 
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        title="System Default"
      >
        <Laptop size={16} />
      </button>
      <button 
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        title="Dark Mode"
      >
        <Moon size={16} />
      </button>
    </div>
  );
}

function AppContent() {
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load data", e);
      return [];
    }
  });

  // Save on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }, [categories]);

  const addCategory = (category: Category) => {
    setCategories(prev => [category, ...prev]);
  };

  const updateCategory = (updatedCat: Category) => {
    setCategories(prev => prev.map(c => c.id === updatedCat.id ? updatedCat : c));
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const importCategories = (imported: Category[]) => {
    setCategories(prev => {
      // Merge strategy: Create a map of existing categories by ID, then overwrite/add with imported ones.
      const map = new Map(prev.map(c => [c.id, c]));
      imported.forEach(c => map.set(c.id, c));
      return Array.from(map.values());
    });
  };

  return (
    <MemoryRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-10 transition-colors duration-300">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none">
                 <Layers className="w-5 h-5 text-white" />
               </div>
               <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white hidden sm:inline">Options Categorizer</span>
             </div>
             <ThemeToggle />
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <Routes>
            <Route 
              path="/" 
              element={
                <CategoryList 
                  categories={categories} 
                  addCategory={addCategory} 
                  deleteCategory={deleteCategory}
                  updateCategory={updateCategory}
                  importCategories={importCategories}
                />
              } 
            />
            <Route 
              path="/category/:id" 
              element={
                <CategoryDetail 
                  categories={categories} 
                  updateCategory={updateCategory} 
                />
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </MemoryRouter>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-theme" children={<AppContent />} />
  );
}

export default App;