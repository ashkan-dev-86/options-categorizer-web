import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, Edit2, Trash2, ArrowUpDown, Clock, Download, Upload, AlertTriangle } from 'lucide-react';
import { Category, CategorySortField, SortDirection } from '../types';
import { Button, Input, Modal } from './ui';
import { formatDate, generateId } from '../utils';

interface CategoryListProps {
  categories: Category[];
  addCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  updateCategory: (category: Category) => void;
  importCategories: (categories: Category[]) => void;
}

const SORT_FIELD_KEY = 'opts-cat-list-sort-field';
const SORT_DIR_KEY = 'opts-cat-list-sort-dir';

export const CategoryList: React.FC<CategoryListProps> = ({ categories, addCategory, deleteCategory, updateCategory, importCategories }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  
  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sort state from local storage or default
  const [sortField, setSortField] = useState<CategorySortField>(() => {
    return (localStorage.getItem(SORT_FIELD_KEY) as CategorySortField) || CategorySortField.CREATED_AT;
  });
  const [sortDir, setSortDir] = useState<SortDirection>(() => {
    return (localStorage.getItem(SORT_DIR_KEY) as SortDirection) || SortDirection.DESC;
  });

  // Persist sort state
  useEffect(() => {
    localStorage.setItem(SORT_FIELD_KEY, sortField);
    localStorage.setItem(SORT_DIR_KEY, sortDir);
  }, [sortField, sortDir]);

  const filteredAndSortedCategories = useMemo(() => {
    let result = [...categories];

    // Filter
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(c => c.title.toLowerCase().includes(lower) || c.description?.toLowerCase().includes(lower));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case CategorySortField.TITLE:
          comparison = a.title.localeCompare(b.title);
          break;
        case CategorySortField.CREATED_AT:
          comparison = a.createdAt - b.createdAt;
          break;
        case CategorySortField.MODIFIED_AT:
          comparison = a.modifiedAt - b.modifiedAt;
          break;
      }
      return sortDir === SortDirection.ASC ? comparison : -comparison;
    });

    return result;
  }, [categories, search, sortField, sortDir]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingCategory) {
      updateCategory({
        ...editingCategory,
        title: formTitle,
        description: formDesc,
        modifiedAt: Date.now()
      });
    } else {
      addCategory({
        id: generateId(),
        title: formTitle,
        description: formDesc,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        items: []
      });
    }
    closeModal();
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setFormTitle('');
    setFormDesc('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCategory(cat);
    setFormTitle(cat.title);
    setFormDesc(cat.description || '');
    setIsModalOpen(true);
  };

  const requestDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteCategory(deleteId);
      setDeleteId(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const toggleSort = (field: CategorySortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC);
    } else {
      setSortField(field);
      setSortDir(SortDirection.ASC);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(categories, null, 2);
    const blob = new Blob([dataStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `options-categorizer-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.every(c => c.id && c.title && Array.isArray(c.items))) {
          importCategories(parsed);
          alert(`Successfully imported ${parsed.length} categories.`);
        } else {
          alert('Invalid file format. Please use a valid export file.');
        }
      } catch (err) {
        alert('Failed to parse file. Please ensure it is a valid JSON/TXT file.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Categories</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your options and groups</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="secondary" onClick={handleImportTrigger} className="flex-1 sm:flex-none" title="Import Data">
             <Download className="w-4 h-4 mr-2" />
             Import
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportFile} 
            className="hidden" 
            accept=".txt,.json"
          />
          <Button variant="secondary" onClick={handleExport} className="flex-1 sm:flex-none" title="Export Data">
             <Upload className="w-4 h-4 mr-2" />
             Export
          </Button>
          <Button onClick={openAddModal} className="flex-1 sm:flex-none shadow-md shadow-indigo-200 dark:shadow-none whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            New Category
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 sticky top-0 z-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <Button 
            variant={sortField === CategorySortField.TITLE ? 'primary' : 'secondary'} 
            size="sm"
            onClick={() => toggleSort(CategorySortField.TITLE)}
            className="whitespace-nowrap"
          >
            A-Z {sortField === CategorySortField.TITLE && (sortDir === SortDirection.ASC ? '↓' : '↑')}
          </Button>
          <Button 
            variant={sortField === CategorySortField.CREATED_AT ? 'primary' : 'secondary'} 
            size="sm"
            onClick={() => toggleSort(CategorySortField.CREATED_AT)}
            className="whitespace-nowrap"
          >
            Date {sortField === CategorySortField.CREATED_AT && (sortDir === SortDirection.ASC ? '↓' : '↑')}
          </Button>
           <Button 
            variant={sortField === CategorySortField.MODIFIED_AT ? 'primary' : 'secondary'} 
            size="sm"
            onClick={() => toggleSort(CategorySortField.MODIFIED_AT)}
            className="whitespace-nowrap"
          >
            Modified {sortField === CategorySortField.MODIFIED_AT && (sortDir === SortDirection.ASC ? '↓' : '↑')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedCategories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="mx-auto w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-lg font-medium text-slate-600 dark:text-slate-300">No categories found</p>
            <p className="text-sm">Create one or import data to get started</p>
          </div>
        ) : (
          filteredAndSortedCategories.map(cat => (
            <Link 
              key={cat.id} 
              to={`/category/${cat.id}`}
              className="group relative bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all active:scale-[0.99]"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors pr-16">
                  {cat.title}
                </h3>
                <div className="flex gap-1 absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-1 rounded-lg shadow-sm">
                  <button 
                    type="button"
                    onClick={(e) => openEditModal(cat, e)} 
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    aria-label="Edit category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => requestDelete(cat.id, e)} 
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    aria-label="Delete category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                {cat.description || "No description"}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-50 dark:border-slate-800 pt-3">
                <div className="flex items-center">
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  {cat.items.length} items
                </div>
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDate(cat.modifiedAt)}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCategory ? "Edit Category" : "New Category"}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingCategory ? "Save Changes" : "Create"}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
            placeholder="e.g. Travel Destinations"
            autoFocus
          />
          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea
              className="w-full h-24 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="Optional description..."
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Category"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete Category</Button>
          </>
        }
      >
        <div className="flex items-start gap-4 p-2">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400 shrink-0">
             <AlertTriangle size={24} />
          </div>
          <div className="space-y-2">
            <p className="text-slate-700 dark:text-slate-300 font-medium">Are you sure you want to delete this category?</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone. All groups and options inside will be permanently lost.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};