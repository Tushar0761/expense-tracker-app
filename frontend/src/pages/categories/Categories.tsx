import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  type CategoryWithSubs,
} from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function Categories() {
  const queryClient = useQueryClient();
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);

  const { data: categories = [], isLoading } = useQuery<CategoryWithSubs[]>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; parentId?: number; level?: number }) =>
      createCategory(data),
    onSuccess: () => {
      toast.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsAddCatOpen(false);
      setNewCatName('');
      setSelectedParentId(null);
      setSelectedLevel(1);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: Error) => {
      toast.error(`Error deleting category: ${error.message}`);
    },
  });

  const toggleExpand = (id: number) => {
    const next = new Set(expandedCats);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCats(next);
  };

  const handleCreate = () => {
    if (!newCatName.trim()) return;
    createMutation.mutate({
      name: newCatName,
      parentId: selectedParentId || undefined,
      level: selectedLevel,
    });
  };

  const openAddDialog = (parentId: number | null = null, level: number = 1) => {
    setSelectedParentId(parentId);
    setSelectedLevel(level);
    setIsAddCatOpen(true);
  };

  if (isLoading)
    return <div className="p-8 text-center">Loading categories...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">
            Manage your expense types and subcategories
          </p>
        </div>
        <Button onClick={() => openAddDialog()} className="gap-2">
          <FolderPlus size={18} /> Add Parent Category
        </Button>
      </div>

      <Card className="border-none shadow-premium bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="space-y-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="border rounded-lg overflow-hidden border-gray-100 dark:border-gray-800"
              >
                <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(cat.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      {expandedCats.has(cat.id) ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>
                    <div className="flex flex-col">
                      <span className="font-semibold text-lg">{cat.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Level {cat.level}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {cat.subCategories.length} subcategories
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary hover:bg-primary/5"
                      onClick={() => openAddDialog(cat.id, cat.level + 1)}
                    >
                      <Plus size={16} className="mr-1" /> Add Sub
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete category "${cat.name}" and all subcategories?`,
                          )
                        ) {
                          deleteMutation.mutate(cat.id);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                {expandedCats.has(cat.id) && (
                  <div className="p-2 space-y-1 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-2 duration-200">
                    {cat.subCategories.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4 text-center">
                        No subcategories yet.
                      </p>
                    ) : (
                      cat.subCategories.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between p-3 ml-8 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {sub.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Level {sub.level}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                            onClick={() => {
                              if (
                                confirm(`Delete subcategory "${sub.name}"?`)
                              ) {
                                deleteMutation.mutate(sub.id);
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}

            {categories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  You haven't added any categories yet.
                </p>
                <Button onClick={() => openAddDialog()}>
                  Create your first category
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddCatOpen} onOpenChange={setIsAddCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedParentId
                ? `Add Level ${selectedLevel} Subcategory`
                : 'Add Parent Category (Level 1)'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="catName">Category Name</Label>
              <Input
                id="catName"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Health, Food, Car"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCatOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !newCatName.trim()}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
