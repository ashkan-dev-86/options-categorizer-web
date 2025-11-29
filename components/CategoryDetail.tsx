import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { 
  ArrowLeft, 
  Plus, 
  FolderPlus, 
  GripVertical, 
  Trash2, 
  Folder, 
  File, 
  CornerDownRight,
  Move,
  ArrowDownAZ,
  Calendar
} from 'lucide-react';
import { Category, OptionItem, GroupItem, ItemSortField, SortDirection } from '../types';
import { Button, Input, Modal } from './ui';
import { SortableItem } from './SortableItem';
import { generateId } from '../utils';

interface CategoryDetailProps {
  categories: Category[];
  updateCategory: (category: Category) => void;
}

const SORT_FIELD_KEY = 'opts-cat-detail-sort-field';
const SORT_DIR_KEY = 'opts-cat-detail-sort-dir';

export const CategoryDetail: React.FC<CategoryDetailProps> = ({ categories, updateCategory }) => {
  const { id } = useParams<{ id: string }>();
  const category = categories.find(c => c.id === id);

  // -- State --
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'createOption' | 'createGroup' | 'moveOption' | null>(null);
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  
  // Sorting State with Persistence
  const [sortField, setSortField] = useState<ItemSortField>(() => {
    return (localStorage.getItem(SORT_FIELD_KEY) as ItemSortField) || ItemSortField.MANUAL;
  });
  const [sortDir, setSortDir] = useState<SortDirection>(() => {
     return (localStorage.getItem(SORT_DIR_KEY) as SortDirection) || SortDirection.ASC;
  });

  // Persist Sort State
  useEffect(() => {
    localStorage.setItem(SORT_FIELD_KEY, sortField);
    localStorage.setItem(SORT_DIR_KEY, sortDir);
  }, [sortField, sortDir]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!category) {
    return <div className="p-8 text-center text-slate-500">Category not found</div>;
  }

  // -- Derived Data --
  const { groups, options } = useMemo(() => {
    const gs = category.items.filter(i => i.type === 'GROUP') as GroupItem[];
    const os = category.items.filter(i => i.type === 'OPTION') as OptionItem[];

    const sortFn = (a: any, b: any) => {
      let cmp = 0;
      if (sortField === ItemSortField.TITLE) {
        cmp = a.title.localeCompare(b.title);
      } else if (sortField === ItemSortField.CREATED_AT) {
        cmp = a.createdAt - b.createdAt;
      } else {
        return 0; // Manual order maintained
      }
      return sortDir === SortDirection.ASC ? cmp : -cmp;
    };

    if (sortField !== ItemSortField.MANUAL) {
      gs.sort(sortFn);
      os.sort(sortFn);
    }
    
    return { groups: gs, options: os };
  }, [category.items, sortField, sortDir]);

  // Combined items for finding things easily
  const findItem = (id: string) => {
    const root = category.items.find(i => i.id === id);
    if (root) return root;
    for (const item of category.items) {
      if (item.type === 'GROUP') {
        const sub = item.items.find(o => o.id === id);
        if (sub) return sub;
      }
    }
    return null;
  };

  // -- Handlers --

  const handleDragStart = (event: DragStartEvent) => {
    if (sortField !== ItemSortField.MANUAL) return;
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (sortField !== ItemSortField.MANUAL) {
      setActiveId(null);
      return;
    }

    const { active, over } = event;
    setActiveId(null);

    if (!over) return;
    if (active.id === over.id) return;

    // Check if we are reordering Root Groups or Root Options separately
    const isActiveGroup = groups.some(g => g.id === active.id);
    const isOverGroup = groups.some(g => g.id === over.id);
    const isActiveOption = options.some(o => o.id === active.id);
    const isOverOption = options.some(o => o.id === over.id);

    // Reordering within the Groups section
    if (isActiveGroup && isOverGroup) {
      const oldIndex = category.items.findIndex(i => i.id === active.id);
      const newIndex = category.items.findIndex(i => i.id === over.id);
      const newItems = arrayMove([...category.items], oldIndex, newIndex);
      updateCategory({ ...category, items: newItems, modifiedAt: Date.now() });
      return;
    }

    // Reordering within the Options section
    if (isActiveOption && isOverOption) {
      const oldIndex = category.items.findIndex(i => i.id === active.id);
      const newIndex = category.items.findIndex(i => i.id === over.id);
      const newItems = arrayMove([...category.items], oldIndex, newIndex);
      updateCategory({ ...category, items: newItems, modifiedAt: Date.now() });
      return;
    }

    // Handling sorting inside a group
    const parentGroupIndex = category.items.findIndex(i => 
      i.type === 'GROUP' && i.items.some(o => o.id === active.id)
    );

    if (parentGroupIndex !== -1) {
      const group = category.items[parentGroupIndex] as GroupItem;
      // Ensure over is in same group
      if (group.items.some(o => o.id === over.id)) {
        const oldIndex = group.items.findIndex(o => o.id === active.id);
        const newIndex = group.items.findIndex(o => o.id === over.id);
        const newGroupItems = arrayMove(group.items, oldIndex, newIndex);
        
        const newItems = [...category.items];
        newItems[parentGroupIndex] = { ...group, items: newGroupItems };
        updateCategory({ ...category, items: newItems, modifiedAt: Date.now() });
      }
    }
  };

  const handleAddItem = () => {
    if (!inputText.trim()) return;

    const newItem: OptionItem | GroupItem = modalMode === 'createGroup' 
      ? { type: 'GROUP', id: generateId(), title: inputText, createdAt: Date.now(), items: [] }
      : { type: 'OPTION', id: generateId(), title: inputText, createdAt: Date.now() };

    const newItems = [...category.items];

    if (modalMode === 'createOption' && targetGroupId) {
      const groupIndex = newItems.findIndex(i => i.id === targetGroupId);
      if (groupIndex !== -1 && newItems[groupIndex].type === 'GROUP') {
        const group = newItems[groupIndex] as GroupItem;
        const updatedGroup = { ...group, items: [newItem as OptionItem, ...group.items] };
        newItems[groupIndex] = updatedGroup;
      }
    } else {
      // Add to root
      if (newItem.type === 'GROUP') {
        newItems.unshift(newItem); 
      } else {
        const firstOptionIndex = newItems.findIndex(i => i.type === 'OPTION');
        if (firstOptionIndex !== -1) {
           newItems.splice(firstOptionIndex, 0, newItem);
        } else {
           newItems.push(newItem);
        }
      }
    }

    updateCategory({ ...category, items: newItems, modifiedAt: Date.now() });
    closeModal();
  };

  const handleDeleteItem = (itemId: string, parentGroupId?: string) => {
    if(!window.confirm("Delete this item?")) return;
    
    let newItems = [...category.items];
    if (parentGroupId) {
       const groupIndex = newItems.findIndex(i => i.id === parentGroupId);
       if (groupIndex !== -1) {
         const group = newItems[groupIndex] as GroupItem;
         newItems[groupIndex] = { ...group, items: group.items.filter(i => i.id !== itemId) };
       }
    } else {
      newItems = newItems.filter(i => i.id !== itemId);
    }
    updateCategory({ ...category, items: newItems, modifiedAt: Date.now() });
  };

  const handleMoveOption = (targetGroupId: string | 'ROOT') => {
    if (!moveTargetId) return;

    let itemToMove: OptionItem | null = null;
    let newItems = [...category.items];

    // Search in root
    const rootIndex = newItems.findIndex(i => i.id === moveTargetId);
    if (rootIndex !== -1) {
      itemToMove = newItems[rootIndex] as OptionItem;
      newItems.splice(rootIndex, 1);
    } else {
      // Search in groups
      for (let i = 0; i < newItems.length; i++) {
        if (newItems[i].type === 'GROUP') {
           const group = newItems[i] as GroupItem;
           const subIndex = group.items.findIndex(o => o.id === moveTargetId);
           if (subIndex !== -1) {
             itemToMove = group.items[subIndex];
             const newSubItems = [...group.items];
             newSubItems.splice(subIndex, 1);
             newItems[i] = { ...group, items: newSubItems };
             break;
           }
        }
      }
    }

    if (!itemToMove) return;

    if (targetGroupId === 'ROOT') {
       // Insert into root options
       const firstOptionIndex = newItems.findIndex(i => i.type === 'OPTION');
       if (firstOptionIndex !== -1) {
         newItems.splice(firstOptionIndex, 0, itemToMove);
       } else {
         newItems.push(itemToMove);
       }
    } else {
      const destIndex = newItems.findIndex(i => i.id === targetGroupId);
      if (destIndex !== -1 && newItems[destIndex].type === 'GROUP') {
        const group = newItems[destIndex] as GroupItem;
        newItems[destIndex] = { ...group, items: [...group.items, itemToMove] };
      }
    }

    updateCategory({ ...category, items: newItems, modifiedAt: Date.now() });
    closeModal();
  };

  const openCreateModal = (mode: 'createOption' | 'createGroup', groupId: string | null = null) => {
    setModalMode(mode);
    setTargetGroupId(groupId);
    setInputText('');
  };

  const openMoveModal = (itemId: string) => {
    setMoveTargetId(itemId);
    setModalMode('moveOption');
  };

  const closeModal = () => {
    setModalMode(null);
    setTargetGroupId(null);
    setMoveTargetId(null);
    setInputText('');
  };

  const toggleSort = (field: ItemSortField) => {
    if (sortField === field && field !== ItemSortField.MANUAL) {
      setSortDir(prev => prev === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC);
    } else {
      setSortField(field);
      setSortDir(SortDirection.ASC);
    }
  };

  const renderOption = (item: OptionItem, parentId?: string, disabledDrag: boolean = false) => (
    <SortableItem key={item.id} id={item.id} className="group/item" disabled={disabledDrag}>
      {({ handleProps }) => (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors">
          {!disabledDrag && (
            <button {...handleProps} className="p-1 text-slate-300 hover:text-slate-600 dark:hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none">
              <GripVertical size={18} />
            </button>
          )}
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
            <File size={16} />
          </div>
          <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">{item.title}</span>
          
          <div className="flex items-center">
            <button 
              onClick={() => openMoveModal(item.id)}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 rounded-lg" 
              title="Move"
            >
              <Move size={16} />
            </button>
            <button 
              onClick={() => handleDeleteItem(item.id, parentId)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-lg"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
    </SortableItem>
  );

  const isManualSort = sortField === ItemSortField.MANUAL;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{category.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{groups.length} groups, {options.length} options</p>
          </div>
          <div className="flex gap-2">
             <Button size="sm" variant="secondary" onClick={() => openCreateModal('createGroup')}>
              <FolderPlus size={16} className="mr-2" />
              Group
            </Button>
            <Button size="sm" onClick={() => openCreateModal('createOption')}>
              <Plus size={16} className="mr-2" />
              Option
            </Button>
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
           <span className="text-xs font-semibold uppercase text-slate-400 mr-1">Sort:</span>
           <Button 
            variant={sortField === ItemSortField.MANUAL ? 'primary' : 'secondary'} 
            size="sm"
            onClick={() => setSortField(ItemSortField.MANUAL)}
            className="whitespace-nowrap text-xs h-8"
          >
            Manual (Drag & Drop)
          </Button>
          <Button 
            variant={sortField === ItemSortField.TITLE ? 'primary' : 'secondary'} 
            size="sm"
            onClick={() => toggleSort(ItemSortField.TITLE)}
            className="whitespace-nowrap text-xs h-8"
          >
            <ArrowDownAZ size={14} className="mr-1.5"/>
            Name {sortField === ItemSortField.TITLE && (sortDir === SortDirection.ASC ? '↓' : '↑')}
          </Button>
          <Button 
            variant={sortField === ItemSortField.CREATED_AT ? 'primary' : 'secondary'} 
            size="sm"
            onClick={() => toggleSort(ItemSortField.CREATED_AT)}
            className="whitespace-nowrap text-xs h-8"
          >
            <Calendar size={14} className="mr-1.5"/>
            Date {sortField === ItemSortField.CREATED_AT && (sortDir === SortDirection.ASC ? '↓' : '↑')}
          </Button>
        </div>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        {/* Groups Section */}
        {groups.length > 0 && (
           <div className="space-y-3">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Groups</h3>
             <SortableContext items={groups.map(i => i.id)} strategy={verticalListSortingStrategy} disabled={!isManualSort}>
               {groups.map(group => (
                  <SortableItem key={group.id} id={group.id} className="group/card" disabled={!isManualSort}>
                    {({ handleProps }) => (
                      <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-3">
                        <div className="flex items-center gap-3 p-4 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
                          {isManualSort && (
                            <button {...handleProps} className="p-1 text-slate-300 hover:text-slate-600 dark:hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none">
                              <GripVertical size={18} />
                            </button>
                          )}
                          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-500 border border-amber-100 dark:border-amber-900/30">
                            <Folder size={18} />
                          </div>
                          <div className="flex-1 font-bold text-slate-800 dark:text-slate-200">{group.title}</div>
                          <div className="flex items-center gap-1">
                             <button 
                                onClick={() => openCreateModal('createOption', group.id)}
                                className="flex items-center px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                              >
                                <Plus size={12} className="mr-1" /> Add
                              </button>
                              <button 
                                onClick={() => handleDeleteItem(group.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                          </div>
                        </div>
                        <div className="p-3 pl-8 space-y-2 bg-white/50 dark:bg-slate-900/20">
                          <SortableContext items={group.items.map(sub => sub.id)} strategy={verticalListSortingStrategy} disabled={!isManualSort}>
                            {group.items.length === 0 ? (
                              <div className="text-center py-4 text-xs text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-lg">
                                Empty group
                              </div>
                            ) : (
                              group.items.map(sub => renderOption(sub, group.id, !isManualSort))
                            )}
                          </SortableContext>
                        </div>
                      </div>
                    )}
                  </SortableItem>
               ))}
             </SortableContext>
           </div>
        )}

        {/* Options Section */}
        {options.length > 0 && (
          <div className="space-y-3 pt-2">
             {groups.length > 0 && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Options</h3>}
             <SortableContext items={options.map(i => i.id)} strategy={verticalListSortingStrategy} disabled={!isManualSort}>
               {options.map(item => renderOption(item, undefined, !isManualSort))}
             </SortableContext>
          </div>
        )}

        {/* Empty State */}
        {category.items.length === 0 && (
           <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-200 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                <Plus size={32} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">This category is empty</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Add options or groups to get started</p>
           </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
           {activeId ? (
              <div className="p-4 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-indigo-200 dark:border-indigo-500 opacity-90 cursor-grabbing text-slate-900 dark:text-white">
                Dragging item...
              </div>
           ) : null}
        </DragOverlay>
      </DndContext>

      {/* Creation Modal */}
      <Modal
        isOpen={modalMode === 'createOption' || modalMode === 'createGroup'}
        onClose={closeModal}
        title={modalMode === 'createGroup' ? 'Create New Group' : 'Add New Option'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleAddItem}>Create</Button>
          </>
        }
      >
        <Input
          autoFocus
          label="Title"
          placeholder={modalMode === 'createGroup' ? "e.g. Favorites" : "e.g. Option Name"}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddItem()}
        />
      </Modal>

      {/* Move Modal */}
      <Modal
         isOpen={modalMode === 'moveOption'}
         onClose={closeModal}
         title="Move Option To..."
      >
        <div className="space-y-2">
           <button
             onClick={() => handleMoveOption('ROOT')}
             className="w-full flex items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all text-left"
           >
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg mr-3 text-slate-500 dark:text-slate-400"><CornerDownRight size={16}/></div>
              <span className="font-medium text-slate-700 dark:text-slate-200">Root Category (Ungroup)</span>
           </button>
           
           <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4 mb-2">Groups</div>
           
           {groups.map(group => (
             <button
              key={group.id}
              onClick={() => handleMoveOption(group.id)}
              className="w-full flex items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-500 transition-all text-left group"
             >
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg mr-3 text-amber-500 dark:text-amber-500 group-hover:text-amber-600 dark:group-hover:text-amber-400"><Folder size={16}/></div>
                <span className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-900 dark:group-hover:text-indigo-300">{group.title}</span>
             </button>
           ))}

           {groups.length === 0 && (
             <p className="text-sm text-slate-400 italic p-2">No groups available.</p>
           )}
        </div>
      </Modal>

    </div>
  );
};