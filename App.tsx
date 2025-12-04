import React, { useState, useEffect } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CategoryList } from './components/CategoryList';
import { CategoryDetail } from './components/CategoryDetail';
import { Category, CategoryItem, GroupItem, OptionItem } from './types';
import { generateId } from './utils';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { Sun, Moon, Laptop, Layers, Bell, AlertTriangle } from 'lucide-react';

// --- Local Storage Key ---
const STORAGE_KEY = 'options-categorizer-data';
const NOTIFICATION_SEEN_KEY = 'opts-cat-notifications-seen';

function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(() => {
    return !localStorage.getItem(NOTIFICATION_SEEN_KEY);
  });

  const toggleNotifications = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      if (hasUnread) {
        setHasUnread(false);
        localStorage.setItem(NOTIFICATION_SEEN_KEY, 'true');
      }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleNotifications}
        className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors relative rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Notifications"
      >
        <Bell size={20} />
        {hasUnread && (
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900 pointer-events-none"></span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close on click outside */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          
          {/* Dropdown Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900">
              <h3 className="font-semibold text-slate-800 dark:text-white">Notifications</h3>
            </div>
            
            <div className="max-h-[80vh] overflow-y-auto custom-scrollbar">
               {/* Pinned Notification */}
               <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/30">
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5 text-amber-600 dark:text-amber-500 shrink-0">
                      <AlertTriangle size={18} />
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between items-start">
                         <p className="text-sm font-bold text-amber-900 dark:text-amber-400">
                           Data Privacy & Storage Warning
                         </p>
                         <span className="text-[10px] uppercase font-bold text-amber-600/70 dark:text-amber-500/70 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">Pinned</span>
                       </div>
                       
                       <div className="text-xs text-amber-900/80 dark:text-amber-200/80 space-y-3 leading-relaxed text-justify">
                          <p>
                            Please do not store sensitive data in this app. It is not protected by authentication or authorization.
                          </p>
                          <p>
                            Since your data is stored locally in your browser (not on external servers), I recommend exporting it regularly to prevent data loss.
                          </p>
                          <div>
                            <p className="font-semibold mb-1">Your data may be cleared in these situations:</p>
                            <ul className="list-disc pl-4 space-y-0.5 opacity-90">
                              <li>Clearing browser data or cache</li>
                              <li>Using private/incognito mode</li>
                              <li>Using iOS/Safari (Apple's WebKit automatically deletes data after 7 days of inactivity)</li>
                              <li>Exceeding browser storage limits</li>
                            </ul>
                          </div>
                          <p className="italic opacity-90">
                            Storage capacity is typically 5-10 MB (enough for hundreds of categories, groups, and options)
                          </p>
                       </div>
                    </div>
                  </div>
               </div>
               
               {/* Empty state for other notifications */}
               <div className="p-8 text-center text-slate-400 dark:text-slate-600 text-xs">
                 No other notifications
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
      const newCategories = [...prev];

      imported.forEach(impCat => {
        // Find existing category by TITLE (Case Sensitive)
        const existingCatIndex = newCategories.findIndex(c => c.title === impCat.title);

        if (existingCatIndex >= 0) {
          // Category exists: Merge content
          const existingCat = newCategories[existingCatIndex];
          const newItems = [...existingCat.items];
          
          impCat.items.forEach(impItem => {
            if (impItem.type === 'GROUP') {
              // Handle Group Merge
              // Find existing group by TITLE (Case Sensitive)
              const existingGroupIndex = newItems.findIndex(i => i.type === 'GROUP' && i.title === impItem.title);
              
              if (existingGroupIndex !== -1) {
                // Group exists: Merge options inside
                const existingGroup = newItems[existingGroupIndex] as GroupItem;
                const existingGroupItems = [...existingGroup.items];
                const existingSubTitles = new Set(existingGroupItems.map(i => i.title));

                (impItem as GroupItem).items.forEach(impSubItem => {
                  // Check options by Title
                  if (!existingSubTitles.has(impSubItem.title)) {
                    // Add new option to existing group (Generate new ID to avoid collisions)
                    existingGroupItems.push({ ...impSubItem, id: generateId() });
                  }
                });
                
                newItems[existingGroupIndex] = { ...existingGroup, items: existingGroupItems };
              } else {
                // Group doesn't exist: Add it (and regenerate IDs for group and its children)
                newItems.push({
                  ...impItem,
                  id: generateId(),
                  items: (impItem as GroupItem).items.map(sub => ({ ...sub, id: generateId() }))
                });
              }
            } else {
              // Handle Option Merge
              // Find existing option by TITLE
              const optionExists = newItems.some(i => i.type === 'OPTION' && i.title === impItem.title);
              
              if (!optionExists) {
                // Option doesn't exist: Add it (Generate new ID)
                 newItems.push({ ...impItem, id: generateId() });
              }
            }
          });

          newCategories[existingCatIndex] = {
            ...existingCat,
            items: newItems,
            modifiedAt: Date.now()
          };
        } else {
          // New Category: Add it (Regenerate IDs for everything to be safe)
          newCategories.push({
            ...impCat,
            id: generateId(),
            items: impCat.items.map(item => {
              if (item.type === 'GROUP') {
                return {
                  ...(item as GroupItem),
                  id: generateId(),
                  items: (item as GroupItem).items.map(sub => ({ ...sub, id: generateId() }))
                };
              }
              return { ...item, id: generateId() };
            })
          });
        }
      });

      return newCategories;
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
             
             <div className="flex items-center gap-2">
               <NotificationCenter />
               <ThemeToggle />
             </div>
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